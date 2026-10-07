// web-search.js
// Zed — Web Search Intelligence
// Preserves existing exports while improving search quality,
// relevance, source ranking, deduplication and current-news handling.

const USER_AGENT =
  "Zed/1.0; +https://zed-ai-h7h4.onrender.com";

const TZ = "Africa/Lusaka";

const MAX_RESULTS = 12;
const MAX_SEARCH_VARIANTS = 4;
const FETCH_TIMEOUT = 9000;

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
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

function formatTimeForZambia(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function getZambiaDateTime() {
  const now = new Date();

  return {
    date: formatDateForZambia(now),
    time: formatTimeForZambia(now),
    iso: now.toISOString()
  };
}

function normalizeUrl(value = "") {
  let url = String(value).trim();

  if (!url) {
    return "";
  }

  try {
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    const parsed = new URL(url);

    parsed.hash = "";

    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid"
    ].forEach(param => {
      parsed.searchParams.delete(param);
    });

    return parsed.toString();
  } catch {
    return String(value).trim();
  }
}

function getHostname(url = "") {
  try {
    return new URL(url).hostname
      .replace(/^www\./i, "")
      .toLowerCase();
  } catch {
    return "";
  }
}

function extractDomain(url = "") {
  return getHostname(url);
}

function getQueryWords(query = "") {
  return cleanText(query)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(word => word.length >= 2);
}

function uniqueWords(words = []) {
  return [...new Set(words)];
}

function isRecentRequest(query = "") {
  return /\b(
    latest|
    recent|
    recently|
    today|
    tonight|
    now|
    current|
    currently|
    breaking|
    news|
    update|
    updates|
    this\s+(week|month|morning|afternoon|evening)|
    just|
    just\s+now|
    last\s+\d+\s+(hours?|days?|weeks?)
  )\b/ix.test(query);
}

function isNewsRequest(query = "") {
  return /\b(
    news|
    latest|
    update|
    updates|
    report|
    reports|
    reported|
    breaking|
    rumours?|
    rumors?|
    transfer|
    transfers|
    injury|
    injured|
    statement|
    announcement
  )\b/ix.test(query);
}

function isBroadRequest(query = "") {
  const words = getQueryWords(query);

  return words.length <= 4;
}

function parsePublishedDate(value) {
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

  const difference =
    Date.now() - date.getTime();

  return difference / 86400000;
}

function sourceQuality(url = "") {
  const domain = getHostname(url);

  if (!domain) {
    return 0;
  }

  const premiumSources = [
    "reuters.com",
    "apnews.com",
    "bbc.com",
    "bbc.co.uk",
    "theguardian.com",
    "espn.com",
    "skysports.com",
    "theathletic.com",
    "nytimes.com",
    "cnn.com",
    "aljazeera.com",
    "npr.org",
    "dw.com",
    "france24.com",
    "goal.com",
    "espnfc.com",
    "fifa.com",
    "uefa.com",
    "premierleague.com",
    "arsenal.com",
    "fcbarcelona.com",
    "realmadrid.com"
  ];

  if (
    premiumSources.some(
      source =>
        domain === source ||
        domain.endsWith(`.${source}`)
    )
  ) {
    return 35;
  }

  const strongSources = [
    "football365.com",
    "skysports.com",
    "talksport.com",
    "independent.co.uk",
    "telegraph.co.uk",
    "mirror.co.uk",
    "standard.co.uk",
    "marca.com",
    "as.com",
    "livesport.com",
    "transfermarkt.com"
  ];

  if (
    strongSources.some(
      source =>
        domain === source ||
        domain.endsWith(`.${source}`)
    )
  ) {
    return 22;
  }

  const weakSources = [
    "facebook.com",
    "x.com",
    "twitter.com",
    "tiktok.com",
    "youtube.com"
  ];

  if (
    weakSources.some(
      source =>
        domain === source ||
        domain.endsWith(`.${source}`)
    )
  ) {
    return 3;
  }

  return 10;
}

function relevanceScore(
  result,
  query,
  recentRequest = false
) {
  const title = cleanText(result.title).toLowerCase();
  const snippet = cleanText(
    result.snippet || result.description || ""
  ).toLowerCase();

  const combined =
    `${title} ${snippet}`;

  const words = uniqueWords(
    getQueryWords(query)
  );

  let score = 0;

  for (const word of words) {
    if (title.includes(word)) {
      score += 8;
    } else if (combined.includes(word)) {
      score += 4;
    }
  }

  if (
    result.source ||
    result.publisher
  ) {
    score += 2;
  }

  score += sourceQuality(
    result.url
  );

  const published =
    result.publishedAt ||
    result.pubDate ||
    result.date;

  const parsed =
    parsePublishedDate(published);

  if (parsed) {
    const age = daysSince(parsed);

    if (age <= 1) {
      score += recentRequest ? 30 : 10;
    } else if (age <= 3) {
      score += recentRequest ? 22 : 7;
    } else if (age <= 7) {
      score += recentRequest ? 12 : 4;
    } else if (recentRequest) {
      score -= 8;
    }
  }

  if (
    /\b(breaking|official|confirmed|announced)\b/i.test(
      combined
    )
  ) {
    score += 5;
  }

  return score;
}

function deduplicateResults(results = []) {
  const seenUrls = new Set();
  const seenTitles = new Set();
  const output = [];

  for (const item of results) {
    const url = normalizeUrl(
      item.url ||
      item.link ||
      item.href ||
      ""
    );

    const title = cleanText(
      item.title || ""
    )
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ");

    const titleKey =
      title.length > 120
        ? title.slice(0, 120)
        : title;

    if (
      url &&
      seenUrls.has(url)
    ) {
      continue;
    }

    if (
      titleKey &&
      seenTitles.has(titleKey)
    ) {
      continue;
    }

    if (url) {
      seenUrls.add(url);
    }

    if (titleKey) {
      seenTitles.add(titleKey);
    }

    output.push({
      ...item,
      url
    });
  }

  return output;
}

function diversifyResults(results = []) {
  const output = [];
  const sourceCounts = new Map();

  for (const result of results) {
    const domain =
      getHostname(result.url) ||
      "unknown";

    const count =
      sourceCounts.get(domain) || 0;

    // Avoid allowing one website to dominate
    // the entire answer.
    if (count >= 4) {
      continue;
    }

    sourceCounts.set(
      domain,
      count + 1
    );

    output.push(result);

    if (output.length >= MAX_RESULTS) {
      break;
    }
  }

  return output;
}

function normalizeResult(result = {}) {
  const url = normalizeUrl(
    result.url ||
    result.link ||
    result.href ||
    ""
  );

  const title = cleanText(
    result.title ||
    result.name ||
    ""
  );

  const snippet = cleanText(
    result.snippet ||
    result.description ||
    result.content ||
    ""
  );

  const publishedAt =
    result.publishedAt ||
    result.pubDate ||
    result.published ||
    result.date ||
    null;

  const source =
    cleanText(
      result.source ||
      result.publisher ||
      result.site ||
      extractDomain(url)
    );

  return {
    title,
    snippet,
    url,
    source,
    publishedAt
  };
}

async function fetchText(
  url,
  options = {}
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      FETCH_TIMEOUT
    );

  try {
    const response =
      await fetch(url, {
        ...options,
        signal:
          controller.signal,
        headers: {
          "User-Agent":
            USER_AGENT,
          Accept:
            "text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.8",
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

function decodeXml(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

function extractXmlTag(
  block = "",
  tag = ""
) {
  const expression =
    new RegExp(
      `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
      "i"
    );

  const match =
    block.match(expression);

  return match
    ? decodeXml(match[1])
    : "";
}

function parseGoogleNewsRss(
  xml = ""
) {
  const results = [];

  const itemMatches =
    xml.match(
      /<item>[\s\S]*?<\/item>/gi
    ) || [];

  for (const item of itemMatches) {
    const title =
      extractXmlTag(
        item,
        "title"
      );

    const link =
      extractXmlTag(
        item,
        "link"
      );

    const description =
      stripHtml(
        extractXmlTag(
          item,
          "description"
        )
      );

    const pubDate =
      extractXmlTag(
        item,
        "pubDate"
      );

    const source =
      extractXmlTag(
        item,
        "source"
      );

    if (!title) {
      continue;
    }

    results.push({
      title,
      snippet:
        description,
      url:
        normalizeUrl(link),
      source:
        cleanText(source),
      publishedAt:
        pubDate
    });
  }

  return results;
}

async function searchGoogleNews(
  query
) {
  const encoded =
    encodeURIComponent(
      cleanText(query)
    );

  const url =
    `https://news.google.com/rss/search?q=${encoded}&hl=en&gl=US&ceid=US:en`;

  try {
    const xml =
      await fetchText(url);

    return parseGoogleNewsRss(xml);
  } catch (error) {
    console.warn(
      "Google News search failed:",
      error.message
    );

    return [];
  }
}

function parseDuckDuckGoHtml(
  html = ""
) {
  const results = [];

  const blocks =
    html.match(
      /<div[^>]+class="[^"]*result[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi
    ) || [];

  for (const block of blocks) {
    const linkMatch =
      block.match(
        /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"/i
      );

    const titleMatch =
      block.match(
        /<a[^>]+class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/i
      );

    const snippetMatch =
      block.match(
        /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i
      ) ||
      block.match(
        /<div[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i
      );

    if (!linkMatch || !titleMatch) {
      continue;
    }

    const rawUrl =
      stripHtml(
        linkMatch[1]
      );

    let url =
      normalizeUrl(rawUrl);

    // DuckDuckGo can return redirect URLs.
    try {
      const parsed =
        new URL(url);

      const redirected =
        parsed.searchParams.get("uddg");

      if (redirected) {
        url =
          normalizeUrl(
            decodeURIComponent(
              redirected
            )
          );
      }
    } catch {
      // Keep original URL.
    }

    const title =
      stripHtml(
        titleMatch[1]
      );

    const snippet =
      snippetMatch
        ? stripHtml(
            snippetMatch[1]
          )
        : "";

    if (!title || !url) {
      continue;
    }

    results.push({
      title,
      snippet,
      url,
      source:
        getHostname(url)
    });
  }

  return results;
}

async function searchDuckDuckGo(
  query
) {
  const encoded =
    encodeURIComponent(
      cleanText(query)
    );

  const url =
    `https://html.duckduckgo.com/html/?q=${encoded}`;

  try {
    const html =
      await fetchText(url);

    return parseDuckDuckGoHtml(
      html
    );
  } catch (error) {
    console.warn(
      "DuckDuckGo search failed:",
      error.message
    );

    return [];
  }
}

function buildSearchVariants(
  query
) {
  const original =
    cleanText(query);

  if (!original) {
    return [];
  }

  const variants = [
    original
  ];

  const recent =
    isRecentRequest(
      original
    );

  const news =
    isNewsRequest(
      original
    );

  if (recent || news) {
    variants.push(
      `${original} latest news`
    );

    variants.push(
      `${original} latest update`
    );
  }

  if (
    news &&
    /\b(football|soccer|arsenal|chelsea|barcelona|real madrid|manchester|liverpool|transfer|injury)\b/i.test(
      original
    )
  ) {
    variants.push(
      `${original} football news`
    );
  }

  return uniqueWords(
    variants
  ).slice(
    0,
    MAX_SEARCH_VARIANTS
  );
}

async function runSearchVariant(
  query,
  options = {}
) {
  const recent =
    Boolean(
      options.recent ??
      isRecentRequest(query)
    );

  const searches = [
    searchGoogleNews(query),
    searchDuckDuckGo(query)
  ];

  // Run providers concurrently.
  // This makes multi-source searches
  // considerably faster.
  const results =
    await Promise.allSettled(
      searches
    );

  const combined = [];

  for (const result of results) {
    if (
      result.status ===
      "fulfilled" &&
      Array.isArray(
        result.value
      )
    ) {
      combined.push(
        ...result.value
      );
    }
  }

  return combined
    .map(normalizeResult)
    .filter(
      result =>
        result.title &&
        result.url
    )
    .map(result => ({
      ...result,
      score:
        relevanceScore(
          result,
          query,
          recent
        )
    }));
}

function filterRelevantResults(
  results,
  query
) {
  const words =
    uniqueWords(
      getQueryWords(query)
    );

  if (!words.length) {
    return results;
  }

  return results.filter(
    result => {
      const combined =
        `${result.title} ${result.snippet}`
          .toLowerCase();

      const matches =
        words.filter(
          word =>
            combined.includes(
              word
            )
        ).length;

      // Keep results with reasonable
      // relevance. Do not require every
      // query word because that is too strict
      // for natural-language searches.
      return (
        matches >=
        Math.max(
          1,
          Math.ceil(
            words.length * 0.25
          )
        )
      );
    }
  );
}

async function searchWeb(
  query,
  options = {}
) {
  const cleanQuery =
    cleanText(query);

  if (!cleanQuery) {
    return {
      query: "",
      searchedAt:
        getZambiaDateTime(),
      results: []
    };
  }

  const recent =
    Boolean(
      options.recent ??
      isRecentRequest(
        cleanQuery
      )
    );

  const variants =
    buildSearchVariants(
      cleanQuery
    );

  const variantResults =
    await Promise.all(
      variants.map(
        variant =>
          runSearchVariant(
            variant,
            { recent }
          )
      )
    );

  let results =
    variantResults.flat();

  results =
    deduplicateResults(
      results
    );

  results =
    filterRelevantResults(
      results,
      cleanQuery
    );

  results.sort(
    (a, b) =>
      Number(
        b.score || 0
      ) -
      Number(
        a.score || 0
      )
  );

  results =
    diversifyResults(
      results
    );

  return {
    query:
      cleanQuery,

    searchedAt:
      getZambiaDateTime(),

    recent,

    resultCount:
      results.length,

    results
  };
}

function formatPublishedDate(
  value
) {
  const date =
    parsePublishedDate(
      value
    );

  if (!date) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: TZ,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  ).format(date);
}

function formatWebResults(
  searchData
) {
  if (
    !searchData ||
    !Array.isArray(
      searchData.results
    ) ||
    !searchData.results.length
  ) {
    return (
      "No reliable web search results were found."
    );
  }

  const lines = [];

  lines.push(
    `WEB SEARCH QUERY: ${searchData.query}`
  );

  lines.push(
    `SEARCHED: ${searchData.searchedAt?.date || formatDateForZambia()} ${searchData.searchedAt?.time || formatTimeForZambia()} Zambia time`
  );

  lines.push(
    `RESULTS FOUND: ${searchData.results.length}`
  );

  lines.push("");

  searchData.results.forEach(
    (result, index) => {
      lines.push(
        `[${index + 1}] ${result.title}`
      );

      lines.push(
        `Source: ${result.source || extractDomain(result.url)}`
      );

      lines.push(
        `Published: ${formatPublishedDate(result.publishedAt)}`
      );

      if (result.snippet) {
        lines.push(
          `Summary: ${result.snippet}`
        );
      }

      if (result.url) {
        lines.push(
          `URL: ${result.url}`
        );
      }

      lines.push("");
    }
  );

  return lines.join("\n");
}

function getWebSearchContext(
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

  return formatWebResults(
    searchData
  );
}

function getSearchDateInfo() {
  const now =
    getZambiaDateTime();

  return {
    date:
      now.date,

    time:
      now.time,

    timezone:
      TZ,

    iso:
      now.iso
  };
}

async function webSearch(
  query,
  options = {}
) {
  return searchWeb(
    query,
    options
  );
}

async function searchNews(
  query,
  options = {}
) {
  return searchWeb(
    query,
    {
      ...options,
      recent: true
    }
  );
}

function buildWebSearchContext(
  searchData
) {
  return getWebSearchContext(
    searchData
  );
}

export {
  cleanText,
  formatDateForZambia,
  formatTimeForZambia,
  getZambiaDateTime,
  normalizeUrl,
  extractDomain,
  isRecentRequest,
  isNewsRequest,
  searchGoogleNews,
  searchDuckDuckGo,
  searchWeb,
  webSearch,
  searchNews,
  formatWebResults,
  getWebSearchContext,
  buildWebSearchContext,
  getSearchDateInfo,
  deduplicateResults,
  diversifyResults
};

export default {
  webSearch,
  searchWeb,
  searchNews,
  formatWebResults,
  getWebSearchContext,
  buildWebSearchContext,
  getSearchDateInfo
};
