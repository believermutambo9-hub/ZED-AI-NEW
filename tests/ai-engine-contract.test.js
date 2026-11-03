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
  assert.match(server, /systemInstruction:\s*inlineData\s*\?\s*IMAGE_ANALYSIS_INSTRUCTIONS\s*:\s*ZED_CORE_INSTRUCTIONS/);
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

test("Gemini image failures fall back to a real Groq vision model, never a text-only model", () => {
  assert.match(server, /async function askGroq\([\s\S]*?prompt,\s*inlineData = null/);
  assert.match(server, /process\.env\.GROQ_VISION_MODEL \|\| "qwen\/qwen3\.8-27b"/);
  assert.match(server, /type: "image_url"/);
  assert.match(server, /max_completion_tokens: inlineData \? 2500 : 2048/);
  assert.match(server, /data:\$\{inlineData\.mimeType\};base64,/);
  assert.match(server, /askGroq\(providerPrompt, inlineData\)/);
  assert.match(server, /const providerPrompt = inlineData/);
  assert.match(server, /detail: "high"/);
  assert.match(server, /Inspect the entire supplied image before answering/);
  assert.match(server, /slice\(0, 1500\)/);
  assert.match(server, /provider: "groq-vision"/);
  assert.match(server, /async function askOpenRouter\([\s\S]*?prompt,\s*inlineData = null/);
  assert.match(server, /OPENROUTER_VISION_MODEL \|\| "deepseek\/deepseek-v4\.1-flash"/);
  assert.match(server, /type: "image_url"/);
  assert.match(server, /askOpenRouter\(providerPrompt, inlineData\)/);
  assert.match(server, /provider: "openrouter-vision"/);
  assert.match(server, /startsWith\("image\/"\)/);
  assert.match(server, /Groq documents a 20 MB request limit/);
  assert.match(server, /AI_MULTIMODAL_UNAVAILABLE/);
  assert.match(server, /res\.status\(unavailable \? 503 : 500\)/);
  assert.match(server, /Image or scanned-document analysis is temporarily unavailable/);
});


test("image analysis uses structured transcription rules and a sufficient output budget", () => {
  assert.match(server, /const IMAGE_ANALYSIS_INSTRUCTIONS = \[/);
  assert.match(server, /transcribe every fully readable visible row/);
  assert.match(server, /\\[unclear\\]/);
  assert.match(server, /maxOutputTokens: 2500/);
  assert.match(server, /max_completion_tokens: inlineData \? 2500 : 2048/);
  assert.match(server, /max_tokens: isVisionRequest \? 2500 : 2048/);
  assert.match(server, /detail: "high"/);
  assert.match(server, /include all readable rows rather than giving only a general description/);
});
