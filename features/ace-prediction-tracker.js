import { getFirebaseDb } from "../config/firebase-admin.js";

export const ACE_PREDICTIONS_COLLECTION = "zedAceUserPredictions";
const MAX_SCORE = 30;
const MIN_RESULT_DELAY_MS = 150 * 60 * 1000;

function text(value, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function percent(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1) return null;
  return Number((number * 100).toFixed(1));
}

const OUTCOMES = [
  { key: "homeWin", outcome: "HOME_WIN", label: "Home win" },
  { key: "draw", outcome: "DRAW", label: "Draw" },
  { key: "awayWin", outcome: "AWAY_WIN", label: "Away win" }
];

export function getPickFromProbabilities(probabilities = {}) {
  const available = OUTCOMES
    .map(item => ({ ...item, probability: percent(probabilities[item.key]) }))
    .filter(item => item.probability !== null);
  if (!available.length) return null;
  available.sort((a, b) => b.probability - a.probability);
  const { outcome, label, probability } = available[0];
  return { outcome, label, probability };
}

function getMarketPicks(markets = {}) {
  const pairs = [
    ["total15", "over15", "under15", "OVER", "UNDER"],
    ["total25", "over25", "under25", "OVER", "UNDER"],
    ["total35", "over35", "under35", "OVER", "UNDER"],
    ["btts", "bttsYes", "bttsNo", "YES", "NO"]
  ];
  const result = {};
  for (const [key, positiveKey, negativeKey, positiveLabel, negativeLabel] of pairs) {
    const positive = percent(markets[positiveKey]);
    const negative = percent(markets[negativeKey]);
    if (positive === null || negative === null) continue;
    result[key] = positive >= negative
      ? { pick: positiveLabel, probability: positive }
      : { pick: negativeLabel, probability: negative };
  }
  return result;
}

export function getOutcomeFromScore(homeGoals, awayGoals) {
  if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) ||
      homeGoals < 0 || awayGoals < 0 || homeGoals > MAX_SCORE || awayGoals > MAX_SCORE) {
    return null;
  }
  if (homeGoals > awayGoals) return "HOME_WIN";
  if (homeGoals < awayGoals) return "AWAY_WIN";
  return "DRAW";
}

function evaluateMarketPicks(homeGoals, awayGoals, marketPicks = {}) {
  const total = homeGoals + awayGoals;
  const result = {};
  for (const [key, line] of [["total15", 1.5], ["total25", 2.5], ["total35", 3.5]]) {
    const pick = marketPicks[key]?.pick;
    if (pick === "OVER" || pick === "UNDER") {
      result[key] = pick === (total > line ? "OVER" : "UNDER");
    }
  }
  if (marketPicks.btts?.pick === "YES" || marketPicks.btts?.pick === "NO") {
    const bothScored = homeGoals > 0 && awayGoals > 0;
    result.btts = marketPicks.btts.pick === (bothScored ? "YES" : "NO");
  }
  return result;
}

export function summarizeAcePredictions(predictions = []) {
  const records = Array.isArray(predictions) ? predictions : [];
  const settled = records.filter(item => item.status === "SETTLED_MANUAL" && item.result);
  const correct = settled.filter(item => item.result.correct === true).length;
  const byCompetition = new Map();
  const marketPerformance = {
    total15: { correct: 0, settled: 0 },
    total25: { correct: 0, settled: 0 },
    total35: { correct: 0, settled: 0 },
    btts: { correct: 0, settled: 0 }
  };

  for (const item of settled) {
    const competition = text(item.match?.competition || "Competition not supplied", 100);
    const row = byCompetition.get(competition) || { competition, correct: 0, settled: 0 };
    row.settled += 1;
    if (item.result.correct === true) row.correct += 1;
    byCompetition.set(competition, row);

    for (const key of Object.keys(marketPerformance)) {
      const result = item.result.marketResults?.[key];
      if (typeof result !== "boolean") continue;
      marketPerformance[key].settled += 1;
      if (result) marketPerformance[key].correct += 1;
    }
  }

  const withAccuracy = item => ({
    ...item,
    accuracyPercent: item.settled ? Number((item.correct / item.settled * 100).toFixed(1)) : null
  });

  return {
    total: records.length,
    pending: records.filter(item => item.status === "PENDING_RESULT").length,
    settled: settled.length,
    correct,
    incorrect: settled.length - correct,
    accuracyPercent: settled.length ? Number((correct / settled.length * 100).toFixed(1)) : null,
    byCompetition: [...byCompetition.values()]
      .map(withAccuracy)
      .sort((a, b) => b.settled - a.settled || a.competition.localeCompare(b.competition))
      .slice(0, 8),
    markets: Object.fromEntries(
      Object.entries(marketPerformance).map(([key, value]) => [key, withAccuracy(value)])
    )
  };
}

export async function saveAcePrediction({ userId, prediction, evidence, db } = {}) {
  const owner = text(userId, 160);
  const fixture = evidence?.fixture;
  const kickoffTime = prediction?.match?.kickoffTime || fixture?.kickoffTime || null;
  const kickoffMs = new Date(kickoffTime || "").getTime();
  const pick = getPickFromProbabilities(prediction?.prediction);

  if (!owner || !prediction?.match || !fixture?.id || !Number.isFinite(kickoffMs) ||
      kickoffMs <= Date.now() || !pick) {
    return { saved: false, reason: "A signed-in owner and verified future prediction are required." };
  }

  try {
    const firestore = db || getFirebaseDb();
    const timestamp = new Date().toISOString();
    const marketPicks = getMarketPicks(prediction.markets);
    const record = {
      schemaVersion: 1,
      userId: owner,
      provider: text(evidence.provider || "Unknown provider", 100),
      fixtureId: String(fixture.id).slice(0, 80),
      match: {
        homeTeam: text(prediction.match.homeTeam, 120),
        awayTeam: text(prediction.match.awayTeam, 120),
        competition: text(prediction.match.competition || "Competition not supplied", 120),
        kickoffTime: new Date(kickoffMs).toISOString()
      },
      probabilities: Object.fromEntries(
        OUTCOMES.map(item => [item.key, percent(prediction.prediction[item.key])])
      ),
      pick,
      marketPicks,
      expectedGoals: prediction.expectedGoals || null,
      mostLikelyScores: Array.isArray(prediction.mostLikelyScores) ? prediction.mostLikelyScores.slice(0, 5) : [],
      confidence: prediction.confidence ?? null,
      modelVersion: text(prediction.modelVersion || "unknown", 80),
      dataQuality: prediction.dataQuality || null,
      evidence: {
        teamSamples: evidence.providerSampleCount || null,
        sources: Array.isArray(evidence.sources) ? evidence.sources.slice(0, 12) : [],
        homeForm: text(evidence.home?.form || "", 20) || null,
        awayForm: text(evidence.away?.form || "", 20) || null
      },
      status: "PENDING_RESULT",
      result: null,
      predictedAt: timestamp,
      updatedAt: timestamp
    };
    const saved = await firestore.collection(ACE_PREDICTIONS_COLLECTION)
      .doc(owner)
      .collection("predictions")
      .add(record);
    return { saved: true, id: saved.id, status: record.status };
  } catch (error) {
    console.warn("ACE user prediction tracker save failed:", error.message);
    return { saved: false, reason: "Prediction tracker storage is temporarily unavailable." };
  }
}

export async function listAcePredictions(userId, { db, limit = 200 } = {}) {
  const owner = text(userId, 160);
  if (!owner) return { predictions: [], summary: summarizeAcePredictions([]), persistent: false };
  const firestore = db || getFirebaseDb();
  const safeLimit = Math.max(1, Math.min(300, Math.floor(Number(limit) || 200)));
  const snapshot = await firestore.collection(ACE_PREDICTIONS_COLLECTION)
    .doc(owner)
    .collection("predictions")
    .orderBy("predictedAt", "desc")
    .limit(safeLimit)
    .get();
  const predictions = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => String(b.predictedAt || "").localeCompare(String(a.predictedAt || "")))
    .slice(0, safeLimit);
  return {
    predictions,
    summary: summarizeAcePredictions(predictions),
    persistent: true
  };
}

export async function recordAcePredictionResult(userId, predictionId, score = {}, { db } = {}) {
  const owner = text(userId, 160);
  const id = text(predictionId, 180);
  if (!/^[A-Za-z0-9_-]{1,180}$/.test(id)) {
    return { ok: false, status: 400, error: "A valid prediction is required." };
  }
  if (String(score.homeGoals ?? "").trim() === "" || String(score.awayGoals ?? "").trim() === "") {
    return { ok: false, status: 400, error: "Enter both teams' final scores." };
  }
  const homeGoals = Number(score.homeGoals);
  const awayGoals = Number(score.awayGoals);
  if (!owner || !id) return { ok: false, status: 400, error: "A valid prediction is required." };
  if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) ||
      homeGoals < 0 || awayGoals < 0 || homeGoals > MAX_SCORE || awayGoals > MAX_SCORE) {
    return { ok: false, status: 400, error: "Enter a valid final score using whole numbers from 0 to 30." };
  }

  try {
    const firestore = db || getFirebaseDb();
    const reference = firestore.collection(ACE_PREDICTIONS_COLLECTION)
      .doc(owner)
      .collection("predictions")
      .doc(id);
    const snapshot = await reference.get();
    if (!snapshot.exists || snapshot.data()?.userId !== owner) {
      return { ok: false, status: 404, error: "Prediction not found." };
    }
    const prediction = snapshot.data();
    if (prediction.status !== "PENDING_RESULT") {
      return { ok: false, status: 409, error: "A result has already been recorded for this prediction." };
    }
    const kickoffMs = new Date(prediction.match?.kickoffTime || "").getTime();
    if (!Number.isFinite(kickoffMs) || Date.now() < kickoffMs + MIN_RESULT_DELAY_MS) {
      return { ok: false, status: 409, error: "A final score can be recorded 150 minutes after the scheduled kickoff." };
    }

    const actualOutcome = getOutcomeFromScore(homeGoals, awayGoals);
    const marketResults = evaluateMarketPicks(homeGoals, awayGoals, prediction.marketPicks);
    const result = {
      homeGoals,
      awayGoals,
      actualOutcome,
      correct: prediction.pick?.outcome === actualOutcome,
      marketResults,
      source: "user_entered",
      verified: false,
      recordedAt: new Date().toISOString()
    };
    await reference.update({
      status: "SETTLED_MANUAL",
      result,
      updatedAt: result.recordedAt
    });
    return {
      ok: true,
      prediction: { id, ...prediction, status: "SETTLED_MANUAL", result }
    };
  } catch (error) {
    console.error("ACE prediction result could not be recorded:", error.message);
    return { ok: false, status: 503, error: "The result could not be saved. Please try again." };
  }
}
