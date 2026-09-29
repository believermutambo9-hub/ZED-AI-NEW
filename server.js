import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

import {
  webSearch,
  shouldSearchWeb
} from "./web-search.js";

import {
  footballFeature,
  footballTeamFeature,
  footballLeagueFeature,
  detectFootballTeam,
  detectFootballLeague,
  getFootballRequestType
} from "./features/football.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 10000;

const geminiModel =
  process.env.GEMINI_MODEL || "gemini-3.8-flash";

const memory = new Map();

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


// ============================================================
// FOOTBALL DETECTION
// ============================================================

function shouldUseFootball(message = "") {
  const text = String(message).toLowerCase().trim();

  if (!text) return false;

  const footballWords = [
    "football",
    "soccer",
    "match",
    "matches",
    "fixture",
    "fixtures",
    "score",
    "scores",
    "result",
    "results",
    "standings",
    "table",
    "league",
    "premier league",
    "champions league",
    "europa league",
    "conference league",
    "women's champions league",
    "women champions league",
    "fa cup",
    "carabao cup",
    "afcon",
    "world cup",
    "qualifier",
    "qualifiers",
    "kick off",
    "kickoff",
    "starting lineup",
    "lineup",

    "arsenal",
    "chelsea",
    "liverpool",
    "manchester united",
    "man united",
    "man utd",
    "manchester city",
    "man city",
    "tottenham",
    "newcastle",
    "aston villa",

    "barcelona",
    "real madrid",
    "atletico madrid",
    "bayern",
    "borussia dortmund",
    "juventus",
    "inter milan",
    "inter",
    "ac milan",
    "napoli",
    "psg",
    "paris saint-germain",
    "lyon",
    "marseille",
    "monaco",

    "ajax",
    "psv",
    "benfica",
    "porto",

    "al hilal",
    "al nassr",

    "mamelodi sundowns",
    "kaizer chiefs",
    "al ahly",
    "zamalek",
    "young africans",
    "tp mazembe",

    "zambia",
    "malawi",
    "nigeria",
    "ghana",
    "south africa",
    "egypt",
    "morocco",

    "brazil",
    "argentina",
    "france",
    "germany",
    "spain",
    "italy",
    "england",
    "portugal",
    "netherlands"
  ];

  return footballWords.some((word) =>
    text.includes(word)
  );
}


// ============================================================
// SYSTEM PROMPT
// ============================================================

const systemPrompt = `
You are Zed AI, a helpful general-purpose AI assistant.

Give clear, useful and natural answers.

CURRENT INFORMATION RULES:
- When current information is supplied by web search, use it.
- Do not invent current information.
- Do not invent dates, prices, scores, fixtures, standings, news or events.
- If current information cannot be verified, clearly say so.

FOOTBALL RULES:
- Football information supplied by the football feature is authoritative for the current request.
- Never invent football scores, fixtures, results, standings, dates or match status.
- A score of 0-0 does NOT automatically mean a match is live.
- Use the supplied match state/status to determine whether a match is scheduled, live or completed.
- Football times supplied to you are displayed in Zambia time (Africa/Lusaka).
- The user can ask about football anywhere in the world, not only Zambia.

Answer the user's question directly.
`;


// ============================================================
// GEMINI
// ============================================================

async function askGemini(messages) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured"
    );
  }

  const ai = new GoogleGenAI({
    apiKey
  });

  const contents = messages.map((message) => ({
    role:
      message.role === "assistant"
        ? "model"
        : "user",
    parts: [
      {
        text: String(
          message.content || ""
        )
      }
    ]
  }));

  const response =
    await ai.models.generateContent({
      model: geminiModel,
      systemInstruction: systemPrompt,
      contents
    });

  return (
    response?.text ||
    response?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("") ||
    ""
  ).trim();
}


// ============================================================
// GROQ FALLBACK
// ============================================================

async function askGroq(messages) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not configured"
    );
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model:
          process.env.GROQ_MODEL ||
          "llama-3.3-70b-versatile",

        messages: [
          {
            role: "system",
            content: systemPrompt
          },

          ...messages.map((message) => ({
            role: message.role,
            content: String(
              message.content || ""
            )
          }))
        ],

        temperature: 0.7
      })
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Groq ${response.status}: ${errorText}`
    );
  }

  const data =
    await response.json();

  return (
    data?.choices?.[0]?.message
      ?.content || ""
  ).trim();
}


// ============================================================
// OPENROUTER FALLBACK
// ============================================================

async function askOpenRouter(messages) {
  const apiKey =
    process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured"
    );
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer":
          "https://zed-ai-h7h4.onrender.com",
        "X-Title": "Zed AI"
      },

      body: JSON.stringify({
        model:
          process.env.OPENROUTER_MODEL ||
          "openai/gpt-oss-20b:free",

        messages: [
          {
            role: "system",
            content: systemPrompt
          },

          ...messages.map((message) => ({
            role: message.role,
            content: String(
              message.content || ""
            )
          }))
        ],

        temperature: 0.7
      })
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `OpenRouter ${response.status}: ${errorText}`
    );
  }

  const data =
    await response.json();

  return (
    data?.choices?.[0]?.message
      ?.content || ""
  ).trim();
}


// ============================================================
// AI FALLBACK CHAIN
// ============================================================

async function askAI(messages) {
  const errors = [];

  try {
    const answer =
      await askGemini(messages);

    if (answer) {
      return {
        answer,
        provider: "gemini"
      };
    }
  } catch (error) {
    console.error(
      "Gemini failed:",
      error.message
    );

    errors.push(
      `Gemini: ${error.message}`
    );
  }

  try {
    const answer =
      await askGroq(messages);

    if (answer) {
      return {
        answer,
        provider: "groq"
      };
    }
  } catch (error) {
    console.error(
      "Groq failed:",
      error.message
    );

    errors.push(
      `Groq: ${error.message}`
    );
  }

  try {
    const answer =
      await askOpenRouter(messages);

    if (answer) {
      return {
        answer,
        provider: "openrouter"
      };
    }
  } catch (error) {
    console.error(
      "OpenRouter failed:",
      error.message
    );

    errors.push(
      `OpenRouter: ${error.message}`
    );
  }

  throw new Error(
    `Both AI services are currently unavailable. ${errors.join(
      " | "
    )}`
  );
}


// ============================================================
// IMAGE GENERATION
// ============================================================

async function generateImage(prompt) {
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID;

  const token =
    process.env.CLOUDFLARE_API_TOKEN;

  const model =
    process.env.CLOUDFLARE_IMAGE_MODEL ||
    "@cf/black-forest-labs/flux-1-schnell";

  if (!accountId || !token) {
    throw new Error(
      "Cloudflare image generation is not configured"
    );
  }

  const url =
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const response = await fetch(url, {
    method: "POST",

    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      prompt
    })
  });

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Cloudflare ${response.status}: ${errorText}`
    );
  }

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  if (
    contentType.includes("image/")
  ) {
    const buffer =
      Buffer.from(
        await response.arrayBuffer()
      );

    return {
      mimeType: contentType,
      data: buffer.toString(
        "base64"
      )
    };
  }

  const data =
    await response.json();

  if (data?.result?.image) {
    return {
      mimeType: "image/png",
      data: data.result.image
    };
  }

  if (data?.result?.image_url) {
    return {
      imageUrl:
        data.result.image_url
    };
  }

  throw new Error(
    "Cloudflare did not return an image"
  );
}


// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
  "/health",
  (req, res) => {
    res.json({
      ok: true,
      service: "zed-ai",

      provider:
        "gemini-with-groq-and-openrouter-fallback",

      geminiModel,

      fileAnalysis: true,

      football: true,

      footballScope:
        "worldwide",

      footballRouting:
        "team-league-worldwide",

      webSearch: true,

      imageGeneration:
        Boolean(
          process.env
            .CLOUDFLARE_ACCOUNT_ID &&
          process.env
            .CLOUDFLARE_API_TOKEN
        )
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
      const result =
        await askGemini([
          {
            role: "user",
            content:
              "Reply with exactly: Zed AI Gemini test successful."
          }
        ]);

      res.json({
        ok: true,
        result
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error.message
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
            "Image prompt is required"
        });
      }

      const image =
        await generateImage(prompt);

      res.json({
        ok: true,
        ...image
      });
    } catch (error) {
      console.error(
        "Image generation failed:",
        error.message
      );

      res.status(500).json({
        ok: false,
        error: error.message
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
      const userMessage =
        String(
          req.body?.message || ""
        ).trim();

      const conversationId =
        String(
          req.body?.conversationId ||
          "default"
        );

      if (!userMessage) {
        return res.status(400).json({
          ok: false,
          error:
            "Message is required"
        });
      }

      if (
        !memory.has(
          conversationId
        )
      ) {
        memory.set(
          conversationId,
          []
        );
      }

      const conversation =
        memory.get(
          conversationId
        );

      // --------------------------------------------------------
      // WEB SEARCH
      // --------------------------------------------------------

      let webContext = "";
      let searchUsed = false;

      if (
        shouldSearchWeb(
          userMessage
        )
      ) {
        try {
          const searchResult =
            await webSearch(
              userMessage
            );

          if (
            typeof searchResult ===
              "string" &&
            searchResult.trim()
          ) {
            searchUsed = true;

            webContext = `
CURRENT WEB SEARCH RESULTS:

${searchResult}

Use these results when answering current-information questions.
Do not invent information that is not supported by the results.
`;
          }
        } catch (error) {
          console.error(
            "Web search failed:",
            error.message
          );
        }
      }

      // --------------------------------------------------------
      // FOOTBALL
      // --------------------------------------------------------

      let footballContext = "";
      let footballUsed = false;
      let footballMode = null;

      if (
        shouldUseFootball(
          userMessage
        )
      ) {
        try {
          const footballRequestType =
            getFootballRequestType(
              userMessage
            );

          const specificTeam =
            detectFootballTeam(
              userMessage
            );

          const specificLeague =
            detectFootballLeague(
              userMessage
            );

          console.log(
            "Football request:",
            footballRequestType,
            "team:",
            specificTeam,
            "league:",
            specificLeague
          );

          // ----------------------------------------------------
          // TEAM REQUEST
          // ----------------------------------------------------

          if (specificTeam) {
            const teamResult =
              await footballTeamFeature(
                userMessage
              );

            if (
              teamResult &&
              typeof teamResult.text ===
                "string" &&
              teamResult.text.trim()
            ) {
              footballUsed = true;
              footballMode = "team";

              footballContext = `
CURRENT FOOTBALL DATA:

${teamResult.text}

Use this football data directly.
Do not invent missing fixtures, results, scores, dates or status.
`;
            }
          }

          // ----------------------------------------------------
          // LEAGUE REQUEST
          // ----------------------------------------------------

          else if (
            specificLeague
          ) {
            const leagueResult =
              await footballLeagueFeature(
                userMessage
              );

            if (
              leagueResult &&
              typeof leagueResult.text ===
                "string" &&
              leagueResult.text.trim()
            ) {
              footballUsed = true;
              footballMode = "league";

              footballContext = `
CURRENT FOOTBALL DATA:

${leagueResult.text}

Use this football data directly.
Do not invent missing fixtures, results, scores, dates or status.
`;
            }
          }

          // ----------------------------------------------------
          // WORLDWIDE FOOTBALL
          // ----------------------------------------------------

          else {
            const football =
              await footballFeature();

            if (
              football &&
              typeof football.text ===
                "string" &&
              football.text.trim()
            ) {
              footballUsed = true;
              footballMode =
                "worldwide";

              footballContext = `
CURRENT WORLDWIDE FOOTBALL DATA:

${football.text}

Use this football data directly.
Do not invent missing fixtures, results, scores, dates or status.
`;
            }
          }
        } catch (error) {
          console.error(
            "Football feature failed:",
            error.message
          );
        }
      }

      // --------------------------------------------------------
      // BUILD MESSAGE
      // --------------------------------------------------------

      const fullUserMessage = [
        webContext,
        footballContext,
        userMessage
      ]
        .filter(Boolean)
        .join("\n\n");

      conversation.push({
        role: "user",
        content:
          fullUserMessage
      });

      // Keep recent conversation
      const recentMessages =
        conversation.slice(-20);

      // --------------------------------------------------------
      // ASK AI
      // --------------------------------------------------------

      const result =
        await askAI(
          recentMessages
        );

      conversation.push({
        role: "assistant",
        content:
          result.answer
      });

      // Prevent unlimited memory growth
      if (
        conversation.length > 40
      ) {
        conversation.splice(
          0,
          conversation.length - 40
        );
      }

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      res.json({
        ok: true,
        answer: result.answer,
        provider:
          result.provider,
        webSearch:
          searchUsed,
        football:
          footballUsed,
        footballMode
      });

    } catch (error) {
      console.error(
        "Chat error:",
        error
      );

      res.status(500).json({
        ok: false,
        error:
          error?.message ||
          "Something went wrong"
      });
    }
  }
);


// ============================================================
// FRONTEND FALLBACK
// ============================================================
// Express 5 does not accept app.get("*").
// This middleware serves index.html for frontend routes.

app.use(
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
  "0.0.0.0",
  () => {
    console.log(
      `Zed AI running on port ${port}`
    );
  }
);
