import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanText,
  isLikelyIrrelevant,
  normalizeUrl
} from "../web-search.js";

test("RSS text decoding handles CDATA and hexadecimal numeric entities", () => {
  assert.equal(
    cleanText("<![CDATA[Arsenal &amp; Chelsea &#x1F3C6;]]>"),
    "Arsenal & Chelsea 🏆"
  );
});

test("RSS text cleanup strips markup inside CDATA without leaving wrappers", () => {
  assert.equal(
    cleanText("<![CDATA[<b>Breaking</b> &amp; confirmed]]>"),
    "Breaking & confirmed"
  );
});

test("search relevance rejects unrelated fallback stories", () => {
  assert.equal(
    isLikelyIrrelevant(
      { title: "Weather forecast for the weekend", snippet: "Rain expected" },
      "Arsenal transfer news"
    ),
    true
  );
});

test("search relevance accepts a result matching the requested topic", () => {
  assert.equal(
    isLikelyIrrelevant(
      { title: "Arsenal agree new transfer deal", snippet: "Club confirms signing" },
      "Arsenal transfer news"
    ),
    false
  );
});

test("URL normalization rejects unsafe redirect protocols", () => {
  assert.equal(
    normalizeUrl("https://duckduckgo.com/l/?uddg=javascript%3Aalert(1)"),
    ""
  );
});

test("GDELT seen timestamps are never exposed as article publication dates", () => {
  const [result] = normalizeGdeltResults({ articles: [{
    title: "Example report",
    url: "https://publisher.example/news/report",
    seendate: "20261128124530",
    domain: "publisher.example"
  }] });
  assert.equal(result.published, "");
  assert.equal(result.indexedAt, "2026-11-28T12:45:30Z");
  assert.equal(result.dateType, "indexed_or_seen");
});

test("Serper relative date labels are not treated as absolute publication dates", () => {
  const [result] = normalizeSerperResults({ news: [{
    title: "Example report",
    link: "https://publisher.example/news/report",
    date: "2 hours ago"
  }] });
  assert.equal(result.published, "");
  assert.equal(result.dateLabel, "2 hours ago");
  assert.equal(result.dateType, "relative_or_unverified");
});

test("Serper absolute ISO publication dates remain usable", () => {
  const [result] = normalizeSerperResults({ news: [{
    title: "Example report",
    link: "https://publisher.example/news/report",
    date: "2026-11-28"
  }] });
  assert.equal(result.published, "2026-11-28");
});

test("article URL checks reject homepages and search aggregators", () => {
  assert.equal(isDirectArticleUrl("https://coreaiinnovations.com/"), false);
  assert.equal(isDirectArticleUrl("https://news.google.com/"), false);
  assert.equal(isDirectArticleUrl("https://publisher.example/news/story-123"), true);
});

test("relative dates are not absolute publication dates", () => {
  assert.equal(isAbsolutePublicationDate("2 hours ago"), false);
  assert.equal(isAbsolutePublicationDate("2026-11-28"), true);
});

test("formatted search evidence labels missing dates and indexed times honestly", () => {
  const formatted = formatWebResults({ results: [{
    title: "Example",
    url: "https://publisher.example/story",
    source: "Bloomberg",
    provider: "Serper",
    published: "",
    dateLabel: "2 hours ago",
    indexedAt: "2026-11-28T12:00:00Z"
  }] });
  assert.match(formatted, /Publication date: Publication date not verified/);
  assert.match(formatted, /Provider date label \(not an absolute date\): 2 hours ago/);
  assert.match(formatted, /Provider indexed\/seen time \(not publication time\)/);
  assert.match(formatted, /Article-level URL candidate/);
});
