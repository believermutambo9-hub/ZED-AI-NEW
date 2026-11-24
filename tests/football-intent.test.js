import test from "node:test";
import assert from "node:assert/strict";
import { shouldUseFootballPrediction } from "../features/football-intent.js";

test("explicit prediction prompts activate the football prediction path", () => {
  assert.equal(shouldUseFootballPrediction("Predict Arsenal vs Chelsea"), true);
  assert.equal(shouldUseFootballPrediction("Who will win between Real Madrid and Barcelona?"), true);
  assert.equal(shouldUseFootballPrediction("Give me a score prediction for Bayern versus PSG"), true);
});

test("ordinary match references do not automatically invoke prediction mode", () => {
  assert.equal(shouldUseFootballPrediction("Show me Arsenal vs Chelsea news"), false);
  assert.equal(shouldUseFootballPrediction("What is the weather in Lusaka?"), false);
  assert.equal(shouldUseFootballPrediction("Show me today's football fixtures"), false);
});
