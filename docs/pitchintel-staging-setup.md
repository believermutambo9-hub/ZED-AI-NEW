# PitchIntel integration (staging)

Zed remains the user-facing application. PitchIntel provides the dedicated football data and prediction service behind Zed's football chat and authenticated football API routes.

## Staging configuration

Set these variables on the Zed staging service only:

- `PITCHINTEL_API_URL`: the HTTPS origin of the deployed PitchIntel staging API, without an `/api` path.
- `PITCHINTEL_SERVICE_SECRET`: a strong random secret shared with the PitchIntel staging service.

Set the same `PITCHINTEL_SERVICE_SECRET` on the PitchIntel staging service. Do not put either variable in browser code, frontend configuration, source control, or a user-visible response.

PitchIntel also requires a reachable PostgreSQL database (`DATABASE_URL`) and at least one working football data provider credential (`FOOTBALL_DATA_API_KEY` or `API_FOOTBALL_KEY`) for live ingestion. Configure these only on the PitchIntel staging service.

## Verification

1. From Zed, use the authenticated `GET /api/football/intelligence/health` route.
2. Confirm PitchIntel reports an online database and inspect the fixture / ingestion record counts.
3. Check upcoming fixtures, a named-team matchup prediction, head-to-head and football news.
4. Confirm chat falls back to Zed's existing football provider when PitchIntel is not configured or cannot be reached.
5. Repeat on staging before any production configuration or deployment.

A successful HTTP response alone is not proof of data quality. Fixture provenance, timestamps, missing model inputs and backtest results must be checked before treating a prediction as reliable.
