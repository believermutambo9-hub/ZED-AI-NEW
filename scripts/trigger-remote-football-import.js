const base = process.env.ZED_IMPORT_URL;
const token = process.env.FOOTBALL_HISTORY_IMPORT_TOKEN;
if (!base || !token) throw new Error("Missing secure import URL or token.");
const payload = {
  leagueId: Number(process.env.FOOTBALL_HISTORY_LEAGUE_ID || 39),
  season: Number(process.env.FOOTBALL_HISTORY_SEASON || 2025),
  maxPages: Math.max(1, Math.min(20, Number(process.env.FOOTBALL_HISTORY_MAX_PAGES || 20)))
};
const endpoint = base.endsWith("/") ? base.slice(0, -1) : base;
const response = await fetch(endpoint + "/internal/football-history/import", {
  method: "POST",
  headers: { "content-type": "application/json", authorization: "Bearer " + token },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(25 * 60 * 1000)
});
const body = await response.json().catch(() => ({}));
if (!response.ok || !body.ok) {
  throw new Error("Remote import failed with HTTP " + response.status + ".");
}
process.stdout.write(JSON.stringify(body.result) + String.fromCharCode(10));
