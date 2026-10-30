import { randomUUID } from "node:crypto";
import { getFirebaseDb, getFirebaseAdminApp } from "../config/firebase-admin.js";
import { getStorage } from "firebase-admin/storage";

const COLLECTION = "zedLibraryFiles";
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf", "text/plain", "text/csv", "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel"
]);

function clean(value, max = 180) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

function getBucket() {
  const app = getFirebaseAdminApp();
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET ||
    (process.env.FIREBASE_PROJECT_ID ? process.env.FIREBASE_PROJECT_ID + ".firebasestorage.app" : "");
  if (!bucketName) throw new Error("Firebase Storage is not configured. Set FIREBASE_STORAGE_BUCKET.");
  return getStorage(app).bucket(bucketName);
}

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== "string") throw new Error("A file upload is required.");
  const match = dataUrl.match(/^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([a-z0-9+/=\r\n]+)$/i);
  if (!match) throw new Error("The uploaded file format is invalid.");
  const contentType = match[1].toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) throw new Error("This file type is not supported in Library.");
  const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!buffer.length || buffer.length > MAX_FILE_BYTES) throw new Error("Library files must be smaller than 15 MB.");
  return { contentType, buffer };
}

export async function saveLibraryFile({ userId, name, dataUrl }) {
  const uid = clean(userId, 128);
  const filename = clean(name, 180).replace(/[\/\\]/g, "_") || "uploaded-file";
  if (!uid) throw new Error("Sign in is required.");
  const { contentType, buffer } = parseDataUrl(dataUrl);
  const db = getFirebaseDb();
  const bucket = getBucket();
  const id = randomUUID();
  const objectPath = "zed-library/" + uid + "/" + id;
  const file = bucket.file(objectPath);
  await file.save(buffer, {
    resumable: false,
    validation: "crc32c",
    metadata: {
      contentType,
      cacheControl: "private, max-age=0, no-transform",
      metadata: { ownerUid: uid, originalName: filename }
    }
  });
  try {
    const record = {
      id, userId: uid, name: filename, contentType,
      size: buffer.length, objectPath, createdAt: Date.now()
    };
    await db.collection(COLLECTION).doc(id).create(record);
    return { id, name: filename, contentType, size: buffer.length, createdAt: record.createdAt };
  } catch (error) {
    await file.delete({ ignoreNotFound: true }).catch(() => {});
    throw error;
  }
}

export async function listLibraryFiles(userId) {
  const uid = clean(userId, 128);
  if (!uid) return [];
  const snapshot = await getFirebaseDb().collection(COLLECTION)
    .where("userId", "==", uid).get();
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id, name: data.name, contentType: data.contentType,
      size: data.size, createdAt: data.createdAt
    };
  }).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

export async function getLibraryDownload(userId, fileId) {
  const uid = clean(userId, 128);
  const id = clean(fileId, 64);
  if (!uid || !id) return null;
  const ref = getFirebaseDb().collection(COLLECTION).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data().userId !== uid) return null;
  const data = snapshot.data();
  const [url] = await getBucket().file(data.objectPath).getSignedUrl({
    version: "v4", action: "read", expires: Date.now() + 5 * 60 * 1000,
    responseDisposition: 'attachment; filename="' + String(data.name).replace(/["\r\n]/g, "_") + '"'
  });
  return { url, name: data.name, contentType: data.contentType };
}

export async function deleteLibraryFile(userId, fileId) {
  const uid = clean(userId, 128);
  const id = clean(fileId, 64);
  if (!uid || !id) return false;
  const db = getFirebaseDb();
  const ref = db.collection(COLLECTION).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data().userId !== uid) return false;
  await getBucket().file(snapshot.data().objectPath).delete({ ignoreNotFound: true });
  await ref.delete();
  return true;
}
