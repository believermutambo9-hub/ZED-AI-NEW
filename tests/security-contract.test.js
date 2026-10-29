import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { zipSync } from "fflate";

const [server, history, memory, app, pkg, html, fileAnalysis] = await Promise.all([
  readFile(new URL("../server.js", import.meta.url), "utf8"),
  readFile(new URL("../storage/chat-history.js", import.meta.url), "utf8"),
  readFile(new URL("../features/memory.js", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8"),
  readFile(new URL("../interface.html", import.meta.url), "utf8"),
  readFile(new URL("../features/file-analysis.js", import.meta.url), "utf8")
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


test("image generation returns a safe error message instead of internal exception details", () => {
  const start = server.indexOf('"/api/generate-image"');
  const end = server.indexOf('"/api/', start + 8);
  const route = server.slice(start, end);
  assert.match(route, /Image generation is temporarily unavailable/);
  assert.doesNotMatch(route, /error:\\s*error\.message/);
});


test("image generation rejects oversized prompts before calling the provider", () => {
  const start = server.indexOf('"/api/generate-image"');
  const end = server.indexOf('"/api/chat"', start + 8);
  const route = server.slice(start, end);
  assert.match(route, /prompt\.length > 2000/);
  assert.match(route, /Image prompts must be 2,000 characters or fewer/);
  assert.ok(route.indexOf("prompt.length > 2000") < route.indexOf("generateCloudflareImage"));
});


test("AI and memory API failures do not expose raw exception messages", () => {
  assert.match(server, /The AI service is temporarily unavailable/);
  assert.match(server, /The memory request could not be completed/);
  const chatStart = server.indexOf('"/api/chat"');
  const chatEnd = server.indexOf("// ============================================================\\n// FRONTEND FALLBACK", chatStart);
  const chatRoute = server.slice(chatStart, chatEnd);
  assert.match(chatRoute, /The request could not be completed/);
  assert.doesNotMatch(chatRoute, /error:\\s*error\.message/);
});


test("uploaded images are restricted to supported image MIME types", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
    assert.ok(fileAnalysis.includes(type));
  }
  assert.match(fileAnalysis, /includes\(mimeType\)/);
  assert.match(fileAnalysis, /This image format is not supported/);
});

test("file uploads reject malformed base64 before decoding", () => {
  assert.match(fileAnalysis, /A-Za-z0-9\+\//);
  assert.match(fileAnalysis, /The uploaded file data is invalid/);
  assert.ok(fileAnalysis.indexOf("The uploaded file data is invalid") < fileAnalysis.indexOf("Buffer.from(base64"));
});


test("uploaded filenames are sanitized and length-limited", () => {
  assert.ok(fileAnalysis.includes("const rawFileName = String("));
  assert.match(fileAnalysis, /\.replace\(\/\[\\u0000-\\u001f\\u007f\]\/g/);
  assert.ok(fileAnalysis.includes(".slice(0, 255)"));
  assert.ok(fileAnalysis.includes('|| "uploaded-file"'));
});


test("uploaded files are checked against their actual signatures", () => {
  assert.ok(fileAnalysis.includes("function detectUploadedSignature(buffer)"));
  assert.ok(fileAnalysis.includes('signature !== "application/pdf"'));
  assert.ok(fileAnalysis.includes("signature !== mimeType"));
  assert.ok(fileAnalysis.includes("file contents do not match the file type"));
});

test("file analysis supports presentations, OpenDocument files, ebooks, and source code", () => {
  assert.ok(fileAnalysis.includes('extension === ".pptx"'));
  assert.ok(fileAnalysis.includes('extension === ".odt" || extension === ".odp" || extension === ".epub"'));
  assert.ok(fileAnalysis.includes('".py", ".java", ".c", ".h", ".cpp"'));
  assert.ok(fileAnalysis.includes("extractOfficeOrEbookText"));
  assert.ok(pkg.includes('"fflate"'));
});

test("legacy binary Office files receive an explicit conversion instruction", () => {
  assert.ok(fileAnalysis.includes("Legacy .doc and .ppt files are not supported yet"));
  assert.ok(fileAnalysis.includes("save as DOCX/PPTX or PDF"));
});

test("JSON request limit accommodates base64 expansion for accepted uploads", () => {
  assert.ok(server.includes('limit: "30mb"'));
  assert.ok(fileAnalysis.includes("buffer.length > 18 * 1024 * 1024"));
});

test("browser upload payload is connected to the authenticated chat request", () => {
  assert.ok(app.includes("readFileAsDataURL("));
  assert.ok(app.includes("file:"));
  assert.ok(app.includes("filePayload"));
  assert.ok(app.includes('headers.set("Authorization", `Bearer ${token}`)'));
  assert.ok(app.includes('"Content-Type":'));
});

test("chat route validates uploads before constructing the AI prompt", () => {
  const routeStart = server.indexOf('app.post(\n  "/api/chat"');
  const routeEnd = server.indexOf("// ============================================================\n// FRONTEND FALLBACK", routeStart);
  const route = server.slice(routeStart, routeEnd);
  assert.ok(routeStart >= 0);
  assert.ok(route.includes("await prepareUploadedFile(req.body.file)"));
  assert.ok(route.indexOf("await prepareUploadedFile") < route.indexOf("const prompt ="));
  assert.ok(route.includes("UPLOADED FILE CONTENT"));
  assert.ok(route.includes("uploadedFile?.inlineData && !uploadedFile.extractedText?.trim()"));
});

test("vision-only uploads are not sent to text-only fallback providers", () => {
  const start = server.indexOf("async function askAI(");
  const end = server.indexOf("// ============================================================\n//", start + 30);
  const ai = server.slice(start, end);
  assert.ok(ai.includes("if (inlineData)"));
  assert.ok(ai.includes("Gemini could not analyse the attached image/PDF"));
  assert.ok(ai.indexOf("if (inlineData)") < ai.indexOf("await askGroq"));
});


test("browser rejects uploads over the server's 18 MB limit before reading them", () => {
  assert.match(app, /const maxUploadBytes =\s*18 \* 1024 \* 1024/);
  assert.match(app, /if \(file\.size > maxUploadBytes\)/);
  assert.match(app, /state\.selectedFile = null/);
  assert.match(app, /fileInput\.value = ""/);
});

test("file picker advertises formats supported by the server and omits unsupported legacy Office files", () => {
  const picker = html.match(/<input[\s\S]*?id="fileInput"[\s\S]*?>/)?.[0] || "";
  for (const extension of [".pdf", ".txt", ".csv", ".docx", ".xlsx", ".pptx", ".odt", ".odp", ".epub", ".png", ".webp", ".py"]) {
    assert.ok(picker.includes(extension), `file picker should allow ${extension}`);
  }
  assert.doesNotMatch(picker, /\.doc(?:,|")/);
});


import { prepareUploadedFile, detectUploadedSignature, validateZipArchive } from "../features/file-analysis.js";

function dataUrl(bytes, mime = "application/octet-stream") {
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

test("functional upload parser extracts UTF-8 text and sanitizes the filename", async () => {
  const result = await prepareUploadedFile({
    name: "../notes\u0000.txt",
    type: "text/plain",
    data: dataUrl(Buffer.from("First line\\nSecond line", "utf8"), "text/plain")
  });
  assert.equal(result.fileName, "notes.txt");
  assert.equal(result.extractedText, "First line\\nSecond line");
  assert.equal(result.mimeType, "text/plain");
});

test("functional upload parser rejects malformed base64", async () => {
  await assert.rejects(
    prepareUploadedFile({ name: "notes.txt", type: "text/plain", data: "data:text/plain;base64,%%%invalid%%%" }),
    /uploaded file data is invalid/
  );
});

test("functional upload parser rejects filename/signature mismatches", async () => {
  await assert.rejects(
    prepareUploadedFile({ name: "fake.pdf", type: "application/pdf", data: dataUrl(Buffer.from("this is not a PDF"), "application/pdf") }),
    /do not match the file type/
  );
});

test("functional upload parser preserves supported images as Gemini inline data", async () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const result = await prepareUploadedFile({ name: "photo.png", type: "image/png", data: dataUrl(png, "image/png") });
  assert.equal(result.mimeType, "image/png");
  assert.deepEqual(result.inlineData, { mimeType: "image/png", data: png.toString("base64") });
  assert.equal(result.extractedText, "");
});

test("signature detection identifies PDF, PNG, JPEG and ZIP documents", () => {
  assert.equal(detectUploadedSignature(Buffer.from("%PDF-1.7")), "application/pdf");
  assert.equal(detectUploadedSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(detectUploadedSignature(Buffer.from([0xff, 0xd8, 0xff, 0x00])), "image/jpeg");
  assert.equal(detectUploadedSignature(Buffer.from([0x50, 0x4b, 0x03, 0x04])), "application/zip");
});


test("ZIP archive validation accepts ordinary archives and rejects expansion bombs", () => {
  const ordinary = zipSync({ "word/document.xml": Buffer.from("<document>hello</document>") });
  const stats = validateZipArchive(Buffer.from(ordinary));
  assert.equal(stats.entryCount, 1);
  assert.ok(stats.totalUncompressedBytes > 0);

  const oversized = zipSync({ "word/document.xml": Buffer.alloc(4096, 65) });
  assert.throws(
    () => validateZipArchive(Buffer.from(oversized), { maxFileBytes: 1024 }),
    /too large to analyse safely/
  );
});

test("uploaded Office documents reject archives with excessive entry counts before extraction", async () => {
  const entries = Object.fromEntries(
    Array.from({ length: 1001 }, (_, index) => [`word/part-${index}.xml`, Buffer.from("x")])
  );
  const archive = zipSync(entries);
  await assert.rejects(
    prepareUploadedFile({
      name: "oversized.docx",
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      data: dataUrl(Buffer.from(archive), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    }),
    /too many files to analyse safely/
  );
});

test("ZIP archive validation rejects malformed archive metadata", () => {
  assert.throws(
    () => validateZipArchive(Buffer.from("not a zip archive")),
    /damaged or unsupported/
  );
});
