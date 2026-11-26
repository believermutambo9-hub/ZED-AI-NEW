import test from "node:test";
import assert from "node:assert/strict";
import {
  getFootballProviderStatus,
  normalizeEspnEvents,
  normalizeFootballDataMatches
} from "../features/football-providers.js";

test("provider status keeps ESPN public and football-data.org token-gated", () => {
  const status = getFootballProviderStatus();
  assert.equal(status.find(item => item.id === "espn").configured, true);
  assert.equal(status.find(item => item.id === "football-data.org").configured, Boolean(process.env.FOOTBALL_DATA_API_TOKEN));
  assert.ok(status.every(item => item.dailyLimit > 0 && item.minuteLimit > 0));
});

test("normalizes ESPN events into provider-neutral match records", () => {
  const matches = normalizeEspnEvents({ events: [{
    id: "123",
    date: "2026-11-26T18:00Z",
    league: { name: "Premier League" },
    competitions: [{ status: { type: { name: "STATUS_SCHEDULED" } }, competitors: [
      { homeAway: "home", team: { id: "1", displayName: "Arsenal" }, score: "0" },
      { homeAway: "away", team: { id: "2", displayName: "Chelsea" }, score: "0" }
    ] }]
  }] });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].source, "espn");
  assert.equal(matches[0].home.name, "Arsenal");
  assert.equal(matches[0].away.name, "Chelsea");
});

test("normalizes football-data.org matches without inventing missing scores", () => {
  const matches = normalizeFootballDataMatches({ matches: [{
    id: 456,
    utcDate: "2026-11-26T18:00:00Z",
    status: "SCHEDULED",
    competition: { name: "Premier League" },
    homeTeam: { id: 10, name: "Arsenal FC" },
    awayTeam: { id: 20, name: "Chelsea FC" },
    score: { fullTime: { home: null, away: null } }
  }] });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].source, "football-data.org");
  assert.equal(matches[0].score.home, null);
  assert.equal(matches[0].score.away, null);
});

test("drops malformed provider records", () => {
  assert.deepEqual(normalizeEspnEvents({ events: [{ id: "bad", competitions: [{ competitors: [] }] }] }), []);
  assert.deepEqual(normalizeFootballDataMatches({ matches: [{ id: 1 }] }), []);
});
