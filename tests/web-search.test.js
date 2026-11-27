import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTavilyResults,
  normalizeExaResults,
  normalizeSerperResults,
  getSearchProviderStatus,
  deduplicateResults
} from "../web-search.js";

test("normalizes Tavily results into Zed's common evidence shape", () => {
  const results = normalizeTavilyResults({ results: [{
    title: "Arsenal team news",
    url: "https://example.com/arsenal?utm_source=test",
    content: "The latest team update.",
    published_date: "2026-11-28"
  }] });
  assert.equal(results.length, 1);
  assert.equal(results[0].provider, "Tavily");
  assert.equal(results[0].snippet, "The latest team update.");
  assert.equal(results[0].published, "2026-11-28");
});

test("normalizes Exa results and safely handles missing content", () => {
  const results = normalizeExaResults({ results: [{
    title: "Match preview",
    url: "https://example.com/match",
    publishedDate: "2026-11-27"
  }] });
  assert.equal(results.length, 1);
  assert.equal(results[0].provider, "Exa");
  assert.equal(results[0].snippet, "");
});

test("normalizes Serper organic and news results", () => {
  const results = normalizeSerperResults({
    organic: [{ title: "League update", link: "https://example.com/a", snippet: "Update" }],
    news: [{ title: "Latest report", link: "https://example.com/b", date: "2 hours ago", source: "Example News" }]
  });
  assert.equal(results.length, 2);
  assert.equal(results[1].provider, "Serper");
  assert.equal(results[1].source, "Example News");
});

test("deduplicates results returned by multiple search providers", () => {
  const results = deduplicateResults([
    { title: "A", url: "https://example.com/story?utm_source=one", provider: "Tavily" },
    { title: "A duplicate", url: "https://example.com/story", provider: "Exa" }
  ]);
  assert.equal(results.length, 1);
});

test("reports the new providers as free and only enabled when their keys exist", () => {
  const status = getSearchProviderStatus();
  for (const id of ["tavily", "exa", "serper"]) {
    const provider = status.find(item => item.id === id);
    assert.ok(provider);
    assert.equal(provider.free, true);
    assert.equal(provider.enabled, Boolean({
      tavily: process.env.TAVILY_API_KEY,
      exa: process.env.EXA_API_KEY,
      serper: process.env.SERPER_API_KEY
    }[id]));
  }
});
