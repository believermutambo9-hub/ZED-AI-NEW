import test from "node:test";
import assert from "node:assert/strict";
import { getAcePredictionChatData, extractMatchup } from "../features/ace-engine.js";
import { PredictionEngine } from "../ace/models/engine.ts";

test("ACE creates a transparent low-confidence baseline when no provider key is configured", async () => {
  const result = await getAcePredictionChatData("Predict Arsenal vs Chelsea", { cache: false });
  assert.ok(result);
  assert.equal(result.source, "ACE statistical engine");
  assert.equal(result.mode, "baseline_or_limited_evidence");
  const total = result.probabilities.homeWin + result.probabilities.draw + result.probabilities.awayWin;
  assert.ok(Math.abs(total - 100) < 0.3);
  assert.equal(result.dataQuality.rating, "LIMITED");
  assert.equal(result.confidence.level, "LOW");
  assert.ok(result.missingInputs.some((item) => item.includes("historical Elo")));
  assert.equal(result.modelBreakdown.monteCarlo.simulationsCount, 5000);
  assert.equal(result.evidence.providerConfigured, false);
});

test("ACE parses common explicit matchup phrasing", () => {
  assert.deepEqual(extractMatchup("Predict Arsenal vs Chelsea tonight"), {
    homeTeam: "Arsenal",
    awayTeam: "Chelsea"
  });
  assert.deepEqual(extractMatchup("Who will win between Real Madrid and Barcelona?"), {
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona"
  });
  assert.deepEqual(extractMatchup("Can you analyse Bayern Munich versus PSG?"), {
    homeTeam: "Bayern Munich",
    awayTeam: "PSG"
  });
  assert.deepEqual(extractMatchup("Arsenal vs Chelsea, who will win?"), {
    homeTeam: "Arsenal",
    awayTeam: "Chelsea"
  });
  assert.deepEqual(extractMatchup("Which team will win between Inter Milan and AC Milan?"), {
    homeTeam: "Inter Milan",
    awayTeam: "AC Milan"
  });
});

test("ACE does not create a prediction without a clear matchup", async () => {
  assert.equal(await getAcePredictionChatData("Show me today's football fixtures"), null);
});

test("ACE caps data quality when only recent-form proxies and no verified event xG are available", () => {
  const prediction = PredictionEngine.calculatePrediction({
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    competition: "Test League",
    homeElo: 1580,
    awayElo: 1510,
    sampleMatchesCount: 12,
    hasTeamRatings: true,
    teamRatingsSource: "RECENT_FORM_PROXY",
    hasWebIntelligence: true,
    webIntelligenceReliability: 0.7,
    marketOdds: { homeOdds: 2.1, drawOdds: 3.3, awayOdds: 3.6 }
  });

  assert.ok(prediction.dataQuality.score <= 0.68);
  assert.notEqual(prediction.confidence.level, "HIGH");
  assert.ok(prediction.dataQuality.missingInputs.some(item => item.includes("Official calibrated Elo")));
  assert.ok(prediction.dataQuality.missingInputs.some(item => item.includes("Verified event-level expected-goals")));
});

