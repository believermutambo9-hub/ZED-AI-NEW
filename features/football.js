// features/football.js

// ======================================================
// ZED FOOTBALL FEATURE
// ======================================================

const ESPN_FOOTBALL_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard";

// ======================================================
// HELPERS
// ======================================================

function cleanText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ======================================================
// GET TODAY'S DATE IN ZAMBIA
// ======================================================

function getZambiaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lusaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

// ======================================================
// SEARCH FOOTBALL
// ======================================================

export async function getFootballMatches() {
  console.log("Zed Football: searching ESPN...");

  try {
    const response = await fetch(
      ESPN_FOOTBALL_URL,
      {
        headers: {
          "User-Agent": "Zed/1.0"
        },
        signal: AbortSignal.timeout(15000)
      }
    );

    if (!response.ok) {
      throw new Error(
        `ESPN returned status ${response.status}`
      );
    }

    const data = await response.json();

    const events =
      Array.isArray(data?.events)
        ? data.events
        : [];

    const matches = [];

    for (const event of events) {
      const competition =
        event?.competitions?.[0];

      const competitors =
        competition?.competitors || [];

      if (competitors.length < 2) {
        continue;
      }

      const home =
        competitors.find(
          team => team.homeAway === "home"
        ) || competitors[0];

      const away =
        competitors.find(
          team => team.homeAway === "away"
        ) || competitors[1];

      const status =
        competition?.status?.type || {};

      matches.push({
        id: String(event.id),

        home:
          cleanText(
            home?.team?.displayName ||
            home?.team?.shortDisplayName ||
            home?.name ||
            "Home"
          ),

        away:
          cleanText(
            away?.team?.displayName ||
            away?.team?.shortDisplayName ||
            away?.name ||
            "Away"
          ),

        homeScore:
          home?.score ?? "",

        awayScore:
          away?.score ?? "",

        status:
          cleanText(
            status?.detail ||
            status?.shortDetail ||
            status?.description ||
            status?.name ||
            "Scheduled"
          ),

        state:
          status?.state || "",

        completed:
          status?.completed === true ||
          status?.state === "post",

        date:
          event?.date || ""
      });
    }

    console.log(
      `Zed Football: ${matches.length} matches found.`
    );

    return matches;

  } catch (error) {
    console.error(
      "Zed Football error:",
      error.message
    );

    return [];
  }
}

// ======================================================
// FORMAT FOOTBALL RESULTS
// ======================================================

export function formatFootballMatches(matches) {
  if (
    !Array.isArray(matches) ||
    matches.length === 0
  ) {
    return "No football matches were found.";
  }

  const lines = [
    "CURRENT FOOTBALL INFORMATION",
    `Date in Zambia: ${getZambiaDate()}`,
    ""
  ];

  for (const match of matches) {
    const score =
      match.homeScore !== "" &&
      match.awayScore !== ""
        ? `${match.homeScore}-${match.awayScore}`
        : "vs";

    lines.push(
      `${match.home} ${score} ${match.away} — ${match.status}`
    );
  }

  lines.push(
    "",
    "Only completed matches should be described as finished."
  );

  return lines.join("\n");
}

// ======================================================
// FOOTBALL FEATURE
// ======================================================

export async function footballFeature() {
  const matches =
    await getFootballMatches();

  return {
    matches,

    text:
      formatFootballMatches(matches)
  };
}
