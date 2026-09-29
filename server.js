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

// ============================================================
// CONFIGURATION
// ============================================================

const geminiModel =
  process.env.GEMINI_MODEL || "gemini-3.8-flash";

const geminiApiKey =
  process.env.GEMINI_API_KEY || "";

const groqApiKey =
  process.env.GROQ_API_KEY || "";

const openRouterApiKey =
  process.env.OPENROUTER_API_KEY || "";

const cloudflareAccountId =
  process.env.CLOUDFLARE_ACCOUNT_ID || "";

const cloudflareApiToken =
  process.env.CLOUDFLARE_API_TOKEN || "";

const cloudflareImageModel =
  process.env.CLOUDFLARE_IMAGE_MODEL ||
  "@cf/black-forest-labs/flux-1-schnell";

// ============================================================
// APP SETTINGS
// ============================================================

app.use(
  express.json({
    limit: "25mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "25mb"
  })
);

app.use(
  express.static(
    path.join(__dirname)
  )
);

// ============================================================
// SIMPLE SERVER MEMORY
// ============================================================

const memory = new Map();

const MAX_MEMORY_MESSAGES = 20;

// ============================================================
// SYSTEM PROMPT
// ============================================================

const systemPrompt = `
You are Zed, a helpful AI assistant.

Your job is to answer the user's questions accurately, clearly,
and naturally.

IMPORTANT WEB SEARCH RULES:

If CURRENT WEB SEARCH RESULTS are provided in the conversation,
use them when answering the user's question.

Do NOT say that you cannot browse the internet if web search
results were provided.

Do NOT claim that you have no live internet search capability
when current search information has been supplied to you.

Use the supplied search results as your source of current
information.

If the search results do not contain enough information,
say clearly that the available search information is limited.

Never invent facts, football scores, dates, teams, players,
events, prices, news, or statistics.

For football questions, use the current football search results
provided by the system.

For general questions, answer normally.

Be helpful, concise, and conversational.

If the user asks for an explanation, explain things simply.

If the user asks for steps, give clear numbered steps.

If the user asks about something current and web results are
available, prioritize those current results over old knowledge.

Never pretend that you searched something if no search results
were provided.

You are called Zed.
`;

// ============================================================
// GEMINI
// ============================================================

async function askGemini(messages) {
  if (!geminiApiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured."
    );
  }

  const ai = new GoogleGenAI({
    apiKey: geminiApiKey
  });

  const contents = messages.map((message) => ({
    role:
      message.role === "assistant"
        ? "model"
        : "user",

    parts: [
      {
        text: String(
          message.text || ""
        )
      }
    ]
  }));

  const response =
    await ai.models.generateContent({
      model: geminiModel,

      contents,

      config: {
        systemInstruction:
          systemPrompt,

        temperature: 0.7,

        maxOutputTokens: 4096
      }
    });

  const text =
    response?.text ||
    response?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("") ||
    "";

  if (!text.trim()) {
    throw new Error(
      "Gemini returned an empty response."
    );
  }

  return text.trim();
}

// ============================================================
// GROQ FALLBACK
// ============================================================

async function askGroq(messages) {
  if (!groqApiKey) {
    throw new Error(
      "GROQ_API_KEY is not configured."
    );
  }

  const groqMessages = [
    {
      role: "system",
      content: systemPrompt
    },

    ...messages.map((message) => ({
      role:
        message.role === "assistant"
          ? "assistant"
          : "user",

      content: String(
        message.text || ""
      )
    }))
  ];

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${groqApiKey}`
      },

      body: JSON.stringify({
        model:
          process.env.GROQ_MODEL ||
          "llama-3.3-70b-versatile",

        messages: groqMessages,

        temperature: 0.7,

        max_tokens: 4096
      })
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Groq error ${response.status}: ${errorText}`
    );
  }

  const data =
    await response.json();

  const text =
    data?.choices?.[0]?.message?.content ||
    "";

  if (!text.trim()) {
    throw new Error(
      "Groq returned an empty response."
    );
  }

  return text.trim();
}

// ============================================================
// OPENROUTER FALLBACK
// ============================================================

async function askOpenRouter(messages) {
  if (!openRouterApiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured."
    );
  }

  const routerMessages = [
    {
      role: "system",
      content: systemPrompt
    },

    ...messages.map((message) => ({
      role:
        message.role === "assistant"
          ? "assistant"
          : "user",

      content: String(
        message.text || ""
      )
    }))
  ];

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${openRouterApiKey}`,

        "HTTP-Referer":
          "https://zed-ai-h7h4.onrender.com",

        "X-Title":
          "Zed"
      },

      body: JSON.stringify({
        model:
          process.env.OPENROUTER_MODEL ||
          "meta-llama/llama-3.3-70b-instruct:free",

        messages:
          routerMessages,

        temperature: 0.7,

        max_tokens: 4096
      })
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `OpenRouter error ${response.status}: ${errorText}`
    );
  }

  const data =
    await response.json();

  const text =
    data?.choices?.[0]?.message?.content ||
    "";

  if (!text.trim()) {
    throw new Error(
      "OpenRouter returned an empty response."
    );
  }

  return text.trim();
}

// ============================================================
// FILE HELPERS
// ============================================================

const allowedFileTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/csv"
];

const MAX_FILE_SIZE =
  15 * 1024 * 1024;

function validateFile(file) {
  if (!file) {
    return {
      ok: true
    };
  }

  if (
    !allowedFileTypes.includes(
      file.mimeType
    )
  ) {
    return {
      ok: false,
      error:
        "This file type is not supported."
    };
  }

  if (
    Number(file.size || 0) >
    MAX_FILE_SIZE
  ) {
    return {
      ok: false,
      error:
        "The file is too large. Maximum size is 15MB."
    };
  }

  return {
    ok: true
  };
}

// ============================================================
// FILE TO GEMINI CONTENT
// ============================================================

function buildFilePart(file) {
  if (
    !file ||
    !file.base64 ||
    !file.mimeType
  ) {
    return null;
  }

  return {
    inlineData: {
      mimeType:
        file.mimeType,

      data:
        file.base64
    }
  };
}

// ============================================================
// IMAGE GENERATION
// ============================================================

async function generateImage(prompt) {
  if (
    !cloudflareAccountId ||
    !cloudflareApiToken
  ) {
    throw new Error(
      "Cloudflare image generation is not configured."
    );
  }

  const url =
    `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/${cloudflareImageModel}`;

  const response =
    await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${cloudflareApiToken}`
      },

      body: JSON.stringify({
        prompt
      })
    });

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Image generation error ${response.status}: ${errorText}`
    );
  }

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    const data =
      await response.json();

    if (
      data?.result?.image
    ) {
      return {
        image:
          data.result.image
      };
    }

    if (
      data?.result?.image_url
    ) {
      return {
        imageUrl:
          data.result.image_url
      };
    }

    throw new Error(
      "Cloudflare did not return an image."
    );
  }

  const arrayBuffer =
    await response.arrayBuffer();

  const buffer =
    Buffer.from(arrayBuffer);

  return {
    image:
      buffer.toString(
        "base64"
      )
  };
}

// ============================================================
// HEALTH
// ============================================================

app.get(
  "/health",
  (req, res) => {
    res.json({
      ok: true,

      service: "zed",

      provider:
        "gemini-with-groq-and-openrouter-fallback",

      geminiModel,

      webSearch: true,

      imageGeneration:
        Boolean(
          cloudflareAccountId &&
          cloudflareApiToken
        ),

      fileAnalysis: true
    });
  }
);

// ============================================================
// GEMINI TEST
// ============================================================

app.get(
  "/api/gemini-test",
  async (req, res) => {
    try {
      const answer =
        await askGemini([
          {
            role: "user",
            text:
              "Reply with exactly: Zed Gemini test successful."
          }
        ]);

      res.json({
        ok: true,
        answer
      });
    } catch (error) {
      console.error(
        "Gemini test failed:",
        error
      );

      res.status(500).json({
        ok: false,
        error:
          error.message
      });
    }
  }
);

// ============================================================
// IMAGE API
// ============================================================

app.post(
  "/api/generate-image",
  async (req, res) => {
    try {
      const prompt =
        String(
          req.body?.prompt || ""
        ).trim();

      if (!prompt) {
        return res.status(400).json({
          ok: false,
          error:
            "Please provide an image prompt."
        });
      }

      console.log(
        "Image generation request:",
        prompt
      );

      const result =
        await generateImage(
          prompt
        );

      res.json({
        ok: true,
        ...result
      });
    } catch (error) {
      console.error(
        "Image generation failed:",
        error
      );

      res.status(500).json({
        ok: false,
        error:
          error.message ||
          "Image generation failed."
      });
    }
  }
);

// ============================================================
// CHAT API
// ============================================================

app.post(
  "/api/chat",
  async (req, res) => {
    try {
      const {
        message,
        userId,
        memories = [],
        conversation = [],
        file = null
      } = req.body || {};

      const userMessage =
        String(
          message || ""
        ).trim();

      if (!userMessage) {
        return res.status(400).json({
          ok: false,
          error:
            "Please enter a message."
        });
      }

      console.log(
        "================================="
      );

      console.log(
        "Zed message:",
        userMessage
      );

      console.log(
        "User:",
        userId || "anonymous"
      );

      // --------------------------------------------------------
      // FILE VALIDATION
      // --------------------------------------------------------

      const fileCheck =
        validateFile(file);

      if (!fileCheck.ok) {
        return res.status(400).json({
          ok: false,
          error:
            fileCheck.error
        });
      }

      // --------------------------------------------------------
      // MEMORY
      // --------------------------------------------------------

      const storedMemory =
        userId
          ? memory.get(userId) || []
          : [];

      const combinedMemory = [
        ...storedMemory,
        ...Array.isArray(memories)
          ? memories
          : []
      ];

      const uniqueMemory =
        [...new Set(
          combinedMemory
            .map(item =>
              String(item || "").trim()
            )
            .filter(Boolean)
        )].slice(-20);

      // --------------------------------------------------------
      // CONVERSATION
      // --------------------------------------------------------

      const cleanConversation =
        Array.isArray(conversation)
          ? conversation
              .filter(
                item =>
                  item &&
                  item.text
              )
              .slice(
                -MAX_MEMORY_MESSAGES
              )
          : [];

      // --------------------------------------------------------
      // WEB SEARCH
      // --------------------------------------------------------

      let searchContext = "";

      let searchWasUsed =
        false;

      if (
        shouldSearchWeb(
          userMessage
        )
      ) {
        console.log(
          "Web search required."
        );

        try {
          const search =
            await webSearch(
              userMessage
            );

          // IMPORTANT:
          // webSearch() returns a STRING.
          // Do not expect search.ok or search.results.

          if (
            typeof search ===
              "string" &&
            search.trim()
          ) {
            searchWasUsed =
              true;

            searchContext =
              `

CURRENT WEB SEARCH RESULTS:

${search.trim()}

END CURRENT WEB SEARCH RESULTS.

Use these current search results when answering the user's question.
Do not say that you cannot browse the internet when these results are available.
Do not invent information that is not supported by the results.
`;

            console.log(
              "Web search returned usable results."
            );
          } else {
            console.log(
              "Web search returned no usable results."
            );
          }
        } catch (searchError) {
          console.error(
            "Web search failed:",
            searchError.message
          );
        }
      } else {
        console.log(
          "Web search not required."
        );
      }

      // --------------------------------------------------------
      // BUILD USER MESSAGE
      // --------------------------------------------------------

      let enhancedMessage =
        userMessage;

      if (
        uniqueMemory.length > 0
      ) {
        enhancedMessage += `

USER MEMORY:

${uniqueMemory.join("\n")}
`;
      }

      if (searchContext) {
        enhancedMessage +=
          searchContext;
      }

      // --------------------------------------------------------
      // FILE INFORMATION
      // --------------------------------------------------------

      const filePart =
        buildFilePart(file);

      if (filePart) {
        enhancedMessage += `

The user attached a file.
Analyze the attached file carefully and answer the user's question about it.
`;
      }

      // --------------------------------------------------------
      // BUILD MODEL MESSAGES
      // --------------------------------------------------------

      const modelMessages = [
        ...cleanConversation,

        {
          role: "user",
          text:
            enhancedMessage
        }
      ];

      // --------------------------------------------------------
      // SAVE MEMORY
      // --------------------------------------------------------

      if (userId) {
        memory.set(
          userId,
          modelMessages
            .slice(
              -MAX_MEMORY_MESSAGES
            )
            .map(item => ({
              role:
                item.role,
              text:
                item.text
            }))
        );
      }

      // --------------------------------------------------------
      // GEMINI
      // --------------------------------------------------------

      let answer = "";
      let provider = "";

      try {
        console.log(
          "Trying Gemini..."
        );

        if (filePart) {
          if (!geminiApiKey) {
            throw new Error(
              "Gemini API key is not configured."
            );
          }

          const ai =
            new GoogleGenAI({
              apiKey:
                geminiApiKey
            });

          const contents =
            modelMessages.map(
              item => ({
                role:
                  item.role ===
                  "assistant"
                    ? "model"
                    : "user",

                parts: [
                  {
                    text:
                      String(
                        item.text ||
                          ""
                      )
                  }
                ]
              })
            );

          contents[
            contents.length - 1
          ].parts.push(
            filePart
          );

          const response =
            await ai.models.generateContent(
              {
                model:
                  geminiModel,

                contents,

                config: {
                  systemInstruction:
                    systemPrompt,

                  temperature:
                    0.7,

                  maxOutputTokens:
                    4096
                }
              }
            );

          answer =
            response?.text ||
            response?.candidates?.[0]
              ?.content?.parts
              ?.map(
                part =>
                  part.text || ""
              )
              .join("") ||
            "";

          if (!answer.trim()) {
            throw new Error(
              "Gemini returned an empty response."
            );
          }

          answer =
            answer.trim();

          provider =
            "gemini";
        } else {
          answer =
            await askGemini(
              modelMessages
            );

          provider =
            "gemini";
        }

        console.log(
          "Gemini response successful."
        );
      } catch (geminiError) {
        console.error(
          "Gemini failed:",
          geminiError.message
        );

        // ------------------------------------------------------
        // GROQ
        // ------------------------------------------------------

        try {
          console.log(
            "Trying Groq fallback..."
          );

          answer =
            await askGroq(
              modelMessages
            );

          provider =
            "groq";

          console.log(
            "Groq response successful."
          );
        } catch (groqError) {
          console.error(
            "Groq failed:",
            groqError.message
          );

          // ----------------------------------------------------
          // OPENROUTER
          // ----------------------------------------------------

          try {
            console.log(
              "Trying OpenRouter fallback..."
            );

            answer =
              await askOpenRouter(
                modelMessages
              );

            provider =
              "openrouter";

            console.log(
              "OpenRouter response successful."
            );
          } catch (openRouterError) {
            console.error(
              "OpenRouter failed:",
              openRouterError.message
            );

            return res.status(503).json({
              ok: false,

              error:
                "All AI services are currently unavailable.",

              details: {
                gemini:
                  geminiError.message,

                groq:
                  groqError.message,

                openrouter:
                  openRouterError.message
              }
            });
          }
        }
      }

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      console.log(
        "Zed response provider:",
        provider
      );

      console.log(
        "Web search used:",
        searchWasUsed
      );

      console.log(
        "================================="
      );

      return res.json({
        ok: true,

        answer,

        provider,

        webSearch:
          searchWasUsed
      });
    } catch (error) {
      console.error(
        "Chat API error:",
        error
      );

      return res.status(500).json({
        ok: false,

        error:
          error.message ||
          "Something went wrong while processing your message."
      });
    }
  }
);

// ============================================================
// FALLBACK ROUTE
// ============================================================

app.get(
  "*",
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    );
  }
);

// ============================================================
// START SERVER
// ============================================================

app.listen(
  port,
  () => {
    console.log(
      `Zed running on port ${port}`
    );

    console.log(
      `Gemini model: ${geminiModel}`
    );

    console.log(
      `Web search: enabled`
    );

    console.log(
      `Image generation: ${
        cloudflareAccountId &&
        cloudflareApiToken
          ? "enabled"
          : "not configured"
      }`
    );
  }
);
