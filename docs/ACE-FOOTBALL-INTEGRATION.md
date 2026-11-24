# ACE football intelligence in Zed

## Runtime configuration

The prediction provider is optional. Configure one of these environment variables on the existing `zed-voice-staging` Render service:

- `API_FOOTBALL_KEY` — preferred API-Sports/API-Football v3 key.
- `RAPIDAPI_KEY` — supported fallback for the RapidAPI API-Football host.

Keep the credential in Render environment settings only. Never put it in frontend code, a URL, a test fixture containing a real key, or a committed file.

The Firestore cache and prediction evidence ledger use Zed's existing Firebase Admin configuration:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

Firestore is optional for prediction calculation. If Firestore is unavailable, Zed can still request provider data and calculate a result, but persistent provider caching and prediction-ledger writes will be unavailable. The code does not add PostgreSQL or a new Render service.

## Evidence pipeline

For an explicit home-versus-away prediction request, Zed:

1. Resolves both team names with API-Football.
2. Looks for the next exact home/away fixture and retrieves up to five recent head-to-head results.
3. Retrieves each team's recent completed fixtures, and excludes results after the selected kickoff time.
4. Derives recent-form, goal-rate, attack and defence proxies from those results.
5. When a verified fixture is available, attempts to retrieve fixture-specific injuries, pre-match 1X2 odds and lineups.
6. Passes the available evidence to ACE and records a compact non-user-identifying prediction snapshot in `zedAcePredictionLedger`.

Provider responses are cached in `zedFootballDataCache` with bounded in-memory caching. Missing or failed endpoints are disclosed and do not fabricate evidence.

## Model interpretation and current limitations

- Recent-form ratings are proxies, not official calibrated Elo or opponent-adjusted ratings. When these proxies are used, ACE caps its data-quality score at 0.68 and cannot label confidence HIGH.
- Verified event-level xG is not currently supplied to the model; score-based goal-rate estimates are used and disclosed.
- Head-to-head results are exposed as context but are not directly weighted in the engine's probability calculation.
- Injury records and starting lineups can be displayed when available, but player positions, replacement roles and lineup impact are not yet mapped into ACE's absence-adjustment model.
- Travel distance and midweek continental congestion are not adjusted unless verified values are supplied.
- Bookmaker value analysis is calculated only when a complete fixture-specific 1X2 odds market is available.
- The ledger records prediction snapshots and pending fixture status. Automated result settlement, backtesting reports and calibrated performance updates are not yet implemented.

API coverage varies by competition. API-Football documents that lineups may appear only around 20–40 minutes before kickoff and that odds coverage varies by fixture and bookmaker. Missing coverage therefore remains a visible limitation rather than a reason to guess.

## Safety and operations

- Prediction requests without a clear matchup do not trigger ACE.
- Provider timeouts, rate limits, missing credentials, ambiguous team matches and malformed provider responses fall back safely.
- API credentials are sent only in server-side request headers.
- This implementation uses the existing Zed Firestore project and the existing staging service. It does not create infrastructure or change production.
