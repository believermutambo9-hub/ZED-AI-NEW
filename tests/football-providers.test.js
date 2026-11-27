import test from "node:test";
import assert from "node:assert/strict";
import {
  getFootballProviderStatus,
  normalizeEspnEvents,
  normalizeFootballDataMatches,
  normalizeSportmonksFixtures,
  normalizeTheStatsApiMatches,
  normalizeTheSportsDbEvents
} from "../features/football-providers.js";

test("provider status keeps ESPN public and football-data.org token-gated", () => {
  const status = getFootballProviderStatus();
  assert.equal(status.find(item => item.id === "espn").configured, true);
  assert.equal(status.find(item => item.id === "football-data.org").configured, Boolean(process.env.FOOTBALL_DATA_API_TOKEN));
  assert.ok(status.every(item => item.dailySafetyBudget > 0 && item.minuteSafetyBudget > 0));
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

test("new provider status is token-gated for Sportmonks and public-key enabled for TheSportsDB", () => {
  const status = getFootballProviderStatus();
  assert.equal(status.find(item => item.id === "sportmonks").configured, Boolean(process.env.SPORTMONKS_API_TOKEN));
  assert.equal(status.find(item => item.id === "thesportsdb").configured, true);
});

test("normalizes Sportmonks fixtures and keeps absent scores null", () => {
  const matches = normalizeSportmonksFixtures({ data: [{
    id: 987,
    starting_at: "2026-12-01T18:00:00Z",
    state: { short_name: "NS" },
    league: { name: "Test League" },
    participants: [
      { id: 11, name: "Arsenal", meta: { location: "home" } },
      { id: 22, name: "Chelsea", meta: { location: "away" } }
    ],
    scores: []
  }] });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].source, "sportmonks");
  assert.equal(matches[0].home.name, "Arsenal");
  assert.equal(matches[0].away.name, "Chelsea");
  assert.equal(matches[0].score.home, null);
  assert.equal(matches[0].score.away, null);
});

test("normalizes TheSportsDB events only when a reliable UTC timestamp exists", () => {
  const matches = normalizeTheSportsDbEvents({ events: [
    {
      idEvent: "event-1",
      dateTimeUTC: "2026-12-01T18:30:00Z",
      strStatus: "Not Started",
      strLeague: "Test League",
      strHomeTeam: "Arsenal",
      strAwayTeam: "Chelsea",
      idHomeTeam: "11",
      idAwayTeam: "22",
      intHomeScore: null,
      intAwayScore: null
    },
    {
      idEvent: "event-2",
      dateEvent: "2026-12-01",
      strTime: "18:30:00",
      strHomeTeam: "Team A",
      strAwayTeam: "Team B"
    }
  ] });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].source, "thesportsdb");
  assert.equal(matches[0].date, "2026-12-01T18:30:00Z");
  assert.equal(matches[0].score.home, null);
  assert.equal(matches[0].score.away, null);
});

test("TheStatsAPI is configured only when either supported server key is present", () => {
  const provider = getFootballProviderStatus().find(item => item.id === "thestatsapi");
  assert.equal(provider.configured, Boolean(process.env.THESTATSAPI_API_KEY || process.env.THESTATSAPI_KEY));
  assert.ok(provider.dailySafetyBudget > 0 && provider.dailySafetyBudget <= 400);
  assert.ok(provider.monthlySafetyBudget > 0 && provider.monthlySafetyBudget <= 12000);
  assert.ok(provider.minuteSafetyBudget > 0 && provider.minuteSafetyBudget <= 8);
});

test("normalizes TheStatsAPI matches without inventing missing scores", () => {
  const matches = normalizeTheStatsApiMatches({ data: [{
    id: "mt_010249745",
    competition: "Premier League",
    status: "scheduled",
    utc_date: "2026-12-01T18:00:00Z",
    home_team: { id: "tm_50", name: "Arsenal", score: null },
    away_team: { id: "tm_42", name: "Chelsea", score: null },
    odds_available: true,
    xg_available: false
  }] });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].source, "thestatsapi");
  assert.equal(matches[0].status, "NS");
  assert.equal(matches[0].score.home, null);
  assert.equal(matches[0].availability.odds, true);
  assert.equal(matches[0].availability.xg, false);
});
