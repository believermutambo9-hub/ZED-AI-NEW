import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

import {
  webSearch,
  shouldSearchWeb
} from "./web-search.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 10000;

const geminiModel =
  process.env.GEMINI_MODEL || "gemini-3.8-flash";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

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

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


/* =========================
   HEALTH CHECK
========================= */

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "zed-ai",
    provider: "gemini-with-groq-and-openrouter-fallback",
    geminiModel,
    fileAnalysis: true,
    webSearch: true,
    imageGeneration: "cloudflare-flux-1-schnell"
  });
});


/* =========================
   SYSTEM PROMPT
========================= */

function systemPrompt(memoryText = "") {
  return (
    "You are Zed, a helpful, friendly and intelligent AI assistant. " +
    "Always explain things using simple, clear and easy-to-understand English. " +
    "Avoid unnecessarily difficult words or technical language unless requested. " +
    "You are a global assistant and should be able to answer questions about " +
    "countries, people, businesses, technology, entertainment, sports, football, " +
    "news and other topics around the world. " +
    "When relevant, understand that the user may be in Zambia and use " +
    "Zambian context, currency (ZMW/Kwacha), and everyday examples. " +
    "You may communicate in a Zambian local language when appropriate, " +
    "but never guess the user's local language. " +
    "When current web information is provided in the user's message, " +
    "use that information to answer current questions. " +
    "Do not say that your knowledge stops at 2024 when current web information " +
    "has been provided. " +
    "Do not claim that you searched the web unless web search information " +
    "is actually included in the conversation. " +
    "When responding, summarize your answers when useful. " +
    "Do not claim to be human. " +
    "When a user uploads an image or PDF, inspect the uploaded content " +
    "carefully and answer based on the actual file. " +
    "Do not pretend you analyzed a file if you could not process it.\n\n" +
    "Saved memories:\n" +
    (memoryText || "No saved memories yet.")
  );
}


/* =========================
   GEMINI
========================= */

async function askGemini(
  conversation,
  memories,
  apiKey,
  file = null
) {
  const memoryText = memories
    .filter(item => typeof item === "string")
    .map(item => item.trim())
    .filter(Boolean)
    .join("\n");

  const contents = conversation.map(message => ({
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

  if (file) {
    const base64Data =
      file.data
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
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`;

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
   GROQ FALLBACK
========================= */

async function askGroq(
  conversation,
  memories,
  apiKey
) {
  const memoryText =
    memories
      .filter(item => typeof item === "string")
      .map(item => item.trim())
      .filter(Boolean)
      .join("\n");

  const groqMessages = [
    {
      role: "system",
      content: systemPrompt(memoryText)
    }
  ];

  for (const message of conversation) {
    if (
      message.role !== "user" &&
      message.role !== "assistant"
    ) {
      continue;
    }

    groqMessages.push({
      role:
        message.role === "assistant"
          ? "assistant"
          : "user",

      content: String(message.text || "")
    });
  }

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
        messages: groqMessages
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
   OPENROUTER FALLBACK
========================= */

async function askOpenRouter(
  conversation,
  memories,
  apiKey
) {
  const memoryText =
    memories
      .filter(item => typeof item === "string")
      .map(item => item.trim())
      .filter(Boolean)
      .join("\n");

  const routerMessages = [
    {
      role: "system",
      content: systemPrompt(memoryText)
    }
  ];

  for (const message of conversation) {
    if (
      message.role !== "user" &&
      message.role !== "assistant"
    ) {
      continue;
    }

    routerMessages.push({
      role:
        message.role === "assistant"
          ? "assistant"
          : "user",

      content: String(message.text || "")
    });
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,

        "HTTP-Referer":
          "https://zed-ai-h7h4.onrender.com",

        "X-Title": "Zed"
      },

      body: JSON.stringify({
        model: "openrouter/free",
        messages: routerMessages
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
   CLOUDFLARE IMAGE GENERATION
========================= */

async function generateCloudflareImage(prompt) {
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID;

  const apiToken =
    process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId) {
    throw new Error(
      "Cloudflare Account ID is not configured."
    );
  }

  if (!apiToken) {
    throw new Error(
      "Cloudflare API token is not configured."
    );
  }

  const model =
    "@cf/black-forest-labs/flux-1-schnell";

  const endpoint =
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const response = await fetch(
    endpoint,
    {
      method: "POST",

      headers: {
        "Authorization":
          `Bearer ${apiToken}`,

        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        prompt,
        steps: 4
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
   FILE VALIDATION
========================= */

function validateFile(file) {
  if (
    !file ||
    typeof file !== "object"
  ) {
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
        "Zed currently supports JPG, PNG, WEBP, GIF images and PDF files."
    };
  }

  if (!data) {
    return {
      valid: false,
      error:
        "The uploaded file is empty."
    };
  }

  const base64Data =
    data
      .replace(/^data:[^;]+;base64,/, "")
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
   IMAGE API
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

      const result =
        await generateCloudflareImage(
          prompt
        );

      if (!result.response.ok) {
        console.error(
          "Cloudflare image API error:",
          result.response.status,
          result.data
        );

        const cloudflareError =
          result.data?.errors?.[0]?.message ||
          result.data?.error?.message ||
          "Cloudflare image generation failed.";

        return res.status(502).json({
          error: cloudflareError
        });
      }

      let base64Image =
        result.data?.result?.image;

      if (
        typeof base64Image !== "string" &&
        typeof result.data?.result === "string"
      ) {
        base64Image =
          result.data.result;
      }

      if (
        typeof base64Image !== "string" ||
        !base64Image
      ) {
        console.error(
          "Cloudflare returned no image:",
          result.data
        );

        return res.status(502).json({
          error:
            "Cloudflare did not return an image."
        });
      }

      const imageData =
        base64Image.startsWith("data:")
          ? base64Image
          : `data:image/jpeg;base64,${base64Image}`;

      return res.json({
        ok: true,
        image: imageData,
        provider:
          "cloudflare-flux-1-schnell"
      });

    } catch (error) {
      console.error(
        "Cloudflare image generation error:",
        error
      );

      return res.status(500).json({
        error:
          error.message ||
          "Zed could not generate the image."
      });
    }
  }
);


/* =========================
   GEMINI TEST
========================= */

app.post(
  "/api/gemini-test",
  async (req, res) => {
    try {
      const prompt =
        typeof req.body?.message === "string"
          ? req.body.message.trim()
          : "";

      if (!prompt) {
        return res.status(400).json({
          error:
            "Please enter a message."
        });
      }

      const result =
        await ai.interactions.create({
          model: geminiModel,
          input: prompt
        });

      return res.json({
        ok: true,

        interactionId:
          result.id,

        text:
          result.outputs
            ?.filter(
              output =>
                output.type === "text"
            )
            ?.map(
              output =>
                output.text
            )
            ?.join("") ||
          ""
      });

    } catch (error) {
      console.error(
        "Gemini Interactions test error:",
        error
      );

      return res.status(500).json({
        error:
          error.message ||
          "Gemini Interactions request failed."
      });
    }
  }
);


/* =========================
   MAIN CHAT
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
        Array.isArray(req.body?.conversation)
          ? req.body.conversation
          : [];

      const clientMemories =
        Array.isArray(req.body?.memories)
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

      let uploadedFile = null;


      /* =========================
         FILE
      ========================= */

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


      /* =========================
         MESSAGE CHECK
      ========================= */

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
         WEB SEARCH
      ========================= */

      let searchContext = "";

      if (
        message &&
        !uploadedFile &&
        shouldSearchWeb(message)
      ) {
        try {
          console.log(
            "Zed web search:",
            message
          );

          /*
             IMPORTANT:

             webSearch() now returns a STRING
             containing the formatted search
             results.

             The previous code expected:

             search.ok
             search.results

             That was the problem.
          */

          const search =
            await webSearch(
              message
            );

          if (
            typeof search === "string" &&
            search.trim()
          ) {
            searchContext =
              "\n\nCURRENT WEB SEARCH RESULTS:\n\n" +
              search.trim();

            console.log(
              "Web search returned usable results."
            );

          } else {
            console.log(
              "Web search returned no usable results."
            );
          }

        } catch (error) {
          console.error(
            "Web search failed:",
            error
          );
        }
      }


      /* =========================
         BUILD CONVERSATION
      ========================= */

      const userText =
        message ||
        "Please analyze the uploaded file and tell me what you find.";

      const finalUserText =
        searchContext
          ? (
              userText +
              searchContext +
              "\n\nIMPORTANT INSTRUCTIONS: " +
              "Answer the user's original question using the current " +
              "web search information above when relevant. " +
              "Do not say that you cannot access current information. " +
              "If the search results are insufficient, clearly say that " +
              "the available search results were insufficient. " +
              "Do not invent football scores, dates, teams, or results."
            )
          : userText;

      const fullConversation = [
        ...conversation,

        {
          role: "user",
          text: finalUserText
        }
      ];


      /* =========================
         GEMINI
      ========================= */

      const geminiKey =
        process.env.GEMINI_API_KEY;

      if (geminiKey) {
        try {
          const gemini =
            await askGemini(
              fullConversation,
              clientMemories,
              geminiKey,
              uploadedFile
            );

          if (gemini.response.ok) {
            const reply =
              gemini.data
                ?.candidates?.[0]
                ?.content?.parts
                ?.map(
                  part =>
                    part.text || ""
                )
                ?.join("")
                ?.trim();

            if (reply) {
              return res.json({
                reply,

                provider:
                  "gemini",

                webSearched:
                  Boolean(
                    searchContext
                  ),

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
            gemini.data?.error?.message
          );

          if (uploadedFile) {
            return res.status(502).json({
              error:
                gemini.data?.error?.message ||
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
                "Zed could not analyze the uploaded file."
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
         GROQ BACKUP
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
              fullConversation,
              clientMemories,
              groqKey
            );

          if (groq.response.ok) {
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
                  "groq",

                webSearched:
                  Boolean(
                    searchContext
                  )
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
         OPENROUTER BACKUP
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
              fullConversation,
              clientMemories,
              openRouterKey
            );

          if (openRouter.response.ok) {
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
                  "openrouter",

                webSearched:
                  Boolean(
                    searchContext
                  )
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
         EVERYTHING FAILED
      ========================= */

      return res.status(502).json({
        error:
          "All AI services are currently unavailable. Please try again."
      });

    } catch (error) {
      console.error(
        "Zed server error:",
        error
      );

      return res.status(500).json({
        error:
          "Zed could not complete the request. Please try again."
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
      `Zed running on port ${port}`
    );
  }
);
