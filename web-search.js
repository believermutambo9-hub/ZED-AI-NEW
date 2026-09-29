// web-search.js

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanUrl(value = "") {
  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function addResult(results, seen, item) {
  const title = cleanText(item.title);
  const snippet = cleanText(item.snippet);
  const link = cleanUrl(item.link);

  if (!title) {
    return;
  }

  const id = item.id
    ? String(item.id)
    : `${title.toLowerCase()}|${link}`.slice(0, 1000);

  if (seen.has(id)) {
    return;
  }

  seen.add(id);

  results.push({
    id,
    title,
    snippet,
    link
  });
}

/* =========================================================
   FOOTBALL DETECTION
   ========================================================= */

function isFootballQuestion(query = "") {
  const text = query.toLowerCase();

  const footballWords = [
    "football",
    "soccer",
    "football results",
    "football scores",
    "soccer results",
    "soccer scores",
    "football matches",
    "soccer matches",
    "match result",
    "match results",
    "match score",
    "match scores",
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
    "fa cup",
    "carabao cup",
    "world cup",
    "afcon",
    "caf",
    "mtn super league",
    "chipolopolo",
    "zambia national team"
  ];

  return footballWords.some((word) =>
    text.includes(word)
  );
}

/* =========================================================
   DATE
   ========================================================= */

function getZambiaDate() {
  const now = new Date();

  const zambia = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Africa/Lusaka"
    })
  );

  const year = zambia.getFullYear();
  const month = String(
    zambia.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    zambia.getDate()
  ).padStart(2, "0");

  return {
    display: `${year}-${month}-${day}`,
    api: `${year}${month}${day}`
  };
}

/* =========================================================
   FOOTBALL LEAGUES
   ========================================================= */

const FOOTBALL_LEAGUES = [
  {
    id: "eng.1",
    name: "English Premier League"
  },
  {
    id: "esp.1",
    name: "La Liga"
  },
  {
    id: "ita.1",
    name: "Serie A"
  },
  {
    id: "ger.1",
    name: "Bundesliga"
  },
  {
    id: "fra.1",
    name: "Ligue 1"
  },
  {
    id: "usa.1",
    name: "MLS"
  },
  {
    id: "uefa.champions",
    name: "UEFA Champions League"
  },
  {
    id: "uefa.europa",
    name: "UEFA Europa League"
  },
  {
    id: "uefa.europa.conf",
    name: "UEFA Conference League"
  },
  {
    id: "fifa.world",
    name: "FIFA World Cup"
  }
];

/* =========================================================
   MATCH STATUS
   ========================================================= */

function getMatchState(status = {}) {
  const state = String(
    status.state || ""
  ).toLowerCase();

  if (state === "in") {
    return "LIVE";
  }

  if (state === "post") {
    return "Finished";
  }

  return "Scheduled";
}

function getMatchStatus(status = {}) {
  const state = String(
    status.state || ""
  ).toLowerCase();

  if (state === "in") {
    return (
      cleanText(status.detail) ||
      cleanText(status.shortDetail) ||
      "LIVE"
    );
  }

  if (state === "post") {
    return (
      cleanText(status.detail) ||
      cleanText(status.shortDetail) ||
      "Finished"
    );
  }

  return (
    cleanText(status.detail) ||
    cleanText(status.shortDetail) ||
    "Scheduled"
  );
}

/* =========================================================
   TEAM INFORMATION
   ========================================================= */

function getTeamName(team = {}) {
  return cleanText(
    team.team?.displayName ||
    team.team?.shortDisplayName ||
    team.team?.name ||
    team.name ||
    "Unknown"
  );
}

function getTeamScore(team = {}) {
  if (
    team.score === undefined ||
    team.score === null ||
    team.score === ""
  ) {
    return null;
  }

  return String(team.score);
}

/* =========================================================
   TIME
   ========================================================= */

function getMatchTime(event = {}) {
  if (!event.date) {
    return "";
  }

  try {
    return new Date(
      event.date
    ).toLocaleString("en-ZM", {
      timeZone: "Africa/Lusaka",
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return cleanText(event.date);
  }
}

/* =========================================================
   MATCH LINK
   ========================================================= */

function getMatchLink(event = {}) {
  if (
    Array.isArray(event.links)
  ) {
    for (const link of event.links) {
      const href = cleanUrl(link?.href);

      if (href) {
        return href;
      }
    }
  }

  if (event.id) {
    return (
      "https://www.espn.com/soccer/match/_/gameId/" +
      event.id
    );
  }

  return "https://www.espn.com/soccer/";
}

/* =========================================================
   CHECK TEAM QUERY
   ========================================================= */

function eventMatchesQuery(event, query = "") {
  const text =
    query.toLowerCase().trim();

  /*
   * For broad questions like:
   * "today's football results"
   * show all available football matches.
   */

  if (
    text.includes("football") ||
    text.includes("soccer") ||
    text.includes("results") ||
    text.includes("scores") ||
    text.includes("matches")
  ) {
    return true;
  }

  const competitors =
    event.competitions?.[0]?.competitors || [];

  for (const competitor of competitors) {
    const name =
      getTeamName(competitor)
        .toLowerCase();

    if (
      name &&
      text.includes(name)
    ) {
      return true;
    }
  }

  return false;
}

/* =========================================================
   FETCH ONE FOOTBALL LEAGUE
   ========================================================= */

async function fetchFootballLeague(
  league,
  date
) {
  try {
    const url =
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.id}/scoreboard?dates=${date}`;

    console.log(
      "Checking football:",
      league.name
    );

    const response = await fetch(url, {
      headers: {
        /*
         * Do NOT pretend to be a browser.
         * ESPN's endpoint can reject browser-style requests.
         */
        "User-Agent": "Zed/1.0",
        "Accept": "application/json"
      }
    });

    console.log(
      league.name,
      "status:",
      response.status
    );

    if (!response.ok) {
      return [];
    }

    const data =
      await response.json();

    if (
      !data ||
      !Array.isArray(data.events)
    ) {
      return [];
    }

    return data.events;
  } catch (error) {
    console.log(
      "Football league error:",
      league.name,
      error.message
    );

    return [];
  }
}

/* =========================================================
   SEARCH FOOTBALL
   ========================================================= */

async function searchFootballScores(
  query = ""
) {
  const date =
    getZambiaDate();

  console.log(
    "Football date:",
    date.display
  );

  const allEvents = [];

  /*
   * Check the leagues separately.
   *
   * This is important because ESPN's soccer
   * endpoint is league-specific.
   */

  for (const league of FOOTBALL_LEAGUES) {
    const events =
      await fetchFootballLeague(
        league,
        date.api
      );

    for (const event of events) {
      allEvents.push({
        event,
        league
      });
    }
  }

  console.log(
    "Football events collected:",
    allEvents.length
  );

  const results = [];

  /*
   * TWO duplicate protections:
   *
   * 1. ESPN event ID
   * 2. Team/date combination
   */

  const seenEventIds =
    new Set();

  const seenMatches =
    new Set();

  for (const item of allEvents) {
    const event =
      item.event;

    const league =
      item.league;

    if (!event?.id) {
      continue;
    }

    const eventId =
      String(event.id);

    /*
     * Never show the same ESPN event twice.
     */

    if (
      seenEventIds.has(eventId)
    ) {
      continue;
    }

    seenEventIds.add(eventId);

    /*
     * If the user asked for a specific team,
     * filter the result.
     */

    if (
      !eventMatchesQuery(
        event,
        query
      )
    ) {
      continue;
    }

    const competition =
      event.competitions?.[0];

    const competitors =
      competition?.competitors || [];

    if (
      competitors.length < 2
    ) {
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

    const homeName =
      getTeamName(home);

    const awayName =
      getTeamName(away);

    if (
      homeName === "Unknown" ||
      awayName === "Unknown"
    ) {
      continue;
    }

    /*
     * Extra duplicate protection.
     */

    const matchKey =
      [
        homeName.toLowerCase(),
        awayName.toLowerCase(),
        event.date
          ? String(event.date).slice(0, 10)
          : ""
      ].join("|");

    if (
      seenMatches.has(matchKey)
    ) {
      continue;
    }

    seenMatches.add(matchKey);

    const homeScore =
      getTeamScore(home);

    const awayScore =
      getTeamScore(away);

    const status =
      event.status?.type || {};

    const state =
      getMatchState(status);

    const statusText =
      getMatchStatus(status);

    const matchTime =
      getMatchTime(event);

    let score;

    if (
      homeScore !== null &&
      awayScore !== null
    ) {
      score =
        `${homeName} ${homeScore} - ${awayScore} ${awayName}`;
    } else {
      score =
        `${homeName} vs ${awayName}`;
    }

    const title =
      `${score} — ${state}`;

    const snippet =
      [
        `Status: ${statusText}`,
        `Competition: ${league.name}`,
        matchTime
          ? `Zambia time: ${matchTime}`
          : ""
      ]
        .filter(Boolean)
        .join(". ") + ".";

    addResult(
      results,
      new Set(),
      {
        id: eventId,
        title,
        snippet,
        link: getMatchLink(event)
      }
    );
  }

  /*
   * Sort:
   * LIVE first
   * Finished second
   * Scheduled last
   */

  results.sort((a, b) => {
    const getPriority = (title) => {
      if (title.includes("LIVE")) {
        return 1;
      }

      if (title.includes("Finished")) {
        return 2;
      }

      return 3;
    };

    return (
      getPriority(a.title) -
      getPriority(b.title)
    );
  });

  console.log(
    "Unique football matches:",
    results.length
  );

  return results;
}

/* =========================================================
   DUCKDUCKGO HTML SEARCH
   ========================================================= */

async function searchDuckDuckGo(
  query
) {
  try {
    const url =
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
        query
      )}`;

    const response =
      await fetch(url, {
        headers: {
          "User-Agent":
            "Zed/1.0",
          "Accept":
            "text/html"
        }
      });

    if (!response.ok) {
      console.log(
        "DuckDuckGo status:",
        response.status
      );

      return [];
    }

    const html =
      await response.text();

    const results = [];
    const seen = new Set();

    /*
     * Find result links.
     */

    const regex =
      /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while (
      (match = regex.exec(html)) !== null
    ) {
      let link =
        match[1];

      try {
        link =
          decodeURIComponent(link);
      } catch {
        // Keep original.
      }

      const title =
        cleanText(match[2]);

      if (
        !title ||
        !link
      ) {
        continue;
      }

      /*
       * Try to extract a nearby snippet.
       */

      const after =
        html.slice(
          match.index,
          match.index + 5000
        );

      const snippetMatch =
        after.match(
          /class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div)>/i
        );

      const snippet =
        cleanText(
          snippetMatch?.[1] || ""
        );

      addResult(
        results,
        seen,
        {
          title,
          snippet,
          link
        }
      );

      if (
        results.length >= 20
      ) {
        break;
      }
    }

    console.log(
      "DuckDuckGo results:",
      results.length
    );

    return results;
  } catch (error) {
    console.log(
      "DuckDuckGo error:",
      error.message
    );

    return [];
  }
}

/* =========================================================
   DUCKDUCKGO LITE FALLBACK
   ========================================================= */

async function searchDuckDuckGoLite(
  query
) {
  try {
    const url =
      `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(
        query
      )}`;

    const response =
      await fetch(url, {
        headers: {
          "User-Agent":
            "Zed/1.0",
          "Accept":
            "text/html"
        }
      });

    if (!response.ok) {
      return [];
    }

    const html =
      await response.text();

    const results = [];
    const seen = new Set();

    const regex =
      /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while (
      (match = regex.exec(html)) !== null
    ) {
      const link =
        cleanUrl(match[1]);

      const title =
        cleanText(match[2]);

      if (
        !link ||
        !title
      ) {
        continue;
      }

      if (
        link.includes(
          "duckduckgo.com"
        )
      ) {
        continue;
      }

      addResult(
        results,
        seen,
        {
          title,
          snippet: "",
          link
        }
      );

      if (
        results.length >= 20
      ) {
        break;
      }
    }

    return results;
  } catch (error) {
    console.log(
      "DuckDuckGo Lite error:",
      error.message
    );

    return [];
  }
}

/* =========================================================
   GOOGLE NEWS RSS
   ========================================================= */

async function searchGoogleNews(
  query
) {
  try {
    const url =
      `https://news.google.com/rss/search?q=${encodeURIComponent(
        query
      )}&hl=en&gl=US&ceid=US:en`;

    const response =
      await fetch(url, {
        headers: {
          "User-Agent":
            "Zed/1.0",
          "Accept":
            "application/rss+xml, application/xml, text/xml"
        }
      });

    if (!response.ok) {
      return [];
    }

    const xml =
      await response.text();

    const results = [];
    const seen = new Set();

    const items =
      xml.match(
        /<item>[\s\S]*?<\/item>/gi
      ) || [];

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

      if (
        !title ||
        !link
      ) {
        continue;
      }

      addResult(
        results,
        seen,
        {
          title,
          snippet,
          link
        }
      );

      if (
        results.length >= 20
      ) {
        break;
      }
    }

    return results;
  } catch (error) {
    console.log(
      "Google News error:",
      error.message
    );

    return [];
  }
}

/* =========================================================
   MAIN WEB SEARCH
   ========================================================= */

export async function webSearch(
  query = ""
) {
  const text =
    String(query || "").trim();

  if (!text) {
    return [];
  }

  console.log(
    "================================="
  );

  console.log(
    "Zed web search:",
    text
  );

  console.log(
    "================================="
  );

  /*
   * FOOTBALL
   */

  if (
    isFootballQuestion(text)
  ) {
    const footballResults =
      await searchFootballScores(
        text
      );

    if (
      footballResults.length > 0
    ) {
      console.log(
        "Football search successful:",
        footballResults.length
      );

      return footballResults.slice(
        0,
        30
      );
    }

    console.log(
      "Football API returned no matches."
    );
  }

  /*
   * NORMAL WEB SEARCH
   */

  let results =
    await searchDuckDuckGo(
      text
    );

  if (
    results.length === 0
  ) {
    results =
      await searchDuckDuckGoLite(
        text
      );
  }

  /*
   * NEWS FALLBACK
   */

  if (
    results.length === 0
  ) {
    results =
      await searchGoogleNews(
        text
      );
  }

  console.log(
    "Final web results:",
    results.length
  );

  return results.slice(
    0,
    20
  );
}

/* =========================================================
   SHOULD ZED SEARCH THE WEB?
   ========================================================= */

export function shouldSearchWeb(
  query = ""
) {
  const text =
    String(query || "")
      .toLowerCase()
      .trim();

  if (!text) {
    return false;
  }

  const triggers = [
    /*
     * Current information
     */
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

    /*
     * News
     */
    "news",
    "breaking news",
    "what happened",

    /*
     * Football
     */
    "football",
    "soccer",
    "football results",
    "football scores",
    "soccer results",
    "soccer scores",
    "football matches",
    "soccer matches",
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
    "fa cup",
    "carabao cup",
    "world cup",
    "afcon",
    "caf",
    "mtn super league",
    "chipolopolo",

    /*
     * Social / internet
     */
    "youtube",
    "facebook",
    "tiktok",
    "instagram",
    "twitter",
    "x.com",
    "social media",
    "website",
    "online",

    /*
     * Business / shopping
     */
    "price",
    "prices",
    "cost",
    "costs",
    "available",
    "availability",
    "buy",
    "selling",
    "market",

    /*
     * Public/current affairs
     */
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

  return triggers.some(
    (trigger) =>
      text === trigger ||
      text.includes(trigger)
  );
}
