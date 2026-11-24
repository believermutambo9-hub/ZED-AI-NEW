import { PredictionEngine } from "../ace/models/engine.ts";
import { collectFootballEvidence, persistPredictionEvidence } from "./football-intelligence.js";

export function extractMatchup(message = "") {
  const input = String(message)
    .replace(/[?!.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  let match = input.match(/\bbetween\s+(.{2,100}?)\s+and\s+(.{2,100}?)(?=\s+(?:prediction|predict|forecast|analysis|odds|today|tonight|tomorrow|please)\b|$)/i);
  if (!match) {
    match = input.match(/(.{2,100}?)\s+(?:vs?\.?|versus|against)\s+(.{2,100}?)(?=\s+(?:prediction|predict|forecast|analysis|odds|today|tonight|tomorrow|please|kickoff|kick-off)\b|$)/i);
  }
  if (!match) return null;

  const cleanTeam = (value, side) => {
    let result = String(value || "").trim();
    if (side === "home") {
      result = result.replace(/^(?:(?:please|can you|could you|would you|predict|prediction for|forecast|analyse|analyze|analysis of|who will win|who wins|will|show me|give me|what about)\s+)+/i, "");
      result = result.replace(/^(?:(?:the\s+)?(?:football\s+)?(?:match|game)\s+(?:between\s+)?)*/i, "");
    } else {
      result = result.replace(/\b(?:prediction|predict|forecast|analysis|analyse|analyze|odds|today|tonight|tomorrow|please|kickoff|kick-off|who will win|who wins|which team|which side|what is your prediction)\b[\s\S]*$/i, "");
    }
    return result.replace(/^[\s,;:-]+|[\s,;:-]+$/g, "").trim();
  };

  const homeTeam = cleanTeam(match[1], "home");
  const awayTeam = cleanTeam(match[2], "away");
  if (!homeTeam || !awayTeam || homeTeam.length > 100 || awayTeam.length > 100) return null;
  if (homeTeam.toLowerCase() === awayTeam.toLowerCase()) return null;
  return { homeTeam, awayTeam };
}

/**
 * Runs ACE using verified pre-kickoff evidence when the configured football
 * provider can supply it. Missing feeds are reported and never fabricated.
 */
export async function getAcePredictionChatData(message = "", options = {}) {
  const matchup = extractMatchup(message);
  if (!matchup) return null;

  const evidence = await collectFootballEvidence({
    ...matchup,
    fetchImpl: options.fetchImpl,
    apiKey: options.apiKey,
    cache: options.cache
  });

  const kickoffTime = evidence.fixture?.kickoffTime || new Date().toISOString();
  const homeContext = evidence.home?.daysRest !== undefined
    ? { daysRest: evidence.home.daysRest }
    : undefined;
  const awayContext = evidence.away?.daysRest !== undefined
    ? { daysRest: evidence.away.daysRest }
    : undefined;

  const prediction = PredictionEngine.calculatePrediction({
    homeTeam: evidence.fixture?.homeTeam || matchup.homeTeam,
    awayTeam: evidence.fixture?.awayTeam || matchup.awayTeam,
    competition: evidence.fixture?.competition || "Competition not confirmed",
    venue: evidence.fixture?.venue || undefined,
    kickoffTime,
    homeElo: evidence.home?.rating,
    awayElo: evidence.away?.rating,
    homeAttack: evidence.home?.attack,
    awayAttack: evidence.away?.attack,
    homeDefense: evidence.home?.defense,
    awayDefense: evidence.away?.defense,
    sampleMatchesCount: evidence.sampleMatchesCount || 0,
    marketOdds: evidence.marketOdds || undefined,
    homeContext,
    awayContext,
    hasTeamRatings: Boolean(evidence.hasTeamRatings),
    teamRatingsSource: evidence.hasTeamRatings ? "RECENT_FORM_PROXY" : undefined,
    hasWebIntelligence: Boolean(evidence.hasWebIntelligence),
    webIntelligenceReliability: evidence.hasWebIntelligence ? 0.7 : 0
  });

  const missingInputs = [...new Set([
    ...(prediction.dataQuality.missingInputs || []),
    ...(evidence.missingInputs || [])
  ])];

  const persistence = await persistPredictionEvidence({
    prediction,
    evidence,
    missingInputs
  });

  const dataEnriched = Boolean(evidence.hasTeamRatings);
  const mode = evidence.fixture
    ? (dataEnriched ? "verified_fixture_with_recent_form" : "verified_fixture_limited_history")
    : (dataEnriched ? "recent_form_enriched_fixture_unverified" : "baseline_or_limited_evidence");
  return {
    source: "ACE statistical engine",
    mode,
    match: prediction.match,
    probabilities: {
      homeWin: Number((prediction.prediction.homeWin * 100).toFixed(1)),
      draw: Number((prediction.prediction.draw * 100).toFixed(1)),
      awayWin: Number((prediction.prediction.awayWin * 100).toFixed(1))
    },
    expectedGoals: prediction.expectedGoals,
    fairOdds: prediction.fairOdds,
    markets: Object.fromEntries(
      Object.entries(prediction.markets).map(([key, value]) => [key, Number((value * 100).toFixed(1))])
    ),
    mostLikelyScores: prediction.mostLikelyScores.slice(0, 5),
    modelBreakdown: prediction.models,
    dataQuality: {
      ...prediction.dataQuality,
      missingInputs
    },
    confidence: prediction.confidence,
    missingInputs,
    modelVersion: prediction.modelVersion,
    evidence: {
      provider: evidence.provider,
      providerConfigured: evidence.providerConfigured,
      providerAvailable: evidence.providerAvailable,
      fixtureVerified: Boolean(evidence.fixture),
      fixture: evidence.fixture,
      teamSamples: evidence.providerSampleCount || {
        home: evidence.home?.matchesPlayed || 0,
        away: evidence.away?.matchesPlayed || 0
      },
      homeForm: evidence.home?.form || null,
      awayForm: evidence.away?.form || null,
      homePointsPerGame: evidence.home?.pointsPerGame ?? null,
      awayPointsPerGame: evidence.away?.pointsPerGame ?? null,
      injuriesChecked: Boolean(evidence.injuriesChecked),
      reportedInjuries: evidence.injuries || [],
      h2h: evidence.h2h || null,
      lineups: evidence.lineups || [],
      lineupFeedChecked: Boolean(evidence.lineupsChecked),
      lineupAdjustmentsApplied: false,
      marketOddsAvailable: Boolean(evidence.marketOdds),
      dataRetrievedAt: evidence.dataRetrievedAt || null,
      sources: evidence.sources || []
    },
    persistence
  };
}
