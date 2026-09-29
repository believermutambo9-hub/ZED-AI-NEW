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

// ======================================================
// SETTINGS
// ======================================================

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

// ======================================================
// EXPRESS
// ======================================================

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

app.use(express.static(__dirname));

// ======================================================
// ZED SYSTEM PROMPT
// ======================================================

const systemPrompt = `
You are Zed, a helpful AI assistant.

Answer the user naturally, accurately and clearly.

CURRENT INFORMATION:
When CURRENT WEB SEARCH RESULTS are supplied in the user's
message, use those results as the source of current information.

Never say that you cannot browse the internet when current
web search results have been supplied.

Never invent current information.

For football questions, use the football results supplied by
the web search.

Do not invent football scores, teams, dates, fixtures,
standings or results.

If the supplied search information is incomplete, say so.

For normal questions, answer normally.

Keep answers useful and easy to understand.
`;

// ======================================================
// GEMINI
// ======================================================

async function askGemini(messages) {
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const ai = new GoogleGenAI({
    apiKey: geminiApiKey
  });

  const contents = messages.map((item) => ({
    role:
      item.role === "assistant"
        ? "model"
        : "user",

    parts: [
      {
        text: String(item.text || "")
      }
    ]
  }));

  const response =
    await ai.models.generateContent({
      model: geminiModel,

      contents,

      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 4096
      }
    });

  const answer =
    response?.text ||
    response?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("") ||
    "";

  if (!answer.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  return answer.trim();
}

// ======================================================
// GROQ
// ======================================================

async function askGroq(messages) {
  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY is missing.");
  }

  const groqMessages = [
    {
      role: "system",
      content: systemPrompt
    },

    ...messages.map((item) => ({
      role:
        item.role === "assistant"
          ? "assistant"
          : "user",

      content: String(item.text || "")
    }))
  ];

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`
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
    const error = await response.text();

    throw new Error(
      `Groq ${response.status}: ${error}`
    );
  }

  const data = await response.json();

  const answer =
    data?.choices?.[0]?.message?.content || "";

  if (!answer.trim()) {
    throw new Error("Groq returned an empty response.");
  }

  return answer.trim();
}

// ======================================================
// OPENROUTER
// ======================================================

async function askOpenRouter(messages) {
  if (!openRouterApiKey) {
    throw new Error("OPENROUTER_API_KEY is missing.");
  }

  const routerMessages = [
    {
      role: "system",
      content: systemPrompt
    },

    ...messages.map((item) => ({
      role:
        item.role === "assistant"
          ? "assistant"
          : "user",

      content: String(item.text || "")
    }))
  ];

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        Authorization:
          `Bearer ${openRouterApiKey}`,

        "HTTP-Referer":
          "https://zed-ai-h7h4.onrender.com",

        "X-Title": "Zed"
      },

      body: JSON.stringify({
        model:
          process.env.OPENROUTER_MODEL ||
          "meta-llama/llama-3.3-70b-instruct:free",

        messages: routerMessages,

        temperature: 0.7,

        max_tokens: 4096
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `OpenRouter ${response.status}: ${error}`
    );
  }

  const data = await response.json();

  const answer =
    data?.choices?.[0]?.message?.content || "";

  if (!answer.trim()) {
    throw new Error(
      "OpenRouter returned an empty response."
    );
  }

  return answer.trim();
}

// ======================================================
// IMAGE GENERATION
// ======================================================

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

  const response = await fetch(url, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",

      Authorization:
        `Bearer ${cloudflareApiToken}`
    },

    body: JSON.stringify({
      prompt
    })
  });

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Cloudflare image error ${response.status}: ${error}`
    );
  }

  const contentType =
    response.headers.get("content-type") || "";

  if (
    contentType.includes("application/json")
  ) {
    const data = await response.json();

    if (data?.result?.image) {
      return {
        image: data.result.image
      };
    }

    if (data?.result?.image_url) {
      return {
        imageUrl: data.result.image_url
      };
    }

    throw new Error(
      "Cloudflare did not return an image."
    );
  }

  const buffer = Buffer.from(
    await response.arrayBuffer()
  );

  return {
    image: buffer.toString("base64")
  };
}

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "zed",
    provider:
      "gemini-with-groq-and-openrouter-fallback",
    geminiModel,
    webSearch: true,
    fileAnalysis: true,
    imageGeneration:
      Boolean(
        cloudflareAccountId &&
        cloudflareApiToken
      )
  });
});

// ======================================================
// GEMINI TEST
// ======================================================

app.get("/api/gemini-test", async (req, res) => {
  try {
    const answer = await askGemini([
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
      error: error.message
    });
  }
});

// ======================================================
// IMAGE API
// ======================================================

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
        "Image generation:",
        prompt
      );

      const result =
        await generateImage(prompt);

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
        error: error.message
      });
    }
  }
);

// ======================================================
// CHAT API
// ======================================================

app.post(
  "/api/chat",
  async (req, res) => {
    try {
      const {
        message,
        conversation = [],
        memories = [],
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

      // ====================================================
      // CONVERSATION
      // ====================================================

      const cleanConversation =
        Array.isArray(conversation)
          ? conversation
              .filter(
                (item) =>
                  item &&
                  item.text
              )
              .slice(-20)
          : [];

      // ====================================================
      // WEB SEARCH
      // ====================================================

      let searchContext = "";
      let searchUsed = false;

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

          /*
           IMPORTANT:

           web-search.js returns a STRING.

           It does NOT return:
           {
             ok: true,
             results: [...]
           }

           Therefore we check for a string here.
          */

          if (
            typeof search === "string" &&
            search.trim().length > 0
          ) {
            searchUsed = true;

            searchContext = `

CURRENT WEB SEARCH RESULTS:

${search.trim()}

END CURRENT WEB SEARCH RESULTS.

Use the current web search results above when answering.
Do not say that you cannot browse the internet.
Do not invent information that is not supported by these results.
`;

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
            error.message
          );
        }
      } else {
        console.log(
          "Web search not required."
        );
      }

      // ====================================================
      // MEMORIES
      // ====================================================

      let memoryText = "";

      if (
        Array.isArray(memories) &&
        memories.length > 0
      ) {
        const cleanMemories =
          memories
            .map(
              (item) =>
                String(item || "").trim()
            )
            .filter(Boolean)
            .slice(-20);

        if (
          cleanMemories.length > 0
        ) {
          memoryText = `

USER MEMORY:

${cleanMemories.join("\n")}
`;
        }
      }

      // ====================================================
      // FINAL USER MESSAGE
      // ====================================================

      let finalMessage =
        userMessage;

      if (memoryText) {
        finalMessage += memoryText;
      }

      if (searchContext) {
        finalMessage += searchContext;
      }

      if (file) {
        finalMessage += `

The user attached a file.
Analyze the attached file when answering the question.
`;
      }

      // ====================================================
      // MODEL MESSAGES
      // ====================================================

      const modelMessages = [
        ...cleanConversation,

        {
          role: "user",
          text: finalMessage
        }
      ];

      // ====================================================
      // GEMINI
      // ====================================================

      let answer = "";
      let provider = "";

      try {
        console.log(
          "Trying Gemini..."
        );

        answer =
          await askGemini(
            modelMessages
          );

        provider = "gemini";

        console.log(
          "Gemini successful."
        );
      } catch (geminiError) {
        console.error(
          "Gemini failed:",
          geminiError.message
        );

        // ==================================================
        // GROQ
        // ==================================================

        try {
          console.log(
            "Trying Groq..."
          );

          answer =
            await askGroq(
              modelMessages
            );

          provider = "groq";

          console.log(
            "Groq successful."
          );
        } catch (groqError) {
          console.error(
            "Groq failed:",
            groqError.message
          );

          // ================================================
          // OPENROUTER
          // ================================================

          try {
            console.log(
              "Trying OpenRouter..."
            );

            answer =
              await askOpenRouter(
                modelMessages
              );

            provider =
              "openrouter";

            console.log(
              "OpenRouter successful."
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

      // ====================================================
      // RESPONSE
      // ====================================================

      console.log(
        "Provider:",
        provider
      );

      console.log(
        "Web search used:",
        searchUsed
      );

      console.log(
        "================================="
      );

      return res.json({
        ok: true,
        answer,
        provider,
        webSearch: searchUsed
      });

    } catch (error) {
      console.error(
        "CHAT ERROR:",
        error
      );

      return res.status(500).json({
        ok: false,
        error:
          error.message ||
          "Something went wrong."
      });
    }
  }
);

// ======================================================
// SERVE INDEX.HTML
// ======================================================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );
});

// ======================================================
// START
// ======================================================

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
      "Web search: enabled"
    );

    console.log(
      "Zed is ready."
    );
  }
);
