import { randomUUID } from "crypto";

import {
  getFirebaseDb
} from "../config/firebase-admin.js";


// ============================================================
// ZED AI MEMORY SYSTEM
// ============================================================
//
// This version keeps the existing in-memory system as the
// fast cache and adds Firestore persistence.
//
// Existing public functions are preserved.
//
// Persistent collections:
// - zedConversations
// - zedMemories
// - zedProjects
// - zedFootballMemory
//
// If Firebase is temporarily unavailable, Zed AI continues
// using server memory instead of crashing.
//
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const MAX_HISTORY_MESSAGES = 30;

const MAX_CONVERSATIONS = 1000;

const MAX_LONG_TERM_MEMORIES = 5000;

const MAX_MEMORIES_PER_USER = 500;

const MAX_PROJECTS_PER_USER = 100;

const MAX_MEMORY_TEXT_LENGTH = 2000;

const MAX_SUMMARY_LENGTH = 4000;

const CONVERSATION_TIMEOUT =
  1000 * 60 * 60 * 24 * 7;

const MEMORY_CLEANUP_INTERVAL =
  1000 * 60 * 30;

const MEMORY_DEFAULT_IMPORTANCE = 50;

const MEMORY_DEFAULT_CONFIDENCE = 0.8;

const MEMORY_RELEVANCE_THRESHOLD = 0.18;


// ============================================================
// PRIMARY STORES
// ============================================================

const conversations = new Map();

const memories = new Map();

const userMemoryIndex = new Map();

const projects = new Map();

const footballMemory = new Map();


// ============================================================
// FIRESTORE
// ============================================================

let firestore = null;

let firebasePersistenceEnabled = false;

let firebaseHydrationComplete = false;

try {
  firestore =
    getFirebaseDb();

  firebasePersistenceEnabled =
    Boolean(firestore);

  console.log(
    "Zed AI memory persistence: Firestore enabled"
  );
} catch (error) {
  console.warn(
    "Zed AI memory persistence unavailable. Using server memory:",
    error.message
  );
}


// ============================================================
// FIRESTORE HELPERS
// ============================================================

function firestoreTimestampToNumber(
  value
) {
  if (
    typeof value ===
    "number"
  ) {
    return value;
  }

  if (
    value &&
    typeof value.toMillis ===
      "function"
  ) {
    return value.toMillis();
  }

  if (
    typeof value ===
    "string"
  ) {
    const parsed =
      Date.parse(value);

    if (
      Number.isFinite(parsed)
    ) {
      return parsed;
    }
  }

  return now();
}


function cloneForFirestore(
  value
) {
  if (
    value ===
    undefined
  ) {
    return null;
  }

  if (
    value ===
    null
  ) {
    return null;
  }

  if (
    Array.isArray(value)
  ) {
    return value.map(
      item =>
        cloneForFirestore(
          item
        )
    );
  }

  if (
    typeof value ===
    "object"
  ) {
    const result = {};

    for (
      const [
        key,
        item
      ]
      of Object.entries(
        value
      )
    ) {
      if (
        item ===
        undefined
      ) {
        continue;
      }

      result[key] =
        cloneForFirestore(
          item
        );
    }

    return result;
  }

  return value;
}


function firestoreWrite(
  collection,
  id,
  data
) {
  if (
    !firestore ||
    !id
  ) {
    return;
  }

  firestore
    .collection(collection)
    .doc(id)
    .set(
      cloneForFirestore(
        data
      )
    )
    .catch(error => {
      console.error(
        `Firestore write error (${collection}/${id}):`,
        error.message
      );
    });
}


function firestoreDelete(
  collection,
  id
) {
  if (
    !firestore ||
    !id
  ) {
    return;
  }

  firestore
    .collection(collection)
    .doc(id)
    .delete()
    .catch(error => {
      console.error(
        `Firestore delete error (${collection}/${id}):`,
        error.message
      );
    });
}


// ============================================================
// FIRESTORE HYDRATION
// ============================================================
//
// This runs before the rest of Zed AI starts using the module.
// It restores previously saved memory after a Render restart.
//
// ============================================================

async function hydrateFromFirestore() {
  if (
    !firestore
  ) {
    firebaseHydrationComplete =
      true;

    return;
  }

  try {

    const [
      conversationSnapshot,
      memorySnapshot,
      projectSnapshot,
      footballSnapshot
    ] = await Promise.all([
      firestore
        .collection(
          "zedConversations"
        )
        .get(),

      firestore
        .collection(
          "zedMemories"
        )
        .get(),

      firestore
        .collection(
          "zedProjects"
        )
        .get(),

      firestore
        .collection(
          "zedFootballMemory"
        )
        .get()
    ]);


    // --------------------------------------------------------
    // CONVERSATIONS
    // --------------------------------------------------------

    conversationSnapshot.forEach(
      document => {

        const data =
          document.data();

        conversations.set(
          document.id,
          {
            id:
              document.id,

            messages:
              Array.isArray(
                data.messages
              )
                ? data.messages.map(
                    message => ({
                      ...message,

                      timestamp:
                        firestoreTimestampToNumber(
                          message.timestamp
                        )
                    })
                  )
                : [],

            createdAt:
              firestoreTimestampToNumber(
                data.createdAt
              ),

            updatedAt:
              firestoreTimestampToNumber(
                data.updatedAt
              ),

            summary:
              normalizeText(
                data.summary ||
                ""
              ),

            metadata:
              data.metadata &&
              typeof data.metadata ===
                "object"
                ? data.metadata
                : {}
          }
        );
      }
    );


    // --------------------------------------------------------
    // LONG-TERM MEMORIES
    // --------------------------------------------------------

    memorySnapshot.forEach(
      document => {

        const data =
          document.data();

        const memory = {
          ...data,

          id:
            document.id,

          userId:
            normalizeText(
              data.userId
            ),

          createdAt:
            firestoreTimestampToNumber(
              data.createdAt
            ),

          updatedAt:
            firestoreTimestampToNumber(
              data.updatedAt
            ),

          lastUsedAt:
            data.lastUsedAt
              ? firestoreTimestampToNumber(
                  data.lastUsedAt
                )
              : null,

          tags:
            Array.isArray(
              data.tags
            )
              ? data.tags
              : [],

          metadata:
            data.metadata &&
            typeof data.metadata ===
              "object"
              ? data.metadata
              : {}
        };


        if (
          !memory.userId
        ) {
          return;
        }


        memories.set(
          memory.id,
          memory
        );


        const index =
          ensureUserIndex(
            memory.userId
          );

        if (index) {
          index.add(
            memory.id
          );
        }
      }
    );


    // --------------------------------------------------------
    // PROJECTS
    // --------------------------------------------------------

    projectSnapshot.forEach(
      document => {

        const data =
          document.data();

        projects.set(
          document.id,
          {
            ...data,

            id:
              document.id,

            createdAt:
              firestoreTimestampToNumber(
                data.createdAt
              ),

            updatedAt:
              firestoreTimestampToNumber(
                data.updatedAt
              )
          }
        );
      }
    );


    // --------------------------------------------------------
    // FOOTBALL MEMORY
    // --------------------------------------------------------

    footballSnapshot.forEach(
      document => {

        const data =
          document.data();

        const store = {
          teams:
            new Map(),

          competitions:
            new Map(),

          conversations:
            Array.isArray(
              data.conversations
            )
              ? data.conversations
              : [],

          preferences:
            data.preferences &&
            typeof data.preferences ===
              "object"
              ? data.preferences
              : {},

          updatedAt:
            firestoreTimestampToNumber(
              data.updatedAt
            )
        };


        if (
          Array.isArray(
            data.teams
          )
        ) {
          for (
            const item
            of data.teams
          ) {
            if (
              item &&
              item.key &&
              item.value
            ) {
              store.teams.set(
                item.key,
                item.value
              );
            }
          }
        }


        if (
          Array.isArray(
            data.competitions
          )
        ) {
          for (
            const item
            of data.competitions
          ) {
            if (
              item &&
              item.key &&
              item.value
            ) {
              store.competitions.set(
                item.key,
                item.value
              );
            }
          }
        }


        footballMemory.set(
          document.id,
          store
        );
      }
    );


    firebaseHydrationComplete =
      true;

    console.log(
      "Zed AI memory restored from Firestore:",
      {
        conversations:
          conversations.size,

        memories:
          memories.size,

        projects:
          projects.size,

        footballUsers:
          footballMemory.size
      }
    );

  } catch (error) {

    console.error(
      "Firestore memory hydration error:",
      error.message
    );

    firebaseHydrationComplete =
      true;
  }
}


// ============================================================
// NORMALIZATION HELPERS
// ============================================================

function normalizeText(
  value = ""
) {
  return String(value)
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim();
}


function normalizeKey(
  value = ""
) {
  return normalizeText(value)
    .toLowerCase();
}


function safeNumber(
  value,
  fallback,
  minimum,
  maximum
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      number
    )
  );
}


function clamp01(
  value
) {
  return safeNumber(
    value,
    0,
    0,
    1
  );
}


function truncateText(
  value = "",
  maximum = MAX_MEMORY_TEXT_LENGTH
) {
  const text =
    normalizeText(value);

  if (
    text.length <=
    maximum
  ) {
    return text;
  }

  return (
    text.slice(
      0,
      maximum - 3
    ) + "..."
  );
}


function now() {
  return Date.now();
}


// ============================================================
// MEMORY CATEGORIES
// ============================================================

export const MEMORY_CATEGORIES =
  Object.freeze([
    "personal",
    "preference",
    "goal",
    "interest",
    "project",
    "business",
    "education",
    "work",
    "location",
    "skill",
    "relationship",
    "device",
    "communication",
    "football",
    "instruction",
    "important",
    "general"
  ]);


function normalizeCategory(
  category = "general"
) {
  const value =
    normalizeKey(
      category
    );

  if (
    MEMORY_CATEGORIES.includes(
      value
    )
  ) {
    return value;
  }

  return "general";
}


// ============================================================
// MEMORY TYPES
// ============================================================

export const MEMORY_TYPES =
  Object.freeze([
    "fact",
    "preference",
    "goal",
    "project",
    "instruction",
    "interest",
    "profile",
    "event",
    "football",
    "summary",
    "general"
  ]);


function normalizeMemoryType(
  type = "fact"
) {
  const value =
    normalizeKey(type);

  if (
    MEMORY_TYPES.includes(
      value
    )
  ) {
    return value;
  }

  return "fact";
}


// ============================================================
// USER KEY
// ============================================================

function normalizeUserId(
  userId
) {
  const value =
    normalizeText(
      userId
    );

  if (!value) {
    return null;
  }

  return value;
}


// ============================================================
// CONVERSATION PERSISTENCE
// ============================================================

function persistConversation(
  conversation
) {
  if (
    !conversation
  ) {
    return;
  }

  firestoreWrite(
    "zedConversations",
    conversation.id,
    conversation
  );
}


// ============================================================
// CONVERSATION CREATION
// ============================================================

export function getConversation(
  conversationId
) {
  let id =
    normalizeText(
      conversationId
    );

  if (!id) {
    id = randomUUID();
  }

  let conversation =
    conversations.get(id);

  if (!conversation) {

    conversation = {
      id,

      messages: [],

      createdAt:
        now(),

      updatedAt:
        now(),

      summary: "",

      metadata: {}
    };

    conversations.set(
      id,
      conversation
    );

    persistConversation(
      conversation
    );
  }

  conversation.updatedAt =
    now();

  return conversation;
}


// ============================================================
// ADD CONVERSATION MESSAGE
// ============================================================

export function addMessage(
  conversation,
  role,
  content
) {
  if (
    !conversation
  ) {
    return null;
  }

  const text =
    normalizeText(
      content
    );

  if (!text) {
    return null;
  }

  const normalizedRole =
    role === "assistant"
      ? "assistant"
      : "user";

  const message = {
    id:
      randomUUID(),

    role:
      normalizedRole,

    content:
      text,

    timestamp:
      now()
  };

  if (
    !Array.isArray(
      conversation.messages
    )
  ) {
    conversation.messages =
      [];
  }

  conversation.messages.push(
    message
  );

  if (
    conversation.messages.length >
    MAX_HISTORY_MESSAGES
  ) {
    conversation.messages =
      conversation.messages.slice(
        -MAX_HISTORY_MESSAGES
      );
  }

  conversation.updatedAt =
    now();

  persistConversation(
    conversation
  );

  return message;
}


// ============================================================
// GET CONVERSATION HISTORY
// ============================================================

export function getConversationHistory(
  conversationId
) {
  const id =
    normalizeText(
      conversationId
    );

  if (!id) {
    return [];
  }

  const conversation =
    conversations.get(id);

  if (!conversation) {
    return [];
  }

  return conversation.messages
    .map(
      message => ({
        ...message
      })
    );
}


// ============================================================
// GET FULL CONVERSATION
// ============================================================

export function getConversationDetails(
  conversationId
) {
  const id =
    normalizeText(
      conversationId
    );

  if (!id) {
    return null;
  }

  const conversation =
    conversations.get(id);

  if (!conversation) {
    return null;
  }

  return {
    ...conversation,

    messages:
      conversation.messages.map(
        message => ({
          ...message
        })
      )
  };
}


// ============================================================
// DELETE CONVERSATION
// ============================================================

export function deleteConversation(
  conversationId
) {
  const id =
    normalizeText(
      conversationId
    );

  if (!id) {
    return false;
  }

  const deleted =
    conversations.delete(
      id
    );

  if (deleted) {
    firestoreDelete(
      "zedConversations",
      id
    );
  }

  return deleted;
}


// ============================================================
// CONVERSATION COUNT
// ============================================================

export function getConversationCount() {
  return conversations.size;
}


// ============================================================
// CLEAR ALL CONVERSATIONS
// ============================================================

export function clearConversations() {
  const count =
    conversations.size;

  if (firestore) {
    for (
      const id
      of conversations.keys()
    ) {
      firestoreDelete(
        "zedConversations",
        id
      );
    }
  }

  conversations.clear();

  return count;
}


// ============================================================
// CONVERSATION SUMMARY
// ============================================================

export function setConversationSummary(
  conversationId,
  summary
) {
  const id =
    normalizeText(
      conversationId
    );

  const conversation =
    conversations.get(id);

  if (!conversation) {
    return false;
  }

  conversation.summary =
    truncateText(
      summary,
      MAX_SUMMARY_LENGTH
    );

  conversation.updatedAt =
    now();

  persistConversation(
    conversation
  );

  return true;
}


export function getConversationSummary(
  conversationId
) {
  const id =
    normalizeText(
      conversationId
    );

  const conversation =
    conversations.get(id);

  if (!conversation) {
    return "";
  }

  return conversation.summary ||
    "";
}


// ============================================================
// USER MEMORY INDEX
// ============================================================

function ensureUserIndex(
  userId
) {
  const id =
    normalizeUserId(
      userId
    );

  if (!id) {
    return null;
  }

  if (
    !userMemoryIndex.has(id)
  ) {
    userMemoryIndex.set(
      id,
      new Set()
    );
  }

  return userMemoryIndex.get(
    id
  );
}


// ============================================================
// CREATE MEMORY OBJECT
// ============================================================

function createMemoryObject({
  userId,
  content,
  category,
  type,
  importance,
  confidence,
  source,
  projectId,
  tags,
  metadata
}) {
  const normalizedUserId =
    normalizeUserId(
      userId
    );

  if (!normalizedUserId) {
    throw new Error(
      "A userId is required for long-term memory."
    );
  }

  const text =
    truncateText(
      content
    );

  if (!text) {
    throw new Error(
      "Memory content cannot be empty."
    );
  }

  const timestamp =
    now();

  return {
    id:
      randomUUID(),

    userId:
      normalizedUserId,

    content:
      text,

    category:
      normalizeCategory(
        category
      ),

    type:
      normalizeMemoryType(
        type
      ),

    importance:
      safeNumber(
        importance,
        MEMORY_DEFAULT_IMPORTANCE,
        0,
        100
      ),

    confidence:
      clamp01(
        confidence ??
        MEMORY_DEFAULT_CONFIDENCE
      ),

    source:
      normalizeText(
        source ||
        "conversation"
      ),

    projectId:
      normalizeText(
        projectId ||
        ""
      ) || null,

    tags:
      normalizeTags(
        tags
      ),

    metadata:
      metadata &&
      typeof metadata ===
        "object"
        ? {
            ...metadata
          }
        : {},

    createdAt:
      timestamp,

    updatedAt:
      timestamp,

    lastUsedAt:
      null,

    usageCount:
      0,

    active:
      true
  };
}


// ============================================================
// TAG NORMALIZATION
// ============================================================

function normalizeTags(
  tags
) {
  if (
    !Array.isArray(tags)
  ) {
    if (
      typeof tags ===
        "string" &&
      tags.trim()
    ) {
      tags =
        tags.split(",");
    } else {
      return [];
    }
  }

  return [
    ...new Set(
      tags
        .map(
          tag =>
            normalizeKey(
              tag
            )
        )
        .filter(Boolean)
        .slice(0, 30)
    )
  ];
}


// ============================================================
// MEMORY DUPLICATE SIGNATURE
// ============================================================

function memorySignature(
  memory
) {
  return [
    normalizeKey(
      memory.userId
    ),
    normalizeKey(
      memory.category
    ),
    normalizeKey(
      memory.content
    ),
    normalizeKey(
      memory.projectId ||
      ""
    )
  ].join("|");
}


// ============================================================
// SIMILARITY TOKENIZATION
// ============================================================

function tokenize(
  text
) {
  return [
    ...new Set(
      normalizeKey(
        text
      )
        .replace(
          /[^a-z0-9\s]/g,
          " "
        )
        .split(/\s+/)
        .filter(
          token =>
            token.length >= 2
        )
    )
  ];
}


// ============================================================
// TOKEN SIMILARITY
// ============================================================

function tokenSimilarity(
  first,
  second
) {
  const a =
    new Set(
      tokenize(first)
    );

  const b =
    new Set(
      tokenize(second)
    );

  if (
    a.size === 0 ||
    b.size === 0
  ) {
    return 0;
  }

  let intersection = 0;

  for (
    const token
    of a
  ) {
    if (
      b.has(token)
    ) {
      intersection++;
    }
  }

  const union =
    new Set([
      ...a,
      ...b
    ]).size;

  if (!union) {
    return 0;
  }

  return (
    intersection /
    union
  );
}


// ============================================================
// FIND SIMILAR MEMORY
// ============================================================

function findSimilarMemory(
  userId,
  content,
  category,
  projectId
) {
  const index =
    ensureUserIndex(
      userId
    );

  if (!index) {
    return null;
  }

  let bestMemory =
    null;

  let bestScore = 0;

  for (
    const memoryId
    of index
  ) {
    const memory =
      memories.get(
        memoryId
      );

    if (
      !memory ||
      !memory.active
    ) {
      continue;
    }

    if (
      category &&
      memory.category !==
        normalizeCategory(
          category
        )
    ) {
      continue;
    }

    if (
      projectId &&
      memory.projectId !==
        projectId
    ) {
      continue;
    }

    const score =
      tokenSimilarity(
        memory.content,
        content
      );

    if (
      score > bestScore
    ) {
      bestScore =
        score;

      bestMemory =
        memory;
    }
  }

  if (
    bestScore >= 0.72
  ) {
    return bestMemory;
  }

  return null;
}


// ============================================================
// PERSIST MEMORY
// ============================================================

function persistMemory(
  memory
) {
  if (
    !memory
  ) {
    return;
  }

  firestoreWrite(
    "zedMemories",
    memory.id,
    memory
  );
}


// ============================================================
// SAVE LONG-TERM MEMORY
// ============================================================

export function remember({
  userId,
  content,
  category = "general",
  type = "fact",
  importance = MEMORY_DEFAULT_IMPORTANCE,
  confidence = MEMORY_DEFAULT_CONFIDENCE,
  source = "conversation",
  projectId = null,
  tags = [],
  metadata = {},
  updateExisting = true
} = {}) {
  const normalizedUserId =
    normalizeUserId(
      userId
    );

  if (!normalizedUserId) {
    throw new Error(
      "userId is required."
    );
  }

  const text =
    truncateText(
      content
    );

  if (!text) {
    return {
      created: false,
      updated: false,
      memory: null,
      reason:
        "empty-content"
    };
  }

  const existing =
    updateExisting
      ? findSimilarMemory(
          normalizedUserId,
          text,
          category,
          projectId
        )
      : null;

  if (existing) {

    existing.content =
      text;

    existing.category =
      normalizeCategory(
        category
      );

    existing.type =
      normalizeMemoryType(
        type
      );

    existing.importance =
      Math.max(
        existing.importance,
        safeNumber(
          importance,
          MEMORY_DEFAULT_IMPORTANCE,
          0,
          100
        )
      );

    existing.confidence =
      Math.max(
        existing.confidence,
        clamp01(
          confidence
        )
      );

    existing.updatedAt =
      now();

    existing.lastUsedAt =
      now();

    existing.tags = [
      ...new Set([
        ...existing.tags,
        ...normalizeTags(
          tags
        )
      ])
    ];

    existing.metadata = {
      ...existing.metadata,
      ...(
        metadata &&
        typeof metadata ===
          "object"
          ? metadata
          : {}
      )
    };

    persistMemory(
      existing
    );

    return {
      created: false,
      updated: true,
      memory: {
        ...existing
      },
      reason:
        "updated-existing"
    };
  }


  const memory =
    createMemoryObject({
      userId:
        normalizedUserId,

      content:
        text,

      category,

      type,

      importance,

      confidence,

      source,

      projectId,

      tags,

      metadata
    });


  memories.set(
    memory.id,
    memory
  );


  const index =
    ensureUserIndex(
      normalizedUserId
    );

  index.add(
    memory.id
  );


  persistMemory(
    memory
  );


  enforceUserMemoryLimit(
    normalizedUserId
  );

  enforceGlobalMemoryLimit();


  return {
    created: true,
    updated: false,
    memory: {
      ...memory
    },
    reason:
      "created"
  };
}


// ============================================================
// GET MEMORY
// ============================================================

export function getMemory(
  memoryId
) {
  const id =
    normalizeText(
      memoryId
    );

  if (!id) {
    return null;
  }

  const memory =
    memories.get(id);

  if (!memory) {
    return null;
  }

  return {
    ...memory,

    tags: [
      ...memory.tags
    ],

    metadata: {
      ...memory.metadata
    }
  };
}


// ============================================================
// UPDATE MEMORY
// ============================================================

export function updateMemory(
  memoryId,
  updates = {}
) {
  const id =
    normalizeText(
      memoryId
    );

  const memory =
    memories.get(id);

  if (!memory) {
    return null;
  }

  if (
    updates.content !==
    undefined
  ) {
    const content =
      truncateText(
        updates.content
      );

    if (content) {
      memory.content =
        content;
    }
  }

  if (
    updates.category !==
    undefined
  ) {
    memory.category =
      normalizeCategory(
        updates.category
      );
  }

  if (
    updates.type !==
    undefined
  ) {
    memory.type =
      normalizeMemoryType(
        updates.type
      );
  }

  if (
    updates.importance !==
    undefined
  ) {
    memory.importance =
      safeNumber(
        updates.importance,
        memory.importance,
        0,
        100
      );
  }

  if (
    updates.confidence !==
    undefined
  ) {
    memory.confidence =
      clamp01(
        updates.confidence
      );
  }

  if (
    updates.tags !==
    undefined
  ) {
    memory.tags =
      normalizeTags(
        updates.tags
      );
  }

  if (
    updates.projectId !==
    undefined
  ) {
    memory.projectId =
      normalizeText(
        updates.projectId ||
        ""
      ) || null;
  }

  if (
    updates.metadata &&
    typeof updates.metadata ===
      "object"
  ) {
    memory.metadata = {
      ...memory.metadata,
      ...updates.metadata
    };
  }

  memory.updatedAt =
    now();

  persistMemory(
    memory
  );

  return {
    ...memory
  };
}


// ============================================================
// FORGET MEMORY
// ============================================================

export function forgetMemory(
  memoryId
) {
  const id =
    normalizeText(
      memoryId
    );

  const memory =
    memories.get(id);

  if (!memory) {
    return false;
  }

  memories.delete(id);

  const index =
    userMemoryIndex.get(
      memory.userId
    );

  if (index) {
    index.delete(id);
  }

  firestoreDelete(
    "zedMemories",
    id
  );

  return true;
}


// ============================================================
// FORGET ALL USER MEMORY
// ============================================================

export function forgetUserMemories(
  userId
) {
  const normalizedUserId =
    normalizeUserId(
      userId
    );

  if (!normalizedUserId) {
    return 0;
  }

  const index =
    userMemoryIndex.get(
      normalizedUserId
    );

  if (!index) {
    return 0;
  }

  let deleted = 0;

  for (
    const memoryId
    of [
      ...index
    ]
  ) {

    if (
      memories.delete(
        memoryId
      )
    ) {

      firestoreDelete(
        "zedMemories",
        memoryId
      );

      deleted++;
    }
  }

  userMemoryIndex.delete(
    normalizedUserId
  );

  return deleted;
}


// ============================================================
// GET USER MEMORIES
// ============================================================

export function getUserMemories(
  userId,
  options = {}
) {
  const normalizedUserId =
    normalizeUserId(
      userId
    );

  if (!normalizedUserId) {
    return [];
  }

  const index =
    userMemoryIndex.get(
      normalizedUserId
    );

  if (!index) {
    return [];
  }

  const category =
    options.category
      ? normalizeCategory(
          options.category
        )
      : null;

  const type =
    options.type
      ? normalizeMemoryType(
          options.type
        )
      : null;

  const projectId =
    normalizeText(
      options.projectId ||
      ""
    ) || null;

  const includeInactive =
    options.includeInactive ===
    true;

  const results = [];

  for (
    const memoryId
    of index
  ) {

    const memory =
      memories.get(
        memoryId
      );

    if (!memory) {
      continue;
    }

    if (
      !includeInactive &&
      !memory.active
    ) {
      continue;
    }

    if (
      category &&
      memory.category !==
        category
    ) {
      continue;
    }

    if (
      type &&
      memory.type !==
        type
    ) {
      continue;
    }

    if (
      projectId &&
      memory.projectId !==
        projectId
    ) {
      continue;
    }

    results.push({
      ...memory
    });
  }

  results.sort(
    compareMemories
  );

  const limit =
    Number.isFinite(
      Number(options.limit)
    )
      ? Math.max(
          1,
          Number(
            options.limit
          )
        )
      : 100;

  return results.slice(
    0,
    limit
  );
}


// ============================================================
// MEMORY COMPARISON
// ============================================================

function compareMemories(
  a,
  b
) {
  const importanceDifference =
    b.importance -
    a.importance;

  if (
    importanceDifference !==
    0
  ) {
    return importanceDifference;
  }

  const confidenceDifference =
    b.confidence -
    a.confidence;

  if (
    confidenceDifference !==
    0
  ) {
    return confidenceDifference;
  }

  return (
    b.updatedAt -
    a.updatedAt
  );
}


// ============================================================
// SEARCH USER MEMORIES
// ============================================================

export function searchMemories(
  userId,
  query,
  options = {}
) {
  const text =
    normalizeText(
      query
    );

  if (!text) {
    return [];
  }

  const memoriesForUser =
    getUserMemories(
      userId,
      {
        ...options,
        limit:
          MAX_MEMORIES_PER_USER
      }
    );

  const results =
    memoriesForUser
      .map(
        memory => {

          const relevance =
            calculateMemoryRelevance(
              memory,
              text
            );

          return {
            ...memory,
            relevance
          };
        }
      )
      .filter(
        memory =>
          memory.relevance >=
          (
            options.threshold ??
            MEMORY_RELEVANCE_THRESHOLD
          )
      )
      .sort(
        (a, b) =>
          b.relevance -
          a.relevance
      );

  const limit =
    Number.isFinite(
      Number(options.limit)
    )
      ? Math.max(
          1,
          Number(options.limit)
        )
      : 20;

  return results.slice(
    0,
    limit
  );
}


// ============================================================
// MEMORY RELEVANCE
// ============================================================

export function calculateMemoryRelevance(
  memory,
  query
) {
  if (
    !memory ||
    !query
  ) {
    return 0;
  }

  const contentScore =
    tokenSimilarity(
      memory.content,
      query
    );

  const tagScore =
    tokenSimilarity(
      memory.tags.join(" "),
      query
    );

  const categoryScore =
    tokenSimilarity(
      memory.category,
      query
    );

  const typeScore =
    tokenSimilarity(
      memory.type,
      query
    );

  const recencyScore =
    calculateRecencyScore(
      memory.updatedAt
    );

  const importanceScore =
    memory.importance /
    100;

  const confidenceScore =
    clamp01(
      memory.confidence
    );


  let score =
    contentScore * 0.50 +
    tagScore * 0.15 +
    categoryScore * 0.05 +
    typeScore * 0.05 +
    recencyScore * 0.10 +
    importanceScore * 0.10 +
    confidenceScore * 0.05;


  if (
    memory.lastUsedAt
  ) {
    const usageBoost =
      Math.min(
        (
          memory.usageCount ||
          0
        ) * 0.005,
        0.05
      );

    score +=
      usageBoost;
  }

  return clamp01(
    score
  );
}


// ============================================================
// RECENCY SCORE
// ============================================================

function calculateRecencyScore(
  timestamp
) {
  if (
    !timestamp
  ) {
    return 0;
  }

  const age =
    Math.max(
      0,
      now() -
        timestamp
    );

  const days =
    age /
    (
      1000 *
      60 *
      60 *
      24
    );

  return Math.exp(
    -days / 180
  );
}


// ============================================================
// RETRIEVE RELEVANT MEMORIES
// ============================================================

export function retrieveRelevantMemories(
  userId,
  query,
  options = {}
) {
  const results =
    searchMemories(
      userId,
      query,
      options
    );

  for (
    const memory
    of results
  ) {

    const stored =
      memories.get(
        memory.id
      );

    if (!stored) {
      continue;
    }

    stored.lastUsedAt =
      now();

    stored.usageCount =
      (
        stored.usageCount ||
        0
      ) + 1;

    persistMemory(
      stored
    );
  }

  return results;
}


// ============================================================
// BUILD MEMORY CONTEXT
// ============================================================

export function buildMemoryContext(
  userId,
  query,
  options = {}
) {
  const memoriesFound =
    retrieveRelevantMemories(
      userId,
      query,
      {
        limit:
          options.limit ||
          12,

        threshold:
          options.threshold ??
          MEMORY_RELEVANCE_THRESHOLD
      }
    );

  if (
    memoriesFound.length ===
    0
  ) {
    return "";
  }

  return memoriesFound
    .map(
      memory =>
        `- ${memory.content}`
    )
    .join("\n");
}


// ============================================================
// MEMORY EXTRACTION: EXPLICIT REMEMBER
// ============================================================

export function detectRememberRequest(
  message = ""
) {
  const text =
    normalizeText(
      message
    );

  if (!text) {
    return null;
  }

  const patterns = [
    /^remember(?:\s+that)?\s+(.+)$/i,

    /^please remember(?:\s+that)?\s+(.+)$/i,

    /^don't forget(?:\s+that)?\s+(.+)$/i,

    /^save this(?:\s+for me)?[:\s]+(.+)$/i,

    /^keep this in mind[:\s]+(.+)$/i
  ];

  for (
    const pattern
    of patterns
  ) {

    const match =
      text.match(
        pattern
      );

    if (
      match &&
      match[1]
    ) {
      return {
        explicit:
          true,

        content:
          normalizeText(
            match[1]
          )
      };
    }
  }

  return null;
}


// ============================================================
// MEMORY EXTRACTION: FORGET
// ============================================================

export function detectForgetRequest(
  message = ""
) {
  const text =
    normalizeText(
      message
    );

  if (!text) {
    return null;
  }

  const patterns = [
    /^forget(?:\s+that)?\s+(.+)$/i,

    /^please forget(?:\s+that)?\s+(.+)$/i,

    /^don't remember(?:\s+that)?\s+(.+)$/i,

    /^remove(?:\s+from memory)?[:\s]+(.+)$/i
  ];

  for (
    const pattern
    of patterns
  ) {

    const match =
      text.match(
        pattern
      );

    if (
      match &&
      match[1]
    ) {
      return {
        explicit:
          true,

        query:
          normalizeText(
            match[1]
          )
      };
    }
  }

  return null;
}


// ============================================================
// AUTOMATIC MEMORY CANDIDATE DETECTION
// ============================================================

export function extractMemoryCandidate(
  message = ""
) {
  const text =
    normalizeText(
      message
    );

  if (!text) {
    return null;
  }

  const lower =
    text.toLowerCase();


  // NAME

  const nameMatch =
    text.match(
      /\bmy name is\s+([^.!?]+)/i
    );

  if (nameMatch) {
    return {
      content:
        `User's name is ${normalizeText(
          nameMatch[1]
        )}.`,

      category:
        "personal",

      type:
        "profile",

      importance:
        95,

      confidence:
        0.98
    };
  }


  // PREFERENCES

  const preferencePatterns = [
    {
      pattern:
        /\bi (?:like|love|prefer)\s+([^.!?]+)/i,

      category:
        "preference",

      importance:
        75
    },

    {
      pattern:
        /\bi (?:don't like|dislike|hate)\s+([^.!?]+)/i,

      category:
        "preference",

      importance:
        75
    }
  ];


  for (
    const item
    of preferencePatterns
  ) {

    const match =
      lower.match(
        item.pattern
      );

    if (
      match &&
      match[1]
    ) {
      return {
        content:
          text,

        category:
          item.category,

        type:
          "preference",

        importance:
          item.importance,

        confidence:
          0.85
      };
    }
  }


  // GOALS

  const goalPatterns = [
    /\bmy goal is\s+(.+)/i,

    /\bi want to\s+(.+)/i,

    /\bi plan to\s+(.+)/i,

    /\bi'm planning to\s+(.+)/i
  ];


  for (
    const pattern
    of goalPatterns
  ) {

    const match =
      text.match(
        pattern
      );

    if (
      match &&
      match[1]
    ) {
      return {
        content:
          text,

        category:
          "goal",

        type:
          "goal",

        importance:
          80,

        confidence:
          0.80
      };
    }
  }


  // PROJECT

  const projectPatterns = [
    /\bi'm building\s+(.+)/i,

    /\bi am building\s+(.+)/i,

    /\bmy project is\s+(.+)/i,

    /\bi'm working on\s+(.+)/i
  ];


  for (
    const pattern
    of projectPatterns
  ) {

    const match =
      text.match(
        pattern
      );

    if (
      match &&
      match[1]
    ) {
      return {
        content:
          text,

        category:
          "project",

        type:
          "project",

        importance:
          85,

        confidence:
          0.82
      };
    }
  }


  // BUSINESS

  const businessPatterns = [
    /\bmy business is\s+(.+)/i,

    /\bi run a business\s+(.+)/i,

    /\bi own a business\s+(.+)/i,

    /\bmy company is\s+(.+)/i
  ];


  for (
    const pattern
    of businessPatterns
  ) {

    const match =
      text.match(
        pattern
      );

    if (
      match &&
      match[1]
    ) {
      return {
        content:
          text,

        category:
          "business",

        type:
          "fact",

        importance:
          85,

        confidence:
          0.82
      };
    }
  }


  // SKILLS

  const skillPatterns = [
    /\bi can\s+(.+)/i,

    /\bi know how to\s+(.+)/i,

    /\bmy skill is\s+(.+)/i
  ];


  for (
    const pattern
    of skillPatterns
  ) {

    const match =
      text.match(
        pattern
      );

    if (
      match &&
      match[1]
    ) {
      return {
        content:
          text,

        category:
          "skill",

        type:
          "fact",

        importance:
          65,

        confidence:
          0.78
      };
    }
  }


  // FOOTBALL

  const footballWords = [
    "arsenal",
    "chelsea",
    "liverpool",
    "manchester united",
    "manchester city",
    "barcelona",
    "real madrid",
    "bayern",
    "psg",
    "football",
    "soccer"
  ];


  const footballMentioned =
    footballWords.some(
      word =>
        lower.includes(
          word
        )
    );


  if (
    footballMentioned &&
    (
      lower.includes(
        "my favourite"
      ) ||
      lower.includes(
        "my favorite"
      ) ||
      lower.includes(
        "i support"
      ) ||
      lower.includes(
        "i follow"
      )
    )
  ) {
    return {
      content:
        text,

      category:
        "football",

      type:
        "football",

      importance:
        65,

      confidence:
        0.80
    };
  }


  return null;
}


// ============================================================
// SAVE EXTRACTED MEMORY
// ============================================================

export function rememberFromMessage(
  userId,
  message,
  options = {}
) {
  const explicit =
    detectRememberRequest(
      message
    );

  if (explicit) {

    return remember({
      userId,

      content:
        explicit.content,

      category:
        options.category ||
        "general",

      type:
        options.type ||
        "fact",

      importance:
        options.importance ||
        90,

      confidence:
        0.98,

      source:
        "explicit-user-request",

      projectId:
        options.projectId,

      tags:
        options.tags
    });
  }


  const candidate =
    extractMemoryCandidate(
      message
    );

  if (!candidate) {
    return {
      created:
        false,

      updated:
        false,

      memory:
        null,

      reason:
        "no-memory-candidate"
    };
  }


  if (
    options.minimumImportance &&
    candidate.importance <
      options.minimumImportance
  ) {
    return {
      created:
        false,

      updated:
        false,

      memory:
        null,

      reason:
        "importance-too-low"
    };
  }


  return remember({
    userId,

    content:
      candidate.content,

    category:
      candidate.category,

    type:
      candidate.type,

    importance:
      candidate.importance,

    confidence:
      candidate.confidence,

    source:
      "automatic-extraction",

    projectId:
      options.projectId,

    tags:
      options.tags
  });
}


// ============================================================
// MEMORY STATISTICS
// ============================================================

export function getMemoryStats(
  userId
) {
  const normalizedUserId =
    normalizeUserId(
      userId
    );

  if (!normalizedUserId) {
    return {
      total:
        0,

      active:
        0,

      categories:
        {},

      types:
        {}
    };
  }

  const userMemories =
    getUserMemories(
      normalizedUserId,
      {
        includeInactive:
          true,

        limit:
          MAX_MEMORIES_PER_USER
      }
    );

  const categories = {};

  const types = {};

  let active = 0;


  for (
    const memory
    of userMemories
  ) {

    categories[
      memory.category
    ] =
      (
        categories[
          memory.category
        ] || 0
      ) + 1;

    types[
      memory.type
    ] =
      (
        types[
          memory.type
        ] || 0
      ) + 1;

    if (
      memory.active
    ) {
      active++;
    }
  }


  return {
    total:
      userMemories.length,

    active,

    inactive:
      userMemories.length -
      active,

    categories,

    types
  };
}


// ============================================================
// PROJECT PERSISTENCE
// ============================================================

function persistProject(
  project
) {
  if (
    !project
  ) {
    return;
  }

  firestoreWrite(
    "zedProjects",
    project.id,
    project
  );
}


// ============================================================
// PROJECT MEMORY
// ============================================================

export function createProject({
  userId,
  name,
  description = "",
  metadata = {}
} = {}) {
  const normalizedUserId =
    normalizeUserId(
      userId
    );

  const projectName =
    normalizeText(
      name
    );

  if (
    !normalizedUserId ||
    !projectName
  ) {
    return null;
  }

  const project = {
    id:
      randomUUID(),

    userId:
      normalizedUserId,

    name:
      projectName,

    description:
      truncateText(
        description,
        1000
      ),

    metadata:
      metadata &&
      typeof metadata ===
        "object"
        ? {
            ...metadata
          }
        : {},

    createdAt:
      now(),

    updatedAt:
      now()
  };


  projects.set(
    project.id,
    project
  );

  persistProject(
    project
  );


  return {
    ...project
  };
}


// ============================================================
// GET PROJECT
// ============================================================

export function getProject(
  projectId
) {
  const id =
    normalizeText(
      projectId
    );

  const project =
    projects.get(id);

  if (!project) {
    return null;
  }

  return {
    ...project
  };
}


// ============================================================
// GET USER PROJECTS
// ============================================================

export function getUserProjects(
  userId
) {
  const normalizedUserId =
    normalizeUserId(
      userId
    );

  if (!normalizedUserId) {
    return [];
  }

  return [
    ...projects.values()
  ]
    .filter(
      project =>
        project.userId ===
        normalizedUserId
    )
    .sort(
      (a, b) =>
        b.updatedAt -
        a.updatedAt
    )
    .map(
      project => ({
        ...project
      })
    );
}


// ============================================================
// UPDATE PROJECT
// ============================================================

export function updateProject(
  projectId,
  updates = {}
) {
  const id =
    normalizeText(
      projectId
    );

  const project =
    projects.get(id);

  if (!project) {
    return null;
  }

  if (
    updates.name !==
    undefined
  ) {
    const name =
      normalizeText(
        updates.name
      );

    if (name) {
      project.name =
        name;
    }
  }

  if (
    updates.description !==
    undefined
  ) {
    project.description =
      truncateText(
        updates.description,
        1000
      );
  }

  if (
    updates.metadata &&
    typeof updates.metadata ===
      "object"
  ) {
    project.metadata = {
      ...project.metadata,
      ...updates.metadata
    };
  }

  project.updatedAt =
    now();

  persistProject(
    project
  );

  return {
    ...project
  };
}


// ============================================================
// DELETE PROJECT
// ============================================================

export function deleteProject(
  projectId
) {
  const id =
    normalizeText(
      projectId
    );

  const project =
    projects.get(id);

  if (!project) {
    return false;
  }


  const userIndex =
    userMemoryIndex.get(
      project.userId
    );


  if (userIndex) {

    for (
      const memoryId
      of [
        ...userIndex
      ]
    ) {

      const memory =
        memories.get(
          memoryId
        );

      if (
        memory &&
        memory.projectId ===
          id
      ) {

        memories.delete(
          memoryId
        );

        userIndex.delete(
          memoryId
        );

        firestoreDelete(
          "zedMemories",
          memoryId
        );
      }
    }
  }


  const deleted =
    projects.delete(
      id
    );

  if (deleted) {
    firestoreDelete(
      "zedProjects",
      id
    );
  }

  return deleted;
}


// ============================================================
// PROJECT MEMORY
// ============================================================

export function rememberProject({
  userId,
  projectId,
  content,
  category = "project",
  type = "project",
  importance = 80,
  confidence = 0.85,
  tags = [],
  metadata = {}
} = {}) {
  const project =
    getProject(
      projectId
    );

  if (!project) {
    return {
      created:
        false,

      updated:
        false,

      memory:
        null,

      reason:
        "project-not-found"
    };
  }

  if (
    project.userId !==
    normalizeUserId(
      userId
    )
  ) {
    return {
      created:
        false,

      updated:
        false,

      memory:
        null,

      reason:
        "user-mismatch"
    };
  }

  return remember({
    userId,

    content,

    category,

    type,

    importance,

    confidence,

    source:
      "project",

    projectId,

    tags,

    metadata
  });
}


// ============================================================
// FOOTBALL MEMORY
// ============================================================

function ensureFootballUser(
  userId
) {
  const id =
    normalizeUserId(
      userId
    );

  if (!id) {
    return null;
  }

  if (
    !footballMemory.has(id)
  ) {
    footballMemory.set(
      id,
      {
        teams:
          new Map(),

        competitions:
          new Map(),

        conversations:
          [],

        preferences:
          {},

        updatedAt:
          now()
      }
    );
  }

  return footballMemory.get(
    id
  );
}


function persistFootballMemory(
  userId
) {
  const store =
    footballMemory.get(
      userId
    );

  if (
    !store
  ) {
    return;
  }

  firestoreWrite(
    "zedFootballMemory",
    userId,
    {
      teams:
        [
          ...store.teams.entries()
        ].map(
          ([
            key,
            value
          ]) => ({
            key,
            value
          })
        ),

      competitions:
        [
          ...store.competitions.entries()
        ].map(
          ([
            key,
            value
          ]) => ({
            key,
            value
          })
        ),

      conversations:
        store.conversations,

      preferences:
        store.preferences,

      updatedAt:
        store.updatedAt
    }
  );
}


// ============================================================
// REMEMBER FOOTBALL TEAM
// ============================================================

export function rememberFootballTeam({
  userId,
  teamId = "",
  teamName,
  league = "",
  country = "",
  metadata = {}
} = {}) {
  const store =
    ensureFootballUser(
      userId
    );

  const name =
    normalizeText(
      teamName
    );

  if (
    !store ||
    !name
  ) {
    return null;
  }

  const key =
    normalizeKey(
      teamId ||
      name
    );

  const existing =
    store.teams.get(
      key
    );

  const team = {
    id:
      teamId ||
      existing?.id ||
      null,

    name,

    league:
      normalizeText(
        league
      ),

    country:
      normalizeText(
        country
      ),

    metadata: {
      ...(existing?.metadata ||
        {}),

      ...(
        metadata &&
        typeof metadata ===
          "object"
          ? metadata
          : {}
      )
    },

    firstSeenAt:
      existing?.firstSeenAt ||
      now(),

    lastSeenAt:
      now(),

    mentionCount:
      (
        existing?.mentionCount ||
        0
      ) + 1
  };


  store.teams.set(
    key,
    team
  );

  store.updatedAt =
    now();

  persistFootballMemory(
    normalizeUserId(
      userId
    )
  );

  return {
    ...team
  };
}


// ============================================================
// GET FOOTBALL TEAMS
// ============================================================

export function getFootballTeams(
  userId
) {
  const store =
    ensureFootballUser(
      userId
    );

  if (!store) {
    return [];
  }

  return [
    ...store.teams.values()
  ]
    .sort(
      (a, b) =>
        b.mentionCount -
        a.mentionCount
    )
    .map(
      team => ({
        ...team
      })
    );
}


// ============================================================
// REMEMBER FOOTBALL COMPETITION
// ============================================================

export function rememberFootballCompetition({
  userId,
  competitionId = "",
  competitionName,
  country = "",
  metadata = {}
} = {}) {
  const store =
    ensureFootballUser(
      userId
    );

  const name =
    normalizeText(
      competitionName
    );

  if (
    !store ||
    !name
  ) {
    return null;
  }

  const key =
    normalizeKey(
      competitionId ||
      name
    );

  const existing =
    store.competitions.get(
      key
    );

  const competition = {
    id:
      competitionId ||
      existing?.id ||
      null,

    name,

    country:
      normalizeText(
        country
      ),

    metadata: {
      ...(existing?.metadata ||
        {}),

      ...(
        metadata &&
        typeof metadata ===
          "object"
          ? metadata
          : {}
      )
    },

    firstSeenAt:
      existing?.firstSeenAt ||
      now(),

    lastSeenAt:
      now(),

    mentionCount:
      (
        existing?.mentionCount ||
        0
      ) + 1
  };


  store.competitions.set(
    key,
    competition
  );

  store.updatedAt =
    now();

  persistFootballMemory(
    normalizeUserId(
      userId
    )
  );

  return {
    ...competition
  };
}


// ============================================================
// GET FOOTBALL COMPETITIONS
// ============================================================

export function getFootballCompetitions(
  userId
) {
  const store =
    ensureFootballUser(
      userId
    );

  if (!store) {
    return [];
  }

  return [
    ...store.competitions.values()
  ]
    .sort(
      (a, b) =>
        b.mentionCount -
        a.mentionCount
    )
    .map(
      competition => ({
        ...competition
      })
    );
}


// ============================================================
// REMEMBER FOOTBALL CONVERSATION
// ============================================================

export function rememberFootballConversation({
  userId,
  message,
  team = null,
  competition = null,
  metadata = {}
} = {}) {
  const store =
    ensureFootballUser(
      userId
    );

  const text =
    truncateText(
      message,
      1000
    );

  if (
    !store ||
    !text
  ) {
    return null;
  }

  const item = {
    id:
      randomUUID(),

    message:
      text,

    team:
      team
        ? normalizeText(
            team
          )
        : null,

    competition:
      competition
        ? normalizeText(
            competition
          )
        : null,

    metadata:
      metadata &&
      typeof metadata ===
        "object"
        ? {
            ...metadata
          }
        : {},

    createdAt:
      now()
  };


  store.conversations.push(
    item
  );


  if (
    store.conversations.length >
    50
  ) {
    store.conversations =
      store.conversations.slice(
        -50
      );
  }


  store.updatedAt =
    now();

  persistFootballMemory(
    normalizeUserId(
      userId
    )
  );

  return {
    ...item
  };
}


// ============================================================
// FOOTBALL PREFERENCES
// ============================================================

export function setFootballPreference(
  userId,
  key,
  value
) {
  const store =
    ensureFootballUser(
      userId
    );

  const preferenceKey =
    normalizeKey(
      key
    );

  if (
    !store ||
    !preferenceKey
  ) {
    return false;
  }

  store.preferences[
    preferenceKey
  ] = value;

  store.updatedAt =
    now();

  persistFootballMemory(
    normalizeUserId(
      userId
    )
  );

  return true;
}


export function getFootballPreferences(
  userId
) {
  const store =
    ensureFootballUser(
      userId
    );

  if (!store) {
    return {};
  }

  return {
    ...store.preferences
  };
}


// ============================================================
// GET FOOTBALL MEMORY
// ============================================================

export function getFootballMemory(
  userId
) {
  const store =
    ensureFootballUser(
      userId
    );

  if (!store) {
    return null;
  }

  return {
    teams:
      getFootballTeams(
        userId
      ),

    competitions:
      getFootballCompetitions(
        userId
      ),

    conversations:
      store.conversations.map(
        item => ({
          ...item
        })
      ),

    preferences:
      {
        ...store.preferences
      },

    updatedAt:
      store.updatedAt
  };
}


// ============================================================
// MEMORY CLEANUP
// ============================================================

function cleanupConversations() {
  const currentTime =
    now();

  for (
    const [
      id,
      conversation
    ]
    of conversations
  ) {

    if (
      currentTime -
        conversation.updatedAt >
      CONVERSATION_TIMEOUT
    ) {

      conversations.delete(
        id
      );

      firestoreDelete(
        "zedConversations",
        id
      );
    }
  }


  if (
    conversations.size >
    MAX_CONVERSATIONS
  ) {

    const sorted =
      [
        ...conversations.values()
      ].sort(
        (a, b) =>
          a.updatedAt -
          b.updatedAt
      );


    const removeCount =
      conversations.size -
      MAX_CONVERSATIONS;


    for (
      let i = 0;
      i < removeCount;
      i++
    ) {

      conversations.delete(
        sorted[i].id
      );

      firestoreDelete(
        "zedConversations",
        sorted[i].id
      );
    }
  }
}


// ============================================================
// USER MEMORY LIMIT
// ============================================================

function enforceUserMemoryLimit(
  userId
) {
  const index =
    userMemoryIndex.get(
      userId
    );

  if (!index) {
    return;
  }

  if (
    index.size <=
    MAX_MEMORIES_PER_USER
  ) {
    return;
  }

  const userMemories =
    [
      ...index
    ]
      .map(
        id =>
          memories.get(
            id
          )
      )
      .filter(Boolean)
      .sort(
        (a, b) =>
          calculateRetentionScore(
            a
          ) -
          calculateRetentionScore(
            b
          )
      );


  const removeCount =
    userMemories.length -
    MAX_MEMORIES_PER_USER;


  for (
    let i = 0;
    i < removeCount;
    i++
  ) {

    forgetMemory(
      userMemories[i].id
    );
  }
}


// ============================================================
// GLOBAL MEMORY LIMIT
// ============================================================

function enforceGlobalMemoryLimit() {
  if (
    memories.size <=
    MAX_LONG_TERM_MEMORIES
  ) {
    return;
  }

  const allMemories =
    [
      ...memories.values()
    ].sort(
      (a, b) =>
        calculateRetentionScore(
          a
        ) -
        calculateRetentionScore(
          b
        )
    );


  const removeCount =
    memories.size -
    MAX_LONG_TERM_MEMORIES;


  for (
    let i = 0;
    i < removeCount;
    i++
  ) {

    forgetMemory(
      allMemories[i].id
    );
  }
}


// ============================================================
// MEMORY RETENTION SCORE
// ============================================================

function calculateRetentionScore(
  memory
) {
  if (!memory) {
    return 0;
  }

  const importance =
    memory.importance /
    100;

  const confidence =
    clamp01(
      memory.confidence
    );

  const recency =
    calculateRecencyScore(
      memory.updatedAt
    );

  const usage =
    Math.min(
      (
        memory.usageCount ||
        0
      ) / 20,
      1
    );

  return (
    importance * 0.45 +
    confidence * 0.25 +
    recency * 0.20 +
    usage * 0.10
  );
}


// ============================================================
// MEMORY MAINTENANCE
// ============================================================

export function runMemoryMaintenance() {
  cleanupConversations();

  const currentTime =
    now();

  let removed =
    0;


  for (
    const memory
    of [
      ...memories.values()
    ]
  ) {

    if (
      !memory.active
    ) {
      continue;
    }

    const age =
      currentTime -
      memory.updatedAt;

    const days =
      age /
      (
        1000 *
        60 *
        60 *
        24
      );


    if (
      days > 365 &&
      memory.importance < 30 &&
      memory.usageCount === 0
    ) {

      forgetMemory(
        memory.id
      );

      removed++;
    }
  }


  return {
    removed,

    conversations:
      conversations.size,

    memories:
      memories.size,

    projects:
      projects.size
  };
}


// ============================================================
// MEMORY SYSTEM STATISTICS
// ============================================================

export function getSystemMemoryStats() {
  return {
    conversations:
      conversations.size,

    memories:
      memories.size,

    users:
      userMemoryIndex.size,

    projects:
      projects.size,

    footballUsers:
      footballMemory.size,

    persistentStorage:
      firebasePersistenceEnabled,

    firebaseHydrationComplete:
      firebaseHydrationComplete
  };
}


// ============================================================
// EXPORT USER MEMORY
// ============================================================

export function exportUserMemory(
  userId
) {
  const normalizedUserId =
    normalizeUserId(
      userId
    );

  if (!normalizedUserId) {
    return null;
  }

  return {
    version:
      1,

    exportedAt:
      now(),

    userId:
      normalizedUserId,

    memories:
      getUserMemories(
        normalizedUserId,
        {
          includeInactive:
            true,

          limit:
            MAX_MEMORIES_PER_USER
        }
      ),

    projects:
      getUserProjects(
        normalizedUserId
      ),

    football:
      getFootballMemory(
        normalizedUserId
      )
  };
}


// ============================================================
// IMPORT USER MEMORY
// ============================================================

export function importUserMemory(
  userId,
  data
) {
  const normalizedUserId =
    normalizeUserId(
      userId
    );

  if (
    !normalizedUserId ||
    !data ||
    typeof data !==
      "object"
  ) {
    return {
      imported:
        0
    };
  }

  let imported =
    0;


  if (
    Array.isArray(
      data.memories
    )
  ) {

    for (
      const item
      of data.memories
    ) {

      if (
        !item ||
        !item.content
      ) {
        continue;
      }

      const result =
        remember({
          userId:
            normalizedUserId,

          content:
            item.content,

          category:
            item.category,

          type:
            item.type,

          importance:
            item.importance,

          confidence:
            item.confidence,

          source:
            "import",

          projectId:
            item.projectId,

          tags:
            item.tags,

          metadata:
            item.metadata
        });


      if (
        result.created ||
        result.updated
      ) {
        imported++;
      }
    }
  }


  return {
    imported
  };
}


// ============================================================
// CLEAR USER DATA
// ============================================================

export function clearUserMemory(
  userId
) {
  const normalizedUserId =
    normalizeUserId(
      userId
    );

  if (!normalizedUserId) {
    return {
      memories:
        0,

      projects:
        0,

      football:
        false
    };
  }


  const memoryCount =
    forgetUserMemories(
      normalizedUserId
    );


  let projectCount =
    0;


  for (
    const project
    of [
      ...projects.values()
    ]
  ) {

    if (
      project.userId ===
      normalizedUserId
    ) {

      projects.delete(
        project.id
      );

      firestoreDelete(
        "zedProjects",
        project.id
      );

      projectCount++;
    }
  }


  const footballDeleted =
    footballMemory.delete(
      normalizedUserId
    );


  if (
    footballDeleted
  ) {
    firestoreDelete(
      "zedFootballMemory",
      normalizedUserId
    );
  }


  return {
    memories:
      memoryCount,

    projects:
      projectCount,

    football:
      footballDeleted
  };
}


// ============================================================
// INITIALIZE MEMORY SYSTEM
// ============================================================

export function initializeMemory() {
  return {
    ready:
      true,

    conversationMemory:
      true,

    longTermMemory:
      true,

    projectMemory:
      true,

    footballMemory:
      true,

    persistentStorage:
      firebasePersistenceEnabled,

    storage:
      firebasePersistenceEnabled
        ? "firestore-with-server-cache"
        : "server-memory",

    firebaseHydrationComplete:
      firebaseHydrationComplete
  };
}


// ============================================================
// AUTOMATIC MAINTENANCE
// ============================================================

setInterval(
  runMemoryMaintenance,
  MEMORY_CLEANUP_INTERVAL
);


// ============================================================
// RESTORE FIRESTORE DATA BEFORE SERVER STARTUP
// ============================================================

await hydrateFromFirestore();


// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  getConversation,

  addMessage,

  getConversationHistory,

  getConversationDetails,

  deleteConversation,

  getConversationCount,

  clearConversations,

  setConversationSummary,

  getConversationSummary,

  remember,

  getMemory,

  updateMemory,

  forgetMemory,

  forgetUserMemories,

  getUserMemories,

  searchMemories,

  retrieveRelevantMemories,

  buildMemoryContext,

  detectRememberRequest,

  detectForgetRequest,

  extractMemoryCandidate,

  rememberFromMessage,

  getMemoryStats,

  createProject,

  getProject,

  getUserProjects,

  updateProject,

  deleteProject,

  rememberProject,

  rememberFootballTeam,

  getFootballTeams,

  rememberFootballCompetition,

  getFootballCompetitions,

  rememberFootballConversation,

  setFootballPreference,

  getFootballPreferences,

  getFootballMemory,

  runMemoryMaintenance,

  getSystemMemoryStats,

  exportUserMemory,

  importUserMemory,

  clearUserMemory,

  initializeMemory
};
