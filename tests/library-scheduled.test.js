import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [server, library, scheduled, app] = await Promise.all([
  readFile(new URL("../server.js", import.meta.url), "utf8"),
  readFile(new URL("../storage/user-library.js", import.meta.url), "utf8"),
  readFile(new URL("../storage/scheduled-tasks.js", import.meta.url), "utf8"),
  readFile(new URL("../app.js", import.meta.url), "utf8")
]);

test("Library routes are authenticated and expose upload, list, preview, download and delete", () => {
  assert.match(server, /req\.path\.startsWith\("\/api\/"\)/);
  for (const route of [
    '"/api/library"',
    '"/api/library/:fileId/preview"',
    '"/api/library/:fileId/download"',
    '"/api/library/:fileId"'
  ]) assert.ok(server.includes(route), "Missing Library route " + route);
});

test("Library files are scoped to the authenticated owner", () => {
  assert.match(library, /where\("userId",\s*"==",\s*uid\)/);
  assert.match(library, /snapshot\.data\(\)\.userId !== uid/);
  assert.match(library, /MAX_FILE_BYTES = 15 \* 1024 \* 1024/);
  assert.match(library, /ALLOWED_TYPES/);
});

test("Library stores file bytes in private object paths and issues short-lived links", () => {
  assert.match(library, /zed-library\/" \+ uid/);
  assert.match(library, /expires:\s*Date\.now\(\) \+ 5 \* 60 \* 1000/);
  assert.match(library, /ownerUid: uid/);
});

test("Scheduled tasks are persistent, owner-scoped and reject past dates", () => {
  assert.match(scheduled, /collection\(COLLECTION\)\.doc\(task\.id\)\.create\(task\)/);
  assert.match(scheduled, /due <= Date\.now\(\)/);
  assert.match(scheduled, /snapshot\.data\(\)\.userId !== uid/);
  assert.match(scheduled, /status:\s*"scheduled"/);
});

test("Scheduled API supports create, list, update and delete", () => {
  for (const route of [
    '"/api/scheduled"',
    '"/api/scheduled/:taskId"'
  ]) assert.ok(server.includes(route), "Missing Scheduled route " + route);
  assert.match(server, /updateScheduledTask\(req\.user\.uid/);
  assert.match(server, /deleteScheduledTask\(req\.user\.uid/);
});

test("Zed UI connects the Library, image gallery and reminder workflows", () => {
  assert.match(app, /apiFetch\("\/api\/library"/);
  assert.match(app, /apiFetch\("\/api\/scheduled"/);
  assert.match(app, /checkDueScheduledTasks/);
  assert.match(app, /Notification\.requestPermission/);
  assert.match(app, /zed-image-/);
});
