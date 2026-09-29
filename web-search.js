// Zed web search
// Free search with multiple fallbacks.
// No paid API key required.

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
  let url = String(value).trim();

  if (!url) return "";

  if (url.startsWith("//")) {
    url = "https:" + url;
  }

  return url;
}

function buildSearchQuery(query) {
  const text = cleanText(query);

  const lower = text.toLowerCase();

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

  const isFootball = footballWords.some(word =>
    lower.includes(word)
  );

  if (isFootball) {
    return `${text} football results scores fixtures today`;
  }

  return text;
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

  const alreadyExists = results.some(
    item => item.link === link
  );

  if (alreadyExists) return;

  results.push({
    title,
    link,
    snippet
  });
}

/* -------------------------------------------------------
   DuckDuckGo HTML
------------------------------------------------------- */

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
      `[Zed Search] DuckDuckGo status: ${response.status}`
    );

    if (!response.ok) {
      return results;
    }

    const html = await response.text();

    console.log(
      `[Zed Search] DuckDuckGo response length: ${html.length}`
    );

    // Normal DuckDuckGo result blocks.
    const resultBlocks = html.match(
      /<div[^>]+class="[^"]*result[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi
    ) || [];

    for (const block of resultBlocks) {
      const titleMatch =
        block.match(
          /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i
        ) ||
        block.match(
          /<a[^>]+href="([^"]+)"[^>]*class="[^"]*result__a[^"]*"[^>]*>([\s\S]*?)<\/a>/i
        );

      if (!titleMatch) continue;

      const link = titleMatch[1];
      const title = titleMatch[2];

      const snippetMatch =
        block.match(
          /class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div)/i
        );

      const snippet =
        snippetMatch ? snippetMatch[1] : "";

      addResult(
        results,
        title,
        link,
        snippet
      );

      if (results.length >= 8) break;
    }

    // Fallback: find result__a anchors directly.
    if (results.length === 0) {
      const anchorRegex =
        /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

      let match;

      while (
        (match = anchorRegex.exec(html)) !== null
      ) {
        addResult(
          results,
          match[2],
          match[1],
          ""
        );

        if (results.length >= 8) break;
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

/* -------------------------------------------------------
   DuckDuckGo Lite
------------------------------------------------------- */

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
      `[Zed Search] DuckDuckGo Lite status: ${response.status}`
    );

    if (!response.ok) {
      return results;
    }

    const html = await response.text();

    console.log(
      `[Zed Search] DuckDuckGo Lite response length: ${html.length}`
    );

    /*
      DuckDuckGo Lite normally uses:

      <a rel="nofollow" class="result-link" href="...">
        Title
      </a>
    */

    const regex =
      /<a[^>]+class="[^"]*result-link[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while (
      (match = regex.exec(html)) !== null
    ) {
      addResult(
        results,
        match[2],
        match[1],
        ""
      );

      if (results.length >= 8) break;
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

/* -------------------------------------------------------
   ESPN Football / Soccer
   Free public scoreboard endpoint.
------------------------------------------------------- */

async function searchFootballScores(query) {
  const results = [];

  const lower = query.toLowerCase();

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
    "standings"
  ];

  const isFootball = footballWords.some(word =>
    lower.includes(word)
  );

  if (!isFootball) {
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

    const date = `${year}${month}${day}`;

    const url =
      "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=" +
      date;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0"
      }
    });

    console.log(
      `[Zed Search] ESPN status: ${response.status}`
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
      `[Zed Search] ESPN football events: ${events.length}`
    );

    for (const event of events) {
      const competition =
        event.competitions?.[0];

      if (!competition) continue;

      const competitors =
        Array.isArray(
          competition.competitors
        )
          ? competition.competitors
          : [];

      const home =
        competitors.find(
          team => team.homeAway === "home"
        );

      const away =
        competitors.find(
          team => team.homeAway === "away"
        );

      const homeName =
        home?.team?.displayName ||
        home?.team?.name ||
        "Home";

      const awayName =
        away?.team?.displayName ||
        away?.team?.name ||
        "Away";

      const homeScore =
        home?.score ?? "-";

      const awayScore =
        away?.score ?? "-";

      const status =
        event.status?.type?.shortDetail ||
        event.status?.type?.detail ||
        "Scheduled";

      const league =
        event.leagues?.[0]?.name ||
        event.league?.name ||
        "Football";

      const title =
        `${homeName} ${homeScore} - ${awayScore} ${awayName}`;

      const snippet =
        `${league} — ${status}. ` +
        `Football match information for ${date}.`;

      addResult(
        results,
        title,
        `https://www.espn.com/soccer/`,
        snippet
      );

      /*
        We use the ESPN page as the source link.
        The actual score is placed in the title/snippet
        so Zed can answer the user directly.
      */

      if (results.length >= 15) {
        break;
      }
    }

    return results;
  } catch (error) {
    console.log(
      "[Zed Search] ESPN football error:",
      error.message
    );

    return results;
  }
}

/* -------------------------------------------------------
   Google News RSS
   Useful for current news and updates.
------------------------------------------------------- */

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
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
      }
    });

    console.log(
      `[Zed Search] Google News status: ${response.status}`
    );

    if (!response.ok) {
      return results;
    }

    const xml = await response.text();

    console.log(
      `[Zed Search] Google News response length: ${xml.length}`
    );

    const items =
      xml.match(/<item>[\s\S]*?<\/item>/gi) || [];

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

      if (results.length >= 8) {
        break;
      }
    }

    console.log(
      `[Zed Search] Google News results: ${results.length}`
    );

    return results;
  } catch (error) {
    console.log(
      "[Zed Search] Google News error:",
      error.message
    );

    return results;
  }
}

/* -------------------------------------------------------
   Main search function
------------------------------------------------------- */

export async function webSearch(query) {
  const cleanQuery = cleanText(query);

  if (!cleanQuery) {
    return {
      ok: false,
      query: "",
      results: []
    };
  }

  const searchQuery =
    buildSearchQuery(cleanQuery);

  console.log(
    `[Zed Search] Searching for: ${searchQuery}`
  );

  let results = [];

  /*
    Football gets the dedicated sports source first.
  */
  const footballResults =
    await searchFootballScores(
      cleanQuery
    );

  results.push(
    ...footballResults
  );

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
    News fallback for current/news questions.
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

  /*
    Remove duplicates.
  */
  const uniqueResults = [];

  for (const result of results) {
    if (
      !uniqueResults.some(
        item => item.link === result.link
      )
    ) {
      uniqueResults.push(result);
    }
  }

  const finalResults =
    uniqueResults.slice(0, 15);

  console.log(
    `[Zed Search] FINAL RESULTS: ${finalResults.length}`
  );

  return {
    ok: finalResults.length > 0,
    query: cleanQuery,
    results: finalResults
  };
}

/* -------------------------------------------------------
   Decide whether Zed should search the web.
------------------------------------------------------- */

export function shouldSearchWeb(message) {
  const text =
    String(message || "")
      .toLowerCase()
      .trim();

  if (!text) {
    return false;
  }

  const currentInformationWords = [
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
    "happening today"
  ];

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

  const internetWords = [
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
    "find online"
  ];

  const businessWords = [
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
    "nearby"
  ];

  const publicFigureWords = [
    "president",
    "minister",
    "government",
    "company",
    "ceo",
    "elon musk",
    "donald trump"
  ];

  const allTriggers = [
    ...currentInformationWords,
    ...footballWords,
    ...internetWords,
    ...businessWords,
    ...publicFigureWords
  ];

  return allTriggers.some(
    word => text.includes(word)
  );
}
