import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
const memory = new Map();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 10000;

const geminiModel =
  process.env.GEMINI_MODEL || "gemini-3.8-flash";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

app.use(express.json({ limit: "20mb" }));
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
    geminiModel,
    fileAnalysis: true
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

  const memories = memory.get(userId) || [];

  if (!memories.includes(text)) {
    memories.push(text);
  }

  memory.set(userId, memories);

  return res.json({
    ok: true,
    memories
  });
});

/* =========================
   GEMINI SYSTEM PROMPT
========================= */

function systemPrompt(memoryText) {
  return (
    "You are Zed AI, a helpful, friendly and intelligent AI assistant. " +
    "Always explain things using simple, clear and easy-to-understand English. " +
    "Avoid unnecessarily difficult words or technical language unless requested. " +
    "When relevant, understand that the user may be in Zambia and use " +
    "Zambian context, currency (ZMW/Kwacha), and everyday examples. " +
    "You may communicate in a Zambian local language when appropriate, " +
    "but never guess the user's local language. " +
    "when responding make sure you summerize your answers. " +
    "Do not claim to be human. " +
    "When a user uploads an image or PDF, inspect the uploaded content " +
    "carefully and answer based on the actual file. " +
    "Do not pretend you analyzed a file if you could not process it.\n" +
    "Saved memories:\n" +
    (memoryText || "No saved memories yet.")
  );
}

/* =========================
   GEMINI CHAT + FILE ANALYSIS
========================= */

async function askGemini(
  messages,
  apiKey,
  file = null
) {
  const memoryText = messages
    .filter(message => message.role === "memory")
    .map(message => message.text)
    .join("\n");

  const normalMessages = messages.filter(
    message => message.role !== "memory"
  );

  const contents = normalMessages.map(message => ({
    role:
      message.role === "assistant"
        ? "model"
        : "user",

    parts: [
      {
        text: String(message.text || "")
      }
    ]
  }));

  /* =========================
     ATTACH FILE
  ========================= */

  if (file) {
    const base64Data = file.data
      .replace(/^data:[^;]+;base64,/, "")
      .replace(/\s/g, "");

    const lastUserMessage =
      [...contents]
        .reverse()
        .find(item => item.role === "user");

    if (!lastUserMessage) {
      throw new Error(
        "Could not attach the uploaded file to the user message."
      );
    }

    lastUserMessage.parts.push({
      inline_data: {
        mime_type: file.mimeType,
        data: base64Data
      }
    });
  }

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
              text: systemPrompt(memoryText)
            }
          ]
        },

        contents
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

async function askGroq(
  message,
  apiKey
) {
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
              "Use simple English unless technical detail is requested. " +
              "When relevant, use Zambian context, ZMW/Kwacha, and everyday examples. " +
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

  return {
    response,
    data: await response.json()
  };
}

/* =========================
   OPENROUTER
========================= */

async function askOpenRouter(
  message,
  apiKey
) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer":
          "https://zed-ai-h7h4.onrender.com",
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
              "Use simple English unless technical detail is requested. " +
              "When relevant, use Zambian context, ZMW/Kwacha, and everyday examples. " +
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

  return {
    response,
    data: await response.json()
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

  return {
    response,
    data: await response.json()
  };
}

/* =========================
   FILE VALIDATION
========================= */

function validateFile(file) {
  if (!file || typeof file !== "object") {
    return {
      valid: false,
      error:
        "Uploaded file information is missing."
    };
  }

  const name =
    typeof file.name === "string"
      ? file.name.trim()
      : "";

  const mimeType =
    typeof file.mimeType === "string"
      ? file.mimeType.trim().toLowerCase()
      : "";

  const data =
    typeof file.data === "string"
      ? file.data.trim()
      : "";

  if (!name) {
    return {
      valid: false,
      error:
        "The uploaded file has no name."
    };
  }

  if (
    !ALLOWED_FILE_TYPES.has(
      mimeType
    )
  ) {
    return {
      valid: false,
      error:
        "Zed AI currently supports JPG, PNG, WEBP, GIF images and PDF files."
    };
  }

  if (!data) {
    return {
      valid: false,
      error:
        "The uploaded file is empty."
    };
  }

  const base64Data = data
    .replace(
      /^data:[^;]+;base64,/,
      ""
    )
    .replace(/\s/g, "");

  const estimatedSize =
    Math.floor(
      (base64Data.length * 3) / 4
    );

  if (
    estimatedSize >
    MAX_FILE_SIZE
  ) {
    return {
      valid: false,
      error:
        "The uploaded file is too large. Maximum size is 15 MB."
    };
  }

  return {
    valid: true,

    file: {
      name,
      mimeType,
      data: base64Data
    }
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

      /* =========================
         FILE
      ========================= */

      let uploadedFile = null;

      if (req.body?.file) {
        const validation =
          validateFile(
            req.body.file
          );

        if (!validation.valid) {
          return res.status(400).json({
            error:
              validation.error
          });
        }

        uploadedFile =
          validation.file;

        console.log(
          "File received:",
          uploadedFile.name,
          uploadedFile.mimeType
        );
      }

      if (
        !message &&
        !uploadedFile
      ) {
        return res.status(400).json({
          error:
            "Please enter a message or upload a file."
        });
      }

      /* =========================
         REMEMBER
      ========================= */

      if (
        userId &&
        message &&
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
          }

          memory.set(
            userId,
            existing
          );
        }
      }

      /* =========================
         GEMINI
      ========================= */

      const geminiKey =
        process.env.GEMINI_API_KEY;

      if (geminiKey) {
        try {
          const gemini =
            await askGemini(
              [
                ...clientMemories.map(
                  text => ({
                    role: "memory",
                    text
                  })
                ),

                ...conversation,

                {
                  role: "user",
                  text:
                    message ||
                    "Please analyze the uploaded file and tell me what you find."
                }
              ],

              geminiKey,

              uploadedFile
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
                  "gemini",
                fileAnalyzed:
                  Boolean(
                    uploadedFile
                  )
              });
            }
          }

          console.error(
            "Gemini unavailable:",
            gemini.response.status,
            gemini.data
              ?.error?.message
          );

          /*
           * Do not fall back to a
           * text-only AI when a file
           * was uploaded.
           */

          if (uploadedFile) {
            return res.status(502).json({
              error:
                gemini.data?.error
                  ?.message ||
                "Gemini could not analyze the uploaded file. Please try again."
            });
          }

        } catch (error) {
          console.error(
            "Gemini request failed:",
            error
          );

          if (uploadedFile) {
            return res.status(502).json({
              error:
                error.message ||
                "Zed AI could not analyze the uploaded file."
            });
          }
        }

      } else if (uploadedFile) {
        return res.status(500).json({
          error:
            "Gemini API key is not configured. File analysis requires Gemini."
        });
      }

      /* =========================
         GROQ FALLBACK
      ========================= */

      const groqKey =
        process.env.GROQ_API_KEY;

      if (groqKey) {
        try {
          console.log(
            "Using Groq backup."
          );

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
         OPENROUTER FALLBACK
      ========================= */

      const openRouterKey =
        process.env.OPENROUTER_API_KEY;

      if (openRouterKey) {
        try {
          console.log(
            "Using OpenRouter backup."
          );

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
