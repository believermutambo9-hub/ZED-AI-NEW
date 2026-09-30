// features/football.js
// Compact football engine for Zed AI
// Data source: ESPN public soccer API

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const STANDINGS = "https://site.api.espn.com/apis/v2/sports/soccer";
const TZ = "Africa/Lusaka";

const LEAGUES = {
  "premier league": "eng.1",
  "epl": "eng.1",
  "english premier league": "eng.1",
  "champions league": "uefa.champions",
  "uefa champions league": "uefa.champions",
  "la liga": "esp.1",
  "spanish league": "esp.1",
  "serie a": "ita.1",
  "italian league": "ita.1",
  "bundesliga": "ger.1",
  "german league": "ger.1",
  "ligue 1": "fra.1",
  "french league": "fra.1",
  "mls": "usa.1",
  "major league soccer": "usa.1",
  "world cup": "fifa.world"
};

// Common teams.
// IDs are ESPN team IDs.
const TEAMS = {
  arsenal: ["Arsenal", "359"],
  "arsenal fc": ["Arsenal", "359"],
  chelsea: ["Chelsea", "363"],
  "chelsea fc": ["Chelsea", "363"],
  "manchester united": ["Manchester United", "360"],
  "man united": ["Manchester United", "360"],
  "man utd": ["Manchester United", "360"],
  "manchester city": ["Manchester City", "382"],
  "man city": ["Manchester City", "382"],
  liverpool: ["Liverpool", "364"],
  "liverpool fc": ["Liverpool", "364"],
  tottenham: ["Tottenham Hotspur", "367"],
  "tottenham hotspur": ["Tottenham Hotspur", "367"],
  newcastle: ["Newcastle United", "361"],
  "newcastle united": ["Newcastle United", "361"],
  everton: ["Everton", "368"],
  fulham: ["Fulham", "370"],
  "aston villa": ["Aston Villa", "362"],
  "west ham": ["West Ham United", "371"],
  "west ham united": ["West Ham United", "371"],
  "crystal palace": ["Crystal Palace", "384"],
  "brighton": ["Brighton & Hove Albion", "397"],
  "brighton and hove albion": ["Brighton & Hove Albion", "397"],
  "nottingham forest": ["Nottingham Forest", "393"],
  "bournemouth": ["AFC Bournemouth", "8678"],
  "afc bournemouth": ["AFC Bournemouth", "8678"],
  "leeds": ["Leeds United", "357"],
  "leeds united": ["Leeds United", "357"],
  "sunderland": ["Sunderland", "366"],
  "ipswich": ["Ipswich Town", "373"],
  "ipswich town": ["Ipswich Town", "373"],
  "wolves": ["Wolverhampton Wanderers", "380"],
  "wolverhampton": ["Wolverhampton Wanderers", "380"],
  "wolverhampton wanderers": ["Wolverhampton Wanderers", "380"],
  brentford: ["Brentford", "337"],
  "coventry city": ["Coventry City", "381"],
  "hull city": ["Hull City", "306"],
  barcelona: ["Barcelona", "83"],
  "barcelona fc": ["Barcelona", "83"],
  real: ["Real Madrid", "86"],
  "real madrid": ["Real Madrid", "86"],
  "atletico madrid": ["Atletico Madrid", "1068"],
  juventus: ["Juventus", "111"],
  "inter milan": ["Inter Milan", "110"],
  inter: ["Inter Milan", "110"],
  milan: ["AC Milan", "103"],
  "ac milan": ["AC Milan", "103"],
  bayern: ["Bayern Munich", "132"],
  "bayern munich": ["Bayern Munich", "132"],
  dortmund: ["Borussia Dortmund", "124"],
  "borussia dortmund": ["Borussia Dortmund", "124"],
  psg: ["Paris Saint-Germain", "160"],
  "paris saint-germain": ["Paris Saint-Germain", "160"]
};

const clean = (v = "") =>
  String(v).toLowerCase().replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ESPN request failed: ${response.status}`);
  }
  return response.json();
}

function dateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date).replace(/-/g, "");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function state(event) {
  return event?.competitions?.[0]?.status?.type?.state || "unknown";
}

function events(data) {
  return Array.isArray(data?.events) ? data.events : [];
}

function findTeam(text) {
  const q = clean(text);

  const matches = Object.entries(TEAMS)
    .filter(([key]) => q.includes(key))
    .sort((a, b) => b[0].length - a[0].length);

  if (!matches.length) return null;

  const [key, [name, id]] = matches[0];
  return { key, name, id };
}

/* -------------------------------------------------------
   TEAM DETECTION
------------------------------------------------------- */

function detectFootballTeam(message = "") {
  return !!findTeam(message);
}

/* -------------------------------------------------------
   WHAT TYPE OF FOOTBALL REQUEST?
------------------------------------------------------- */

function getFootballRequestType(message = "") {
  const q = clean(message);

  if (
    /standings|table|league table|position|positions|points/.test(q)
  ) return "standings";

  if (
    /next match|next game|upcoming|fixture|fixtures|schedule|when.*play|play.*when/.test(q)
  ) return "upcoming";

  if (
    /last match|previous match|recent match|recent results|results|result|played|score/.test(q)
  ) return "results";

  if (/today|tonight|tomorrow/.test(q)) return "date";

  return "general";
}

/* -------------------------------------------------------
   TEAM FOOTBALL
------------------------------------------------------- */

async function footballTeamFeature(message = "") {
  const team = findTeam(message);

  if (!team) {
    return {
      answer: "I couldn't identify the football team. Please include the team name.",
      team: null
    };
  }

  try {
    // Try the English Premier League first.
    // ESPN team schedules can contain the team's wider schedule.
    const urls = [
      `${ESPN}/eng.1/teams/${team.id}/schedule`,
      `${ESPN}/eng.1/teams/${team.id}`
    ];

    let data = null;

    for (const url of urls) {
      try {
        data = await getJson(url);
        if (data) break;
      } catch {
        // Try next endpoint.
      }
    }

    const games = events(data);

    if (!games.length) {
      return {
        answer: `I couldn't retrieve the current schedule for ${team.name}.`,
        team: team.name
      };
    }

    const requestType = getFootballRequestType(message);
    const now = Date.now();

    const upcoming = games
      .filter(g => new Date(g.date).getTime() >= now - 3600000)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const completed = games
      .filter(g => new Date(g.date).getTime() < now)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const formatGame = game => {
      const competition = game.competitions?.[0];
      const competitors = competition?.competitors || [];

      const home = competitors.find(c => c.homeAway === "home");
      const away = competitors.find(c => c.homeAway === "away");

      const homeName = home?.team?.displayName || "Home";
      const awayName = away?.team?.displayName || "Away";

      const status = state(game);

      let score = "";

      if (status === "post") {
        score = ` — ${home?.score ?? "-"}-${away?.score ?? "-"}`;
      }

      return `${homeName} vs ${awayName}${score} — ${formatDate(game.date)} at ${formatTime(game.date)} Zambia time`;
    };

    if (requestType === "upcoming") {
      const list = upcoming.slice(0, 5);

      return {
        answer: list.length
          ? `${team.name} upcoming matches:\n${list.map(formatGame).join("\n")}`
          : `There are no upcoming ${team.name} matches available.`,
        team: team.name
      };
    }

    if (requestType === "results") {
      const list = completed.slice(0, 5);

      return {
        answer: list.length
          ? `${team.name} recent results:\n${list.map(formatGame).join("\n")}`
          : `There are no recent ${team.name} results available.`,
        team: team.name
      };
    }

    const next = upcoming[0];
    const previous = completed[0];

    let answer = `${team.name} football information:\n`;

    if (next) answer += `Next: ${formatGame(next)}\n`;
    if (previous) answer += `Previous: ${formatGame(previous)}`;

    return {
      answer,
      team: team.name
    };

  } catch (error) {
    console.error("footballTeamFeature:", error);

    return {
      answer: `I couldn't retrieve current football data for ${team.name}.`,
      team: team.name
    };
  }
}

/* -------------------------------------------------------
   LEAGUE DETECTION
------------------------------------------------------- */

function detectFootballLeague(message = "") {
  const q = clean(message);

  const matches = Object.entries(LEAGUES)
    .filter(([name]) => q.includes(name))
    .sort((a, b) => b[0].length - a[0].length);

  if (!matches.length) return null;

  return {
    name: matches[0][0],
    id: matches[0][1]
  };
}

/* -------------------------------------------------------
   LEAGUE FOOTBALL
------------------------------------------------------- */

async function footballLeagueFeature(message = "") {
  const league = detectFootballLeague(message) || {
    name: "Premier League",
    id: "eng.1"
  };

  try {
    const requestType = getFootballRequestType(message);

    // Standings
    if (requestType === "standings") {
      const data = await getJson(
        `${STANDINGS}/${league.id}/standings`
      );

      const groups = data?.children || [];
      const rows = [];

      for (const group of groups) {
        for (const entry of group?.standings?.entries || []) {
          const team = entry.team?.displayName || entry.team?.name;
          const stats = {};

          for (const stat of entry.stats || []) {
            stats[stat.name] = stat.value;
            stats[stat.abbreviation] = stat.value;
          }

          rows.push({
            rank: entry.team?.rank || rows.length + 1,
            team,
            played: stats.gamesPlayed ?? stats.gp ?? 0,
            won: stats.wins ?? stats.w ?? 0,
            drawn: stats.ties ?? stats.draws ?? stats.d ?? 0,
            lost: stats.losses ?? stats.l ?? 0,
            points: stats.points ?? stats.pts ?? 0
          });
        }
      }

      rows.sort((a, b) => Number(a.rank) - Number(b.rank));

      if (!rows.length) {
        return {
          answer: `I couldn't retrieve the ${league.name} standings.`,
          league: league.name
        };
      }

      return {
        answer:
          `${league.name} standings:\n` +
          rows.map(r =>
            `${r.rank}. ${r.team} — ${r.played} played, ${r.won}W ${r.drawn}D ${r.lost}L, ${r.points} pts`
          ).join("\n"),
        league: league.name
      };
    }

    // Current/recent league results
    const today = new Date();
    const dates = [];

    // Check the most recent seven Zambia dates.
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(dateKey(d));
    }

    const all = [];

    for (const date of dates) {
      try {
        const data = await getJson(
          `${ESPN}/${league.id}/scoreboard?dates=${date}`
        );

        for (const game of events(data)) {
          if (state(game) === "post") all.push(game);
        }
      } catch {
        // Continue with the other dates.
      }
    }

    const seen = new Set();

    const unique = all
      .filter(game => {
        if (seen.has(game.id)) return false;
        seen.add(game.id);
        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    const formatResult = game => {
      const c = game.competitions?.[0];
      const teams = c?.competitors || [];
      const home = teams.find(t => t.homeAway === "home");
      const away = teams.find(t => t.homeAway === "away");

      return `${home?.team?.displayName || "Home"} ${home?.score ?? "-"}-${away?.score ?? "-"} ${away?.team?.displayName || "Away"} — ${formatDate(game.date)}`;
    };

    return {
      answer: unique.length
        ? `Latest ${league.name} results:\n${unique.map(formatResult).join("\n")}`
        : `I couldn't find recent ${league.name} results.`,
      league: league.name
    };

  } catch (error) {
    console.error("footballLeagueFeature:", error);

    return {
      answer: `I couldn't retrieve current ${league.name} data.`,
      league: league.name
    };
  }
}

/* -------------------------------------------------------
   WORLDWIDE FOOTBALL
------------------------------------------------------- */

async function footballFeature() {
  try {
    const today = dateKey();

    const data = await getJson(
      `${ESPN}/all/scoreboard?dates=${today}`
    );

    const games = events(data);

    if (!games.length) {
      return {
        answer: "There are no football matches available for today."
      };
    }

    const formatGame = game => {
      const c = game.competitions?.[0];
      const teams = c?.competitors || [];

      const home = teams.find(t => t.homeAway === "home");
      const away = teams.find(t => t.homeAway === "away");

      const status = state(game);

      let score = "";

      if (status === "post" || status === "in") {
        score = ` ${home?.score ?? "-"}-${away?.score ?? "-"}`;
      }

      return `${home?.team?.displayName || "Home"}${score} ${away?.team?.displayName || "Away"} — ${formatTime(game.date)} Zambia time`;
    };

    return {
      answer:
        `Football matches today:\n` +
        games.slice(0, 20).map(formatGame).join("\n")
    };

  } catch (error) {
    console.error("footballFeature:", error);

    return {
      answer: "I couldn't retrieve worldwide football data right now."
    };
  }
}

/* -------------------------------------------------------
   TEAM SEARCH
------------------------------------------------------- */

async function searchFootballTeams(query = "") {
  const q = clean(query);

  const local = Object.entries(TEAMS)
    .filter(([key]) => key.includes(q))
    .map(([, value]) => ({
      name: value[0],
      id: value[1]
    }));

  if (local.length) return local;

  try {
    const data = await getJson(
      `${ESPN}/eng.1/teams`
    );

    return (data?.sports?.[0]?.leagues?.[0]?.teams || [])
      .map(item => item.team)
      .filter(team =>
        clean(team.displayName).includes(q)
      )
      .map(team => ({
        name: team.displayName,
        id: team.id
      }));

  } catch {
    return [];
  }
}

/* -------------------------------------------------------
   FOOTBALL FOR A SPECIFIC DATE
------------------------------------------------------- */

async function getFootballForDate(date, league = "all") {
  try {
    const leagueId =
      LEAGUES[clean(league)] ||
      league;

    const data = await getJson(
      `${ESPN}/${leagueId}/scoreboard?dates=${String(date).replace(/-/g, "")}`
    );

    return {
      ok: true,
      date,
      league: leagueId,
      events: events(data)
    };

  } catch (error) {
    console.error("getFootballForDate:", error);

    return {
      ok: false,
      date,
      league,
      events: []
    };
  }
}

/* -------------------------------------------------------
   EXPORTS USED BY SERVER.JS
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
