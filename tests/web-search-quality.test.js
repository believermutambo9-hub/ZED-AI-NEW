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
