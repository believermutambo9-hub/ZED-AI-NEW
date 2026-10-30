import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ZED_CORE_INSTRUCTIONS } from "../features/ai-instructions.js";

const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

test("Zed has a stable provider-level identity and accuracy contract", () => {
  assert.match(ZED_CORE_INSTRUCTIONS, /independent AI assistant/i);
  assert.match(ZED_CORE_INSTRUCTIONS, /Never invent facts/i);
  assert.match(ZED_CORE_INSTRUCTIONS, /untrusted data/i);
  assert.match(ZED_CORE_INSTRUCTIONS, /Do not claim to have performed an action unless the action actually succeeded/i);
});

test("all text providers receive Zed's core instructions as system instructions", () => {
  assert.match(server, /systemInstruction:\s*ZED_CORE_INSTRUCTIONS/);
  assert.equal((server.match(/role: "system"[\s\S]{0,100}ZED_CORE_INSTRUCTIONS/g) || []).length, 2);
});

test("fallback provider model names can be configured without changing source", () => {
  assert.match(server, /process\.env\.GROQ_MODEL\s*\|\|\s*"llama-3\.3-70b-versatile"/);
  assert.match(server, /process\.env\.OPENROUTER_MODEL\s*\|\|\s*"meta-llama\/llama-3\.3-70b-instruct:free"/);
  assert.match(server, /process\.env\.GEMINI_TIMEOUT_MS/);
});

test("project checks include the new AI instruction module", () => {
  assert.match(packageJson.scripts.check, /features\/ai-instructions\.js/);
});
