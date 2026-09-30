import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

import { webSearch, shouldSearchWeb } from "./web-search.js";

import {
  footballFeature,
  footballTeamFeature,
  footballLeagueFeature,
  detectFootballTeam,
  detectFootballLeague,
  getFootballRequestType,
} from "./features/football.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 10000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.8-flash";

const CLOUDFLARE_ACCOUNT_ID =
  process.env.CLOUDFLARE_ACCOUNT_ID || "";

const CLOUDFLARE_API_TOKEN =
  process.env.CLOUDFLARE_API_TOKEN || "";

const CLOUDFLARE_IMAGE_MODEL =
  process.env.CLOUDFLARE_IMAGE_MODEL ||
  "@cf/black-forest-labs/flux-1-schnell";

const memory = new Map();

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

app.use(
  express.json({
    limit: "25mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "25mb",
  })
);

app.use(express.static(__dirname));

/* =========================================================
   BASIC HELPERS
========================================================= */

function cleanText(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .trim();
}

function getUserId(req) {
  return (
    req.body?.userId ||
    req.body?.user_id ||
    req.headers["x-user-id"] ||
    "default-user"
  );
}

function getConversationId(req) {
  return (
    req.body?.conversationId ||
    req.body?.conversation_id ||
    "default-chat"
  );
}

function getMemoryKey(userId, conversationId) {
  return `${userId}:${conversationId}`;
}

function shouldUseFootball(message = "") {
  const text = String(message).toLowerCase();

  const footballWords = [
    "football",
    "soccer",
    "premier league",
    "champions league",
    "europa league",
    "conference league",
    "world cup",
    "afcon",
    "africa cup",
    "club world cup",
    "fixture",
    "fixtures",
    "match",
    "matches",
    "game",
    "games",
    "score",
    "scores",
    "result",
    "results",
    "standings",
    "table",
    "league table",
    "football team",
    "soccer team",
    "kickoff",
    "kick-off",
    "starting lineup",
    "starting xi",
    "lineup",
    "line-up",
    "goal scorer",
    "goalscorer",
  ];

  return footballWords.some((word) => text.includes(word));
}

function buildSystemPrompt() {
  return `
You are Zed AI, a helpful general AI assistant.

GENERAL RULES:
- Give clear, useful and accurate answers.
- Do not invent facts.
- If current information is supplied by a tool, use that information.
- If information is unavailable, say so clearly.
- Do not claim that you searched the internet unless search results were actually supplied.
- Keep answers natural and easy to understand.

CURRENT INFORMATION:
When CURRENT WEB SEARCH RESULTS are supplied, use them for current-information questions.
Do not invent information that is not supported by those results.

FOOTBALL:
When CURRENT FOOTBALL DATA is supplied, treat it as the authoritative football data for that request.
Do not replace football data with unrelated web-search information.
Do not invent fixtures, scores, dates, results, standings or match status.

IMPORTANT TEAM RULE:
When a user says an ordinary men's team name such as "Arsenal", "Chelsea", "Liverpool", "Barcelona", "Real Madrid", etc., interpret it as the men's first team unless the user explicitly asks for the women's team, youth team, academy or another team.

If the supplied football data says there are no matching fixtures or results, say that clearly instead of substituting a women's, youth or unrelated team.

TIME:
Football times supplied by the football feature are formatted for Zambia time when applicable.
Do not change a supplied time unless the user asks for another timezone.

FILES:
If the user provides a file or image and the contents are available to you, analyze the supplied content.
Do not invent information from files you cannot access.
`;
}

/* =========================================================
   GEMINI
========================================================= */

async function callGemini(prompt, fileParts = []) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
  });

  const contents = [];

  contents.push({
    role: "user",
    parts: [
      {
        text: prompt,
      },
    ],
  });

  if (Array.isArray(fileParts) && fileParts.length > 0) {
    contents[0].parts.push(...fileParts);
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    systemInstruction: buildSystemPrompt(),
    contents,
  });

  const answer =
    response?.text ||
    response?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("") ||
    "";

  if (!answer.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  return cleanText(answer);
}

/* =========================================================
   GROQ
========================================================= */

async function callGroq(prompt) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(),
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Groq ${response.status}: ${errorText.slice(0, 500)}`
    );
  }

  const data = await response.json();

  const answer =
    data?.choices?.[0]?.message?.content || "";

  if (!answer.trim()) {
    throw new Error("Groq returned an empty response.");
  }

  return cleanText(answer);
}

/* =========================================================
   OPENROUTER
========================================================= */

async function callOpenRouter(prompt) {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured."
    );
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://zed-ai-h7h4.onrender.com",
        "X-Title": "Zed AI",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(),
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `OpenRouter ${response.status}: ${errorText.slice(0, 500)}`
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

  return cleanText(answer);
}

/* =========================================================
   AI FALLBACK
========================================================= */

async function askAI(prompt, fileParts = []) {
  const errors = [];

  /* ---------- GEMINI ---------- */

  try {
    const answer = await callGemini(
      prompt,
      fileParts
    );

    return {
      answer,
      provider: "gemini",
    };
  } catch (error) {
    errors.push(`Gemini: ${error.message}`);
    console.error("Gemini error:", error.message);
  }

  /* ---------- GROQ ---------- */

  try {
    const answer = await callGroq(prompt);

    return {
      answer,
      provider: "groq-fallback",
    };
  } catch (error) {
    errors.push(`Groq: ${error.message}`);
    console.error("Groq error:", error.message);
  }

  /* ---------- OPENROUTER ---------- */

  try {
    const answer = await callOpenRouter(prompt);

    return {
      answer,
      provider: "openrouter-fallback",
    };
  } catch (error) {
    errors.push(`OpenRouter: ${error.message}`);
    console.error(
      "OpenRouter error:",
      error.message
    );
  }

  throw new Error(
    `All AI services are currently unavailable. ${errors.join(
      " | "
    )}`
  );
}

/* =========================================================
   FILE HANDLING
========================================================= */

function validateFile(file) {
  if (!file) return;

  if (file.size && file.size > MAX_FILE_SIZE) {
    throw new Error(
      "The uploaded file is too large. Maximum size is 15 MB."
    );
  }

  if (
    file.mimeType &&
    !ALLOWED_FILE_TYPES.has(file.mimeType)
  ) {
    throw new Error(
      `Unsupported file type: ${file.mimeType}`
    );
  }
}

function buildGeminiFilePart(file) {
  if (!file) return null;

  validateFile(file);

  const mimeType =
    file.mimeType ||
    file.type ||
    "application/octet-stream";

  const base64 =
    file.data ||
    file.base64 ||
    "";

  if (!base64) {
    throw new Error(
      "The uploaded file does not contain readable data."
    );
  }

  return {
    inlineData: {
      mimeType,
      data: base64,
    },
  };
}

/* =========================================================
   HEALTH
========================================================= */

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "zed-ai",
    provider:
      "gemini-with-groq-and-openrouter-fallback",
    geminiModel: GEMINI_MODEL,
    fileAnalysis: true,
    football: true,
    footballScope: "worldwide",
    footballRouting:
      "team-league-worldwide",
    webSearch: true,
    imageGeneration: Boolean(
      CLOUDFLARE_ACCOUNT_ID &&
        CLOUDFLARE_API_TOKEN
    ),
  });
});

/* =========================================================
   GEMINI TEST
========================================================= */

app.get("/api/gemini-test", async (req, res) => {
  try {
    const result = await askAI(
      "Reply with exactly: Zed AI Gemini test successful."
    );

    res.json({
      ok: true,
      answer: result.answer,
      provider: result.provider,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

/* =========================================================
   IMAGE GENERATION
========================================================= */

app.post(
  "/api/generate-image",
  async (req, res) => {
    try {
      if (
        !CLOUDFLARE_ACCOUNT_ID ||
        !CLOUDFLARE_API_TOKEN
      ) {
        return res.status(500).json({
          ok: false,
          error:
            "Cloudflare image generation is not configured.",
        });
      }

      const prompt = cleanText(
        req.body?.prompt || ""
      );

      if (!prompt) {
        return res.status(400).json({
          ok: false,
          error: "Please provide an image prompt.",
        });
      }

      const url =
        `https://api.cloudflare.com/client/v4/accounts/` +
        `${CLOUDFLARE_ACCOUNT_ID}/ai/run/` +
        `${encodeURIComponent(CLOUDFLARE_IMAGE_MODEL)}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          `Cloudflare ${response.status}: ${errorText.slice(
            0,
            500
          )}`
        );
      }

      const contentType =
        response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await response.json();

        return res.json({
          ok: true,
          provider: "cloudflare",
          result: data,
        });
      }

      const arrayBuffer =
        await response.arrayBuffer();

      const base64 = Buffer.from(
        arrayBuffer
      ).toString("base64");

      res.json({
        ok: true,
        provider: "cloudflare",
        image:
          `data:${contentType || "image/png"};base64,${base64}`,
      });
    } catch (error) {
      console.error(
        "Image generation error:",
        error.message
      );

      res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  }
);

/* =========================================================
   CHAT
========================================================= */

app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = cleanText(
      req.body?.message ||
        req.body?.prompt ||
        ""
    );

    const userId = getUserId(req);
    const conversationId =
      getConversationId(req);

    if (!userMessage) {
      return res.status(400).json({
        ok: false,
        error: "Please enter a message.",
      });
    }

    const memoryKey = getMemoryKey(
      userId,
      conversationId
    );

    /* =====================================================
       DETECT FOOTBALL FIRST
    ===================================================== */

    const footballDetected =
      shouldUseFootball(userMessage);

    const specificTeam = footballDetected
      ? detectFootballTeam(userMessage)
      : null;

    const specificLeague = footballDetected
      ? detectFootballLeague(userMessage)
      : null;

    const footballRequestType =
      footballDetected
        ? getFootballRequestType(userMessage)
        : null;

    console.log(
      "Football detection:",
      JSON.stringify({
        detected: footballDetected,
        team: specificTeam?.name || null,
        league: specificLeague?.name || null,
        requestType: footballRequestType || null,
      })
    );

    /* =====================================================
       MEMORY
    ===================================================== */

    const previousMessages =
      memory.get(memoryKey) || [];

    let memoryContext = "";

    if (previousMessages.length > 0) {
      memoryContext = `
RECENT CONVERSATION:

${previousMessages
  .slice(-10)
  .map(
    (item) =>
      `${item.role}: ${item.content}`
  )
  .join("\n")}

Use this conversation context when it is relevant.
`;
    }

    /* =====================================================
       WEB SEARCH
       
       IMPORTANT:
       For a specific football team request, do NOT run
       general web search because it can return unrelated
       women's/youth/team results and conflict with ESPN.
    ===================================================== */

    let webContext = "";
    let searchUsed = false;

    const skipWebForSpecificFootballTeam =
      Boolean(specificTeam);

    if (
      !skipWebForSpecificFootballTeam &&
      shouldSearchWeb(userMessage)
    ) {
      try {
        const searchResult =
          await webSearch(userMessage);

        if (
          typeof searchResult === "string" &&
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
          "Web search error:",
          error.message
        );

        webContext = "";
      }
    }

    /* =====================================================
       FOOTBALL
    ===================================================== */

    let footballContext = "";
    let footballUsed = false;
    let footballMode = null;

    if (footballDetected) {
      try {
        /* -------------------------------------------------
           SPECIFIC TEAM
        ------------------------------------------------- */

        if (specificTeam) {
          const teamResult =
            await footballTeamFeature(
              userMessage
            );

          /*
             IMPORTANT FIX:

             footballTeamFeature() returns:
             {
               answer: "...",
               team: "...",
               ...
             }

             NOT:
             {
               text: "..."
             }
          */

          if (
            teamResult &&
            typeof teamResult.answer === "string" &&
            teamResult.answer.trim()
          ) {
            footballUsed = true;
            footballMode = "team";

            footballContext = `
CURRENT FOOTBALL DATA FROM ESPN:

${teamResult.answer}

This is the authoritative football data for the requested team.

Use this football data directly.
Do not replace it with another source.
Do not substitute a women's team, youth team or unrelated team.
Do not invent missing fixtures, results, scores, dates or status.
`;
          }
        }

        /* -------------------------------------------------
           SPECIFIC LEAGUE
        ------------------------------------------------- */

        else if (specificLeague) {
          const leagueResult =
            await footballLeagueFeature(
              userMessage
            );

          if (
            leagueResult &&
            typeof leagueResult.answer === "string" &&
            leagueResult.answer.trim()
          ) {
            footballUsed = true;
            footballMode = "league";

            footballContext = `
CURRENT FOOTBALL DATA FROM ESPN:

${leagueResult.answer}

Use this football data directly.
Do not invent missing fixtures, results, scores, dates, standings or status.
`;
          }
        }

        /* -------------------------------------------------
           WORLDWIDE FOOTBALL
        ------------------------------------------------- */

        else {
          const football =
            await footballFeature();

          if (
            football &&
            typeof football.answer === "string" &&
            football.answer.trim()
          ) {
            footballUsed = true;
            footballMode = "worldwide";

            footballContext = `
CURRENT FOOTBALL DATA FROM ESPN:

${football.answer}

Use this football data directly.
Do not invent missing fixtures, results, scores, dates, standings or status.
`;
          }
        }
      } catch (error) {
        console.error(
          "Football feature error:",
          error.message
        );

        footballContext = "";
      }
    }

    console.log(
      "Football data passed to AI:",
      footballMode,
      footballContext ? "YES" : "NO"
    );

    /* =====================================================
       BUILD FINAL AI MESSAGE
    ===================================================== */

    const fullUserMessage = [
      memoryContext,
      webContext,
      footballContext,
      userMessage,
    ]
      .filter(Boolean)
      .join("\n\n");

    /* =====================================================
       FILE
    ===================================================== */

    const fileParts = [];

    const incomingFile =
      req.body?.file ||
      req.body?.attachment ||
      null;

    if (incomingFile) {
      try {
        const filePart =
          buildGeminiFilePart(
            incomingFile
          );

        if (filePart) {
          fileParts.push(filePart);
        }
      } catch (error) {
        return res.status(400).json({
          ok: false,
          error: error.message,
        });
      }
    }

    /* =====================================================
       ASK AI
    ===================================================== */

    const result = await askAI(
      fullUserMessage,
      fileParts
    );

    /* =====================================================
       SAVE MEMORY
    ===================================================== */

    const updatedMessages = [
      ...previousMessages,
      {
        role: "user",
        content: userMessage,
      },
      {
        role: "assistant",
        content: result.answer,
      },
    ].slice(-20);

    memory.set(
      memoryKey,
      updatedMessages
    );

    /* =====================================================
       RESPONSE
    ===================================================== */

    res.json({
      ok: true,
      answer: result.answer,
      provider: result.provider,
      webSearch: searchUsed,
      football: footballUsed,
      footballMode,
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
        "Something went wrong while processing your request.",
    });
  }
});

/* =========================================================
   FRONTEND FALLBACK
========================================================= */

app.use((req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, () => {
  console.log(
    `Zed AI server running on port ${PORT}`
  );

  console.log(
    `Gemini model: ${GEMINI_MODEL}`
  );

  console.log(
    "Football routing: team → league → worldwide"
  );

  console.log(
    "AI fallback: Gemini → Groq → OpenRouter"
  );
});
