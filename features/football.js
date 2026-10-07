// features/football.js
// Zed — Worldwide Football Data & Analysis Engine
// Data source: ESPN public soccer API
//
// IMPORTANT:
// This file provides evidence-based football data and basic
// statistical analysis. It does NOT guarantee predictions.

const ESPN =
  "https://site.api.espn.com/apis/site/v2/sports/soccer";

const STANDINGS =
  "https://site.api.espn.com/apis/v2/sports/soccer";

const TZ =
  "Africa/Lusaka";

const FETCH_TIMEOUT =
  10000;

/* -------------------------------------------------------
   LEAGUES
------------------------------------------------------- */

const LEAGUES = {
  "premier league": "eng.1",
  epl: "eng.1",
  "english premier league": "eng.1",

  "champions league": "uefa.champions",
  "uefa champions league": "uefa.champions",

  "europa league": "uefa.europa",
  "uefa europa league": "uefa.europa",

  "conference league": "uefa.europa.conf",
  "uefa europa conference league": "uefa.europa.conf",

  "la liga": "esp.1",
  "spanish league": "esp.1",

  "serie a": "ita.1",
  "italian league": "ita.1",

  bundesliga: "ger.1",
  "german league": "ger.1",

  "ligue 1": "fra.1",
  "french league": "fra.1",

  mls: "usa.1",
  "major league soccer": "usa.1",

  "liga portugal": "por.1",
  "primeira liga": "por.1",

  "eredivisie": "ned.1",
  "dutch league": "ned.1",

  "belgian pro league": "bel.1",
  "jupiler pro league": "bel.1",

  "saudi pro league": "ksa.1",
  "saudi league": "ksa.1",

  "turkish super lig": "tur.1",
  "super lig": "tur.1",

  "brazil serie a": "bra.1",
  "brasileirao": "bra.1",

  "argentine league": "arg.1",
  "liga profesional argentina": "arg.1",

  "colombian league": "col.1",

  "mexican league": "mex.1",
  "liga mx": "mex.1",

  "j league": "jpn.1",
  "j1 league": "jpn.1",

  "a league": "aus.1",
  "a-league": "aus.1",

  "south african league": "rsa.1",
  "south african premier division": "rsa.1",

  "zambian super league": "zam.1",

  "world cup": "fifa.world",
  "fifa world cup": "fifa.world",

  "afcon": "caf.nations",
  "africa cup of nations": "caf.nations",

  "copa america": "conmebol.america"
};

/* -------------------------------------------------------
   KNOWN TEAMS
------------------------------------------------------- */

const TEAMS = {
  arsenal: ["Arsenal", "359", "eng.1"],
  "arsenal fc": ["Arsenal", "359", "eng.1"],

  chelsea: ["Chelsea", "363", "eng.1"],
  "chelsea fc": ["Chelsea", "363", "eng.1"],

  "manchester united": [
    "Manchester United",
    "360",
    "eng.1"
  ],

  "man united": [
    "Manchester United",
    "360",
    "eng.1"
  ],

  "man utd": [
    "Manchester United",
    "360",
    "eng.1"
  ],

  "manchester city": [
    "Manchester City",
    "382",
    "eng.1"
  ],

  "man city": [
    "Manchester City",
    "382",
    "eng.1"
  ],

  liverpool: [
    "Liverpool",
    "364",
    "eng.1"
  ],

  "liverpool fc": [
    "Liverpool",
    "364",
    "eng.1"
  ],

  tottenham: [
    "Tottenham Hotspur",
    "367",
    "eng.1"
  ],

  "tottenham hotspur": [
    "Tottenham Hotspur",
    "367",
    "eng.1"
  ],

  newcastle: [
    "Newcastle United",
    "361",
    "eng.1"
  ],

  "newcastle united": [
    "Newcastle United",
    "361",
    "eng.1"
  ],

  everton: [
    "Everton",
    "368",
    "eng.1"
  ],

  fulham: [
    "Fulham",
    "370",
    "eng.1"
  ],

  "aston villa": [
    "Aston Villa",
    "362",
    "eng.1"
  ],

  "west ham": [
    "West Ham United",
    "371",
    "eng.1"
  ],

  "west ham united": [
    "West Ham United",
    "371",
    "eng.1"
  ],

  "crystal palace": [
    "Crystal Palace",
    "384",
    "eng.1"
  ],

  brighton: [
    "Brighton & Hove Albion",
    "397",
    "eng.1"
  ],

  "brighton and hove albion": [
    "Brighton & Hove Albion",
    "397",
    "eng.1"
  ],

  "nottingham forest": [
    "Nottingham Forest",
    "393",
    "eng.1"
  ],

  bournemouth: [
    "AFC Bournemouth",
    "8678",
    "eng.1"
  ],

  "afc bournemouth": [
    "AFC Bournemouth",
    "8678",
    "eng.1"
  ],

  leeds: [
    "Leeds United",
    "357",
    "eng.1"
  ],

  "leeds united": [
    "Leeds United",
    "357",
    "eng.1"
  ],

  sunderland: [
    "Sunderland",
    "366",
    "eng.1"
  ],

  ipswich: [
    "Ipswich Town",
    "373",
    "eng.1"
  ],

  "ipswich town": [
    "Ipswich Town",
    "373",
    "eng.1"
  ],

  wolves: [
    "Wolverhampton Wanderers",
    "380",
    "eng.1"
  ],

  wolverhampton: [
    "Wolverhampton Wanderers",
    "380",
    "eng.1"
  ],

  "wolverhampton wanderers": [
    "Wolverhampton Wanderers",
    "380",
    "eng.1"
  ],

  brentford: [
    "Brentford",
    "337",
    "eng.1"
  ],

  "coventry city": [
    "Coventry City",
    "381",
    "eng.1"
  ],

  "hull city": [
    "Hull City",
    "306",
    "eng.1"
  ],

  barcelona: [
    "Barcelona",
    "83",
    "esp.1"
  ],

  "barcelona fc": [
    "Barcelona",
    "83",
    "esp.1"
  ],

  "real madrid": [
    "Real Madrid",
    "86",
    "esp.1"
  ],

  "atletico madrid": [
    "Atletico Madrid",
    "1068",
    "esp.1"
  ],

  juventus: [
    "Juventus",
    "111",
    "ita.1"
  ],

  "inter milan": [
    "Inter Milan",
    "110",
    "ita.1"
  ],

  inter: [
    "Inter Milan",
    "110",
    "ita.1"
  ],

  milan: [
    "AC Milan",
    "103",
    "ita.1"
  ],

  "ac milan": [
    "AC Milan",
    "103",
    "ita.1"
  ],

  bayern: [
    "Bayern Munich",
    "132",
    "ger.1"
  ],

  "bayern munich": [
    "Bayern Munich",
    "132",
    "ger.1"
  ],

  dortmund: [
    "Borussia Dortmund",
    "124",
    "ger.1"
  ],

  "borussia dortmund": [
    "Borussia Dortmund",
    "124",
    "ger.1"
  ],

  psg: [
    "Paris Saint-Germain",
    "160",
    "fra.1"
  ],

  "paris saint-germain": [
    "Paris Saint-Germain",
    "160",
    "fra.1"
  ]
};

/* -------------------------------------------------------
   BASIC HELPERS
------------------------------------------------------- */

const clean = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function getJson(url) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      FETCH_TIMEOUT
    );

  try {
    const response =
      await fetch(url, {
        headers: {
          "User-Agent":
            "Zed/1.0; +https://zed-ai-h7h4.onrender.com",
          Accept:
            "application/json"
        },
        signal:
          controller.signal
      });

    if (!response.ok) {
      throw new Error(
        `ESPN request failed: ${response.status}`
      );
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function dateKey(date = new Date()) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }
  )
    .format(date)
    .replace(/-/g, "");
}

function formatDate(value) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: TZ,
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  ).format(date);
}

function formatTime(value) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  ).format(date);
}

function state(event) {
  return (
    event?.competitions?.[0]
      ?.status?.type?.state ||
    "unknown"
  );
}

function events(data) {
  return Array.isArray(
    data?.events
  )
    ? data.events
    : [];
}

/* -------------------------------------------------------
   TEAM DETECTION
------------------------------------------------------- */

function findTeam(text) {
  const q =
    clean(text);

  const matches =
    Object.entries(
      TEAMS
    )
      .filter(
        ([key]) =>
          q.includes(key)
      )
      .sort(
        (a, b) =>
          b[0].length -
          a[0].length
      );

  if (!matches.length) {
    return null;
  }

  const [
    key,
    [
      name,
      id,
      league
    ]
  ] =
    matches[0];

  return {
    key,
    name,
    id,
    league
  };
}

function detectFootballTeam(
  message = ""
) {
  return !!findTeam(
    message
  );
}

/* -------------------------------------------------------
   REQUEST TYPE
------------------------------------------------------- */

function getFootballRequestType(
  message = ""
) {
  const q =
    clean(message);

  if (
    /predict|prediction|predictive|who will win|winner|forecast|odds|chance|probability|likely to win|likely winner|score prediction|correct score/.test(
      q
    )
  ) {
    return "prediction";
  }

  if (
    /standings|table|league table|position|positions|points/.test(
      q
    )
  ) {
    return "standings";
  }

  if (
    /next match|next game|upcoming|fixture|fixtures|schedule|when.*play|play.*when/.test(
      q
    )
  ) {
    return "upcoming";
  }

  if (
    /last match|previous match|recent match|recent results|results|result|played|score/.test(
      q
    )
  ) {
    return "results";
  }

  if (
    /today|tonight|tomorrow/.test(
      q
    )
  ) {
    return "date";
  }

  return "general";
}

/* -------------------------------------------------------
   MATCH HELPERS
------------------------------------------------------- */

function getCompetitors(game) {
  return (
    game?.competitions?.[0]
      ?.competitors || []
  );
}

function getHome(game) {
  return getCompetitors(
    game
  ).find(
    c =>
      c.homeAway ===
      "home"
  );
}

function getAway(game) {
  return getCompetitors(
    game
  ).find(
    c =>
      c.homeAway ===
      "away"
  );
}

function getTeamId(game, teamId) {
  return getCompetitors(
    game
  ).find(
    c =>
      String(
        c?.team?.id
      ) ===
      String(teamId)
  );
}

function formatGame(game) {
  const home =
    getHome(game);

  const away =
    getAway(game);

  const homeName =
    home?.team?.displayName ||
    "Home";

  const awayName =
    away?.team?.displayName ||
    "Away";

  const matchState =
    state(game);

  let score = "";

  if (
    matchState ===
      "post" ||
    matchState ===
      "in"
  ) {
    score =
      ` — ${home?.score ?? "-"}-${away?.score ?? "-"}`;
  }

  return `${homeName} vs ${awayName}${score} — ${formatDate(
    game.date
  )} at ${formatTime(
    game.date
  )} Zambia time`;
}

/* -------------------------------------------------------
   TEAM FIXTURE SEARCH
------------------------------------------------------- */

async function getTeamGames(
  team
) {
  let games = [];

  try {
    const data =
      await getJson(
        `${ESPN}/${team.league}/teams/${team.id}/schedule`
      );

    games =
      events(data);
  } catch {
    games = [];
  }

  const now =
    Date.now();

  const hasFuture =
    games.some(
      game =>
        new Date(
          game.date
        ).getTime() >
        now
    );

  if (
    !hasFuture
  ) {
    try {
      const start =
        new Date();

      const end =
        new Date();

      end.setDate(
        end.getDate() +
          120
      );

      const startKey =
        dateKey(start);

      const endKey =
        dateKey(end);

      const data =
        await getJson(
          `${ESPN}/${team.league}/scoreboard?dates=${startKey}-${endKey}`
        );

      const found =
        events(data)
          .filter(
            game =>
              getTeamId(
                game,
                team.id
              )
          );

      games = [
        ...games,
        ...found
      ];
    } catch (error) {
      console.error(
        "Team fixture fallback:",
        error
      );
    }
  }

  const seen =
    new Set();

  return games
    .filter(
      game => {
        const id =
          game.id ||
          `${game.date}-${game?.competitions?.[0]?.id || ""}`;

        if (
          seen.has(id)
        ) {
          return false;
        }

        seen.add(id);

        return true;
      }
    )
    .sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    );
}

/* -------------------------------------------------------
   RESULT ANALYSIS
------------------------------------------------------- */

function getResultForTeam(
  game,
  teamId
) {
  if (
    state(game) !==
    "post"
  ) {
    return null;
  }

  const team =
    getTeamId(
      game,
      teamId
    );

  const home =
    getHome(game);

  const away =
    getAway(game);

  if (
    !team ||
    !home ||
    !away
  ) {
    return null;
  }

  const teamScore =
    Number(
      team?.score
    );

  const opponent =
    String(
      team?.team?.id
    ) ===
    String(
      home?.team?.id
    )
      ? away
      : home;

  const opponentScore =
    Number(
      opponent?.score
    );

  if (
    Number.isNaN(
      teamScore
    ) ||
    Number.isNaN(
      opponentScore
    )
  ) {
    return null;
  }

  let result =
    "D";

  if (
    teamScore >
    opponentScore
  ) {
    result = "W";
  }

  if (
    teamScore <
    opponentScore
  ) {
    result = "L";
  }

  return {
    result,
    goalsFor:
      teamScore,
    goalsAgainst:
      opponentScore,
    home:
      team?.homeAway ===
      "home",
    opponent:
      opponent?.team
        ?.displayName ||
      "Unknown",
    date:
      game.date
  };
}

function calculateForm(
  games,
  teamId,
  limit = 10
) {
  const completed =
    games
      .filter(
        game =>
          state(game) ===
          "post"
      )
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      )
      .slice(
        0,
        limit
      );

  const form = [];

  let wins = 0;
  let draws = 0;
  let losses = 0;

  let goalsFor = 0;
  let goalsAgainst = 0;

  let homeWins = 0;
  let homeDraws = 0;
  let homeLosses = 0;

  let awayWins = 0;
  let awayDraws = 0;
  let awayLosses = 0;

  for (
    const game of completed
  ) {
    const result =
      getResultForTeam(
        game,
        teamId
      );

    if (!result) {
      continue;
    }

    form.push(
      result.result
    );

    goalsFor +=
      result.goalsFor;

    goalsAgainst +=
      result.goalsAgainst;

    if (
      result.result ===
      "W"
    ) {
      wins++;
    } else if (
      result.result ===
      "D"
    ) {
      draws++;
    } else {
      losses++;
    }

    const team =
      getTeamId(
        game,
        teamId
      );

    if (
      team?.homeAway ===
      "home"
    ) {
      if (
        result.result ===
        "W"
      ) {
        homeWins++;
      } else if (
        result.result ===
        "D"
      ) {
        homeDraws++;
      } else {
        homeLosses++;
      }
    }

    if (
      team?.homeAway ===
      "away"
    ) {
      if (
        result.result ===
        "W"
      ) {
        awayWins++;
      } else if (
        result.result ===
        "D"
      ) {
        awayDraws++;
      } else {
        awayLosses++;
      }
    }
  }

  const played =
    form.length;

  const points =
    wins * 3 +
    draws;

  const winRate =
    played
      ? wins / played
      : 0;

  const pointsRate =
    played
      ? points /
        (played * 3)
      : 0;

  const goalDifference =
    goalsFor -
    goalsAgainst;

  return {
    played,
    form,
    wins,
    draws,
    losses,
    points,
    pointsRate,
    winRate,
    goalsFor,
    goalsAgainst,
    goalDifference,
    averageGoalsFor:
      played
        ? goalsFor /
          played
        : 0,
    averageGoalsAgainst:
      played
        ? goalsAgainst /
          played
        : 0,

    home: {
      wins: homeWins,
      draws: homeDraws,
      losses: homeLosses
    },

    away: {
      wins: awayWins,
      draws: awayDraws,
      losses: awayLosses
    }
  };
}

/* -------------------------------------------------------
   FORM SCORE
------------------------------------------------------- */

function formScore(
  analysis
) {
  if (
    !analysis ||
    !analysis.played
  ) {
    return 50;
  }

  const points =
    analysis.pointsRate *
    70;

  const goalComponent =
    Math.max(
      -15,
      Math.min(
        15,
        analysis.goalDifference *
          2
      )
    );

  return Math.max(
    0,
    Math.min(
      100,
      15 +
        points +
        goalComponent
    )
  );
}

/* -------------------------------------------------------
   PREDICTION
------------------------------------------------------- */

function normalizeProbabilities(
  home,
  draw,
  away
) {
  const total =
    home +
    draw +
    away;

  if (
    !total
  ) {
    return {
      home: 33.3,
      draw: 33.4,
      away: 33.3
    };
  }

  return {
    home:
      Math.round(
        (home /
          total) *
          1000
      ) / 10,

    draw:
      Math.round(
        (draw /
          total) *
          1000
      ) / 10,

    away:
      Math.round(
        (away /
          total) *
          1000
      ) / 10
  };
}

function calculatePrediction(
  homeAnalysis,
  awayAnalysis
) {
  const homeForm =
    formScore(
      homeAnalysis
    );

  const awayForm =
    formScore(
      awayAnalysis
    );

  const homeAdvantage =
    7;

  let homeStrength =
    homeForm +
    homeAdvantage;

  let awayStrength =
    awayForm;

  const homeAttack =
    homeAnalysis
      ?.averageGoalsFor ||
    0;

  const awayAttack =
    awayAnalysis
      ?.averageGoalsFor ||
    0;

  const homeDefense =
    homeAnalysis
      ?.averageGoalsAgainst ||
    0;

  const awayDefense =
    awayAnalysis
      ?.averageGoalsAgainst ||
    0;

  homeStrength +=
    Math.min(
      10,
      homeAttack * 3
    );

  awayStrength +=
    Math.min(
      10,
      awayAttack * 3
    );

  homeStrength -=
    Math.min(
      8,
      homeDefense
    );

  awayStrength -=
    Math.min(
      8,
      awayDefense
    );

  const difference =
    homeStrength -
    awayStrength;

  const baseDraw =
    28 -
    Math.min(
      10,
      Math.abs(
        difference
      ) * 0.12
    );

  const homeBase =
    50 +
    difference *
      0.65;

  const awayBase =
    50 -
    difference *
      0.65;

  const probabilities =
    normalizeProbabilities(
      Math.max(
        5,
        homeBase
      ),
      Math.max(
        10,
        baseDraw
      ),
      Math.max(
        5,
        awayBase
      )
    );

  const entries = [
    {
      outcome: "Home win",
      probability:
        probabilities.home
    },
    {
      outcome: "Draw",
      probability:
        probabilities.draw
    },
    {
      outcome: "Away win",
      probability:
        probabilities.away
    }
  ].sort(
    (a, b) =>
      b.probability -
      a.probability
  );

  const confidence =
    Math.abs(
      entries[0]
        .probability -
        entries[1]
          .probability
    );

  let confidenceLabel =
    "Low";

  if (
    confidence >= 15
  ) {
    confidenceLabel =
      "Medium";
  }

  if (
    confidence >= 25
  ) {
    confidenceLabel =
      "Higher";
  }

  return {
    probabilities,
    predictedOutcome:
      entries[0]
        .outcome,
    confidence:
      confidenceLabel,
    confidenceGap:
      Math.round(
        confidence * 10
      ) / 10
  };
}

/* -------------------------------------------------------
   PREDICTION DATA
------------------------------------------------------- */

async function buildMatchPrediction(
  team,
  games
) {
  const now =
    Date.now();

  const upcoming =
    games
      .filter(
        game =>
          new Date(
            game.date
          ).getTime() >
          now
      )
      .sort(
        (a, b) =>
          new Date(a.date) -
          new Date(b.date)
      );

  if (
    !upcoming.length
  ) {
    return null;
  }

  const next =
    upcoming[0];

  const home =
    getHome(next);

  const away =
    getAway(next);

  if (
    !home ||
    !away
  ) {
    return null;
  }

  const homeTeam = {
    name:
      home.team
        ?.displayName,
    id:
      home.team?.id
  };

  const awayTeam = {
    name:
      away.team
        ?.displayName,
    id:
      away.team?.id
  };

  let homeGames =
    games;

  let awayGames =
    games;

  try {
    if (
      String(
        homeTeam.id
      ) !==
      String(team.id)
    ) {
      const data =
        await getTeamGames({
          name:
            homeTeam.name,
          id:
            homeTeam.id,
          league:
            team.league
        });

      homeGames =
        data;
    }

    if (
      String(
        awayTeam.id
      ) !==
      String(team.id)
    ) {
      const data =
        await getTeamGames({
          name:
            awayTeam.name,
          id:
            awayTeam.id,
          league:
            team.league
        });

      awayGames =
        data;
    }
  } catch (error) {
    console.warn(
      "Prediction team data:",
      error.message
    );
  }

  const homeAnalysis =
    calculateForm(
      homeGames,
      homeTeam.id,
      10
    );

  const awayAnalysis =
    calculateForm(
      awayGames,
      awayTeam.id,
      10
    );

  const prediction =
    calculatePrediction(
      homeAnalysis,
      awayAnalysis
    );

  return {
    match: {
      home:
        homeTeam.name,
      away:
        awayTeam.name,
      date:
        formatDate(
          next.date
        ),
      time:
        formatTime(
          next.date
        )
    },

    homeForm:
      homeAnalysis,

    awayForm:
      awayAnalysis,

    prediction
  };
}

/* -------------------------------------------------------
   FORMAT PREDICTION
------------------------------------------------------- */

function formatPrediction(
  data
) {
  if (!data) {
    return (
      "I don't have enough upcoming-match data to calculate a prediction."
    );
  }

  const {
    match,
    homeForm,
    awayForm,
    prediction
  } = data;

  return [
    `Prediction analysis: ${match.home} vs ${match.away}`,
    `Match: ${match.date} at ${match.time} Zambia time`,
    "",
    `${match.home} recent form: ${
      homeForm.form.join("-") ||
      "N/A"
    }`,
    `${match.home}: ${homeForm.wins}W ${homeForm.draws}D ${homeForm.losses}L, ${homeForm.goalsFor} goals scored, ${homeForm.goalsAgainst} conceded`,
    "",
    `${match.away} recent form: ${
      awayForm.form.join("-") ||
      "N/A"
    }`,
    `${match.away}: ${awayForm.wins}W ${awayForm.draws}D ${awayForm.losses}L, ${awayForm.goalsFor} goals scored, ${awayForm.goalsAgainst} conceded`,
    "",
    `Estimated probabilities:`,
    `Home win: ${prediction.probabilities.home}%`,
    `Draw: ${prediction.probabilities.draw}%`,
    `Away win: ${prediction.probabilities.away}%`,
    "",
    `Model lean: ${prediction.predictedOutcome}`,
    `Confidence: ${prediction.confidence}`,
    "",
    "This is a statistical estimate based mainly on recent results, goals and home advantage. It is not a guaranteed prediction and does not yet include live injuries, confirmed lineups, xG or player-level models."
  ].join("\n");
}

/* -------------------------------------------------------
   TEAM FOOTBALL
------------------------------------------------------- */

async function footballTeamFeature(
  message = ""
) {
  const team =
    findTeam(message);

  if (!team) {
    return {
      answer:
        "I couldn't identify the football team. Please include the team name.",
      team: null
    };
  }

  try {
    const games =
      await getTeamGames(
        team
      );

    if (
      !games.length
    ) {
      return {
        answer:
          `I couldn't retrieve current football data for ${team.name}.`,
        team:
          team.name
      };
    }

    const requestType =
      getFootballRequestType(
        message
      );

    const now =
      Date.now();

    const upcoming =
      games
        .filter(
          game =>
            new Date(
              game.date
            ).getTime() >=
            now -
              3600000
        )
        .sort(
          (a, b) =>
            new Date(a.date) -
            new Date(b.date)
        );

    const completed =
      games
        .filter(
          game =>
            state(game) ===
            "post"
        )
        .sort(
          (a, b) =>
            new Date(b.date) -
            new Date(a.date)
        );

    /* ---------------- PREDICTION ---------------- */

    if (
      requestType ===
      "prediction"
    ) {
      const prediction =
        await buildMatchPrediction(
          team,
          games
        );

      return {
        answer:
          formatPrediction(
            prediction
          ),

        team:
          team.name,

        prediction
      };
    }

    /* ---------------- UPCOMING ---------------- */

    if (
      requestType ===
      "upcoming"
    ) {
      const list =
        upcoming.slice(
          0,
          5
        );

      return {
        answer:
          list.length
            ? `${team.name} upcoming matches:\n${list
                .map(
                  formatGame
                )
                .join("\n")}`
            : `There are no upcoming ${team.name} matches available.`,

        team:
          team.name
      };
    }

    /* ---------------- RESULTS ---------------- */

    if (
      requestType ===
      "results"
    ) {
      const list =
        completed.slice(
          0,
          10
        );

      return {
        answer:
          list.length
            ? `${team.name} recent results:\n${list
                .map(
                  formatGame
                )
                .join("\n")}`
            : `There are no recent ${team.name} results available.`,

        team:
          team.name
      };
    }

    /* ---------------- GENERAL ---------------- */

    const form =
      calculateForm(
        games,
        team.id,
        10
      );

    const next =
      upcoming[0];

    const previous =
      completed[0];

    let answer =
      `${team.name} football information:\n`;

    if (
      next
    ) {
      answer +=
        `Next: ${formatGame(
          next
        )}\n`;
    }

    if (
      previous
    ) {
      answer +=
        `Previous: ${formatGame(
          previous
        )}\n`;
    }

    answer +=
      `Recent form: ${
        form.form.join("-") ||
        "N/A"
      }\n`;

    answer +=
      `Last ${form.played} completed matches: ${form.wins}W ${form.draws}D ${form.losses}L\n`;

    answer +=
      `Goals: ${form.goalsFor} scored, ${form.goalsAgainst} conceded`;

    return {
      answer,
      team:
        team.name,
      form
    };
  } catch (error) {
    console.error(
      "footballTeamFeature:",
      error
    );

    return {
      answer:
        `I couldn't retrieve current football data for ${team.name}.`,
      team:
        team.name
    };
  }
}

/* -------------------------------------------------------
   LEAGUE DETECTION
------------------------------------------------------- */

function detectFootballLeague(
  message = ""
) {
  const q =
    clean(message);

  const matches =
    Object.entries(
      LEAGUES
    )
      .filter(
        ([name]) =>
          q.includes(name)
      )
      .sort(
        (a, b) =>
          b[0].length -
          a[0].length
      );

  if (
    !matches.length
  ) {
    return null;
  }

  return {
    name:
      matches[0][0],
    id:
      matches[0][1]
  };
}

/* -------------------------------------------------------
   LEAGUE FOOTBALL
------------------------------------------------------- */

async function footballLeagueFeature(
  message = ""
) {
  const league =
    detectFootballLeague(
      message
    ) || {
      name:
        "Premier League",
      id:
        "eng.1"
    };

  try {
    const requestType =
      getFootballRequestType(
        message
      );

    /* ---------------- STANDINGS ---------------- */

    if (
      requestType ===
      "standings"
    ) {
      const data =
        await getJson(
          `${STANDINGS}/${league.id}/standings`
        );

      const rows =
        [];

      for (
        const group of
          data?.children ||
          []
      ) {
        for (
          const entry of
            group?.standings
              ?.entries ||
            []
        ) {
          const stats =
            {};

          for (
            const stat of
              entry.stats ||
              []
          ) {
            stats[
              stat.name
            ] =
              stat.value;

            stats[
              stat.abbreviation
            ] =
              stat.value;
          }

          rows.push({
            rank:
              entry.team
                ?.rank ||
              rows.length +
                1,

            team:
              entry.team
                ?.displayName ||
              entry.team
                ?.name,

            played:
              stats.gamesPlayed ??
              stats.gp ??
              0,

            won:
              stats.wins ??
              stats.w ??
              0,

            drawn:
              stats.ties ??
              stats.draws ??
              stats.d ??
              0,

            lost:
              stats.losses ??
              stats.l ??
              0,

            points:
              stats.points ??
              stats.pts ??
              0
          });
        }
      }

      rows.sort(
        (a, b) =>
          Number(a.rank) -
          Number(b.rank)
      );

      if (
        !rows.length
      ) {
        return {
          answer:
            `I couldn't retrieve the ${league.name} standings.`,
          league:
            league.name
        };
      }

      return {
        answer:
          `${league.name} standings:\n` +
          rows
            .map(
              r =>
                `${r.rank}. ${r.team} — ${r.played} played, ${r.won}W ${r.drawn}D ${r.lost}L, ${r.points} pts`
            )
            .join("\n"),

        league:
          league.name,

        standings:
          rows
      };
    }

    /* ---------------- RECENT RESULTS ---------------- */

    const today =
      new Date();

    const dates =
      [];

    for (
      let i = 0;
      i < 14;
      i++
    ) {
      const d =
        new Date(
          today
        );

      d.setDate(
        today.getDate() -
          i
      );

      dates.push(
        dateKey(d)
      );
    }

    const all =
      [];

    const requests =
      dates.map(
        async date => {
          try {
            const data =
              await getJson(
                `${ESPN}/${league.id}/scoreboard?dates=${date}`
              );

            return events(
              data
            ).filter(
              game =>
                state(game) ===
                "post"
            );
          } catch {
            return [];
          }
        }
      );

    const results =
      await Promise.all(
        requests
      );

    for (
      const list of results
    ) {
      all.push(
        ...list
      );
    }

    const seen =
      new Set();

    const unique =
      all
        .filter(
          game => {
            const id =
              game.id ||
              `${game.date}-${game?.competitions?.[0]?.id || ""}`;

            if (
              seen.has(id)
            ) {
              return false;
            }

            seen.add(id);

            return true;
          }
        )
        .sort(
          (a, b) =>
            new Date(b.date) -
            new Date(a.date)
        )
        .slice(
          0,
          15
        );

    return {
      answer:
        unique.length
          ? `Latest ${league.name} results:\n${unique
              .map(
                formatGame
              )
              .join("\n")}`
          : `I couldn't find recent ${league.name} results.`,

      league:
        league.name,

      results:
        unique
    };
  } catch (error) {
    console.error(
      "footballLeagueFeature:",
      error
    );

    return {
      answer:
        `I couldn't retrieve current ${league.name} data.`,

      league:
        league.name
    };
  }
}

/* -------------------------------------------------------
   WORLDWIDE FOOTBALL
------------------------------------------------------- */

async function footballFeature() {
  try {
    const data =
      await getJson(
        `${ESPN}/all/scoreboard?dates=${dateKey()}`
      );

    const games =
      events(data);

    if (
      !games.length
    ) {
      return {
        answer:
          "There are no football matches available for today."
      };
    }

    return {
      answer:
        "Football matches today:\n" +
        games
          .slice(
            0,
            30
          )
          .map(
            game => {
              const home =
                getHome(
                  game
                );

              const away =
                getAway(
                  game
                );

              const matchState =
                state(
                  game
                );

              let score =
                "";

              if (
                matchState ===
                  "post" ||
                matchState ===
                  "in"
              ) {
                score =
                  ` ${home?.score ?? "-"}-${away?.score ?? "-"}`;
              }

              return `${home?.team?.displayName || "Home"}${score} ${
                away?.team?.displayName ||
                "Away"
              } — ${formatTime(
                game.date
              )} Zambia time`;
            }
          )
          .join("\n"),

      events:
        games
    };
  } catch (error) {
    console.error(
      "footballFeature:",
      error
    );

    return {
      answer:
        "I couldn't retrieve worldwide football data right now."
    };
  }
}

/* -------------------------------------------------------
   TEAM SEARCH
------------------------------------------------------- */

async function searchFootballTeams(
  query = ""
) {
  const q =
    clean(query);

  if (
    !q
  ) {
    return [];
  }

  const local =
    Object.entries(
      TEAMS
    )
      .filter(
        ([key]) =>
          key.includes(q)
      )
      .map(
        ([, value]) => ({
          name:
            value[0],
          id:
            value[1],
          league:
            value[2]
        })
      );

  if (
    local.length
  ) {
    return local;
  }

  /*
   * ESPN's league team endpoint is
   * used as a worldwide fallback.
   */

  const leagueIds =
    [
      "eng.1",
      "esp.1",
      "ita.1",
      "ger.1",
      "fra.1",
      "por.1",
      "ned.1",
      "usa.1",
      "bra.1",
      "arg.1",
      "mex.1",
      "ksa.1",
      "tur.1"
    ];

  const found =
    [];

  const searches =
    leagueIds.map(
      async league => {
        try {
          const data =
            await getJson(
              `${ESPN}/${league}/teams`
            );

          return {
            league,
            teams:
              data?.sports?.[0]
                ?.leagues?.[0]
                ?.teams ||
              []
          };
        } catch {
          return {
            league,
            teams: []
          };
        }
      }
    );

  const responses =
    await Promise.all(
      searches
    );

  for (
    const response of
      responses
  ) {
    for (
      const item of
        response.teams
    ) {
      const team =
        item.team;

      if (
        !team
      ) {
        continue;
      }

      if (
        clean(
          team.displayName
        ).includes(q)
      ) {
        found.push({
          name:
            team.displayName,
          id:
            team.id,
          league:
            response.league
        });
      }
    }
  }

  return found;
}

/* -------------------------------------------------------
   FOOTBALL FOR SPECIFIC DATE
------------------------------------------------------- */

async function getFootballForDate(
  date,
  league = "all"
) {
  try {
    const cleanedLeague =
      clean(league);

    const leagueId =
      LEAGUES[
        cleanedLeague
      ] ||
      league;

    const safeDate =
      String(date).replace(
        /-/g,
        ""
      );

    const endpoint =
      leagueId ===
      "all"
        ? `${ESPN}/all/scoreboard?dates=${safeDate}`
        : `${ESPN}/${leagueId}/scoreboard?dates=${safeDate}`;

    const data =
      await getJson(
        endpoint
      );

    return {
      ok:
        true,

      date,

      league:
        leagueId,

      events:
        events(data)
    };
  } catch (error) {
    console.error(
      "getFootballForDate:",
      error
    );

    return {
      ok:
        false,

      date,

      league,

      events:
        []
    };
  }
}

/* -------------------------------------------------------
   EXPORTS
------------------------------------------------------- */

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
