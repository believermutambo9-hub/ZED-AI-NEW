// web-search.js
// Reliable web/news search engine for Zed

const TZ = "Africa/Lusaka";
const USER_AGENT =
  "Mozilla/5.0 (compatible; Zed/1.0; +https://zed-ai-h7h4.onrender.com)";

const FETCH_TIMEOUT = 10000;
const MAX_RESULTS = 10;

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => {
      try {
        return String.fromCodePoint(Number(code));
      } catch {
        return "";
      }
    })
    .replace(/\s+/g, " ")
    .trim();
}

function formatDateForZambia(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function getZambiaDateTime(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    dateStyle: "full",
    timeStyle: "short"
  }).format(date);
}

function normalizeUrl(url = "") {
  try {
    const parsed = new URL(String(url).trim());

    parsed.hash = "";

    const removeParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "ref",
      "source"
    ];

    for (const param of removeParams) {
      parsed.searchParams.delete(param);
    }

    return parsed.toString();
  } catch {
    return String(url).trim();
  }
}

function extractDomain(url = "") {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function extractImportantQueryWords(query = "") {
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "of",
    "to",
    "for",
    "in",
    "on",
    "at",
    "with",
    "from",
    "about",
    "what",
    "when",
    "where",
    "who",
    "why",
    "how",
    "is",
    "are",
    "was",
    "were",
    "has",
    "have",
    "had",
    "do",
    "does",
    "did",
    "tell",
    "me",
    "show",
    "give",
    "latest",
    "news",
    "today",
    "current",
    "recent",
    "update",
    "updates",
    "breaking",
    "report",
    "reports",
    "information"
  ]);

  return cleanText(query)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter(
      word =>
        word.length >= 3 &&
        !stopWords.has(word)
    )
    .slice(0, 15);
}

function isRecentRequest(query = "") {
  const text = cleanText(query).toLowerCase();

  const recentTerms = [
    "latest",
    "today",
    "current",
    "recent",
    "breaking",
    "this morning",
    "this evening",
    "right now",
    "just in",
    "newest",
    "latest news",
    "what happened",
    "what's happening",
    "whats happening"
  ];

  return recentTerms.some(term =>
    text.includes(term)
  );
}

function isNewsRequest(query = "") {
  const text = cleanText(query).toLowerCase();

  return /\b(news|updates?|headlines?|breaking)\b/i.test(
    text
  );
}

function isBroadNewsRequest(query = "") {
  const text = cleanText(query).toLowerCase();

  const hasNewsWord =
    /\b(news|updates?|headlines?|happen(ed|ing)?|latest|breaking)\b/i.test(
      text
    );

  const hasSpecificQuestion =
    /\b(why|how|when|where|who|did|does|is|are|was|were)\b/i.test(
      text
    );

  return hasNewsWord && !hasSpecificQuestion;
}

function extractMainTopic(query = "") {
  return cleanText(query)
    .replace(
      /\b(latest|today|current|recent|breaking|news|updates?|headlines?|right now|this morning|this evening)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function buildNewsSearchVariants(userQuery = "") {
  const topic = extractMainTopic(userQuery);

  if (!topic) {
    return [cleanText(userQuery)];
  }

  const variants = [
    userQuery
  ];

  if (isBroadNewsRequest(userQuery)) {
    variants.push(
      `${topic} latest news`,
      `${topic} team news`,
      `${topic} injury news`,
      `${topic} transfer news`
    );
  }

  return [
    ...new Set(
      variants
        .map(cleanText)
        .filter(Boolean)
    )
  ];
}

function parsePublishedDate(value = "") {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function daysSince(date) {
  if (!date) {
    return 9999;
  }

  return (
    Date.now() - date.getTime()
  ) /
    (1000 * 60 * 60 * 24);
}

function tokenizeForSimilarity(text = "") {
  return new Set(
    cleanText(text)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/\s+/)
      .filter(word => word.length >= 4)
  );
}

function similarityScore(a = "", b = "") {
  const first =
    tokenizeForSimilarity(a);

  const second =
    tokenizeForSimilarity(b);

  if (!first.size || !second.size) {
    return 0;
  }

  let overlap = 0;

  for (const word of first) {
    if (second.has(word)) {
      overlap++;
    }
  }

  return overlap /
    Math.min(first.size, second.size);
}

function getStoryText(result) {
  return cleanText(
    `${result.title || ""} ${
      result.snippet ||
      result.summary ||
      result.description ||
      ""
    }`
  );
}

function isLikelyIrrelevant(result, query) {
  const title =
    cleanText(result.title || "")
      .toLowerCase();

  const snippet =
    cleanText(
      result.snippet ||
        result.summary ||
        result.description ||
        ""
    ).toLowerCase();

  const combined =
    `${title} ${snippet}`;

  const words =
    extractImportantQueryWords(query);

  if (!words.length) {
    return false;
  }

  return !words.some(word =>
    combined.includes(word)
  );
}

function scoreResult(
  result,
  query,
  recentRequest = false
) {
  const title =
    cleanText(result.title || "")
      .toLowerCase();

  const snippet =
    cleanText(
      result.snippet ||
        result.summary ||
        result.description ||
        ""
    ).toLowerCase();

  const queryWords =
    extractImportantQueryWords(query);

  let score = 0;

  for (const word of queryWords) {
    if (title.includes(word)) {
      score += 10;
    } else if (snippet.includes(word)) {
      score += 4;
    }
  }

  if (
    title.includes("latest") ||
    title.includes("breaking") ||
    title.includes("update")
  ) {
    score += 2;
  }

  const published =
    parsePublishedDate(
      result.published ||
        result.pubDate ||
        result.date ||
        ""
    );

  if (recentRequest && published) {
    const age = daysSince(published);

    if (age <= 1) {
      score += 25;
    } else if (age <= 2) {
      score += 18;
    } else if (age <= 3) {
      score += 12;
    } else if (age <= 7) {
      score += 5;
    }
  }

  if (result.source) {
    score += 2;
  }

  return score;
}

function diversifyResults(
  results,
  query,
  maxResults = MAX_RESULTS
) {
  const sorted = [...results].sort(
    (a, b) =>
      (b._score || 0) -
      (a._score || 0)
  );

  const selected = [];
  const stories = [];

  for (const result of sorted) {
    if (
      selected.length >= maxResults
    ) {
      break;
    }

    const story =
      getStoryText(result);

    let duplicate = false;

    for (const previous of stories) {
      if (
        similarityScore(
          story,
          previous
        ) >= 0.72
      ) {
        duplicate = true;
        break;
      }
    }

    if (duplicate) {
      continue;
    }

    selected.push(result);
    stories.push(story);
  }

  if (
    selected.length <
    Math.min(
      maxResults,
      sorted.length
    )
  ) {
    for (const result of sorted) {
      if (
        selected.length >=
        maxResults
      ) {
        break;
      }

      if (!selected.includes(result)) {
        selected.push(result);
      }
    }
  }

  return selected.slice(
    0,
    maxResults
  );
}

async function fetchText(
  url,
  options = {}
) {
  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    FETCH_TIMEOUT
  );

  try {
    const response =
      await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "User-Agent":
            USER_AGENT,
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          ...(options.headers || {})
        }
      });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function searchGoogleNews(
  userQuery,
  recentRequest = false
) {
  const query =
    recentRequest
      ? `${userQuery} when:7d`
      : userQuery;

  const searchUrl =
    `https://news.google.com/rss/search?q=${encodeURIComponent(
      query
    )}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const xml =
      await fetchText(searchUrl);

    const items = [
      ...xml.matchAll(
        /<item>([\s\S]*?)<\/item>/gi
      )
    ];

    return items
      .map(match => {
        const item =
          match[1];

        const getTag = tag => {
          const regex =
            new RegExp(
              `<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
              "i"
            );

          const found =
            item.match(regex);

          return found
            ? cleanText(found[1])
            : "";
        };

        return {
          title: getTag("title"),
          url: getTag("link"),
          published:
            getTag("pubDate"),
          source:
            getTag("source"),
          snippet:
            getTag("description"),
          provider:
            "Google News"
        };
      })
      .filter(
        result =>
          result.title &&
          result.url
      );
  } catch (error) {
    console.error(
      "Google News search error:",
      error.message
    );

    return [];
  }
}

async function searchDuckDuckGo(
  userQuery
) {
  const url =
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
      userQuery
    )}`;

  try {
    const html =
      await fetchText(url);

    const results = [];

    const blocks =
      html.split(
        /<div[^>]+class=["'][^"']*\bresult\b[^"']*["'][^>]*>/i
      );

    for (
      const block of blocks.slice(1)
    ) {
      const titleMatch =
        block.match(
          /class=["'][^"']*result__a[^"']*["'][^>]*>([\s\S]*?)<\/a>/i
        );

      const urlMatch =
        block.match(
          /class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["']/i
        );

      const snippetMatch =
        block.match(
          /class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|div)>/i
        );

      if (
        !titleMatch ||
        !urlMatch
      ) {
        continue;
      }

      results.push({
        title:
          cleanText(
            titleMatch[1]
          ),
        url:
          cleanText(
            urlMatch[1]
          ),
        snippet:
          snippetMatch
            ? cleanText(
                snippetMatch[1]
              )
            : "",
        published: "",
        source:
          "DuckDuckGo",
        provider:
          "DuckDuckGo"
      });
    }

    return results.slice(
      0,
      10
    );
  } catch (error) {
    console.error(
      "DuckDuckGo search error:",
      error.message
    );

    return [];
  }
}

function deduplicateResults(
  results
) {
  const seen = new Set();
  const output = [];

  for (const result of results) {
    const url =
      normalizeUrl(
        result.url || ""
      );

    if (
      !url ||
      seen.has(url)
    ) {
      continue;
    }

    seen.add(url);

    output.push({
      ...result,
      url,
      domain:
        extractDomain(url)
    });
  }

  return output;
}

async function runSearchVariant(
  query,
  recentRequest
) {
  const searches = [
    searchGoogleNews(
      query,
      recentRequest
    ),
    searchDuckDuckGo(
      query
    )
  ];

  const results =
    await Promise.allSettled(
      searches
    );

  const google =
    results[0].status ===
    "fulfilled"
      ? results[0].value
      : [];

  const duck =
    results[1].status ===
    "fulfilled"
      ? results[1].value
      : [];

  return [
    ...google,
    ...duck
  ];
}

export async function searchWeb(
  userQuery,
  options = {}
) {
  const query =
    cleanText(userQuery);

  if (!query) {
    return {
      ok: false,
      query: "",
      results: [],
      message:
        "No search query provided."
    };
  }

  const recentRequest =
    options.recentRequest ??
    isRecentRequest(query);

  const newsRequest =
    isNewsRequest(query);

  const broadNews =
    isBroadNewsRequest(query);

  const variants =
    recentRequest && newsRequest
      ? buildNewsSearchVariants(
          query
        )
      : [query];

  let allResults = [];

  /*
   * Search all variants in parallel.
   * This makes current searches faster
   * and prevents one failed provider from
   * stopping the complete search.
   */
  const variantResults =
    await Promise.all(
      variants.map(variant =>
        runSearchVariant(
          variant,
          recentRequest
        )
      )
    );

  for (
    let i = 0;
    i < variantResults.length;
    i++
  ) {
    allResults.push(
      ...variantResults[i].map(
        result => ({
          ...result,
          searchVariant:
            variants[i]
        })
      )
    );
  }

  allResults =
    deduplicateResults(
      allResults
    );

  /*
   * Keep results that contain at least
   * one meaningful query word.
   */
  const relevantResults =
    allResults.filter(
      result =>
        !isLikelyIrrelevant(
          result,
          query
        )
    );

  /*
   * If relevance filtering removed
   * everything, keep the raw results
   * rather than returning nothing.
   */
  allResults =
    relevantResults.length
      ? relevantResults
      : allResults;

  allResults =
    allResults.map(
      result => ({
        ...result,
        _score:
          scoreResult(
            result,
            query,
            recentRequest
          )
      })
    );

  const maximumResults =
    recentRequest && broadNews
      ? 12
      : recentRequest
        ? 10
        : 8;

  const finalResults =
    recentRequest
      ? diversifyResults(
          allResults,
          query,
          maximumResults
        )
      : allResults
          .sort(
            (a, b) =>
              (b._score || 0) -
              (a._score || 0)
          )
          .slice(
            0,
            maximumResults
          );

  return {
    ok: true,
    query,
    recentRequest,
    newsRequest,
    broadNews,
    searchVariants:
      variants,
    resultCount:
      finalResults.length,
    results:
      finalResults
  };
}

export function formatWebResults(
  searchData
) {
  if (
    !searchData ||
    !Array.isArray(
      searchData.results
    )
  ) {
    return "";
  }

  if (
    !searchData.results.length
  ) {
    return "No reliable web search results were found.";
  }

  return searchData.results
    .map(
      (result, index) => {
        const title =
          cleanText(
            result.title ||
              "Untitled"
          );

        const url =
          cleanText(
            result.url || ""
          );

        const source =
          cleanText(
            result.source ||
              result.domain ||
              ""
          );

        const published =
          cleanText(
            result.published ||
              ""
          );

        const snippet =
          cleanText(
            result.snippet ||
              result.summary ||
              result.description ||
              ""
          );

        return [
          `RESULT ${index + 1}`,
          `Title: ${title}`,
          `Source: ${source}`,
          `Published: ${published}`,
          `URL: ${url}`,
          `Snippet: ${snippet}`
        ].join("\n");
      }
    )
    .join("\n\n");
}

export function getWebSearchContext(
  searchData
) {
  if (!searchData) {
    return "";
  }

  const currentDate =
    formatDateForZambia();

  const currentDateTime =
    getZambiaDateTime();

  return `
WORLDWIDE WEB SEARCH DATA

Current date in Zambia:
${currentDate}

Current date and time in Zambia:
${currentDateTime}

The following information was retrieved from current web/news searches.

${formatWebResults(
  searchData
)}

IMPORTANT:
- Use the supplied search results as evidence.
- Do not invent news, names, injuries, transfers, scores, dates, or events.
- For latest/current questions, prefer the newest available evidence.
- Distinguish confirmed information from reports, speculation, and rumours.
- If sources disagree, clearly explain the disagreement.
- Do not claim that a search result proves something that it does not actually say.
`;
}

export function getSearchDateInfo() {
  const now =
    new Date();

  return {
    date:
      formatDateForZambia(
        now
      ),
    dateTime:
      getZambiaDateTime(
        now
      )
  };
}

/*
 * Backwards-compatible exports.
 * server.js can continue using its
 * existing imports.
 */

export const webSearch =
  searchWeb;

export const searchNews =
  searchWeb;

export const buildWebSearchContext =
  getWebSearchContext;

export {
  cleanText,
  formatDateForZambia,
  getZambiaDateTime,
  normalizeUrl,
  extractDomain,
  isRecentRequest,
  isNewsRequest,
  isBroadNewsRequest,
  searchGoogleNews,
  searchDuckDuckGo,
  deduplicateResults,
  diversifyResults
};

export default {
  searchWeb,
  webSearch,
  searchNews,
  formatWebResults,
  getWebSearchContext,
  buildWebSearchContext,
  getSearchDateInfo
};
