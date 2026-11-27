import test from "node:test";
import assert from "node:assert/strict";
import { extractMatchup, getAcePredictionChatData } from "../features/ace-engine.js";
import { PredictionEngine, poissonPmf } from "../ace/models/engine.ts";
import { MonteCarloSimulator } from "../ace/simulation/monteCarlo.ts";

test("ACE withholds probabilities when the fixture and recent team history are unverified", async () => {
  const result = await getAcePredictionChatData("Predict Arsenal vs Chelsea", {
    evidence: {
      provider: "API-Football v3",
      providerConfigured: false,
      providerAvailable: false,
      fixture: null,
      home: null,
      away: null,
      hasTeamRatings: false,
      missingInputs: ["No provider data available."]
    }
  });
  assert.ok(result);
  assert.equal(result.source, "ACE statistical engine");
  assert.equal(result.predictionAvailable, false);
  assert.equal(result.mode, "insufficient_verified_evidence");
  assert.equal(result.probabilities, null);
  assert.equal(result.expectedGoals, null);
  assert.equal(result.dataQuality.rating, "INSUFFICIENT");
  assert.ok(result.missingInputs.some((item) => item.includes("verified future fixture")));
  assert.ok(result.missingInputs.some((item) => item.includes("five completed matches")));
});

test("ACE extracts teams from a natural-language automatic fixture request", () => {
  assert.deepEqual(
    extractMatchup("Analyse the next scheduled Arsenal vs Chelsea fixture. Identify the fixture automatically, retrieve verified data, and produce a full prediction."),
    { homeTeam: "Arsenal", awayTeam: "Chelsea" }
  );
  assert.deepEqual(
    extractMatchup("Who will win between Real Madrid and Barcelona?"),
    { homeTeam: "Real Madrid", awayTeam: "Barcelona" }
  );
});

test("ACE rejects a future fixture whose teams do not match the requested clubs", async () => {
  const result = await getAcePredictionChatData("Predict Arsenal vs Chelsea", {
    evidence: {
      provider: "API-Football v3",
      providerAvailable: true,
      fixture: {
        id: 456,
        kickoffTime: new Date(Date.now() + 86400000).toISOString(),
        homeTeam: "Liverpool",
        awayTeam: "Manchester City"
      },
      home: { matchesPlayed: 8 },
      away: { matchesPlayed: 8 },
      hasTeamRatings: true,
      missingInputs: []
    }
  });
  assert.equal(result.predictionAvailable, false);
  assert.equal(result.probabilities, null);
  assert.ok(result.missingInputs.some(item => item.includes("between the two requested clubs")));
});

test("ACE does not create a prediction without a clear matchup", async () => {
  assert.equal(await getAcePredictionChatData("Show me today's football fixtures"), null);
});

test("Poisson probabilities reject invalid rates and goal counts", () => {
  assert.equal(poissonPmf(0, 0), 1);
  assert.equal(poissonPmf(1, 0), 0);
  assert.throws(() => poissonPmf(-1, 1), RangeError);
  assert.throws(() => poissonPmf(1.5, 1), RangeError);
  assert.throws(() => poissonPmf(1, Number.NaN), RangeError);
});

test("Monte Carlo simulator validates rates and returns coherent markets", () => {
  assert.throws(() => MonteCarloSimulator.samplePoisson(Number.POSITIVE_INFINITY), RangeError);
  assert.throws(() => MonteCarloSimulator.simulateMatch({
    simulationsCount: 1000, homeLambda: Number.NaN, awayMu: 1.2
  }), RangeError);

  const result = MonteCarloSimulator.simulateMatch({
    simulationsCount: 1000, homeLambda: 1.4, awayMu: 1.1
  });
  const outcomeTotal = result.probabilities.homeWin + result.probabilities.draw + result.probabilities.awayWin;
  assert.ok(Math.abs(outcomeTotal - 1) < 0.001);
  assert.ok(Math.abs(result.markets.over25 + result.markets.under25 - 1) < 0.001);
  assert.ok(Math.abs(result.markets.bttsYes + result.markets.bttsNo - 1) < 0.001);
  assert.equal(Object.values(result.goalDistributions.home).reduce((a, b) => a + b, 0), 1000);
});

test("xG model keeps all 1X2 probabilities non-negative for extreme mismatches", () => {
  const result = PredictionEngine.calculatePrediction({
    homeTeam: "Strong Home", awayTeam: "Weaker Away", competition: "Test",
    homeXgAvg: 12, awayXgAvg: 0.1, sampleMatchesCount: 0
  });
  const xg = result.models.xgModel;
  assert.ok(xg.homeWin >= 0 && xg.draw >= 0 && xg.awayWin >= 0);
  assert.ok(Math.abs(xg.homeWin + xg.draw + xg.awayWin - 1) < 0.0001);
  assert.ok(Math.abs(result.models.poisson.homeWin + result.models.poisson.draw + result.models.poisson.awayWin - 1) < 0.0002);
});


test("ACE attaches web and Zed evidence without silently changing numerical probabilities", async () => {
  const result = await getAcePredictionChatData("Predict Arsenal vs Chelsea", {
    webSearchUsed: true,
    zedFootballData: "ESPN fixture evidence",
    evidence: {
      provider: "API-Football v3",
      providerConfigured: true,
      providerAvailable: true,
      fixture: {
        id: 123,
        kickoffTime: new Date(Date.now() + 86400000).toISOString(),
        competition: "Premier League",
        homeTeam: "Arsenal",
        awayTeam: "Chelsea"
      },
      home: { matchesPlayed: 5, rating: 1520, attack: 105, defense: 101, form: "WWDLW" },
      away: { matchesPlayed: 5, rating: 1490, attack: 99, defense: 103, form: "WDLWL" },
      hasTeamRatings: true,
      sampleMatchesCount: 5,
      missingInputs: [],
      sources: ["API-Football v3"]
    },
    webSearchResults: [{
      title: "Arsenal vs Chelsea team news",
      source: "Example source",
      published: "Today",
      url: "https://example.com/team-news",
      snippet: "A reported team update."
    }]
  });
  assert.equal(result.evidence.crossSource.zedFootballDataAvailable, true);
  assert.equal(result.evidence.crossSource.webSearchUsed, true);
  assert.equal(result.evidence.crossSource.webResearch.length, 1);
  assert.equal("url" in result.evidence.crossSource.webResearch[0], false);
  assert.equal(result.evidence.crossSource.webNewsAppliedToNumericProbabilities, false);
});
