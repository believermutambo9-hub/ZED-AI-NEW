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
  assert.ok(server.includes('process.env.GROQ_MODEL || "openai/gpt-oss-120b"'));
  assert.ok(server.includes('process.env.OPENROUTER_MODEL || "openrouter/free"'));
});

test("project checks include the new AI instruction module", () => {
  assert.match(packageJson.scripts.check, /features\/ai-instructions\.js/);
});


test("Gemini retries transient capacity and rate-limit failures before failing", () => {
  assert.match(server, /function isRetryableGeminiError\(error\)/);
  assert.match(server, /\[408, 429, 500, 502, 503, 504\]\.includes\(status\)/);
  assert.match(server, /const maxAttempts = 3/);
  assert.match(server, /600 \* \(2 \*\* attempt\)/);
  assert.match(server, /retrying in \$\{delayMs\}ms/);
});

test("multimodal provider failures are not sent to text-only fallbacks and return HTTP 503", () => {
  assert.match(server, /if \(inlineData\) \{[\s\S]*?AI_MULTIMODAL_UNAVAILABLE/);
  assert.match(server, /res\.status\(unavailable \? 503 : 500\)/);
  assert.match(server, /Image or scanned-document analysis is temporarily unavailable/);
});
