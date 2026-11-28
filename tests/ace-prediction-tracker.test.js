import test from "node:test";
import assert from "node:assert/strict";
import {
  getPickFromProbabilities,
  getOutcomeFromScore,
  summarizeAcePredictions,
  saveAcePrediction,
  listAcePredictions,
  recordAcePredictionResult
} from "../features/ace-prediction-tracker.js";

test("selects the highest-probability 1X2 outcome and converts it to a percentage", () => {
  assert.deepEqual(getPickFromProbabilities({
    homeWin: 0.41, draw: 0.27, awayWin: 0.32
  }), { outcome: "HOME_WIN", label: "Home win", probability: 41 });
  assert.equal(getPickFromProbabilities({ homeWin: 0, draw: 0, awayWin: 0 }), null);
});

test("maps a final score to the correct match outcome", () => {
  assert.equal(getOutcomeFromScore(2, 0), "HOME_WIN");
  assert.equal(getOutcomeFromScore(1, 1), "DRAW");
  assert.equal(getOutcomeFromScore(0, 3), "AWAY_WIN");
  assert.equal(getOutcomeFromScore(-1, 0), null);
  assert.equal(getOutcomeFromScore(1.5, 0), null);
});

test("summarizes settled predictions, competition accuracy and goal-market accuracy", () => {
  const summary = summarizeAcePredictions([
    {
      status: "SETTLED_MANUAL",
      match: { competition: "Premier League" },
      result: {
        correct: true,
        marketResults: { total15: true, total25: false, btts: true }
      }
    },
    {
      status: "SETTLED_MANUAL",
      match: { competition: "Premier League" },
      result: {
        correct: false,
        marketResults: { total15: false, total25: true, btts: false }
      }
    },
    { status: "PENDING_RESULT", match: { competition: "Serie A" }, result: null }
  ]);
  assert.equal(summary.total, 3);
  assert.equal(summary.pending, 1);
  assert.equal(summary.settled, 2);
  assert.equal(summary.correct, 1);
  assert.equal(summary.incorrect, 1);
  assert.equal(summary.accuracyPercent, 50);
  assert.deepEqual(summary.byCompetition[0], {
    competition: "Premier League", correct: 1, settled: 2, accuracyPercent: 50
  });
  assert.equal(summary.markets.total15.accuracyPercent, 50);
  assert.equal(summary.markets.total25.accuracyPercent, 50);
  assert.equal(summary.markets.btts.accuracyPercent, 50);
  assert.equal(summary.markets.total35.settled, 0);
});

test("saves only verified future ACE predictions into the signed-in user's subcollection", async () => {
  let stored = null;
  const db = {
    collection(name) {
      assert.equal(name, "zedAceUserPredictions");
      return {
        doc(owner) {
          assert.equal(owner, "firebase-user-1");
          return {
            collection(subcollection) {
              assert.equal(subcollection, "predictions");
              return {
                add: async record => {
                  stored = record;
                  return { id: "saved-prediction-1" };
                }
              };
            }
          };
        }
      };
    }
  };
  const prediction = {
    match: {
      homeTeam: "Arsenal", awayTeam: "Chelsea", competition: "Premier League",
      kickoffTime: new Date(Date.now() + 86400000).toISOString()
    },
    prediction: { homeWin: 0.52, draw: 0.25, awayWin: 0.23 },
    markets: { over15: 0.81, under15: 0.19, over25: 0.56, under25: 0.44, over35: 0.31, under35: 0.69, bttsYes: 0.55, bttsNo: 0.45 },
    expectedGoals: { home: 1.7, away: 1.1, total: 2.8 },
    mostLikelyScores: [{ score: "2-1", probability: 0.12 }],
    confidence: "MEDIUM",
    modelVersion: "ace-test",
    dataQuality: { rating: "GOOD" }
  };
  const result = await saveAcePrediction({
    userId: "firebase-user-1",
    prediction,
    evidence: {
      provider: "Verified test provider",
      fixture: { id: 123456 },
      providerSampleCount: { home: 8, away: 9 },
      sources: ["Verified test provider"],
      home: { form: "WWDLW" },
      away: { form: "WDLWW" }
    },
    db
  });
  assert.equal(result.saved, true);
  assert.equal(result.id, "saved-prediction-1");
  assert.equal(stored.userId, "firebase-user-1");
  assert.equal(stored.status, "PENDING_RESULT");
  assert.equal(stored.fixtureId, "123456");
  assert.deepEqual(stored.pick, { outcome: "HOME_WIN", label: "Home win", probability: 52 });
  assert.deepEqual(stored.marketPicks.total25, { pick: "OVER", probability: 56 });
  assert.deepEqual(stored.marketPicks.btts, { pick: "YES", probability: 55 });
});

test("does not save predictions without an owner or verified future fixture", async () => {
  const prediction = {
    match: { kickoffTime: new Date(Date.now() + 86400000).toISOString() },
    prediction: { homeWin: 0.5, draw: 0.2, awayWin: 0.3 }
  };
  assert.equal((await saveAcePrediction({ prediction, evidence: { fixture: { id: 1 } }, db: {} })).saved, false);
  assert.equal((await saveAcePrediction({ userId: "u1", prediction, evidence: {}, db: {} })).saved, false);
});

test("lists only the authenticated user's saved predictions", async () => {
  const expected = [{
    id: "p1", userId: "user-a", status: "PENDING_RESULT",
    predictedAt: "2026-11-28T10:00:00.000Z", match: { competition: "Premier League" }
  }];
  const db = {
    collection(name) {
      assert.equal(name, "zedAceUserPredictions");
      return {
        doc(owner) {
          assert.equal(owner, "user-a");
          return {
            collection(name2) {
              assert.equal(name2, "predictions");
              return {
                orderBy(field, direction) {
                  assert.equal(field, "predictedAt");
                  assert.equal(direction, "desc");
                  return {
                    limit(count) {
                      assert.equal(count, 200);
                      return {
                        get: async () => ({
                          docs: expected.map(({ id, ...data }) => ({ id, data: () => data }))
                        })
                      };
                    }
                  };
                }
              };
            }
          };
        }
      };
    }
  };
  const result = await listAcePredictions("user-a", { db });
  assert.equal(result.predictions.length, 1);
  assert.equal(result.predictions[0].id, "p1");
  assert.equal(result.summary.pending, 1);
  assert.equal(result.persistent, true);
});

test("records a manual score only after kickoff and marks provider verification explicitly false", async () => {
  const stored = {
    userId: "user-a",
    status: "PENDING_RESULT",
    match: { kickoffTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
    pick: { outcome: "HOME_WIN" },
    marketPicks: { total25: { pick: "OVER" }, btts: { pick: "YES" } }
  };
  let savedChanges = null;
  const db = {
    collection(name) {
      assert.equal(name, "zedAceUserPredictions");
      return {
        doc(owner) {
          assert.equal(owner, "user-a");
          return {
            collection(subcollection) {
              assert.equal(subcollection, "predictions");
              return {
                doc(id) {
                  assert.equal(id, "p1");
                  return {
                    get: async () => ({ exists: true, data: () => stored }),
                    update: async changes => { savedChanges = changes; }
                  };
                }
              };
            }
          };
        }
      };
    }
  };
  const result = await recordAcePredictionResult("user-a", "p1", { homeGoals: "2", awayGoals: "1" }, { db });
  assert.equal(result.ok, true);
  assert.equal(result.prediction.result.actualOutcome, "HOME_WIN");
  assert.equal(result.prediction.result.correct, true);
  assert.equal(result.prediction.result.verified, false);
  assert.equal(result.prediction.result.source, "user_entered");
  assert.equal(savedChanges.status, "SETTLED_MANUAL");
  assert.equal(savedChanges.result.marketResults.total25, true);
  assert.equal(savedChanges.result.marketResults.btts, true);
});

test("rejects cross-account result access, early settlement and blank scores", async () => {
  const stored = {
    userId: "user-a",
    status: "PENDING_RESULT",
    match: { kickoffTime: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
    pick: { outcome: "HOME_WIN" }
  };
  const makeDb = ownerExpected => ({
    collection() {
      return {
        doc(owner) {
          return {
            collection() {
              return {
                doc() {
                  return {
                    get: async () => ({
                      exists: owner === ownerExpected,
                      data: () => stored
                    }),
                    update: async () => assert.fail("Should not update an invalid result")
                  };
                }
              };
            }
          };
        }
      };
    }
  });
  const foreign = await recordAcePredictionResult("user-b", "p1", { homeGoals: 1, awayGoals: 0 }, { db: makeDb("user-a") });
  assert.equal(foreign.status, 404);
  const early = await recordAcePredictionResult("user-a", "p1", { homeGoals: 1, awayGoals: 0 }, { db: makeDb("user-a") });
  assert.equal(early.status, 409);
  const blank = await recordAcePredictionResult("user-a", "p1", { homeGoals: "", awayGoals: "0" }, { db: makeDb("user-a") });
  assert.equal(blank.status, 400);
});
