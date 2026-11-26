import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHistoricalFixture } from "../features/football-history.js";

test("normalizes a completed API-Football fixture for permanent storage", () => {
  const record = normalizeHistoricalFixture({
    fixture: { id: 998877, date: "2026-11-20T18:00:00+00:00", status: { short: "FT" }, venue: { name: "National Stadium" }, referee: "Referee A" },
    teams: { home: { id: 10, name: "Home FC" }, away: { id: 20, name: "Away FC" } },
    goals: { home: 2, away: 1 },
    league: { id: 999, name: "Premier League", country: "Zambia", season: 2026, round: "Regular Season - 10" }
  });
  assert.equal(record.fixtureId, "998877");
  assert.equal(record.homeId, 10);
  assert.equal(record.awayId, 20);
  assert.equal(record.homeGoals, 2);
  assert.equal(record.awayGoals, 1);
  assert.equal(record.season, 2026);
  assert.equal(record.source, "API-Football v3");
});

test("rejects fixtures without a final score or valid teams", () => {
  assert.equal(normalizeHistoricalFixture({ fixture: { id: 1, date: "2026-11-20", status: { short: "NS" } }, teams: { home: { id: 1 }, away: { id: 2 } }, goals: { home: null, away: null } }), null);
  assert.equal(normalizeHistoricalFixture({ fixture: { id: 2, date: "2026-11-20", status: { short: "FT" } }, teams: { home: { id: 1 }, away: { id: 1 } }, goals: { home: 1, away: 0 } }), null);
});
