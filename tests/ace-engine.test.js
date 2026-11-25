import test from "node:test";
import assert from "node:assert/strict";
import { getAcePredictionChatData } from "../features/ace-engine.js";
import { PredictionEngine, poissonPmf } from "../ace/models/engine.ts";
import { MonteCarloSimulator } from "../ace/simulation/monteCarlo.ts";

test("ACE produces a transparent baseline prediction for an explicit matchup", () => {
  const result = getAcePredictionChatData("Predict Arsenal vs Chelsea");
  assert.ok(result);
  assert.equal(result.source, "ACE statistical engine");
  const total = result.probabilities.homeWin + result.probabilities.draw + result.probabilities.awayWin;
  assert.ok(Math.abs(total - 100) < 0.3);
  assert.equal(result.dataQuality.rating, "LIMITED");
  assert.equal(result.confidence.level, "LOW");
  assert.ok(result.missingInputs.some((item) => item.includes("historical Elo")));
  assert.equal(result.modelBreakdown.monteCarlo.simulationsCount, 5000);
  assert.equal(result.match.kickoffTime, "Not provided");
});

test("ACE does not create a prediction without a clear matchup", () => {
  assert.equal(getAcePredictionChatData("Show me today's football fixtures"), null);
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
