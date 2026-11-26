import { createHash } from "node:crypto";
import { getFirebaseDb } from "../config/firebase-admin.js";

const CACHE = "zedFootballProviderCache";
const USAGE = "zedFootballProviderUsage";
const DEFAULT_TIMEOUT_MS = 9000;

const PROVIDERS = Object.freeze({
  espn: {
    id: "espn",
    label: "ESPN",
    baseUrl: "https://site.api.espn.com/apis/site/v2/sports/soccer",
    dailyLimit: Number(process.env.ESPN_DAILY_REQUEST_LIMIT) || 500,
    minuteLimit: Number(process.env.ESPN_PER_MINUTE_LIMIT) || 30,
    configured: true
  },
  footballData: {
    id: "football-data.org",
    label: "Football-data.org",
    baseUrl: "https://api.football-data.org/v4",
    dailyLimit: Number(process.env.FOOTBALL_DATA_DAILY_REQUEST_LIMIT) || 100,
    minuteLimit: Number(process.env.FOOTBALL_DATA_PER_MINUTE_LIMIT) || 10,
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
  return Object.values(PROVIDERS).map(({ id, label, dailyLimit, minuteLimit, configured }) => ({
    id, label, dailyLimit, minuteLimit, configured
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
    if (dailyUsed >= config.dailyLimit) {
      const error = new Error(config.label + " daily request budget reached.");
      error.code = "FOOTBALL_PROVIDER_DAILY_QUOTA";
      throw error;
    }
    if (minuteUsed >= config.minuteLimit) {
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
  return value.payload;
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

  if (cache) {
    try {
      const cached = await readCache(cacheKey, ttlMs);
      if (cached) return { ...cached, cached: true };
    } catch {
      // A cache outage does not prevent a quota-controlled live request.
    }
  }

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
    if (!payload || typeof payload !== "object") throw new Error(config.label + " returned invalid JSON data.");
    const result = { provider: config.id, retrievedAt: new Date().toISOString(), data: payload, cached: false };
    if (cache) {
      try { await writeCache(cacheKey, config.id, result); } catch { /* cache is best-effort */ }
    }
    return result;
  } finally {
    clearTimeout(timeout);
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
  const params = date ? { dates: String(date).replace(/\D/g, "").slice(0, 8) } : {};
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
