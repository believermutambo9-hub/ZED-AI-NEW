import test from "node:test";
import assert from "node:assert/strict";
import {
  getPitchIntelChatData,
  getPitchIntelHealth,
  getPitchIntelUpcoming
} from "../features/pitchintel.js";

function preserveEnv() {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    PITCHINTEL_API_URL: process.env.PITCHINTEL_API_URL,
    PITCHINTEL_SERVICE_SECRET: process.env.PITCHINTEL_SERVICE_SECRET,
    fetch: globalThis.fetch
  };

  return () => {
    for (const key of ["NODE_ENV", "PITCHINTEL_API_URL", "PITCHINTEL_SERVICE_SECRET"]) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    globalThis.fetch = previous.fetch;
  };
}

test("PitchIntel stays unavailable when staging credentials are not configured", async () => {
  const restore = preserveEnv();
  try {
    delete process.env.PITCHINTEL_API_URL;
    delete process.env.PITCHINTEL_SERVICE_SECRET;
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      throw new Error("fetch should not be called");
    };

    const result = await getPitchIntelHealth();
    assert.equal(result.ok, false);
    assert.equal(result.configured, false);
    assert.equal(called, false);
  } finally {
    restore();
  }
});

test("PitchIntel upcoming requests authenticate server-to-server and use Lusaka time", async () => {
  const restore = preserveEnv();
  try {
    process.env.NODE_ENV = "test";
    process.env.PITCHINTEL_API_URL = "https://pitchintel-staging.example";
    process.env.PITCHINTEL_SERVICE_SECRET = "test-only-secret";
    let captured;
    globalThis.fetch = async (url, options) => {
      captured = { url: String(url), options };
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify({ totalUpcoming: 1, matches: [{ homeTeam: "Arsenal", awayTeam: "Chelsea" }] })
      };
    };

    const result = await getPitchIntelUpcoming({ hours: 5 });
    assert.equal(result.ok, true);
    assert.equal(result.data.totalUpcoming, 1);
    assert.match(captured.url, /\/api\/v1\/zed\/upcoming\?hours=5/);
    assert.match(captured.url, /timezone=Africa%2FLusaka/);
    assert.equal(captured.options.headers["x-pitchintel-service-secret"], "test-only-secret");
    assert.equal(captured.options.headers.accept, "application/json");
  } finally {
    restore();
  }
});

test("football matchup chat requests use PitchIntel predictions", async () => {
  const restore = preserveEnv();
  try {
    process.env.NODE_ENV = "test";
    process.env.PITCHINTEL_API_URL = "https://pitchintel-staging.example";
    process.env.PITCHINTEL_SERVICE_SECRET = "test-only-secret";
    let captured;
    globalThis.fetch = async (url, options) => {
      captured = { url: String(url), options };
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify({ probabilities: { homeWin: 45, draw: 28, awayWin: 27 }, zedSummaryMarkdown: "Forecast ready" })
      };
    };

    const result = await getPitchIntelChatData("Please predict Arsenal vs Chelsea");
    assert.equal(result.ok, true);
    assert.equal(result.source, "PitchIntel");
    assert.equal(result.type, "prediction");
    assert.match(captured.url, /\/api\/v1\/zed\/predict$/);
    assert.deepEqual(JSON.parse(captured.options.body), { homeTeam: "Arsenal", awayTeam: "Chelsea" });
  } finally {
    restore();
  }
});

test("PitchIntel connection failures return null so Zed can use its existing football fallback", async () => {
  const restore = preserveEnv();
  try {
    process.env.NODE_ENV = "test";
    process.env.PITCHINTEL_API_URL = "https://pitchintel-staging.example";
    process.env.PITCHINTEL_SERVICE_SECRET = "test-only-secret";
    globalThis.fetch = async () => {
      throw new Error("network unavailable");
    };

    const result = await getPitchIntelChatData("Predict Arsenal vs Chelsea");
    assert.equal(result, null);
  } finally {
    restore();
  }
});

test("head-to-head chat questions call the dedicated PitchIntel endpoint", async () => {
  const restore = preserveEnv();
  try {
    process.env.NODE_ENV = "test";
    process.env.PITCHINTEL_API_URL = "https://pitchintel-staging.example";
    process.env.PITCHINTEL_SERVICE_SECRET = "test-only-secret";
    let capturedUrl = "";
    globalThis.fetch = async (url) => {
      capturedUrl = String(url);
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify({ totalEncounters: 10, record: { homeWins: 4, draws: 3, awayWins: 3 } })
      };
    };

    const result = await getPitchIntelChatData("Head-to-head Arsenal vs Chelsea");
    assert.equal(result.ok, true);
    assert.equal(result.type, "head_to_head");
    assert.match(capturedUrl, /\/api\/v1\/zed\/h2h\\?/);
    assert.match(capturedUrl, /home=Arsenal/);
    assert.match(capturedUrl, /away=Chelsea/);
  } finally {
    restore();
  }
});

test("upcoming fixture requests preserve the requested time horizon", async () => {
  const restore = preserveEnv();
  try {
    process.env.NODE_ENV = "test";
    process.env.PITCHINTEL_API_URL = "https://pitchintel-staging.example";
    process.env.PITCHINTEL_SERVICE_SECRET = "test-only-secret";
    let capturedUrl = "";
    globalThis.fetch = async (url) => {
      capturedUrl = String(url);
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify({ totalUpcoming: 0, matches: [] })
      };
    };

    const result = await getPitchIntelChatData("Show upcoming fixtures next 7 days");
    assert.equal(result.ok, true);
    assert.equal(result.type, "upcoming");
    assert.match(capturedUrl, /hours=168/);
  } finally {
    restore();
  }
});
