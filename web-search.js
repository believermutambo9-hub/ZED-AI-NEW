// web-search.js

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDateForZambia(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lusaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function getZambiaDateTime(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lusaka",
    dateStyle: "full",
    timeStyle: "short"
  }).format(date);
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeUrl(url = "") {
  try {
    const parsed = new URL(url);

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
    "information",
    "tell",
    "me",
    "show",
    "give"
  ]);

  return cleanText(query)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter(word => word.length >= 3 && !stopWords.has(word))
    .slice(0, 12);
}

function isRecentRequest(query = "") {
  const text = cleanText(query).toLowerCase();

  return [
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
    "what happened"
  ].some(term => text.includes(term));
}

function isBroadNewsRequest(query = "") {
  const text = cleanText(query).toLowerCase();

  const hasNewsWord =
    /\b(news|updates?|headlines?|happen(ed|ing)?|latest|breaking)\b/i.test(text);

  const hasSpecificStoryQuestion =
    /\b(why|how|when|where|who|did|does|is|are|was|were)\b/i.test(text);

  return hasNewsWord && !hasSpecificStoryQuestion;
}

function extractMainTopic(query = "") {
  let text = cleanText(query);

  text = text
    .replace(
      /\b(latest|today|current|recent|breaking|news|updates?|headlines?|right now|this morning|this evening)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  return text;
}

function buildNewsSearchVariants(userQuery = "") {
  const topic = extractMainTopic(userQuery);

  if (!topic) {
    return [userQuery];
  }

  const variants = [userQuery];

  if (isBroadNewsRequest(userQuery)) {
    variants.push(
      `${topic} latest news`,
      `${topic} injury news`,
      `${topic} transfer news`,
      `${topic} team news`,
      `${topic} international duty`
    );
  }

  return [...new Set(variants.map(cleanText).filter(Boolean))];
}

function parsePublishedDate(value = "") {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function daysSince(date) {
  if (!date) return 9999;

  const difference =
    Date.now() - date.getTime();

  return difference / (1000 * 60 * 60 * 24);
}

function isLikelyIrrelevant(result, query) {
  const title = cleanText(result.title || "").toLowerCase();
  const snippet = cleanText(
    result.snippet ||
    result.summary ||
    result.description ||
    ""
  ).toLowerCase();

  const combined = `${title} ${snippet}`;

  const words = extractImportantQueryWords(query);

  if (!words.length) {
    return false;
  }

  const matched = words.filter(word =>
    combined.includes(word)
  );

  return matched.length === 0;
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
  const first = tokenizeForSimilarity(a);
  const second = tokenizeForSimilarity(b);

  if (!first.size || !second.size) {
    return 0;
  }

  let overlap = 0;

  for (const word of first) {
    if (second.has(word)) {
      overlap++;
    }
  }

  return overlap / Math.min(first.size, second.size);
}

function getStoryText(result) {
  return cleanText(
    `${result.title || ""} ${result.snippet || result.summary || result.description || ""}`
  );
}

function scoreResult(result, query, recentRequest = false) {
  const title = cleanText(result.title || "").toLowerCase();
  const snippet = cleanText(
    result.snippet ||
    result.summary ||
    result.description ||
    ""
  ).toLowerCase();

  const combined = `${title} ${snippet}`;
  const queryWords = extractImportantQueryWords(query);

  let score = 0;

  for (const word of queryWords) {
    if (title.includes(word)) {
      score += 8;
    } else if (snippet.includes(word)) {
      score += 3;
    }
  }

  if (title.includes("arsenal") && query.toLowerCase().includes("arsenal")) {
    score += 10;
  }

  if (
    title.includes("latest") ||
    title.includes("update") ||
    title.includes("breaking")
  ) {
    score += 2;
  }

  const published = parsePublishedDate(
    result.published ||
    result.pubDate ||
    result.date ||
    ""
  );

  if (recentRequest && published) {
    const age = daysSince(published);

    if (age <= 1) {
      score += 20;
    } else if (age <= 2) {
      score += 15;
    } else if (age <= 3) {
      score += 10;
    } else if (age <= 7) {
      score += 4;
    }
  }

  if (result.source) {
    score += 1;
  }

  return score;
}

function diversifyResults(results, query, maxResults = 12) {
  const sorted = [...results].sort(
    (a, b) => (b._score || 0) - (a._score || 0)
  );

  const selected = [];
  const selectedStories = [];

  for (const result of sorted) {
    if (selected.length >= maxResults) {
      break;
    }

    const storyText = getStoryText(result);

    let tooSimilar = false;

    for (const previousStory of selectedStories) {
      if (similarityScore(storyText, previousStory) >= 0.72) {
        tooSimilar = true;
        break;
      }
    }

    if (tooSimilar) {
      continue;
    }

    selected.push(result);
    selectedStories.push(storyText);
  }

  /*
   * If diversity filtering removed too many results,
   * fill the remaining slots with the highest-ranked
   * results that were not already selected.
   */
  if (selected.length < Math.min(maxResults, sorted.length)) {
    for (const result of sorted) {
      if (selected.length >= maxResults) {
        break;
      }

      if (!selected.includes(result)) {
        selected.push(result);
      }
    }
  }

  return selected.slice(0, maxResults);
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; ZedAI/1.0; +https://zed-ai-h7h4.onrender.com)",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

async function searchGoogleNews(userQuery, recentRequest = false) {
  const searchUrl =
    `https://news.google.com/rss/search?q=` +
    encodeURIComponent(
      recentRequest
        ? `${userQuery} when:7d`
        : userQuery
    ) +
    `&hl=en-US&gl=US&ceid=US:en`;

  try {
    const xml = await fetchText(searchUrl);

    const items = [
      ...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)
    ];

    return items.map(match => {
      const item = match[1];

      const getTag = tag => {
        const regex = new RegExp(
          `<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
          "i"
        );

        const found = item.match(regex);
        return found ? cleanText(found[1]) : "";
      };

      const title = getTag("title");
      const link = getTag("link");
      const pubDate = getTag("pubDate");
      const description = getTag("description");
      const source = getTag("source");

      return {
        title,
        url: link,
        published: pubDate,
        source,
        snippet: description,
        provider: "Google News"
      };
    });
  } catch (error) {
    console.error("Google News search error:", error.message);
    return [];
  }
}

async function searchDuckDuckGo(userQuery) {
  const url =
    `https://html.duckduckgo.com/html/?q=` +
    encodeURIComponent(userQuery);

  try {
    const html = await fetchText(url);

    const results = [];

    const blocks = html.split(
      /<div[^>]+class="result[^"]*"[^>]*>/i
    );

    for (const block of blocks.slice(1)) {
      const titleMatch = block.match(
        /class="result__a"[^>]*>([\s\S]*?)<\/a>/i
      );

      const urlMatch = block.match(
        /class="result__a"[^>]+href="([^"]+)"/i
      );

      const snippetMatch = block.match(
        /class="result__snippet"[^>]*>([\s\S]*?)<\/a?>/i
      );

      if (!titleMatch || !urlMatch) {
        continue;
      }

      results.push({
        title: cleanText(titleMatch[1]),
        url: cleanText(urlMatch[1]),
        snippet: snippetMatch
          ? cleanText(snippetMatch[1])
          : "",
        published: "",
        source: "DuckDuckGo",
        provider: "DuckDuckGo"
      });
    }

    return results.slice(0, 10);
  } catch (error) {
    console.error("DuckDuckGo search error:", error.message);
    return [];
  }
}

function deduplicateResults(results) {
  const seen = new Set();
  const output = [];

  for (const result of results) {
    const url = normalizeUrl(result.url || "");

    if (!url || seen.has(url)) {
      continue;
    }

    seen.add(url);

    output.push({
      ...result,
      url
    });
  }

  return output;
}

async function runSearchVariant(query, recentRequest) {
  const googleResults = await searchGoogleNews(
    query,
    recentRequest
  );

  let duckResults = [];

  if (recentRequest) {
    duckResults = await searchDuckDuckGo(
      `${query} latest`
    );
  }

  return [
    ...googleResults,
    ...duckResults
  ];
}

export async function searchWeb(userQuery, options = {}) {
  const query = cleanText(userQuery);

  if (!query) {
    return {
      ok: false,
      query: "",
      results: [],
      message: "No search query provided."
    };
  }

  const recentRequest =
    options.recentRequest ??
    isRecentRequest(query);

  const broadNews =
    isBroadNewsRequest(query);

  /*
   * Broad current-news searches now use several targeted
   * search variations so one story cannot dominate the
   * entire result set.
   */
  const variants =
    recentRequest && broadNews
      ? buildNewsSearchVariants(query)
      : [query];

  let allResults = [];

  for (const variant of variants) {
    const results = await runSearchVariant(
      variant,
      recentRequest
    );

    allResults.push(
      ...results.map(result => ({
        ...result,
        searchVariant: variant
      }))
    );
  }

  allResults = deduplicateResults(allResults);

  allResults = allResults.filter(
    result => !isLikelyIrrelevant(result, query)
  );

  allResults = allResults.map(result => ({
    ...result,
    _score: scoreResult(
      result,
      query,
      recentRequest
    )
  }));

  /*
   * Current news gets more results than ordinary searches.
   * This gives News Intelligence enough material to identify
   * multiple different stories and people.
   */
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
          .slice(0, maximumResults);

  return {
    ok: true,
    query,
    recentRequest,
    broadNews,
    searchVariants: variants,
    resultCount: finalResults.length,
    results: finalResults
  };
}

export function formatWebResults(searchData) {
  if (!searchData || !Array.isArray(searchData.results)) {
    return "";
  }

  if (!searchData.results.length) {
    return "No reliable web search results were found.";
  }

  return searchData.results
    .map((result, index) => {
      const title = cleanText(result.title || "Untitled");
      const url = cleanText(result.url || "");
      const source = cleanText(result.source || "");
      const published = cleanText(
        result.published || ""
      );

      const snippet = cleanText(
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
    })
    .join("\n\n");
}

export function getWebSearchContext(searchData) {
  if (!searchData) {
    return "";
  }

  const currentDate = formatDateForZambia();
  const currentDateTime = getZambiaDateTime();

  return `
WORLDWIDE WEB SEARCH DATA

Current date in Zambia:
${currentDate}

Current date and time in Zambia:
${currentDateTime}

The following information was retrieved from current web/news searches.

${formatWebResults(searchData)}

IMPORTANT:
- Use the supplied search results as evidence.
- Do not invent news, names, injuries, transfers, scores, dates, or events.
- When the user asks for latest/current news, prefer the newest dated evidence.
- Distinguish confirmed information from reports, speculation, and pending assessments.
- If sources disagree, say so clearly.
`;
}

export function getSearchDateInfo() {
  const now = new Date();

  return {
    date: formatDateForZambia(now),
    dateTime: getZambiaDateTime(now)
  };
}

/*
 * Backwards-compatible aliases.
 * These allow the existing server.js to continue using
 * the same functions without changes.
 */
export const webSearch = searchWeb;
export const searchNews = searchWeb;
export const buildWebSearchContext = getWebSearchContext;

export default {
  searchWeb,
  webSearch,
  searchNews,
  formatWebResults,
  getWebSearchContext,
  buildWebSearchContext,
  getSearchDateInfo
};
