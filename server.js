import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 10000;
const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "zed-ai", provider: "gemini", model });
});

app.post("/api/chat", async (req, res) => {
  try {
    const message =
      typeof req.body?.message === "string" ? req.body.message.trim() : "";

    if (!message) {
      return res.status(400).json({ error: "Please enter a message." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Zed AI is not configured yet. Add GEMINI_API_KEY in Render."
      });
    }

    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const googleResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text:
              "You are Zed AI, a helpful, friendly AI assistant. " +
              "Give clear, practical answers. When relevant, understand that " +
              "the user may be in Zambia and use Zambian context, currency (ZMW/Kwacha), " +
              "and everyday examples. Do not claim to be a human."
          }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: message }]
          }
        ]
      })
    });

    const data = await googleResponse.json();

    if (!googleResponse.ok) {
      console.error("Gemini API error:", data);
      const googleMessage =
        data?.error?.message || "Gemini API request failed.";
      return res.status(googleResponse.status).json({ error: googleMessage });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!reply) {
      console.error("Gemini returned no text:", data);
      return res.status(502).json({
        error: "Gemini returned no text response. Please try again."
      });
    }

    res.json({ reply });
  } catch (error) {
    console.error("Zed AI server error:", error);
    res.status(500).json({
      error: "Zed AI could not complete the request. Please try again."
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Zed AI running on port ${port}`);
});
