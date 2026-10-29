
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

  const chatRef = db
    .collection(COLLECTION)
    .doc(safeConversationId);

  // Use a transaction so concurrent requests cannot pass the ownership
  // check and overwrite a conversation owned by another account.
  return db.runTransaction(async transaction => {
    const existing = await transaction.get(chatRef);
    const existingData = existing.exists ? existing.data() : null;

    if (existingData && existingData.userId !== safeUserId) {
      return {
        ok: false,
        persistent: false,
        error: "Conversation ownership mismatch."
      };
    }

    const timestamp = Date.now();
    const chatData = {
      userId: safeUserId,
      conversationId: safeConversationId,
      title: cleanText(title) || "New chat",
      messages: Array.isArray(messages) ? messages : [],
      updatedAt: timestamp,
      createdAt: existingData?.createdAt || timestamp
    };

    transaction.set(chatRef, chatData, { merge: true });

    return {
      ok: true,
      persistent: true,
      conversationId: safeConversationId
    };
  });
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

  // Keep the ownership check and delete in one transaction so the
  // document cannot change owners between the check and deletion.
  return db.runTransaction(async transaction => {
    const doc = await transaction.get(chatRef);

    if (!doc.exists || doc.data()?.userId !== safeUserId) {
      return false;
    }

    transaction.delete(chatRef);
    return true;
  });
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

  // Firestore batches are limited to 500 writes. Stay below that limit
  // so clearing a large chat history succeeds instead of failing as one batch.
  const batchSize = 450;

  for (let start = 0; start < snapshot.docs.length; start += batchSize) {
    const batch = db.batch();
    const chunk = snapshot.docs.slice(start, start + batchSize);

    chunk.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }

  return snapshot.size;
}

export default {
  saveChat,
  getChats,
  getChat,
  deleteChat,
  deleteAllChats
};
