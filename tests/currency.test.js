import test from "node:test";
import assert from "node:assert/strict";
import {
  clearCurrencyRateCache,
  getCurrencyContext,
  parseCurrencyRequest
} from "../features/currency.js";

test("currency parser extracts an amount and ISO currency pair", () => {
  assert.deepEqual(
    parseCurrencyRequest("Convert 100 USD to ZMW"),
    { amount: 100, from: "USD", to: "ZMW" }
  );
});

test("currency parser supports comma-separated amounts and rate-only pairs", () => {
  assert.deepEqual(
    parseCurrencyRequest("1,250.50 usd into zmw"),
    { amount: 1250.5, from: "USD", to: "ZMW" }
  );
  assert.deepEqual(
    parseCurrencyRequest("What is the USD/ZMW rate?"),
    { amount: null, from: "USD", to: "ZMW" }
  );
});

test("currency parser ignores ordinary messages", () => {
  assert.equal(parseCurrencyRequest("How are you today?"), null);
});

test("currency lookup supplies a calculated amount and provider update time", async () => {
  const originalFetch = globalThis.fetch;
  clearCurrencyRateCache();

  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      result: "success",
      base_code: "USD",
      time_last_update_utc: "Tue, 03 Nov 2026 00:02:31 +0000",
      rates: { ZMW: 20.25 }
    })
  });

  try {
    const context = await getCurrencyContext("Convert 100 USD to ZMW");
    assert.match(context, /1 USD = 20\.25 ZMW/);
    assert.match(context, /100\.00 USD/);
    assert.match(context, /2,025\.00 ZMW/);
    assert.match(context, /03 Nov 2026/);
  } finally {
    globalThis.fetch = originalFetch;
    clearCurrencyRateCache();
  }
});

test("currency lookup fails honestly instead of fabricating a rate", async () => {
  const originalFetch = globalThis.fetch;
  clearCurrencyRateCache();
  globalThis.fetch = async () => {
    throw new Error("network unavailable");
  };

  try {
    const context = await getCurrencyContext("Convert 100 USD to ZMW");
    assert.match(context, /could not be reached/);
    assert.match(context, /Do not invent/);
  } finally {
    globalThis.fetch = originalFetch;
    clearCurrencyRateCache();
  }
});
