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

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "zed-ai",
    provider: "gemini-with-groq-fallback",
    geminiModel
  });
});
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
   OPENROUTER BACKUP
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
              "Give clear, practical and accurate answers. " +
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
   GEMINI
========================= */

async function askGemini(messages, apiKey) {

  const memoryText =
  messages
    .filter(message => message.role === "memory")
    .map(message => message.text)
    .join("\n");
  
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`;

  const response = await fetch(endpoint, {
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
  "Here are memories saved about the user: " +
  memoryText
          }
        ]
      },
      contents: messages.map(message => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [
          {
            text: message.text
          }
        ]
      }))
    })
  });

  const data = await response.json();

  return {
    response,
    data
  };
}

/* =========================
   GROQ BACKUP
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
              "Give clear, practical and accurate answers. " +
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

async function generateGeminiImage(prompt, apiKey) {
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
   CHAT
========================= */
/* =========================
   IMAGE GENERATION API
========================= */

app.post("/api/generate-image", async (req, res) => {
  try {
    const prompt =
      typeof req.body?.prompt === "string"
        ? req.body.prompt.trim()
        : "";

    if (!prompt) {
      return res.status(400).json({
        error: "Please enter an image description."
      });
    }

    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      return res.status(500).json({
        error: "Gemini API key is not configured."
      });
    }

    const result = await generateGeminiImage(
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
      error: "Zed AI could not generate the image."
    });
  }
});
app.post("/api/chat", async (req, res) => {
  try {
    const message =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
        : "";
const conversation =
  Array.isArray(req.body?.conversation)
    ? req.body.conversation
    : [];
    const userId =
  typeof req.body?.userId === "string"
    ? req.body.userId.trim()
    : "";
    if (!message) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }


    /* -------------------------
       TRY GEMINI FIRST
    ------------------------- */

    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      try {
    const gemini = await askGemini(
  [
    ...conversation,
    {
      role: "user",
      text: message
    }
  ],
  geminiKey
);    

        if (gemini.response.ok) {
          const reply =
            gemini.data?.candidates?.[0]?.content?.parts
              ?.map(part => part.text || "")
              .join("")
              .trim();

          if (reply) {
            return res.json({
              reply,
              provider: "gemini"
            });
          }
        }

        console.log(
          "Gemini unavailable:",
          gemini.response.status,
          gemini.data?.error?.message
        );

      } catch (error) {
        console.error(
          "Gemini request failed:",
          error
        );
      }
    }


    /* -------------------------
       FALL BACK TO GROQ
    ------------------------- */

    const groqKey = process.env.GROQ_API_KEY;

    if (!groqKey) {
      return res.status(500).json({
        error:
          "Zed AI has no backup AI configured."
      });
    }

    console.log(
      "Using Groq backup because Gemini was unavailable."
    );

    const groq = await askGroq(
      message,
      groqKey
    );

    if (!groq.response.ok) {
      console.error(
        "Groq API error:",
        groq.response.status,
        groq.data
      );

      return res.status(502).json({
        error:
          "Both AI services are currently unavailable. Please try again."
      });
    }

    const reply =
      groq.data?.choices?.[0]?.message?.content
        ?.trim();

    if (!reply) {
      return res.status(502).json({
        error:
          "The backup AI returned no response."
      });
    }

    return res.json({
      reply,
      provider: "groq"
    });
/* -------------------------
       FALL BACK TO OPENROUTER
    ------------------------- */

    const openRouterKey = process.env.OPENROUTER_API_KEY;

    if (!openRouterKey) {
      return res.status(500).json({
        error:
          "Zed AI has no OpenRouter backup configured."
      });
    }

    console.log(
      "Using OpenRouter backup because Gemini and Groq were unavailable."
    );

    const openRouter = await askOpenRouter(
      message,
      openRouterKey
    );

    if (!openRouter.response.ok) {
      console.error(
        "OpenRouter API error:",
        openRouter.response.status,
        openRouter.data
      );

      return res.status(502).json({
        error:
          "All AI services are currently unavailable. Please try again."
      });
    }

    const openRouterReply =
      openRouter.data?.choices?.[0]?.message?.content
        ?.trim();

    if (!openRouterReply) {
      return res.status(502).json({
        error:
          "OpenRouter returned no response."
      });
    }

    return res.json({
      reply: openRouterReply,
      provider: "openrouter"
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
});


app.listen(port, "0.0.0.0", () => {
  console.log(
    `Zed AI running on port ${port}`
  );
});
