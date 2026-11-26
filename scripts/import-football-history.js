import { importHistoricalFootballSeason } from "../features/football-intelligence.js";

const leagueId = Number(process.argv[2]);
const season = Number(process.argv[3]);
const maxPages = Number(process.argv[4] || 5);

if (!process.env.API_FOOTBALL_KEY && !process.env.RAPIDAPI_KEY) {
  throw new Error("Set API_FOOTBALL_KEY (or RAPIDAPI_KEY) in the server environment; never pass credentials as command-line arguments.");
}
if (!Number.isInteger(leagueId) || !Number.isInteger(season)) {
  throw new Error("Usage: npm run import:football-history -- <leagueId> <season> [maxPages]");
}

try {
  const result = await importHistoricalFootballSeason({ leagueId, season, maxPages });
  process.stdout.write(JSON.stringify(result) + "\n");
} catch (error) {
  process.stderr.write((error?.stack || error?.message || String(error)) + "\n");
  process.exitCode = 1;
}
