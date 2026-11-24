import test from "node:test";
import assert from "node:assert/strict";
import { getAcePredictionChatData, extractMatchup } from "../features/ace-engine.js";

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
});

test("ACE does not create a prediction without a clear matchup", async () => {
  assert.equal(await getAcePredictionChatData("Show me today's football fixtures"), null);
});
