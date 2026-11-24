import { createHash } from "node:crypto";
import { getFirebaseDb } from "../config/firebase-admin.js";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
const CACHE_COLLECTION = "zedFootballDataCache";
const MEMORY_CACHE = new Map();
const DEFAULT_TIMEOUT_MS = 9000;
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);
const MIN_RATING_MATCHES = 5;
const HISTORY_LIMIT = 12;

export function normalizeFootballName(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|cf|sc|afc|club|ac|ssc|as|rb|cd)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function providerConfig(options = {}) {
  const apiKey = options.apiKey || process.env.API_FOOTBALL_KEY || process.env.RAPIDAPI_KEY || "";
  const rapidApi = !options.apiKey && !process.env.API_FOOTBALL_KEY && Boolean(process.env.RAPIDAPI_KEY);
  return {
    apiKey,
    rapidApi,
    configured: Boolean(apiKey)
  };
}

export function getFootballIntelligenceStatus() {
  const config = providerConfig();
  let firestoreAvailable = false;
  try {
    getFirebaseDb();
    firestoreAvailable = true;
  } catch {
    // Firestore is optional for public-data caching; predictions still run without it.
  }
  return {
    provider: "API-Football v3",
    providerConfigured: config.configured,
    persistentCacheAvailable: firestoreAvailable,
    fallback: "ACE baseline with explicit low-confidence disclosure"
  };
}

function cacheId(key) {
  return createHash("sha256").update(String(key)).digest("hex");
}

async function readPersistentCache(key, ttlMs) {
  try {
    const db = getFirebaseDb();
    const snapshot = await db.collection(CACHE_COLLECTION).doc(cacheId(key)).get();
    if (!snapshot.exists) return null;
    const record = snapshot.data() || {};
    if (!record.payload || !Number.isFinite(record.savedAt) || Date.now() - record.savedAt > ttlMs) return null;
    return record.payload;
  } catch {
    return null;
  }
}

async function writePersistentCache(key, payload) {
  try {
    const db = getFirebaseDb();
    await db.collection(CACHE_COLLECTION).doc(cacheId(key)).set({
      payload,
      savedAt: Date.now(),
      source: "api-football-v3"
    }, { merge: true });
  } catch {
    // Caching must never cause a prediction request to fail.
  }
}

function cacheAllowed(fetchImpl, options) {
  return fetchImpl === globalThis.fetch && options.cache !== false;
}

async function apiGet(endpoint, params, options = {}) {
  const config = providerConfig(options);
  if (!config.configured) {
    const error = new Error("API_FOOTBALL_KEY is not configured on this staging service.");
    error.code = "FOOTBALL_PROVIDER_NOT_CONFIGURED";
    throw error;
  }

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("Football data fetch is unavailable.");

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  }
  const requestUrl = API_FOOTBALL_BASE + "/" + endpoint + (query.size ? "?" + query.toString() : "");
  const cacheKey = "api-football:" + requestUrl;
  const ttlMs = options.ttlMs || 15 * 60 * 1000;
  const allowCache = cacheAllowed(fetchImpl, options);

  if (allowCache) {
    const memoryRecord = MEMORY_CACHE.get(cacheKey);
    if (memoryRecord && Date.now() - memoryRecord.savedAt < ttlMs) return memoryRecord.payload;
    const persistent = await readPersistentCache(cacheKey, ttlMs);
    if (persistent) {
      MEMORY_CACHE.set(cacheKey, { payload: persistent, savedAt: Date.now() });
      return persistent;
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const headers = { Accept: "application/json" };
  if (config.rapidApi) {
    headers["x-rapidapi-key"] = config.apiKey;
    headers["x-rapidapi-host"] = "api-football-v1.p.rapidapi.com";
  } else {
    headers["x-apisports-key"] = config.apiKey;
  }

  try {
    const response = await fetchImpl(requestUrl, {
      method: "GET",
      headers,
      signal: controller.signal
    });
    if (!response || !response.ok) {
      const status = Number(response?.status || 0);
      const error = new Error("Football provider returned HTTP " + (status || "unknown") + ".");
      error.code = status === 429 ? "FOOTBALL_PROVIDER_RATE_LIMIT" : "FOOTBALL_PROVIDER_HTTP_ERROR";
      error.status = status;
      throw error;
    }
    const json = await response.json();
    const providerErrors = json?.errors;
    const hasErrors = Array.isArray(providerErrors)
      ? providerErrors.length > 0
      : Boolean(providerErrors && typeof providerErrors === "object" && Object.keys(providerErrors).length);
    if (hasErrors) {
      const safeError = Object.values(providerErrors).join(", ").slice(0, 250);
      const error = new Error("Football provider rejected the request: " + safeError);
      error.code = "FOOTBALL_PROVIDER_RESPONSE_ERROR";
      throw error;
    }
    if (!Array.isArray(json?.response)) {
      throw new Error("Football provider returned an invalid response structure.");
    }

    const payload = {
      response: json.response,
      results: Number.isFinite(json.results) ? json.results : json.response.length,
      paging: json.paging || null
    };

    if (allowCache) {
      MEMORY_CACHE.set(cacheKey, { payload, savedAt: Date.now() });
      await writePersistentCache(cacheKey, payload);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function chooseTeam(records, requestedName) {
  const wanted = normalizeFootballName(requestedName);
  const ranked = (Array.isArray(records) ? records : [])
    .map(record => {
      const team = record?.team || {};
      const normalized = normalizeFootballName(team.name || "");
      let score = 0;
      if (normalized && normalized === wanted) score = 100;
      else if (normalized && (normalized.includes(wanted) || wanted.includes(normalized))) score = 75;
      else {
        const wantedTokens = wanted.split(" ");
        const teamTokens = normalized.split(" ");
        const overlap = wantedTokens.filter(token => teamTokens.includes(token)).length;
        score = wantedTokens.length ? (overlap / wantedTokens.length) * 50 : 0;
      }
      return { record, score, normalized };
    })
    .filter(item => Number.isInteger(Number(item.record?.team?.id)) && item.score >= 50)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) return null;
  if (ranked.length > 1 && ranked[0].score === ranked[1].score && ranked[0].normalized !== ranked[1].normalized) {
    return null;
  }
  return ranked[0].record;
}

async function findTeam(name, options = {}) {
  const result = await apiGet("teams", { search: name }, {
    ...options,
    ttlMs: 24 * 60 * 60 * 1000
  });
  return chooseTeam(result.response, name);
}

function validScore(value) {
  return Number.isInteger(value) && value >= 0;
}

function normalizeFinishedFixture(item) {
  const fixture = item?.fixture || {};
  const teams = item?.teams || {};
  const goals = item?.goals || {};
  const date = new Date(fixture.date || "");
  if (!Number.isFinite(date.getTime())) return null;
  if (!FINISHED_STATUSES.has(String(fixture.status?.short || "").toUpperCase())) return null;
  if (!validScore(goals.home) || !validScore(goals.away)) return null;
  const homeId = Number(teams.home?.id);
  const awayId = Number(teams.away?.id);
  if (!Number.isInteger(homeId) || !Number.isInteger(awayId) || homeId === awayId) return null;
  return {
    id: fixture.id,
    date: date.toISOString(),
    homeId,
    awayId,
    homeName: String(teams.home?.name || "Home"),
    awayName: String(teams.away?.name || "Away"),
    homeGoals: goals.home,
    awayGoals: goals.away,
    league: String(item?.league?.name || "")
  };
}

async function getRecentTeamMatches(teamId, before, options = {}) {
  const result = await apiGet("fixtures", { team: teamId, last: 30 }, {
    ...options,
    ttlMs: 4 * 60 * 60 * 1000
  });
  const cutoff = new Date(before).getTime();
  return result.response
    .map(normalizeFinishedFixture)
    .filter(Boolean)
    .filter(match => new Date(match.date).getTime() < cutoff)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, HISTORY_LIMIT);
}

function deriveTeamStrength(matches, teamId, kickoffTime) {
  const ordered = [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!ordered.length) return null;

  let goalsFor = 0;
  let goalsAgainst = 0;
  let points = 0;
  let goalDifference = 0;
  for (const match of ordered) {
    const isHome = match.homeId === teamId;
    const scored = isHome ? match.homeGoals : match.awayGoals;
    const conceded = isHome ? match.awayGoals : match.homeGoals;
    goalsFor += scored;
    goalsAgainst += conceded;
    goalDifference += scored - conceded;
    points += scored > conceded ? 3 : scored === conceded ? 1 : 0;
  }

  const count = ordered.length;
  const averageFor = (goalsFor + 5 * 1.30) / (count + 5);
  const averageAgainst = (goalsAgainst + 5 * 1.30) / (count + 5);
  const pointsPerGame = points / count;
  const goalDiffPerGame = goalDifference / count;

  // This is a transparent recent-form rating proxy, not a published Elo rating.
  const eloProxy = Math.max(1325, Math.min(1675,
    1500 + (pointsPerGame - 1.3) * 105 + goalDiffPerGame * 35
  ));
  const attack = Math.max(65, Math.min(140, (averageFor / 1.30) * 100));
  const defense = Math.max(65, Math.min(140, 100 + ((1.30 - averageAgainst) / 1.30) * 35));
  const latest = ordered[ordered.length - 1];
  const kickoffMs = new Date(kickoffTime).getTime();
  const restDays = Number.isFinite(kickoffMs)
    ? Math.max(0, Math.floor((kickoffMs - new Date(latest.date).getTime()) / 86400000))
    : undefined;

  return {
    rating: Number(eloProxy.toFixed(1)),
    attack: Number(attack.toFixed(1)),
    defense: Number(defense.toFixed(1)),
    matchesPlayed: count,
    goalsForPerMatch: Number((goalsFor / count).toFixed(2)),
    goalsAgainstPerMatch: Number((goalsAgainst / count).toFixed(2)),
    pointsPerGame: Number(pointsPerGame.toFixed(2)),
    form: ordered.slice(-5).map(match => {
      const isHome = match.homeId === teamId;
      const scored = isHome ? match.homeGoals : match.awayGoals;
      const conceded = isHome ? match.awayGoals : match.homeGoals;
      return scored > conceded ? "W" : scored === conceded ? "D" : "L";
    }).join(""),
    lastMatchDate: latest.date,
    daysRest: restDays
  };
}

function findUpcomingFixture(records, homeId, awayId) {
  const now = Date.now();
  const candidates = (Array.isArray(records) ? records : []).filter(item => {
    const fixture = item?.fixture || {};
    const date = new Date(fixture.date || "").getTime();
    const teams = item?.teams || {};
    const status = String(fixture.status?.short || "").toUpperCase();
    return Number(teams.home?.id) === homeId &&
      Number(teams.away?.id) === awayId &&
      Number.isFinite(date) && date > now &&
      (status === "NS" || status === "TBD" || status === "PST");
  });
  candidates.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));
  return candidates[0] || null;
}

function parseDecimal(value) {
  const number = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(number) && number > 1.01 && number < 1000 ? number : null;
}

export function extractMatchWinnerOdds(records, homeTeamName, awayTeamName) {
  for (const fixtureRecord of Array.isArray(records) ? records : []) {
    for (const bookmaker of fixtureRecord?.bookmakers || []) {
      for (const bet of bookmaker?.bets || []) {
        const betName = String(bet?.name || "").toLowerCase();
        if (!/match winner|1x2|full time result|winner/.test(betName)) continue;
        const values = Array.isArray(bet.values) ? bet.values : [];
        const find = (name) => {
          const target = normalizeFootballName(name);
          const item = values.find(entry => {
            const value = normalizeFootballName(entry?.value || "");
            if (target === "draw") return value === "draw" || value === "tie";
            return value === target || value === (target + " fc");
          });
          return parseDecimal(item?.odd);
        };
        const home = find(homeTeamName) || find("home");
        const draw = find("draw");
        const away = find(awayTeamName) || find("away");
        if (home && draw && away) return { homeOdds: home, drawOdds: draw, awayOdds: away };
      }
    }
  }
  return null;
}

function mapInjuries(records, homeId, awayId) {
  return (Array.isArray(records) ? records : []).map(item => ({
    teamId: Number(item?.team?.id) || null,
    team: Number(item?.team?.id) === homeId ? "HOME" : Number(item?.team?.id) === awayId ? "AWAY" : "UNKNOWN",
    player: String(item?.player?.name || "Unidentified player"),
    type: String(item?.player?.type || ""),
    reason: String(item?.player?.reason || "")
  })).filter(item => item.team !== "UNKNOWN");
}

export async function collectFootballEvidence({
  homeTeam,
  awayTeam,
  fetchImpl = globalThis.fetch,
  apiKey,
  cache = true
} = {}) {
  const empty = {
    provider: "API-Football v3",
    providerAvailable: false,
    providerConfigured: Boolean(apiKey || process.env.API_FOOTBALL_KEY || process.env.RAPIDAPI_KEY),
    fixture: null,
    home: null,
    away: null,
    sampleMatchesCount: 0,
    hasTeamRatings: false,
    hasWebIntelligence: false,
    injuries: [],
    injuriesChecked: false,
    marketOdds: null,
    missingInputs: []
  };

  if (!homeTeam || !awayTeam || normalizeFootballName(homeTeam) === normalizeFootballName(awayTeam)) {
    return { ...empty, missingInputs: ["A valid pair of different teams is required."] };
  }
  if (!empty.providerConfigured) {
    return { ...empty, missingInputs: ["API_FOOTBALL_KEY is not configured on the staging service."] };
  }

  const options = { fetchImpl, apiKey, cache };
  try {
    const [homeRecord, awayRecord] = await Promise.all([
      findTeam(homeTeam, options),
      findTeam(awayTeam, options)
    ]);
    if (!homeRecord || !awayRecord) {
      return {
        ...empty,
        providerAvailable: true,
        missingInputs: [
          !homeRecord ? "Could not uniquely resolve the home team in API-Football." : "",
          !awayRecord ? "Could not uniquely resolve the away team in API-Football." : ""
        ].filter(Boolean)
      };
    }

    const homeId = Number(homeRecord.team.id);
    const awayId = Number(awayRecord.team.id);
    if (homeId === awayId) {
      return { ...empty, providerAvailable: true, missingInputs: ["The provider resolved both names to the same team."] };
    }

    const h2hResponse = await apiGet("fixtures/headtohead", { h2h: homeId + "-" + awayId, next: 1 }, {
      ...options,
      ttlMs: 20 * 60 * 1000
    });
    const upcoming = findUpcomingFixture(h2hResponse.response, homeId, awayId);
    const kickoffTime = upcoming?.fixture?.date || new Date().toISOString();

    const [homeMatches, awayMatches] = await Promise.all([
      getRecentTeamMatches(homeId, kickoffTime, options),
      getRecentTeamMatches(awayId, kickoffTime, options)
    ]);

    const home = deriveTeamStrength(homeMatches, homeId, kickoffTime);
    const away = deriveTeamStrength(awayMatches, awayId, kickoffTime);
    const fixture = upcoming ? {
      id: Number(upcoming.fixture.id),
      kickoffTime: new Date(upcoming.fixture.date).toISOString(),
      competition: String(upcoming.league?.name || "Competition not supplied"),
      country: String(upcoming.league?.country || ""),
      venue: String(upcoming.fixture?.venue?.name || ""),
      status: String(upcoming.fixture?.status?.short || "NS"),
      homeTeam: String(upcoming.teams?.home?.name || homeTeam),
      awayTeam: String(upcoming.teams?.away?.name || awayTeam)
    } : null;

    let injuries = [];
    let injuriesChecked = false;
    let marketOdds = null;
    const missingInputs = [];
    if (!home || home.matchesPlayed < MIN_RATING_MATCHES) {
      missingInputs.push("Insufficient completed home-team history (5 matches minimum for a form rating).");
    }
    if (!away || away.matchesPlayed < MIN_RATING_MATCHES) {
      missingInputs.push("Insufficient completed away-team history (5 matches minimum for a form rating).");
    }
    if (!fixture) {
      missingInputs.push("No verified upcoming fixture was found for this exact home/away pairing; competition and kickoff are unconfirmed.");
      missingInputs.push("No fixture-specific official injury/lineup feed is available without a verified fixture ID.");
      missingInputs.push("No fixture-specific bookmaker odds are available without a verified fixture ID.");
    } else {
      const settled = await Promise.allSettled([
        apiGet("injuries", { fixture: fixture.id }, { ...options, ttlMs: 4 * 60 * 60 * 1000 }),
        apiGet("odds", { fixture: fixture.id }, { ...options, ttlMs: 3 * 60 * 60 * 1000 })
      ]);
      if (settled[0].status === "fulfilled") {
        injuriesChecked = true;
        injuries = mapInjuries(settled[0].value.response, homeId, awayId);
      } else {
        missingInputs.push("Official injury feed could not be checked for this fixture.");
      }
      if (settled[1].status === "fulfilled") {
        marketOdds = extractMatchWinnerOdds(settled[1].value.response, homeTeam, awayTeam);
      }
      if (!marketOdds) missingInputs.push("Comparable bookmaker 1X2 odds were unavailable for this fixture.");
      if (!injuries.length && injuriesChecked) {
        missingInputs.push("The injury feed returned no listed absences; this is not proof that every player is fully fit.");
      }
    }

    const ratingsAvailable = Boolean(home && away &&
      home.matchesPlayed >= MIN_RATING_MATCHES &&
      away.matchesPlayed >= MIN_RATING_MATCHES);

    return {
      provider: "API-Football v3",
      providerAvailable: true,
      providerConfigured: true,
      providerSampleCount: {
        home: home?.matchesPlayed || 0,
        away: away?.matchesPlayed || 0
      },
      home,
      away,
      fixture,
      sampleMatchesCount: Math.min(home?.matchesPlayed || 0, away?.matchesPlayed || 0),
      hasTeamRatings: ratingsAvailable,
      hasWebIntelligence: Boolean(fixture && injuriesChecked),
      injuries,
      injuriesChecked,
      marketOdds,
      missingInputs,
      dataRetrievedAt: new Date().toISOString(),
      sources: ["API-Football v3"]
    };
  } catch (error) {
    const reason = error?.code === "FOOTBALL_PROVIDER_RATE_LIMIT"
      ? "API-Football rate limit reached."
      : error?.code === "FOOTBALL_PROVIDER_NOT_CONFIGURED"
        ? "API-Football credentials are not configured."
        : "API-Football data could not be retrieved: " + String(error?.message || "provider error").slice(0, 180);
    return {
      ...empty,
      providerAvailable: false,
      missingInputs: [reason]
    };
  }
}
