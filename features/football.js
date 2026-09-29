// features/football.js
// ======================================================
// ZED AI — WORLDWIDE FOOTBALL FEATURE
// ======================================================
//
// Supports:
// - Worldwide football
// - Major international competitions
// - Major domestic leagues
// - Zambia and other African football
// - Today's matches
// - Upcoming matches
// - Completed results
// - Live matches
// - League-specific searches
// - Zambia-localized match times
//
// Existing exports preserved:
//   getFootballMatches()
//   formatFootballMatches()
//   footballFeature()
//
// Additional exports:
//   getLeagueMatches()
//   getFootballForDate()
// ======================================================
const ESPN_BASE_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer";
const ZAMBIA_TIME_ZONE =
  "Africa/Lusaka";
const REQUEST_TIMEOUT_MS = 15000;
// ======================================================
// WORLDWIDE LEAGUE / COMPETITION DATABASE
// ======================================================
//
// These are ESPN league identifiers.
// The list can be expanded later without changing the
// rest of the football engine.
// ======================================================
const FOOTBALL_LEAGUES = {
  // Europe
  premierLeague: "eng.1",
  championship: "eng.2",
  leagueOne: "eng.3",
  leagueTwo: "eng.4",
  laLiga: "esp.1",
  segunda: "esp.2",
  serieA: "ita.1",
  serieB: "ita.2",
  bundesliga: "ger.1",
  bundesliga2: "ger.2",
  ligue1: "fra.1",
  ligue2: "fra.2",
  eredivisie: "ned.1",
  primeiraLiga: "por.1",
  belgianProLeague: "bel.1",
  scottishPremiership: "sco.1",
  turkishSuperLig: "tur.1",
  greekSuperLeague: "gre.1",
  austrianBundesliga: "aut.1",
  swissSuperLeague: "sui.1",
  danishSuperliga: "den.1",
  norwegianEliteserien: "nor.1",
  swedishAllsvenskan: "swe.1",
  polishEkstraklasa: "pol.1",
  czechFirstLeague: "cze.1",
  // UEFA
  championsLeague: "uefa.champions",
  europaLeague: "uefa.europa",
  conferenceLeague: "uefa.europa.conf",
  womensChampionsLeague: "uefa.wchampions",
  // Africa
  egyptPremierLeague: "egy.1",
  southAfricaPremier: "rsa.1",
  nigeriaPremierLeague: "nga.1",
  moroccoBotola: "mar.1",
  // Americas
  mls: "usa.1",
  ligaMX: "mex.1",
  brazilSerieA: "bra.1",
  argentinaPrimera: "arg.1",
  colombiaPrimera: "col.1",
  // Asia / Middle East
  saudiProLeague: "ksa.1",
  japaneseJLeague: "jpn.1",
  koreanKLeague: "kor.1",
  australianALeague: "aus.1",
  // International
  worldCup: "fifa.world",
  womensWorldCup: "fifa.wwc",
  // Zambia
  zambiaSuperLeague: "zambia.1"
};
// ======================================================
// HELPERS
// ======================================================
function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function safeString(value = "") {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }
  return cleanText(value);
}
function normalizeScore(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }
  return String(value).trim();
}
// ======================================================
// ZAMBIA DATE
// ======================================================
export function getZambiaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZAMBIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}
// ======================================================
// DATE → YYYYMMDD
// ======================================================
function getZambiaDateCompact(date = new Date()) {
  const parts =
    new Intl.DateTimeFormat("en-US", {
      timeZone: ZAMBIA_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
  const values = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }
  return `${values.year}${values.month}${values.day}`;
}
// ======================================================
// ZAMBIA TIME
// ======================================================
function formatZambiaDateTime(dateValue) {
  if (!dateValue) {
    return "";
  }
  const date =
    new Date(dateValue);
  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }
  try {
    return new Intl.DateTimeFormat(
      "en-ZM",
      {
        timeZone:
          ZAMBIA_TIME_ZONE,
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }
    ).format(date);
  } catch {
    return "";
  }
}
// ======================================================
// MATCH STATE
// ======================================================
function getMatchState(status = {}) {
  const state =
    safeString(status?.state)
      .toLowerCase();
  if (
    status?.completed === true ||
    state === "post"
  ) {
    return "completed";
  }
  if (
    state === "in" ||
    state === "live"
  ) {
    return "live";
  }
  if (
    state === "pre" ||
    state === "scheduled"
  ) {
    return "scheduled";
  }
  return "unknown";
}
// ======================================================
// NORMALIZE ESPN EVENT
// ======================================================
function normalizeMatch(
  event,
  leagueInfo = {}
) {
  if (
    !event ||
    typeof event !== "object"
  ) {
    return null;
  }
  const competition =
    event?.competitions?.[0];
  if (!competition) {
    return null;
  }
  const competitors =
    Array.isArray(
      competition?.competitors
    )
      ? competition.competitors
      : [];
  if (
    competitors.length < 2
  ) {
    return null;
  }
  const home =
    competitors.find(
      team =>
        team?.homeAway === "home"
    ) || competitors[0];
  const away =
    competitors.find(
      team =>
        team?.homeAway === "away"
    ) || competitors[1];
  const homeTeam =
    home?.team || {};
  const awayTeam =
    away?.team || {};
  const homeName =
    cleanText(
      homeTeam?.displayName ||
      homeTeam?.shortDisplayName ||
      home?.displayName ||
      home?.name ||
      "Home"
    );
  const awayName =
    cleanText(
      awayTeam?.displayName ||
      awayTeam?.shortDisplayName ||
      away?.displayName ||
      away?.name ||
      "Away"
    );
  if (
    !homeName ||
    !awayName
  ) {
    return null;
  }
  const status =
    competition?.status?.type || {};
  const matchState =
    getMatchState(status);
  let statusText =
    cleanText(
      status?.detail ||
      status?.shortDetail ||
      status?.description ||
      status?.name ||
      ""
    );
  if (!statusText) {
    if (
      matchState === "live"
    ) {
      statusText = "Live";
    } else if (
      matchState === "completed"
    ) {
      statusText = "Finished";
    } else if (
      matchState === "scheduled"
    ) {
      statusText = "Scheduled";
    } else {
      statusText =
        "Status unavailable";
    }
  }
  const date =
    safeString(event?.date);
  const league =
    safeString(
      leagueInfo?.name ||
      event?.league?.name ||
      event?.season?.displayName ||
      ""
    );
  const country =
    safeString(
      leagueInfo?.country ||
      ""
    );
  return {
    id:
      safeString(event?.id) ||
      `${homeName}-${awayName}-${date}`,
    home: homeName,
    away: awayName,
    homeScore:
      normalizeScore(
        home?.score
      ),
    awayScore:
      normalizeScore(
        away?.score
      ),
    status: statusText,
    state:
      safeString(status?.state),
    matchState,
    completed:
      matchState ===
      "completed",
    live:
      matchState === "live",
    scheduled:
      matchState ===
      "scheduled",
    date,
    zambiaTime:
      formatZambiaDateTime(
        date
      ),
    league,
    country,
    venue:
      safeString(
        competition?.venue
          ?.fullName ||
        ""
      )
  };
}
// ======================================================
// FETCH JSON SAFELY
// ======================================================
async function fetchJSON(
  url
) {
  const controller =
    new AbortController();
  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      REQUEST_TIMEOUT_MS
    );
  try {
    const response =
      await fetch(
        url,
        {
          method: "GET",
          headers: {
            Accept:
              "application/json",
            "User-Agent":
              "Zed-AI-Football/2.0"
          },
          signal:
            controller.signal
        }
      );
    if (!response.ok) {
      throw new Error(
        `Football service returned ${response.status}`
      );
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}
// ======================================================
// GET MATCHES FROM ONE LEAGUE
// ======================================================
export async function getLeagueMatches(
  leagueCode,
  options = {}
) {
  if (
    !leagueCode ||
    typeof leagueCode !== "string"
  ) {
    return [];
  }
  const date =
    options?.date ||
    getZambiaDateCompact();
  const url =
    `${ESPN_BASE_URL}/${encodeURIComponent(
      leagueCode
    )}/scoreboard?dates=${encodeURIComponent(
      date
    )}`;
  try {
    const data =
      await fetchJSON(url);
    const events =
      Array.isArray(
        data?.events
      )
        ? data.events
        : [];
    const leagueName =
      safeString(
        data?.leagues?.[0]
          ?.name ||
        data?.leagues?.[0]
          ?.season
          ?.displayName ||
        ""
      );
    const matches = [];
    for (
      const event of events
    ) {
      const match =
        normalizeMatch(
          event,
          {
            name:
              leagueName
          }
        );
      if (match) {
        matches.push(match);
      }
    }
    return matches;
  } catch (error) {
    console.error(
      `Zed Football league error (${leagueCode}):`,
      error?.message ||
      error
    );
    return [];
  }
}
// ======================================================
// GET WORLDWIDE FOOTBALL
// ======================================================
//
// Queries multiple major competitions instead of relying
// only on /soccer/all/scoreboard.
//
// This gives Zed AI much broader worldwide coverage.
// ======================================================
export async function getFootballMatches(
  options = {}
) {
  console.log(
    "Zed Football: searching worldwide football..."
  );
  const date =
    options?.date ||
    getZambiaDateCompact();
  const requestedLeagues =
    Array.isArray(
      options?.leagues
    ) &&
    options.leagues.length > 0
      ? options.leagues
      : Object.values(
          FOOTBALL_LEAGUES
        );
  const uniqueLeagues =
    [
      ...new Set(
        requestedLeagues
          .filter(
            code =>
              typeof code ===
              "string" &&
              code.trim()
          )
      )
    ];
  const results =
    await Promise.allSettled(
      uniqueLeagues.map(
        league =>
          getLeagueMatches(
            league,
            { date }
          )
      )
    );
  const matches = [];
  for (
    const result of results
  ) {
    if (
      result.status ===
      "fulfilled" &&
      Array.isArray(
        result.value
      )
    ) {
      matches.push(
        ...result.value
      );
    }
  }
  // Remove duplicate matches.
  const seen =
    new Set();
  const uniqueMatches =
    matches.filter(
      match => {
        const key =
          String(
            match?.id ||
            `${match?.home}-${match?.away}-${match?.date}`
          );
        if (
          seen.has(key)
        ) {
          return false;
        }
        seen.add(key);
        return true;
      }
    );
  // Sort by match time.
  uniqueMatches.sort(
    (a, b) => {
      const aTime =
        new Date(
          a?.date || 0
        ).getTime();
      const bTime =
        new Date(
          b?.date || 0
        ).getTime();
      return (
        aTime - bTime
      );
    }
  );
  console.log(
    `Zed Football: ${uniqueMatches.length} worldwide matches found.`
  );
  return uniqueMatches;
}
// ======================================================
// GET FOOTBALL FOR A SPECIFIC DATE
// ======================================================
export async function getFootballForDate(
  date,
  options = {}
) {
  if (
    !date ||
    !/^\d{8}$/.test(
      String(date)
    )
  ) {
    return [];
  }
  return getFootballMatches({
    ...options,
    date
  });
}
// ======================================================
// FORMAT ONE MATCH
// ======================================================
function formatSingleMatch(
  match
) {
  if (!match) {
    return "";
  }
  const home =
    cleanText(
      match?.home ||
      "Home"
    );
  const away =
    cleanText(
      match?.away ||
      "Away"
    );
  const homeScore =
    normalizeScore(
      match?.homeScore
    );
  const awayScore =
    normalizeScore(
      match?.awayScore
    );
  const score =
    homeScore !== "" &&
    awayScore !== ""
      ? `${homeScore}-${awayScore}`
      : "vs";
  let line =
    `${home} ${score} ${away}`;
  const status =
    cleanText(
      match?.status ||
      ""
    );
  if (status) {
    line +=
      ` — ${status}`;
  }
  if (
    match?.league
  ) {
    line +=
      ` | ${match.league}`;
  }
  if (
    match?.zambiaTime
  ) {
    line +=
      ` | Zambia: ${match.zambiaTime}`;
  }
  return line;
}
// ======================================================
// FORMAT FOOTBALL RESULTS
// ======================================================
export function formatFootballMatches(
  matches
) {
  const date =
    getZambiaDate();
  if (
    !Array.isArray(matches) ||
    matches.length === 0
  ) {
    return [
      "WORLDWIDE FOOTBALL INFORMATION",
      `Date in Zambia: ${date}`,
      "",
      "No football matches were found for the selected date.",
      "",
      "The football data service may have no matches available or may be temporarily unavailable."
    ].join("\n");
  }
  const lines = [
    "WORLDWIDE FOOTBALL INFORMATION",
    `Date in Zambia: ${date}`,
    `Matches found: ${matches.length}`,
    ""
  ];
  let currentLeague =
    "";
  for (
    const match of matches
  ) {
    if (!match) {
      continue;
    }
    const league =
      cleanText(
        match?.league ||
        "Football"
      );
    if (
      league !==
      currentLeague
    ) {
      if (
        currentLeague
      ) {
        lines.push("");
      }
      lines.push(
        `--- ${league} ---`
      );
      currentLeague =
        league;
    }
    const line =
      formatSingleMatch(
        match
      );
    if (line) {
      lines.push(line);
    }
  }
  lines.push(
    "",
    "Times are displayed in Zambia time.",
    "Live matches are marked Live.",
    "Scheduled matches are not described as finished.",
    "Only completed matches should be described as finished."
  );
  return lines.join("\n");
}
// ======================================================
// FOOTBALL FEATURE
// ======================================================
export async function footballFeature(
  options = {}
) {
  const matches =
    await getFootballMatches(
      options
    );
  return {
    matches,
    count:
      matches.length,
    date:
      getZambiaDate(),
    worldwide:
      true,
    text:
      formatFootballMatches(
        matches
      )
  };
}
// ======================================================
// DEFAULT EXPORT
// ======================================================
export default {
  getFootballMatches,
  getLeagueMatches,
  getFootballForDate,
  formatFootballMatches,
  footballFeature,
  getZambiaDate
};
