import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const memory = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 10000;

const geminiModel =
  process.env.GEMINI_MODEL || "gemini-3.8-flash";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

/* =========================
   HOME
========================= */

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* =========================
   HEALTH
========================= */

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "zed-ai",
    provider: "gemini-with-groq-and-openrouter-fallback",
    geminiModel
  });
});

/* =========================
   MEMORY API
========================= */

app.post("/api/memory", (req, res) => {
  const userId =
    typeof req.body?.userId === "string"
      ? req.body.userId.trim()
      : "";

  const text =
    typeof req.body?.text === "string"
      ? req.body.text.trim()
      : "";

  if (!userId || !text) {
    return res.status(400).json({
      error: "Memory information is missing."
    });
  }

  const memories =
    memory.get(userId) || [];

  memories.push(text);

  memory.set(userId, memories);

  return res.json({
    ok: true,
    memories
  });
});

/* =========================
   OPENROUTER
========================= */

async function askOpenRouter(message, apiKey) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://zed-ai-h7h4.onrender.com",
        "X-Title": "Zed AI"
      },

      body: JSON.stringify({
        model: "openrouter/free",

        messages: [
          {
            role: "system",
            content:
              "You are Zed AI, a helpful, friendly and intelligent AI assistant. " +
              "Always give clear, practical and accurate answers. " +
              "Use simple English unless the user asks for technical detail. " +
              "When relevant, understand that the user may be in Zambia and use " +
              "Zambian context, ZMW/Kwacha, and everyday examples. " +
              "Do not claim to be human."
          },

          {
            role: "user",
            content: message
          }
        ]
      })
    }
  );

  const data = await response.json();

  return {
    response,
    data
  };
}

/* =========================
   GEMINI
========================= */

async function askGemini(messages, apiKey) {
  const memoryText =
    messages
      .filter(
        message =>
          message.role === "memory"
      )
      .map(
        message =>
          message.text
      )
      .join("\n");

  const normalMessages =
    messages.filter(
      message =>
        message.role !== "memory"
    );

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      geminiModel
    )}:generateContent`;

  const response = await fetch(
    endpoint,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },

      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                "You are Zed AI, a helpful, friendly and intelligent AI assistant. " +
                "Always explain things using simple, clear and easy-to-understand English. " +
                "Avoid unnecessarily difficult words, complicated sentences, or technical language " +
                "unless the user asks for a detailed or technical explanation. " +
                "When relevant, understand that the user may be in Zambia and use " +
                "Zambian context, currency (ZMW/Kwacha), and everyday examples. " +
                "You may communicate in a Zambian local language when appropriate, " +
                "but never guess the user's local language. " +
                "If the user's preferred language is not known and a local language would be useful, " +
                "ask the user which language they prefer. " +
                "Once the user tells you their preferred language, use it when appropriate. " +
                "Do not claim to be human. " +
                "Here are memories saved about the user:\n" +
                (memoryText || "No saved memories yet.")
            }
          ]
        },

        contents: normalMessages.map(
          message => ({
            role:
              message.role === "assistant"
                ? "model"
                : "user",

            parts: [
              {
                text: message.text
              }
            ]
          })
        )
      })
    }
  );

  const data = await response.json();

  return {
    response,
    data
  };
}

/* =========================
   GROQ
========================= */

async function askGroq(message, apiKey) {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },

      body: JSON.stringify({
        model: "openai/gpt-oss-120b",

        messages: [
          {
            role: "system",
            content:
              "You are Zed AI, a helpful, friendly and intelligent AI assistant. " +
              "Always give clear, practical and accurate answers. " +
              "Use simple English unless the user asks for technical detail. " +
              "When relevant, understand that the user may be in Zambia and use " +
              "Zambian context, currency (ZMW/Kwacha), and everyday examples. " +
              "Do not claim to be human."
          },

          {
            role: "user",
            content: message
          }
        ]
      })
    }
  );

  const data = await response.json();

  return {
    response,
    data
  };
}

/* =========================
   GEMINI IMAGE GENERATION
========================= */

async function generateGeminiImage(
  prompt,
  apiKey
) {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },

      body: JSON.stringify({
        model:
          process.env.GEMINI_IMAGE_MODEL ||
          "gemini-3.1-flash-image",

        input: prompt,

        response_format: {
          type: "image",
          mime_type: "image/jpeg",
          aspect_ratio: "1:1",
          image_size: "1K"
        }
      })
    }
  );

  const data = await response.json();

  return {
    response,
    data
  };
}

/* =========================
   IMAGE GENERATION API
========================= */

app.post(
  "/api/generate-image",
  async (req, res) => {
    try {
      const prompt =
        typeof req.body?.prompt === "string"
          ? req.body.prompt.trim()
          : "";

      if (!prompt) {
        return res.status(400).json({
          error:
            "Please enter an image description."
        });
      }

      const geminiKey =
        process.env.GEMINI_API_KEY;

      if (!geminiKey) {
        return res.status(500).json({
          error:
            "Gemini API key is not configured."
        });
      }

      const result =
        await generateGeminiImage(
          prompt,
          geminiKey
        );

      if (!result.response.ok) {
        console.error(
          "Gemini image API error:",
          result.response.status,
          result.data
        );

        return res.status(502).json({
          error:
            result.data?.error?.message ||
            "Image generation failed."
        });
      }

      return res.json({
        ok: true,
        data: result.data
      });

    } catch (error) {
      console.error(
        "Image generation error:",
        error
      );

      return res.status(500).json({
        error:
          "Zed AI could not generate the image."
      });
    }
  }
);

/* =========================
   CHAT API
========================= */

app.post(
  "/api/chat",
  async (req, res) => {
    try {
      const message =
        typeof req.body?.message === "string"
          ? req.body.message.trim()
          : "";

      const conversation =
        Array.isArray(
          req.body?.conversation
        )
          ? req.body.conversation
          : [];

      const userId =
        typeof req.body?.userId === "string"
          ? req.body.userId.trim()
          : "";

      const clientMemories =
        Array.isArray(
          req.body?.memories
        )
          ? req.body.memories
              .filter(
                item =>
                  typeof item === "string"
              )
              .map(
                item =>
                  item.trim()
              )
              .filter(Boolean)
          : [];

      if (!message) {
        return res.status(400).json({
          error:
            "Please enter a message."
        });
      }

      /* =========================
         SAVE "REMEMBER" REQUEST
      ========================= */

      if (
        userId &&
        /^remember\b/i.test(message)
      ) {
        const memoryText =
          message
            .replace(
              /^remember\b\s*(that)?\s*/i,
              ""
            )
            .trim();

        if (memoryText) {
          const existing =
            memory.get(userId) || [];

          if (
            !existing.includes(
              memoryText
            )
          ) {
            existing.push(
              memoryText
            );

            memory.set(
              userId,
              existing
            );
          }

          console.log(
            "Memory saved:",
            userId,
            memoryText
          );
        }
      }

      /* =========================
         TRY GEMINI FIRST
      ========================= */

      const geminiKey =
        process.env.GEMINI_API_KEY;

      if (geminiKey) {
        try {
          const savedMemories =
            clientMemories;

          const gemini =
            await askGemini(
              [
                ...savedMemories.map(
                  text => ({
                    role: "memory",
                    text
                  })
                ),

                ...conversation,

                {
                  role: "user",
                  text: message
                }
              ],
              geminiKey
            );

          if (
            gemini.response.ok
          ) {
            const reply =
              gemini.data
                ?.candidates?.[0]
                ?.content?.parts
                ?.map(
                  part =>
                    part.text || ""
                )
                .join("")
                .trim();

            if (reply) {
              return res.json({
                reply,
                provider:
                  "gemini"
              });
            }
          }

          console.log(
            "Gemini unavailable:",
            gemini.response.status,
            gemini.data
              ?.error?.message
          );

        } catch (error) {
          console.error(
            "Gemini request failed:",
            error
          );
        }
      }

      /* =========================
         FALL BACK TO GROQ
      ========================= */

      const groqKey =
        process.env.GROQ_API_KEY;

      if (groqKey) {
        console.log(
          "Using Groq backup because Gemini was unavailable."
        );

        try {
          const groq =
            await askGroq(
              message,
              groqKey
            );

          if (
            groq.response.ok
          ) {
            const reply =
              groq.data
                ?.choices?.[0]
                ?.message
                ?.content
                ?.trim();

            if (reply) {
              return res.json({
                reply,
                provider:
                  "groq"
              });
            }
          }

          console.error(
            "Groq API error:",
            groq.response.status,
            groq.data
          );

        } catch (error) {
          console.error(
            "Groq request failed:",
            error
          );
        }
      }

      /* =========================
         FALL BACK TO OPENROUTER
      ========================= */

      const openRouterKey =
        process.env.OPENROUTER_API_KEY;

      if (openRouterKey) {
        console.log(
          "Using OpenRouter backup because Gemini and Groq were unavailable."
        );

        try {
          const openRouter =
            await askOpenRouter(
              message,
              openRouterKey
            );

          if (
            openRouter.response.ok
          ) {
            const reply =
              openRouter.data
                ?.choices?.[0]
                ?.message
                ?.content
                ?.trim();

            if (reply) {
              return res.json({
                reply,
                provider:
                  "openrouter"
              });
            }
          }

          console.error(
            "OpenRouter API error:",
            openRouter.response.status,
            openRouter.data
          );

        } catch (error) {
          console.error(
            "OpenRouter request failed:",
            error
          );
        }
      }

      /* =========================
         NO AI AVAILABLE
      ========================= */

      return res.status(502).json({
        error:
          "All AI services are currently unavailable. Please try again."
      });

    } catch (error) {
      console.error(
        "Zed AI server error:",
        error
      );

      return res.status(500).json({
        error:
          "Zed AI could not complete the request. Please try again."
      });
    }
  }
);

/* =========================
   START SERVER
========================= */

app.listen(
  port,
  "0.0.0.0",
  () => {
    console.log(
      `Zed AI running on port ${port}`
    );
  }
);
