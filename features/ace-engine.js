import { PredictionEngine } from "../ace/models/engine.ts";

function extractMatchup(message = "") {
  const input = String(message).replace(/[?!.]+/g, " ").replace(/\s+/g, " ").trim();
  const match = input.match(/(.{2,100}?)\s+(?:vs?\.?|versus)\s+(.{2,100})/i);
  if (!match) return null;

  const homeTeam = match[1]
    .replace(/^(?:(?:please|can you|could you|would you|predict|prediction for|forecast|analyse|analyze|analysis of|who will win|tell me about)\s+)+/i, "")
    .replace(/^(?:(?:the )?(?:football )?(?:match|game)\s+(?:between\s+)?)*/i, "")
    .trim();
  const awayTeam = match[2]
    .replace(/\b(?:prediction|predict|forecast|analysis|analyse|analyze|odds|today|tonight|tomorrow|please)\b[\s\S]*$/i, "")
    .trim();

  if (!homeTeam || !awayTeam || homeTeam.length > 100 || awayTeam.length > 100) return null;
  return { homeTeam, awayTeam };
}

/**
 * ACE multi-model baseline. Historical ratings, lineup news, and bookmaker
 * prices are not invented. Until verified match history is connected, the
 * model reports LIMITED data quality and LOW confidence.
 */
export function getAcePredictionChatData(message = "") {
  const matchup = extractMatchup(message);
  if (!matchup) return null;

  const prediction = PredictionEngine.calculatePrediction({
    ...matchup,
    competition: "Not verified",
    sampleMatchesCount: 0,
    hasTeamRatings: false,
    hasWebIntelligence: false,
  });

  return {
    source: "ACE statistical engine",
    mode: "baseline_until_verified_historical_data_is_connected",
    match: prediction.match,
    probabilities: {
      homeWin: Number((prediction.prediction.homeWin * 100).toFixed(1)),
      draw: Number((prediction.prediction.draw * 100).toFixed(1)),
      awayWin: Number((prediction.prediction.awayWin * 100).toFixed(1)),
    },
    expectedGoals: prediction.expectedGoals,
    fairOdds: prediction.fairOdds,
    markets: Object.fromEntries(Object.entries(prediction.markets).map(([key, value]) => [key, Number((value * 100).toFixed(1))])),
    mostLikelyScores: prediction.mostLikelyScores.slice(0, 5),
    modelBreakdown: prediction.models,
    dataQuality: prediction.dataQuality,
    confidence: prediction.confidence,
    missingInputs: prediction.dataQuality.missingInputs || [],
    modelVersion: prediction.modelVersion,
  };
}
