// web-search.js
function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function formatDateForZambia() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lusaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date()).replace(/-/g, "");
}
function isFootballQuestion(query = "") {
  const text = query.toLowerCase();
  const footballWords = [
    "football",
    "soccer",
    "match",
    "matches",
    "fixture",
    "fixtures",
    "score",
    "scores",
    "result",
    "results",
    "premier league",
    "epl",
    "champions league",
    "europa league",
    "conference league",
    "la liga",
    "serie a",
    "bundesliga",
    "ligue 1",
    "mls",
    "world cup",
    "nations league",
    "zambian super league",
    "super league",
    "arsenal",
    "chelsea",
    "liverpool",
    "manchester united",
    "manchester city",
    "barcelona",
    "real madrid",
    "bayern",
    "juventus",
    "inter milan",
    "ac milan",
    "psg",
    "tottenham",
    "newcastle",
    "dortmund",
    "finland",
    "belarus",
    "zambia"
  ];
  return footballWords.some(word =>
    text.includes(word)
  );
}
function isFootballScoreRequest(query = "") {
  const text = query.toLowerCase();
  const scoreWords = [
    "live score",
    "live scores",
    "score",
    "scores",
    "result",
    "results",
    "fixture",
    "fixtures",
    "schedule",
    "today's matches",
    "todays matches",
    "today matches",
    "matches today",
    "games today",
    "playing today",
    "who is playing",
    "who are playing",
    "upcoming match",
    "upcoming matches",
    "next match",
    "next matches",
    "kick off",
    "kickoff",
    "kick-off"
  ];
  return scoreWords.some(word =>
    text.includes(word)
  );
}
function isRecentInformationRequest(query = "") {
  const text = query.toLowerCase();
  const recentWords = [
    "latest",
    "current",
    "recent",
    "today",
    "today's",
    "todays",
    "now",
    "news",
    "update",
    "updates",
    "what happened",
    "happening",
    "this week"
  ];
  return recentWords.some(word =>
    text.includes(word)
  );
}
function findFootballEvents(value, found = []) {
  if (!value || typeof value !== "object") {
    return found;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      findFootballEvents(item, found);
    }
    return found;
  }
  if (
    value.id &&
    (
      Array.isArray(value.competitions) ||
      Array.isArray(value.competitors)
    )
  ) {
    found.push(value);
  }
  for (const key of Object.keys(value)) {
    findFootballEvents(value[key], found);
  }
  return found;
}
function extractFootballMatch(event) {
  try {
    const competition =
      Array.isArray(event.competitions)
        ? event.competitions[0]
        : event;
    if (!competition) {
      return null;
    }
    const competitors =
      competition.competitors ||
      event.competitors ||
      [];
    if (
      !Array.isArray(competitors) ||
      competitors.length < 2
    ) {
      return null;
    }
    const home =
      competitors.find(
        team => team.homeAway === "home"
      ) ||
      competitors[0];
    const away =
      competitors.find(
        team => team.homeAway === "away"
      ) ||
      competitors[1];
    if (!home || !away) {
      return null;
    }
    const homeName =
      home.team?.displayName ||
      home.team?.shortDisplayName ||
      home.name ||
      "Home";
    const awayName =
      away.team?.displayName ||
      away.team?.shortDisplayName ||
      away.name ||
      "Away";
    const homeScore =
      home.score !== undefined
        ? home.score
        : "0";
    const awayScore =
      away.score !== undefined
        ? away.score
        : "0";
    const status =
      competition.status ||
      event.status ||
      {};
    const statusType =
      status.type ||
      {};
    const detail =
      statusType.detail ||
      statusType.shortDetail ||
      statusType.description ||
      statusType.name ||
      "Scheduled";
    const state =
      statusType.state ||
      "";
    const completed =
      statusType.completed === true ||
      state === "post";
    const date =
      event.date ||
      competition.date ||
      competition.startDate ||
      "";
    const matchDate =
      date
        ? new Date(date)
        : null;
    const time =
      matchDate &&
      !Number.isNaN(matchDate.getTime())
        ? new Intl.DateTimeFormat("en-GB", {
            timeZone: "Africa/Lusaka",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          }).format(matchDate)
        : "";
    const eventLink =
      Array.isArray(event.links)
        ? event.links.find(link =>
            Array.isArray(link.rel) &&
            link.rel.includes("event")
          )?.href
        : null;
    return {
      id: String(event.id),
      home: cleanText(homeName),
      away: cleanText(awayName),
      score: `${homeScore}-${awayScore}`,
      status: cleanText(detail),
      state,
      completed,
      time,
      date,
      link: eventLink || ""
    };
  } catch (error) {
    console.error(
      "Football event parsing error:",
      error.message
    );
    return null;
  }
}
async function searchESPNFootball() {
  console.log(
    "================================="
  );
  console.log(
    "Zed football search: using ESPN all/scoreboard"
  );
  const url =
    "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard";
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Zed/1.0"
      },
      signal: AbortSignal.timeout(15000)
    });
    console.log(
      `ESPN all soccer status: ${response.status}`
    );
    if (!response.ok) {
      const errorText =
        await response.text();
      console.log(
        "ESPN error:",
        cleanText(errorText).slice(0, 500)
      );
      return [];
    }
    const data =
      await response.json();
    const events =
      Array.isArray(data.events)
        ? data.events
        : findFootballEvents(data);
    console.log(
      `ESPN soccer events found: ${events.length}`
    );
    if (events.length === 0) {
      console.log(
        "ESPN returned no football events."
      );
      return [];
    }
    const matches =
      events
        .map(extractFootballMatch)
        .filter(Boolean);
    const uniqueMatches = [];
    const seen = new Set();
    for (const match of matches) {
      if (seen.has(match.id)) {
        continue;
      }
      seen.add(match.id);
      uniqueMatches.push(match);
    }
    console.log(
      `Football matches extracted: ${uniqueMatches.length}`
    );
    return uniqueMatches;
  } catch (error) {
    console.error(
      "ESPN football search error:",
      error.message
    );
    return [];
  }
}
async function searchDuckDuckGo(query) {
  try {
    const url =
      "https://html.duckduckgo.com/html/?q=" +
      encodeURIComponent(query);
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
      },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      console.log(
        `DuckDuckGo status: ${response.status}`
      );
      return [];
    }
    const html =
      await response.text();
    const results = [];
    const resultPattern =
      /<div[^>]+class=["'][^"']*result[^"']*["'][^>]*>[\s\S]*?<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/div>/gi;
    let match;
    while (
      (match = resultPattern.exec(html)) !== null &&
      results.length < 10
    ) {
      let link = match[1];
      const title =
        cleanText(match[2]);
      if (!title || !link) {
        continue;
      }
      link = link.replace(
        /&amp;/g,
        "&"
      );
      results.push({
        title,
        url: link,
        snippet: "",
        publishedAt: null,
        source: "DuckDuckGo"
      });
    }
    if (results.length === 0) {
      const fallbackPattern =
        /<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
      while (
        (match = fallbackPattern.exec(html)) !== null &&
        results.length < 10
      ) {
        let link = match[1];
        const title =
          cleanText(match[2]);
        if (!title || !link) {
          continue;
        }
        link = link.replace(
          /&amp;/g,
          "&"
        );
        results.push({
          title,
          url: link,
          snippet: "",
          publishedAt: null,
          source: "DuckDuckGo"
        });
      }
    }
    console.log(
      `DuckDuckGo results: ${results.length}`
    );
    return results;
  } catch (error) {
    console.log(
      "DuckDuckGo search error:",
      error.message
    );
    return [];
  }
}
async function searchGoogleNews(query, recentOnly = false) {
  try {
    /*
     * For latest/current/news questions,
     * explicitly ask Google News for recent
     * results instead of relying only on the
     * normal search ranking.
     */
    const newsQuery =
      recentOnly
        ? `${query} when:7d`
        : query;
    const url =
      "https://news.google.com/rss/search?q=" +
      encodeURIComponent(newsQuery) +
      "&hl=en-US&gl=US&ceid=US:en";
    console.log(
      `Google News query: ${newsQuery}`
    );
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Zed/1.0"
      },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      console.log(
        `Google News status: ${response.status}`
      );
      return [];
    }
    const xml =
      await response.text();
    const results = [];
    const itemPattern =
      /<item>([\s\S]*?)<\/item>/gi;
    let item;
    while (
      (item = itemPattern.exec(xml)) !== null &&
      results.length < 15
    ) {
      const block = item[1];
      const titleMatch =
        block.match(
          /<title>([\s\S]*?)<\/title>/i
        );
      const linkMatch =
        block.match(
          /<link>([\s\S]*?)<\/link>/i
        );
      const descriptionMatch =
        block.match(
          /<description>([\s\S]*?)<\/description>/i
        );
      const pubDateMatch =
        block.match(
          /<pubDate>([\s\S]*?)<\/pubDate>/i
        );
      const sourceMatch =
        block.match(
          /<source[^>]*>([\s\S]*?)<\/source>/i
        );
      const title =
        cleanText(
          titleMatch
            ? titleMatch[1]
            : ""
        );
      const link =
        cleanText(
          linkMatch
            ? linkMatch[1]
            : ""
        );
      const snippet =
        cleanText(
          descriptionMatch
            ? descriptionMatch[1]
            : ""
        );
      const source =
        cleanText(
          sourceMatch
            ? sourceMatch[1]
            : ""
        );
      const publishedAtRaw =
        pubDateMatch
          ? cleanText(pubDateMatch[1])
          : "";
      const publishedAt =
        publishedAtRaw
          ? new Date(publishedAtRaw)
          : null;
      if (title && link) {
        results.push({
          title,
          url: link,
          snippet,
          publishedAt:
            publishedAt &&
            !Number.isNaN(
              publishedAt.getTime()
            )
              ? publishedAt.toISOString()
              : null,
          source:
            source || "Google News"
        });
      }
    }
    console.log(
      `Google News results: ${results.length}`
    );
    return results;
  } catch (error) {
    console.log(
      "Google News search error:",
      error.message
    );
    return [];
  }
}
function formatPublishedDate(dateValue) {
  if (!dateValue) {
    return "";
  }
  const date =
    new Date(dateValue);
  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: "Africa/Lusaka",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  ).format(date);
}
function formatFootballResults(matches) {
  if (
    !Array.isArray(matches) ||
    matches.length === 0
  ) {
    return "";
  }
  const today =
    formatDateForZambia();
  const lines = [
    "",
    "",
    "CURRENT FOOTBALL INFORMATION",
    `Date in Zambia: ${today}`,
    "Source: ESPN live soccer scoreboard",
    ""
  ];
  for (const match of matches) {
    let line =
      `${match.home} ${match.score} ${match.away}`;
    if (match.status) {
      line += ` — ${match.status}`;
    }
    if (
      match.time &&
      !match.completed
    ) {
      line +=
        ` — Zambia time ${match.time}`;
    }
    lines.push(line);
    if (match.link) {
      lines.push(
        `Match information: ${match.link}`
      );
    }
  }
  lines.push(
    "",
    "IMPORTANT: Use the football information above to answer the user's question.",
    "If a match is scheduled, do not describe it as finished.",
    "If a match is marked FT or Full Time, it is completed.",
    "Do not claim that you have no internet access when current football information is provided above."
  );
  return "\n" + lines.join("\n");
}
function formatWebResults(
  uniqueResults,
  recentRequest = false
) {
  if (
    !Array.isArray(uniqueResults) ||
    uniqueResults.length === 0
  ) {
    return "";
  }
  const lines = [
    "",
    "",
    "CURRENT WEB SEARCH RESULTS",
    `Search date in Zambia: ${formatDateForZambia()}`,
    "",
    recentRequest
      ? "This is a CURRENT/RECENT information request. Prefer the newest dated results."
      : "Results are ordered with the newest dated information first.",
    ""
  ];
  for (const result of uniqueResults) {
    lines.push(
      `Title: ${result.title}`,
      `URL: ${result.url}`
    );
    if (result.source) {
      lines.push(
        `Source: ${result.source}`
      );
    }
    if (result.publishedAt) {
      const formattedDate =
        formatPublishedDate(
          result.publishedAt
        );
      if (formattedDate) {
        lines.push(
          `Published: ${formattedDate} Zambia time`
        );
      }
    } else {
      lines.push(
        "Published: Date not available"
      );
    }
    if (result.snippet) {
      lines.push(
        `Summary: ${result.snippet}`
      );
    }
    lines.push("");
  }
  lines.push(
    "IMPORTANT:",
    "For latest/current/recent/news questions, prioritize the newest relevant dated results.",
    "Do not use an older article as proof of a current development when newer information is available.",
    "A publication date is the date the article was published, not necessarily the date the event happened.",
    "Distinguish confirmed information from reports, rumours, and speculation.",
    "If an article describes an older event, identify it as older information.",
    "If sources conflict, explain the conflict and identify the dates involved.",
    "Do not claim that you cannot access current information if useful search results are provided."
  );
  return "\n" + lines.join("\n");
}
function getTimestamp(value) {
  if (!value) {
    return 0;
  }
  const timestamp =
    new Date(value).getTime();
  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}
function isWithinDays(dateValue, days) {
  const timestamp =
    getTimestamp(dateValue);
  if (!timestamp) {
    return false;
  }
  const now =
    Date.now();
  const age =
    now - timestamp;
  const maxAge =
    days * 24 * 60 * 60 * 1000;
  /*
   * Do not reject future-dated feeds.
   */
  if (age < 0) {
    return true;
  }
  return age <= maxAge;
}
export async function webSearch(
  userQuery = ""
) {
  console.log(
    "================================="
  );
  console.log(
    "Zed web search:",
    userQuery
  );
  const football =
    isFootballQuestion(userQuery);
  const footballScoreRequest =
    football &&
    isFootballScoreRequest(userQuery);
  const recentRequest =
    isRecentInformationRequest(
      userQuery
    );
  /*
   * ESPN is used only for actual
   * football score / fixture / result
   * requests.
   */
  if (footballScoreRequest) {
    console.log(
      "Football score/fixture request detected."
    );
    const footballResults =
      await searchESPNFootball();
    if (footballResults.length > 0) {
      console.log(
        `Football scoreboard successful: ${footballResults.length} matches`
      );
      return formatFootballResults(
        footballResults
      );
    }
    console.log(
      "ESPN returned no matches. Continuing with general web search."
    );
  }
  /*
   * Google News is the priority source
   * for current/news questions.
   */
  const newsResults =
    await searchGoogleNews(
      userQuery,
      recentRequest
    );
  const allResults = [];
  /*
   * Put dated Google News results first.
   */
  allResults.push(
    ...newsResults
  );
  /*
   * DuckDuckGo is still useful for
   * general web information, but its
   * results normally have no reliable
   * publication date.
   */
  const searchQueries =
    recentRequest
      ? [
          `${userQuery} latest`,
          `${userQuery} today`
        ]
      : [
          userQuery,
          `${userQuery} latest`,
          `${userQuery} today`
        ];
  for (const query of searchQueries) {
    const results =
      await searchDuckDuckGo(query);
    allResults.push(
      ...results
    );
  }
  /*
   * Remove duplicate URLs.
   */
  const uniqueResults = [];
  const seenUrls = new Set();
  for (const result of allResults) {
    if (!result?.url) {
      continue;
    }
    const normalizedUrl =
      result.url.trim();
    if (!normalizedUrl) {
      continue;
    }
    if (
      seenUrls.has(normalizedUrl)
    ) {
      continue;
    }
    seenUrls.add(normalizedUrl);
    uniqueResults.push({
      ...result,
      url: normalizedUrl
    });
  }
  /*
   * Sort dated results newest first.
   * Undated DuckDuckGo results go after
   * dated results.
   */
  uniqueResults.sort(
    (a, b) => {
      const dateA =
        getTimestamp(a.publishedAt);
      const dateB =
        getTimestamp(b.publishedAt);
      if (
        dateA === 0 &&
        dateB === 0
      ) {
        return 0;
      }
      if (dateA === 0) {
        return 1;
      }
      if (dateB === 0) {
        return -1;
      }
      return dateB - dateA;
    }
  );
  /*
   * For current/news requests, prefer
   * recent dated articles.
   *
   * Keep a fallback set in case the
   * search engine returns fewer recent
   * articles than expected.
   */
  let finalResults;
  if (recentRequest) {
    const recentResults =
      uniqueResults.filter(
        result =>
          result.publishedAt &&
          isWithinDays(
            result.publishedAt,
            7
          )
      );
    const undatedResults =
      uniqueResults.filter(
        result =>
          !result.publishedAt
      );
    /*
     * Use recent dated articles first.
     * Only add undated results after them.
     */
    finalResults = [
      ...recentResults,
      ...undatedResults
    ].slice(0, 20);
    /*
     * If Google News/search providers
     * gave us no recent dated articles,
     * keep the original sorted results
     * rather than returning nothing.
     */
    if (recentResults.length === 0) {
      finalResults =
        uniqueResults.slice(0, 20);
    }
  } else {
    finalResults =
      uniqueResults.slice(0, 20);
  }
  console.log(
    `Final web results: ${finalResults.length}`
  );
  console.log(
    `Recent information request: ${recentRequest}`
  );
  if (
    finalResults.length === 0
  ) {
    return "";
  }
  return formatWebResults(
    finalResults,
    recentRequest
  );
}
export function shouldSearchWeb(
  userQuery = ""
) {
  const text =
    userQuery.toLowerCase();
  const webWords = [
    "today",
    "tonight",
    "now",
    "latest",
    "recent",
    "current",
    "news",
    "score",
    "scores",
    "result",
    "results",
    "football",
    "soccer",
    "match",
    "matches",
    "fixture",
    "fixtures",
    "weather",
    "price",
    "prices",
    "exchange rate",
    "youtube",
    "facebook",
    "tiktok",
    "instagram",
    "twitter",
    "x.com",
    "live",
    "who is",
    "what happened",
    "happening",
    "update",
    "updates"
  ];
  return webWords.some(
    word => text.includes(word)
  );
}
