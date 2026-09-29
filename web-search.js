// Zed Web Search
// Free web search + football results + news search

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanUrl(value = "") {
  let url = String(value || "").trim();

  if (url.startsWith("//")) {
    url = "https:" + url;
  }

  return url;
}

function addResult(results, title, link, snippet = "") {
  title = cleanText(title);
  link = cleanUrl(link);
  snippet = cleanText(snippet);

  if (!title || !link) return;

  if (
    link.includes("duckduckgo.com") ||
    link.includes("google.com/search") ||
    link.includes("bing.com/search")
  ) {
    return;
  }

  if (results.some(item => item.link === link)) {
    return;
  }

  results.push({
    title,
    link,
    snippet
  });
}

function isFootballQuestion(query) {
  const text = String(query || "").toLowerCase();

  const footballWords = [
    "football",
    "soccer",
    "score",
    "scores",
    "result",
    "results",
    "fixture",
    "fixtures",
    "match",
    "matches",
    "premier league",
    "champions league",
    "europa league",
    "conference league",
    "afcon",
    "world cup",
    "super league",
    "league table",
    "standings",
    "transfer",
    "transfers"
  ];

  return footballWords.some(word =>
    text.includes(word)
  );
}

function buildSearchQuery(query) {
  const text = cleanText(query);

  if (isFootballQuestion(text)) {
    return `${text} football results scores fixtures`;
  }

  return text;
}

/* ======================================================
   DUCKDUCKGO HTML SEARCH
====================================================== */

async function searchDuckDuckGo(query) {
  const results = [];

  const url =
    "https://html.duckduckgo.com/html/?q=" +
    encodeURIComponent(query);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language":
          "en-US,en;q=0.9"
      }
    });

    console.log(
      `[Zed Search] DuckDuckGo HTTP ${response.status}`
    );

    if (!response.ok) {
      return results;
    }

    const html = await response.text();

    console.log(
      `[Zed Search] DuckDuckGo page length: ${html.length}`
    );

    const regex =
      /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while ((match = regex.exec(html)) !== null) {
      addResult(
        results,
        match[2],
        match[1],
        ""
      );

      if (results.length >= 10) {
        break;
      }
    }

    console.log(
      `[Zed Search] DuckDuckGo results: ${results.length}`
    );

    return results;
  } catch (error) {
    console.log(
      "[Zed Search] DuckDuckGo error:",
      error.message
    );

    return results;
  }
}

/* ======================================================
   DUCKDUCKGO LITE SEARCH
====================================================== */

async function searchDuckDuckGoLite(query) {
  const results = [];

  const url =
    "https://lite.duckduckgo.com/lite/?q=" +
    encodeURIComponent(query);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language":
          "en-US,en;q=0.9"
      }
    });

    console.log(
      `[Zed Search] DuckDuckGo Lite HTTP ${response.status}`
    );

    if (!response.ok) {
      return results;
    }

    const html = await response.text();

    const regex =
      /<a[^>]+class="[^"]*result-link[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while ((match = regex.exec(html)) !== null) {
      addResult(
        results,
        match[2],
        match[1],
        ""
      );

      if (results.length >= 10) {
        break;
      }
    }

    console.log(
      `[Zed Search] DuckDuckGo Lite results: ${results.length}`
    );

    return results;
  } catch (error) {
    console.log(
      "[Zed Search] DuckDuckGo Lite error:",
      error.message
    );

    return results;
  }
}

/* ======================================================
   FOOTBALL SCORE SEARCH
====================================================== */

async function searchFootballScores(query) {
  const results = [];

  if (!isFootballQuestion(query)) {
    return results;
  }

  try {
    const now = new Date();

    const year = now.getUTCFullYear();
    const month = String(
      now.getUTCMonth() + 1
    ).padStart(2, "0");
    const day = String(
      now.getUTCDate()
    ).padStart(2, "0");

    const date =
      `${year}${month}${day}`;

    const url =
      "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=" +
      date;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "Zed/1.0"
      }
    });

    console.log(
      `[Zed Football] ESPN HTTP ${response.status}`
    );

    if (!response.ok) {
      return results;
    }

    const data = await response.json();

    const events =
      Array.isArray(data.events)
        ? data.events
        : [];

    console.log(
      `[Zed Football] Events found: ${events.length}`
    );

    for (const event of events) {
      const competition =
        event.competitions?.[0];

      if (!competition) {
        continue;
      }

      const competitors =
        Array.isArray(
          competition.competitors
        )
          ? competition.competitors
          : [];

      const home =
        competitors.find(
          team =>
            team.homeAway === "home"
        );

      const away =
        competitors.find(
          team =>
            team.homeAway === "away"
        );

      if (!home || !away) {
        continue;
      }

      const homeName =
        home.team?.displayName ||
        home.team?.name ||
        "Home";

      const awayName =
        away.team?.displayName ||
        away.team?.name ||
        "Away";

      const homeScore =
        home.score ?? "-";

      const awayScore =
        away.score ?? "-";

      const statusType =
        event.status?.type;

      let status =
        statusType?.shortDetail ||
        statusType?.detail ||
        "Scheduled";

      const state =
        statusType?.state ||
        "";

      if (state === "post") {
        status = "Finished";
      } else if (state === "in") {
        status = "LIVE";
      } else if (state === "pre") {
        status = "Scheduled";
      }

      const league =
        event.league?.name ||
        event.leagues?.[0]?.name ||
        "Football";

      const eventTime =
        event.date
          ? new Date(event.date).toISOString()
          : "";

      const title =
        `${homeName} ${homeScore} - ${awayScore} ${awayName}`;

      const snippet =
        `Status: ${status}. ` +
        `Competition: ${league}. ` +
        `Match time: ${eventTime}.`;

      addResult(
        results,
        title,
        "https://www.espn.com/soccer/",
        snippet
      );

      if (results.length >= 20) {
        break;
      }
    }

    return results;
  } catch (error) {
    console.log(
      "[Zed Football] Error:",
      error.message
    );

    return results;
  }
}

/* ======================================================
   GOOGLE NEWS RSS
====================================================== */

async function searchGoogleNews(query) {
  const results = [];

  const url =
    "https://news.google.com/rss/search?q=" +
    encodeURIComponent(query) +
    "&hl=en-US&gl=US&ceid=US:en";

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0"
      }
    });

    console.log(
      `[Zed News] Google News HTTP ${response.status}`
    );

    if (!response.ok) {
      return results;
    }

    const xml =
      await response.text();

    const items =
      xml.match(
        /<item>[\s\S]*?<\/item>/gi
      ) || [];

    for (const item of items) {
      const titleMatch =
        item.match(
          /<title><!\[CDATA\[(.*?)\]\]><\/title>/i
        ) ||
        item.match(
          /<title>(.*?)<\/title>/i
        );

      const linkMatch =
        item.match(
          /<link>(.*?)<\/link>/i
        );

      const descriptionMatch =
        item.match(
          /<description><!\[CDATA\[(.*?)\]\]><\/description>/i
        ) ||
        item.match(
          /<description>(.*?)<\/description>/i
        );

      if (!titleMatch || !linkMatch) {
        continue;
      }

      addResult(
        results,
        titleMatch[1],
        linkMatch[1],
        descriptionMatch
          ? descriptionMatch[1]
          : ""
      );

      if (results.length >= 10) {
        break;
      }
    }

    console.log(
      `[Zed News] Results: ${results.length}`
    );

    return results;
  } catch (error) {
    console.log(
      "[Zed News] Error:",
      error.message
    );

    return results;
  }
}

/* ======================================================
   MAIN WEB SEARCH
====================================================== */

export async function webSearch(query) {
  const cleanQuery =
    cleanText(query);

  if (!cleanQuery) {
    return {
      ok: false,
      query: "",
      results: []
    };
  }

  console.log(
    `[Zed Search] Query: ${cleanQuery}`
  );

  const searchQuery =
    buildSearchQuery(cleanQuery);

  let results = [];

  /*
    Football questions use the dedicated
    football source first.
  */
  if (isFootballQuestion(cleanQuery)) {
    const footballResults =
      await searchFootballScores(
        cleanQuery
      );

    results.push(
      ...footballResults
    );
  }

  /*
    General web search.
  */
  if (results.length === 0) {
    const duckResults =
      await searchDuckDuckGo(
        searchQuery
      );

    results.push(
      ...duckResults
    );
  }

  /*
    Second free search route.
  */
  if (results.length === 0) {
    const liteResults =
      await searchDuckDuckGoLite(
        searchQuery
      );

    results.push(
      ...liteResults
    );
  }

  /*
    News fallback.
  */
  if (
    results.length === 0 &&
    /news|latest|today|current|update|recent|happening/i.test(
      cleanQuery
    )
  ) {
    const newsResults =
      await searchGoogleNews(
        cleanQuery
      );

    results.push(
      ...newsResults
    );
  }

  const uniqueResults = [];

  for (const result of results) {
    if (
      !uniqueResults.some(
        item =>
          item.link === result.link &&
          item.title === result.title
      )
    ) {
      uniqueResults.push(result);
    }
  }

  const finalResults =
    uniqueResults.slice(0, 20);

  console.log(
    `[Zed Search] FINAL RESULTS: ${finalResults.length}`
  );

  return {
    ok:
      finalResults.length > 0,
    query: cleanQuery,
    results: finalResults
  };
}

/* ======================================================
   WHEN SHOULD ZED SEARCH?
====================================================== */

export function shouldSearchWeb(message) {
  const text =
    String(message || "")
      .toLowerCase()
      .trim();

  if (!text) {
    return false;
  }

  const triggers = [
    // Current information
    "latest",
    "today",
    "tonight",
    "tomorrow",
    "yesterday",
    "current",
    "currently",
    "right now",
    "now",
    "news",
    "update",
    "updates",
    "recent",
    "recently",
    "this week",
    "this month",
    "this year",
    "what happened",
    "what's happening",
    "whats happening",

    // Football
    "football",
    "soccer",
    "score",
    "scores",
    "result",
    "results",
    "fixture",
    "fixtures",
    "match",
    "matches",
    "premier league",
    "champions league",
    "europa league",
    "conference league",
    "afcon",
    "world cup",
    "super league",
    "league table",
    "standings",
    "transfer",
    "transfers",

    // Internet
    "youtube",
    "facebook",
    "tiktok",
    "instagram",
    "website",
    "web",
    "internet",
    "online",
    "search",
    "look up",
    "find online",

    // Current business information
    "price",
    "prices",
    "cost",
    "costs",
    "exchange rate",
    "currency",
    "weather",
    "restaurant",
    "hotel",
    "shop",
    "store",
    "business",
    "near me",
    "nearby",

    // Public/current information
    "president",
    "minister",
    "government",
    "company",
    "ceo",
    "elon musk",
    "donald trump"
  ];

  return triggers.some(
    word => text.includes(word)
  );
}
