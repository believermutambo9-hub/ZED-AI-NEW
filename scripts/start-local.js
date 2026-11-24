// Validate local prerequisites before importing the full Zed server.
process.env.ZED_AI_MODE = "local";

function stop(message) {
  console.error(`\nZed local setup: ${message}\n`);
  process.exitCode = 1;
}

const projectId = String(process.env.FIREBASE_PROJECT_ID || "").trim();
const serviceAccountJson = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();

if (!projectId || !serviceAccountJson) {
  stop("Firebase Admin credentials are missing. Set FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_JSON in the private .env.local file.");
} else {
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      stop("The Firebase service-account JSON is missing client_email or private_key. Use the complete downloaded service-account JSON.");
    }
  } catch {
    stop("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. Put the complete service-account JSON on one line inside single quotes in .env.local.");
  }
}

if (!process.exitCode) {
  const endpoint = String(process.env.ZED_LOCAL_BRAIN_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
  const model = String(process.env.ZED_LOCAL_BRAIN_MODEL || "qwen3:8b").trim();

  let parsedEndpoint;
  try {
    parsedEndpoint = new URL(endpoint);
  } catch {
    stop("ZED_LOCAL_BRAIN_URL is invalid. Use the default http://127.0.0.1:11434 address.");
  }

  if (
    parsedEndpoint &&
    (parsedEndpoint.protocol !== "http:" ||
      !["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsedEndpoint.hostname) ||
      parsedEndpoint.pathname !== "/" ||
      parsedEndpoint.search ||
      parsedEndpoint.hash ||
      parsedEndpoint.username ||
      parsedEndpoint.password)
  ) {
    stop("For privacy, Zed only accepts a local Ollama address such as http://127.0.0.1:11434.");
  }

  if (!process.exitCode) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${endpoint}/api/tags`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
      const data = await response.json();
      const installed = Array.isArray(data.models)
        ? data.models.some(item => item?.name === model || item?.model === model)
        : false;

      if (!installed) {
        stop(`Ollama is running, but model "${model}" is not installed. Run: ollama pull ${model}`);
      }
    } catch (error) {
      if (!process.exitCode) {
        stop(error?.name === "AbortError"
          ? "Ollama did not respond within five seconds. Start Ollama and try again."
          : "Ollama is not responding. Install/start Ollama, then run this command again.");
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}

if (!process.exitCode) {
  console.log("Zed local setup checks passed. Starting the desktop server...");
  await import("../server.js");
}
