// features/football.js

const SITE_BASE =
  "https://site.web.api.espn.com/apis/site/v2/sports/soccer";

const STANDINGS_BASE =
  "https://site.api.espn.com/apis/v2/sports/soccer";

const ZAMBIA_TIMEZONE = "Africa/Lusaka";
const REQUEST_TIMEOUT = 15000;

/*
  IMPORTANT:

  When a user says:
  "Arsenal"
  "Chelsea"
  "Barcelona"

  we default to the MEN'S FIRST TEAM.

  Women's teams are only selected when the user explicitly says:
  "Arsenal Women"
  "Chelsea Women"
  "Barcelona Women"
*/

// ------------------------------------------------------------
// LEAGUES
// ------------------------------------------------------------

const FOOTBALL_LEAGUES = {
  premierLeague: {
    name: "Premier League",
    slug: "eng.1",
    sport: "eng.1"
  },

  championsLeague: {
    name: "UEFA Champions League",
    slug: "uefa.champions",
    sport: "uefa.champions"
  },

  europaLeague: {
    name: "UEFA Europa League",
    slug: "uefa.europa",
    sport: "uefa.europa"
  },

  conferenceLeague: {
    name: "UEFA Conference League",
    slug: "uefa.europa.conf",
    sport: "uefa.europa.conf"
  },

  laLiga: {
    name: "La Liga",
    slug: "esp.1",
    sport: "esp.1"
  },

  serieA: {
    name: "Serie A",
    slug: "ita.1",
    sport: "ita.1"
  },

  bundesliga: {
    name: "Bundesliga",
    slug: "ger.1",
    sport: "ger.1"
  },

  ligue1: {
    name: "Ligue 1",
    slug: "fra.1",
    sport: "fra.1"
  },

  championship: {
    name: "Championship",
    slug: "eng.2",
    sport: "eng.2"
  },

  eredivisie: {
    name: "Eredivisie",
    slug: "ned.1",
    sport: "ned.1"
  },

  primeiraLiga: {
    name: "Primeira Liga",
    slug: "por.1",
    sport: "por.1"
  },

  scottishPremiership: {
    name: "Scottish Premiership",
    slug: "sco.1",
    sport: "sco.1"
  },

  belgianProLeague: {
    name: "Belgian Pro League",
    slug: "bel.1",
    sport: "bel.1"
  },

  turkishSuperLig: {
    name: "Turkish Super Lig",
    slug: "tur.1",
    sport: "tur.1"
  },

  saudiProLeague: {
    name: "Saudi Pro League",
    slug: "ksa.1",
    sport: "ksa.1"
  },

  mls: {
    name: "Major League Soccer",
    slug: "usa.1",
    sport: "usa.1"
  },

  afcChampionsLeague: {
    name: "AFC Champions League",
    slug: "afc.champions",
    sport: "afc.champions"
  },

  cafChampionsLeague: {
    name: "CAF Champions League",
    slug: "caf.champions",
    sport: "caf.champions"
  },

  cafConfederationCup: {
    name: "CAF Confederation Cup",
    slug: "caf.confederation",
    sport: "caf.confederation"
  }
};

// ------------------------------------------------------------
// MEN'S FIRST-TEAM IDS
// ------------------------------------------------------------

const KNOWN_TEAM_IDS = {
  arsenal: "359",
  chelsea: "363",
  liverpool: "364",
  manchesterUnited: "360",
  manchesterCity: "382",
  tottenham: "367",
  newcastle: "361",
  astonVilla: "362",

  barcelona: "83",
  realMadrid: "86",
  atleticoMadrid: "1068",

  bayernMunich: "132",
  borussiaDortmund: "124",

  juventus: "111",
  interMilan: "110",
  acMilan: "103",
  napoli: "114",

  psg: "160",
  lyon: "167",
  marseille: "176",
  monaco: "174",

  ajax: "139",
  psv: "148",
  benfica: "1929",
  porto: "2128",

  alHilal: "8598",
  alNassr: "8177",

  mamelodiSundowns: "2122",
  kaizerChiefs: "2124",
  alAhly: "1037",
  zamalek: "8547",
  tpMazembe: "1029"
};

// ------------------------------------------------------------
// TEAM ALIASES
// ------------------------------------------------------------

const TEAM_ALIASES = {
  arsenal: {
    id: KNOWN_TEAM_IDS.arsenal,
    name: "Arsenal",
    aliases: [
      "arsenal",
      "arsenal fc",
      "arsenal football club",
      "the gunners"
    ]
  },

  chelsea: {
    id: KNOWN_TEAM_IDS.chelsea,
    name: "Chelsea",
    aliases: [
      "chelsea",
      "chelsea fc",
      "chelsea football club"
    ]
  },

  liverpool: {
    id: KNOWN_TEAM_IDS.liverpool,
    name: "Liverpool",
    aliases: [
      "liverpool",
      "liverpool fc",
      "liverpool football club"
    ]
  },

  manchesterUnited: {
    id: KNOWN_TEAM_IDS.manchesterUnited,
    name: "Manchester United",
    aliases: [
      "manchester united",
      "man united",
      "man utd",
      "man u",
      "united"
    ]
  },

  manchesterCity: {
    id: KNOWN_TEAM_IDS.manchesterCity,
    name: "Manchester City",
    aliases: [
      "manchester city",
      "man city",
      "city"
    ]
  },

  tottenham: {
    id: KNOWN_TEAM_IDS.tottenham,
    name: "Tottenham Hotspur",
    aliases: [
      "tottenham",
      "tottenham hotspur",
      "spurs"
    ]
  },

  newcastle: {
    id: KNOWN_TEAM_IDS.newcastle,
    name: "Newcastle United",
    aliases: [
      "newcastle",
      "newcastle united"
    ]
  },

  astonVilla: {
    id: KNOWN_TEAM_IDS.astonVilla,
    name: "Aston Villa",
    aliases: [
      "aston villa",
      "aston villa fc"
    ]
  },

  barcelona: {
    id: KNOWN_TEAM_IDS.barcelona,
    name: "Barcelona",
    aliases: [
      "barcelona",
      "fc barcelona",
      "barca"
    ]
  },

  realMadrid: {
    id: KNOWN_TEAM_IDS.realMadrid,
    name: "Real Madrid",
    aliases: [
      "real madrid",
      "real madrid cf"
    ]
  },

  atleticoMadrid: {
    id: KNOWN_TEAM_IDS.atleticoMadrid,
    name: "Atletico Madrid",
    aliases: [
      "atletico madrid",
      "atletico",
      "atletico de madrid"
    ]
  },

  bayernMunich: {
    id: KNOWN_TEAM_IDS.bayernMunich,
    name: "Bayern Munich",
    aliases: [
      "bayern",
      "bayern munich",
      "bayern munchen",
      "fc bayern"
    ]
  },

  borussiaDortmund: {
    id: KNOWN_TEAM_IDS.borussiaDortmund,
    name: "Borussia Dortmund",
    aliases: [
      "borussia dortmund",
      "dortmund",
      "bvb"
    ]
  },

  juventus: {
    id: KNOWN_TEAM_IDS.juventus,
    name: "Juventus",
    aliases: [
      "juventus",
      "juve"
    ]
  },

  interMilan: {
    id: KNOWN_TEAM_IDS.interMilan,
    name: "Inter Milan",
    aliases: [
      "inter milan",
      "inter",
      "internazionale"
    ]
  },

  acMilan: {
    id: KNOWN_TEAM_IDS.acMilan,
    name: "AC Milan",
    aliases: [
      "ac milan",
      "milan"
    ]
  },

  napoli: {
    id: KNOWN_TEAM_IDS.napoli,
    name: "Napoli",
    aliases: [
      "napoli",
      "ssc napoli"
    ]
  },

  psg: {
    id: KNOWN_TEAM_IDS.psg,
    name: "Paris Saint-Germain",
    aliases: [
      "psg",
      "paris saint germain",
      "paris saint-germain"
    ]
  },

  lyon: {
    id: KNOWN_TEAM_IDS.lyon,
    name: "Lyon",
    aliases: [
      "lyon",
      "olympique lyon",
      "ol"
    ]
  },

  marseille: {
    id: KNOWN_TEAM_IDS.marseille,
    name: "Marseille",
    aliases: [
      "marseille",
      "olympique marseille"
    ]
  },

  monaco: {
    id: KNOWN_TEAM_IDS.monaco,
    name: "Monaco",
    aliases: [
      "monaco",
      "as monaco"
    ]
  },

  ajax: {
    id: KNOWN_TEAM_IDS.ajax,
    name: "Ajax",
    aliases: [
      "ajax",
      "ajax amsterdam"
    ]
  },

  psv: {
    id: KNOWN_TEAM_IDS.psv,
    name: "PSV Eindhoven",
    aliases: [
      "psv",
      "psv eindhoven"
    ]
  },

  benfica: {
    id: KNOWN_TEAM_IDS.benfica,
    name: "Benfica",
    aliases: [
      "benfica",
      "sl benfica"
    ]
  },

  porto: {
    id: KNOWN_TEAM_IDS.porto,
    name: "Porto",
    aliases: [
      "porto",
      "fc porto"
    ]
  },

  alHilal: {
    id: KNOWN_TEAM_IDS.alHilal,
    name: "Al Hilal",
    aliases: [
      "al hilal",
      "al-hilal"
    ]
  },

  alNassr: {
    id: KNOWN_TEAM_IDS.alNassr,
    name: "Al Nassr",
    aliases: [
      "al nassr",
      "al-nassr"
    ]
  },

  mamelodiSundowns: {
    id: KNOWN_TEAM_IDS.mamelodiSundowns,
    name: "Mamelodi Sundowns",
    aliases: [
      "mamelodi sundowns",
      "sundowns"
    ]
  },

  kaizerChiefs: {
    id: KNOWN_TEAM_IDS.kaizerChiefs,
    name: "Kaizer Chiefs",
    aliases: [
      "kaizer chiefs"
    ]
  },

  alAhly: {
    id: KNOWN_TEAM_IDS.alAhly,
    name: "Al Ahly",
    aliases: [
      "al ahly",
      "al-ahly",
      "ahly"
    ]
  },

  zamalek: {
    id: KNOWN_TEAM_IDS.zamalek,
    name: "Zamalek",
    aliases: [
      "zamalek",
      "zamalek sc"
    ]
  },

  tpMazembe: {
    id: KNOWN_TEAM_IDS.tpMazembe,
    name: "TP Mazembe",
    aliases: [
      "tp mazembe",
      "mazembe"
    ]
  }
};

// ------------------------------------------------------------
// WOMEN'S TEAM DETECTION
// ------------------------------------------------------------

function isWomensRequest(text = "") {
  const value = normalize(text);

  return (
    /\bwomen\b/.test(value) ||
    /\bfemale\b/.test(value) ||
    /\bladies\b/.test(value) ||
    /\bgirls\b/.test(value)
  );
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeDate(value) {
  const date = new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function formatZambiaDateTime(value) {
  const date = safeDate(value);

  if (!date) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: ZAMBIA_TIMEZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  ).format(date);
}

function formatZambiaDate(value) {
  const date = safeDate(value);

  if (!date) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: ZAMBIA_TIMEZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  ).format(date);
}

function formatDateForApi(date) {
  return date
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
}

function getEventDate(event) {
  return (
    event?.date ||
    event?.startDate ||
    event?.competitions?.[0]?.date ||
    null
  );
}

function getCompetitionName(event) {
  return cleanText(
    event?.league?.name ||
      event?.season?.name ||
      event?.competitions?.[0]?.league?.name ||
      event?.competitions?.[0]?.name ||
      "Football"
  );
}

function getTeamName(team) {
  return cleanText(
    team?.displayName ||
      team?.shortDisplayName ||
      team?.name ||
      team?.abbreviation ||
      "Unknown team"
  );
}

function getEventTeams(event) {
  const competitors =
    event?.competitions?.[0]
      ?.competitors || [];

  return competitors.map(
    (competitor) => ({
      id: String(
        competitor?.team?.id ||
          competitor?.id ||
          ""
      ),

      name: getTeamName(
        competitor?.team ||
          competitor
      ),

      abbreviation:
        competitor?.team
          ?.abbreviation ||
        competitor?.abbreviation ||
        "",

      homeAway:
        competitor?.homeAway ||
        ""
    })
  );
}

function getEventState(event) {
  const state =
    event?.status?.type?.state ||
    event?.competitions?.[0]
      ?.status?.type?.state ||
    "";

  const completed =
    event?.status?.type
      ?.completed === true ||
    event?.competitions?.[0]
      ?.status?.type
      ?.completed === true ||
    state === "post";

  const live =
    state === "in" ||
    state === "live" ||
    state === "playing";

  return {
    completed,
    live,
    state
  };
}

function getScore(event, teamId) {
  const competitors =
    event?.competitions?.[0]
      ?.competitors || [];

  const competitor =
    competitors.find(
      (item) =>
        String(
          item?.team?.id ||
            item?.id ||
            ""
        ) === String(teamId)
    );

  return (
    competitor?.score ?? null
  );
}

function getOpponent(
  event,
  teamId
) {
  const teams =
    getEventTeams(event);

  return (
    teams.find(
      (team) =>
        String(team.id) !==
        String(teamId)
    ) || null
  );
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
      await fetch(url, {
        headers: {
          Accept:
            "application/json",
          "User-Agent":
            "Zed-AI-Football/1.0"
        },

        signal:
          controller.signal
      });

    if (!response.ok) {
      throw new Error(
        `ESPN request failed: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

// ------------------------------------------------------------
// STRICT TEAM EVENT FILTER
// ------------------------------------------------------------

function eventContainsTeam(
  event,
  teamId
) {
  const wantedId =
    String(teamId);

  const teams =
    getEventTeams(event);

  return teams.some(
    (team) =>
      String(team.id) ===
      wantedId
  );
}

function filterEventsForTeam(
  events,
  teamInfo
) {
  if (!Array.isArray(events)) {
    return [];
  }

  return events.filter(
    (event) =>
      eventContainsTeam(
        event,
        teamInfo.id
      )
  );
}

// ------------------------------------------------------------
// TEAM DETECTION
// ------------------------------------------------------------

function detectFootballTeam(
  message = ""
) {
  const text =
    normalize(message);

  const womenRequested =
    isWomensRequest(message);

  if (womenRequested) {
    for (
      const team of Object.values(
        TEAM_ALIASES
      )
    ) {
      for (
        const alias of team.aliases
      ) {
        if (
          text.includes(
            `${alias} women`
          )
        ) {
          return {
            ...team,
            gender: "women",
            explicitGender: true
          };
        }
      }
    }
  }

  let bestMatch = null;

  for (
    const team of Object.values(
      TEAM_ALIASES
    )
  ) {
    for (
      const alias of team.aliases
    ) {
      if (
        !text.includes(alias)
      ) {
        continue;
      }

      if (
        !bestMatch ||
        alias.length >
          bestMatch.matchedAlias
            .length
      ) {
        bestMatch = {
          ...team,
          gender: "men",
          explicitGender: false,
          matchedAlias: alias
        };
      }
    }
  }

  if (!bestMatch) {
    return null;
  }

  return bestMatch;
}

// ------------------------------------------------------------
// TEAM SEARCH
// ------------------------------------------------------------

async function searchFootballTeams(
  query = ""
) {
  const search =
    encodeURIComponent(
      query.trim()
    );

  if (!search) {
    return [];
  }

  const url =
    `${SITE_BASE}/all/teams?limit=50&region=us&lang=en&search=${search}`;

  try {
    const data =
      await fetchJson(url);

    const teams =
      data?.sports?.flatMap(
        (sport) =>
          sport?.leagues?.flatMap(
            (league) =>
              league?.teams || []
          ) || []
      ) || [];

    return teams.map(
      (entry) => {
        const team =
          entry?.team ||
          entry;

        return {
          id: String(
            team?.id || ""
          ),

          name:
            getTeamName(team),

          abbreviation:
            team?.abbreviation ||
            ""
        };
      }
    );
  } catch {
    return [];
  }
}

// ------------------------------------------------------------
// TEAM SCHEDULE
// ------------------------------------------------------------

async function getTeamSchedule(
  teamId,
  fixtureOnly = false
) {
  let url =
    `${SITE_BASE}/all/teams/${teamId}/schedule`;

  if (fixtureOnly) {
    url +=
      "?fixture=true";
  }

  return await fetchJson(
    url
  );
}

// ------------------------------------------------------------
// EXTRACT EVENTS
// ------------------------------------------------------------

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
      data.schedule
    )
  ) {
    return data.schedule;
  }

  if (
    Array.isArray(
      data.content?.events
    )
  ) {
    return data.content.events;
  }

  return [];
}

// ------------------------------------------------------------
// TEAM MATCHES
// ------------------------------------------------------------

async function getTeamMatches(
  teamInfo,
  requestType = "next"
) {
  const now =
    Date.now();

  let events = [];

  if (
    requestType === "next" ||
    requestType === "upcoming" ||
    requestType === "fixtures"
  ) {
    try {
      const fixtureData =
        await getTeamSchedule(
          teamInfo.id,
          true
        );

      events =
        extractEvents(
          fixtureData
        );

      events =
        filterEventsForTeam(
          events,
          teamInfo
        );

      const future =
        events
          .filter(
            (event) => {
              const date =
                safeDate(
                  getEventDate(
                    event
                  )
                );

              if (!date) {
                return false;
              }

              const state =
                getEventState(
                  event
                );

              return (
                !state.completed &&
                date.getTime() >=
                  now
              );
            }
          )
          .sort(
            (a, b) => {
              return (
                safeDate(
                  getEventDate(
                    a
                  )
                ).getTime() -
                safeDate(
                  getEventDate(
                    b
                  )
                ).getTime()
              );
            }
          );

      if (
        future.length > 0
      ) {
        return future;
      }
    } catch {
      // Continue to normal schedule.
    }

    try {
      const normalData =
        await getTeamSchedule(
          teamInfo.id,
          false
        );

      events =
        extractEvents(
          normalData
        );

      events =
        filterEventsForTeam(
          events,
          teamInfo
        );
    } catch {
      events = [];
    }

    return events
      .filter(
        (event) => {
          const date =
            safeDate(
              getEventDate(
                event
              )
            );

          if (!date) {
            return false;
          }

          const state =
            getEventState(
              event
            );

          return (
            !state.completed &&
            date.getTime() >=
              now
          );
        }
      )
      .sort(
        (a, b) => {
          return (
            safeDate(
              getEventDate(
                a
              )
            ).getTime() -
            safeDate(
              getEventDate(
                b
              )
            ).getTime()
          );
        }
      );
  }

  try {
    const normalData =
      await getTeamSchedule(
        teamInfo.id,
        false
      );

    events =
      extractEvents(
        normalData
      );

    events =
      filterEventsForTeam(
        events,
        teamInfo
      );
  } catch {
    return [];
  }

  if (
    requestType === "live"
  ) {
    return events.filter(
      (event) =>
        getEventState(
          event
        ).live
    );
  }

  if (
    requestType === "last" ||
    requestType === "results" ||
    requestType === "previous"
  ) {
    return events
      .filter(
        (event) =>
          getEventState(
            event
          ).completed
      )
      .sort(
        (a, b) => {
          return (
            safeDate(
              getEventDate(
                b
              )
            ).getTime() -
            safeDate(
              getEventDate(
                a
              )
            ).getTime()
          );
        }
      );
  }

  return events;
}

// ------------------------------------------------------------
// REQUEST TYPE
// ------------------------------------------------------------

function getFootballRequestType(
  message = ""
) {
  const text =
    normalize(message);

  if (
    text.includes(
      "next match"
    ) ||
    text.includes(
      "next game"
    ) ||
    text.includes(
      "next fixture"
    ) ||
    text.includes(
      "upcoming match"
    ) ||
    text.includes(
      "upcoming game"
    ) ||
    text.includes(
      "upcoming fixture"
    ) ||
    text.includes(
      "upcoming fixtures"
    ) ||
    text.includes(
      "future match"
    ) ||
    text.includes(
      "future fixtures"
    ) ||
    text.includes(
      "when do"
    ) ||
    text.includes(
      "when does"
    )
  ) {
    return "next";
  }

  if (
    text.includes(
      "last match"
    ) ||
    text.includes(
      "last game"
    ) ||
    text.includes(
      "last fixture"
    ) ||
    text.includes(
      "previous match"
    ) ||
    text.includes(
      "previous game"
    ) ||
    text.includes(
      "previous fixture"
    ) ||
    text.includes(
      "latest result"
    ) ||
    text.includes(
      "last result"
    ) ||
    text.includes(
      "recent result"
    )
  ) {
    return "last";
  }

  if (
    text.includes(
      "live"
    ) ||
    text.includes(
      "playing now"
    ) ||
    text.includes(
      "currently playing"
    )
  ) {
    return "live";
  }

  if (
    text.includes(
      "fixtures"
    ) ||
    text.includes(
      "schedule"
    )
  ) {
    return "fixtures";
  }

  if (
    text.includes(
      "results"
    ) ||
    text.includes(
      "scores"
    )
  ) {
    return "results";
  }

  return "next";
}

// ------------------------------------------------------------
// FORMAT TEAM MATCH
// ------------------------------------------------------------

function formatTeamMatch(
  event,
  teamInfo
) {
  const date =
    getEventDate(event);

  const state =
    getEventState(event);

  const opponent =
    getOpponent(
      event,
      teamInfo.id
    );

  const teams =
    getEventTeams(event);

  const team =
    teams.find(
      (item) =>
        String(item.id) ===
        String(teamInfo.id)
    ) || null;

  let matchup =
    `${team?.name || teamInfo.name} vs ${opponent?.name || "Unknown opponent"}`;

  if (
    team?.homeAway ===
    "away"
  ) {
    matchup =
      `${opponent?.name || "Unknown opponent"} vs ${team?.name || teamInfo.name}`;
  }

  let status =
    "Scheduled";

  if (state.live) {
    status = "LIVE";
  } else if (
    state.completed
  ) {
    const teamScore =
      getScore(
        event,
        teamInfo.id
      );

    const opponentScore =
      opponent
        ? getScore(
            event,
            opponent.id
          )
        : null;

    status =
      teamScore !== null &&
      opponentScore !== null
        ? `Final: ${teamScore}-${opponentScore}`
        : "Finished";
  }

  return {
    matchup,
    date,
    formattedDate:
      formatZambiaDateTime(
        date
      ),
    competition:
      getCompetitionName(
        event
      ),
    status
  };
}

// ------------------------------------------------------------
// TEAM FEATURE
// ------------------------------------------------------------

async function footballTeamFeature(
  message = ""
) {
  const teamInfo =
    detectFootballTeam(
      message
    );

  if (!teamInfo) {
    return {
      ok: false,
      answer:
        "I couldn't identify the football team. Try a question such as \"When is Arsenal's next match?\"",
      provider:
        "espn",
      football: true,
      footballMode:
        "team"
    };
  }

  const requestType =
    getFootballRequestType(
      message
    );

  const matches =
    await getTeamMatches(
      teamInfo,
      requestType
    );

  if (
    !matches.length
  ) {
    const teamLabel =
      teamInfo.gender ===
      "women"
        ? `${teamInfo.name} Women`
        : teamInfo.name;

    return {
      ok: true,
      answer:
        `I couldn't find a ${requestType === "next" ? "future" : ""} fixture for ${teamLabel} in the ESPN schedule data.`,
      provider:
        "espn",
      football: true,
      footballMode:
        "team",
      team:
        teamInfo.name,
      gender:
        teamInfo.gender
    };
  }

  const formatted =
    matches
      .slice(
        0,
        requestType ===
          "next"
          ? 1
          : 10
      )
      .map(
        (event) =>
          formatTeamMatch(
            event,
            teamInfo
          )
      );

  let answer = "";

  if (
    requestType ===
    "next"
  ) {
    const match =
      formatted[0];

    const teamLabel =
      teamInfo.gender ===
      "women"
        ? `${teamInfo.name} Women`
        : teamInfo.name;

    answer =
      `The next match for ${teamLabel} is ${match.matchup} on ${match.formattedDate} Zambia time. Competition: ${match.competition}.`;
  }

  else if (
    requestType ===
    "live"
  ) {
    answer =
      formatted.length
        ? formatted
            .map(
              (match) =>
                `${match.matchup} — ${match.status}`
            )
            .join("\n")
        : "There are no live matches for this team right now.";
  }

  else if (
    requestType ===
      "last" ||
    requestType ===
      "results"
  ) {
    answer =
      formatted
        .map(
          (match) =>
            `${match.matchup} — ${match.status} — ${match.formattedDate} Zambia time — ${match.competition}`
        )
        .join("\n");
  }

  else {
    answer =
      formatted
        .map(
          (match) =>
            `${match.matchup} — ${match.formattedDate} Zambia time — ${match.competition} — ${match.status}`
        )
        .join("\n");
  }

  return {
    ok: true,
    answer,
    provider:
      "espn",
    football: true,
    footballMode:
      "team",
    team:
      teamInfo.name,
    gender:
      teamInfo.gender,
    requestType
  };
}

// ------------------------------------------------------------
// LEAGUE DETECTION
// ------------------------------------------------------------

function detectFootballLeague(
  message = ""
) {
  const text =
    normalize(message);

  const leagueAliases = [
    {
      league:
        FOOTBALL_LEAGUES
          .premierLeague,
      aliases: [
        "premier league",
        "epl",
        "english premier league"
      ]
    },

    {
      league:
        FOOTBALL_LEAGUES
          .championsLeague,
      aliases: [
        "champions league",
        "uefa champions league",
        "ucl"
      ]
    },

    {
      league:
        FOOTBALL_LEAGUES
          .europaLeague,
      aliases: [
        "europa league",
        "uefa europa league"
      ]
    },

    {
      league:
        FOOTBALL_LEAGUES
          .conferenceLeague,
      aliases: [
        "conference league",
        "europa conference league"
      ]
    },

    {
      league:
        FOOTBALL_LEAGUES
          .laLiga,
      aliases: [
        "la liga",
        "laliga",
        "spanish league"
      ]
    },

    {
      league:
        FOOTBALL_LEAGUES
          .serieA,
      aliases: [
        "serie a",
        "italian league"
      ]
    },

    {
      league:
        FOOTBALL_LEAGUES
          .bundesliga,
      aliases: [
        "bundesliga",
        "german league"
      ]
    },

    {
      league:
        FOOTBALL_LEAGUES
          .ligue1,
      aliases: [
        "ligue 1",
        "french league"
      ]
    },

    {
      league:
        FOOTBALL_LEAGUES
          .championship,
      aliases: [
        "championship"
      ]
    },

    {
      league:
        FOOTBALL_LEAGUES
          .eredivisie,
      aliases: [
        "eredivisie",
        "dutch league"
      ]
    },

    {
      league:
        FOOTBALL_LEAGUES
          .primeiraLiga,
      aliases: [
        "primeira liga",
        "portuguese league"
      ]
    },

    {
      league:
        FOOTBALL_LEAGUES
          .scottishPremiership,
      aliases: [
        "scottish premiership",
        "scottish league"
      ]
    },

    {
      league:
        FOOTBALL_LEAGUES
          .saudiProLeague,
      aliases: [
        "saudi pro league",
        "saudi league"
      ]
    },

    {
      league:
        FOOTBALL_LEAGUES
          .mls,
      aliases: [
        "mls",
        "major league soccer"
      ]
    },

    {
      league:
        FOOTBALL_LEAGUES
          .cafChampionsLeague,
      aliases: [
        "caf champions league",
        "africa champions league"
      ]
    },

    {
      league:
        FOOTBALL_LEAGUES
          .cafConfederationCup,
      aliases: [
        "caf confederation cup",
        "confederation cup"
      ]
    }
  ];

  let best = null;

  for (
    const item of leagueAliases
  ) {
    for (
      const alias of item.aliases
    ) {
      if (
        !text.includes(alias)
      ) {
        continue;
      }

      if (
        !best ||
        alias.length >
          best.alias.length
      ) {
        best = {
          league:
            item.league,
          alias
        };
      }
    }
  }

  return (
    best?.league ||
    null
  );
}

// ------------------------------------------------------------
// LEAGUE REQUEST TYPE
// ------------------------------------------------------------

function getLeagueRequestType(
  message = ""
) {
  const text =
    normalize(message);

  const wantsStandings =
    text.includes(
      "standings"
    ) ||
    text.includes(
      "league table"
    ) ||
    text.includes(
      "table"
    ) ||
    text.includes(
      "position"
    ) ||
    text.includes(
      "positions"
    );

  const wantsResults =
    text.includes(
      "result"
    ) ||
    text.includes(
      "results"
    ) ||
    text.includes(
      "recent"
    ) ||
    text.includes(
      "latest"
    );

  const wantsFixtures =
    text.includes(
      "fixture"
    ) ||
    text.includes(
      "fixtures"
    ) ||
    text.includes(
      "upcoming"
    ) ||
    text.includes(
      "schedule"
    );

  const wantsToday =
    text.includes(
      "today"
    ) ||
    text.includes(
      "today's"
    ) ||
    text.includes(
      "matches today"
    );

  if (
    wantsStandings &&
    wantsResults
  ) {
    return "results-and-standings";
  }

  if (
    wantsStandings
  ) {
    return "standings";
  }

  if (
    wantsResults
  ) {
    return "results";
  }

  if (
    wantsFixtures
  ) {
    return "fixtures";
  }

  if (
    wantsToday
  ) {
    return "today";
  }

  return "fixtures";
}

// ------------------------------------------------------------
// LEAGUE SCOREBOARD
// ------------------------------------------------------------

async function getLeagueScoreboard(
  league
) {
  const url =
    `${SITE_BASE}/${league.slug}/scoreboard`;

  try {
    return await fetchJson(
      url
    );
  } catch {
    return null;
  }
}

// ------------------------------------------------------------
// LEAGUE RECENT RESULTS
// ------------------------------------------------------------

async function getLeagueRecentResults(
  league,
  daysBack = 14
) {
  const end =
    new Date();

  const start =
    new Date(
      end.getTime() -
        daysBack *
          24 *
          60 *
          60 *
          1000
    );

  const startDate =
    formatDateForApi(
      start
    );

  const endDate =
    formatDateForApi(
      end
    );

  const url =
    `${SITE_BASE}/${league.slug}/scoreboard?dates=${startDate}-${endDate}`;

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

// ------------------------------------------------------------
// LEAGUE STANDINGS
// ------------------------------------------------------------

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

// ------------------------------------------------------------
// STANDINGS STAT HELPER
// ------------------------------------------------------------

function getStandingStat(
  entry,
  names = []
) {
  const stats =
    Array.isArray(
      entry?.stats
    )
      ? entry.stats
      : [];

  const wanted =
    new Set(names);

  return (
    stats.find(
      (stat) =>
        wanted.has(
          stat?.name
        )
    ) || null
  );
}

function getStandingValue(
  entry,
  names = []
) {
  const stat =
    getStandingStat(
      entry,
      names
    );

  if (!stat) {
    return "-";
  }

  return (
    stat.displayValue ??
    stat.value ??
    "-"
  );
}

// ------------------------------------------------------------
// EXTRACT STANDING ENTRIES
// ------------------------------------------------------------

function extractStandingEntries(
  data
) {
  const children =
    Array.isArray(
      data?.children
    )
      ? data.children
      : [];

  const entries = [];

  for (
    const child of children
  ) {
    const childEntries =
      child?.standings
        ?.entries;

    if (
      !Array.isArray(
        childEntries
      )
    ) {
      continue;
    }

    entries.push(
      ...childEntries
    );
  }

  /*
    Some ESPN responses can expose
    standings entries directly.
  */

  if (
    !entries.length &&
    Array.isArray(
      data?.standings?.entries
    )
  ) {
    entries.push(
      ...data.standings.entries
    );
  }

  return entries;
}

// ------------------------------------------------------------
// FORMAT STANDINGS
// ------------------------------------------------------------

function formatLeagueStandings(
  data,
  league
) {
  const entries =
    extractStandingEntries(
      data
    );

  if (!entries.length) {
    return "";
  }

  const rows =
    entries
      .map(
        (entry) => {
          const team =
            getTeamName(
              entry?.team
            );

          const rank =
            getStandingValue(
              entry,
              [
                "rank",
                "rankOverall"
              ]
            );

          const played =
            getStandingValue(
              entry,
              [
                "gamesPlayed",
                "GP"
              ]
            );

          const wins =
            getStandingValue(
              entry,
              [
                "wins",
                "W"
              ]
            );

          const draws =
            getStandingValue(
              entry,
              [
                "ties",
                "draws",
                "D"
              ]
            );

          const losses =
            getStandingValue(
              entry,
              [
                "losses",
                "L"
              ]
            );

          const points =
            getStandingValue(
              entry,
              [
                "points",
                "PTS"
              ]
            );

          const goalDifference =
            getStandingValue(
              entry,
              [
                "pointDifferential",
                "goalDifference",
                "GD"
              ]
            );

          return (
            `${rank}. ${team} — ${points} pts — ${played} played — W ${wins}, D ${draws}, L ${losses} — GD ${goalDifference}`
          );
        }
      );

  return (
    `${league.name} standings:\n` +
    rows.join("\n")
  );
}

// ------------------------------------------------------------
// FORMAT LEAGUE RESULT
// ------------------------------------------------------------

function formatLeagueResult(
  event
) {
  const teams =
    getEventTeams(event);

  const home =
    teams.find(
      (team) =>
        team.homeAway ===
        "home"
    ) ||
    teams[0];

  const away =
    teams.find(
      (team) =>
        team.homeAway ===
        "away"
    ) ||
    teams[1];

  const homeScore =
    home
      ? getScore(
          event,
          home.id
        )
      : null;

  const awayScore =
    away
      ? getScore(
          event,
          away.id
        )
      : null;

  return (
    `${home?.name || "Unknown"} ${homeScore ?? "-"}-${awayScore ?? "-"} ${away?.name || "Unknown"} — ${formatZambiaDateTime(getEventDate(event))} Zambia time`
  );
}

// ------------------------------------------------------------
// FORMAT LEAGUE FIXTURE
// ------------------------------------------------------------

function formatLeagueFixture(
  event
) {
  const teams =
    getEventTeams(event);

  const home =
    teams.find(
      (team) =>
        team.homeAway ===
        "home"
    ) ||
    teams[0];

  const away =
    teams.find(
      (team) =>
        team.homeAway ===
        "away"
    ) ||
    teams[1];

  const state =
    getEventState(event);

  let status =
    "Scheduled";

  if (state.live) {
    status = "LIVE";
  } else if (
    state.completed
  ) {
    const homeScore =
      home
        ? getScore(
            event,
            home.id
          )
        : null;

    const awayScore =
      away
        ? getScore(
            event,
            away.id
          )
        : null;

    status =
      homeScore !== null &&
      awayScore !== null
        ? `Final: ${homeScore}-${awayScore}`
        : "Finished";
  }

  return (
    `${home?.name || "Unknown"} vs ${away?.name || "Unknown"} — ${formatZambiaDateTime(getEventDate(event))} Zambia time — ${status}`
  );
}

// ------------------------------------------------------------
// LEAGUE FEATURE
// ------------------------------------------------------------

async function footballLeagueFeature(
  message = ""
) {
  const league =
    detectFootballLeague(
      message
    );

  if (!league) {
    return {
      ok: false,

      answer:
        "I couldn't identify the football league. Try asking about the Premier League, Champions League, La Liga, Serie A or another league.",

      provider:
        "espn",

      football: true,

      footballMode:
        "league"
    };
  }

  const requestType =
    getLeagueRequestType(
      message
    );

  // ----------------------------------------------------------
  // STANDINGS ONLY
  // ----------------------------------------------------------

  if (
    requestType ===
    "standings"
  ) {
    const standingsData =
      await getLeagueStandings(
        league
      );

    const standings =
      formatLeagueStandings(
        standingsData,
        league
      );

    if (!standings) {
      return {
        ok: true,

        answer:
          `I couldn't find the current ${league.name} standings from ESPN.`,

        provider:
          "espn",

        football: true,

        footballMode:
          "league",

        league:
          league.name,

        requestType
      };
    }

    return {
      ok: true,

      answer:
        standings,

      provider:
        "espn",

      football: true,

      footballMode:
        "league",

      league:
        league.name,

      requestType
    };
  }

  // ----------------------------------------------------------
  // RESULTS
  // ----------------------------------------------------------

  if (
    requestType ===
      "results" ||
    requestType ===
      "results-and-standings"
  ) {
    const resultsData =
      await getLeagueRecentResults(
        league,
        14
      );

    let results =
      extractEvents(
        resultsData
      );

    results =
      results
        .filter(
          (event) =>
            getEventState(
              event
            ).completed
        )
        .sort(
          (a, b) => {
            const dateA =
              safeDate(
                getEventDate(
                  a
                )
              );

            const dateB =
              safeDate(
                getEventDate(
                  b
                )
              );

            return (
              (dateB?.getTime() ||
                0) -
              (dateA?.getTime() ||
                0)
            );
          }
        )
        .slice(0, 20);

    const resultText =
      results.length
        ? results
            .map(
              formatLeagueResult
            )
            .join("\n")
        : `I couldn't find recent completed ${league.name} results from ESPN.`;

    if (
      requestType ===
      "results"
    ) {
      return {
        ok: true,

        answer:
          `${league.name} latest results:\n${resultText}`,

        provider:
          "espn",

        football: true,

        footballMode:
          "league",

        league:
          league.name,

        requestType
      };
    }

    // --------------------------------------------------------
    // RESULTS + STANDINGS
    // --------------------------------------------------------

    const standingsData =
      await getLeagueStandings(
        league
      );

    const standings =
      formatLeagueStandings(
        standingsData,
        league
      );

    const combined =
      `${league.name} latest results:\n${resultText}\n\n${
        standings ||
        `Current ${league.name} standings are unavailable from ESPN.`
      }`;

    return {
      ok: true,

      answer:
        combined,

      provider:
        "espn",

      football: true,

      footballMode:
        "league",

      league:
        league.name,

      requestType
    };
  }

  // ----------------------------------------------------------
  // CURRENT / UPCOMING FIXTURES
  // ----------------------------------------------------------

  const data =
    await getLeagueScoreboard(
      league
    );

  const events =
    extractEvents(data);

  if (
    !events.length
  ) {
    return {
      ok: true,

      answer:
        `I couldn't find current ${league.name} match data from ESPN.`,

      provider:
        "espn",

      football: true,

      footballMode:
        "league",

      league:
        league.name,

      requestType
    };
  }

  let matches =
    events
      .map(
        formatLeagueFixture
      );

  if (
    requestType ===
    "today"
  ) {
    const today =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            ZAMBIA_TIMEZONE
        }
      ).format(
        new Date()
      );

    matches =
      events
        .filter(
          (event) => {
            const eventDate =
              safeDate(
                getEventDate(
                  event
                )
              );

            if (!eventDate) {
              return false;
            }

            const eventDay =
              new Intl.DateTimeFormat(
                "en-CA",
                {
                  timeZone:
                    ZAMBIA_TIMEZONE
                }
              ).format(
                eventDate
              );

            return (
              eventDay ===
              today
            );
          }
        )
        .map(
          formatLeagueFixture
        );
  }

  matches =
    matches.slice(
      0,
      20
    );

  const answer =
    `${league.name}:\n` +
    (
      matches.length
        ? matches.join(
            "\n"
          )
        : "No matches found for the requested period."
    );

  return {
    ok: true,

    answer,

    provider:
      "espn",

    football: true,

    footballMode:
      "league",

    league:
      league.name,

    requestType
  };
}

// ------------------------------------------------------------
// WORLDWIDE FOOTBALL
// ------------------------------------------------------------

async function footballFeature() {
  return {
    ok: true,

    answer:
      "Football data is available worldwide through the football provider. Ask me about a team, league, fixture, result, live match or standings.",

    provider:
      "espn",

    football: true,

    footballMode:
      "worldwide"
  };
}

// ------------------------------------------------------------
// FOOTBALL FOR DATE
// ------------------------------------------------------------

async function getFootballForDate(
  dateString,
  league =
    FOOTBALL_LEAGUES
      .premierLeague
) {
  const url =
    `${SITE_BASE}/${league.slug}/scoreboard?dates=${encodeURIComponent(
      dateString
    )}`;

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

// ------------------------------------------------------------
// EXPORTS
// ------------------------------------------------------------

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
