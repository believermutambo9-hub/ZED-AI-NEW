import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [server, history, memory, app] = await Promise.all([
  readFile(new URL("../server.js", import.meta.url), "utf8"),
  readFile(new URL("../storage/chat-history.js", import.meta.url), "utf8"),
  readFile(new URL("../features/memory.js", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8")
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

test("new chat creation fails if persistent storage did not confirm the save", () => {
  const start = server.indexOf('app.post(\n  "/api/new-chat"');
  const end = server.indexOf("// DELETE CHAT", start);
  const route = server.slice(start, end);
  assert.match(route, /const persistence =\s*await persistConversation/);
  assert.match(route, /if \(!persistence\?\.persistent\)/);
  assert.match(route, /res\.status\(503\)/);
  assert.ok(route.indexOf("if (!persistence?.persistent)") < route.indexOf("res.json({"));
});

test("chat requests stop if the user message was not persisted", () => {
  const start = server.indexOf('app.post(\n  "/api/chat"');
  const end = server.indexOf("// ============================================================\n// FRONTEND FALLBACK", start);
  const route = server.slice(start, end);
  assert.match(route, /const initialChatPersistence =\s*await persistConversation/);
  assert.match(route, /if \(!initialChatPersistence\?\.persistent\)/);
  assert.match(route, /res\.status\(503\)/);
  assert.match(route, /Your message could not be saved\. Please try again\./);
  assert.ok(route.indexOf("if (!initialChatPersistence?.persistent)") < route.indexOf("// MEMORY: FORGET"));
});

test("chat UI warns when the assistant reply was not saved", () => {
  assert.match(server, /chatPersistent:\s*Boolean\(\s*chatPersistence\?\.persistent/);
  assert.match(app, /data\.chatPersistent === false/);
  assert.match(app, /could not be saved to your chat history/);
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
  assert.match(server, /forgetMemoryAndWait\([\s\S]{0,180}req\.user\.uid/);
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

test("project detail, update, and delete routes verify project ownership", () => {
  assert.match(server, /app\.get\(\s*"\/api\/projects\/:projectId"[\s\S]*?project\.userId !== req\.user\.uid/);
  assert.match(server, /app\.patch\(\s*"\/api\/projects\/:projectId"[\s\S]*?project\.userId !== req\.user\.uid/);
  assert.match(server, /app\.delete\(\s*"\/api\/projects\/:projectId"[\s\S]*?project\.userId !== req\.user\.uid/);
  assert.ok(server.includes("const updated = await updateProject(req.params.projectId"));
  assert.match(server, /const deleted = await deleteProject\(req\.params\.projectId\)/);
});

test("project endpoints hide missing and other users' projects with 404", () => {
  const projectRoutes = server.slice(server.indexOf('app.get(\n  "/api/projects/:projectId"'), server.indexOf('// ============================================================\n// FOOTBALL MEMORY API'));
  assert.equal((projectRoutes.match(/res\.status\(404\)/g) || []).length, 4);
  assert.match(projectRoutes, /Project not found\./);
});

test("project memory creation is scoped to the authenticated user and project", () => {
  assert.match(server, /app\.post\(\s*"\/api\/projects\/:projectId\/memories"[\s\S]*?userId: req\.user\.uid/);
  assert.match(server, /rememberProject\(\{[\s\S]*?projectId: req\.params\.projectId/);
  assert.match(memory, /export function rememberProject\([\s\S]*?project\.userId !==\s*normalizeUserId\(\s*userId\s*\)/);
});

test("project memory API waits for Firestore before confirming a save", () => {
  assert.match(server, /persistMemoryAndWait/);
  const start = server.indexOf('app.post(\n  "/api/projects/:projectId/memories"');
  const end = server.indexOf("// ============================================================\n// FOOTBALL MEMORY API", start);
  const route = server.slice(start, end);
  assert.match(route, /async \(req, res\)/);
  assert.match(route, /await persistMemoryAndWait\(result\.memory\)/);
  assert.match(route, /res\.status\(503\)/);
  assert.ok(route.indexOf("await persistMemoryAndWait") < route.indexOf("return res.status(result.created ? 201 : 200)"));
});

test("project deletion awaits Firestore cleanup before clearing the cache", () => {
  const start = memory.indexOf("export async function deleteProject");
  const end = memory.indexOf("// PROJECT MEMORY", start + 30);
  const implementation = memory.slice(start, end);
  assert.match(implementation, /await Promise\.all\(\[/);
  assert.match(implementation, /firestoreDeleteAndWait\("zedMemories", memoryId\)/);
  assert.match(implementation, /firestoreDeleteAndWait\("zedProjects", id\)/);
  assert.ok(implementation.indexOf("await Promise.all") < implementation.indexOf("memories.delete(memoryId)"));
  assert.ok(implementation.indexOf("await Promise.all") < implementation.indexOf("projects.delete(id)"));
});

test("project delete API waits for persistence and returns retryable failure", () => {
  assert.match(server, /const deleted = await deleteProject\(req\.params\.projectId\)/);
  assert.match(server, /res\.status\(503\)/);
  assert.match(server, /Project deletion could not be completed/);
});

test("project memory cannot be attached by a different user", () => {
  const start = memory.indexOf("export function rememberProject");
  const end = memory.indexOf("// FOOTBALL MEMORY", start + 30);
  const implementation = memory.slice(start, end);
  assert.match(implementation, /project\.userId !==\s*normalizeUserId\(\s*userId\s*\)/);
  assert.match(implementation, /reason:\s*"user-mismatch"/);
});

test("project updates cannot overwrite project ownership", () => {
  const start = server.indexOf('app.patch(\n  "/api/projects/:projectId"');
  const end = server.indexOf('app.delete(\n  "/api/projects/:projectId"', start);
  const route = server.slice(start, end);
  assert.match(route, /project\.userId !== req\.user\.uid/);
  assert.match(route, /updateProject\(req\.params\.projectId, \{[\s\S]*?name: req\.body\?\.name[\s\S]*?description: req\.body\?\.description[\s\S]*?metadata: req\.body\?\.metadata/);
  assert.doesNotMatch(route, /userId:\s*req\.body\?\.userId/);
});

test("project listing is scoped to the authenticated user", () => {
  assert.match(server, /app\.get\(\s*"\/api\/projects"[\s\S]*?getUserProjects\(\s*req\.user\.uid\s*\)/);
});


test("project creation and updates await confirmed Firestore persistence", () => {
  assert.match(memory, /async function firestoreWriteAndWait\([\s\S]*?await firestore[\s\S]*?\.set\(cloneForFirestore\(data\)\)/);
  assert.match(memory, /async function persistProject\([\s\S]*?await firestoreWriteAndWait\([\s\S]*?"zedProjects"/);
  const createStart = memory.indexOf("export async function createProject");
  const createEnd = memory.indexOf("// GET PROJECT", createStart);
  const createImpl = memory.slice(createStart, createEnd);
  assert.match(createImpl, /await persistProject\(project\)/);
  assert.ok(createImpl.indexOf("await persistProject(project)") < createImpl.indexOf("projects.set("));
  const updateStart = memory.indexOf("export async function updateProject");
  const updateEnd = memory.indexOf("// DELETE PROJECT", updateStart);
  assert.match(memory.slice(updateStart, updateEnd), /await persistProject\(project\)/);
});

test("project create and update APIs await persistence and return retryable failures", () => {
  assert.match(server, /app\.post\(\s*"\/api\/projects",\s*async \(req, res\)/);
  assert.match(server, /const project = await createProject\(/);
  assert.match(server, /Project could not be saved\. Please try again\./);
  assert.match(server, /app\.patch\(\s*"\/api\/projects\/:projectId",\s*async \(req, res\)/);
  assert.match(server, /const updated = await updateProject\(/);
  assert.match(server, /Project changes could not be saved\. Please try again\./);
});


test("memory API waits for Firestore persistence before confirming a save", () => {
  assert.match(memory, /export async function persistMemoryAndWait\(memory\)/);
  assert.match(memory, /await firestoreWriteAndWait\("zedMemories", memory\.id, memory\)/);
  const start = server.indexOf('app.post(\n  "/api/memory",');
  const end = server.indexOf("// DELETE ONE MEMORY", start);
  const route = server.slice(start, end);
  assert.match(route, /async \(req, res\) =>/);
  assert.match(route, /await persistMemoryAndWait\(result\.memory\)/);
  assert.match(route, /res\.status\(503\)/);
  assert.ok(route.indexOf("await persistMemoryAndWait") < route.indexOf("return res.json({"));
});


test("individual memory deletion waits for Firestore before removing local memory", () => {
  assert.match(memory, /export async function forgetMemoryAndWait\([\s\S]*?await firestoreDeleteAndWait\("zedMemories", id\)/);
  const start = server.indexOf('app.delete(\n  "/api/memory/:memoryId",');
  const end = server.indexOf("// CLEAR ALL USER MEMORY", start);
  const route = server.slice(start, end);
  assert.match(route, /async \(req, res\) =>/);
  assert.match(route, /await forgetMemoryAndWait\(/);
  assert.match(route, /Memory could not be deleted\. Please try again\./);
});


test("clear-all memory waits for every Firestore delete before clearing local state", () => {
  assert.match(memory, /export async function clearUserMemoryAndWait\(userId\)/);
  assert.match(memory, /await Promise\.all\(\[[\s\S]*?firestoreDeleteAndWait\("zedMemories"/);
  const start = server.indexOf('app.delete(\n  "/api/memory/user/:userId",');
  const end = server.indexOf("// MEMORY SEARCH", start);
  const route = server.slice(start, end);
  assert.match(route, /async \(req, res\) =>/);
  assert.match(route, /await clearUserMemoryAndWait\(req\.user\.uid\)/);
  assert.match(route, /Memory could not be cleared\. Please try again\./);
  assert.match(route, /req\.params\.userId !== req\.user\.uid/);
});


test("delete-all chat history chunks Firestore writes below the 500-write limit", () => {
  assert.match(history, /const batchSize = 450/);
  assert.match(history, /for \(let start = 0; start < snapshot\.docs\.length; start \+= batchSize\)/);
  assert.match(history, /snapshot\.docs\.slice\(start, start \+ batchSize\)/);
  assert.match(history, /await batch\.commit\(\)/);
});


test("chat history UI distinguishes unavailable storage from an empty history", () => {
  assert.match(app, /chatHistoryUnavailable: false/);
  assert.match(app, /data\.persistent === false/);
  assert.match(app, /state\.chatHistoryUnavailable = true/);
  assert.match(app, /Chat history is temporarily unavailable/);
});


test("chat deletion preserves local history when persistent deletion fails", () => {
  const start = server.indexOf('"/api/chat/:conversationId"');
  const end = server.indexOf('"/api/chat/:conversationId"', start + 1);
  const route = server.slice(start, end);
  assert.ok(start >= 0, "delete-chat route must exist");
  assert.match(route, /if \(!history\) \{[\s\S]*?res\.status\(503\)/);
  assert.match(route, /catch \(error\) \{[\s\S]*?res\.status\(503\)/);
  assert.ok(route.indexOf("await history.deleteChat") < route.indexOf("deleteConversation(conversationId)"));
});
