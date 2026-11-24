# Zed Online Brain

This is the dedicated GPU inference service used as Zed's final text-generation fallback. It runs separately from the Zed web application and exposes the OpenAI-compatible vLLM API.

## Model

Default: \`Qwen/Qwen3-8B-AWQ\`. The model can be changed with \`ZED_BRAIN_MODEL\` at deployment time. Use a GPU host with enough VRAM for the selected model and context length.

## Required private environment variables

- \`ZED_BRAIN_API_KEY\`: long random secret. Configure the same value in the GPU service and Zed staging. Never commit it or expose it to the browser.
- \`ZED_BRAIN_MODEL\`: optional model override.
- \`ZED_BRAIN_MAX_MODEL_LEN\`: optional context limit; defaults to 16384.
- \`ZED_BRAIN_GPU_MEMORY_UTILIZATION\`: optional GPU memory fraction; defaults to 0.90.
- \`ZED_BRAIN_MAX_NUM_SEQS\`: optional concurrency cap; defaults to 8.

The inference service must be reachable over HTTPS. Restrict inbound access to Zed's server where the host supports private networking or IP allow-listing. Keep the vLLM API key enabled even behind network restrictions.

## Zed staging configuration

Set these server-side variables on the existing \`zed-voice-staging\` service only after the GPU endpoint is provisioned:

- \`ZED_BRAIN_URL\`: HTTPS origin of this service, without an API path.
- \`ZED_BRAIN_API_KEY\`: the matching secret.
- \`ZED_BRAIN_MODEL\`: the exact model identifier served by vLLM.

The web app's existing Gemini, Groq and OpenRouter providers remain first in the fallback chain. This service is text-only in phase one; image, audio, video and real-time voice continue to use modality-capable providers.

## Deployment status

The source and integration are being prepared in a review branch. No GPU host has been selected or provisioned, no paid service has been started, and no production settings have been changed.
