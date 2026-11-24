import test from "node:test";
import assert from "node:assert/strict";
import { createLocalBrainClient } from "../features/local-brain.js";

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

test("local brain sends prompts to Ollama's OpenAI-compatible endpoint", async () => {
  let captured;
  const client = createLocalBrainClient({
    baseUrl: "http://127.0.0.1:11434",
    model: "qwen3:8b",
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return response({ choices: [{ message: { content: "Zed is ready." } }] });
    }
  });

  assert.equal(await client.generate("Hello"), "Zed is ready.");
  assert.equal(captured.url, "http://127.0.0.1:11434/v1/chat/completions");
  assert.equal(captured.options.headers["Content-Type"], "application/json");
  assert.equal(JSON.parse(captured.options.body).model, "qwen3:8b");
  assert.equal(client.status().circuit, "closed");
});

test("local brain refuses public endpoints", () => {
  const client = createLocalBrainClient({
    baseUrl: "https://public.example.com",
    fetchImpl: async () => response({})
  });
  assert.equal(client.status().configured, false);
});

test("local brain opens its circuit after repeated failures and recovers", async () => {
  let clock = 1000;
  let shouldFail = true;
  const client = createLocalBrainClient({
    baseUrl: "http://localhost:11434",
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

test("local brain rejects endpoints with credentials, paths, queries or fragments", () => {
  for (const baseUrl of [
    "http://user:password@localhost:11434",
    "http://localhost:11434/proxy",
    "http://localhost:11434?token=secret",
    "http://localhost:11434#fragment"
  ]) {
    const client = createLocalBrainClient({
      baseUrl,
      fetchImpl: async () => response({})
    });
    assert.equal(client.status().configured, false, baseUrl);
  }
});

test("local brain reports request timeouts clearly", async () => {
  const client = createLocalBrainClient({
    baseUrl: "http://127.0.0.1:11434",
    timeoutMs: 10,
    fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        const error = new Error("The operation was aborted.");
        error.name = "AbortError";
        reject(error);
      }, { once: true });
    })
  });

  await assert.rejects(client.generate("This should time out."), /request timed out/);
});

test("local brain rejects empty responses", async () => {
  const client = createLocalBrainClient({
    baseUrl: "http://127.0.0.1:11434",
    fetchImpl: async () => response({ choices: [{ message: { content: " " } }] })
  });
  await assert.rejects(client.generate("Hello"), /empty response/);
});
