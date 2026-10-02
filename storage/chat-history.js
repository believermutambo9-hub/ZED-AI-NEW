
import { getFirebaseDb } from "../config/firebase-admin.js";

const COLLECTION = "zedChatHistory";

function cleanText(value = "") {
  return String(value).trim();
}

function getDb() {
  try {
    return getFirebaseDb();
  } catch (error) {
    console.warn(
      "Zed AI chat history persistence is unavailable:",
      error.message
    );

    return null;
  }
}

export async function saveChat({
  userId,
  conversationId,
  title = "New chat",
  messages = []
}) {
  const db = getDb();

  if (!db) {
    return {
      ok: false,
      persistent: false
    };
  }

  const safeUserId = cleanText(userId) || "guest";
  const safeConversationId =
    cleanText(conversationId) ||
    `chat-${Date.now()}`;

  const chatData = {
    userId: safeUserId,
    conversationId: safeConversationId,
    title: cleanText(title) || "New chat",
    messages: Array.isArray(messages) ? messages : [],
    updatedAt: Date.now(),
    createdAt: Date.now()
  };

  await db
    .collection(COLLECTION)
    .doc(safeConversationId)
    .set(chatData, { merge: true });

  return {
    ok: true,
    persistent: true,
    conversationId: safeConversationId
  };
}

export async function getChats(userId) {
  const db = getDb();

  if (!db) {
    return [];
  }

  const safeUserId = cleanText(userId) || "guest";

  const snapshot = await db
    .collection(COLLECTION)
    .where("userId", "==", safeUserId)
    .get();

  return snapshot.docs
    .map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    .sort(
      (a, b) =>
        Number(b.updatedAt || 0) -
        Number(a.updatedAt || 0)
    );
}

export async function getChat(userId, conversationId) {
  const db = getDb();

  if (!db) {
    return null;
  }

  const safeUserId = cleanText(userId);
  const safeConversationId = cleanText(conversationId);

  if (!safeUserId || !safeConversationId) {
    return null;
  }

  const doc = await db
    .collection(COLLECTION)
    .doc(safeConversationId)
    .get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data();

  if (data.userId !== safeUserId) {
    return null;
  }

  return {
    id: doc.id,
    ...data
  };
}

export async function deleteChat(userId, conversationId) {
  const db = getDb();

  if (!db) {
    return false;
  }

  const safeUserId = cleanText(userId);
  const safeConversationId = cleanText(conversationId);

  if (!safeUserId || !safeConversationId) {
    return false;
  }

  const chatRef = db
    .collection(COLLECTION)
    .doc(safeConversationId);

  const doc = await chatRef.get();

  if (!doc.exists) {
    return false;
  }

  const data = doc.data();

  if (data.userId !== safeUserId) {
    return false;
  }

  await chatRef.delete();

  return true;
}

export async function deleteAllChats(userId) {
  const db = getDb();

  if (!db) {
    return 0;
  }

  const safeUserId = cleanText(userId);

  if (!safeUserId) {
    return 0;
  }

  const snapshot = await db
    .collection(COLLECTION)
    .where("userId", "==", safeUserId)
    .get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = db.batch();

  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();

  return snapshot.size;
}

export default {
  saveChat,
  getChats,
  getChat,
  deleteChat,
  deleteAllChats
};
