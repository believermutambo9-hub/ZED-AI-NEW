// ====================================================
// FOOTBALL ROUTER
// ====================================================

let footballContext = "";
let footballUsed = false;
let footballMode = null;

if (
  shouldUseFootball(
    userMessage
  )
) {
  console.log(
    "Football question detected."
  );

  try {
    const footballRequestType =
      getFootballRequestType(
        userMessage
      );

    const specificTeam =
      detectFootballTeam(
        userMessage
      );

    const specificLeague =
      detectFootballLeague(
        userMessage
      );

    console.log(
      "Football request type:",
      footballRequestType
    );

    // ==================================================
    // TEAM-SPECIFIC REQUEST
    // ==================================================

    if (specificTeam) {
      console.log(
        "Football team request:",
        specificTeam.name
      );

      const teamResult =
        await footballTeamFeature(
          userMessage
        );

      if (
        teamResult &&
        typeof teamResult.text === "string" &&
        teamResult.text.trim()
      ) {
        footballUsed = true;
        footballMode = "team";

        footballContext = `

TEAM-SPECIFIC FOOTBALL DATA:

${teamResult.text.trim()}

END TEAM-SPECIFIC FOOTBALL DATA.

IMPORTANT TEAM FOOTBALL RULES:

1. Use the supplied team data as the factual
   source.

2. Do not invent fixtures, results, scores,
   dates, opponents or match status.

3. A score of 0-0 does NOT automatically mean
   that a match is live.

4. Use the supplied status/state to determine
   whether a match is scheduled, live or completed.

5. Times in the supplied football data are
   displayed in Zambia time.

6. If the requested information is not available,
   clearly say so.

7. Do not turn a scheduled match into a completed
   result simply because a score is displayed.
`;

        console.log(
          "Team football data returned."
        );
      }
    }

    // ==================================================
    // LEAGUE-SPECIFIC REQUEST
    // ==================================================

    else if (specificLeague) {
      console.log(
        "Football league request:",
        specificLeague.name
      );

      const leagueResult =
        await footballLeagueFeature(
          userMessage
        );

      if (
        leagueResult &&
        typeof leagueResult.text === "string" &&
        leagueResult.text.trim()
      ) {
        footballUsed = true;
        footballMode = "league";

        footballContext = `

LEAGUE-SPECIFIC FOOTBALL DATA:

${leagueResult.text.trim()}

END LEAGUE-SPECIFIC FOOTBALL DATA.

IMPORTANT LEAGUE FOOTBALL RULES:

1. Use the supplied football data as the
   factual source.

2. Do not invent fixtures, results,
   standings or scores.

3. A 0-0 score is not proof that a match
   is currently live.

4. Use the supplied match state/status.

5. Times are displayed in Zambia time.

6. If the requested information is not
   available, clearly say so.
`;

        console.log(
          "League football data returned."
        );
      }
    }

    // ==================================================
    // WORLDWIDE FOOTBALL REQUEST
    // ==================================================

    else {
      console.log(
        "General worldwide football request."
      );

      const football =
        await footballFeature();

      if (
        football &&
        typeof football.text === "string" &&
        football.text.trim()
      ) {
        footballUsed = true;
        footballMode = "worldwide";

        footballContext = `

WORLDWIDE FOOTBALL DATA:

${football.text.trim()}

END WORLDWIDE FOOTBALL DATA.

IMPORTANT FOOTBALL RULES:

1. Use the supplied football data.

2. Do not invent scores, fixtures,
   dates, teams or match status.

3. A 0-0 score does not automatically
   mean that a match is live.

4. Use the supplied status/state.

5. Times are displayed in Zambia time.

6. If the requested information is not
   contained in the available data,
   clearly say so.
`;

        console.log(
          "Worldwide football data returned."
        );
      }
    }

  } catch (error) {
    console.error(
      "Football feature failed:",
      error.message
    );
  }
} else {
  console.log(
    "Football search not required."
  );
}
