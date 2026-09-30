// features/football.js

const SITE_BASE =
  "https://site.web.api.espn.com/apis/site/v2/sports/soccer";

const STANDINGS_BASE =
  "https://site.api.espn.com/apis/v2/sports/soccer";

const ZAMBIA_TIMEZONE =
  "Africa/Lusaka";

const REQUEST_TIMEOUT =
  15000;

/* =========================================================
   LEAGUES
========================================================= */

const FOOTBALL_LEAGUES = [
  {
    name: "Premier League",
    slug: "eng.1",
    aliases: [
      "premier league",
      "epl",
      "english premier league",
      "england premier league"
    ]
  },

  {
    name: "La Liga",
    slug: "esp.1",
    aliases: [
      "la liga",
      "laliga",
      "spanish league",
      "spain league"
    ]
  },

  {
    name: "Serie A",
    slug: "ita.1",
    aliases: [
      "serie a",
      "italian league",
      "italy league"
    ]
  },

  {
    name: "Bundesliga",
    slug: "ger.1",
    aliases: [
      "bundesliga",
      "german league",
      "germany league"
    ]
  },

  {
    name: "Ligue 1",
    slug: "fra.1",
    aliases: [
      "ligue 1",
      "ligue one",
      "french league",
      "france league"
    ]
  },

  {
    name: "UEFA Champions League",
    slug: "uefa.champions",
    aliases: [
      "champions league",
      "uefa champions league",
      "ucl"
    ]
  },

  {
    name: "UEFA Europa League",
    slug: "uefa.europa",
    aliases: [
      "europa league",
      "uefa europa league"
    ]
  },

  {
    name: "UEFA Conference League",
    slug: "uefa.europa.conf",
    aliases: [
      "conference league",
      "uefa conference league"
    ]
  },

  {
    name: "FA Cup",
    slug: "eng.fa",
    aliases: [
      "fa cup",
      "english fa cup"
    ]
  },

  {
    name: "EFL Championship",
    slug: "eng.2",
    aliases: [
      "championship",
      "efl championship",
      "english championship"
    ]
  },

  {
    name: "Scottish Premiership",
    slug: "sco.1",
    aliases: [
      "scottish premiership",
      "scottish league",
      "scotland league"
    ]
  },

  {
    name: "Saudi Pro League",
    slug: "ksa.1",
    aliases: [
      "saudi pro league",
      "saudi league",
      "spl"
    ]
  },

  {
    name: "MLS",
    slug: "usa.1",
    aliases: [
      "mls",
      "major league soccer",
      "usa soccer league"
    ]
  },

  {
    name: "Liga MX",
    slug: "mex.1",
    aliases: [
      "liga mx",
      "mexican league",
      "mexico league"
    ]
  },

  {
    name: "Brazil Serie A",
    slug: "bra.1",
    aliases: [
      "brazil serie a",
      "brazilian league",
      "brazil league"
    ]
  },

  {
    name: "Argentina Liga Profesional",
    slug: "arg.1",
    aliases: [
      "argentina league",
      "argentine league",
      "liga profesional"
    ]
  }
];

/* =========================================================
   KNOWN TEAMS
========================================================= */

const KNOWN_TEAM_IDS = {
  arsenal: "359",
  chelsea: "363",
  "manchester united": "360",
  "man united": "360",
  "man utd": "360",
  "manchester city": "382",
  liverpool: "364",
  "tottenham hotspur": "367",
  tottenham: "367",
  spurs: "367",
  everton: "368",
  "newcastle united": "361",
  newcastle: "361",
  "aston villa": "362",
  "west ham": "371",
  "west ham united": "371",
  "brighton": "397",
  "brighton and hove albion": "397",
  "crystal palace": "384",
  fulham: "370",
  "nottingham forest": "393",
  "leeds united": "357",
  leeds: "357",

  barcelona: "83",
  "fc barcelona": "83",

  "real madrid": "86",
  madrid: "86",

  "atletico madrid": "1068",
  atletico: "1068",

  "manchester city": "382",

  juventus: "111",
  inter: "110",
  "inter milan": "110",
  milan: "103",
  "ac milan": "103",

  napoli: "114",
  roma: "104",

  bayern: "132",
  "bayern munich": "132",
  "borussia dortmund": "124",
  dortmund: "124",

  psg: "160",
  "paris saint-germain": "160",

  "al nassr": "8178",
  "al hilal": "8177",

  "la galaxy": "170",
  "inter miami": "20232"
};

/* =========================================================
   TEAM ALIASES
========================================================= */

const TEAM_ALIASES = {
  "man utd": "manchester united",
  "man united": "manchester united",
  "man u": "manchester united",
  "man city": "manchester city",

  "spurs": "tottenham hotspur",
  "tottenham": "tottenham hotspur",

  "newcastle": "newcastle united",

  "west ham": "west ham united",

  "brighton": "brighton and hove albion",

  "real madrid cf": "real madrid",

  "atletico": "atletico madrid",

  "inter milan": "inter",

  "psg": "paris saint-germain",

  "bayern": "bayern munich"
};

/* =========================================================
   BASIC HELPERS
========================================================= */

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDateForApi(date) {
  return date
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
}

function formatDateForZambia(dateValue) {
  if (!dateValue) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone: ZAMBIA_TIMEZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }
    ).format(new Date(dateValue));
  } catch {
    return "";
  }
}

function formatTimeForZambia(dateValue) {
  if (!dateValue) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone: ZAMBIA_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }
    ).format(new Date(dateValue));
  } catch {
    return "";
  }
}

async function fetchJson(url) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      REQUEST_TIMEOUT
    );

  try {
    const response =
      await fetch(
        url,
        {
          signal:
            controller.signal,
          headers: {
            "User-Agent":
              "Zed-AI-Football/1.0"
          }
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/* =========================================================
   TEAM DETECTION
========================================================= */

function detectFootballTeam(message = "") {
  const text =
    normalize(message);

  const sortedTeams =
    Object.keys(KNOWN_TEAM_IDS)
      .sort(
        (a, b) =>
          b.length -
          a.length
      );

  for (const team of sortedTeams) {
    const alias =
      TEAM_ALIASES[team] ||
      team;

    if (
      text.includes(team) ||
      text.includes(alias)
    ) {
      return {
        name: alias,
        id: KNOWN_TEAM_IDS[team]
      };
    }
  }

  return null;
}

/* =========================================================
   TEAM SEARCH
========================================================= */

async function searchFootballTeams(
  query = ""
) {
  const text =
    normalize(query);

  if (!text) {
    return [];
  }

  const url =
    `${SITE_BASE}/teams?region=us&lang=en&limit=50&query=${encodeURIComponent(text)}`;

  try {
    const data =
      await fetchJson(url);

    const teams =
      data?.sports?.[0]
        ?.leagues?.[0]
        ?.teams || [];

    return teams.map(
      (item) =>
        item?.team || item
    );
  } catch {
    return [];
  }
}

/* =========================================================
   TEAM SCHEDULE
========================================================= */

async function getTeamSchedule(
  teamId,
  fixtureOnly = false
) {
  const url =
    `${SITE_BASE}/teams/${teamId}/schedule`;

  try {
    const data =
      await fetchJson(url);

    let events =
      data?.events || [];

    if (fixtureOnly) {
      events =
        events.filter(
          (event) =>
            !getEventState(
              event
            ).completed
        );
    }

    return events;
  } catch {
    return [];
  }
}

/* =========================================================
   EVENT HELPERS
========================================================= */

function extractEvents(data) {
  if (!data) {
    return [];
  }

  if (
    Array.isArray(
      data.events
    )
  ) {
    return data.events;
  }

  if (
    Array.isArray(
      data.leagues
    )
  ) {
    const events = [];

    for (
      const league of data.leagues
    ) {
      if (
        Array.isArray(
          league.events
        )
      ) {
        events.push(
          ...league.events
        );
      }
    }

    return events;
  }

  return [];
}

function getEventDate(event) {
  return (
    event?.date ||
    event?.startDate ||
    event?.competitions?.[0]
      ?.date ||
    ""
  );
}

function getEventState(event) {
  const competition =
    event?.competitions?.[0];

  const state =
    competition?.status?.type ||
    event?.status?.type ||
    {};

  const completed =
    state.completed === true ||
    state.name === "STATUS_FINAL" ||
    state.type === "final";

  return {
    completed,
    name:
      state.name ||
      "",
    description:
      state.description ||
      "",
    detail:
      state.detail ||
      ""
  };
}

function getEventTeams(event) {
  const competition =
    event?.competitions?.[0];

  const competitors =
    competition?.competitors ||
    event?.competitors ||
    [];

  return competitors.map(
    (item) => ({
      id:
        item?.team?.id ||
        item?.id ||
        "",
      name:
        item?.team?.displayName ||
        item?.team?.name ||
        item?.displayName ||
        item?.name ||
        "Unknown",
      shortName:
        item?.team?.shortDisplayName ||
        item?.team?.abbreviation ||
        item?.team?.shortName ||
        item?.abbreviation ||
        item?.shortName ||
        "",
      score:
        item?.score ?? null,
      homeAway:
        item?.homeAway ||
        ""
    })
  );
}

function getHomeAwayTeams(event) {
  const teams =
    getEventTeams(event);

  let home =
    teams.find(
      (team) =>
        team.homeAway ===
        "home"
    );

  let away =
    teams.find(
      (team) =>
        team.homeAway ===
        "away"
    );

  if (
    !home &&
    teams.length >= 1
  ) {
    home = teams[0];
  }

  if (
    !away &&
    teams.length >= 2
  ) {
    away = teams[1];
  }

  return {
    home,
    away
  };
}

/* =========================================================
   TEAM MATCHES
========================================================= */

async function getTeamMatches(
  teamId
) {
  const events =
    await getTeamSchedule(
      teamId,
      false
    );

  return events.sort(
    (a, b) =>
      new Date(
        getEventDate(a)
      ) -
      new Date(
        getEventDate(b)
      )
  );
}

/* =========================================================
   REQUEST TYPE
========================================================= */

function getFootballRequestType(
  message = ""
) {
  const text =
    normalize(message);

  const wantsNext =
    text.includes("next") ||
    text.includes("upcoming") ||
    text.includes("next match") ||
    text.includes("next game");

  const wantsLast =
    text.includes("last") ||
    text.includes("previous") ||
    text.includes("latest result") ||
    text.includes("last result");

  const wantsResults =
    text.includes("result") ||
    text.includes("results");

  const wantsFixtures =
    text.includes("fixture") ||
    text.includes("fixtures") ||
    text.includes("schedule") ||
    text.includes("matches");

  if (wantsNext) {
    return "next";
  }

  if (wantsLast) {
    return "last";
  }

  if (wantsResults) {
    return "results";
  }

  if (wantsFixtures) {
    return "fixtures";
  }

  return "next";
}

/* =========================================================
   FORMAT TEAM MATCH
========================================================= */

function formatTeamMatch(
  event
) {
  const {
    home,
    away
  } =
    getHomeAwayTeams(
      event
    );

  const date =
    getEventDate(event);

  const state =
    getEventState(event);

  const dateText =
    formatDateForZambia(
      date
    );

  const timeText =
    formatTimeForZambia(
      date
    );

  const homeScore =
    home?.score;

  const awayScore =
    away?.score;

  let scoreText =
    "";

  if (
    homeScore !== null &&
    homeScore !== undefined &&
    awayScore !== null &&
    awayScore !== undefined
  ) {
    scoreText =
      ` — ${homeScore}-${awayScore}`;
  }

  return (
    `${home?.name || "Unknown"} vs ${away?.name || "Unknown"}` +
    `${scoreText}` +
    ` — ${dateText}` +
    ` ${timeText} Zambia time` +
    `${state.completed ? " — Full time" : ""}`
  );
}

/* =========================================================
   TEAM FEATURE
========================================================= */

async function footballTeamFeature(
  message = ""
) {
  const team =
    detectFootballTeam(
      message
    );

  if (!team) {
    return {
      answer:
        "I could not identify the football team. Please give me the team name, for example: Arsenal.",
      source:
        "ESPN"
    };
  }

  const requestType =
    getFootballRequestType(
      message
    );

  const events =
    await getTeamMatches(
      team.id
    );

  if (!events.length) {
    return {
      answer:
        `I could not retrieve current ${team.name} match data from ESPN.`,
      source:
        "ESPN"
    };
  }

  const completed =
    events
      .filter(
        (event) =>
          getEventState(
            event
          ).completed
      )
      .sort(
        (a, b) =>
          new Date(
            getEventDate(b)
          ) -
          new Date(
            getEventDate(a)
          )
      );

  const upcoming =
    events
      .filter(
        (event) =>
          !getEventState(
            event
          ).completed
      )
      .sort(
        (a, b) =>
          new Date(
            getEventDate(a)
          ) -
          new Date(
            getEventDate(b)
          )
      );

  if (
    requestType ===
      "last" ||
    requestType ===
      "results"
  ) {
    const matches =
      completed.slice(
        0,
        5
      );

    return {
      answer:
        `${team.name} latest results:\n\n` +
        matches
          .map(
            (event) =>
              `• ${formatTeamMatch(event)}`
          )
          .join("\n"),
      source:
        "ESPN"
    };
  }

  if (
    requestType ===
      "fixtures"
  ) {
    const matches =
      upcoming.slice(
        0,
        5
      );

    return {
      answer:
        `${team.name} upcoming fixtures:\n\n` +
        matches
          .map(
            (event) =>
              `• ${formatTeamMatch(event)}`
          )
          .join("\n"),
      source:
        "ESPN"
    };
  }

  const next =
    upcoming[0];

  if (!next) {
    return {
      answer:
        `I could not find an upcoming match for ${team.name}.`,
      source:
        "ESPN"
    };
  }

  return {
    answer:
      `${team.name}'s next match:\n\n${formatTeamMatch(next)}`,
    source:
      "ESPN"
  };
}

/* =========================================================
   LEAGUE DETECTION
========================================================= */

function detectFootballLeague(
  message = ""
) {
  const text =
    normalize(message);

  for (
    const league of
      FOOTBALL_LEAGUES
  ) {
    for (
      const alias of
        league.aliases
    ) {
      if (
        text.includes(
          normalize(alias)
        )
      ) {
        return league;
      }
    }
  }

  return null;
}

/* =========================================================
   LEAGUE REQUEST TYPE
========================================================= */

function getLeagueRequestType(
  message = ""
) {
  const text =
    normalize(message);

  const wantsStandings =
    text.includes("standings") ||
    text.includes("league table") ||
    text.includes("table") ||
    text.includes("position") ||
    text.includes("positions");

  const wantsResults =
    text.includes("result") ||
    text.includes("results") ||
    text.includes("recent") ||
    text.includes("latest");

  const wantsFixtures =
    text.includes("fixture") ||
    text.includes("fixtures") ||
    text.includes("upcoming") ||
    text.includes("schedule");

  const wantsToday =
    text.includes("today") ||
    text.includes("todays") ||
    text.includes("matches today");

  if (
    wantsStandings &&
    wantsResults
  ) {
    return "results-and-standings";
  }

  if (wantsStandings) {
    return "standings";
  }

  if (wantsResults) {
    return "results";
  }

  if (wantsFixtures) {
    return "fixtures";
  }

  if (wantsToday) {
    return "today";
  }

  return "fixtures";
}

/* =========================================================
   LEAGUE SCOREBOARD
========================================================= */

async function getLeagueScoreboard(
  league,
  date = null
) {
  let url =
    `${SITE_BASE}/${league.slug}/scoreboard`;

  if (date) {
    url +=
      `?dates=${formatDateForApi(date)}`;
  }

  try {
    const data =
      await fetchJson(
        url
      );

    return extractEvents(
      data
    );
  } catch {
    return [];
  }
}

/* =========================================================
   RECENT LEAGUE RESULTS
========================================================= */

async function getLeagueRecentResults(
  league,
  daysBack = 14
) {
  const today =
    new Date();

  const dates =
    [];

  for (
    let i = 0;
    i <= daysBack;
    i++
  ) {
    const date =
      new Date(
        today.getTime() -
          i *
            24 *
            60 *
            60 *
            1000
      );

    dates.push(
      formatDateForApi(
        date
      )
    );
  }

  /*
    ESPN soccer scoreboard is more
    reliable with individual dates
    than with a date-range request.
  */

  const results =
    await Promise.all(
      dates.map(
        async (
          dateString
        ) => {
          const url =
            `${SITE_BASE}/${league.slug}/scoreboard?dates=${dateString}`;

          try {
            const data =
              await fetchJson(
                url
              );

            return extractEvents(
              data
            );
          } catch {
            return [];
          }
        }
      )
    );

  const events =
    results.flat();

  /*
    Remove duplicate events.
  */

  const unique =
    new Map();

  for (
    const event of events
  ) {
    const teams =
      getEventTeams(
        event
      );

    const fallbackId =
      `${getEventDate(event)}-${teams
        .map(
          (team) =>
            team.id
        )
        .join("-")}`;

    const eventId =
      String(
        event?.id ||
          fallbackId
      );

    if (
      !unique.has(
        eventId
      )
    ) {
      unique.set(
        eventId,
        event
      );
    }
  }

  return Array.from(
    unique.values()
  );
}

/* =========================================================
   STANDINGS
========================================================= */

async function getLeagueStandings(
  league
) {
  const url =
    `${STANDINGS_BASE}/${league.slug}/standings`;

  try {
    return await fetchJson(
      url
    );
  } catch {
    return null;
  }
}

/* =========================================================
   EXTRACT STANDING ROWS
========================================================= */

function extractStandingsRows(
  data
) {
  const rows =
    [];

  const groups =
    data?.children ||
    [];

  function walk(
    node
  ) {
    if (!node) {
      return;
    }

    if (
      Array.isArray(
        node.standings?.entries
      )
    ) {
      rows.push(
        ...node.standings.entries
      );
    }

    if (
      Array.isArray(
        node.children
      )
    ) {
      for (
        const child of
          node.children
      ) {
        walk(child);
      }
    }
  }

  for (
    const group of
      groups
  ) {
    walk(group);
  }

  if (
    Array.isArray(
      data?.standings?.entries
    )
  ) {
    rows.push(
      ...data.standings.entries
    );
  }

  return rows;
}

/* =========================================================
   STANDINGS FORMAT
========================================================= */

function formatStandings(
  data
) {
  const rows =
    extractStandingsRows(
      data
    );

  if (!rows.length) {
    return "";
  }

  const output =
    [];

  output.push(
    "Position | Team | P | W | D | L | GD | Pts"
  );

  output.push(
    "--- | --- | ---: | ---: | ---: | ---: | ---: | ---:"
  );

  rows.forEach(
    (
      row,
      index
    ) => {
      const stats =
        {};

      for (
        const stat of
          row.stats ||
          []
      ) {
        stats[
          stat.name
        ] =
          stat.value ??
          stat.displayValue ??
          "";
      }

      const team =
        row.team ||
        {};

      const position =
        stats.rank ||
        stats.position ||
        index + 1;

      const played =
        stats.gamesPlayed ??
        stats.played ??
        stats.p ??
        "";

      const wins =
        stats.wins ??
        stats.win ??
        stats.w ??
        "";

      const draws =
        stats.ties ??
        stats.draws ??
        stats.draw ??
        stats.d ??
        "";

      const losses =
        stats.losses ??
        stats.loss ??
        stats.l ??
        "";

      const goalDiff =
        stats.goalDifference ??
        stats.goaldifference ??
        stats.gd ??
        "";

      const points =
        stats.points ??
        stats.pts ??
        "";

      output.push(
        `${position} | ${team.displayName || team.name || "Unknown"} | ${played} | ${wins} | ${draws} | ${losses} | ${goalDiff} | ${points}`
      );
    }
  );

  return output.join(
    "\n"
  );
}

/* =========================================================
   LEAGUE FEATURE
========================================================= */

async function footballLeagueFeature(
  message = ""
) {
  const league =
    detectFootballLeague(
      message
    );

  if (!league) {
    return {
      answer:
        "I could not identify the football league. Please specify a league, for example Premier League, La Liga, Serie A, Bundesliga or Champions League.",
      source:
        "ESPN"
    };
  }

  const requestType =
    getLeagueRequestType(
      message
    );

  /*
    RESULTS + STANDINGS
  */

  if (
    requestType ===
    "results-and-standings"
  ) {
    const [
      resultsData,
      standingsData
    ] =
      await Promise.all([
        getLeagueRecentResults(
          league,
          14
        ),
        getLeagueStandings(
          league
        )
      ]);

    const results =
      resultsData
        .filter(
          (event) =>
            getEventState(
              event
            ).completed
        )
        .sort(
          (a, b) =>
            new Date(
              getEventDate(b)
            ) -
            new Date(
              getEventDate(a)
            )
        )
        .slice(
          0,
          20
        );

    let answer =
      `${league.name} — Latest Results\n\n`;

    if (
      results.length
    ) {
      answer +=
        results
          .map(
            (event) => {
              const {
                home,
                away
              } =
                getHomeAwayTeams(
                  event
                );

              return (
                `• ${home?.name || "Unknown"} ` +
                `${home?.score ?? "-"}-${away?.score ?? "-"} ` +
                `${away?.name || "Unknown"} ` +
                `— ${formatDateForZambia(
                  getEventDate(event)
                )} ${formatTimeForZambia(
                  getEventDate(event)
                )} Zambia time`
              );
            }
          )
          .join(
            "\n"
          );
    } else {
      answer +=
        "No recent completed matches were found from ESPN.\n";
    }

    answer +=
      `\n\n${league.name} — Standings\n\n`;

    const table =
      standingsData
        ? formatStandings(
            standingsData
          )
        : "";

    if (table) {
      answer +=
        table;
    } else {
      answer +=
        "Standings could not be retrieved from ESPN.";
    }

    return {
      answer,
      source:
        "ESPN"
    };
  }

  /*
    STANDINGS
  */

  if (
    requestType ===
    "standings"
  ) {
    const data =
      await getLeagueStandings(
        league
      );

    const table =
      data
        ? formatStandings(
            data
          )
        : "";

    return {
      answer:
        table
          ? `${league.name} standings:\n\n${table}`
          : `I could not retrieve the current ${league.name} standings from ESPN.`,
      source:
        "ESPN"
    };
  }

  /*
    RESULTS
  */

  if (
    requestType ===
    "results"
  ) {
    const data =
      await getLeagueRecentResults(
        league,
        14
      );

    const results =
      data
        .filter(
          (event) =>
            getEventState(
              event
            ).completed
        )
        .sort(
          (a, b) =>
            new Date(
              getEventDate(b)
            ) -
            new Date(
              getEventDate(a)
            )
        )
        .slice(
          0,
          20
        );

    if (!results.length) {
      return {
        answer:
          `No recent completed ${league.name} results were found from ESPN.`,
        source:
          "ESPN"
      };
    }

    return {
      answer:
        `${league.name} latest results:\n\n` +
        results
          .map(
            (event) => {
              const {
                home,
                away
              } =
                getHomeAwayTeams(
                  event
                );

              return (
                `• ${home?.name || "Unknown"} ` +
                `${home?.score ?? "-"}-${away?.score ?? "-"} ` +
                `${away?.name || "Unknown"} ` +
                `— ${formatDateForZambia(
                  getEventDate(event)
                )} ${formatTimeForZambia(
                  getEventDate(event)
                )} Zambia time`
              );
            }
          )
          .join(
            "\n"
          ),
      source:
        "ESPN"
    };
  }

  /*
    TODAY
  */

  if (
    requestType ===
    "today"
  ) {
    const data =
      await getLeagueScoreboard(
        league,
        new Date()
      );

    if (!data.length) {
      return {
        answer:
          `No ${league.name} matches were found for today.`,
        source:
          "ESPN"
      };
    }

    return {
      answer:
        `${league.name} matches today:\n\n` +
        data
          .map(
            (event) => {
              const {
                home,
                away
              } =
                getHomeAwayTeams(
                  event
                );

              const state =
                getEventState(
                  event
                );

              const score =
                state.completed
                  ? `${home?.score ?? "-"}-${away?.score ?? "-"}`
                  : "vs";

              return (
                `• ${home?.name || "Unknown"} ${score} ${away?.name || "Unknown"} ` +
                `— ${formatTimeForZambia(
                  getEventDate(event)
                )} Zambia time`
              );
            }
          )
          .join(
            "\n"
          ),
      source:
        "ESPN"
    };
  }

  /*
    UPCOMING FIXTURES
  */

  const today =
    new Date();

  const upcomingDates =
    [];

  for (
    let i = 0;
    i <= 14;
    i++
  ) {
    upcomingDates.push(
      new Date(
        today.getTime() +
          i *
            24 *
            60 *
            60 *
            1000
      )
    );
  }

  const fixtureResults =
    await Promise.all(
      upcomingDates.map(
        async (
          date
        ) =>
          getLeagueScoreboard(
            league,
            date
          )
      )
    );

  const fixtures =
    fixtureResults
      .flat()
      .filter(
        (event) =>
          !getEventState(
            event
          ).completed
      );

  const unique =
    new Map();

  for (
    const event of
      fixtures
  ) {
    const id =
      String(
        event?.id ||
          `${getEventDate(event)}-${getEventTeams(event)
            .map(
              (team) =>
                team.id
            )
            .join("-")}`
      );

    if (
      !unique.has(id)
    ) {
      unique.set(
        id,
        event
      );
    }
  }

  const finalFixtures =
    Array.from(
      unique.values()
    )
      .sort(
        (a, b) =>
          new Date(
            getEventDate(a)
          ) -
          new Date(
            getEventDate(b)
          )
      )
      .slice(
        0,
        20
      );

  if (
    !finalFixtures.length
  ) {
    return {
      answer:
        `No upcoming ${league.name} fixtures were found from ESPN.`,
      source:
        "ESPN"
    };
  }

  return {
    answer:
      `${league.name} upcoming fixtures:\n\n` +
      finalFixtures
        .map(
          (event) => {
            const {
              home,
              away
            } =
              getHomeAwayTeams(
                event
              );

            return (
              `• ${home?.name || "Unknown"} vs ${away?.name || "Unknown"} ` +
              `— ${formatDateForZambia(
                getEventDate(event)
              )} ${formatTimeForZambia(
                getEventDate(event)
              )} Zambia time`
            );
          }
        )
        .join(
          "\n"
        ),
    source:
      "ESPN"
  };
}

/* =========================================================
   WORLDWIDE FOOTBALL
========================================================= */

async function footballFeature(
  message = ""
) {
  const text =
    normalize(message);

  const today =
    new Date();

  const data =
    await Promise.all(
      FOOTBALL_LEAGUES.map(
        async (
          league
        ) => {
          const events =
            await getLeagueScoreboard(
              league,
              today
            );

          return {
            league,
            events
          };
        }
      )
    );

  const matches =
    [];

  for (
    const item of data
  ) {
    for (
      const event of
        item.events
    ) {
      const {
        home,
        away
      } =
        getHomeAwayTeams(
          event
        );

      if (
        home &&
        away
      ) {
        matches.push({
          league:
            item.league.name,
          event
        });
      }
    }
  }

  if (!matches.length) {
    return {
      answer:
        "I could not find current football matches from ESPN right now.",
      source:
        "ESPN"
    };
  }

  const unique =
    new Map();

  for (
    const item of
      matches
  ) {
    const event =
      item.event;

    const id =
      String(
        event?.id ||
          `${item.league}-${getEventDate(event)}-${getEventTeams(event)
            .map(
              (team) =>
                team.id
            )
            .join("-")}`
      );

    if (
      !unique.has(id)
    ) {
      unique.set(
        id,
        item
      );
    }
  }

  const finalMatches =
    Array.from(
      unique.values()
    )
      .sort(
        (a, b) =>
          new Date(
            getEventDate(
              a.event
            )
          ) -
          new Date(
            getEventDate(
              b.event
            )
          )
      )
      .slice(
        0,
        30
      );

  return {
    answer:
      "Football matches today:\n\n" +
      finalMatches
        .map(
          (item) => {
            const {
              home,
              away
            } =
              getHomeAwayTeams(
                item.event
              );

            const state =
              getEventState(
                item.event
              );

            let score =
              "vs";

            if (
              state.completed
            ) {
              score =
                `${home?.score ?? "-"}-${away?.score ?? "-"}`;
            }

            return (
              `• ${item.league}: ` +
              `${home?.name || "Unknown"} ` +
              `${score} ` +
              `${away?.name || "Unknown"} ` +
              `— ${formatTimeForZambia(
                getEventDate(
                  item.event
                )
              )} Zambia time`
            );
          }
        )
        .join(
          "\n"
        ),
    source:
      "ESPN"
  };
}

/* =========================================================
   FOOTBALL BY DATE
========================================================= */

async function getFootballForDate(
  date
) {
  const results =
    await Promise.all(
      FOOTBALL_LEAGUES.map(
        async (
          league
        ) => {
          const events =
            await getLeagueScoreboard(
              league,
              date
            );

          return {
            league,
            events
          };
        }
      )
    );

  const matches =
    [];

  for (
    const item of results
  ) {
    for (
      const event of
        item.events
    ) {
      matches.push({
        league:
          item.league.name,
        event
      });
    }
  }

  return matches;
}

/* =========================================================
   EXPORTS
========================================================= */

export {
  footballTeamFeature,
  footballLeagueFeature,
  footballFeature,
  searchFootballTeams,
  getFootballForDate,
  detectFootballTeam,
  detectFootballLeague,
  getFootballRequestType
};
