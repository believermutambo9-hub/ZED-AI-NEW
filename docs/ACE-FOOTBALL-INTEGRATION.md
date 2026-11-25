# Unified Zed Football Intelligence

## Evidence flow

- Zed's existing ESPN integration remains available for worldwide fixtures, results, team and league context.
- API-Football v3 supplies structured fixture-specific evidence when configured: team resolution, recent completed matches, form, head-to-head, injuries, lineups and bookmaker 1X2 odds.
- Zed web search runs for explicit match-prediction requests and gathers current team news, injuries, suspensions, manager updates and match previews.
- ACE combines the structured evidence in its statistical models. Web reports and Zed's ESPN output are attached as qualitative cross-checks; they are not silently converted into numerical probability adjustments.
- Missing or conflicting evidence is disclosed. No fake fixture date, competition, odds, injury status or lineup is created.

## Secure configuration

Configure `API_FOOTBALL_KEY` on the Render staging service. The provider also supports `RAPIDAPI_KEY` as a fallback when using the RapidAPI host. Keep credentials only in server-side Render environment settings; never place them in browser code, repository files, logs, or chat.

Firebase Admin configuration enables persistent cache and the prediction evidence ledger. The in-memory cache and prediction calculation still operate when Firestore is unavailable.

## Current coverage and known limits

API-Football integration currently retrieves recent team form, head-to-head, injuries, lineups and match-winner (1X2) odds when the provider supplies them. The ACE statistical engine currently calculates 1X2, expected goals, likely scores, totals and both-teams-to-score markets. Corners/cards market extraction and dedicated calibrated corners/cards models are not yet implemented. Lineup and injury feeds are reported as evidence but do not yet apply player-role impact adjustments to probabilities.

Coverage varies by competition and subscription. Lineups may only appear close to kickoff; bookmaker odds and injury coverage are not guaranteed for every fixture. Rate limits are surfaced as data-quality limitations rather than bypassed.
