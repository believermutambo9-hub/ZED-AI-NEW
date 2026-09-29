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
  }).format(new Date());
}

function isFootballQuestion(message = "") {
  const text = String(message).toLowerCase();

  const footballWords = [
    "football",
    "soccer",
    "match",
    "matches",
    "fixture",
    "fixtures",
    "result",
    "results",
    "score",
    "scores",
    "premier league",
    "champions league",
    "europa league",
    "conference league",
    "la liga",
    "serie a",
    "bundesliga",
    "ligue 1",
    "mls",
    "world cup",
    "arsenal",
    "chelsea",
    "liverpool",
    "manchester united",
    "manchester city",
    "barcelona",
    "real madrid",
    "juventus",
    "bayern",
    "psg"
  ];

  return footballWords.some(word => text.includes(word));
}

function shouldSearchWeb(message = "") {
  const text = String(message).toLowerCase();

  const currentWords = [
    "today",
    "today's",
    "todays",
    "tonight",
    "now",
    "latest",
    "current",
    "currently",
    "live",
    "recent",
    "yesterday",
    "tomorrow",
    "this week",
    "this weekend",
    "news",
    "result",
    "results",
    "score",
    "scores",
    "fixture",
    "fixtures",
    "weather",
    "price",
    "prices",
    "exchange rate",
    "who won",
    "what happened"
  ];

  if (isFootballQuestion(text)) {
    return true;
  }

  return currentWords.some(word => text.includes(word));
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 Zed-AI"
      }
    });

    const text = await response.text();

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: null
      };
    }

    try {
      return {
        ok: true,
        status: response.status,
        data: JSON.parse(text)
      };
    } catch {
      return {
        ok: true,
        status: response.status,
        data: null
      };
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error.message
    };
  }
}

function getTeamName(team = {}) {
  return (
    team.displayName ||
    team.shortDisplayName ||
    team.name ||
    team.abbreviation ||
    team.shortName ||
    "Unknown team"
  );
}

function getScore(competitor = {}) {
  if (competitor.score !== undefined && competitor.score !== null) {
    return String(competitor.score);
  }

  if (competitor.score?.displayValue) {
    return String(competitor.score.displayValue);
  }

  return "-";
}

function getMatchStatus(event = {}) {
  const status = event.status || {};
  const type = status.type || {};

  if (type.completed === true) {
    return "Finished";
  }

  if (
    type.state === "in" ||
    type.name === "STATUS_IN_PROGRESS" ||
    type.shortDetail === "LIVE"
  ) {
    return "LIVE";
  }

  if (
    type.state === "post" ||
    type.name === "STATUS_FINAL"
  ) {
    return "Finished";
  }

  return (
    type.shortDetail ||
    type.detail ||
    type.description ||
    "Scheduled"
  );
}

function getEventTime(event = {}) {
  return (
    event.date ||
    event.startDate ||
    event.startTime ||
    event.competitions?.[0]?.date ||
    ""
  );
}

function getEventLink(event = {}) {
  if (event.links && Array.isArray(event.links)) {
    const link = event.links.find(item =>
      item?.href?.includes("/soccer/")
    );

    if (link?.href) {
      return link.href;
    }

    if (event.links[0]?.href) {
      return event.links[0].href;
    }
  }

  if (event.id) {
    return `https://www.espn.com/soccer/match/_/gameId/${event.id}`;
  }

  return "";
}

function extractCompetitors(event = {}) {
  if (Array.isArray(event.competitions)) {
    for (const competition of event.competitions) {
      if (Array.isArray(competition.competitors)) {
        if (competition.competitors.length >= 2) {
          return competition.competitors;
        }
      }
    }
  }

  if (Array.isArray(event.competitors)) {
    return event.competitors;
  }

  return [];
}

function convertEvent(event, leagueName) {
  if (!event || typeof event !== "object") {
    return null;
  }

  const competitors = extractCompetitors(event);

  if (competitors.length < 2) {
    return null;
  }

  const home =
    competitors.find(team => team.homeAway === "home") ||
    competitors[0];

  const away =
    competitors.find(team => team.homeAway === "away") ||
    competitors[1];

  const homeTeam = home?.team || home;
  const awayTeam = away?.team || away;

  const homeName = getTeamName(homeTeam);
  const awayName = getTeamName(awayTeam);

  if (
    !homeName ||
    !awayName ||
    homeName === "Unknown team" ||
    awayName === "Unknown team"
  ) {
    return null;
  }

  const status = getMatchStatus(event);

  const homeScore = getScore(home);
  const awayScore = getScore(away);

  const date = getEventTime(event);

  let timeText = "";

  if (date) {
    try {
      timeText = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Lusaka",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).format(new Date(date));
    } catch {
      timeText = "";
    }
  }

  return {
    source: "ESPN",
    type: "football",
    league: leagueName,
    homeTeam: homeName,
    awayTeam: awayName,
    homeScore,
    awayScore,
    status,
    time: timeText,
    date,
    link: getEventLink(event)
  };
}

/*
  ESPN sometimes changes where scoreboard events appear.

  This function searches the returned JSON recursively instead of
  assuming everything is always exactly data.events.
*/
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

async function searchESPNFootball(date) {
  const leagues = [
    {
      name: "English Premier League",
      id: "eng.1"
    },
    {
      name: "La Liga",
      id: "esp.1"
    },
    {
      name: "Serie A",
      id: "ita.1"
    },
    {
      name: "Bundesliga",
      id: "ger.1"
    },
    {
      name: "Ligue 1",
      id: "fra.1"
    },
    {
      name: "MLS",
      id: "usa.1"
    },
    {
      name: "UEFA Champions League",
      id: "uefa.champions"
    },
    {
      name: "UEFA Europa League",
      id: "uefa.europa"
    },
    {
      name: "UEFA Conference League",
      id: "uefa.europa.conf"
    },
    {
      name: "FIFA World Cup",
      id: "fifa.world"
    }
  ];

  const allMatches = [];

  for (const league of leagues) {
    console.log(`Checking football: ${league.name}`);

    const url =
      `https://site.api.espn.com/apis/site/v2/sports/soccer/` +
      `${league.id}/scoreboard?dates=${date}`;

    const result = await fetchJson(url);

    console.log(
      `${league.name} status: ${result.status}`
    );

    if (!result.ok || !result.data) {
      continue;
    }

    /*
      First try the normal ESPN events array.
    */
    let events = [];

    if (Array.isArray(result.data.events)) {
      events = result.data.events;
    }

    /*
      If ESPN changes its response structure, search the
      entire JSON response for match objects.
    */
    if (events.length === 0) {
      events = findFootballEvents(result.data);
    }

    console.log(
      `${league.name} events found: ${events.length}`
    );

    for (const event of events) {
      const match = convertEvent(event, league.name);

      if (match) {
        allMatches.push(match);
      }
    }
  }

  console.log(
    `Football events collected: ${allMatches.length}`
  );

  /*
    Remove duplicate matches.
  */
  const unique = [];
  const seen = new Set();

  for (const match of allMatches) {
    const key = [
      match.homeTeam,
      match.awayTeam,
      match.date || match.time,
      match.league
    ]
      .join("|")
      .toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(match);
    }
  }

  console.log(
    `Unique football matches: ${unique.length}`
  );

  return unique;
}

async function searchDuckDuckGo(query) {
  try {
    const url =
      "https://html.duckduckgo.com/html/?q=" +
      encodeURIComponent(query);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 Zed-AI"
      }
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();

    const results = [];

    const blocks = html.split("result__body");

    for (let i = 1; i < blocks.length; i++) {
      const block = blocks[i];

      const titleMatch =
        block.match(
          /result__a[^>]*>([\s\S]*?)<\/a>/
        );

      const urlMatch =
        block.match(
          /result__a[^>]*href="([^"]+)"/
        );

      const snippetMatch =
        block.match(
          /result__snippet[^>]*>([\s\S]*?)<\/a>/
        ) ||
        block.match(
          /result__snippet[^>]*>([\s\S]*?)<\/div>/
        );

      if (!titleMatch) {
        continue;
      }

      const title = cleanText(titleMatch[1]);

      const resultUrl = urlMatch
        ? cleanText(urlMatch[1])
        : "";

      const snippet = snippetMatch
        ? cleanText(snippetMatch[1])
        : "";

      if (title) {
        results.push({
          source: "DuckDuckGo",
          title,
          snippet,
          url: resultUrl
        });
      }

      if (results.length >= 10) {
        break;
      }
    }

    return results;
  } catch (error) {
    console.log(
      "DuckDuckGo search error:",
      error.message
    );

    return [];
  }
}

async function searchGoogleNews(query) {
  try {
    const url =
      "https://news.google.com/rss/search?q=" +
      encodeURIComponent(query) +
      "&hl=en-US&gl=US&ceid=US:en";

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 Zed-AI"
      }
    });

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();

    const items =
      xml.match(/<item>[\s\S]*?<\/item>/g) || [];

    return items.slice(0, 10).map(item => {
      const title =
        item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ||
        "";

      const link =
        item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ||
        "";

      const description =
        item.match(
          /<description>([\s\S]*?)<\/description>/
        )?.[1] || "";

      const pubDate =
        item.match(
          /<pubDate>([\s\S]*?)<\/pubDate>/
        )?.[1] || "";

      return {
        source: "Google News",
        title: cleanText(title),
        snippet: cleanText(description),
        url: cleanText(link),
        published: cleanText(pubDate)
      };
    });
  } catch (error) {
    console.log(
      "Google News error:",
      error.message
    );

    return [];
  }
}

async function webSearch(query) {
  const userQuery = String(query || "").trim();

  if (!userQuery) {
    return [];
  }

  console.log(
    `Zed web search: ${userQuery}`
  );

  /*
    FOOTBALL SEARCH
  */
  if (isFootballQuestion(userQuery)) {
    const date = formatDateForZambia();

    console.log(
      `Football date: ${date}`
    );

    const footballResults =
      await searchESPNFootball(date);

    if (footballResults.length > 0) {
      console.log(
        `Football search successful: ${footballResults.length}`
      );

      return footballResults;
    }

    console.log(
      "Football search returned no ESPN matches. " +
      "Trying general web search."
    );

    const fallbackQueries = [
      `${userQuery} ${date}`,
      `football results ${date}`,
      `soccer results ${date}`
    ];

    const fallbackResults = [];

    for (const q of fallbackQueries) {
      const results =
        await searchDuckDuckGo(q);

      fallbackResults.push(...results);

      if (fallbackResults.length >= 10) {
        break;
      }
    }

    if (fallbackResults.length > 0) {
      return fallbackResults.slice(0, 20);
    }

    const newsResults =
      await searchGoogleNews(
        `${userQuery} ${date}`
      );

    return newsResults;
  }

  /*
    GENERAL WEB SEARCH
  */
  const duckResults =
    await searchDuckDuckGo(userQuery);

  if (duckResults.length > 0) {
    return duckResults.slice(0, 20);
  }

  const newsResults =
    await searchGoogleNews(userQuery);

  return newsResults.slice(0, 20);
}

export {
  webSearch,
  shouldSearchWeb
};
