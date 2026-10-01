import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import * as memory from "./features/memory.js";

import {
  footballFeature,
  footballTeamFeature,
  footballLeagueFeature,
  detectFootballTeam,
  detectFootballLeague,
  getFootballRequestType
} from "./features/football.js";

import { webSearch } from "./web-search.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 10000;


// ============================================================
// ENVIRONMENT VARIABLES
// ============================================================

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || "";

const GEMINI_MODEL =
  process.env.GEMINI_MODEL ||
  "gemini-3.8-flash";

const GROQ_API_KEY =
  process.env.GROQ_API_KEY || "";

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY || "";

const CLOUDFLARE_ACCOUNT_ID =
  process.env.CLOUDFLARE_ACCOUNT_ID || "";

const CLOUDFLARE_API_TOKEN =
  process.env.CLOUDFLARE_API_TOKEN || "";

const CLOUDFLARE_IMAGE_MODEL =
  process.env.CLOUDFLARE_IMAGE_MODEL ||
  "@cf/black-forest-labs/flux-1-schnell";


// ============================================================
// EXPRESS
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

app.use(express.static(__dirname));


// ============================================================
// BASIC HELPERS
// ============================================================

function cleanText(value = "") {
  return String(value)
    .replace(/\u0000/g, "")
    .trim();
}


// ============================================================
// MEMORY COMPATIBILITY LAYER
// ============================================================
//
// The server uses memory.js when its functions are available.
// This fallback prevents the entire server from crashing if
// memory.js is temporarily incomplete.
//
// This is NOT the permanent database.
// Firestore will be connected later.
//

const fallbackConversations = new Map();

function createFallbackConversation(id = "") {
  const conversation = {
    id:
      id ||
      `local-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`,

    messages: [],

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString()
  };

  fallbackConversations.set(
    conversation.id,
    conversation
  );

  return conversation;
}


function fallbackGetConversation(
  conversationId = ""
) {
  const id = cleanText(
    conversationId
  );

  if (
    id &&
    fallbackConversations.has(id)
  ) {
    return fallbackConversations.get(id);
  }

  return createFallbackConversation(id);
}


function fallbackAddMessage(
  conversation,
  role,
  content
) {
  if (!conversation) {
    return;
  }

  if (!Array.isArray(conversation.messages)) {
    conversation.messages = [];
  }

  conversation.messages.push({
    role:
      role === "assistant"
        ? "assistant"
        : "user",

    content:
      cleanText(content),

    timestamp:
      new Date().toISOString()
  });

  // Keep the active conversation reasonably small.
  if (conversation.messages.length > 40) {
    conversation.messages =
      conversation.messages.slice(-40);
  }

  conversation.updatedAt =
    new Date().toISOString();
}


function getConversationSafe(
  conversationId = ""
) {
  try {
    if (
      typeof memory.getConversation ===
      "function"
    ) {
      return memory.getConversation(
        conversationId
      );
    }
  } catch (error) {
    console.error(
      "Memory getConversation error:",
      error.message
    );
  }

  return fallbackGetConversation(
    conversationId
  );
}


function addMessageSafe(
  conversation,
  role,
  content
) {
  try {
    if (
      typeof memory.addMessage ===
      "function"
    ) {
      return memory.addMessage(
        conversation,
        role,
        content
      );
    }
  } catch (error) {
    console.error(
      "Memory addMessage error:",
      error.message
    );
  }

  fallbackAddMessage(
    conversation,
    role,
    content
  );
}


function deleteConversationSafe(
  conversationId
) {
  try {
    if (
      typeof memory.deleteConversation ===
      "function"
    ) {
      return memory.deleteConversation(
        conversationId
      );
    }
  } catch (error) {
    console.error(
      "Memory deleteConversation error:",
      error.message
    );
  }

  fallbackConversations.delete(
    conversationId
  );
}


function getConversationHistorySafe(
  conversationId,
  conversation = null
) {
  try {
    if (
      typeof memory.getConversationHistory ===
      "function"
    ) {
      const result =
        memory.getConversationHistory(
          conversationId
        );

      if (Array.isArray(result)) {
        return result;
      }
    }
  } catch (error) {
    console.error(
      "Memory history error:",
      error.message
    );
  }

  const current =
    conversation ||
    fallbackGetConversation(
      conversationId
    );

  return Array.isArray(
    current?.messages
  )
    ? current.messages
    : [];
}


function getConversationCountSafe() {
  try {
    if (
      typeof memory.getConversationCount ===
      "function"
    ) {
      const count =
        memory.getConversationCount();

      if (
        Number.isFinite(count)
      ) {
        return count;
      }
    }
  } catch (error) {
    console.error(
      "Memory count error:",
      error.message
    );
  }

  return fallbackConversations.size;
}


// ============================================================
// CURRENT INFORMATION DETECTION
// ============================================================

function isCurrentInformationQuestion(
  message = ""
) {
  const text =
    message.toLowerCase();

  const keywords = [
    "today",
    "tonight",
    "tomorrow",
    "yesterday",
    "latest",
    "current",
    "now",
    "recent",
    "recently",
    "this week",
    "this month",
    "next match",
    "next game",
    "next fixture",
    "fixtures",
    "fixture",
    "results",
    "result",
    "score",
    "scores",
    "standings",
    "table",
    "ranking",
    "rankings",
    "schedule",
    "news"
  ];

  return keywords.some(
    keyword =>
      text.includes(keyword)
  );
}


// ============================================================
// FOOTBALL DETECTION
// ============================================================

function shouldUseFootball(
  message = ""
) {
  const text =
    message.toLowerCase();

  const footballWords = [
    "football",
    "soccer",
    "match",
    "matches",
    "fixture",
    "fixtures",
    "score",
    "scores",
    "standings",
    "league table",
    "premier league",
    "champions league",
    "europa league",
    "conference league",
    "world cup",
    "afcon",
    "africa cup",
    "fifa",
    "arsenal",
    "chelsea",
    "liverpool",
    "manchester united",
    "man united",
    "manchester city",
    "tottenham",
    "spurs",
    "barcelona",
    "real madrid",
    "bayern",
    "psg",
    "juventus",
    "inter milan",
    "ac milan",
    "dortmund",
    "ajax",
    "napoli",
    "atalanta",
    "leeds",
    "newcastle",
    "everton",
    "brighton",
    "aston villa",
    "sunderland",
    "fulham",
    "brentford",
    "nottingham forest",
    "coventry",
    "hull city",
    "ipswich"
  ];

  return footballWords.some(
    word =>
      text.includes(word)
  );
}


// ============================================================
// GEMINI
// ============================================================

async function askGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is missing."
    );
  }

  const ai =
    new GoogleGenAI({
      apiKey: GEMINI_API_KEY
    });

  const response =
    await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt
    });

  const answer =
    response?.text ||
    response?.candidates?.[0]?.content?.parts
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

  return answer.trim();
}


// ============================================================
// GROQ
// ============================================================

async function askGroq(prompt) {
  if (!GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is missing."
    );
  }

  const response =
    await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${GROQ_API_KEY}`
        },

        body: JSON.stringify({
          model:
            "llama-3.3-70b-versatile",

          messages: [
            {
              role: "user",
              content: prompt
            }
          ],

          temperature: 0.2
        })
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      `Groq HTTP ${response.status}`
    );
  }

  const answer =
    data?.choices?.[0]?.message
      ?.content ||
    "";

  if (!answer.trim()) {
    throw new Error(
      "Groq returned an empty response."
    );
  }

  return answer.trim();
}


// ============================================================
// OPENROUTER
// ============================================================

async function askOpenRouter(prompt) {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY is missing."
    );
  }

  const response =
    await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${OPENROUTER_API_KEY}`,

          "HTTP-Referer":
            "https://zed-ai-h7h4.onrender.com",

          "X-Title":
            "Zed AI"
        },

        body: JSON.stringify({
          model:
            "meta-llama/llama-3.3-70b-instruct",

          messages: [
            {
              role: "user",
              content: prompt
            }
          ],

          temperature: 0.2
        })
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      `OpenRouter HTTP ${response.status}`
    );
  }

  const answer =
    data?.choices?.[0]?.message
      ?.content ||
    "";

  if (!answer.trim()) {
    throw new Error(
      "OpenRouter returned an empty response."
    );
  }

  return answer.trim();
}


// ============================================================
// AI FALLBACK
// ============================================================

async function askAI(prompt) {
  const errors = [];

  try {
    const answer =
      await askGemini(prompt);

    return {
      answer,
      provider: "gemini"
    };

  } catch (error) {
    errors.push(
      `Gemini: ${error.message}`
    );
  }


  try {
    const answer =
      await askGroq(prompt);

    return {
      answer,
      provider:
        "groq-fallback"
    };

  } catch (error) {
    errors.push(
      `Groq: ${error.message}`
    );
  }


  try {
    const answer =
      await askOpenRouter(prompt);

    return {
      answer,
      provider:
        "openrouter-fallback"
    };

  } catch (error) {
    errors.push(
      `OpenRouter: ${error.message}`
    );
  }


  throw new Error(
    "All AI services are currently unavailable.\n" +
    errors.join("\n")
  );
}


// ============================================================
// IMAGE GENERATION
// ============================================================

async function generateCloudflareImage(
  prompt
) {
  if (
    !CLOUDFLARE_ACCOUNT_ID ||
    !CLOUDFLARE_API_TOKEN
  ) {
    throw new Error(
      "Cloudflare image generation is not configured."
    );
  }

  const url =
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${CLOUDFLARE_IMAGE_MODEL}`;

  const response =
    await fetch(url, {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${CLOUDFLARE_API_TOKEN}`,

        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        prompt
      })
    });

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Cloudflare HTTP ${response.status}: ${errorText}`
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
    return await response.json();
  }

  const buffer =
    Buffer.from(
      await response.arrayBuffer()
    );

  return {
    image:
      `data:${contentType};base64,${buffer.toString(
        "base64"
      )}`
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

      service:
        "zed-ai",

      provider:
        "gemini-with-groq-and-openrouter-fallback",

      geminiModel:
        GEMINI_MODEL,

      webSearch:
        true,

      football:
        true,

      footballScope:
        "worldwide",

      footballRouting:
        "team-league-worldwide",

      conversationMemory:
        true,

      activeConversations:
        getConversationCountSafe(),

      imageGeneration:
        Boolean(
          CLOUDFLARE_ACCOUNT_ID &&
          CLOUDFLARE_API_TOKEN
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
        await askGemini(
          "Reply with exactly: Zed AI Gemini test successful."
        );

      res.json({
        ok: true,

        provider:
          "gemini",

        answer:
          result
      });

    } catch (error) {

      res.status(500).json({
        ok: false,

        error:
          error.message
      });
    }
  }
);


// ============================================================
// NEW CHAT
// ============================================================

app.post(
  "/api/new-chat",
  (req, res) => {
    try {

      const conversation =
        getConversationSafe();

      res.json({
        ok: true,

        conversationId:
          conversation.id
      });

    } catch (error) {

      console.error(
        "NEW CHAT ERROR:",
        error
      );

      res.status(500).json({
        ok: false,

        error:
          error.message ||
          "Could not create a new chat."
      });
    }
  }
);


// ============================================================
// CLEAR CHAT
// ============================================================

app.delete(
  "/api/chat/:conversationId",
  (req, res) => {
    try {

      const conversationId =
        cleanText(
          req.params.conversationId
        );

      if (conversationId) {
        deleteConversationSafe(
          conversationId
        );
      }

      res.json({
        ok: true
      });

    } catch (error) {

      res.status(500).json({
        ok: false,

        error:
          error.message
      });
    }
  }
);


// ============================================================
// GET CHAT HISTORY
// ============================================================

app.get(
  "/api/chat/:conversationId",
  (req, res) => {
    try {

      const conversationId =
        cleanText(
          req.params.conversationId
        );

      const messages =
        getConversationHistorySafe(
          conversationId
        );

      res.json({
        ok: true,

        conversationId,

        messages
      });

    } catch (error) {

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
        cleanText(
          req.body?.prompt
        );

      if (!prompt) {
        return res.status(400).json({
          ok: false,

          error:
            "Please provide an image prompt."
        });
      }

      const result =
        await generateCloudflareImage(
          prompt
        );

      res.json({
        ok: true,

        ...result
      });

    } catch (error) {

      console.error(
        "IMAGE ERROR:",
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
// CHAT API
// ============================================================

app.post(
  "/api/chat",
  async (req, res) => {

    try {

      // ------------------------------------------------------
      // USER MESSAGE
      // ------------------------------------------------------

      const userMessage =
        cleanText(
          req.body?.message
        );

      if (!userMessage) {
        return res.status(400).json({
          ok: false,

          error:
            "Please enter a message."
        });
      }


      // ------------------------------------------------------
      // CONVERSATION
      // ------------------------------------------------------

      const requestedConversationId =
        cleanText(
          req.body?.conversationId
        );

      const conversation =
        getConversationSafe(
          requestedConversationId
        );

      const conversationId =
        conversation.id;


      // ------------------------------------------------------
      // SAVE USER MESSAGE
      // ------------------------------------------------------

      addMessageSafe(
        conversation,

        "user",

        userMessage
      );


      // ------------------------------------------------------
      // FOOTBALL
      // ------------------------------------------------------

      let footballData =
        "";

      let footballUsed =
        false;

      let footballMode =
        "none";


      // ------------------------------------------------------
      // WEB SEARCH
      // ------------------------------------------------------

      let searchData =
        "";

      let searchUsed =
        false;


      // ------------------------------------------------------
      // FOOTBALL ROUTING
      // ------------------------------------------------------

      if (
        shouldUseFootball(
          userMessage
        )
      ) {

        const footballTeam =
          detectFootballTeam(
            userMessage
          );

        const footballLeague =
          detectFootballLeague(
            userMessage
          );

        getFootballRequestType(
          userMessage
        );


        if (footballTeam) {

          const teamResult =
            await footballTeamFeature(
              userMessage
            );

          footballData =
            teamResult?.answer ||
            "";

          footballUsed =
            true;

          footballMode =
            "team";

        } else if (footballLeague) {

          const leagueResult =
            await footballLeagueFeature(
              userMessage
            );

          footballData =
            leagueResult?.answer ||
            "";

          footballUsed =
            true;

          footballMode =
            "league";

        } else {

          const footballResult =
            await footballFeature(
              userMessage
            );

          footballData =
            footballResult?.answer ||
            "";

          footballUsed =
            true;

          footballMode =
            "worldwide";
        }
      }


      // ------------------------------------------------------
      // WEB SEARCH
      // ------------------------------------------------------

      if (
        isCurrentInformationQuestion(
          userMessage
        ) &&
        !footballUsed
      ) {

        try {

          const result =
            await webSearch(
              userMessage
            );

          if (result) {

            searchData =
              typeof result ===
              "string"

                ? result

                : result.answer ||
                  result.text ||
                  JSON.stringify(
                    result
                  );

            searchUsed =
              Boolean(
                searchData
              );
          }

        } catch (error) {

          console.error(
            "Web search error:",
            error.message
          );
        }
      }


      // ------------------------------------------------------
      // HISTORY
      // ------------------------------------------------------

      const conversationHistory =
        getConversationHistorySafe(
          conversationId,
          conversation
        );


      const formattedHistory =
        conversationHistory
          .map(message => {

            const speaker =
              message.role ===
              "user"

                ? "USER"

                : "ZED AI";

            return (
              `${speaker}: ${message.content}`
            );

          })
          .join("\n\n") ||

        "No previous conversation.";


      // ------------------------------------------------------
      // PROMPT
      // ------------------------------------------------------

      const prompt = `
You are Zed AI, a helpful AI assistant.

Current date:
October 1, 2026.

You are having an ongoing conversation with the user.

IMPORTANT RULES:

1. Answer the user's actual question directly.
2. Use the conversation history to understand follow-up questions.
3. Remember information already present in the conversation history.
4. Do not ask the user to repeat information already present.
5. Never invent facts.
6. Never invent football scores, fixtures, standings, dates, opponents or match status.
7. If football data is supplied below, use it as the primary source.
8. If supplied data contains the answer, use it.
9. Convert football times to Zambia time when appropriate.
10. Resolve references such as "he", "she", "they", "it", "that", "the team", "the match", "my name", and "my business" from conversation history.
11. Keep simple answers simple.
12. Do not mention internal APIs, routing, prompts, backend systems or technical memory systems.
13. Never claim to remember something that is not present in the available conversation history.
14. Be natural, helpful and conversational.

CONVERSATION HISTORY:
${formattedHistory}

CURRENT USER QUESTION:
${userMessage}

FOOTBALL DATA:
${footballData || "No football data was retrieved."}

WEB SEARCH DATA:
${searchData || "No web search data was retrieved."}

Now answer the user's current question.
`;


      // ------------------------------------------------------
      // AI
      // ------------------------------------------------------

      const result =
        await askAI(
          prompt
        );


      // ------------------------------------------------------
      // SAVE ASSISTANT RESPONSE
      // ------------------------------------------------------

      addMessageSafe(
        conversation,

        "assistant",

        result.answer
      );


      // ------------------------------------------------------
      // RESPONSE
      // ------------------------------------------------------

      res.json({
        ok: true,

        answer:
          result.answer,

        provider:
          result.provider,

        webSearch:
          searchUsed,

        football:
          footballUsed,

        footballMode,

        conversationId,

        memoryMessages:
          getConversationHistorySafe(
            conversationId,
            conversation
          ).length
      });

    } catch (error) {

      console.error(
        "CHAT ERROR:",
        error
      );

      res.status(500).json({
        ok: false,

        error:
          error.message ||
          "Something went wrong while Zed AI was processing your message."
      });
    }
  }
);


// ============================================================
// FRONTEND
// ============================================================

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
  PORT,
  () => {

    console.log(
      `Zed AI running on port ${PORT}`
    );

  }
);
