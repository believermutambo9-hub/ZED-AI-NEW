// web-search.js
// Reliable web/news search engine for Zed

const TZ = "Africa/Lusaka";
const USER_AGENT =
  "Mozilla/5.0 (compatible; Zed/1.0; +https://zed-ai-h7h4.onrender.com)";

const FETCH_TIMEOUT = 10000;
const MAX_RESULTS = 10;

function cleanText(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
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
    .replace(/&#x([\da-f]+);/gi, (_, code) => {
      try {
        return String.fromCodePoint(parseInt(code, 16));
      } catch {
        return "";
      }
    })
    .replace(/\s+/g, " ")
    .trim();
}

function formatDateForZambia(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
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
    let raw = String(url).trim();
    if (raw.startsWith("//")) raw = `https:${raw}`;
    if (!/^https?:\/\//i.test(raw)) return "";

    let parsed = new URL(raw);

    // DuckDuckGo wraps destination links in a redirect URL.
    if (/duckduckgo\.com$/i.test(parsed.hostname) && parsed.pathname.startsWith("/l/")) {
      const destination = parsed.searchParams.get("uddg");
      if (destination) parsed = new URL(destination);
    }

    if (!["http:", "https:"].includes(parsed.protocol)) return "";
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
    return "";
  }
}

function extractDomain(url = "") {
  try {
    return new URL(url).hostname.replace(/^www\\./, "");
  } catch {
    return "";
  }
}

const NON_PUBLISHER_HOSTS = new Set([
  "news.google.com", "google.com", "bing.com", "www.bing.com",
  "duckduckgo.com", "html.duckduckgo.com"
]);

export function isDirectArticleUrl(url = "") {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    if (NON_PUBLISHER_HOSTS.has(host)) return false;
    if (!parsed.pathname || parsed.pathname === "/") return false;
    if (/^\/(search|tag|category)(?:\/|$)/i.test(parsed.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

function isAbsolutePublicationDate(value = "") {
  const text = String(value || "").trim();
  if (!text || /\b\d+\s+(second|minute|hour|day|week)s?\s+ago\b/i.test(text) || /^yesterday$/i.test(text)) return false;
  return /^\d{4}-\d{2}-\d{2}(?:[Tt ][0-9:.+-]+Z?)?$/.test(text) ||
    /^[A-Z][a-z]{2},?\s+\d{1,2}\s+[A-Z][a-z]{2}\s+\d{4}/.test(text);
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
    "published",
    "publication",
    "article",
    "articles",
    "source",
    "sources",
    "verified",
    "relevant",
    "technology trends",
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

function cleanSearchIntent(query = "") {
  return cleanText(query)
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\b(search (the )?web for|search online for|look up online|find online|browse (the )?web for|web search for|on the internet)\b/gi, " ")
    .replace(/\b(give me|show me|find me|provide|return|list|include|with)\b/gi, " ")
    .replace(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(reliable\s+|verified\s+|credible\s+)?(sources?|articles?|results?|links?)\b/gi, " ")
    .replace(/\b(clickable|direct|article|publication|publisher|published|publication date|date|source|sources|link|links|verified|reliable|credible)\b/gi, " ")
    .replace(/\b(each|with|their|and|please|for me|if you cannot verify a detail|if you cannot verify|cannot verify|say so)\b/gi, " ")
    .replace(/[,:;!?()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isTodayRequest(query = "") {
  return /\b(today|published today|this day)\b/i.test(cleanText(query));
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
      /\b(latest|today|current|recent|breaking|news|updates?|headlines?|published|publication|articles?|sources?|verified|relevant|right now|this morning|this evening)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function buildNewsSearchVariants(userQuery = "") {
  const topic = extractMainTopic(userQuery);
  if (!topic) return [cleanText(userQuery)];

  const variants = [userQuery, topic];
  if (isNewsRequest(userQuery)) {
    variants.push(
      `${topic} technology news`,
      `${topic} latest developments`,
      `${topic} news today`,
      `latest ${topic} news`
    );
  }

  return [...new Set(variants.map(cleanText).filter(Boolean))];
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
  recentRequest = false,
  todayRequest = false
) {
  const query = todayRequest
    ? `${userQuery} when:1d`
    : recentRequest
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

async function searchBingNews(
  userQuery,
  recentRequest = false,
  todayRequest = false
) {
  // Bing News RSS provides a second dated-news index. Do not send Google's
  // when:1d operator to Bing; exact-date filtering is performed locally
  // against the provider's published timestamp.
  const query = cleanText(userQuery)
    .replace(/\b(published today|today)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const searchUrl =
    `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`;

  try {
    const xml = await fetchText(searchUrl);
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];

    return items.map(match => {
      const item = match[1];
      const getTag = tag => {
        const found = item.match(
          new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
        );
        return found ? cleanText(found[1]) : "";
      };
      return {
        title: getTag("title"),
        url: getTag("link"),
        published: getTag("pubDate"),
        source: getTag("source") || "Bing News",
        snippet: getTag("description"),
        provider: "Bing News"
      };
    }).filter(result => result.title && result.url);
  } catch (error) {
    console.error("Bing News search error:", error.message);
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


async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        ...(options.headers || {})
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeTavilyResults(payload) {
  return (Array.isArray(payload?.results) ? payload.results : []).map(item => ({
    title: cleanText(item?.title || ""),
    url: item?.url || "",
    snippet: cleanText(item?.content || item?.raw_content || ""),
    published: item?.published_date || "",
    source: extractDomain(item?.url || ""),
    provider: "Tavily"
  })).filter(item => item.title && item.url);
}

function normalizeExaResults(payload) {
  return (Array.isArray(payload?.results) ? payload.results : []).map(item => ({
    title: cleanText(item?.title || ""),
    url: item?.url || "",
    snippet: cleanText(item?.text || (Array.isArray(item?.highlights) ? item.highlights.join(" ") : "") || item?.summary || ""),
    published: item?.publishedDate || item?.published_date || "",
    source: extractDomain(item?.url || ""),
    provider: "Exa"
  })).filter(item => item.title && item.url);
}

function normalizeGdeltResults(payload) {
  return (Array.isArray(payload?.articles) ? payload.articles : []).map(item => {
    const rawDate = String(item?.seendate || "");
    const indexedAt = /^\\d{14}$/.test(rawDate)
      ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}T${rawDate.slice(8, 10)}:${rawDate.slice(10, 12)}:${rawDate.slice(12, 14)}Z`
      : "";
    return {
      title: cleanText(item?.title || ""),
      url: item?.url || "",
      snippet: cleanText(item?.description || ""),
      published: "",
      indexedAt,
      dateType: "indexed_or_seen",
      source: cleanText(item?.domain || item?.sourcecountry || ""),
      provider: "GDELT"
    };
  }).filter(item => item.title && item.url);
}

function normalizeSerperResults(payload, provider = "Serper") {
  const items = [
    ...(Array.isArray(payload?.organic) ? payload.organic : []),
    ...(Array.isArray(payload?.news) ? payload.news : [])
  ];
  return items.map(item => {
    const rawDate = String(item?.datePublished || item?.date || "").trim();
    const published = isAbsolutePublicationDate(rawDate) ? rawDate : "";
    return {
      title: cleanText(item?.title || ""),
      url: item?.link || item?.url || "",
      snippet: cleanText(item?.snippet || item?.description || ""),
      published,
      dateLabel: published ? "" : rawDate,
      dateType: published ? "provider_publication_date" : rawDate ? "relative_or_unverified" : "missing",
      source: cleanText(item?.source || extractDomain(item?.link || item?.url || "")),
      provider
    };
  }).filter(item => item.title && item.url);
}

async function searchGdelt(query, recentRequest = false) {
  const params = new URLSearchParams({
    query,
    mode: "ArtList",
    format: "json",
    maxrecords: "10",
    sort: "HybridRel",
    timespan: recentRequest ? "7d" : "30d"
  });
  try {
    const payload = await fetchJson(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`);
    return normalizeGdeltResults(payload);
  } catch (error) {
    console.warn("GDELT search unavailable:", error.message);
    return [];
  }
}

async function searchTavily(query, newsRequest = false) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];
  try {
    const payload = await fetchJson("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        topic: newsRequest ? "news" : "general",
        search_depth: "basic",
        max_results: 8,
        include_answer: false
      })
    });
    return normalizeTavilyResults(payload);
  } catch (error) {
    console.warn("Tavily search unavailable:", error.message);
    return [];
  }
}

async function searchExa(query) {
  const key = process.env.EXA_API_KEY;
  if (!key) return [];
  try {
    const payload = await fetchJson("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key
      },
      body: JSON.stringify({
        query,
        type: "fast",
        numResults: 8,
        contents: { text: { maxCharacters: 1200 } }
      })
    });
    return normalizeExaResults(payload);
  } catch (error) {
    console.warn("Exa search unavailable:", error.message);
    return [];
  }
}

async function searchSerper(query, newsRequest = false) {
  const key = process.env.SERPER_API_KEY;
  if (!key) return [];
  try {
    const endpoint = newsRequest
      ? "https://google.serper.dev/news"
      : "https://google.serper.dev/search";
    const payload = await fetchJson(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": key
      },
      body: JSON.stringify({ q: query, num: 10, gl: "us", hl: "en" })
    });
    return normalizeSerperResults(payload);
  } catch (error) {
    console.warn("Serper search unavailable:", error.message);
    return [];
  }
}

export function getSearchProviderStatus() {
  return [
    { id: "google-news-rss", label: "Google News RSS", enabled: true, free: true },
    { id: "bing-news-rss", label: "Bing News RSS", enabled: true, free: true },
    { id: "duckduckgo", label: "DuckDuckGo", enabled: true, free: true },
    { id: "gdelt", label: "GDELT", enabled: true, free: true, allowance: "Free global news search; no API key" },
    { id: "tavily", label: "Tavily", enabled: Boolean(process.env.TAVILY_API_KEY), free: true, allowance: "1,000 credits/month; no card" },
    { id: "exa", label: "Exa", enabled: Boolean(process.env.EXA_API_KEY), free: true, allowance: "$10 monthly credits; no payment method" },
    { id: "serper", label: "Serper", enabled: Boolean(process.env.SERPER_API_KEY), free: true, allowance: "2,500 starter queries; no card (one-time free credits)" }
  ];
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
  recentRequest,
  todayRequest = false,
  includeKeyedProviders = false
) {
  const newsRequest = isNewsRequest(query);
  const searches = [
    searchGoogleNews(query, recentRequest, todayRequest),
    searchBingNews(query, recentRequest, todayRequest),
    searchDuckDuckGo(query),
    searchGdelt(query, recentRequest)
  ];
  // Keyed services use one request per user search, not one request per
  // query rewrite. This protects small free quotas from variant fan-out.
  if (includeKeyedProviders) {
    searches.push(
      searchTavily(query, newsRequest),
      searchExa(query),
      searchSerper(query, newsRequest)
    );
  }

  const results = await Promise.allSettled(searches);
  const values = results.map(result =>
    result.status === "fulfilled" && Array.isArray(result.value)
      ? result.value
      : []
  );

  return values.flat();
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

  // Search for the user's actual topic, not request-framing words
  // such as "give me three reliable sources with clickable links".
  const intentQuery = cleanSearchIntent(query) || query;

  const todayRequest = isTodayRequest(query);
  const recentRequest =
    options.recentRequest ??
    (isRecentRequest(intentQuery) || todayRequest);

  const newsRequest =
    isNewsRequest(intentQuery);

  const broadNews =
    isBroadNewsRequest(intentQuery);

  const variants =
    newsRequest && (recentRequest || todayRequest)
      ? buildNewsSearchVariants(intentQuery)
      : [intentQuery];

  let allResults = [];

  /*
   * Search all variants in parallel.
   * This makes current searches faster
   * and prevents one failed provider from
   * stopping the complete search.
   */
  const variantResults =
    await Promise.all(
      variants.map((variant, index) =>
        runSearchVariant(
          variant,
          recentRequest,
          todayRequest,
          index === 0
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

  // News answers require article-level links, not provider homepages or aggregators.
  if (newsRequest) {
    allResults = allResults.filter(result => isDirectArticleUrl(result.url));
  }

  // Exact-date searches can occasionally miss items because Google News'
  // 24-hour filter is narrower than its indexed publication-date metadata.
  // If the first pass has no dated stories for the Zambia calendar date,
  // retry the same topic against the last seven days, then keep only results
  // whose provider-supplied publication date matches today. Never use
  // undated DuckDuckGo results to satisfy an exact-date request.
  if (todayRequest) {
    const todayInZambia = formatDateForZambia(new Date());
    const isPublishedToday = result => {
      const date = parsePublishedDate(result.published || result.pubDate || "");
      return date && formatDateForZambia(date) === todayInZambia;
    };

    if (!allResults.some(isPublishedToday)) {
      const fallbackResults = await Promise.all(
        variants.map(variant => runSearchVariant(variant, true, false))
      );
      allResults = deduplicateResults([
        ...allResults,
        ...fallbackResults.flat()
      ]);
    }

    allResults = allResults.filter(isPublishedToday);
  }

  // Fallback results must pass the same article-link gate as the first pass.
  if (newsRequest) {
    allResults = allResults.filter(result => isDirectArticleUrl(result.url));
  }

  // Apply relevance filtering after all retries so fallback results
  // cannot bypass the same quality checks as the initial search.
  allResults = allResults.filter(
    result => !isLikelyIrrelevant(result, intentQuery)
  );

  allResults =
    allResults.map(
      result => ({
        ...result,
        _score:
          scoreResult(
            result,
            intentQuery,
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
    providersAvailable: getSearchProviderStatus().filter(item => item.enabled).map(item => item.label),
    providersUsed: [...new Set(finalResults.map(item => item.provider).filter(Boolean))],
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
          cleanText(result.published || "Publication date not verified");
        const dateLabel = cleanText(result.dateLabel || "");
        const indexedAt = cleanText(result.indexedAt || "");
        const provider = cleanText(result.provider || "Unknown provider");
        const linkStatus = isDirectArticleUrl(url)
          ? "Article-level URL candidate; page content not independently verified"
          : "Not a verified direct article URL";

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
          `Publication date: ${published}`,
          dateLabel ? `Provider date label (not an absolute date): ${dateLabel}` : "",
          indexedAt ? `Provider indexed/seen time (not publication time): ${indexedAt}` : "",
          `Provider: ${provider}`,
          `Link assessment: ${linkStatus}`,
          `URL: ${url}`,
          `Snippet: ${snippet}`
        ].filter(Boolean).join("\n");
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

IMPORTANT EVIDENCE RULES:
- Search-result snippets are leads, not proof that an article was opened or its claims verified.
- Never call a story or URL verified unless the article page was actually retrieved and its content supports the claim.
- A provider indexed/seen timestamp is NOT an article publication date. Never convert GDELT seendate into publication time.
- Relative labels such as "2 hours ago" are not absolute publication dates. State them only as provider labels, not confirmed dates.
- If publication date is missing or unverified, say so rather than guessing.
- A provider source label does not prove the linked domain belongs to that publisher. Attribute the actual linked domain; do not credit Bloomberg, Reuters or another publisher unless the URL/page supports it.
- Never use a homepage, search page or aggregator homepage as a direct article link.
- Distinguish the article publication date from the date an event happened.
- Multiple search providers are not automatically independent corroboration. Count distinct publisher domains, not provider names.
- Distinguish confirmed facts, reports, allegations and speculation.
- If sources disagree or evidence is thin, explain the limitation and lower confidence.
- Never invent facts, dates, sources or links, or claim that evidence proves more than it says.
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
  isLikelyIrrelevant,
  cleanSearchIntent,
  formatDateForZambia,
  getZambiaDateTime,
  normalizeUrl,
  extractDomain,
  isRecentRequest,
  isTodayRequest,
  isNewsRequest,
  isBroadNewsRequest,
  searchGoogleNews,
  searchBingNews,
  searchDuckDuckGo,
  searchGdelt,
  searchTavily,
  searchExa,
  searchSerper,
  isDirectArticleUrl,
  isAbsolutePublicationDate,
  normalizeTavilyResults,
  normalizeExaResults,
  normalizeSerperResults,
  normalizeGdeltResults,
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
  getSearchDateInfo,
  getSearchProviderStatus
};
