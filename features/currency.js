const CACHE_TTL_MS = 30 * 60 * 1000;
const rateCache = new Map();

const SUPPORTED_CURRENCIES = new Set(
  typeof Intl.supportedValuesOf === "function"
    ? Intl.supportedValuesOf("currency")
    : ["USD", "ZMW", "GBP", "EUR", "ZAR", "MWK", "KES", "TZS", "BWP", "NGN", "GHS", "JPY", "CNY", "INR", "CAD", "AUD", "CHF", "AED", "SAR", "BRL"]
);

function isSupportedCurrency(code) {
  return /^[A-Z]{3}$/.test(code) && SUPPORTED_CURRENCIES.has(code);
}

export function parseCurrencyRequest(message = "") {
  const text = String(message);

  const amountMatch = text.match(
    /\b(?:(?:convert|calculate|exchange)\s+)?([\d,]+(?:\.\d+)?)\s*([A-Z]{3})\s+(?:to|into|in)\s+([A-Z]{3})\b/i
  );

  if (amountMatch) {
    const amount = Number(amountMatch[1].replace(/,/g, ""));
    const from = amountMatch[2].toUpperCase();
    const to = amountMatch[3].toUpperCase();
    if (Number.isFinite(amount) && amount >= 0 &&
        isSupportedCurrency(from) && isSupportedCurrency(to)) {
      return { amount, from, to };
    }
  }

  const pairMatch = text.match(
    /\b([A-Z]{3})\s*(?:\/|to|into)\s*([A-Z]{3})\b/i
  );

  if (!pairMatch) return null;

  const from = pairMatch[1].toUpperCase();
  const to = pairMatch[2].toUpperCase();
  if (!isSupportedCurrency(from) || !isSupportedCurrency(to)) return null;

  return { amount: null, from, to };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    throw new Error(`Currency provider returned HTTP ${response.status}.`);
  }

  return response.json();
}

async function loadRates(base) {
  const cached = rateCache.get(base);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  let data;
  let source;

  try {
    data = await fetchJson(
      `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`
    );

    if (
      data?.result !== "success" ||
      data?.base_code !== base ||
      !data?.rates ||
      typeof data.rates !== "object"
    ) {
      throw new Error("The primary currency provider returned an invalid response.");
    }

    source = "ExchangeRate-API Open Access";
  } catch (primaryError) {
    try {
      const fallback = await fetchJson(
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base.toLowerCase()}.min.json`
      );
      const rates = fallback?.[base.toLowerCase()];

      if (!rates || typeof rates !== "object") {
        throw new Error("The fallback currency provider returned an invalid response.");
      }

      data = {
        base_code: base,
        rates,
        time_last_update_utc: fallback.date || "date not supplied"
      };
      source = "fawazahmed0 Currency API";
    } catch {
      throw primaryError;
    }
  }

  const normalized = {
    base: data.base_code,
    rates: data.rates,
    updatedAt: data.time_last_update_utc || data.date || "not supplied",
    source
  };

  rateCache.set(base, {
    data: normalized,
    expiresAt: Date.now() + CACHE_TTL_MS
  });

  return normalized;
}

function formatAmount(value) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export async function getCurrencyContext(message = "") {
  const request = parseCurrencyRequest(message);
  if (!request) return "";

  const { amount, from, to } = request;

  try {
    const data = await loadRates(from);
    const rate = Number(data.rates[to]);

    if (!Number.isFinite(rate) || rate <= 0) {
      return [
        "A currency conversion was requested.",
        `The verified rate provider does not currently return a usable ${from} to ${to} rate.`,
        "Do not guess or invent a conversion. Explain that the rate is unavailable."
      ].join("\n");
    }

    const lines = [
      "VERIFIED CURRENCY REFERENCE DATA",
      `Pair: ${from} to ${to}`,
      `Rate: 1 ${from} = ${rate} ${to}`,
      `Rate data last updated: ${data.updatedAt}`,
      `Provider: ${data.source}`
    ];

    if (amount !== null) {
      lines.push(
        `Requested amount: ${formatAmount(amount)} ${from}`,
        `Calculated amount: ${formatAmount(amount * rate)} ${to}`
      );
    }

    lines.push(
      "These are published reference rates, not guaranteed bank, bureau, card, or cash-exchange rates. Mention the update date and do not describe the rate as tick-by-tick live."
    );

    return lines.join("\n");
  } catch (error) {
    console.warn("Currency rate lookup failed:", error.message);
    return [
      "A currency conversion was requested, but the rate providers could not be reached.",
      "Do not invent or estimate a current exchange rate. Tell the user that a verified rate is temporarily unavailable."
    ].join("\n");
  }
}

export function clearCurrencyRateCache() {
  rateCache.clear();
}
