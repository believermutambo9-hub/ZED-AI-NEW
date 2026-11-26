import { ZED_CORE_INSTRUCTIONS } from "./ai-instructions.js";

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_FAILURE_THRESHOLD = 3;
const DEFAULT_COOLDOWN_MS = 20_000;
const DEFAULT_MODEL = "qwen3:8b";

function shouldUseDeepReasoning(userRequest) {
  const text = String(userRequest || "").trim();
  if (!text) return false;
  if (text.length > 700) return true;
  return /\b(analy[sz]e|analysis|compare|contrast|difference between|evaluate|investigate|debug|troubleshoot|diagnos\w*|repair|program|programming|code|script|step[- ]by[- ]step|walk me through|business plan|proposal|strategy|forecast|predict|calculate|derive|prove|research|detailed|in depth|comprehensive|multi[- ]step|spreadsheet|excel|formula|architecture|design a system|audit|review|assess|estimate|optimi[sz]e|reason through)\b/i.test(text);
}

function normalizeEndpoint(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function isLoopbackEndpoint(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname) &&
      !parsed.username &&
      !parsed.password &&
      parsed.pathname === "/" &&
      !parsed.search &&
      !parsed.hash;
  } catch {
    return false;
  }
}

/**
 * Local Ollama client. The Zed backend and Ollama must run on the same
 * computer; this prevents accidentally sending local prompts to a public host.
 * The native Ollama chat API supports explicit Qwen3 thinking control.
 */
export function createLocalBrainClient({
  baseUrl = process.env.ZED_LOCAL_BRAIN_URL || "",
  model = process.env.ZED_LOCAL_BRAIN_MODEL || DEFAULT_MODEL,
  timeoutMs = Number(process.env.ZED_LOCAL_BRAIN_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
  failureThreshold = DEFAULT_FAILURE_THRESHOLD,
  cooldownMs = DEFAULT_COOLDOWN_MS,
  fetchImpl = globalThis.fetch,
  now = Date.now
} = {}) {
  const endpoint = normalizeEndpoint(baseUrl);
  const selectedModel = String(model || "").trim();
  const requestedTimeout = Number(timeoutMs);
  const safeTimeoutMs = Number.isFinite(requestedTimeout) && requestedTimeout > 0
    ? Math.min(requestedTimeout, 10 * 60 * 1000)
    : DEFAULT_TIMEOUT_MS;
  const safeFailureThreshold = Number.isInteger(failureThreshold) && failureThreshold > 0
    ? failureThreshold
    : DEFAULT_FAILURE_THRESHOLD;
  const safeCooldownMs = Number.isFinite(cooldownMs) && cooldownMs > 0
    ? Math.min(cooldownMs, 10 * 60 * 1000)
    : DEFAULT_COOLDOWN_MS;
  const configured = Boolean(endpoint && selectedModel && isLoopbackEndpoint(endpoint));
  let failures = 0;
  let circuitOpenUntil = 0;
  let probeInFlight = false;

  function status() {
    return {
      configured,
      model: selectedModel,
      circuit: now() < circuitOpenUntil ? "open" : failures ? "recovering" : "closed",
      failures
    };
  }

  async function generate(prompt, userRequest = "") {
    if (!configured) throw new Error("Zed local brain is not configured for a loopback Ollama endpoint.");
    if (typeof fetchImpl !== "function") throw new Error("Fetch is unavailable in this Node.js runtime.");
    if (now() < circuitOpenUntil) throw new Error("Zed local brain circuit is open after repeated failures.");
    if (probeInFlight) throw new Error("Zed local brain recovery probe is already running.");

    probeInFlight = failures >= safeFailureThreshold;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, safeTimeoutMs);

    try {
      const response = await fetchImpl(`${endpoint}/api/chat`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: "system", content: ZED_CORE_INSTRUCTIONS },
            { role: "user", content: String(prompt || "") }
          ],
          stream: false,
          think: shouldUseDeepReasoning(userRequest || prompt),
          options: {
            temperature: 0.6,
            num_predict: 2048
          }
        })
      });

      if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}.`);
      const data = await response.json();
      const answer = String(data?.message?.content || "").trim();
      if (!answer) throw new Error("Ollama returned an empty response.");

      failures = 0;
      circuitOpenUntil = 0;
      return answer;
    } catch (error) {
      failures += 1;
      if (failures >= safeFailureThreshold) circuitOpenUntil = now() + safeCooldownMs;
      const safeError = new Error(
        timedOut || error?.name === "AbortError"
          ? "Zed local brain request timed out."
          : String(error?.message || "Zed local brain request failed.").slice(0, 180)
      );
      safeError.cause = error;
      throw safeError;
    } finally {
      clearTimeout(timeout);
      probeInFlight = false;
    }
  }

  return { generate, status };
}

const defaultClient = createLocalBrainClient();

export function askLocalBrain(prompt, userRequest = "") {
  return defaultClient.generate(prompt, userRequest);
}

export function getLocalBrainStatus() {
  return defaultClient.status();
}
