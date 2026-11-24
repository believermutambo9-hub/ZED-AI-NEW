// Start Zed's backend on this computer and keep text generation local.
process.env.ZED_AI_MODE = "local";
await import("../server.js");
