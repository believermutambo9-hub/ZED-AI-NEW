import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [server, history, memory] = await Promise.all([
  readFile(new URL("../server.js", import.meta.url), "utf8"),
  readFile(new URL("../storage/chat-history.js", import.meta.url), "utf8"),
  readFile(new URL("../features/memory.js", import.meta.url), "utf8")
]);

test("API routes reject missing or invalid Firebase ID tokens", () => {
  assert.match(server, /req\.path\.startsWith\("\/api\/"\)/);
  assert.match(server, /Bearer\\s\+\(\.\+\)/);
  assert.match(server, /verifyIdToken\(match\[1\]\)/);
  assert.match(server, /res\.status\(401\)/);
});

test("chat saves use a transaction and reject another owner's conversation", () => {
  assert.match(history, /runTransaction\(async transaction/);
  assert.match(history, /existingData\.userId !== safeUserId/);
  assert.match(history, /Conversation ownership mismatch\./);
});

test("chat deletion verifies ownership inside its transaction", () => {
  assert.match(history, /runTransaction\(async transaction/);
  assert.match(history, /doc\.data\(\)\?\.userId !== safeUserId/);
  assert.match(history, /transaction\.delete\(chatRef\)/);
});

test("memory deletion accepts an owner and checks it before deleting", () => {
  assert.match(memory, /export function forgetMemory\([\s\S]*?userId = null/);
  assert.match(memory, /memory\.userId !== normalizeUserId\(userId\)/);
});

test("chat reads return data only after matching the requested owner", () => {
  assert.match(history, /export async function getChat\(userId, conversationId\)/);
  assert.match(history, /if \(data\.userId !== safeUserId\) \{\s*return null;/);
});

test("memory API uses the authenticated user when deleting a memory", () => {
  assert.match(server, /forgetMemory\([\s\S]{0,180}req\.user\.uid/);
});

test("memory lookup rejects a user ID that differs from the authenticated UID", () => {
  assert.match(server, /req\.params\.userId !== req\.user\.uid/);
});

test("chat endpoint fails closed on legacy conversations without an owner", () => {
  const ownerGuard = server.indexOf("!conversation.metadata?.userId");
  const restoreCall = server.indexOf("await restoreConversation(", ownerGuard);
  const assignOwner = server.indexOf("conversation.metadata.userId =\n          userId", restoreCall);
  assert.notEqual(ownerGuard, -1);
  assert.notEqual(restoreCall, -1);
  assert.notEqual(assignOwner, -1);
  assert.ok(ownerGuard < restoreCall, "owner guard must run before restoring stored history");
  assert.ok(restoreCall < assignOwner, "owner assignment must happen only after restore");
  assert.match(server.slice(ownerGuard - 200, restoreCall), /conversation\.messages\.length > 0/);
});

test("memory list and search use only the authenticated Firebase UID", () => {
  assert.match(server, /app\.get\(\s*"\/api\/memory",\s*\(req, res\) => \{[\s\S]{0,180}req\.user\.uid/);
  assert.match(server, /getUserMemories\(\s*userId/);
  assert.match(server, /app\.get\(\s*"\/api\/memory\/search",\s*\(req, res\) => \{[\s\S]{0,180}req\.user\.uid/);
  assert.match(server, /searchMemories\(\s*userId/);
});

test("memory creation assigns the authenticated UID instead of trusting request ownership", () => {
  const start = server.indexOf('app.post(\n  "/api/memory"');
  const end = server.indexOf('// ============================================================', start + 30);
  const route = server.slice(start, end);
  assert.match(route, /const userId =\s*req\.user\.uid/);
  assert.match(route, /remember\(\{[\s\S]*?userId,/);
  assert.doesNotMatch(route, /userId:\s*req\.body\?\.userId/);
});
