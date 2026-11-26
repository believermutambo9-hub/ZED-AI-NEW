import test from "node:test";
import assert from "node:assert/strict";
import {
  collectFootballEvidence,
  extractMatchWinnerOdds,
  getFootballIntelligenceStatus,
  normalizeFootballName
} from "../features/football-intelligence.js";

// These tests explicitly exercise the retained API-Football adapter; production keeps it paused by default.
process.env.API_FOOTBALL_ENABLED = "true";

function makeFixture(id, date, homeId, awayId, homeGoals, awayGoals, status = "FT") {
  return {
    fixture: { id, date, status: { short: status }, venue: { name: "Test Ground" } },
    league: { name: "Test League", country: "Test Country" },
    teams: {
      home: { id: homeId, name: homeId === 101 ? "Arsenal FC" : "Opponent" },
      away: { id: awayId, name: awayId === 202 ? "Chelsea FC" : "Opponent" }
    },
    goals: { home: homeGoals, away: awayGoals }
  };
}

function providerFetch() {
  const homeHistory = Array.from({ length: 8 }, (_, index) =>
    makeFixture(1000 + index, "2029-0" + (index + 1) + "-10T15:00:00Z", 101, 801 + index, 2, 1)
  );
  const awayHistory = Array.from({ length: 8 }, (_, index) =>
    makeFixture(2000 + index, "2029-0" + (index + 1) + "-12T15:00:00Z", 901 + index, 202, 0, 1)
  );
  // A completed match after the requested fixture date must not enter the sample.
  homeHistory.push(makeFixture(1099, "2031-01-10T15:00:00Z", 101, 999, 9, 0));
  const h2hHistory = makeFixture(3000, "2029-06-01T15:00:00Z", 101, 202, 3, 1);
  const upcoming = makeFixture(9009, "2030-01-10T15:00:00Z", 101, 202, null, null, "NS");
  const lineups = [101, 202].map(teamId => ({
    team: { id: teamId },
    formation: "4-3-3",
    startXI: Array.from({ length: 11 }, (_, index) => ({
      player: { id: teamId * 100 + index, name: "Player " + index, pos: "M" }
    })),
    substitutes: []
  }));

  return async (url) => {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const search = parsed.searchParams;
    let response = [];
    if (path.endsWith("/teams")) {
      response = search.get("search") === "Arsenal"
        ? [{ team: { id: 101, name: "Arsenal FC" } }]
        : [{ team: { id: 202, name: "Chelsea FC" } }];
    } else if (path.endsWith("/fixtures/headtohead")) {
      response = [h2hHistory, upcoming];
    } else if (path.endsWith("/fixtures") && search.get("team") === "101") {
      response = homeHistory;
    } else if (path.endsWith("/fixtures") && search.get("team") === "202") {
      response = awayHistory;
    } else if (path.endsWith("/lineups")) {
      response = lineups;
    } else if (path.endsWith("/injuries")) {
      response = [{
        team: { id: 101 },
        player: { name: "Test Striker", type: "Missing Fixture", reason: "Injury" }
      }];
    } else if (path.endsWith("/odds")) {
      response = [{
        bookmakers: [{
          bets: [{
            name: "Match Winner",
            values: [
              { value: "Home", odd: "2.10" },
              { value: "Draw", odd: "3.30" },
              { value: "Away", odd: "3.60" }
            ]
          }]
        }]
      }];
    }
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ errors: [], results: response.length, response })
    };
  };
}

test("RapidAPI fallback uses its matching host and credential header", async () => {
  const originalApiKey = process.env.API_FOOTBALL_KEY;
  const originalRapidApiKey = process.env.RAPIDAPI_KEY;
  delete process.env.API_FOOTBALL_KEY;
  process.env.RAPIDAPI_KEY = "rapid-test-key";
  const calls = [];

  try {
    const evidence = await collectFootballEvidence({
      homeTeam: "Unknown Home",
      awayTeam: "Unknown Away",
      fetchImpl: async (url, options) => {
        calls.push({ url: String(url), headers: options.headers });
        return {
          ok: true,
          status: 200,
          json: async () => ({ errors: [], response: [], results: 0 })
        };
      },
      cache: false
    });

    assert.equal(evidence.providerConfigured, true);
    assert.equal(calls.length, 2);
    assert.ok(calls.every(call => call.url.startsWith("https://api-football-v1.p.rapidapi.com/v3/")));
    assert.ok(calls.every(call => call.headers["x-rapidapi-key"] === "rapid-test-key"));
    assert.ok(calls.every(call => call.headers["x-rapidapi-host"] === "api-football-v1.p.rapidapi.com"));
  } finally {
    if (originalApiKey === undefined) delete process.env.API_FOOTBALL_KEY;
    else process.env.API_FOOTBALL_KEY = originalApiKey;
    if (originalRapidApiKey === undefined) delete process.env.RAPIDAPI_KEY;
    else process.env.RAPIDAPI_KEY = originalRapidApiKey;
  }
});

test("team names are normalized without accents or common club suffixes", () => {
  assert.equal(normalizeFootballName("Atlético de Madrid C.F."), "atletico de madrid");
});

test("market odds are accepted only when a complete valid 1X2 market exists", () => {
  assert.deepEqual(extractMatchWinnerOdds([
    { bookmakers: [{ bets: [{ name: "Match Winner", values: [
      { value: "Home", odd: "2.10" },
      { value: "Draw", odd: "3.30" },
      { value: "Away", odd: "3.60" }
    ] }] }] }
  ], "Arsenal", "Chelsea"), {
    homeOdds: 2.1,
    drawOdds: 3.3,
    awayOdds: 3.6
  });
  assert.equal(extractMatchWinnerOdds([], "Arsenal", "Chelsea"), null);
});

test("ACE evidence adapter uses pre-kickoff history and retrieves fixture-specific evidence", async () => {
  const evidence = await collectFootballEvidence({
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    apiKey: "test-key",
    fetchImpl: providerFetch(),
    cache: false
  });

  assert.equal(evidence.providerAvailable, true);
  assert.equal(evidence.hasTeamRatings, true);
  assert.equal(evidence.sampleMatchesCount, 8);
  assert.equal(evidence.fixture.id, 9009);
  assert.equal(evidence.h2h.sampleCount, 1);
  assert.equal(evidence.h2h.homeTeamWins, 1);
  assert.equal(evidence.home.matchesPlayed, 8);
  assert.equal(evidence.away.matchesPlayed, 8);
  assert.equal(evidence.injuriesChecked, true);
  assert.equal(evidence.injuries.length, 1);
  assert.equal(evidence.lineupsChecked, true);
  assert.equal(evidence.lineups.length, 2);
  assert.equal(evidence.lineups[0].startingPlayersConfirmed, 11);
  assert.ok(evidence.missingInputs.some(item => item.includes("player-role impact mapping is not yet applied")));
  assert.deepEqual(evidence.marketOdds, {
    homeOdds: 2.1,
    drawOdds: 3.3,
    awayOdds: 3.6
  });
  assert.ok(!evidence.missingInputs.some(item => item.includes("Insufficient completed")));
});


test("missing upcoming fixture stays unverified and never receives a synthetic kickoff", async () => {
  const baseFetch = providerFetch();
  const fetchWithoutUpcoming = async (url, options) => {
    const response = await baseFetch(url, options);
    const payload = await response.json();
    if (new URL(url).pathname.endsWith("/fixtures/headtohead")) {
      payload.response = payload.response.filter(item => item?.fixture?.status?.short === "FT");
    }
    return { ...response, json: async () => payload };
  };

  const evidence = await collectFootballEvidence({
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    apiKey: "test-key",
    fetchImpl: fetchWithoutUpcoming,
    cache: false
  });

  assert.equal(evidence.fixture, null);
  assert.equal(evidence.home?.daysRest, undefined);
  assert.equal(evidence.away?.daysRest, undefined);
  assert.ok(evidence.missingInputs.some(item => item.includes("No verified upcoming fixture")));
});


test("API-Football remains explicitly paused unless an operator enables it", () => {
  const originalEnabled = process.env.API_FOOTBALL_ENABLED;
  const originalKey = process.env.API_FOOTBALL_KEY;
  process.env.API_FOOTBALL_KEY = "configured-but-paused-test-key";
  delete process.env.API_FOOTBALL_ENABLED;
  try {
    const status = getFootballIntelligenceStatus();
    assert.equal(status.apiFootballConfigured, true);
    assert.equal(status.apiFootballEnabled, false);
    assert.equal(status.apiFootballPaused, true);
    assert.equal(status.footballDataConfigured, Boolean(process.env.FOOTBALL_DATA_API_TOKEN));
    assert.ok(status.alternativeProviders.includes("ESPN"));
    assert.ok(status.alternativeProviders.includes("Football-data.org"));
  } finally {
    if (originalEnabled === undefined) delete process.env.API_FOOTBALL_ENABLED;
    else process.env.API_FOOTBALL_ENABLED = originalEnabled;
    if (originalKey === undefined) delete process.env.API_FOOTBALL_KEY;
    else process.env.API_FOOTBALL_KEY = originalKey;
  }
});

