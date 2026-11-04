import { getFirebaseDb } from "../config/firebase-admin.js";

const COLLECTION = "zedChatHistory";
const LEGACY_COLLECTION = "zedConversations";

function cleanText(value = "") {
  return String(value).trim();
}

function getDb() {
  try {
    return getFirebaseDb();
  } catch (error) {
    console.warn("Zed chat history persistence is unavailable:", error.message);
    return null;
  }
}

function normalizeLegacyChat(doc, userId) {
  const data = doc.data() || {};
  if (data.metadata?.userId !== userId && data.userId !== userId) return null;

  const messages = Array.isArray(data.messages) ? data.messages : [];
  const firstUserMessage = messages.find(message => message?.role === "user");
  return {
    id: doc.id,
    conversationId: doc.id,
    userId,
    title: cleanText(data.title || firstUserMessage?.content || "New chat").slice(0, 80) || "New chat",
    messages,
    createdAt: data.createdAt || Date.now(),
    updatedAt: data.updatedAt || data.createdAt || Date.now()
  };
}

export async function saveChat({ userId, conversationId, title = "New chat", messages = [] }) {
  const db = getDb();
  if (!db) return { ok: false, persistent: false };

  const safeUserId = cleanText(userId);
  const safeConversationId = cleanText(conversationId);
  if (!safeUserId || !safeConversationId) {
    return { ok: false, persistent: false, error: "A valid user and conversation are required." };
  }

  const chatRef = db.collection(COLLECTION).doc(safeConversationId);
  return db.runTransaction(async transaction => {
    const existing = await transaction.get(chatRef);
    const existingData = existing.exists ? existing.data() : null;

    if (existingData && existingData.userId !== safeUserId) {
      return { ok: false, persistent: false, error: "Conversation ownership mismatch." };
    }

    const timestamp = Date.now();
    transaction.set(chatRef, {
      userId: safeUserId,
      conversationId: safeConversationId,
      title: cleanText(title) || "New chat",
      messages: Array.isArray(messages) ? messages : [],
      updatedAt: timestamp,
      createdAt: existingData?.createdAt || timestamp
    }, { merge: true });

    return { ok: true, persistent: true, conversationId: safeConversationId };
  });
}

export async function getChats(userId) {
  const db = getDb();
  const safeUserId = cleanText(userId);
  if (!db || !safeUserId) return [];

  const [currentSnapshot, legacyByUserSnapshot, legacyByMetadataSnapshot] = await Promise.all([
    db.collection(COLLECTION).where("userId", "==", safeUserId).get(),
    db.collection(LEGACY_COLLECTION).where("userId", "==", safeUserId).get(),
    db.collection(LEGACY_COLLECTION).where("metadata.userId", "==", safeUserId).get()
  ]);
  const legacyDocsById = new Map();
  for (const doc of [...legacyByUserSnapshot.docs, ...legacyByMetadataSnapshot.docs]) {
    legacyDocsById.set(doc.id, doc);
  }
  const legacyDocs = [...legacyDocsById.values()];

  const chatsById = new Map();
  for (const doc of currentSnapshot.docs) {
    chatsById.set(doc.id, { id: doc.id, ...doc.data() });
  }

  // Older versions wrote chat messages to zedConversations. Recover only
  // records whose embedded owner matches the authenticated Firebase UID.
  const legacyChats = legacyDocs
    .map(doc => normalizeLegacyChat(doc, safeUserId))
    .filter(Boolean);

  for (const legacyChat of legacyChats) {
    if (!chatsById.has(legacyChat.id)) chatsById.set(legacyChat.id, legacyChat);
  }

  // Backfill recovered chats into the dedicated history collection. A failed
  // backfill does not hide the user's existing conversation from the UI.
  await Promise.all(legacyChats.map(async chat => {
    if (chatsById.get(chat.id) !== chat) return;
    try {
      await saveChat({
        userId: safeUserId,
        conversationId: chat.id,
        title: chat.title,
        messages: chat.messages
      });
    } catch (error) {
      console.warn("Legacy chat history backfill failed:", error.message);
    }
  }));

  return [...chatsById.values()].sort(
    (a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)
  );
}

export async function getChat(userId, conversationId) {
  const db = getDb();
  const safeUserId = cleanText(userId);
  const safeConversationId = cleanText(conversationId);
  if (!db || !safeUserId || !safeConversationId) return null;

  const currentDoc = await db.collection(COLLECTION).doc(safeConversationId).get();
  if (currentDoc.exists) {
    const data = currentDoc.data();
    if (data.userId !== safeUserId) return null;
    return { id: currentDoc.id, ...data };
  }

  const legacyDoc = await db.collection(LEGACY_COLLECTION).doc(safeConversationId).get();
  if (!legacyDoc.exists) return null;

  const legacyChat = normalizeLegacyChat(legacyDoc, safeUserId);
  if (!legacyChat) return null;

  try {
    await saveChat({
      userId: safeUserId,
      conversationId: safeConversationId,
      title: legacyChat.title,
      messages: legacyChat.messages
    });
  } catch (error) {
    console.warn("Legacy conversation backfill failed:", error.message);
  }
  return legacyChat;
}

export async function deleteChat(userId, conversationId) {
  const db = getDb();
  const safeUserId = cleanText(userId);
  const safeConversationId = cleanText(conversationId);
  if (!db || !safeUserId || !safeConversationId) return false;

  const currentRef = db.collection(COLLECTION).doc(safeConversationId);
  const legacyRef = db.collection(LEGACY_COLLECTION).doc(safeConversationId);

  return db.runTransaction(async transaction => {
    const [currentDoc, legacyDoc] = await Promise.all([
      transaction.get(currentRef),
      transaction.get(legacyRef)
    ]);

    const currentOwned = currentDoc.exists && currentDoc.data()?.userId === safeUserId;
    const legacyOwned = legacyDoc.exists && (
      legacyDoc.data()?.metadata?.userId === safeUserId ||
      legacyDoc.data()?.userId === safeUserId
    );

    if (currentDoc.exists && !currentOwned) return false;
    if (legacyDoc.exists && !legacyOwned) return false;
    if (currentOwned) transaction.delete(currentRef);
    if (legacyOwned) transaction.delete(legacyRef);
    return currentOwned || legacyOwned;
  });
}

export async function deleteAllChats(userId) {
  const db = getDb();
  const safeUserId = cleanText(userId);
  if (!db || !safeUserId) return 0;

  const [currentSnapshot, legacyByUserSnapshot, legacyByMetadataSnapshot] = await Promise.all([
    db.collection(COLLECTION).where("userId", "==", safeUserId).get(),
    db.collection(LEGACY_COLLECTION).where("userId", "==", safeUserId).get(),
    db.collection(LEGACY_COLLECTION).where("metadata.userId", "==", safeUserId).get()
  ]);
  const legacyDocsById = new Map();
  for (const doc of [...legacyByUserSnapshot.docs, ...legacyByMetadataSnapshot.docs]) {
    legacyDocsById.set(doc.id, doc);
  }
  const legacyOwned = [...legacyDocsById.values()].filter(doc => {
    const data = doc.data() || {};
    return data.metadata?.userId === safeUserId || data.userId === safeUserId;
  });
  const docs = [...currentSnapshot.docs, ...legacyOwned];
  for (let start = 0; start < docs.length; start += 450) {
    const batch = db.batch();
    for (const doc of docs.slice(start, start + 450)) batch.delete(doc.ref);
    await batch.commit();
  }
  return docs.length;
}

export default { saveChat, getChats, getChat, deleteChat, deleteAllChats };
