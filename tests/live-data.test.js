import test from "node:test";
import assert from "node:assert/strict";
import {
  detectLiveDataIntent,
  getCurrencyRate,
  getWeather,
  formatLiveDataEvidence
} from "../features/live-data.js";

test("detects currency conversions with codes and common currency names", () => {
  assert.deepEqual(detectLiveDataIntent("Convert 100 USD to ZMW").currency, {
    base: "USD", quote: "ZMW", amount: 100
  });
  assert.deepEqual(detectLiveDataIntent("How much is 25 British pounds in US dollars").currency, {
    base: "GBP", quote: "USD", amount: 25
  });
  assert.equal(detectLiveDataIntent("What is the USD to EUR exchange rate").currency.base, "USD");
  assert.equal(detectLiveDataIntent("What is the USD to EUR exchange rate").currency.quote, "EUR");
});

test("detects a named weather location and asks when no location is given", () => {
  assert.equal(detectLiveDataIntent("What's the weather like in Lusaka today").weatherLocation, "Lusaka");
  assert.equal(detectLiveDataIntent("Give me the forecast for Kitwe, Zambia").weatherLocation, "Kitwe, Zambia");
  assert.equal(detectLiveDataIntent("What's the weather today").needsLocation, true);
});

test("currency rate validates provider response and calculates amount", async () => {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(String(url));
    return {
      ok: true,
      json: async () => ({ date: "2026-11-03", base: "USD", quote: "ZMW", rate: 25.5 })
    };
  };
  const result = await getCurrencyRate({ base: "USD", quote: "ZMW", amount: 10, fetchImpl });
  assert.equal(result.converted, 255);
  assert.equal(result.rate, 25.5);
  assert.equal(new URL(calls[0]).pathname, "/v2/rate/USD/ZMW");
  assert.match(result.note, /not a live bank/i);
});

test("currency provider data is rejected when incomplete or mismatched", async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ date: "2026-11-03", base: "EUR", quote: "ZMW", rate: 1 })
  });
  await assert.rejects(getCurrencyRate({ base: "USD", quote: "ZMW", fetchImpl }), /incomplete or invalid/i);
});

test("weather fetch resolves a location then validates current conditions and forecast", async () => {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(new URL(String(url)));
    if (calls.length === 1) {
      return {
        ok: true,
        json: async () => ({ results: [{ name: "Lusaka", country: "Zambia", admin1: "Lusaka Province", latitude: -15.4, longitude: 28.3, timezone: "Africa/Lusaka" }] })
      };
    }
    return {
      ok: true,
      json: async () => ({
        timezone: "Africa/Lusaka",
        current: { time: "2026-11-03T12:00", temperature_2m: 27, apparent_temperature: 29, relative_humidity_2m: 40, precipitation: 0, wind_speed_10m: 10, cloud_cover: 20, weather_code: 1 },
        daily: { time: ["2026-11-03"], weather_code: [1], temperature_2m_max: [30], temperature_2m_min: [18], precipitation_probability_max: [10], precipitation_sum: [0] }
      })
    };
  };
  const result = await getWeather({ location: "Lusaka", fetchImpl });
  assert.equal(result.location, "Lusaka, Lusaka Province, Zambia");
  assert.equal(result.temperatureC, 27);
  assert.equal(result.conditions, "Mainly clear");
  assert.equal(result.daily[0].highC, 30);
  assert.equal(calls.length, 2);
});

test("weather errors are not converted into fabricated conditions", async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ results: [] }) });
  await assert.rejects(getWeather({ location: "Unknown Place", fetchImpl }), /couldn't find a weather location/i);
});

test("live data evidence identifies providers, observation dates and limitations", () => {
  const text = formatLiveDataEvidence({
    results: [{
      type: "currency", provider: "Frankfurter", date: "2026-11-03",
      base: "USD", quote: "ZMW", rate: 25.5, amount: 10, converted: 255,
      note: "Daily reference exchange rate."
    }],
    errors: ["Weather data: Provider unavailable."]
  });
  assert.match(text, /Frankfurter/);
  assert.match(text, /2026-11-03/);
  assert.match(text, /Provider unavailable/);
});
