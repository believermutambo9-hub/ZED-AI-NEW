import test from "node:test";
import assert from "node:assert/strict";
import {
  collectFootballEvidence,
  extractMatchWinnerOdds,
  getFootballIntelligenceStatus,
  getUpcomingTeamFixture,
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


test("reversed upcoming fixture is resolved and team profiles follow the real home/away order", async () => {
  const baseFetch = providerFetch();
  const reversedFetch = async (url, options) => {
    const response = await baseFetch(url, options);
    const payload = await response.json();
    if (new URL(url).pathname.endsWith("/fixtures/headtohead")) {
      payload.response = payload.response.map(item => {
        if (item?.fixture?.status?.short !== "NS") return item;
        return {
          ...item,
          teams: { home: item.teams.away, away: item.teams.home }
        };
      });
    }
    return { ...response, json: async () => payload };
  };

  const evidence = await collectFootballEvidence({
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    apiKey: "test-key",
    fetchImpl: reversedFetch,
    cache: false
  });

  assert.equal(evidence.fixture.homeTeam, "Chelsea FC");
  assert.equal(evidence.fixture.awayTeam, "Arsenal FC");
  // The returned model profiles must match the fixture's actual home/away order.
  assert.ok(evidence.home.goalsForPerMatch < evidence.away.goalsForPerMatch);
  assert.equal(evidence.providerSampleCount.home, evidence.home.matchesPlayed);
  assert.equal(evidence.providerSampleCount.away, evidence.away.matchesPlayed);
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


test("postponed fixtures are not treated as upcoming prediction targets", async () => {
  const baseFetch = providerFetch();
  const postponedFetch = async (url, options) => {
    const response = await baseFetch(url, options);
    const payload = await response.json();
    if (new URL(url).pathname.endsWith("/fixtures/headtohead")) {
      payload.response = payload.response.map(item => item?.fixture?.status?.short === "NS"
        ? { ...item, fixture: { ...item.fixture, status: { short: "PST" } } }
        : item);
    }
    return { ...response, json: async () => payload };
  };

  const evidence = await collectFootballEvidence({
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    apiKey: "test-key",
    fetchImpl: postponedFetch,
    cache: false
  });

  assert.equal(evidence.fixture, null);
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



test("single-team fixture lookup uses configured Football-data.org before ESPN", async () => {
  const previousEnabled = process.env.API_FOOTBALL_ENABLED;
  delete process.env.API_FOOTBALL_ENABLED;
  try {
    const fixture = await getUpcomingTeamFixture("Arsenal", {
      footballDataConfigured: true,
      footballDataCompetitions: ["PL"],
      getFootballDataMatches: async () => ({
        matches: [{
          sourceId: "pl-arsenal-city-2099",
          date: "2099-11-29T16:30:00Z",
          status: "TIMED",
          competition: "Premier League",
          home: { id: "1", name: "Arsenal FC" },
          away: { id: "2", name: "Manchester City FC" }
        }]
      }),
      getSportmonksFixtures: async () => ({ matches: [] }),
      cache: false
    });
    assert.equal(fixture?.homeTeam, "Arsenal FC");
    assert.equal(fixture?.awayTeam, "Manchester City FC");
    assert.equal(fixture?.source, "Football-data.org");
    assert.equal(fixture?.kickoffTime, "2099-11-29T16:30:00.000Z");
  } finally {
    if (previousEnabled === undefined) delete process.env.API_FOOTBALL_ENABLED;
    else process.env.API_FOOTBALL_ENABLED = previousEnabled;
  }
});


test("single-team next fixture lookup falls back to the public TheSportsDB date feed", async () => {
  const previousEnabled = process.env.API_FOOTBALL_ENABLED;
  const previousFootballDataToken = process.env.FOOTBALL_DATA_API_TOKEN;
  const previousSportmonksToken = process.env.SPORTMONKS_API_TOKEN;
  delete process.env.API_FOOTBALL_ENABLED;
  delete process.env.FOOTBALL_DATA_API_TOKEN;
  delete process.env.SPORTMONKS_API_TOKEN;
  const futureKickoff = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();
  const dateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lusaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(futureKickoff));
  const dateValues = Object.fromEntries(dateParts.map(part => [part.type, part.value]));
  const fixtureDate = dateValues.year + "-" + dateValues.month + "-" + dateValues.day;
  const requestedDates = [];

  try {
    const fixture = await getUpcomingTeamFixture("Arsenal", {
      getTheSportsDbEvents: async ({ date }) => {
        requestedDates.push(date);
        return {
          matches: date === fixtureDate ? [{
            sourceId: "thesportsdb-arsenal-city-test",
            date: futureKickoff,
            status: "NS",
            competition: "Premier League",
            home: { id: "arsenal-test", name: "Arsenal FC" },
            away: { id: "city-test", name: "Manchester City" }
          }] : []
        };
      },
      cache: false
    });

    assert.equal(fixture?.id, "thesportsdb-arsenal-city-test");
    assert.equal(fixture?.homeTeam, "Arsenal FC");
    assert.equal(fixture?.awayTeam, "Manchester City");
    assert.equal(fixture?.source, "TheSportsDB");
    assert.equal(fixture?.kickoffTime, new Date(futureKickoff).toISOString());
    assert.equal(requestedDates.length, 8);
    assert.equal(new Set(requestedDates).size, 8);
  } finally {
    if (previousEnabled === undefined) delete process.env.API_FOOTBALL_ENABLED;
    else process.env.API_FOOTBALL_ENABLED = previousEnabled;
    if (previousFootballDataToken === undefined) delete process.env.FOOTBALL_DATA_API_TOKEN;
    else process.env.FOOTBALL_DATA_API_TOKEN = previousFootballDataToken;
    if (previousSportmonksToken === undefined) delete process.env.SPORTMONKS_API_TOKEN;
    else process.env.SPORTMONKS_API_TOKEN = previousSportmonksToken;
  }
});

test("API-Football free-plan fixture lookup uses a from/to window instead of the paid-only next parameter", async () => {
  const calls = [];
  const futureKickoff = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const upcoming = makeFixture(99009, futureKickoff, 101, 202, null, null, "NS");
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    calls.push(parsed);
    let response = [];
    if (parsed.pathname.endsWith("/teams")) {
      response = [{ team: { id: 101, name: "Arsenal FC" } }];
    } else if (parsed.pathname.endsWith("/fixtures")) {
      response = [upcoming];
    }
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ errors: [], results: response.length, response })
    };
  };

  const fixture = await getUpcomingTeamFixture("Arsenal", {
    apiKey: "test-key",
    fetchImpl,
    cache: false
  });

  assert.equal(fixture?.id, 99009);
  assert.equal(fixture?.homeTeam, "Arsenal FC");
  assert.equal(fixture?.awayTeam, "Chelsea FC");
  assert.equal(fixture?.source, "API-Football v3");
  const fixtureRequest = calls.find(call => call.pathname.endsWith("/fixtures"));
  assert.ok(fixtureRequest);
  assert.equal(fixtureRequest.searchParams.has("next"), false);
  assert.equal(fixtureRequest.searchParams.get("team"), "101");
  assert.ok(fixtureRequest.searchParams.get("from"));
  assert.ok(fixtureRequest.searchParams.get("to"));
  assert.equal(fixtureRequest.searchParams.get("timezone"), "Africa/Lusaka");
});

test("ACE evidence accepts a separately verified API-Football fixture without H2H next parameter", async () => {
  const requests = [];
  const baseFetch = providerFetch();
  const fetchImpl = async (url, options) => {
    const parsed = new URL(url);
    requests.push(parsed);
    const response = await baseFetch(url, options);
    const payload = await response.json();
    if (parsed.pathname.endsWith("/fixtures/headtohead")) {
      payload.response = payload.response.filter(item => item?.fixture?.status?.short !== "NS");
    }
    return { ...response, json: async () => payload };
  };
  const verifiedFixture = {
    id: 9009,
    homeId: 101,
    awayId: 202,
    kickoffTime: "2030-01-10T15:00:00.000Z",
    competition: "Test League",
    homeTeam: "Arsenal FC",
    awayTeam: "Chelsea FC",
    status: "NS",
    source: "API-Football v3"
  };

  const evidence = await collectFootballEvidence({
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    apiKey: "test-key",
    verifiedFixture,
    fetchImpl,
    cache: false
  });

  assert.equal(evidence.fixture?.id, 9009);
  assert.equal(evidence.fixture?.homeTeam, "Arsenal FC");
  assert.equal(evidence.fixture?.awayTeam, "Chelsea FC");
  assert.ok(requests.every(request => !request.searchParams.has("next")));
  assert.ok(requests.some(request => request.pathname.endsWith("/fixtures/headtohead")));
});
