const OPEN_METEO_GEOCODING = "https://geocoding-api.open-meteo.com/v1/search";
const OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast";
const FRANKFURTER_RATE = "https://api.frankfurter.dev/v2/rate";
const FETCH_TIMEOUT_MS = 9000;

const CURRENCY_ALIASES = {
  USD: ["usd", "us dollar", "us dollars", "american dollar", "american dollars"],
  ZMW: ["zmw", "kwacha", "zambian kwacha", "zambian kwachas"],
  EUR: ["eur", "euro", "euros"],
  GBP: ["gbp", "pound", "pounds", "british pound", "sterling"],
  ZAR: ["zar", "rand", "south african rand"],
  KES: ["kes", "kenyan shilling", "kenyan shillings"],
  NGN: ["ngn", "naira"],
  GHS: ["ghs", "cedi", "cedis", "ghanaian cedi"],
  BWP: ["bwp", "pula"],
  MWK: ["mwk", "malawi kwacha"],
  TZS: ["tzs", "tanzanian shilling", "tanzanian shillings"],
  UGX: ["ugx", "ugandan shilling", "ugandan shillings"],
  INR: ["inr", "rupee", "rupees", "indian rupee"],
  CAD: ["cad", "canadian dollar", "canadian dollars"],
  AUD: ["aud", "australian dollar", "australian dollars"],
  JPY: ["jpy", "yen"],
  CNY: ["cny", "yuan", "renminbi"],
  AED: ["aed", "dirham", "dirhams"],
  CHF: ["chf", "swiss franc", "swiss francs"],
  BRL: ["brl", "brazilian real"],
};

const WEATHER_CODES = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail"
};

function cleanText(value = "") {
  return String(value).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchJson(url, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") throw new Error("Fetch is unavailable.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": "Zed/2.0" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}.`);
    const data = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Provider returned an invalid response.");
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function findCurrencyCode(value = "") {
  const normalized = cleanText(value).toLowerCase();
  for (const [code, aliases] of Object.entries(CURRENCY_ALIASES)) {
    if (normalized.split(/[^a-z0-9]+/).includes(code.toLowerCase())) return code;
    for (const alias of aliases) {
      if (normalized === alias || normalized.includes(alias)) return code;
    }
  }
  return null;
}

function parseCurrencyRequest(message = "") {
  const text = cleanText(message);
  const amountMatch = text.match(/(?:convert|exchange|how much is|what is)?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*([a-z]{3}|[a-z]+(?:\s+[a-z]+){0,2})\s+(?:to|in)\s+([a-z]{3}|[a-z]+(?:\s+[a-z]+){0,2})/i);
  let base = null;
  let quote = null;
  let amount = 1;
  if (amountMatch) {
    amount = Number(amountMatch[1].replace(/,/g, ""));
    base = findCurrencyCode(amountMatch[2]);
    quote = findCurrencyCode(amountMatch[3]);
  } else {
    const pairMatch = text.match(/\b([A-Z]{3})\s*(?:to|\/)\s*([A-Z]{3})\b/i);
    if (pairMatch) {
      base = findCurrencyCode(pairMatch[1]);
      quote = findCurrencyCode(pairMatch[2]);
    } else {
      const words = text.toUpperCase().split(/[^A-Z0-9]+/);
      const codes = Object.keys(CURRENCY_ALIASES).filter(code => words.includes(code));
      if (codes.length >= 2) [base, quote] = codes.slice(0, 2);
    }
  }
  if (!base || !quote || base === quote || !Number.isFinite(amount) || amount < 0 || amount > 1e15) return null;
  return { base, quote, amount };
}

function parseWeatherLocation(message = "") {
  const text = cleanText(message);
  const match = text.match(/\b(?:weather|forecast|temperature|rain|raining)\b(?:\s+(?:like|today|tomorrow|now|currently))?\s+(?:in|for|at)\s+(.+?)(?:[?.!,;]|$)/i)
    || text.match(/\b(?:in|for)\s+([a-z][a-z .'-]{1,80})\s+(?:weather|forecast)\b/i);
  if (!match) return "";
  return cleanText(match[1]).replace(/\b(today|tomorrow|this week|this weekend|right now|currently)\b/gi, "").trim().slice(0, 100);
}

export function detectLiveDataIntent(message = "") {
  const text = cleanText(message).toLowerCase();
  const currency = /\b(convert|conversion|exchange rate|currency|how much is|\d[\d,.]*\s*[a-z]{3}\s+(?:to|in)\s+[a-z]{3})\b/i.test(text)
    ? parseCurrencyRequest(message)
    : null;
  const weatherLocation = /\b(weather|forecast|temperature|raining|rainfall)\b/i.test(text)
    ? parseWeatherLocation(message)
    : "";
  return {
    currency,
    weatherLocation,
    needsLocation: /\b(weather|forecast|temperature|raining|rainfall)\b/i.test(text) && !weatherLocation
  };
}

export async function getCurrencyRate({ base, quote, amount = 1, fetchImpl = globalThis.fetch }) {
  const normalizedBase = String(base || "").toUpperCase();
  const normalizedQuote = String(quote || "").toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalizedBase) || !/^[A-Z]{3}$/.test(normalizedQuote) || normalizedBase === normalizedQuote) {
    throw new Error("Please provide two different three-letter currency codes.");
  }
  if (!Number.isFinite(amount) || amount < 0 || amount > 1e15) throw new Error("The amount is outside the supported range.");
  const data = await fetchJson(`${FRANKFURTER_RATE}/${normalizedBase}/${normalizedQuote}`, fetchImpl);
  if (data.base !== normalizedBase || data.quote !== normalizedQuote || !Number.isFinite(data.rate) || data.rate <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(data.date || "")) {
    throw new Error("The exchange-rate provider returned incomplete or invalid data.");
  }
  return {
    type: "currency",
    provider: "Frankfurter",
    date: data.date,
    base: normalizedBase,
    quote: normalizedQuote,
    rate: data.rate,
    amount,
    converted: amount * data.rate,
    note: "Daily reference exchange rate, not a live bank, cash-market or remittance quote."
  };
}

export async function getWeather({ location, fetchImpl = globalThis.fetch }) {
  const query = cleanText(location);
  if (!query || query.length > 100) throw new Error("Please provide a city or location for the weather forecast.");
  const geoUrl = new URL(OPEN_METEO_GEOCODING);
  geoUrl.searchParams.set("name", query);
  geoUrl.searchParams.set("count", "5");
  geoUrl.searchParams.set("language", "en");
  geoUrl.searchParams.set("format", "json");
  const geo = await fetchJson(geoUrl.toString(), fetchImpl);
  const places = Array.isArray(geo.results) ? geo.results : [];
  if (!places.length) throw new Error(`I couldn't find a weather location matching "${query}". Try a city and country.`);
  const place = places[0];
  if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
    throw new Error("The location provider returned invalid coordinates.");
  }
  const weatherUrl = new URL(OPEN_METEO_FORECAST);
  weatherUrl.searchParams.set("latitude", String(place.latitude));
  weatherUrl.searchParams.set("longitude", String(place.longitude));
  weatherUrl.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m");
  weatherUrl.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset");
  weatherUrl.searchParams.set("forecast_days", "3");
  weatherUrl.searchParams.set("timezone", "auto");
  const data = await fetchJson(weatherUrl.toString(), fetchImpl);
  const current = data.current;
  if (!current || !Number.isFinite(current.temperature_2m) || !Number.isFinite(current.weather_code)) {
    throw new Error("The weather provider returned incomplete current conditions.");
  }
  return {
    type: "weather",
    provider: "Open-Meteo",
    location: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
    timezone: data.timezone || place.timezone || "not supplied",
    observedAt: current.time || null,
    temperatureC: current.temperature_2m,
    feelsLikeC: Number.isFinite(current.apparent_temperature) ? current.apparent_temperature : null,
    humidityPercent: Number.isFinite(current.relative_humidity_2m) ? current.relative_humidity_2m : null,
    precipitationMm: Number.isFinite(current.precipitation) ? current.precipitation : null,
    windKmh: Number.isFinite(current.wind_speed_10m) ? current.wind_speed_10m : null,
    cloudCoverPercent: Number.isFinite(current.cloud_cover) ? current.cloud_cover : null,
    conditions: WEATHER_CODES[current.weather_code] || `Weather code ${current.weather_code}`,
    daily: Array.isArray(data.daily?.time) ? data.daily.time.slice(0, 3).map((date, index) => ({
      date,
      condition: WEATHER_CODES[data.daily.weather_code?.[index]] || "Not supplied",
      highC: data.daily.temperature_2m_max?.[index] ?? null,
      lowC: data.daily.temperature_2m_min?.[index] ?? null,
      precipitationProbabilityPercent: data.daily.precipitation_probability_max?.[index] ?? null,
      precipitationMm: data.daily.precipitation_sum?.[index] ?? null
    })) : []
  };
}

export async function getLiveDataForMessage(message = "", { fetchImpl = globalThis.fetch } = {}) {
  const intent = detectLiveDataIntent(message);
  const results = [];
  const errors = [];
  if (intent.currency) {
    try {
      results.push(await getCurrencyRate({ ...intent.currency, fetchImpl }));
    } catch (error) {
      errors.push(`Exchange-rate data: ${cleanText(error.message)}`);
    }
  }
  if (intent.weatherLocation) {
    try {
      results.push(await getWeather({ location: intent.weatherLocation, fetchImpl }));
    } catch (error) {
      errors.push(`Weather data: ${cleanText(error.message)}`);
    }
  }
  if (intent.needsLocation) errors.push("Weather data: Please specify a city or location so I can check the correct forecast.");
  return { intent, results, errors };
}

export function formatLiveDataEvidence(liveData = {}) {
  const results = Array.isArray(liveData.results) ? liveData.results : [];
  const errors = Array.isArray(liveData.errors) ? liveData.errors : [];
  if (!results.length && !errors.length) return "";
  const sections = results.map(item => {
    if (item.type === "currency") {
      return [
        "LIVE EXCHANGE-RATE DATA",
        `Provider: ${item.provider}`,
        `Rate date: ${item.date}`,
        `Pair: ${item.base}/${item.quote}`,
        `Rate: 1 ${item.base} = ${item.rate} ${item.quote}`,
        `Conversion: ${item.amount} ${item.base} = ${item.converted.toFixed(4)} ${item.quote}`,
        item.note
      ].join("\n");
    }
    if (item.type === "weather") {
      return [
        "LIVE WEATHER DATA",
        `Provider: ${item.provider}`,
        `Location: ${item.location}`,
        `Local time zone: ${item.timezone}`,
        `Observation/model time: ${item.observedAt || "not supplied"}`,
        `Current conditions: ${item.conditions}`,
        `Temperature: ${item.temperatureC} °C`,
        `Feels like: ${item.feelsLikeC ?? "not supplied"} °C`,
        `Humidity: ${item.humidityPercent ?? "not supplied"}%`,
        `Precipitation: ${item.precipitationMm ?? "not supplied"} mm`,
        `Wind: ${item.windKmh ?? "not supplied"} km/h`,
        `Cloud cover: ${item.cloudCoverPercent ?? "not supplied"}%`,
        "Three-day forecast:",
        ...item.daily.map(day => `${day.date}: ${day.condition}, high ${day.highC ?? "n/a"} °C, low ${day.lowC ?? "n/a"} °C, rain probability ${day.precipitationProbabilityPercent ?? "n/a"}%, precipitation ${day.precipitationMm ?? "n/a"} mm`)
      ].join("\n");
    }
    return "";
  }).filter(Boolean);
  if (errors.length) sections.push("LIVE DATA LIMITATIONS\n" + errors.join("\n"));
  return sections.join("\n\n");
}
