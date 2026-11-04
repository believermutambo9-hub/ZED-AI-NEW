import { createHmac, randomUUID } from "node:crypto";
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

function getImageKitConfig() {
  const privateKey = clean(process.env.IMAGEKIT_PRIVATE_KEY, 512);
  const publicKey = clean(process.env.IMAGEKIT_PUBLIC_KEY, 256);
  const urlEndpoint = clean(process.env.IMAGEKIT_URL_ENDPOINT, 512).replace(/\/$/, "");
  if (!privateKey || !publicKey || !urlEndpoint) {
    throw new Error("Image storage is not configured. Add IMAGEKIT_PRIVATE_KEY, IMAGEKIT_PUBLIC_KEY and IMAGEKIT_URL_ENDPOINT to the staging service environment.");
  }
  let endpoint;
  try {
    endpoint = new URL(urlEndpoint);
  } catch {
    throw new Error("IMAGEKIT_URL_ENDPOINT is invalid. Use the URL endpoint shown in your ImageKit dashboard.");
  }
  if (endpoint.protocol !== "https:" || endpoint.search || endpoint.hash) {
    throw new Error("IMAGEKIT_URL_ENDPOINT must be a valid HTTPS URL endpoint.");
  }
  return { privateKey, publicKey, urlEndpoint };
}

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== "string") throw new Error("A file upload is required.");
  const match = dataUrl.match(/^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([a-z0-9+/=\r\n]+)$/i);
  if (!match) throw new Error("The uploaded file format is invalid.");
  const contentType = match[1].toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) throw new Error("This file type is not supported in Library.");
  const encoded = match[2].replace(/\s/g, "");
  if (!encoded || encoded.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new Error("The uploaded file data is invalid.");
  }
  const buffer = Buffer.from(encoded, "base64");
  if (!buffer.length || buffer.length > MAX_FILE_BYTES) throw new Error("Library files must be smaller than 15 MB.");
  if (!hasExpectedSignature(contentType, buffer)) throw new Error("The file contents do not match the selected file type.");
  return { contentType, buffer };
}

function hasExpectedSignature(contentType, buffer) {
  const starts = (...bytes) => bytes.every((byte, index) => buffer[index] === byte);
  if (contentType === "image/png") return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (contentType === "image/jpeg") return starts(0xff, 0xd8, 0xff);
  if (contentType === "image/gif") return /^GIF8[79]a$/.test(buffer.subarray(0, 6).toString("ascii"));
  if (contentType === "image/webp") return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (contentType === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (contentType === "application/msword" || contentType === "application/vnd.ms-excel") return starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
  if (contentType.includes("openxmlformats-officedocument")) return buffer.length >= 4 && starts(0x50, 0x4b, 0x03, 0x04);
  return !buffer.includes(0);
}

function imageKitAuthorization(privateKey) {
  return "Basic " + Buffer.from(privateKey + ":").toString("base64");
}

async function imageKitRequest(url, options = {}) {
  const { privateKey } = getImageKitConfig();
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: imageKitAuthorization(privateKey),
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(30000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = clean(payload.message || payload.help || response.statusText, 300);
    throw new Error("Image storage request failed (" + response.status + "): " + (message || "Please try again."));
  }
  return payload;
}

function createPrivateDeliveryUrl(filePath, expiresInSeconds = 300) {
  const { privateKey, urlEndpoint } = getImageKitConfig();
  const safePath = String(filePath || "");
  if (!safePath.startsWith("/") || safePath.includes("..") || safePath.includes("\\") || /[\r\n]/.test(safePath)) {
    throw new Error("Stored file path is invalid.");
  }
  const encodedPath = encodeURI(safePath);
  const expiry = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const signature = createHmac("sha1", privateKey).update(encodedPath + expiry).digest("hex").toLowerCase();
  return urlEndpoint + encodedPath + "?ik-t=" + expiry + "&ik-s=" + signature;
}

async function deleteImageKitFile(fileId) {
  const id = clean(fileId, 128);
  if (!id) return false;
  await imageKitRequest("https://api.imagekit.io/v1/files/" + encodeURIComponent(id), { method: "DELETE" });
  return true;
}

// Kept only for files created by the earlier Firebase Storage implementation.
async function getLegacyFirebaseBucket() {
  const app = getFirebaseAdminApp();
  const projectId = clean(process.env.FIREBASE_PROJECT_ID, 128);
  const configuredBucket = clean(process.env.FIREBASE_STORAGE_BUCKET, 255)
    .replace(/^gs:\/\//i, "")
    .replace(/\/$/, "");
  if (!projectId && !configuredBucket) throw new Error("Legacy Firebase file storage is not configured.");
  const candidates = [...new Set([
    configuredBucket,
    projectId ? projectId + ".appspot.com" : "",
    projectId ? projectId + ".firebasestorage.app" : ""
  ].filter(Boolean))];
  for (const bucketName of candidates) {
    const bucket = getStorage(app).bucket(bucketName);
    try {
      const [exists] = await bucket.exists();
      if (exists) return bucket;
    } catch {}
  }
  throw new Error("Legacy Firebase Storage bucket is unavailable.");
}

export async function saveLibraryFile({ userId, name, dataUrl }) {
  const uid = clean(userId, 128);
  const filename = clean(name, 180).replace(/[\/\\]/g, "_") || "uploaded-file";
  if (!uid) throw new Error("Sign in is required.");
  const { contentType, buffer } = parseDataUrl(dataUrl);
  const config = getImageKitConfig();
  const id = randomUUID();
  const folder = "/zed-library/" + uid;
  const form = new FormData();
  form.set("file", new Blob([buffer], { type: contentType }), filename);
  form.set("fileName", filename);
  form.set("folder", folder);
  form.set("isPrivateFile", "true");
  form.set("useUniqueFileName", "true");

  let uploaded = null;
  try {
    uploaded = await imageKitRequest("https://upload.imagekit.io/api/v2/files/upload", {
      method: "POST",
      headers: {},
      body: form
    });
    if (!uploaded.fileId || !uploaded.filePath) {
      throw new Error("Image storage returned an incomplete upload confirmation.");
    }
    const record = {
      id,
      userId: uid,
      name: clean(uploaded.name || filename, 180),
      contentType,
      size: Number(uploaded.size || buffer.length),
      provider: "imagekit",
      providerFileId: uploaded.fileId,
      filePath: uploaded.filePath,
      createdAt: Date.now()
    };
    await getFirebaseDb().collection(COLLECTION).doc(id).create(record);
    return {
      id: record.id,
      name: record.name,
      contentType: record.contentType,
      size: record.size,
      createdAt: record.createdAt
    };
  } catch (error) {
    if (uploaded?.fileId) await deleteImageKitFile(uploaded.fileId).catch(() => {});
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
      id: doc.id,
      name: data.name,
      contentType: data.contentType,
      size: data.size,
      createdAt: data.createdAt
    };
  }).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

async function getOwnedLibraryRecord(userId, fileId) {
  const uid = clean(userId, 128);
  const id = clean(fileId, 64);
  if (!uid || !id) return null;
  const ref = getFirebaseDb().collection(COLLECTION).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data().userId !== uid) return null;
  return { ref, data: snapshot.data() };
}

async function getFileUrl(data) {
  if (data.provider === "imagekit") return createPrivateDeliveryUrl(data.filePath, 300);
  const bucket = await getLegacyFirebaseBucket();
  const [url] = await bucket.file(data.objectPath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 5 * 60 * 1000,
    responseDisposition: "inline"
  });
  return url;
}

export async function getLibraryDownload(userId, fileId) {
  const record = await getOwnedLibraryRecord(userId, fileId);
  if (!record) return null;
  const url = record.data.provider === "imagekit"
    ? createPrivateDeliveryUrl(record.data.filePath, 300)
    : await getLegacyFirebaseDownloadUrl(record.data);
  return { url, name: record.data.name, contentType: record.data.contentType };
}

async function getLegacyFirebaseDownloadUrl(data) {
  const bucket = await getLegacyFirebaseBucket();
  const [url] = await bucket.file(data.objectPath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 5 * 60 * 1000,
    responseDisposition: 'attachment; filename="' + String(data.name).replace(/["\r\n]/g, "_") + '"'
  });
  return url;
}

export async function getLibraryPreview(userId, fileId) {
  const record = await getOwnedLibraryRecord(userId, fileId);
  if (!record) return null;
  return {
    url: await getFileUrl(record.data),
    name: record.data.name,
    contentType: record.data.contentType
  };
}

export async function deleteLibraryFile(userId, fileId) {
  const record = await getOwnedLibraryRecord(userId, fileId);
  if (!record) return false;
  if (record.data.provider === "imagekit") {
    await deleteImageKitFile(record.data.providerFileId);
  } else {
    await (await getLegacyFirebaseBucket()).file(record.data.objectPath).delete({ ignoreNotFound: true });
  }
  await record.ref.delete();
  return true;
}
