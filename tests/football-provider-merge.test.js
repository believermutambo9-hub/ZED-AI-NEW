import test from "node:test";
import assert from "node:assert/strict";
import { mergeFootballProviderEvidence } from "../features/football-intelligence.js";

const fixture = (homeTeam = "Arsenal", awayTeam = "Chelsea", kickoffTime = "2026-11-27T19:00:00.000Z") => ({
  id: "fixture-1", homeTeam, awayTeam, kickoffTime, status: "NS"
});

test("merges provider fields independently and records field provenance", () => {
  const merged = mergeFootballProviderEvidence([
    {
      provider: "ESPN", providerAvailable: true, providerConfigured: true,
      fixture: fixture(), home: { matchesPlayed: 8, rating: 1510 }, away: null,
      sampleMatchesCount: 0, hasTeamRatings: false, h2h: null,
      sources: ["ESPN"], missingInputs: ["ESPN odds unavailable"]
    },
    {
      provider: "Football-data.org", providerAvailable: true, providerConfigured: true,
      fixture: fixture("Arsenal FC", "Chelsea FC"), home: { matchesPlayed: 6, rating: 1490 },
      away: { matchesPlayed: 7, rating: 1475 }, sampleMatchesCount: 6,
      hasTeamRatings: true, h2h: { sampleCount: 2 }, sources: ["Football-data.org"],
      marketOdds: null, injuries: [], injuriesChecked: false, missingInputs: []
    }
  ]);

  assert.equal(merged.provider, "Multi-source football evidence");
  assert.equal(merged.fixtureConflict, false);
  assert.equal(merged.fixture.homeTeam, "Arsenal");
  assert.equal(merged.home.rating, 1510);
  assert.equal(merged.away.rating, 1475);
  assert.equal(merged.hasTeamRatings, true);
  assert.equal(merged.evidenceProvenance.home, "ESPN");
  assert.equal(merged.evidenceProvenance.away, "Football-data.org");
  assert.deepEqual(merged.availableProviders, ["ESPN", "Football-data.org"]);
  assert.ok(merged.missingInputs.includes("ESPN odds unavailable"));
});

test("withholds a fixture when providers disagree on teams or kickoff", () => {
  const merged = mergeFootballProviderEvidence([
    { provider: "ESPN", providerAvailable: true, fixture: fixture(), sources: ["ESPN"] },
    { provider: "Football-data.org", providerAvailable: true,
      fixture: fixture("Arsenal", "Chelsea", "2026-11-28T19:00:00.000Z"),
      sources: ["Football-data.org"] }
  ]);

  assert.equal(merged.fixture, null);
  assert.equal(merged.fixtureConflict, true);
  assert.ok(merged.missingInputs.some(item => item.includes("conflicting fixture")));
});

test("returns null when no provider returned usable evidence", () => {
  assert.equal(mergeFootballProviderEvidence([]), null);
});


test("does not treat reversed home and away teams as the same fixture", () => {
  const merged = mergeFootballProviderEvidence([
    { provider: "ESPN", providerAvailable: true, fixture: fixture(), sources: ["ESPN"] },
    { provider: "Football-data.org", providerAvailable: true,
      fixture: fixture("Chelsea", "Arsenal"), sources: ["Football-data.org"] }
  ]);

  assert.equal(merged.fixture, null);
  assert.equal(merged.fixtureConflict, true);
});

test("requires each selected team's sample to meet the minimum before marking ratings available", () => {
  const merged = mergeFootballProviderEvidence([
    {
      provider: "ESPN", providerAvailable: true,
      home: { matchesPlayed: 8, rating: 1510 },
      away: { matchesPlayed: 3, rating: 1480 },
      hasTeamRatings: true, sampleMatchesCount: 3, sources: ["ESPN"]
    },
    {
      provider: "Football-data.org", providerAvailable: true,
      home: { matchesPlayed: 6, rating: 1490 },
      hasTeamRatings: true, sampleMatchesCount: 6, sources: ["Football-data.org"]
    }
  ]);

  assert.equal(merged.home.matchesPlayed, 8);
  assert.equal(merged.away.matchesPlayed, 3);
  assert.equal(merged.hasTeamRatings, false);
});
