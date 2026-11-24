import test from "node:test";
import assert from "node:assert/strict";
import { getAcePredictionChatData } from "../features/ace-engine.js";

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
});

test("ACE does not create a prediction without a clear matchup", () => {
  assert.equal(getAcePredictionChatData("Show me today's football fixtures"), null);
});
