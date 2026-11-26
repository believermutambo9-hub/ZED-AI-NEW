import { getFirebaseDb } from "../config/firebase-admin.js";

export const HISTORICAL_MATCHES_COLLECTION = "zedHistoricalMatches";
export const HISTORICAL_IMPORTS_COLLECTION = "zedHistoricalMatchImports";

function validScore(value) {
  return Number.isInteger(value) && value >= 0;
}

export function normalizeHistoricalFixture(item) {
  const fixture = item?.fixture || {};
  const teams = item?.teams || {};
  const goals = item?.goals || {};
  const date = new Date(fixture.date || "");
  const homeId = Number(teams.home?.id);
  const awayId = Number(teams.away?.id);
  const fixtureId = Number(fixture.id);
  const status = String(fixture.status?.short || "").toUpperCase();
  if (!Number.isInteger(fixtureId) || fixtureId <= 0 ||
      !Number.isFinite(date.getTime()) ||
      !["FT", "AET", "PEN"].includes(status) ||
      !Number.isInteger(homeId) || !Number.isInteger(awayId) ||
      homeId <= 0 || awayId <= 0 || homeId === awayId ||
      !validScore(goals.home) || !validScore(goals.away)) return null;

  return {
    fixtureId: String(fixtureId),
    date: date.toISOString(),
    timestamp: date.getTime(),
    status,
    homeId,
    awayId,
    homeName: String(teams.home?.name || "Home").slice(0, 160),
    awayName: String(teams.away?.name || "Away").slice(0, 160),
    homeGoals: goals.home,
    awayGoals: goals.away,
    leagueId: Number(item?.league?.id) || null,
    leagueName: String(item?.league?.name || "").slice(0, 160),
    country: String(item?.league?.country || "").slice(0, 100),
    season: Number(item?.league?.season) || null,
    round: String(item?.league?.round || "").slice(0, 120),
    venue: String(fixture?.venue?.name || "").slice(0, 160),
    referee: String(fixture?.referee || "").slice(0, 160),
    source: "API-Football v3",
    schemaVersion: 1,
    updatedAt: new Date().toISOString()
  };
}

export async function archiveHistoricalFixtures(fixtures, { db = getFirebaseDb() } = {}) {
  const records = (Array.isArray(fixtures) ? fixtures : [])
    .map(normalizeHistoricalFixture).filter(Boolean);
  if (!records.length) return { saved: 0, skipped: Array.isArray(fixtures) ? fixtures.length : 0 };

  let saved = 0;
  // Firestore batches are limited to 500 writes; keep a safety margin.
  for (let offset = 0; offset < records.length; offset += 400) {
    const batch = db.batch();
    const chunk = records.slice(offset, offset + 400);
    for (const record of chunk) {
      const { fixtureId, ...data } = record;
      batch.set(db.collection(HISTORICAL_MATCHES_COLLECTION).doc(fixtureId), data, { merge: true });
    }
    await batch.commit();
    saved += chunk.length;
  }
  return { saved, skipped: (Array.isArray(fixtures) ? fixtures.length : 0) - records.length };
}

export async function getArchivedTeamMatches(teamId, { before, limit = 100, db = getFirebaseDb() } = {}) {
  const id = Number(teamId);
  if (!Number.isInteger(id) || id <= 0) return [];
  const cutoff = before ? new Date(before).getTime() : Date.now();
  if (!Number.isFinite(cutoff)) return [];

  const collection = db.collection(HISTORICAL_MATCHES_COLLECTION);
  const [home, away] = await Promise.all([
    collection.where("homeId", "==", id).where("timestamp", "<", cutoff).orderBy("timestamp", "desc").limit(limit).get(),
    collection.where("awayId", "==", id).where("timestamp", "<", cutoff).orderBy("timestamp", "desc").limit(limit).get()
  ]);
  const unique = new Map();
  for (const doc of [...home.docs, ...away.docs]) {
    const value = doc.data();
    unique.set(String(value.fixtureId || doc.id), value);
  }
  return [...unique.values()]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
    .map(match => ({
      id: Number(match.fixtureId),
      date: match.date,
      homeId: Number(match.homeId),
      awayId: Number(match.awayId),
      homeName: match.homeName,
      awayName: match.awayName,
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
      league: match.leagueName || ""
    }));
}

export async function getHistoricalImportState(importId, { db = getFirebaseDb() } = {}) {
  const snapshot = await db.collection(HISTORICAL_IMPORTS_COLLECTION).doc(String(importId)).get();
  return snapshot.exists ? snapshot.data() : null;
}

export async function saveHistoricalImportState(importId, state, { db = getFirebaseDb() } = {}) {
  await db.collection(HISTORICAL_IMPORTS_COLLECTION).doc(String(importId)).set({
    ...state,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}
