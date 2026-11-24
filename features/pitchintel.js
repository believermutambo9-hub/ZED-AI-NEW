import { randomUUID } from "node:crypto";

const API_PREFIX = "/api/v1/zed";
const REQUEST_TIMEOUT_MS = 12000;

function getServiceConfig() {
  const baseUrl = String(process.env.PITCHINTEL_API_URL || "").trim().replace(/\/+$/, "");
  const secret = String(process.env.PITCHINTEL_SERVICE_SECRET || "").trim();

  if (!baseUrl || !secret) {
    return { configured: false, reason: "missing_configuration" };
  }

  try {
    const parsed = new URL(baseUrl);
    if (!["https:", "http:"].includes(parsed.protocol)) {
      return { configured: false, reason: "invalid_url" };
    }
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      return { configured: false, reason: "https_required" };
    }
    return { configured: true, baseUrl: parsed.origin, secret };
  } catch {
    return { configured: false, reason: "invalid_url" };
  }
}

async function requestPitchIntel(path, { method = "GET", body, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const config = getServiceConfig();
  if (!config.configured) {
    return { ok: false, configured: false, reason: config.reason };
  }

  const requestId = `zed-${randomUUID()}`;
  const headers = {
    accept: "application/json",
    "x-pitchintel-service-secret": config.secret,
    "x-request-id": requestId
  };

  const options = {
    method,
    headers,
    signal: AbortSignal.timeout(timeoutMs)
  };

  if (body !== undefined) {
    headers["content-type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  try {
    const url = new URL(`${API_PREFIX}${path}`, config.baseUrl);
    const response = await fetch(url, options);
    const raw = await response.text();
    let data = null;

    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        return {
          ok: false,
          configured: true,
          status: response.status,
          error: "The football service returned an invalid response."
        };
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        configured: true,
        status: response.status,
        requestId: data?.requestId || requestId,
        error: "The football intelligence service is temporarily unavailable."
      };
    }

    return {
      ok: true,
      configured: true,
      status: response.status,
      requestId: data?.requestId || response.headers?.get?.("x-request-id") || requestId,
      data
    };
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return {
      ok: false,
      configured: true,
      error: timedOut
        ? "The football intelligence service timed out."
        : "The football intelligence service could not be reached."
    };
  }
}

export function isPitchIntelConfigured() {
  return getServiceConfig().configured;
}

export function getPitchIntelHealth() {
  return requestPitchIntel("/health");
}

export function getPitchIntelUpcoming({ hours = 5, competition, timezone = "Africa/Lusaka" } = {}) {
  const safeHours = Math.min(720, Math.max(1, Number.parseInt(hours, 10) || 5));
  const query = new URLSearchParams({
    hours: String(safeHours),
    timezone
  });
  if (competition) query.set("competition", String(competition).slice(0, 40));
  return requestPitchIntel(`/upcoming?${query.toString()}`);
}

export function getPitchIntelPrediction({ homeTeam, awayTeam, competition, fixtureId } = {}) {
  const home = String(homeTeam || "").trim().slice(0, 100);
  const away = String(awayTeam || "").trim().slice(0, 100);
  if ((!home || !away) && !fixtureId) {
    return Promise.resolve({
      ok: false,
      configured: isPitchIntelConfigured(),
      error: "Provide both teams or a valid fixture ID."
    });
  }

  const body = {};
  if (home) body.homeTeam = home;
  if (away) body.awayTeam = away;
  if (competition) body.competition = String(competition).trim().slice(0, 100);
  if (fixtureId) body.fixtureId = String(fixtureId).slice(0, 30);
  return requestPitchIntel("/predict", { method: "POST", body });
}

export function getPitchIntelHeadToHead(homeTeam, awayTeam) {
  const home = String(homeTeam || "").trim().slice(0, 100);
  const away = String(awayTeam || "").trim().slice(0, 100);
  if (!home || !away) {
    return Promise.resolve({ ok: false, configured: isPitchIntelConfigured(), error: "Both teams are required." });
  }

  const query = new URLSearchParams({ home, away });
  return requestPitchIntel(`/h2h?${query.toString()}`);
}

export function getPitchIntelNews(category) {
  const query = new URLSearchParams();
  if (category) query.set("category", String(category).slice(0, 60));
  return requestPitchIntel(`/news${query.size ? `?${query.toString()}` : ""}`);
}

function extractMatchup(message) {
  const input = String(message || "").replace(/[?!.]+/g, " ").replace(/\s+/g, " ").trim();
  const match = input.match(/(.{2,120}?)\s+(?:vs?\.?|versus)\s+(.{2,120})/i);
  if (!match) return null;

  const cleanHome = match[1]
    .replace(/^(?:(?:please|can you|could you|would you|give me|show me|predict|prediction for|forecast|analyse|analyze|analysis of|who will win|head[ -]?to[ -]?head|h2h|previous meetings)\s+)+/i, "")
    .replace(/^(?:(?:the )?(?:football )?(?:match|game)\s+(?:between\s+)?)*/i, "")
    .trim();
  const cleanAway = match[2]
    .replace(/\b(?:prediction|predict|forecast|analysis|analyse|analyze|odds|today|tonight|tomorrow|this week|please)\b[\s\S]*$/i, "")
    .trim();

  if (!cleanHome || !cleanAway || cleanHome.length > 100 || cleanAway.length > 100) {
    return null;
  }
  return { homeTeam: cleanHome, awayTeam: cleanAway };
}

function upcomingHours(message) {
  const text = String(message || "").toLowerCase();
  if (/\b(next 7 days|next week|this week)\b/.test(text)) return 168;
  if (/\b(tomorrow|next 24 hours|24 hours)\b/.test(text)) return 48;
  if (/\b(today|tonight|next 12 hours|12 hours)\b/.test(text)) return 24;
  const match = text.match(/\bnext\s+(\d{1,3})\s+hours?\b/);
  if (match) return Math.min(720, Math.max(1, Number(match[1])));
  return 5;
}

/**
 * Returns PitchIntel evidence for supported chat intents. A null result tells
 * Zed to use its existing football provider rather than losing a working path.
 */
export async function getPitchIntelChatData(message = "") {
  if (!isPitchIntelConfigured()) return null;

  const text = String(message || "");
  const matchup = extractMatchup(text);

  let result;
  let type;

  if (/\b(news|headlines|transfer|injur(?:y|ies)|team news)\b/i.test(text)) {
    type = "news";
    result = await getPitchIntelNews();
  } else if (/\b(head[\s-]?to[\s-]?head|h2h|previous meetings)\b/i.test(text) && matchup) {
    type = "head_to_head";
    result = await getPitchIntelHeadToHead(matchup.homeTeam, matchup.awayTeam);
  } else if (matchup && /\b(predict|prediction|forecast|analysis|analyse|analyze|probability|probabilities|odds|xg|expected goals)\b/i.test(text)) {
    type = "prediction";
    result = await getPitchIntelPrediction(matchup);
  } else if (matchup) {
    type = "prediction";
    result = await getPitchIntelPrediction(matchup);
  } else if (/\b(upcoming|fixtures|matches today|today's matches|todays matches|who is playing|who are playing|next matches)\b/i.test(text)) {
    type = "upcoming";
    result = await getPitchIntelUpcoming({ hours: upcomingHours(text) });
  } else {
    return null;
  }

  if (!result?.ok) return null;
  return {
    ok: true,
    source: "PitchIntel",
    type,
    requestId: result.requestId,
    evidence: result.data
  };
}
