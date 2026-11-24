import { ZED_CORE_INSTRUCTIONS } from "./ai-instructions.js";

const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_FAILURE_THRESHOLD = 3;
const DEFAULT_COOLDOWN_MS = 30_000;

function cleanBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function isAllowedBaseUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" ||
      (parsed.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname));
  } catch {
    return false;
  }
}

/**
 * Server-side client for Zed's separately hosted, OpenAI-compatible model.
 * It accepts text only. Images, audio and video must stay on providers that
 * explicitly support those modalities.
 */
export function createOnlineBrainClient({
  baseUrl = process.env.ZED_BRAIN_URL,
  apiKey = process.env.ZED_BRAIN_API_KEY,
  model = process.env.ZED_BRAIN_MODEL || "Qwen/Qwen3-8B-AWQ",
  timeoutMs = Number(process.env.ZED_BRAIN_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
  failureThreshold = DEFAULT_FAILURE_THRESHOLD,
  cooldownMs = DEFAULT_COOLDOWN_MS,
  fetchImpl = globalThis.fetch,
  now = Date.now
} = {}) {
  const endpoint = cleanBaseUrl(baseUrl);
  const configured = Boolean(endpoint && apiKey && model && isAllowedBaseUrl(endpoint));
  let failures = 0;
  let circuitOpenUntil = 0;
  let halfOpenRequestInFlight = false;

  function status() {
    const open = now() < circuitOpenUntil;
    return {
      configured,
      circuit: open ? "open" : failures > 0 ? "recovering" : "closed",
      failures
    };
  }

  async function generate(prompt) {
    if (!configured) throw new Error("Zed online brain is not configured.");
    if (typeof fetchImpl !== "function") throw new Error("Fetch is unavailable in this Node.js runtime.");
    if (now() < circuitOpenUntil) throw new Error("Zed online brain circuit is open after repeated failures.");
    if (halfOpenRequestInFlight) throw new Error("Zed online brain recovery probe is already running.");

    halfOpenRequestInFlight = failures >= failureThreshold;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error("Zed online brain request timed out.")), timeoutMs);

    try {
      const response = await fetchImpl(\`\${endpoint}/v1/chat/completions\`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: \`Bearer \${apiKey}\`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: ZED_CORE_INSTRUCTIONS
            },
            { role: "user", content: String(prompt || "") }
          ],
          temperature: 0.7,
          max_tokens: 2048
        })
      });

      if (!response.ok) throw new Error(\`Online brain returned HTTP \${response.status}.\`);
      const data = await response.json();
      const answer = String(data?.choices?.[0]?.message?.content || "").trim();
      if (!answer) throw new Error("Online brain returned an empty response.");

      failures = 0;
      circuitOpenUntil = 0;
      return answer;
    } catch (error) {
      failures += 1;
      if (failures >= failureThreshold) circuitOpenUntil = now() + cooldownMs;
      const safeError = new Error(
        error?.name === "AbortError"
          ? "Zed online brain request timed out."
          : String(error?.message || "Zed online brain request failed.").slice(0, 180)
      );
      safeError.cause = error;
      throw safeError;
    } finally {
      clearTimeout(timeout);
      halfOpenRequestInFlight = false;
    }
  }

  return { generate, status };
}

const defaultClient = createOnlineBrainClient();

export function askOnlineBrain(prompt) {
  return defaultClient.generate(prompt);
}

export function getOnlineBrainStatus() {
  return defaultClient.status();
}
