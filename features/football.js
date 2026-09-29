// features/football.js

const SITE_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/soccer";

const STANDINGS_BASE =
  "https://site.api.espn.com/apis/v2/sports/soccer";

const SEARCH_BASE =
  "https://site.api.espn.com/apis/search/v2";

const ZAMBIA_TIMEZONE =
  "Africa/Lusaka";

const REQUEST_TIMEOUT = 15000;


/* =========================================================
   LEAGUES
   ========================================================= */

export const FOOTBALL_LEAGUES = {
  premierLeague: {
    name: "Premier League",
    id: "eng.1"
  },

  championship: {
    name: "EFL Championship",
    id: "eng.2"
  },

  laLiga: {
    name: "La Liga",
    id: "esp.1"
  },

  laLiga2: {
    name: "La Liga 2",
    id: "esp.2"
  },

  serieA: {
    name: "Serie A",
    id: "ita.1"
  },

  serieB: {
    name: "Serie B",
    id: "ita.2"
  },

  bundesliga: {
    name: "Bundesliga",
    id: "ger.1"
  },

  bundesliga2: {
    name: "2. Bundesliga",
    id: "ger.2"
  },

  ligue1: {
    name: "Ligue 1",
    id: "fra.1"
  },

  ligue2: {
    name: "Ligue 2",
    id: "fra.2"
  },

  eredivisie: {
    name: "Eredivisie",
    id: "ned.1"
  },

  primeiraLiga: {
    name: "Primeira Liga",
    id: "por.1"
  },

  belgianProLeague: {
    name: "Belgian Pro League",
    id: "bel.1"
  },

  scottishPremiership: {
    name: "Scottish Premiership",
    id: "sco.1"
  },

  turkishSuperLig: {
    name: "Turkish Super Lig",
    id: "tur.1"
  },

  greekSuperLeague: {
    name: "Greek Super League",
    id: "gre.1"
  },

  austrianBundesliga: {
    name: "Austrian Bundesliga",
    id: "aut.1"
  },

  swissSuperLeague: {
    name: "Swiss Super League",
    id: "sui.1"
  },

  danishSuperliga: {
    name: "Danish Superliga",
    id: "den.1"
  },

  norwegianEliteserien: {
    name: "Norwegian Eliteserien",
    id: "nor.1"
  },

  swedishAllsvenskan: {
    name: "Swedish Allsvenskan",
    id: "swe.1"
  },

  polishEkstraklasa: {
    name: "Polish Ekstraklasa",
    id: "pol.1"
  },

  czechFirstLeague: {
    name: "Czech First League",
    id: "cze.1"
  },

  championsLeague: {
    name: "UEFA Champions League",
    id: "uefa.champions"
  },

  europaLeague: {
    name: "UEFA Europa League",
    id: "uefa.europa"
  },

  conferenceLeague: {
    name: "UEFA Conference League",
    id: "uefa.europa.conf"
  },

  womensChampionsLeague: {
    name: "UEFA Women's Champions League",
    id: "uefa.wchampions"
  },

  egypt: {
    name: "Egypt Premier League",
    id: "egy.1"
  },

  southAfrica: {
    name: "South Africa Premier Division",
    id: "rsa.1"
  },

  nigeria: {
    name: "Nigeria Premier League",
    id: "nga.1"
  },

  morocco: {
    name: "Morocco Botola",
    id: "mar.1"
  },

  zambia: {
    name: "Zambia Super League",
    id: "zambia.1"
  },

  mls: {
    name: "MLS",
    id: "usa.1"
  },

  ligaMX: {
    name: "Liga MX",
    id: "mex.1"
  },

  brazil: {
    name: "Brazil Serie A",
    id: "bra.1"
  },

  argentina: {
    name: "Argentina Primera",
    id: "arg.1"
  },

  colombia: {
    name: "Colombia Primera A",
    id: "col.1"
  },

  saudi: {
    name: "Saudi Pro League",
    id: "ksa.1"
  },

  japan: {
    name: "J1 League",
    id: "jpn.1"
  },

  korea: {
    name: "K League 1",
    id: "kor.1"
  },

  australia: {
    name: "A-League",
    id: "aus.1"
  },

  worldCup: {
    name: "FIFA World Cup",
    id: "fifa.world"
  },

  womensWorldCup: {
    name: "FIFA Women's World Cup",
    id: "fifa.wwc"
  }
};


/* =========================================================
   ALIASES
   ========================================================= */

const LEAGUE_ALIASES = {
  "premier league": "eng.1",
  "epl": "eng.1",
  "english premier league": "eng.1",

  "championship": "eng.2",
  "efl championship": "eng.2",

  "la liga": "esp.1",
  "laliga": "esp.1",
  "spanish league": "esp.1",

  "serie a": "ita.1",
  "italian league": "ita.1",

  "bundesliga": "ger.1",
  "german league": "ger.1",

  "ligue 1": "fra.1",
  "french league": "fra.1",

  "eredivisie": "ned.1",

  "primeira liga": "por.1",
  "portuguese league": "por.1",

  "mls": "usa.1",
  "major league soccer": "usa.1",

  "liga mx": "mex.1",

  "champions league": "uefa.champions",
  "uefa champions league": "uefa.champions",
  "ucl": "uefa.champions",

  "europa league": "uefa.europa",
  "uefa europa league": "uefa.europa",

  "conference league": "uefa.europa.conf",
  "europa conference league": "uefa.europa.conf",

  "women's champions league":
    "uefa.wchampions",

  "womens champions league":
    "uefa.wchampions",

  "uwcl":
    "uefa.wchampions",

  "zambia super league":
    "zambia.1",

  "zambian super league":
    "zambia.1"
};


/* =========================================================
   TEAM ALIASES
   ========================================================= */

const TEAM_ALIASES = {
  arsenal: "Arsenal",
  "arsenal men": "Arsenal",
  "arsenal women": "Arsenal Women",

  chelsea: "Chelsea",
  "chelsea men": "Chelsea",
  "chelsea women": "Chelsea Women",

  liverpool: "Liverpool",

  "manchester united": "Manchester United",
  "man united": "Manchester United",
  "man utd": "Manchester United",

  "manchester city": "Manchester City",
  "man city": "Manchester City",

  tottenham: "Tottenham Hotspur",
  spurs: "Tottenham Hotspur",

  newcastle: "Newcastle United",

  "aston villa": "Aston Villa",

  barcelona: "Barcelona",
  barca: "Barcelona",
  "barcelona women": "Barcelona Women",

  "real madrid": "Real Madrid",
  madrid: "Real Madrid",

  "real madrid women": "Real Madrid Women",

  "atletico madrid": "Atletico Madrid",

  bayern: "Bayern Munich",
  "bayern munich": "Bayern Munich",

  dortmund: "Borussia Dortmund",
  "borussia dortmund": "Borussia Dortmund",

  juventus: "Juventus",
  juve: "Juventus",

  "inter milan": "Inter Milan",
  inter: "Inter Milan",

  "ac milan": "AC Milan",

  psg: "Paris Saint-Germain",
  "paris saint-germain": "Paris Saint-Germain",

  "paris fc": "Paris FC",

  roma: "Roma",

  benfica: "Benfica",

  porto: "Porto",

  ajax: "Ajax",

  psv: "PSV",

  napoli: "Napoli",

  "rb leipzig": "RB Leipzig",

  "bayer leverkusen": "Bayer Leverkusen",

  monaco: "Monaco",

  lyon: "Lyon",

  marseille: "Marseille",

  "red bull salzburg": "Red Bull Salzburg",

  "al hilal": "Al Hilal",

  "al nassr": "Al Nassr",

  "al ahly": "Al Ahly",

  "mamelodi sundowns": "Mamelodi Sundowns",

  "kaizer chiefs": "Kaizer Chiefs",

  "young africans": "Young Africans",

  "tp mazembe": "TP Mazembe",

  "zamalek": "Zamalek",

  "zambia": "Zambia",

  chipolopolo: "Zambia",

  malawi: "Malawi",

  nigeria: "Nigeria",

  ghana: "Ghana",

  "south africa": "South Africa",

  egypt: "Egypt",

  morocco: "Morocco",

  brazil: "Brazil",

  argentina: "Argentina",

  france: "France",

  germany: "Germany",

  spain: "Spain",

  italy: "Italy",

  england: "England",

  portugal: "Portugal",

  netherlands: "Netherlands"
};


/* =========================================================
   GENERAL HELPERS
   ========================================================= */

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[?!.,;:()[\]{}"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function compactDate(date) {
  return String(date).replace(/-/g, "");
}


function getZambiaDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZAMBIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}


function formatZambiaTime(value) {
  if (!value) {
    return "Time unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ZAMBIA_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}


function safeDate(value) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}


async function fetchJson(
  url,
  options = {}
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      options.timeout || REQUEST_TIMEOUT
    );

  try {
    const response =
      await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal
      });

    if (!response.ok) {
      throw new Error(
        `Football API returned HTTP ${response.status}`
      );
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}


/* =========================================================
   EVENT NORMALIZATION
   ========================================================= */

function normalizeEvent(
  event,
  fallbackLeague = ""
) {
  const competition =
    event?.competitions?.[0] || {};

  const competitors =
    competition?.competitors || [];

  const home =
    competitors.find(
      item => item.homeAway === "home"
    );

  const away =
    competitors.find(
      item => item.homeAway === "away"
    );

  const status =
    competition?.status ||
    event?.status ||
    {};

  const statusType =
    status?.type || {};

  let state = "scheduled";

  if (
    statusType?.state === "in" ||
    statusType?.name === "STATUS_IN_PROGRESS"
  ) {
    state = "live";
  } else if (
    statusType?.completed === true ||
    statusType?.state === "post" ||
    statusType?.name === "STATUS_FINAL"
  ) {
    state = "completed";
  }

  return {
    id: event?.id || "",

    name:
      event?.name ||
      "Football match",

    homeTeam:
      home?.team?.displayName ||
      home?.team?.shortDisplayName ||
      "Home",

    awayTeam:
      away?.team?.displayName ||
      away?.team?.shortDisplayName ||
      "Away",

    homeTeamId:
      home?.team?.id ||
      null,

    awayTeamId:
      away?.team?.id ||
      null,

    homeScore:
      home?.score !== undefined
        ? String(home.score)
        : null,

    awayScore:
      away?.score !== undefined
        ? String(away.score)
        : null,

    status: state,

    statusText:
      statusType?.detail ||
      statusType?.shortDetail ||
      statusType?.description ||
      "Scheduled",

    date:
      event?.date ||
      competition?.date ||
      null,

    timeZambia:
      formatZambiaTime(
        event?.date ||
        competition?.date
      ),

    competition:
      event?.league?.name ||
      fallbackLeague ||
      "Football",

    leagueId:
      event?.league?.id ||
      null,

    venue:
      competition?.venue?.fullName ||
      ""
  };
}


/* =========================================================
   SCOREBOARD
   ========================================================= */

export async function getLeagueMatches(
  leagueId,
  date = getZambiaDate()
) {
  if (!leagueId) {
    throw new Error(
      "League ID is required."
    );
  }

  const url =
    `${SITE_BASE}/${leagueId}/scoreboard` +
    `?dates=${compactDate(date)}`;

  const data =
    await fetchJson(url);

  const events =
    Array.isArray(data?.events)
      ? data.events
      : [];

  const leagueName =
    data?.leagues?.[0]?.name ||
    leagueId;

  return events.map(event =>
    normalizeEvent(
      event,
      leagueName
    )
  );
}


/* =========================================================
   WORLDWIDE DAILY FOOTBALL
   ========================================================= */

export async function getFootballMatches(
  date = getZambiaDate()
) {
  const leagues =
    Object.values(
      FOOTBALL_LEAGUES
    );

  const results =
    await Promise.allSettled(
      leagues.map(
        league =>
          getLeagueMatches(
            league.id,
            date
          )
      )
    );

  const matches = [];

  for (const result of results) {
    if (
      result.status ===
      "fulfilled"
    ) {
      matches.push(
        ...result.value
      );
    }
  }

  const unique =
    new Map();

  for (const match of matches) {
    const key =
      match.id ||
      `${match.homeTeam}-${match.awayTeam}-${match.date}`;

    if (!unique.has(key)) {
      unique.set(
        key,
        match
      );
    }
  }

  return Array.from(
    unique.values()
  ).sort(
    (a, b) =>
      new Date(a.date || 0) -
      new Date(b.date || 0)
  );
}


/* =========================================================
   TEAM DETECTION
   ========================================================= */

export function detectFootballTeam(
  userMessage = ""
) {
  const text =
    normalizeText(
      userMessage
    );

  if (!text) {
    return null;
  }

  const aliases =
    Object.keys(
      TEAM_ALIASES
    ).sort(
      (a, b) =>
        b.length - a.length
    );

  for (const alias of aliases) {
    const padded =
      ` ${text} `;

    if (
      padded.includes(
        ` ${alias} `
      )
    ) {
      return {
        query: alias,
        name:
          TEAM_ALIASES[alias]
      };
    }
  }

  return null;
}


/* =========================================================
   REQUEST TYPE
   ========================================================= */

export function getFootballRequestType(
  userMessage = ""
) {
  const text =
    normalizeText(
      userMessage
    );

  if (
    /\b(next|upcoming|coming)\b/.test(text) &&
    /\b(match|game|fixture|fixtures|play|plays)\b/.test(text)
  ) {
    return "next";
  }

  if (
    /\b(last|previous|recent)\b/.test(text) &&
    /\b(match|game|fixture|fixtures|result|results|played)\b/.test(text)
  ) {
    return "last";
  }

  if (
    /\b(live|score|scores|currently|right now|now)\b/.test(text)
  ) {
    return "live";
  }

  if (
    /\b(table|standings|league table|position|positions)\b/.test(text)
  ) {
    return "standings";
  }

  if (
    /\b(fixture|fixtures|schedule|matches|games)\b/.test(text)
  ) {
    return "fixtures";
  }

  return "general";
}


/* =========================================================
   LEAGUE DETECTION
   ========================================================= */

export function detectFootballLeague(
  userMessage = ""
) {
  const text =
    normalizeText(
      userMessage
    );

  const aliases =
    Object.keys(
      LEAGUE_ALIASES
    ).sort(
      (a, b) =>
        b.length - a.length
    );

  for (const alias of aliases) {
    if (
      text.includes(alias)
    ) {
      return {
        name: alias,
        id:
          LEAGUE_ALIASES[alias]
      };
    }
  }

  return null;
}


/* =========================================================
   TEAM SEARCH
   ========================================================= */

export async function searchFootballTeams(
  query,
  options = {}
) {
  const cleanQuery =
    normalizeText(query);

  if (!cleanQuery) {
    return [];
  }

  const sport =
    options.sport ||
    "soccer";

  const url =
    `${SEARCH_BASE}` +
    `?query=${encodeURIComponent(cleanQuery)}` +
    `&sport=${encodeURIComponent(sport)}` +
    `&limit=10`;

  try {
    const data =
      await fetchJson(url);

    const results =
      Array.isArray(data?.results)
        ? data.results
        : [];

    return results
      .map(item => {
        const team =
          item?.contents?.[0] ||
          item?.team ||
          item;

        return {
          id:
            team?.id ||
            item?.id ||
            null,

          name:
            team?.displayName ||
            team?.name ||
            item?.displayName ||
            item?.name ||
            "",

          abbreviation:
            team?.abbreviation ||
            "",

          sport:
            team?.sport ||
            "soccer",

          league:
            team?.league?.name ||
            ""
        };
      })
      .filter(
        team =>
          team.id &&
          team.name
      );
  } catch {
    return [];
  }
}


/* =========================================================
   TEAM SCHEDULE
   ========================================================= */

export async function getTeamSchedule(
  leagueId,
  teamId
) {
  if (!leagueId || !teamId) {
    throw new Error(
      "League ID and team ID are required."
    );
  }

  const url =
    `${SITE_BASE}/${leagueId}` +
    `/teams/${teamId}/schedule`;

  return await fetchJson(
    url
  );
}


/* =========================================================
   FIND TEAM IN LEAGUE
   ========================================================= */

async function findTeamInLeague(
  leagueId,
  query
) {
  const url =
    `${SITE_BASE}/${leagueId}/teams`;

  try {
    const data =
      await fetchJson(url);

    const teams =
      data?.sports?.[0]
        ?.leagues?.[0]
        ?.teams || [];

    const cleanQuery =
      normalizeText(query);

    for (const item of teams) {
      const team =
        item?.team ||
        item;

      const names = [
        team?.displayName,
        team?.shortDisplayName,
        team?.name,
        team?.location,
        team?.abbreviation
      ]
        .filter(Boolean)
        .map(
          value =>
            normalizeText(value)
        );

      if (
        names.some(
          name =>
            name === cleanQuery ||
            name.includes(cleanQuery) ||
            cleanQuery.includes(name)
        )
      ) {
        return {
          id:
            String(team.id),

          name:
            team.displayName ||
            team.name,

          abbreviation:
            team.abbreviation ||
            "",

          leagueId
        };
      }
    }
  } catch {
    return null;
  }

  return null;
}


/* =========================================================
   RESOLVE TEAM
   ========================================================= */

export async function resolveFootballTeam(
  query
) {
  const detected =
    TEAM_ALIASES[
      normalizeText(query)
    ];

  const searchName =
    detected ||
    query;

  /*
    Search the global ESPN index first.
  */

  const globalResults =
    await searchFootballTeams(
      searchName
    );

  if (
    globalResults.length
  ) {
    const exact =
      globalResults.find(
        result =>
          normalizeText(
            result.name
          ) ===
          normalizeText(
            searchName
          )
      );

    if (exact) {
      return exact;
    }

    return globalResults[0];
  }

  /*
    Fallback to important leagues.
  */

  const priorityLeagues = [
    "eng.1",
    "esp.1",
    "ita.1",
    "ger.1",
    "fra.1",
    "uefa.champions",
    "uefa.wchampions",
    "usa.1",
    "zambia.1"
  ];

  for (
    const leagueId of priorityLeagues
  ) {
    const team =
      await findTeamInLeague(
        leagueId,
        searchName
      );

    if (team) {
      return team;
    }
  }

  return null;
}


/* =========================================================
   TEAM MATCHES
   ========================================================= */

export async function getTeamMatches(
  teamQuery,
  requestType = "next"
) {
  const team =
    await resolveFootballTeam(
      teamQuery
    );

  if (!team) {
    return {
      ok: false,
      message:
        `I could not find the football team "${teamQuery}".`,
      matches: []
    };
  }

  /*
    Some global search results may not include
    a league ID. Try important leagues.
  */

  if (!team.leagueId) {
    const fallback =
      await findTeamInLeague(
        "eng.1",
        team.name
      );

    if (fallback) {
      team.leagueId =
        fallback.leagueId;
    }
  }

  if (!team.leagueId) {
    return {
      ok: false,
      team,
      message:
        `I found ${team.name}, but I could not determine its competition.`,
      matches: []
    };
  }

  let data;

  try {
    data =
      await getTeamSchedule(
        team.leagueId,
        team.id
      );
  } catch (error) {
    return {
      ok: false,
      team,
      message:
        `I found ${team.name}, but its schedule could not be loaded.`,
      error: error.message,
      matches: []
    };
  }

  const events =
    Array.isArray(data?.events)
      ? data.events
      : [];

  const matches =
    events
      .map(event =>
        normalizeEvent(
          event,
          team.leagueName ||
          team.league ||
          "Football"
        )
      )
      .filter(
        match =>
          match.id
      );

  const now =
    Date.now();

  /*
    NEXT
  */

  if (
    requestType === "next"
  ) {
    const next =
      matches
        .filter(match => {
          const time =
            safeDate(
              match.date
            )?.getTime();

          return (
            Number.isFinite(time) &&
            time >= now &&
            match.status !== "completed"
          );
        })
        .sort(
          (a, b) =>
            new Date(a.date) -
            new Date(b.date)
        )[0];

    return {
      ok: true,
      team,
      requestType,
      matches:
        next ? [next] : []
    };
  }

  /*
    LAST
  */

  if (
    requestType === "last"
  ) {
    const previous =
      matches
        .filter(match => {
          const time =
            safeDate(
              match.date
            )?.getTime();

          return (
            Number.isFinite(time) &&
            time <= now &&
            match.status ===
              "completed"
          );
        })
        .sort(
          (a, b) =>
            new Date(b.date) -
            new Date(a.date)
        )[0];

    return {
      ok: true,
      team,
      requestType,
      matches:
        previous ? [previous] : []
    };
  }

  /*
    LIVE
  */

  if (
    requestType === "live"
  ) {
    const live =
      matches.filter(
        match =>
          match.status === "live"
      );

    return {
      ok: true,
      team,
      requestType,
      matches: live
    };
  }

  /*
    FIXTURES
  */

  if (
    requestType === "fixtures"
  ) {
    const fixtures =
      matches
        .filter(match => {
          const time =
            safeDate(
              match.date
            )?.getTime();

          return (
            Number.isFinite(time) &&
            time >= now
          );
        })
        .sort(
          (a, b) =>
            new Date(a.date) -
            new Date(b.date)
        );

    return {
      ok: true,
      team,
      requestType,
      matches: fixtures
    };
  }

  return {
    ok: true,
    team,
    requestType,
    matches
  };
}


/* =========================================================
   STANDINGS
   ========================================================= */

export async function getFootballStandings(
  leagueId
) {
  if (!leagueId) {
    throw new Error(
      "League ID is required."
    );
  }

  const url =
    `${STANDINGS_BASE}` +
    `/${leagueId}/standings`;

  const data =
    await fetchJson(url);

  return data;
}


/* =========================================================
   NORMALIZE STANDINGS
   ========================================================= */

function extractStandingsRows(
  data
) {
  const rows = [];

  const groups =
    Array.isArray(
      data?.children
    )
      ? data.children
      : [];

  /*
    Some competitions return
    groups/conferences.
  */

  for (
    const group of groups
  ) {
    const standings =
      group?.standings;

    const entries =
      standings?.entries ||
      [];

    for (
      const entry of entries
    ) {
      rows.push(entry);
    }
  }

  /*
    Some responses put standings
    directly at the top.
  */

  const directEntries =
    data?.standings?.entries ||
    [];

  if (
    directEntries.length
  ) {
    rows.push(
      ...directEntries
    );
  }

  return rows;
}


function getStat(
  entry,
  names = []
) {
  const stats =
    entry?.stats ||
    [];

  for (
    const name of names
  ) {
    const stat =
      stats.find(
        item =>
          item?.name === name ||
          item?.shortDisplayName === name ||
          item?.abbreviation === name
      );

    if (
      stat &&
      stat.value !== undefined
    ) {
      return stat.value;
    }
  }

  return null;
}


/* =========================================================
   FORMAT STANDINGS
   ========================================================= */

export function formatFootballStandings(
  data,
  leagueName = "Football"
) {
  const entries =
    extractStandingsRows(
      data
    );

  if (!entries.length) {
    return (
      `No standings were returned for ${leagueName}.`
    );
  }

  const lines = [
    `${leagueName} — TABLE`,
    "",
    "Pos | Team | P | W | D | L | GD | Pts"
  ];

  entries.forEach(
    (entry, index) => {
      const team =
        entry?.team?.displayName ||
        entry?.team?.name ||
        "Unknown";

      const position =
        entry?.note?.rank ||
        entry?.rank ||
        index + 1;

      const played =
        getStat(
          entry,
          [
            "gamesPlayed",
            "GP",
            "played"
          ]
        ) ?? "-";

      const wins =
        getStat(
          entry,
          [
            "wins",
            "W"
          ]
        ) ?? "-";

      const draws =
        getStat(
          entry,
          [
            "ties",
            "draws",
            "D"
          ]
        ) ?? "-";

      const losses =
        getStat(
          entry,
          [
            "losses",
            "L"
          ]
        ) ?? "-";

      const goalDifference =
        getStat(
          entry,
          [
            "pointDifferential",
            "goalDifference",
            "GD"
          ]
        ) ?? "-";

      const points =
        getStat(
          entry,
          [
            "points",
            "PTS"
          ]
        ) ?? "-";

      lines.push(
        `${position} | ${team} | ${played} | ${wins} | ${draws} | ${losses} | ${goalDifference} | ${points}`
      );
    }
  );

  return lines.join("\n");
}


/* =========================================================
   MATCH SUMMARY
   ========================================================= */

export async function getFootballMatchSummary(
  leagueId,
  eventId
) {
  if (
    !leagueId ||
    !eventId
  ) {
    throw new Error(
      "League ID and event ID are required."
    );
  }

  const url =
    `${SITE_BASE}/${leagueId}` +
    `/summary?event=${eventId}`;

  return await fetchJson(
    url
  );
}


/* =========================================================
   FORMAT MATCHES
   ========================================================= */

export function formatFootballMatches(
  matches = []
) {
  if (
    !Array.isArray(matches) ||
    !matches.length
  ) {
    return (
      "No football matches were found."
    );
  }

  return matches
    .map(match => {
      const score =
        match.homeScore !== null &&
        match.awayScore !== null
          ? ` — ${match.homeScore}-${match.awayScore}`
          : "";

      return [
        `${match.homeTeam} vs ${match.awayTeam}`,
        `Competition: ${match.competition}`,
        `Time (Zambia): ${match.timeZambia}`,
        `Status: ${match.statusText || match.status}`,
        `State: ${match.status}${score}`
      ].join(" | ");
    })
    .join("\n");
}


/* =========================================================
   FORMAT TEAM RESULT
   ========================================================= */

export function formatTeamMatches(
  result
) {
  if (!result?.ok) {
    return (
      result?.message ||
      "I could not find that football information."
    );
  }

  const teamName =
    result?.team?.name ||
    "Team";

  if (
    !result.matches?.length
  ) {
    if (
      result.requestType === "live"
    ) {
      return (
        `There is no match currently marked as live for ${teamName} in the available football data.`
      );
    }

    if (
      result.requestType === "next"
    ) {
      return (
        `No upcoming match was found for ${teamName} in the available football data.`
      );
    }

    if (
      result.requestType === "last"
    ) {
      return (
        `No completed recent result was found for ${teamName} in the available football data.`
      );
    }

    return (
      `No football matches were found for ${teamName}.`
    );
  }

  let heading =
    `${teamName} — FOOTBALL`;

  if (
    result.requestType === "next"
  ) {
    heading =
      `${teamName} — NEXT MATCH`;
  }

  if (
    result.requestType === "last"
  ) {
    heading =
      `${teamName} — LAST RESULT`;
  }

  if (
    result.requestType === "live"
  ) {
    heading =
      `${teamName} — LIVE`;
  }

  if (
    result.requestType === "fixtures"
  ) {
    heading =
      `${teamName} — FIXTURES`;
  }

  return [
    heading,
    "",
    formatFootballMatches(
      result.matches
    )
  ].join("\n");
}


/* =========================================================
   DAILY FOOTBALL FEATURE
   ========================================================= */

export async function footballFeature(
  date = getZambiaDate()
) {
  try {
    const matches =
      await getFootballMatches(
        date
      );

    return {
      ok: true,
      date,
      matches,
      text:
        formatFootballMatches(
          matches
        )
    };
  } catch (error) {
    return {
      ok: false,
      date,
      matches: [],
      text:
        "Worldwide football data is temporarily unavailable.",
      error: error.message
    };
  }
}


/* =========================================================
   TEAM FEATURE
   ========================================================= */

export async function footballTeamFeature(
  userMessage = ""
) {
  const detected =
    detectFootballTeam(
      userMessage
    );

  if (!detected) {
    return {
      ok: false,
      text:
        "No specific football team was detected."
    };
  }

  const requestType =
    getFootballRequestType(
      userMessage
    );

  /*
    If the user asks for standings,
    that is a league request rather
    than a team request.
  */

  if (
    requestType ===
    "standings"
  ) {
    const league =
      detectFootballLeague(
        userMessage
      );

    if (!league) {
      return {
        ok: false,
        text:
          "Please specify the football league or competition whose table you want."
      };
    }

    try {
      const standings =
        await getFootballStandings(
          league.id
        );

      return {
        ok: true,
        requestType,
        league,
        text:
          formatFootballStandings(
            standings,
            league.name
          )
      };
    } catch (error) {
      return {
        ok: false,
        requestType,
        league,
        text:
          `I could not load the ${league.name} standings right now.`,
        error:
          error.message
      };
    }
  }

  const result =
    await getTeamMatches(
      detected.name,
      requestType === "general"
        ? "next"
        : requestType
    );

  return {
    ...result,
    text:
      formatTeamMatches(
        result
      )
  };
}


/* =========================================================
   LEAGUE FEATURE
   ========================================================= */

export async function footballLeagueFeature(
  userMessage = "",
  date = getZambiaDate()
) {
  const league =
    detectFootballLeague(
      userMessage
    );

  if (!league) {
    return {
      ok: false,
      text:
        "I could not identify the football league."
    };
  }

  const requestType =
    getFootballRequestType(
      userMessage
    );

  /*
    Standings
  */

  if (
    requestType ===
    "standings"
  ) {
    try {
      const data =
        await getFootballStandings(
          league.id
        );

      return {
        ok: true,
        requestType,
        league,
        text:
          formatFootballStandings(
            data,
            league.name
          )
      };
    } catch (error) {
      return {
        ok: false,
        requestType,
        league,
        text:
          `I could not load ${league.name} standings right now.`,
        error:
          error.message
      };
    }
  }

  /*
    Fixtures / scores
  */

  try {
    const matches =
      await getLeagueMatches(
        league.id,
        date
      );

    return {
      ok: true,
      requestType,
      league,
      matches,
      text:
        matches.length
          ? formatFootballMatches(
              matches
            )
          : `No ${league.name} matches were found for ${date}.`
    };
  } catch (error) {
    return {
      ok: false,
      requestType,
      league,
      matches: [],
      text:
        `I could not load ${league.name} football data right now.`,
      error:
        error.message
    };
  }
}


/* =========================================================
   EXPORT LEAGUE RESOLVER
   ========================================================= */

export function resolveFootballLeague(
  query = ""
) {
  const clean =
    normalizeText(query);

  const id =
    LEAGUE_ALIASES[clean];

  if (!id) {
    return null;
  }

  const league =
    Object.values(
      FOOTBALL_LEAGUES
    ).find(
      item =>
        item.id === id
    );

  return (
    league || {
      name: query,
      id
    }
  );
}
