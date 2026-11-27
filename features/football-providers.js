import { createHash } from "node:crypto";
import { getFirebaseDb } from "../config/firebase-admin.js";

const CACHE = "zedFootballProviderCache";
const USAGE = "zedFootballProviderUsage";
const DEFAULT_TIMEOUT_MS = 9000;

// Bounded process-local cache and request coalescing reduce repeated upstream
// calls while Firestore remains the shared cache across service instances.
const MEMORY_CACHE = new Map();
const IN_FLIGHT = new Map();
const MEMORY_CACHE_LIMIT = 500;

function rememberCache(key, payload, savedAt = Date.now()) {
  if (!MEMORY_CACHE.has(key) && MEMORY_CACHE.size >= MEMORY_CACHE_LIMIT) {
    const oldestKey = MEMORY_CACHE.keys().next().value;
    if (oldestKey !== undefined) MEMORY_CACHE.delete(oldestKey);
  }
  MEMORY_CACHE.set(key, { payload, savedAt });
}

const PROVIDERS = Object.freeze({
  espn: {
    id: "espn",
    label: "ESPN",
    baseUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer",
    // Zed-side protective budgets only; ESPN publishes no guaranteed quota for this endpoint.
    dailySafetyBudget: Number(process.env.ESPN_DAILY_REQUEST_LIMIT) || 500,
    minuteSafetyBudget: Number(process.env.ESPN_PER_MINUTE_LIMIT) || 30,
    configured: true
  },
  footballData: {
    id: "football-data.org",
    label: "Football-data.org",
    baseUrl: "https://api.football-data.org/v4",
    dailySafetyBudget: Number(process.env.FOOTBALL_DATA_DAILY_REQUEST_LIMIT) || 100,
    minuteSafetyBudget: Number(process.env.FOOTBALL_DATA_PER_MINUTE_LIMIT) || 10,
    configured: Boolean(process.env.FOOTBALL_DATA_API_TOKEN)
  }
});

const digest = value => createHash("sha256").update(String(value)).digest("hex");
const utcDay = () => new Date().toISOString().slice(0, 10);
const minuteBucket = () => new Date().toISOString().slice(0, 16);

function providerRecord(provider) {
  const item = PROVIDERS[provider];
  if (!item) throw new Error("Unknown football data provider.");
  return item;
}

export function getFootballProviderStatus() {
  return Object.values(PROVIDERS).map(({ id, label, dailySafetyBudget, minuteSafetyBudget, configured }) => ({
    id, label, dailySafetyBudget, minuteSafetyBudget, configured,
    quotaType: "zed_safety_budget_not_provider_published_quota"
  }));
}

/**
 * Durable quota reservation. Fail closed if Firestore is unavailable: a
 * provider request must never be sent without enforcing its configured budget.
 */
async function reserveQuota(provider) {
  const config = providerRecord(provider);
  if (!config.configured) {
    const error = new Error(config.id + " is not configured.");
    error.code = "FOOTBALL_PROVIDER_NOT_CONFIGURED";
    throw error;
  }
  const db = getFirebaseDb();
  const day = utcDay();
  const minute = minuteBucket();
  const ref = db.collection(USAGE).doc(config.id + "_" + day);
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists ? snapshot.data() : {};
    const dailyUsed = Number(current.dailyUsed) || 0;
    const minuteUsed = current.minuteBucket === minute ? Number(current.minuteUsed) || 0 : 0;
    if (dailyUsed >= config.dailySafetyBudget) {
      const error = new Error(config.label + " daily request budget reached.");
      error.code = "FOOTBALL_PROVIDER_DAILY_QUOTA";
      throw error;
    }
    if (minuteUsed >= config.minuteSafetyBudget) {
      const error = new Error(config.label + " per-minute request budget reached.");
      error.code = "FOOTBALL_PROVIDER_RATE_LIMIT";
      throw error;
    }
    transaction.set(ref, {
      provider: config.id,
      day,
      dailyUsed: dailyUsed + 1,
      minuteBucket: minute,
      minuteUsed: minuteUsed + 1,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  });
}

async function readCache(key, ttlMs) {
  const db = getFirebaseDb();
  const snapshot = await db.collection(CACHE).doc(digest(key)).get();
  if (!snapshot.exists) return null;
  const value = snapshot.data() || {};
  if (!value.payload || !Number.isFinite(value.savedAt) || Date.now() - value.savedAt > ttlMs) return null;
  return { payload: value.payload, savedAt: value.savedAt };
}

async function writeCache(key, provider, payload) {
  const db = getFirebaseDb();
  await db.collection(CACHE).doc(digest(key)).set({
    provider,
    payload,
    savedAt: Date.now()
  }, { merge: true });
}

export async function providerGet(provider, path, {
  params = {},
  fetchImpl = globalThis.fetch,
  ttlMs = 15 * 60 * 1000,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  cache = true
} = {}) {
  const config = providerRecord(provider);
  if (provider === "footballData" && !config.configured) {
    const error = new Error("FOOTBALL_DATA_API_TOKEN is not configured.");
    error.code = "FOOTBALL_PROVIDER_NOT_CONFIGURED";
    throw error;
  }
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  }
  const url = config.baseUrl + "/" + String(path).replace(/^\/+/, "") +
    (query.size ? "?" + query.toString() : "");
  const cacheKey = provider + ":" + url;

  // Reuse fresh process-local responses before touching Firestore or reserving
  // another provider request. This complements the durable shared cache.
  if (cache) {
    const memoryRecord = MEMORY_CACHE.get(cacheKey);
    if (memoryRecord && Date.now() - memoryRecord.savedAt < ttlMs) {
      return { ...memoryRecord.payload, cached: true };
    }
    if (memoryRecord) MEMORY_CACHE.delete(cacheKey);

    try {
      const cached = await readCache(cacheKey, ttlMs);
      if (cached) {
        rememberCache(cacheKey, cached.payload, cached.savedAt);
        return { ...cached.payload, cached: true };
      }
    } catch {
      // A cache outage does not prevent a quota-controlled live request.
    }
  }

  // Collapse simultaneous identical misses into one quota reservation and
  // one upstream request. This prevents bursts of users from duplicating work.
  const pending = IN_FLIGHT.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    await reserveQuota(provider);
    if (typeof fetchImpl !== "function") throw new Error("Football provider fetch is unavailable.");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const headers = { Accept: "application/json" };
    if (provider === "footballData") headers["X-Auth-Token"] = process.env.FOOTBALL_DATA_API_TOKEN;
    try {
      const response = await fetchImpl(url, { headers, signal: controller.signal });
      if (!response?.ok) {
        const error = new Error(config.label + " returned HTTP " + Number(response?.status || 0) + ".");
        error.status = Number(response?.status || 0);
        error.code = error.status === 429 ? "FOOTBALL_PROVIDER_RATE_LIMIT" : "FOOTBALL_PROVIDER_HTTP_ERROR";
        throw error;
      }
      const payload = await response.json();
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error(config.label + " returned invalid JSON data.");
      }
      const result = { provider: config.id, retrievedAt: new Date().toISOString(), data: payload, cached: false };
      if (cache) {
        rememberCache(cacheKey, result);
        try { await writeCache(cacheKey, config.id, result); } catch { /* persistent cache is best-effort */ }
      }
      return result;
    } finally {
      clearTimeout(timeout);
    }
  })();

  IN_FLIGHT.set(cacheKey, request);
  try {
    return await request;
  } finally {
    if (IN_FLIGHT.get(cacheKey) === request) IN_FLIGHT.delete(cacheKey);
  }
}
function parseEspnEvent(event) {
  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors || [];
  const home = competitors.find(item => item.homeAway === "home");
  const away = competitors.find(item => item.homeAway === "away");
  if (!home || !away) return null;
  const status = competition?.status?.type?.name || event?.status?.type?.name || "UNKNOWN";
  return {
    source: "espn",
    sourceId: String(event.id || ""),
    date: event.date || null,
    status,
    competition: event?.league?.name || event?.name || null,
    home: { id: String(home.team?.id || ""), name: home.team?.displayName || home.team?.name || "" },
    away: { id: String(away.team?.id || ""), name: away.team?.displayName || away.team?.name || "" },
    score: {
      home: home.score === undefined ? null : Number(home.score),
      away: away.score === undefined ? null : Number(away.score)
    }
  };
}

export function normalizeEspnEvents(payload) {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  return events.map(parseEspnEvent).filter(Boolean);
}

export function normalizeFootballDataMatches(payload) {
  const matches = Array.isArray(payload?.matches) ? payload.matches : [];
  return matches.map(match => ({
    source: "football-data.org",
    sourceId: String(match.id || ""),
    date: match.utcDate || null,
    status: String(match.status || "UNKNOWN"),
    competition: match.competition?.name || null,
    home: { id: String(match.homeTeam?.id || ""), name: match.homeTeam?.name || "" },
    away: { id: String(match.awayTeam?.id || ""), name: match.awayTeam?.name || "" },
    score: {
      home: Number.isFinite(match.score?.fullTime?.home) ? match.score.fullTime.home : null,
      away: Number.isFinite(match.score?.fullTime?.away) ? match.score.fullTime.away : null
    }
  })).filter(match => match.sourceId && match.home.name && match.away.name);
}

export async function getEspnScoreboard({ league = "eng.1", date, fetchImpl, cache = true } = {}) {
  if (!/^[-a-z0-9.]+$/i.test(String(league))) throw new Error("Invalid ESPN league identifier.");
  const dateValue = String(date || "");
  const validDate = /^\d{8}$/.test(dateValue) || /^\d{8}-\d{8}$/.test(dateValue);
  const params = validDate ? { dates: dateValue } : {};
  const result = await providerGet("espn", league + "/scoreboard", { params, fetchImpl, cache, ttlMs: 5 * 60 * 1000 });
  return { ...result, matches: normalizeEspnEvents(result.data) };
}

export async function getFootballDataMatches({ competitionCode, dateFrom, dateTo, fetchImpl, cache = true } = {}) {
  if (!/^[A-Z0-9_]+$/i.test(String(competitionCode || ""))) throw new Error("A valid football-data.org competition code is required.");
  const params = { dateFrom, dateTo };
  const result = await providerGet("footballData", "competitions/" + encodeURIComponent(competitionCode) + "/matches", {
    params, fetchImpl, cache, ttlMs: 30 * 60 * 1000
  });
  return { ...result, matches: normalizeFootballDataMatches(result.data) };
}
