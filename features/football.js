// features/football.js

const SITE_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/soccer";

const STANDINGS_BASE =
  "https://site.api.espn.com/apis/v2/sports/soccer";

const ZAMBIA_TIMEZONE = "Africa/Lusaka";

const REQUEST_TIMEOUT = 15000;

/*
========================================================
FOOTBALL LEAGUES
========================================================
*/

const FOOTBALL_LEAGUES = {
  premierLeague: {
    id: "eng.1",
    name: "Premier League",
    aliases: [
      "premier league",
      "epl",
      "english premier league",
      "england premier league"
    ]
  },

  championship: {
    id: "eng.2",
    name: "Championship",
    aliases: [
      "championship",
      "english championship",
      "efl championship"
    ]
  },

  laLiga: {
    id: "esp.1",
    name: "La Liga",
    aliases: [
      "la liga",
      "laliga",
      "spanish league",
      "spanish la liga"
    ]
  },

  serieA: {
    id: "ita.1",
    name: "Serie A",
    aliases: [
      "serie a",
      "italian league",
      "italian serie a"
    ]
  },

  bundesliga: {
    id: "ger.1",
    name: "Bundesliga",
    aliases: [
      "bundesliga",
      "german league",
      "german bundesliga"
    ]
  },

  ligue1: {
    id: "fra.1",
    name: "Ligue 1",
    aliases: [
      "ligue 1",
      "ligue one",
      "french league",
      "french ligue 1"
    ]
  },

  championsLeague: {
    id: "uefa.champions",
    name: "UEFA Champions League",
    aliases: [
      "champions league",
      "uefa champions league",
      "ucl"
    ]
  },

  europaLeague: {
    id: "uefa.europa",
    name: "UEFA Europa League",
    aliases: [
      "europa league",
      "uefa europa league"
    ]
  },

  conferenceLeague: {
    id: "uefa.europa.conf",
    name: "UEFA Conference League",
    aliases: [
      "conference league",
      "europa conference league",
      "uefa conference league"
    ]
  },

  womensChampionsLeague: {
    id: "uefa.wchampions",
    name: "UEFA Women's Champions League",
    aliases: [
      "womens champions league",
      "women's champions league",
      "uwcl",
      "uefa women's champions league"
    ]
  },

  mls: {
    id: "usa.1",
    name: "MLS",
    aliases: [
      "mls",
      "major league soccer"
    ]
  },

  ligaMX: {
    id: "mex.1",
    name: "Liga MX",
    aliases: [
      "liga mx",
      "mexican league"
    ]
  },

  brazil: {
    id: "bra.1",
    name: "Brazilian Serie A",
    aliases: [
      "brazilian serie a",
      "brazil serie a",
      "brasileirao",
      "brazil league"
    ]
  },

  argentina: {
    id: "arg.1",
    name: "Argentine Primera Division",
    aliases: [
      "argentine league",
      "argentina league",
      "argentine primera",
      "liga argentina"
    ]
  },

  colombia: {
    id: "col.1",
    name: "Colombian Primera A",
    aliases: [
      "colombian league",
      "colombia league",
      "primera a colombia"
    ]
  },

  saudi: {
    id: "ksa.1",
    name: "Saudi Pro League",
    aliases: [
      "saudi pro league",
      "saudi league"
    ]
  },

  japan: {
    id: "jpn.1",
    name: "J.League",
    aliases: [
      "j league",
      "j.league",
      "japanese league"
    ]
  },

  korea: {
    id: "kor.1",
    name: "K League 1",
    aliases: [
      "k league",
      "k league 1",
      "korean league"
    ]
  },

  australia: {
    id: "aus.1",
    name: "A-League Men",
    aliases: [
      "a league",
      "a-league",
      "a league men",
      "australian league"
    ]
  },

  southAfrica: {
    id: "rsa.1",
    name: "South African Premiership",
    aliases: [
      "south african premiership",
      "south africa league",
      "psl south africa",
      "south african league"
    ]
  },

  nigeria: {
    id: "nga.1",
    name: "Nigerian Professional League",
    aliases: [
      "nigerian league",
      "nigeria league",
      "npfl"
    ]
  },

  ghana: {
    id: "gha.1",
    name: "Ghanaian Premier League",
    aliases: [
      "ghanaian league",
      "ghana league",
      "ghana premier league"
    ]
  },

  saudiKingsCup: {
    id: "ksa.kings.cup",
    name: "Saudi King's Cup",
    aliases: [
      "saudi kings cup",
      "king's cup"
    ]
  },

  cafChampions: {
    id: "caf.champions",
    name: "CAF Champions League",
    aliases: [
      "caf champions league",
      "caf champions"
    ]
  },

  cafConfederation: {
    id: "caf.confed",
    name: "CAF Confederation Cup",
    aliases: [
      "caf confederation cup",
      "caf confederation"
    ]
  },

  afcChampions: {
    id: "afc.champions",
    name: "AFC Champions League Elite",
    aliases: [
      "afc champions league",
      "afc champions league elite"
    ]
  },

  worldCup: {
    id: "fifa.world",
    name: "FIFA World Cup",
    aliases: [
      "world cup",
      "fifa world cup"
    ]
  },

  womensWorldCup: {
    id: "fifa.wwc",
    name: "FIFA Women's World Cup",
    aliases: [
      "women's world cup",
      "womens world cup",
      "fifa women's world cup"
    ]
  },

  afcon: {
    id: "caf.nations",
    name: "Africa Cup of Nations",
    aliases: [
      "afcon",
      "africa cup of nations",
      "african cup of nations"
    ]
  },

  afconQualifying: {
    id: "caf.nations_qual",
    name: "AFCON Qualifying",
    aliases: [
      "afcon qualifying",
      "africa cup qualifiers"
    ]
  },

  worldCupQualifying: {
    id: "fifa.worldq",
    name: "FIFA World Cup Qualifying",
    aliases: [
      "world cup qualifiers",
      "fifa world cup qualifiers",
      "world cup qualifying"
    ]
  },

  clubWorldCup: {
    id: "fifa.cwc",
    name: "FIFA Club World Cup",
    aliases: [
      "club world cup",
      "fifa club world cup"
    ]
  }
};

const LEAGUE_ALIASES = Object.values(FOOTBALL_LEAGUES)
  .flatMap(league =>
    league.aliases.map(alias => ({
      alias,
      league
    }))
  )
  .sort((a, b) => b.alias.length - a.alias.length);


/*
========================================================
TEAM ALIASES
========================================================
*/

const TEAM_ALIASES = [
  {
    name: "Arsenal",
    aliases: [
      "arsenal",
      "arsenal fc",
      "gunners"
    ],
    leagueIds: ["eng.1"]
  },

  {
    name: "Chelsea",
    aliases: [
      "chelsea",
      "chelsea fc"
    ],
    leagueIds: ["eng.1"]
  },

  {
    name: "Liverpool",
    aliases: [
      "liverpool",
      "liverpool fc"
    ],
    leagueIds: ["eng.1"]
  },

  {
    name: "Manchester United",
    aliases: [
      "manchester united",
      "man united",
      "man utd",
      "man u"
    ],
    leagueIds: ["eng.1"]
  },

  {
    name: "Manchester City",
    aliases: [
      "manchester city",
      "man city"
    ],
    leagueIds: ["eng.1"]
  },

  {
    name: "Tottenham Hotspur",
    aliases: [
      "tottenham",
      "spurs",
      "tottenham hotspur"
    ],
    leagueIds: ["eng.1"]
  },

  {
    name: "Newcastle United",
    aliases: [
      "newcastle",
      "newcastle united"
    ],
    leagueIds: ["eng.1"]
  },

  {
    name: "Aston Villa",
    aliases: [
      "aston villa"
    ],
    leagueIds: ["eng.1"]
  },

  {
    name: "Barcelona",
    aliases: [
      "barcelona",
      "barca",
      "fc barcelona"
    ],
    leagueIds: ["esp.1"]
  },

  {
    name: "Real Madrid",
    aliases: [
      "real madrid",
      "madrid"
    ],
    leagueIds: ["esp.1"]
  },

  {
    name: "Atletico Madrid",
    aliases: [
      "atletico madrid",
      "atlético madrid",
      "atletico"
    ],
    leagueIds: ["esp.1"]
  },

  {
    name: "Bayern Munich",
    aliases: [
      "bayern",
      "bayern munich",
      "bayern münchen"
    ],
    leagueIds: ["ger.1"]
  },

  {
    name: "Borussia Dortmund",
    aliases: [
      "borussia dortmund",
      "dortmund"
    ],
    leagueIds: ["ger.1"]
  },

  {
    name: "Bayer Leverkusen",
    aliases: [
      "bayer leverkusen",
      "leverkusen"
    ],
    leagueIds: ["ger.1"]
  },

  {
    name: "RB Leipzig",
    aliases: [
      "rb leipzig",
      "leipzig"
    ],
    leagueIds: ["ger.1"]
  },

  {
    name: "Juventus",
    aliases: [
      "juventus",
      "juve"
    ],
    leagueIds: ["ita.1"]
  },

  {
    name: "Inter Milan",
    aliases: [
      "inter milan",
      "inter",
      "internazionale"
    ],
    leagueIds: ["ita.1"]
  },

  {
    name: "AC Milan",
    aliases: [
      "ac milan",
      "milan"
    ],
    leagueIds: ["ita.1"]
  },

  {
    name: "Napoli",
    aliases: [
      "napoli"
    ],
    leagueIds: ["ita.1"]
  },

  {
    name: "Paris Saint-Germain",
    aliases: [
      "psg",
      "paris saint germain",
      "paris saint-germain"
    ],
    leagueIds: ["fra.1"]
  },

  {
    name: "Olympique Lyonnais",
    aliases: [
      "lyon",
      "ol lyon",
      "olympique lyonnais"
    ],
    leagueIds: ["fra.1"]
  },

  {
    name: "Marseille",
    aliases: [
      "marseille",
      "olympique marseille"
    ],
    leagueIds: ["fra.1"]
  },

  {
    name: "Monaco",
    aliases: [
      "monaco",
      "as monaco"
    ],
    leagueIds: ["fra.1"]
  },

  {
    name: "Ajax",
    aliases: [
      "ajax",
      "ajax amsterdam"
    ],
    leagueIds: ["ned.1"]
  },

  {
    name: "PSV Eindhoven",
    aliases: [
      "psv",
      "psv eindhoven"
    ],
    leagueIds: ["ned.1"]
  },

  {
    name: "Benfica",
    aliases: [
      "benfica",
      "sl benfica"
    ],
    leagueIds: ["por.1"]
  },

  {
    name: "Porto",
    aliases: [
      "porto",
      "fc porto"
    ],
    leagueIds: ["por.1"]
  },

  {
    name: "Al Hilal",
    aliases: [
      "al hilal",
      "al-hilal"
    ],
    leagueIds: ["ksa.1"]
  },

  {
    name: "Al Nassr",
    aliases: [
      "al nassr",
      "al-nassr"
    ],
    leagueIds: ["ksa.1"]
  },

  {
    name: "Mamelodi Sundowns",
    aliases: [
      "mamelodi sundowns",
      "sundowns"
    ],
    leagueIds: ["rsa.1"]
  },

  {
    name: "Kaizer Chiefs",
    aliases: [
      "kaizer chiefs"
    ],
    leagueIds: ["rsa.1"]
  },

  {
    name: "Al Ahly",
    aliases: [
      "al ahly",
      "al-ahly"
    ],
    leagueIds: ["egy.1"]
  },

  {
    name: "Zamalek",
    aliases: [
      "zamalek"
    ],
    leagueIds: ["egy.1"]
  },

  {
    name: "Young Africans",
    aliases: [
      "young africans",
      "yanga"
    ],
    leagueIds: []
  },

  {
    name: "TP Mazembe",
    aliases: [
      "tp mazembe",
      "mazembe"
    ],
    leagueIds: []
  },

  {
    name: "Zambia",
    aliases: [
      "zambia",
      "chipolopolo",
      "zambian national team"
    ],
    leagueIds: [
      "fifa.worldq",
      "caf.nations",
      "fifa.friendly"
    ]
  },

  {
    name: "Malawi",
    aliases: [
      "malawi",
      "malawi national team",
      "the flames"
    ],
    leagueIds: [
      "fifa.worldq",
      "caf.nations",
      "fifa.friendly"
    ]
  },

  {
    name: "Nigeria",
    aliases: [
      "nigeria",
      "nigeria national team",
      "super eagles"
    ],
    leagueIds: [
      "fifa.worldq",
      "caf.nations",
      "fifa.friendly"
    ]
  },

  {
    name: "Ghana",
    aliases: [
      "ghana",
      "ghana national team",
      "black stars"
    ],
    leagueIds: [
      "fifa.worldq",
      "caf.nations",
      "fifa.friendly"
    ]
  },

  {
    name: "South Africa",
    aliases: [
      "south africa",
      "south africa national team",
      "bafana bafana"
    ],
    leagueIds: [
      "fifa.worldq",
      "caf.nations",
      "fifa.friendly"
    ]
  },

  {
    name: "Egypt",
    aliases: [
      "egypt",
      "egypt national team",
      "pharaohs"
    ],
    leagueIds: [
      "fifa.worldq",
      "caf.nations",
      "fifa.friendly"
    ]
  },

  {
    name: "Morocco",
    aliases: [
      "morocco",
      "morocco national team",
      "atlas lions"
    ],
    leagueIds: [
      "fifa.worldq",
      "caf.nations",
      "fifa.friendly"
    ]
  },

  {
    name: "Brazil",
    aliases: [
      "brazil",
      "brazil national team"
    ],
    leagueIds: [
      "fifa.worldq",
      "fifa.world",
      "fifa.friendly"
    ]
  },

  {
    name: "Argentina",
    aliases: [
      "argentina",
      "argentina national team"
    ],
    leagueIds: [
      "fifa.worldq",
      "fifa.world",
      "fifa.friendly"
    ]
  },

  {
    name: "France",
    aliases: [
      "france",
      "france national team"
    ],
    leagueIds: [
      "fifa.worldq",
      "fifa.world",
      "fifa.friendly"
    ]
  },

  {
    name: "Germany",
    aliases: [
      "germany",
      "germany national team"
    ],
    leagueIds: [
      "fifa.worldq",
      "fifa.world",
      "fifa.friendly"
    ]
  },

  {
    name: "Spain",
    aliases: [
      "spain",
      "spain national team"
    ],
    leagueIds: [
      "fifa.worldq",
      "fifa.world",
      "fifa.friendly"
    ]
  },

  {
    name: "Italy",
    aliases: [
      "italy",
      "italy national team"
    ],
    leagueIds: [
      "fifa.worldq",
      "fifa.world",
      "fifa.friendly"
    ]
  },

  {
    name: "England",
    aliases: [
      "england",
      "england national team"
    ],
    leagueIds: [
      "fifa.worldq",
      "fifa.world",
      "fifa.friendly"
    ]
  },

  {
    name: "Portugal",
    aliases: [
      "portugal",
      "portugal national team"
    ],
    leagueIds: [
      "fifa.worldq",
      "fifa.world",
      "fifa.friendly"
    ]
  },

  {
    name: "Netherlands",
    aliases: [
      "netherlands",
      "holland",
      "netherlands national team"
    ],
    leagueIds: [
      "fifa.worldq",
      "fifa.world",
      "fifa.friendly"
    ]
  }
];


/*
========================================================
HELPERS
========================================================
*/

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZAMBIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const get = type =>
    parts.find(part => part.type === type)?.value || "";

  return `${get("year")}${get("month")}${get("day")}`;
}

function getZambiaDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZAMBIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const year =
    parts.find(p => p.type === "year")?.value;

  const month =
    parts.find(p => p.type === "month")?.value;

  const day =
    parts.find(p => p.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function formatZambiaTime(value) {
  if (!value) return "Time unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat("en-ZM", {
    timeZone: ZAMBIA_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function safeDate(value) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

async function fetchJson(url) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT
    );

  try {
    const response =
      await fetch(url, {
        headers: {
          Accept: "application/json"
        },
        signal: controller.signal
      });

    if (!response.ok) {
      throw new Error(
        `ESPN request failed: ${response.status}`
      );
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function eventState(event) {
  const type =
    event?.status?.type || {};

  const state =
    type.state ||
    (type.completed ? "post" : "pre");

  if (
    state === "in" ||
    state === "live"
  ) {
    return "live";
  }

  if (
    state === "post" ||
    type.completed
  ) {
    return "completed";
  }

  return "scheduled";
}

function eventScore(event) {
  const competitors =
    event?.competitions?.[0]?.competitors || [];

  const home =
    competitors.find(
      c => c.homeAway === "home"
    );

  const away =
    competitors.find(
      c => c.homeAway === "away"
    );

  return {
    home:
      home?.score ??
      home?.score?.displayValue ??
      null,

    away:
      away?.score ??
      away?.score?.displayValue ??
      null
  };
}

function normalizeEvent(
  event,
  leagueName = ""
) {
  if (!event) return null;

  const competitors =
    event.competitions?.[0]?.competitors || [];

  const home =
    competitors.find(
      c => c.homeAway === "home"
    );

  const away =
    competitors.find(
      c => c.homeAway === "away"
    );

  if (!home || !away) {
    return null;
  }

  const state =
    eventState(event);

  const score =
    eventScore(event);

  const eventDate =
    safeDate(event.date);

  return {
    id: event.id,

    league:
      leagueName ||
      event.league?.name ||
      event.competitions?.[0]?.league?.name ||
      "Football",

    homeTeam:
      home.team?.displayName ||
      home.team?.name ||
      "Home team",

    awayTeam:
      away.team?.displayName ||
      away.team?.name ||
      "Away team",

    homeTeamId:
      home.team?.id || null,

    awayTeamId:
      away.team?.id || null,

    homeScore:
      score.home,

    awayScore:
      score.away,

    state,

    status:
      event.status?.type?.shortDetail ||
      event.status?.type?.detail ||
      event.status?.type?.description ||
      (state === "live"
        ? "Live"
        : state === "completed"
          ? "Completed"
          : "Scheduled"),

    date:
      event.date || null,

    parsedDate:
      eventDate,

    time:
      formatZambiaTime(event.date),

    venue:
      event.competitions?.[0]?.venue?.fullName ||
      event.competitions?.[0]?.venue?.address?.city ||
      null
  };
}


/*
========================================================
LEAGUE DETECTION
========================================================
*/

function detectFootballLeague(
  userMessage = ""
) {
  const text =
    normalizeText(userMessage);

  for (const item of LEAGUE_ALIASES) {
    if (text.includes(normalizeText(item.alias))) {
      return item.league;
    }
  }

  return null;
}

function resolveFootballLeague(
  userMessage = ""
) {
  return detectFootballLeague(userMessage);
}


/*
========================================================
TEAM DETECTION
========================================================
*/

function detectFootballTeam(
  userMessage = ""
) {
  const text =
    normalizeText(userMessage);

  let best = null;

  for (const team of TEAM_ALIASES) {
    for (const alias of team.aliases) {
      const normalizedAlias =
        normalizeText(alias);

      if (
        text === normalizedAlias ||
        text.includes(normalizedAlias)
      ) {
        if (
          !best ||
          normalizedAlias.length >
            best.alias.length
        ) {
          best = {
            ...team,
            alias: normalizedAlias
          };
        }
      }
    }
  }

  return best;
}


/*
========================================================
REQUEST TYPE
========================================================
*/

function getFootballRequestType(
  userMessage = ""
) {
  const text =
    normalizeText(userMessage);

  if (
    /\b(live|right now|currently|now)\b/.test(text)
  ) {
    return "live";
  }

  if (
    /\b(last result|last match|previous match|previous result|latest result|recent result|what was.*result)\b/.test(text)
  ) {
    return "last";
  }

  if (
    /\b(next match|next game|upcoming|coming match|when.*play|when.*playing|next fixture)\b/.test(text)
  ) {
    return "next";
  }

  if (
    /\b(fixtures|fixture|schedule|matches|games)\b/.test(text)
  ) {
    return "fixtures";
  }

  if (
    /\b(table|standings|position|positions)\b/.test(text)
  ) {
    return "standings";
  }

  if (
    /\b(score|scores|result|results)\b/.test(text)
  ) {
    return "results";
  }

  return "general";
}


/*
========================================================
LEAGUE SCOREBOARD
========================================================
*/

async function getLeagueMatches(
  leagueId,
  date = compactDate()
) {
  const url =
    `${SITE_BASE}/${leagueId}/scoreboard?dates=${date}`;

  const data =
    await fetchJson(url);

  const leagueName =
    data?.leagues?.[0]?.name ||
    Object.values(FOOTBALL_LEAGUES)
      .find(l => l.id === leagueId)
      ?.name ||
    "Football";

  return (data?.events || [])
    .map(event =>
      normalizeEvent(
        event,
        leagueName
      )
    )
    .filter(Boolean);
}


/*
========================================================
WORLDWIDE DAILY FOOTBALL
========================================================
*/

async function getFootballMatches(
  date = compactDate()
) {
  const leagueEntries =
    Object.values(FOOTBALL_LEAGUES);

  const results =
    await Promise.allSettled(
      leagueEntries.map(league =>
        getLeagueMatches(
          league.id,
          date
        )
      )
    );

  const matches = [];

  for (const result of results) {
    if (
      result.status === "fulfilled" &&
      Array.isArray(result.value)
    ) {
      matches.push(
        ...result.value
      );
    }
  }

  const unique =
    new Map();

  for (const match of matches) {
    if (!unique.has(match.id)) {
      unique.set(
        match.id,
        match
      );
    }
  }

  return Array.from(
    unique.values()
  ).sort((a, b) => {
    const aTime =
      a.parsedDate?.getTime() || 0;

    const bTime =
      b.parsedDate?.getTime() || 0;

    return aTime - bTime;
  });
}


/*
========================================================
TEAM CATALOGUE
========================================================
*/

async function getLeagueTeams(
  leagueId
) {
  const url =
    `${SITE_BASE}/${leagueId}/teams`;

  const data =
    await fetchJson(url);

  const teams = [];

  const sports =
    data?.sports || [];

  for (const sport of sports) {
    for (
      const league of sport?.leagues || []
    ) {
      for (
        const item of league?.teams || []
      ) {
        if (item?.team) {
          teams.push(item.team);
        }
      }
    }
  }

  if (
    Array.isArray(data?.teams)
  ) {
    teams.push(
      ...data.teams
        .map(item =>
          item?.team || item
        )
        .filter(Boolean)
    );
  }

  return teams;
}


/*
========================================================
RESOLVE TEAM
========================================================
*/

async function findTeamInLeague(
  team,
  leagueId
) {
  try {
    const teams =
      await getLeagueTeams(
        leagueId
      );

    const wanted =
      normalizeText(team.name);

    const aliases =
      team.aliases.map(
        normalizeText
      );

    let exact =
      teams.find(apiTeam => {
        const names = [
          apiTeam.displayName,
          apiTeam.name,
          apiTeam.shortDisplayName,
          apiTeam.abbreviation
        ]
          .filter(Boolean)
          .map(normalizeText);

        return names.some(
          name =>
            name === wanted ||
            aliases.includes(name)
        );
      });

    if (exact) {
      return {
        ...exact,
        leagueId
      };
    }

    exact =
      teams.find(apiTeam => {
        const names = [
          apiTeam.displayName,
          apiTeam.name,
          apiTeam.shortDisplayName
        ]
          .filter(Boolean)
          .map(normalizeText);

        return names.some(
          name =>
            name.includes(wanted) ||
            wanted.includes(name)
        );
      });

    if (exact) {
      return {
        ...exact,
        leagueId
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function resolveFootballTeam(
  team
) {
  if (!team) return null;

  /*
  Try the team's known competitions first.
  This is more reliable than depending on
  global search results.
  */

  for (const leagueId of team.leagueIds || []) {
    const found =
      await findTeamInLeague(
        team,
        leagueId
      );

    if (found) {
      return found;
    }
  }

  /*
  Then try the major club leagues as a
  fallback for common club teams.
  */

  const fallbackLeagues = [
    "eng.1",
    "esp.1",
    "ita.1",
    "ger.1",
    "fra.1",
    "usa.1",
    "ksa.1",
    "rsa.1",
    "nga.1",
    "gha.1"
  ];

  for (const leagueId of fallbackLeagues) {
    if (
      team.leagueIds?.includes(
        leagueId
      )
    ) {
      continue;
    }

    const found =
      await findTeamInLeague(
        team,
        leagueId
      );

    if (found) {
      return found;
    }
  }

  return null;
}


/*
========================================================
TEAM SCHEDULE
========================================================
*/

async function getTeamSchedule(
  leagueId,
  teamId
) {
  const url =
    `${SITE_BASE}/${leagueId}/teams/${teamId}/schedule`;

  const data =
    await fetchJson(url);

  const leagueName =
    data?.team?.displayName ||
    Object.values(FOOTBALL_LEAGUES)
      .find(l => l.id === leagueId)
      ?.name ||
    "Football";

  return (data?.events || [])
    .map(event =>
      normalizeEvent(
        event,
        leagueName
      )
    )
    .filter(Boolean);
}


/*
========================================================
TEAM MATCHES
========================================================
*/

async function getTeamMatches(
  teamQuery,
  requestType = "general"
) {
  const detected =
    typeof teamQuery === "string"
      ? detectFootballTeam(
          teamQuery
        )
      : teamQuery;

  if (!detected) {
    return {
      team: null,
      matches: []
    };
  }

  const resolved =
    await resolveFootballTeam(
      detected
    );

  if (!resolved) {
    return {
      team: detected,
      matches: []
    };
  }

  const leagueIds = [
    resolved.leagueId,
    ...(detected.leagueIds || [])
  ].filter(Boolean);

  const uniqueLeagueIds = [
    ...new Set(leagueIds)
  ];

  const allMatches = [];

  for (const leagueId of uniqueLeagueIds) {
    try {
      const matches =
        await getTeamSchedule(
          leagueId,
          resolved.id
        );

      allMatches.push(
        ...matches
      );
    } catch {
      /*
      Continue if one competition
      is unavailable.
      */
    }
  }

  const unique =
    new Map();

  for (const match of allMatches) {
    if (!unique.has(match.id)) {
      unique.set(
        match.id,
        match
      );
    }
  }

  let matches =
    Array.from(
      unique.values()
    );

  const now =
    Date.now();

  if (requestType === "live") {
    matches =
      matches.filter(
        match =>
          match.state === "live"
      );

  } else if (
    requestType === "last" ||
    requestType === "results"
  ) {
    matches =
      matches
        .filter(
          match =>
            match.state === "completed" &&
            match.parsedDate &&
            match.parsedDate.getTime() <= now
        )
        .sort(
          (a, b) =>
            b.parsedDate.getTime() -
            a.parsedDate.getTime()
        )
        .slice(0, 5);

  } else if (
    requestType === "next" ||
    requestType === "fixtures"
  ) {
    matches =
      matches
        .filter(
          match =>
            match.state !== "completed" &&
            match.parsedDate &&
            match.parsedDate.getTime() >= now
        )
        .sort(
          (a, b) =>
            a.parsedDate.getTime() -
            b.parsedDate.getTime()
        )
        .slice(0, 10);

  } else {
    matches =
      matches.sort(
        (a, b) => {
          const aTime =
            a.parsedDate?.getTime() || 0;

          const bTime =
            b.parsedDate?.getTime() || 0;

          return aTime - bTime;
        }
      ).slice(0, 10);
  }

  return {
    team: resolved,
    detected,
    matches
  };
}


/*
========================================================
STANDINGS
========================================================
*/

async function getFootballStandings(
  leagueId
) {
  const url =
    `${STANDINGS_BASE}/${leagueId}/standings`;

  const data =
    await fetchJson(url);

  return data;
}

function getStat(
  stats = [],
  names = []
) {
  const wanted =
    names.map(
      normalizeText
    );

  const stat =
    stats.find(item => {
      const name =
        normalizeText(
          item?.name ||
          item?.abbreviation ||
          item?.displayName ||
          ""
        );

      return wanted.includes(
        name
      );
    });

  if (!stat) {
    return null;
  }

  return (
    stat.value ??
    stat.displayValue ??
    null
  );
}

function extractStandingsRows(
  data
) {
  const rows = [];

  function walk(node) {
    if (!node) return;

    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item);
      }
      return;
    }

    if (
      typeof node !== "object"
    ) {
      return;
    }

    if (
      node.team &&
      (
        node.stats ||
        node.statistics
      )
    ) {
      rows.push(node);
    }

    if (node.entries) {
      walk(node.entries);
    }

    if (node.children) {
      walk(node.children);
    }

    if (node.standings) {
      walk(node.standings);
    }

    if (node.groups) {
      walk(node.groups);
    }
  }

  walk(data);

  return rows;
}

function formatFootballStandings(
  data,
  leagueName
) {
  const rows =
    extractStandingsRows(
      data
    );

  if (!rows.length) {
    return `No ${leagueName} standings are currently available.`;
  }

  const output = [
    `${leagueName} standings:`
  ];

  rows.forEach(
    (entry, index) => {
      const team =
        entry.team?.displayName ||
        entry.team?.name ||
        "Unknown team";

      const stats =
        entry.stats ||
        entry.statistics ||
        [];

      const played =
        getStat(
          stats,
          [
            "games played",
            "gp",
            "played"
          ]
        );

      const wins =
        getStat(
          stats,
          [
            "wins",
            "w"
          ]
        );

      const draws =
        getStat(
          stats,
          [
            "ties",
            "draws",
            "d"
          ]
        );

      const losses =
        getStat(
          stats,
          [
            "losses",
            "l"
          ]
        );

      const points =
        getStat(
          stats,
          [
            "points",
            "pts"
          ]
        );

      const goalDiff =
        getStat(
          stats,
          [
            "point differential",
            "goal differential",
            "gd"
          ]
        );

      output.push(
        `${index + 1}. ${team} — ` +
        `P:${played ?? "-"} ` +
        `W:${wins ?? "-"} ` +
        `D:${draws ?? "-"} ` +
        `L:${losses ?? "-"} ` +
        `GD:${goalDiff ?? "-"} ` +
        `Pts:${points ?? "-"}`
      );
    }
  );

  return output.join("\n");
}


/*
========================================================
FORMAT MATCHES
========================================================
*/

function formatFootballMatches(
  matches = [],
  title = "Football matches"
) {
  if (!matches.length) {
    return `${title}\nNo matches are currently available.`;
  }

  const lines = [
    title
  ];

  for (const match of matches) {
    let scoreText = "";

    if (
      match.homeScore !== null &&
      match.awayScore !== null
    ) {
      scoreText =
        ` — ${match.homeScore}-${match.awayScore}`;
    }

    lines.push(
      `• ${match.homeTeam} vs ${match.awayTeam}` +
      `${scoreText}` +
      ` | ${match.status}` +
      ` | ${match.time}` +
      ` | ${match.league}`
    );
  }

  return lines.join("\n");
}

function formatTeamMatches(
  teamName,
  matches,
  requestType
) {
  if (!matches.length) {
    if (requestType === "live") {
      return `No live match for ${teamName} is currently available.`;
    }

    if (
      requestType === "last" ||
      requestType === "results"
    ) {
      return `No completed recent result for ${teamName} is currently available.`;
    }

    if (
      requestType === "next" ||
      requestType === "fixtures"
    ) {
      return `No upcoming fixture for ${teamName} is currently available.`;
    }

    return `No football match data for ${teamName} is currently available.`;
  }

  let title;

  if (requestType === "live") {
    title =
      `Live match information for ${teamName}:`;
  } else if (
    requestType === "last" ||
    requestType === "results"
  ) {
    title =
      `Recent results for ${teamName}:`;
  } else if (
    requestType === "next"
  ) {
    title =
      `Next match for ${teamName}:`;
  } else if (
    requestType === "fixtures"
  ) {
    title =
      `Upcoming fixtures for ${teamName}:`;
  } else {
    title =
      `Football matches for ${teamName}:`;
  }

  return formatFootballMatches(
    matches,
    title
  );
}


/*
========================================================
TEAM FEATURE
========================================================
*/

async function footballTeamFeature(
  userMessage = ""
) {
  const team =
    detectFootballTeam(
      userMessage
    );

  if (!team) {
    return {
      text:
        "I could not identify the football team in that request."
    };
  }

  const requestType =
    getFootballRequestType(
      userMessage
    );

  if (
    requestType === "standings"
  ) {
    const league =
      detectFootballLeague(
        userMessage
      );

    if (!league) {
      return {
        text:
          `${team.name} was detected, but the league for the standings was not specified.`
      };
    }

    const data =
      await getFootballStandings(
        league.id
      );

    return {
      text:
        formatFootballStandings(
          data,
          league.name
        )
    };
  }

  const result =
    await getTeamMatches(
      team,
      requestType
    );

  return {
    text:
      formatTeamMatches(
        team.name,
        result.matches,
        requestType
      ),
    team: result.team,
    matches: result.matches
  };
}


/*
========================================================
LEAGUE FEATURE
========================================================
*/

async function footballLeagueFeature(
  userMessage = ""
) {
  const league =
    detectFootballLeague(
      userMessage
    );

  if (!league) {
    return {
      text:
        "I could not identify the football league in that request."
    };
  }

  const requestType =
    getFootballRequestType(
      userMessage
    );

  if (
    requestType === "standings"
  ) {
    const data =
      await getFootballStandings(
        league.id
      );

    return {
      text:
        formatFootballStandings(
          data,
          league.name
        )
    };
  }

  const matches =
    await getLeagueMatches(
      league.id
    );

  let filtered =
    matches;

  if (requestType === "live") {
    filtered =
      matches.filter(
        match =>
          match.state === "live"
      );
  } else if (
    requestType === "results"
  ) {
    filtered =
      matches.filter(
        match =>
          match.state === "completed"
      );
  } else if (
    requestType === "fixtures"
  ) {
    filtered =
      matches.filter(
        match =>
          match.state === "scheduled"
      );
  }

  let title =
    `${league.name} matches:`;

  if (requestType === "live") {
    title =
      `Live ${league.name} matches:`;
  } else if (
    requestType === "results"
  ) {
    title =
      `${league.name} results:`;
  } else if (
    requestType === "fixtures"
  ) {
    title =
      `${league.name} fixtures:`;
  }

  return {
    text:
      formatFootballMatches(
        filtered,
        title
      ),
    league,
    matches: filtered
  };
}


/*
========================================================
WORLDWIDE FOOTBALL FEATURE
========================================================
*/

async function footballFeature(
  date = compactDate()
) {
  const matches =
    await getFootballMatches(
      date
    );

  const dateText =
    getZambiaDate();

  return {
    text:
      formatFootballMatches(
        matches,
        `Worldwide football for ${dateText} (Zambia time):`
      ),
    matches,
    date: dateText
  };
}


/*
========================================================
OPTIONAL TEAM SEARCH
========================================================
*/

async function searchFootballTeams(
  query
) {
  const detected =
    detectFootballTeam(
      query
    );

  if (!detected) {
    return [];
  }

  const results = [];

  for (
    const leagueId of
    detected.leagueIds || []
  ) {
    const team =
      await findTeamInLeague(
        detected,
        leagueId
      );

    if (team) {
      results.push(team);
    }
  }

  return results;
}


/*
========================================================
EXPORTS
========================================================
*/

export {
  getFootballMatches,
  getLeagueMatches,
  getFootballForDate,
  getZambiaDate,
  formatFootballMatches,

  detectFootballTeam,
  detectFootballLeague,
  getFootballRequestType,

  searchFootballTeams,
  resolveFootballTeam,

  getTeamMatches,
  getFootballStandings,
  formatFootballStandings,

  footballFeature,
  footballTeamFeature,
  footballLeagueFeature,

  resolveFootballLeague
};


/*
========================================================
BACKWARD COMPATIBILITY
========================================================
*/

async function getFootballForDate(
  date
) {
  return getFootballMatches(
    String(date)
      .replace(/-/g, "")
  );
}
