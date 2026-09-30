// features/football.js

const SITE_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/soccer";

const STANDINGS_BASE =
  "https://site.api.espn.com/apis/v2/sports/soccer";

const ZAMBIA_TIMEZONE = "Africa/Lusaka";
const REQUEST_TIMEOUT = 15000;

const FOOTBALL_LEAGUES = [
  { key: "eng.1", name: "Premier League", country: "England" },
  { key: "eng.2", name: "Championship", country: "England" },
  { key: "esp.1", name: "La Liga", country: "Spain" },
  { key: "esp.2", name: "La Liga 2", country: "Spain" },
  { key: "ger.1", name: "Bundesliga", country: "Germany" },
  { key: "ger.2", name: "2. Bundesliga", country: "Germany" },
  { key: "ita.1", name: "Serie A", country: "Italy" },
  { key: "ita.2", name: "Serie B", country: "Italy" },
  { key: "fra.1", name: "Ligue 1", country: "France" },
  { key: "fra.2", name: "Ligue 2", country: "France" },
  { key: "ned.1", name: "Eredivisie", country: "Netherlands" },
  { key: "por.1", name: "Primeira Liga", country: "Portugal" },
  { key: "bel.1", name: "Belgian Pro League", country: "Belgium" },
  { key: "sco.1", name: "Scottish Premiership", country: "Scotland" },
  { key: "tur.1", name: "Turkish Super Lig", country: "Turkey" },
  { key: "gre.1", name: "Greek Super League", country: "Greece" },
  { key: "usa.1", name: "MLS", country: "USA" },
  { key: "mex.1", name: "Liga MX", country: "Mexico" },
  { key: "bra.1", name: "Brasileirao", country: "Brazil" },
  { key: "arg.1", name: "Argentine Primera", country: "Argentina" },
  { key: "col.1", name: "Colombian Primera A", country: "Colombia" },
  { key: "chi.1", name: "Chilean Primera", country: "Chile" },
  { key: "uru.1", name: "Uruguayan Primera", country: "Uruguay" },
  { key: "jpn.1", name: "J1 League", country: "Japan" },
  { key: "kor.1", name: "K League 1", country: "South Korea" },
  { key: "aus.1", name: "A-League", country: "Australia" },
  { key: "sau.1", name: "Saudi Pro League", country: "Saudi Arabia" },
  { key: "egy.1", name: "Egyptian Premier League", country: "Egypt" },
  { key: "rsa.1", name: "South African Premier Division", country: "South Africa" },
  { key: "nga.1", name: "Nigerian Premier League", country: "Nigeria" },
  { key: "gha.1", name: "Ghana Premier League", country: "Ghana" },
  { key: "zaf.1", name: "South African League", country: "South Africa" },
  { key: "ken.1", name: "Kenyan Premier League", country: "Kenya" },
  { key: "mar.1", name: "Moroccan Botola", country: "Morocco" },
  { key: "tun.1", name: "Tunisian Ligue 1", country: "Tunisia" },
  { key: "caf.champions", name: "CAF Champions League", country: "Africa" },
  { key: "caf.confed", name: "CAF Confederation Cup", country: "Africa" },
  { key: "afc.champions", name: "AFC Champions League", country: "Asia" },
  { key: "uefa.champions", name: "UEFA Champions League", country: "Europe" },
  { key: "uefa.europa", name: "UEFA Europa League", country: "Europe" },
  { key: "uefa.europa.conf", name: "UEFA Conference League", country: "Europe" },
  { key: "uefa.nations", name: "UEFA Nations League", country: "Europe" },
  { key: "fifa.world", name: "World Cup", country: "International" },
  { key: "fifa.worldq", name: "World Cup Qualifiers", country: "International" },
  { key: "caf.nations", name: "Africa Cup of Nations", country: "Africa" },
  { key: "caf.nations_qual", name: "AFCON Qualifiers", country: "Africa" }
];

const TEAM_ALIASES = {
  arsenal: ["Arsenal", "Arsenal FC"],
  chelsea: ["Chelsea", "Chelsea FC"],
  liverpool: ["Liverpool", "Liverpool FC"],
  "man united": ["Manchester United", "Man United", "Manchester Utd"],
  "man utd": ["Manchester United", "Man United", "Manchester Utd"],
  "manchester united": ["Manchester United", "Man United", "Manchester Utd"],
  "man city": ["Manchester City", "Man City"],
  "manchester city": ["Manchester City", "Man City"],
  tottenham: ["Tottenham Hotspur", "Tottenham"],
  spurs: ["Tottenham Hotspur", "Tottenham"],
  newcastle: ["Newcastle United", "Newcastle"],
  "aston villa": ["Aston Villa"],
  barcelona: ["Barcelona", "FC Barcelona"],
  "fc barcelona": ["Barcelona", "FC Barcelona"],
  "real madrid": ["Real Madrid"],
  atletico: ["Atletico Madrid", "Atlético Madrid"],
  "atletico madrid": ["Atletico Madrid", "Atlético Madrid"],
  bayern: ["Bayern Munich", "Bayern München"],
  "bayern munich": ["Bayern Munich", "Bayern München"],
  dortmund: ["Borussia Dortmund", "Dortmund"],
  juventus: ["Juventus"],
  inter: ["Inter Milan", "Inter"],
  "inter milan": ["Inter Milan", "Inter"],
  "ac milan": ["AC Milan"],
  napoli: ["Napoli"],
  psg: ["Paris Saint-Germain", "PSG"],
  lyon: ["Lyon", "Olympique Lyonnais"],
  marseille: ["Marseille", "Olympique de Marseille"],
  monaco: ["Monaco", "AS Monaco"],
  ajax: ["Ajax", "Ajax Amsterdam"],
  psv: ["PSV Eindhoven", "PSV"],
  benfica: ["Benfica"],
  porto: ["Porto"],
  "al hilal": ["Al Hilal"],
  "al nassr": ["Al Nassr"],
  "mamelodi sundowns": ["Mamelodi Sundowns"],
  "kaizer chiefs": ["Kaizer Chiefs"],
  "al ahly": ["Al Ahly"],
  "al ahly cairo": ["Al Ahly"],
  zamalek: ["Zamalek"],
  "young africans": ["Young Africans"],
  "tp mazembe": ["TP Mazembe"],
  zambia: ["Zambia"],
  malawi: ["Malawi"],
  nigeria: ["Nigeria"],
  ghana: ["Ghana"],
  "south africa": ["South Africa"],
  egypt: ["Egypt"],
  morocco: ["Morocco"],
  brazil: ["Brazil"],
  argentina: ["Argentina"],
  france: ["France"],
  germany: ["Germany"],
  spain: ["Spain"],
  italy: ["Italy"],
  england: ["England"],
  portugal: ["Portugal"],
  netherlands: ["Netherlands"]
};

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactDate(date) {
  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZAMBIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}

function getZambiaDate() {
  return compactDate(new Date());
}

function formatZambiaTime(date) {
  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat("en-ZM", {
    timeZone: ZAMBIA_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(d);
}

function safeDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function fetchJson(url) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Football API returned ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function eventState(event) {
  const state = event?.competitions?.[0]?.status?.type;

  if (!state) {
    return {
      name: "scheduled",
      completed: false,
      live: false
    };
  }

  return {
    name: state.name || "scheduled",
    completed: Boolean(state.completed),
    live: Boolean(state.state === "in")
  };
}

function eventScore(event, teamId) {
  const competition = event?.competitions?.[0];

  if (!competition?.competitors) {
    return null;
  }

  const team = competition.competitors.find(
    item => String(item.team?.id) === String(teamId)
  );

  if (!team) {
    return null;
  }

  return Number.isFinite(Number(team.score))
    ? Number(team.score)
    : null;
}

function normalizeEvent(event, league) {
  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors || [];

  const home = competitors.find(item => item.homeAway === "home");
  const away = competitors.find(item => item.homeAway === "away");

  const state = eventState(event);

  return {
    id: event?.id,
    date: event?.date,
    dateZambia: formatZambiaTime(event?.date),
    day: compactDate(event?.date),
    league: league?.name || "Football",
    leagueKey: league?.key || "",
    homeTeam: home?.team?.displayName || "Home",
    awayTeam: away?.team?.displayName || "Away",
    homeId: home?.team?.id || null,
    awayId: away?.team?.id || null,
    homeScore: eventScore(event, home?.team?.id),
    awayScore: eventScore(event, away?.team?.id),
    status: state.name,
    completed: state.completed,
    live: state.live,
    raw: event
  };
}

function detectFootballLeague(message = "") {
  const text = normalizeText(message);

  const leagueMatches = [
    ["premier league", "eng.1"],
    ["epl", "eng.1"],
    ["championship", "eng.2"],
    ["la liga", "esp.1"],
    ["bundesliga", "ger.1"],
    ["serie a", "ita.1"],
    ["serie b", "ita.2"],
    ["ligue 1", "fra.1"],
    ["ligue 2", "fra.2"],
    ["eredivisie", "ned.1"],
    ["primeira liga", "por.1"],
    ["mls", "usa.1"],
    ["major league soccer", "usa.1"],
    ["liga mx", "mex.1"],
    ["brasileirao", "bra.1"],
    ["brazilian league", "bra.1"],
    ["argentine league", "arg.1"],
    ["argentina primera", "arg.1"],
    ["j1 league", "jpn.1"],
    ["k league", "kor.1"],
    ["saudi pro league", "sau.1"],
    ["afcon", "caf.nations"],
    ["africa cup of nations", "caf.nations"],
    ["caf champions league", "caf.champions"],
    ["caf confederation cup", "caf.confed"],
    ["champions league", "uefa.champions"],
    ["europa league", "uefa.europa"],
    ["conference league", "uefa.europa.conf"],
    ["nations league", "uefa.nations"],
    ["world cup", "fifa.world"]
  ];

  for (const [phrase, key] of leagueMatches) {
    if (text.includes(phrase)) {
      return key;
    }
  }

  return null;
}

function resolveFootballLeague(key) {
  return FOOTBALL_LEAGUES.find(league => league.key === key) || null;
}

function detectFootballTeam(message = "") {
  const text = normalizeText(message);

  const keys = Object.keys(TEAM_ALIASES).sort(
    (a, b) => b.length - a.length
  );

  for (const key of keys) {
    if (text.includes(normalizeText(key))) {
      return {
        key,
        names: TEAM_ALIASES[key]
      };
    }
  }

  return null;
}

function getFootballRequestType(message = "") {
  const text = normalizeText(message);

  if (
    text.includes("live") ||
    text.includes("playing now") ||
    text.includes("right now") ||
    text.includes("currently playing")
  ) {
    return "live";
  }

  if (
    text.includes("last match") ||
    text.includes("last game") ||
    text.includes("previous match") ||
    text.includes("previous game") ||
    text.includes("latest result") ||
    text.includes("last result")
  ) {
    return "last";
  }

  if (
    text.includes("result") ||
    text.includes("results") ||
    text.includes("finished") ||
    text.includes("completed")
  ) {
    return "results";
  }

  if (
    text.includes("next match") ||
    text.includes("next game") ||
    text.includes("upcoming") ||
    text.includes("when do") ||
    text.includes("when is") ||
    text.includes("plays next") ||
    text.includes("play next")
  ) {
    return "next";
  }

  if (
    text.includes("fixture") ||
    text.includes("fixtures") ||
    text.includes("schedule")
  ) {
    return "fixtures";
  }

  if (
    text.includes("table") ||
    text.includes("standings") ||
    text.includes("position") ||
    text.includes("points")
  ) {
    return "standings";
  }

  return "general";
}

async function getLeagueMatches(league) {
  const url =
    `${SITE_BASE}/${league.key}/scoreboard` +
    `?limit=100`;

  try {
    const data = await fetchJson(url);

    return (data?.events || []).map(event =>
      normalizeEvent(event, league)
    );
  } catch {
    return [];
  }
}

async function getFootballMatches() {
  const results = await Promise.allSettled(
    FOOTBALL_LEAGUES.map(league => getLeagueMatches(league))
  );

  const matches = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      matches.push(...result.value);
    }
  }

  const unique = new Map();

  for (const match of matches) {
    if (match.id) {
      unique.set(String(match.id), match);
    }
  }

  return [...unique.values()].sort(
    (a, b) =>
      new Date(a.date).getTime() -
      new Date(b.date).getTime()
  );
}

async function getLeagueTeams(league) {
  const url = `${SITE_BASE}/${league.key}/teams`;

  try {
    const data = await fetchJson(url);

    return data?.sports?.[0]?.leagues?.[0]?.teams?.map(
      item => item.team
    ) || [];
  } catch {
    return [];
  }
}

function teamMatchesName(team, names) {
  if (!team) {
    return false;
  }

  const teamName = normalizeText(
    team.displayName ||
    team.name ||
    team.shortDisplayName ||
    team.abbreviation ||
    ""
  );

  return names.some(name => {
    const target = normalizeText(name);

    return (
      teamName === target ||
      teamName.includes(target) ||
      target.includes(teamName)
    );
  });
}

async function findTeamInLeague(league, names) {
  const teams = await getLeagueTeams(league);

  return (
    teams.find(team => teamMatchesName(team, names)) ||
    null
  );
}

/*
 * This is the important part for team searches.
 *
 * Instead of depending on today's scoreboard, we first find
 * the ESPN team ID and then ask ESPN directly for that team's
 * schedule.
 */

async function getTeamScheduleFromLeague(league, team) {
  if (!team?.id) {
    return [];
  }

  const url =
    `${SITE_BASE}/${league.key}/teams/${team.id}/schedule`;

  try {
    const data = await fetchJson(url);

    return (data?.events || []).map(event =>
      normalizeEvent(event, league)
    );
  } catch {
    return [];
  }
}

async function resolveFootballTeam(teamInfo) {
  if (!teamInfo) {
    return [];
  }

  const preferredLeagueKeys = [];

  const nameText = teamInfo.names.join(" ").toLowerCase();

  /*
   * Search the most likely competitions first.
   */
  if (
    nameText.includes("arsenal") ||
    nameText.includes("chelsea") ||
    nameText.includes("liverpool") ||
    nameText.includes("manchester") ||
    nameText.includes("tottenham") ||
    nameText.includes("newcastle") ||
    nameText.includes("aston villa")
  ) {
    preferredLeagueKeys.push(
      "eng.1",
      "uefa.champions",
      "uefa.europa",
      "uefa.europa.conf"
    );
  }

  if (
    nameText.includes("barcelona") ||
    nameText.includes("real madrid") ||
    nameText.includes("atletico")
  ) {
    preferredLeagueKeys.push(
      "esp.1",
      "uefa.champions",
      "uefa.europa"
    );
  }

  if (
    nameText.includes("bayern") ||
    nameText.includes("dortmund")
  ) {
    preferredLeagueKeys.push(
      "ger.1",
      "uefa.champions",
      "uefa.europa"
    );
  }

  if (
    nameText.includes("juventus") ||
    nameText.includes("inter") ||
    nameText.includes("milan") ||
    nameText.includes("napoli")
  ) {
    preferredLeagueKeys.push(
      "ita.1",
      "uefa.champions",
      "uefa.europa"
    );
  }

  if (
    nameText.includes("psg") ||
    nameText.includes("paris saint")
  ) {
    preferredLeagueKeys.push(
      "fra.1",
      "uefa.champions",
      "uefa.europa"
    );
  }

  if (
    nameText.includes("al hilal") ||
    nameText.includes("al nassr")
  ) {
    preferredLeagueKeys.push("sau.1", "afc.champions");
  }

  const preferred = [
    ...new Set(preferredLeagueKeys)
  ]
    .map(resolveFootballLeague)
    .filter(Boolean);

  const remaining = FOOTBALL_LEAGUES.filter(
    league =>
      !preferred.some(item => item.key === league.key)
  );

  const leaguesToSearch = [
    ...preferred,
    ...remaining
  ];

  /*
   * Search in batches so one slow/failed competition
   * does not stop the entire team lookup.
   */
  const foundSchedules = [];

  for (let i = 0; i < leaguesToSearch.length; i += 6) {
    const batch = leaguesToSearch.slice(i, i + 6);

    const results = await Promise.allSettled(
      batch.map(async league => {
        const team = await findTeamInLeague(
          league,
          teamInfo.names
        );

        if (!team) {
          return [];
        }

        return getTeamScheduleFromLeague(
          league,
          team
        );
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        foundSchedules.push(...result.value);
      }
    }

    /*
     * Once we have schedules, continue a little further
     * for competitions such as Champions League.
     */
    if (foundSchedules.length >= 10) {
      break;
    }
  }

  const unique = new Map();

  for (const match of foundSchedules) {
    if (match.id) {
      unique.set(String(match.id), match);
    }
  }

  return [...unique.values()].sort(
    (a, b) =>
      new Date(a.date).getTime() -
      new Date(b.date).getTime()
  );
}

async function getTeamMatches(teamInfo, requestType = "general") {
  const matches = await resolveFootballTeam(teamInfo);

  const now = Date.now();

  const completed = matches
    .filter(match => match.completed)
    .sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    );

  const upcoming = matches
    .filter(
      match =>
        !match.completed &&
        new Date(match.date).getTime() >= now
    )
    .sort(
      (a, b) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime()
    );

  const live = matches.filter(match => match.live);

  if (requestType === "live") {
    return live;
  }

  if (requestType === "last" || requestType === "results") {
    return completed;
  }

  if (requestType === "next") {
    return upcoming;
  }

  if (requestType === "fixtures") {
    return upcoming;
  }

  return [
    ...live,
    ...upcoming,
    ...completed
  ];
}

async function getFootballStandings(league) {
  const url =
    `${STANDINGS_BASE}/${league.key}/types/0/standings`;

  try {
    const data = await fetchJson(url);

    return (
      data?.children?.[0]?.standings?.entries ||
      data?.standings?.entries ||
      []
    );
  } catch {
    return [];
  }
}

function getStat(entry, statName) {
  const stat = entry?.stats?.find(
    item => item.name === statName
  );

  return stat?.value ?? stat?.displayValue ?? "-";
}

function extractStandingsRows(entries) {
  return entries.map((entry, index) => {
    const team =
      entry?.team?.displayName ||
      entry?.team?.name ||
      "Unknown";

    return {
      position:
        getStat(entry, "rank") !== "-"
          ? getStat(entry, "rank")
          : index + 1,
      team,
      played: getStat(entry, "gamesPlayed"),
      wins: getStat(entry, "wins"),
      draws: getStat(entry, "ties"),
      losses: getStat(entry, "losses"),
      points: getStat(entry, "points"),
      goalDifference: getStat(entry, "pointDifferential")
    };
  });
}

function formatFootballStandings(
  league,
  entries
) {
  const rows = extractStandingsRows(entries);

  if (!rows.length) {
    return `I couldn't find current standings for ${league.name}.`;
  }

  let answer =
    `## ${league.name} standings\n\n`;

  answer +=
    `| Pos | Team | P | W | D | L | GD | Pts |\n`;
  answer +=
    `|---:|---|---:|---:|---:|---:|---:|---:|\n`;

  for (const row of rows) {
    answer +=
      `| ${row.position} | ${row.team} | ` +
      `${row.played} | ${row.wins} | ` +
      `${row.draws} | ${row.losses} | ` +
      `${row.goalDifference} | ${row.points} |\n`;
  }

  return answer;
}

function formatFootballMatches(
  matches,
  title = "Football"
) {
  if (!matches.length) {
    return `No football matches were found for ${title}.`;
  }

  let answer = `## ${title}\n\n`;

  for (const match of matches) {
    const scoreAvailable =
      match.homeScore !== null &&
      match.awayScore !== null;

    let statusText;

    if (match.live) {
      statusText = "LIVE";
    } else if (match.completed) {
      statusText = "FT";
    } else {
      statusText = "Scheduled";
    }

    answer +=
      `**${match.homeTeam} ${scoreAvailable ? match.homeScore : ""}` +
      ` ${scoreAvailable ? "-" : "vs"} ` +
      `${scoreAvailable ? match.awayScore : ""} ${match.awayTeam}**\n`;

    answer +=
      `- ${match.league}\n`;

    answer +=
      `- ${statusText}\n`;

    answer +=
      `- Zambia time: ${match.dateZambia}\n\n`;
  }

  return answer.trim();
}

function formatTeamMatches(
  teamInfo,
  matches,
  requestType
) {
  const teamName =
    teamInfo?.names?.[0] ||
    "Team";

  if (!matches.length) {
    if (requestType === "next") {
      return (
        `I couldn't find an upcoming fixture for ` +
        `${teamName} in the available football data.`
      );
    }

    if (
      requestType === "last" ||
      requestType === "results"
    ) {
      return (
        `I couldn't find a completed recent match for ` +
        `${teamName} in the available football data.`
      );
    }

    if (requestType === "live") {
      return (
        `${teamName} does not appear to have a live ` +
        `match in the available football data right now.`
      );
    }

    return (
      `I couldn't find matches for ${teamName} in the ` +
      `available football data.`
    );
  }

  let selected = matches;

  if (requestType === "next") {
    selected = matches.slice(0, 5);
  } else if (
    requestType === "last" ||
    requestType === "results"
  ) {
    selected = matches.slice(0, 5);
  } else if (requestType === "live") {
    selected = matches.slice(0, 10);
  } else {
    selected = matches.slice(0, 10);
  }

  return formatFootballMatches(
    selected,
    `${teamName} football`
  );
}

export async function footballTeamFeature(
  userMessage
) {
  const teamInfo = detectFootballTeam(userMessage);

  if (!teamInfo) {
    return {
      answer:
        "I couldn't identify the football team you are asking about.",
      data: [],
      used: false
    };
  }

  const requestType =
    getFootballRequestType(userMessage);

  const matches = await getTeamMatches(
    teamInfo,
    requestType
  );

  return {
    answer: formatTeamMatches(
      teamInfo,
      matches,
      requestType
    ),
    data: matches,
    used: true
  };
}

export async function footballLeagueFeature(
  userMessage
) {
  const leagueKey =
    detectFootballLeague(userMessage);

  if (!leagueKey) {
    return {
      answer:
        "I couldn't identify the football league you are asking about.",
      data: [],
      used: false
    };
  }

  const league =
    resolveFootballLeague(leagueKey);

  const requestType =
    getFootballRequestType(userMessage);

  if (requestType === "standings") {
    const entries =
      await getFootballStandings(league);

    return {
      answer: formatFootballStandings(
        league,
        entries
      ),
      data: entries,
      used: true
    };
  }

  const matches =
    await getLeagueMatches(league);

  const today =
    getZambiaDate();

  let selected = matches;

  if (requestType === "live") {
    selected = matches.filter(
      match => match.live
    );
  } else if (
    requestType === "last" ||
    requestType === "results"
  ) {
    selected = matches.filter(
      match =>
        match.completed &&
        match.day === today
    );
  } else if (
    requestType === "next" ||
    requestType === "fixtures"
  ) {
    selected = matches.filter(
      match =>
        !match.completed &&
        new Date(match.date).getTime() >= Date.now()
    );
  } else {
    selected = matches.filter(
      match => match.day === today
    );
  }

  return {
    answer: formatFootballMatches(
      selected,
      `${league.name}`
    ),
    data: selected,
    used: true
  };
}

export async function footballFeature() {
  const matches =
    await getFootballMatches();

  const today =
    getZambiaDate();

  const todaysMatches =
    matches.filter(
      match => match.day === today
    );

  return {
    answer: formatFootballMatches(
      todaysMatches,
      "Worldwide football today"
    ),
    data: todaysMatches,
    used: true
  };
}

export async function searchFootballTeams(
  query
) {
  const teamInfo =
    detectFootballTeam(query);

  if (!teamInfo) {
    return [];
  }

  return resolveFootballTeam(teamInfo);
}

export async function getFootballForDate(
  date
) {
  const matches =
    await getFootballMatches();

  return matches.filter(
    match => match.day === date
  );
}

export {
  detectFootballTeam,
  detectFootballLeague,
  getFootballRequestType,
  resolveFootballLeague,
  getFootballMatches
};
