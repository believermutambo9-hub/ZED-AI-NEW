import test from "node:test";
import assert from "node:assert/strict";
import { createOnlineBrainClient } from "../features/online-brain.js";

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

test("online brain sends text to the private OpenAI-compatible endpoint with bearer auth", async () => {
  let captured;
  const client = createOnlineBrainClient({
    baseUrl: "https://brain.example.com",
    apiKey: "test-secret",
    model: "test-model",
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return response({ choices: [{ message: { content: "Zed is ready." } }] });
    }
  });

  assert.equal(await client.generate("Hello"), "Zed is ready.");
  assert.equal(captured.url, "https://brain.example.com/v1/chat/completions");
  assert.equal(captured.options.headers.Authorization, "Bearer test-secret");
  assert.equal(JSON.parse(captured.options.body).model, "test-model");
  assert.equal(client.status().circuit, "closed");
});

test("online brain rejects insecure public endpoints", () => {
  const client = createOnlineBrainClient({
    baseUrl: "http://brain.example.com",
    apiKey: "test-secret",
    fetchImpl: async () => response({})
  });
  assert.equal(client.status().configured, false);
});

test("online brain opens its circuit after repeated failures and recovers after cooldown", async () => {
  let clock = 1_000;
  let shouldFail = true;
  const client = createOnlineBrainClient({
    baseUrl: "https://brain.example.com",
    apiKey: "test-secret",
    failureThreshold: 2,
    cooldownMs: 500,
    now: () => clock,
    fetchImpl: async () => shouldFail
      ? response({}, 503)
      : response({ choices: [{ message: { content: "Recovered." } }] })
  });

  await assert.rejects(client.generate("one"));
  await assert.rejects(client.generate("two"));
  assert.equal(client.status().circuit, "open");
  await assert.rejects(client.generate("blocked"), /circuit is open/);

  clock += 501;
  shouldFail = false;
  assert.equal(await client.generate("retry"), "Recovered.");
  assert.equal(client.status().circuit, "closed");
});

test("online brain rejects empty model responses", async () => {
  const client = createOnlineBrainClient({
    baseUrl: "https://brain.example.com",
    apiKey: "test-secret",
    fetchImpl: async () => response({ choices: [{ message: { content: " " } }] })
  });
  await assert.rejects(client.generate("Hello"), /empty response/);
});
