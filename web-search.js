// web-search.js

function cleanText(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/<[^>]*>/g, "")
    .trim();
}

function cleanUrl(value = "") {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function addResult(results, seen, item) {
  const title = cleanText(item.title);
  const snippet = cleanText(item.snippet);
  const link = cleanUrl(item.link);

  if (!title) return;

  // Prefer the unique ID supplied by the source.
  const sourceId = item.id ? String(item.id) : "";

  // If there is no source ID, create a stable duplicate key.
  const fallbackKey =
    `${title.toLowerCase()}|${snippet.toLowerCase()}|${link}`.slice(0, 1000);

  const key = sourceId || fallbackKey;

  if (seen.has(key)) return;

  seen.add(key);

  results.push({
    id: sourceId || key,
    title,
    snippet,
    link
  });
}

function isFootballQuestion(query = "") {
  const text = query.toLowerCase();

  const footballWords = [
    "football",
    "soccer",
    "football results",
    "football scores",
    "soccer results",
    "soccer scores",
    "match result",
    "match results",
    "football match",
    "soccer match",
    "premier league",
    "champions league",
    "europa league",
    "conference league",
    "la liga",
    "bundesliga",
    "serie a",
    "ligue 1",
    "fa cup",
    "carabao cup",
    "world cup",
    "afcon",
    "caf",
    "zambia national team",
    "chipolopolo"
  ];

  return footballWords.some((word) => text.includes(word));
}

function buildSearchQuery(query = "") {
  const text = query.trim();

  const currentWords = [
    "today",
    "tonight",
    "now",
    "current",
    "currently",
    "latest",
    "recent",
    "yesterday",
    "tomorrow",
    "this week",
    "live",
    "score",
    "scores",
    "result",
    "results",
    "news",
    "weather"
  ];

  const hasCurrentWord = currentWords.some((word) =>
    text.toLowerCase().includes(word)
  );

  if (hasCurrentWord) {
    return `${text} latest current information`;
  }

  return text;
}

/* =========================================================
   DUCKDUCKGO HTML SEARCH
   ========================================================= */

async function searchDuckDuckGo(query) {
  try {
    const searchUrl =
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
        buildSearchQuery(query)
      )}`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!response.ok) {
      console.log("DuckDuckGo HTML status:", response.status);
      return [];
    }

    const html = await response.text();

    const results = [];
    const seen = new Set();

    const blocks =
      html.match(/<div class="result results_links results_links_deep web-result[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi) ||
      [];

    for (const block of blocks) {
      const linkMatch =
        block.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"/i) ||
        block.match(/<a[^>]+href="([^"]+)"[^>]*class="result__a"/i);

      if (!linkMatch) continue;

      let link = linkMatch[1];

      try {
        link = decodeURIComponent(link);
      } catch {
        // Keep original URL if decoding fails.
      }

      const titleMatch =
        block.match(/<a[^>]+class="result__a"[^>]*>([\s\S]*?)<\/a>/i);

      const snippetMatch =
        block.match(
          /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i
        ) ||
        block.match(
          /<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i
        );

      const title = cleanText(titleMatch?.[1] || "");
      const snippet = cleanText(snippetMatch?.[1] || "");

      if (!title || !link) continue;

      addResult(results, seen, {
        title,
        snippet,
        link
      });
    }

    return results;
  } catch (error) {
    console.log("DuckDuckGo HTML search error:", error.message);
    return [];
  }
}

/* =========================================================
   DUCKDUCKGO LITE FALLBACK
   ========================================================= */

async function searchDuckDuckGoLite(query) {
  try {
    const searchUrl =
      `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(
        buildSearchQuery(query)
      )}`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!response.ok) {
      console.log("DuckDuckGo Lite status:", response.status);
      return [];
    }

    const html = await response.text();

    const results = [];
    const seen = new Set();

    const linkRegex =
      /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while ((match = linkRegex.exec(html)) !== null) {
      const link = cleanUrl(match[1]);
      const title = cleanText(match[2]);

      if (!link || !title) continue;

      // Ignore DuckDuckGo navigation links.
      if (
        link.includes("duckduckgo.com") &&
        !link.includes("uddg=")
      ) {
        continue;
      }

      if (title.length < 3) continue;

      addResult(results, seen, {
        title,
        snippet: "",
        link
      });

      if (results.length >= 20) break;
    }

    return results;
  } catch (error) {
    console.log("DuckDuckGo Lite search error:", error.message);
    return [];
  }
}

/* =========================================================
   FOOTBALL SCORE SEARCH
   ========================================================= */

function getTodayForZambia() {
  // Zambia uses UTC+2.
  const now = new Date();

  const zambiaTime = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Africa/Lusaka"
    })
  );

  const year = zambiaTime.getFullYear();
  const month = String(zambiaTime.getMonth() + 1).padStart(2, "0");
  const day = String(zambiaTime.getDate()).padStart(2, "0");

  return `${year}${month}${day}`;
}

function getMatchState(statusType = {}) {
  const state = String(statusType.state || "").toLowerCase();

  if (state === "in") {
    return "LIVE";
  }

  if (state === "post") {
    return "Finished";
  }

  return "Scheduled";
}

function getMatchStatusText(statusType = {}) {
  const state = String(statusType.state || "").toLowerCase();

  if (state === "in") {
    return (
      cleanText(statusType.detail) ||
      cleanText(statusType.shortDetail) ||
      "LIVE"
    );
  }

  if (state === "post") {
    return (
      cleanText(statusType.detail) ||
      cleanText(statusType.shortDetail) ||
      "Finished"
    );
  }

  return (
    cleanText(statusType.detail) ||
    cleanText(statusType.shortDetail) ||
    "Scheduled"
  );
}

function getCompetitionName(event = {}) {
  const competition =
    event.competitions?.[0]?.competition ||
    event.competitions?.[0];

  const league =
    competition?.name ||
    competition?.displayName ||
    event.league?.name ||
    event.league?.displayName ||
    event.season?.displayName ||
    "";

  return cleanText(league);
}

function getTeamName(competitor = {}) {
  return cleanText(
    competitor.team?.displayName ||
    competitor.team?.shortDisplayName ||
    competitor.team?.name ||
    competitor.name ||
    "Unknown team"
  );
}

function getTeamScore(competitor = {}) {
  const score = competitor.score;

  if (score === undefined || score === null || score === "") {
    return null;
  }

  return String(score);
}

function getEventLink(event = {}) {
  // Use ESPN's own event link when available.
  const links = Array.isArray(event.links) ? event.links : [];

  for (const link of links) {
    const href = cleanUrl(link?.href);

    if (href) {
      return href;
    }
  }

  // Otherwise construct a unique ESPN match URL.
  if (event.id) {
    return `https://www.espn.com/soccer/match/_/gameId/${event.id}`;
  }

  return "https://www.espn.com/soccer/";
}

function getMatchTime(event = {}) {
  if (!event.date) return "";

  try {
    const date = new Date(event.date);

    return date.toLocaleString("en-ZM", {
      timeZone: "Africa/Lusaka",
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return cleanText(event.date);
  }
}

function eventMatchesQuery(event, query = "") {
  const text = query.toLowerCase().trim();

  // Broad football questions should show the available football feed.
  if (
    text.includes("football") ||
    text.includes("soccer") ||
    text.includes("results") ||
    text.includes("scores") ||
    text.includes("matches")
  ) {
    return true;
  }

  const competitors = event.competitions?.[0]?.competitors || [];

  const teamNames = competitors
    .map((team) =>
      (
        team.team?.displayName ||
        team.team?.shortDisplayName ||
        team.team?.name ||
        ""
      ).toLowerCase()
    )
    .filter(Boolean);

  return teamNames.some((name) => text.includes(name));
}

async function searchFootballScores(query = "") {
  try {
    const date = getTodayForZambia();

    const url =
      `https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=${date}`;

    console.log("Football scoreboard URL:", url);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Zed/1.0"
      }
    });

    console.log("Football scoreboard status:", response.status);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    const events = Array.isArray(data.events)
      ? data.events
      : [];

    console.log(
      "Football events received:",
      events.length
    );

    const results = [];
    const seenEventIds = new Set();
    const seenMatchKeys = new Set();

    for (const event of events) {
      if (!event || !event.id) continue;

      // =====================================================
      // IMPORTANT:
      // Never add the same ESPN event twice.
      // =====================================================

      const eventId = String(event.id);

      if (seenEventIds.has(eventId)) {
        continue;
      }

      seenEventIds.add(eventId);

      if (!eventMatchesQuery(event, query)) {
        continue;
      }

      const competition =
        event.competitions?.[0];

      const competitors =
        competition?.competitors || [];

      if (competitors.length < 2) {
        continue;
      }

      const home =
        competitors.find(
          (team) =>
            team.homeAway === "home"
        ) ||
        competitors[0];

      const away =
        competitors.find(
          (team) =>
            team.homeAway === "away"
        ) ||
        competitors[1];

      const homeName = getTeamName(home);
      const awayName = getTeamName(away);

      if (
        homeName === "Unknown team" ||
        awayName === "Unknown team"
      ) {
        continue;
      }

      // Additional protection against duplicate matches
      // appearing with different event IDs.
      const matchKey = [
        homeName.toLowerCase(),
        awayName.toLowerCase(),
        event.date
          ? String(event.date).slice(0, 10)
          : ""
      ].join("|");

      if (seenMatchKeys.has(matchKey)) {
        continue;
      }

      seenMatchKeys.add(matchKey);

      const homeScore = getTeamScore(home);
      const awayScore = getTeamScore(away);

      const statusType =
        event.status?.type || {};

      const state =
        getMatchState(statusType);

      const statusText =
        getMatchStatusText(statusType);

      const competitionName =
        getCompetitionName(event);

      const matchTime =
        getMatchTime(event);

      let scoreText;

      if (
        homeScore !== null &&
        awayScore !== null
      ) {
        scoreText =
          `${homeName} ${homeScore} - ${awayScore} ${awayName}`;
      } else {
        scoreText =
          `${homeName} vs ${awayName}`;
      }

      const title =
        `${scoreText} — ${state}`;

      const snippetParts = [];

      if (statusText) {
        snippetParts.push(
          `Status: ${statusText}`
        );
      }

      if (competitionName) {
        snippetParts.push(
          `Competition: ${competitionName}`
        );
      }

      if (matchTime) {
        snippetParts.push(
          `Zambia time: ${matchTime}`
        );
      }

      const snippet =
        snippetParts.join(". ") + ".";

      addResult(results, new Set(), {
        id: eventId,
        title,
        snippet,
        link: getEventLink(event)
      });

      // Keep the football search reasonably sized.
      if (results.length >= 30) {
        break;
      }
    }

    console.log(
      "Unique football matches returned:",
      results.length
    );

    return results;
  } catch (error) {
    console.log(
      "Football scoreboard error:",
      error.message
    );

    return [];
  }
}

/* =========================================================
   GOOGLE NEWS RSS FALLBACK
   ========================================================= */

async function searchGoogleNews(query) {
  try {
    const url =
      `https://news.google.com/rss/search?q=${encodeURIComponent(
        buildSearchQuery(query)
      )}&hl=en&gl=US&ceid=US:en`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 Zed"
      }
    });

    if (!response.ok) {
      console.log(
        "Google News status:",
        response.status
      );
      return [];
    }

    const xml = await response.text();

    const results = [];
    const seen = new Set();

    const items =
      xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

    for (const item of items) {
      const titleMatch =
        item.match(
          /<title>([\s\S]*?)<\/title>/i
        );

      const linkMatch =
        item.match(
          /<link>([\s\S]*?)<\/link>/i
        );

      const descriptionMatch =
        item.match(
          /<description>([\s\S]*?)<\/description>/i
        );

      const title =
        cleanText(
          titleMatch?.[1] || ""
        );

      const link =
        cleanUrl(
          cleanText(
            linkMatch?.[1] || ""
          )
        );

      const snippet =
        cleanText(
          descriptionMatch?.[1] || ""
        );

      if (!title || !link) {
        continue;
      }

      addResult(results, seen, {
        title,
        snippet,
        link
      });

      if (results.length >= 20) {
        break;
      }
    }

    return results;
  } catch (error) {
    console.log(
      "Google News search error:",
      error.message
    );

    return [];
  }
}

/* =========================================================
   MAIN WEB SEARCH
   ========================================================= */

export async function webSearch(query = "") {
  const text = String(query || "").trim();

  if (!text) {
    return [];
  }

  console.log(
    "Web search requested:",
    text
  );

  const results = [];
  const seen = new Set();

  // =====================================================
  // 1. FOOTBALL SEARCH
  // =====================================================

  if (isFootballQuestion(text)) {
    const footballResults =
      await searchFootballScores(text);

    for (const result of footballResults) {
      addResult(results, seen, result);
    }

    // If football data was found, use it directly.
    // Do not keep searching the web and accidentally
    // add the same match again from another source.
    if (results.length > 0) {
      console.log(
        "Returning football results:",
        results.length
      );

      return results.slice(0, 30);
    }
  }

  // =====================================================
  // 2. DUCKDUCKGO HTML
  // =====================================================

  const duckResults =
    await searchDuckDuckGo(text);

  for (const result of duckResults) {
    addResult(results, seen, result);
  }

  // =====================================================
  // 3. DUCKDUCKGO LITE FALLBACK
  // =====================================================

  if (results.length === 0) {
    const liteResults =
      await searchDuckDuckGoLite(text);

    for (const result of liteResults) {
      addResult(results, seen, result);
    }
  }

  // =====================================================
  // 4. GOOGLE NEWS FALLBACK
  // =====================================================

  const currentWords = [
    "today",
    "tonight",
    "now",
    "current",
    "currently",
    "latest",
    "recent",
    "news",
    "live",
    "score",
    "scores",
    "result",
    "results"
  ];

  const isCurrentQuestion =
    currentWords.some((word) =>
      text.toLowerCase().includes(word)
    );

  if (
    results.length === 0 &&
    isCurrentQuestion
  ) {
    const newsResults =
      await searchGoogleNews(text);

    for (const result of newsResults) {
      addResult(results, seen, result);
    }
  }

  console.log(
    "Final unique web results:",
    results.length
  );

  return results.slice(0, 20);
}

/* =========================================================
   DECIDE WHETHER ZED SHOULD SEARCH THE WEB
   ========================================================= */

export function shouldSearchWeb(query = "") {
  const text =
    String(query || "")
      .toLowerCase()
      .trim();

  if (!text) {
    return false;
  }

  const searchTriggers = [
    // Current information
    "today",
    "tonight",
    "right now",
    "now",
    "currently",
    "current",
    "latest",
    "recent",
    "yesterday",
    "tomorrow",
    "this week",
    "this month",

    // News
    "news",
    "breaking news",
    "what happened",

    // Football / sports
    "football",
    "soccer",
    "football results",
    "football scores",
    "soccer results",
    "soccer scores",
    "match result",
    "match results",
    "live score",
    "live scores",
    "premier league",
    "champions league",
    "europa league",
    "conference league",
    "la liga",
    "bundesliga",
    "serie a",
    "ligue 1",
    "world cup",
    "afcon",
    "caf",

    // Internet / social platforms
    "youtube",
    "facebook",
    "tiktok",
    "instagram",
    "x.com",
    "twitter",
    "social media",
    "website",
    "online",

    // Business / current market information
    "price",
    "prices",
    "cost",
    "costs",
    "available",
    "availability",
    "buy",
    "selling",
    "business",
    "market",

    // Public/current information
    "president",
    "government",
    "election",
    "elections",
    "minister",
    "politics",
    "political",
    "law",
    "laws",
    "new law",
    "announcement"
  ];

  return searchTriggers.some(
    (trigger) =>
      text === trigger ||
      text.includes(trigger)
  );
}
