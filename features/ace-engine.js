import { PredictionEngine } from "../ace/models/engine.ts";
import { collectFootballEvidence, normalizeFootballName, persistPredictionEvidence } from "./football-intelligence.js";
import { saveAcePrediction } from "./ace-prediction-tracker.js";

export function extractMatchup(message = "") {
  const input = String(message).replace(/\s+/g, " ").trim();
  const stopWords = "(?=\\s+(?:fixture|match|game|prediction|predict|forecast|analysis|analyse|analyze|odds|today|tonight|tomorrow|please|kickoff|kick-off|identify|automatically|retrieve|fetch|verified|available|current|live|data|statistics|stats|and\\s+produce|produce|provide|show|include|do\\s+not)\\b|[.!?,;]|$)";
  let match = input.match(new RegExp("\\bbetween\\s+(.{2,100}?)\\s+and\\s+(.{2,100}?)" + stopWords, "i"));
  if (!match) match = input.match(new RegExp("(.{2,100}?)\\s+(?:vs?\\.?|versus|against)\\s+(.{2,100}?)" + stopWords, "i"));
  if (!match) return null;
  const cleanTeam = (value, side) => {
    let result = String(value || "").trim();
    if (side === "home") {
      result = result.replace(new RegExp("^(?:(?:please|can you|could you|would you|predict|prediction for|forecast|analyse|analyze|analysis of|who will win|who wins|will|show me|give me|what about)\\s+)+", "i"), "");
      result = result.replace(new RegExp("^(?:(?:the\\s+)?(?:next|upcoming|scheduled)\\s+)+", "i"), "");
      result = result.replace(new RegExp("^(?:(?:football\\s+)?(?:match|game|fixture)\\s+(?:between\\s+)?) *", "i"), "");
    } else {
      result = result.replace(new RegExp("\\b(?:fixture|match|game|prediction|predict|forecast|analysis|analyse|analyze|odds|today|tonight|tomorrow|please|kickoff|kick-off|who will win|who wins|which team|which side|what is your prediction|identify|automatically|retrieve|fetch|verified|available|current|live|data|statistics|stats|and produce|produce|provide|show|include|do not)\\b[\\s\\S]*$", "i"), "");
    }
    return result.replace(new RegExp("^[\\s,;:-]+|[\\s,;:-]+$", "g"), "").trim();
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

  const evidence = options.evidence || await collectFootballEvidence({
    ...matchup,
    fetchImpl: options.fetchImpl,
    apiKey: options.apiKey,
    cache: options.cache,
    verifiedFixture: options.verifiedFixture
  });

  const kickoffMs = new Date(evidence.fixture?.kickoffTime || "").getTime();
  const requestedTeams = [normalizeFootballName(matchup.homeTeam), normalizeFootballName(matchup.awayTeam)].sort();
  const returnedTeams = [
    normalizeFootballName(evidence.fixture?.homeTeam || ""),
    normalizeFootballName(evidence.fixture?.awayTeam || "")
  ].sort();
  const fixtureTeamsMatchRequested = Boolean(
    evidence.fixture?.homeTeam && evidence.fixture?.awayTeam &&
    requestedTeams[0] && requestedTeams[1] &&
    requestedTeams[0] === returnedTeams[0] &&
    requestedTeams[1] === returnedTeams[1]
  );
  const fixtureVerifiedAndFuture = Boolean(
    evidence.fixture?.id &&
    Number.isFinite(kickoffMs) &&
    kickoffMs > Date.now() &&
    evidence.fixture?.homeTeam &&
    evidence.fixture?.awayTeam &&
    fixtureTeamsMatchRequested
  );
  const homeSamples = Number(evidence.home?.matchesPlayed) || 0;
  const awaySamples = Number(evidence.away?.matchesPlayed) || 0;
  const teamHistoryVerified = Boolean(
    evidence.hasTeamRatings &&
    homeSamples >= 5 &&
    awaySamples >= 5
  );
  const gateMissingInputs = [
    ...(evidence.missingInputs || []),
    ...(!fixtureVerifiedAndFuture
      ? [!evidence.fixture
          ? "No verified future fixture with confirmed teams and kickoff time. No match prediction is issued."
          : !fixtureTeamsMatchRequested
            ? "The provider did not verify a fixture between the two requested clubs. No match prediction is issued."
            : "The fixture kickoff is missing, invalid or no longer in the future. No match prediction is issued."]
      : []),
    ...(!teamHistoryVerified
      ? ["Insufficient verified recent team history (at least five completed matches per team required). No match prediction is issued."]
      : [])
  ];

  if (!fixtureVerifiedAndFuture || !teamHistoryVerified) {
    return {
      source: "ACE statistical engine",
      predictionAvailable: false,
      mode: "insufficient_verified_evidence",
      match: {
        homeTeam: evidence.fixture?.homeTeam || matchup.homeTeam,
        awayTeam: evidence.fixture?.awayTeam || matchup.awayTeam,
        competition: evidence.fixture?.competition || "Not verified",
        kickoffTime: evidence.fixture?.kickoffTime || "Not verified"
      },
      probabilities: null,
      expectedGoals: null,
      fairOdds: null,
      markets: null,
      mostLikelyScores: [],
      modelBreakdown: null,
      dataQuality: { rating: "INSUFFICIENT", missingInputs: gateMissingInputs },
      confidence: null,
      missingInputs: gateMissingInputs,
      modelVersion: null,
      evidence: {
        provider: evidence.provider,
        providerAvailable: evidence.providerAvailable,
        fixtureVerified: Boolean(evidence.fixture),
        fixture: evidence.fixture,
        teamSamples: evidence.providerSampleCount || { home: homeSamples, away: awaySamples },
        sources: evidence.sources || [],
        crossSource: {
          zedFootballDataAvailable: Boolean(options.zedFootballData),
          webSearchUsed: Boolean(options.webSearchUsed),
          webResearch: [],
          webNewsAppliedToNumericProbabilities: false
        }
      },
      persistence: { saved: false, settlementTracked: false }
    };
  }

  const kickoffTime = evidence.fixture.kickoffTime;
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
    // Web reports are attached as qualitative evidence below; no unvalidated news adjustment is applied to model probabilities.
    hasWebIntelligence: false,
    webIntelligenceReliability: 0
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
  const trackerPersistence = await saveAcePrediction({
    userId: options.userId,
    prediction,
    evidence
  });

  const webResearch = (Array.isArray(options.webSearchResults) ? options.webSearchResults : [])
    .filter(item => {
      const text = String(item?.title || "") + " " + String(item?.snippet || item?.summary || "");
      const normalized = text.toLowerCase();
      const hasHome = normalized.includes(matchup.homeTeam.toLowerCase());
      const hasAway = normalized.includes(matchup.awayTeam.toLowerCase());
      return hasHome && hasAway;
    })
    .slice(0, 8)
    .map(item => {
      const url = String(item?.url || "").slice(0, 1000);
      let sourceDomain = String(item?.domain || "");
      try { if (url) sourceDomain = new URL(url).hostname.replace(/^www\./, ""); } catch { /* retain supplied domain */ }
      return {
        title: String(item?.title || "Untitled").slice(0, 240),
        source: String(item?.source || sourceDomain || "Unknown source").slice(0, 120),
        provider: String(item?.provider || "Zed web search").slice(0, 80),
        sourceDomain: sourceDomain.slice(0, 160),
        publishedAt: String(item?.published || item?.pubDate || item?.date || "").slice(0, 80) || null,
        retrievedAt: new Date().toISOString(),
        snippet: String(item?.snippet || item?.summary || item?.description || "").slice(0, 1200)
      };
    })
    .filter(item => item.url || item.snippet);
  const dataEnriched = Boolean(evidence.hasTeamRatings);
  const mode = evidence.fixture
    ? (dataEnriched ? "verified_fixture_with_recent_form" : "verified_fixture_limited_history")
    : (dataEnriched ? "recent_form_enriched_fixture_unverified" : "baseline_or_limited_evidence");
  return {
    source: "ACE statistical engine",
    predictionAvailable: true,
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
      h2hUsedInModelProbabilities: false,
      lineups: evidence.lineups || [],
      lineupFeedChecked: Boolean(evidence.lineupsChecked),
      lineupAdjustmentsApplied: false,
      marketOddsAvailable: Boolean(evidence.marketOdds),
      dataRetrievedAt: evidence.dataRetrievedAt || null,
      sources: evidence.sources || [],
      crossSource: {
        zedFootballDataAvailable: Boolean(options.zedFootballData),
        webSearchUsed: Boolean(options.webSearchUsed),
        webResearch,
        webNewsAppliedToNumericProbabilities: false,
        note: "Zed/ESPN and web results are cross-checking context. Only validated structured provider inputs are passed into the numerical model; qualitative reports are not converted into invented probability adjustments."
      }
    },
    persistence: {
      ...persistence,
      tracker: trackerPersistence
    }
  };
}
