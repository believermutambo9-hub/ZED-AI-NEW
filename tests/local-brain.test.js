import test from "node:test";
import assert from "node:assert/strict";
import { createLocalBrainClient } from "../features/local-brain.js";

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test("local brain uses Ollama native chat API and returns its message", async () => {
  let captured;
  const client = createLocalBrainClient({
    baseUrl: "http://127.0.0.1:11434",
    model: "qwen3:8b",
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return response({ message: { content: "Zed is ready." } });
    }
  });
  assert.equal(await client.generate("Hello", "Hello"), "Zed is ready.");
  assert.equal(captured.url, "http://127.0.0.1:11434/api/chat");
  const body = JSON.parse(captured.options.body);
  assert.equal(body.model, "qwen3:8b");
  assert.equal(body.stream, false);
  assert.equal(body.messages[1].content, "Hello");
});

test("local brain refuses public and non-loopback endpoints", () => {
  for (const baseUrl of ["https://public.example.com", "http://192.168.1.10:11434", "http://localhost:11434/proxy"]) {
    const client = createLocalBrainClient({ baseUrl, fetchImpl: async () => response({}) });
    assert.equal(client.status().configured, false, baseUrl);
  }
});

test("local brain rejects empty responses", async () => {
  const client = createLocalBrainClient({
    baseUrl: "http://127.0.0.1:11434",
    fetchImpl: async () => response({ message: { content: " " } })
  });
  await assert.rejects(client.generate("Hello"), /empty response/);
});
