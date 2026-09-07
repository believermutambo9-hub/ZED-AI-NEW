import express from "express";
import path from "path";
import { fileURLToPath } from "url";

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


/* =========================
   GEMINI
========================= */

async function askGemini(message, apiKey) {
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
              "Give clear, practical and accurate answers. " +
              "When relevant, understand that the user may be in Zambia and use " +
              "Zambian context, currency (ZMW/Kwacha), and everyday examples. " +
              "Do not claim to be human."
          }
        ]
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: message
            }
          ]
        }
      ]
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
        model: "llama-3.3-70b-versatile",
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
   CHAT
========================= */

app.post("/api/chat", async (req, res) => {
  try {
    const message =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
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
          message,
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
