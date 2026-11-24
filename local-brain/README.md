# Zed Local Brain

Zed's first dedicated local AI brain runs on the user's own computer through [Ollama](https://ollama.com/). No rented GPU server or separate model-hosting subscription is required.

## How the local setup works

Run both Ollama and the Zed Node.js backend on the same desktop. Open Zed from that computer at `http://localhost:10000`. The browser talks to the local Zed backend, and that backend talks to Ollama at `http://127.0.0.1:11434`.

**Important:** a backend running on Render cannot reach Ollama on your desktop's `localhost`. The local setup therefore runs the Zed backend on the desktop too. The existing Render production service and staging service are not changed by this setup.

## Recommended first model

The default is `qwen3:8b`. A desktop with 32 GB system RAM is a reasonable starting point for this model, but generation speed depends heavily on the exact Core i7 generation, GPU, available VRAM, memory bandwidth and other running applications. Ollama can use CPU when no supported GPU is available, but responses may be slower.

## Windows setup

1. Install Ollama for Windows from https://ollama.com/download.
2. Open PowerShell and download the model:

   ```powershell
   ollama pull qwen3:8b
   ```

3. Install Node.js 22 or later.
4. Get the Zed repository on the desktop and install dependencies with `npm install`.
5. Create a Firebase Admin service-account key for the existing Zed Firebase project. In the Firebase Console, open Project settings → Service accounts → Generate new private key. The project ID is `zed-ai-6d201`. Save the downloaded JSON file somewhere private; do not put it in the repository.
6. Create a private `.env.local` file in the project root. It must contain the Firebase Admin configuration required by Zed:

   ```dotenv
   FIREBASE_PROJECT_ID=your-existing-firebase-project-id
   FIREBASE_SERVICE_ACCOUNT_JSON='PASTE_YOUR_COMPLETE_SERVICE_ACCOUNT_JSON_ON_ONE_LINE'
   ZED_LOCAL_BRAIN_URL=http://127.0.0.1:11434
   ZED_LOCAL_BRAIN_MODEL=qwen3:8b
   ```

   Set `FIREBASE_PROJECT_ID=zed-ai-6d201`. Put the complete downloaded service-account JSON on one line inside single quotes for `FIREBASE_SERVICE_ACCOUNT_JSON`. Keep the key private. Never commit `.env.local`, paste credentials into chat, or put service-account data in browser code. The `.gitignore` already excludes this local environment file.

7. Start Zed locally:

   ```powershell
   npm run start:local
   ```

8. Open http://localhost:10000 in the desktop browser and sign in.

Ollama normally runs as a background service on Windows. If it is not running, start it before launching Zed.

## Local mode behaviour

- Ordinary text conversations use Ollama first and do not fall back to Gemini, Groq or OpenRouter. This prevents surprise cloud AI usage for text chat.
- Existing web search and other external data integrations may still use the internet.
- Image analysis, audio/video analysis, real-time voice and image generation remain on their existing modality-capable providers in this first phase. Those features may still require provider credentials and may incur charges.
- When local mode is not enabled, the existing cloud provider order remains intact and Ollama is only the final text fallback.
- Conversation history and memory continue to use the existing Zed storage and Firebase configuration.

## Configuration

- `ZED_AI_MODE=local` enables local-only text generation. The `npm run start:local` script sets this automatically.
- `ZED_LOCAL_BRAIN_URL` defaults to `http://127.0.0.1:11434`. Public endpoints are deliberately rejected.
- `ZED_LOCAL_BRAIN_MODEL` defaults to `qwen3:8b`.
- `ZED_LOCAL_BRAIN_TIMEOUT_MS` defaults to 120000 and is capped at ten minutes.
- The `/health` endpoint reports whether local mode is selected and whether the configured Ollama endpoint is a valid loopback address; it does not expose credentials.

## Rollout safety

This code is prepared on the existing review branch only. It does not change production, deploy to Render, configure secrets, or provision paid services. The desktop setup still needs to be installed and tested on the actual computer.
