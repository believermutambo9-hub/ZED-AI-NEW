import { randomUUID } from "node:crypto";
import { getFirebaseDb } from "../config/firebase-admin.js";

const COLLECTION = "zedScheduledTasks";
const MAX_TITLE = 160;

function clean(value, max = 500) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

export async function createScheduledTask({ userId, title, notes = "", dueAt }) {
  const uid = clean(userId, 128);
  const taskTitle = clean(title, MAX_TITLE);
  const due = new Date(dueAt).getTime();
  if (!uid || !taskTitle) throw new Error("A reminder title is required.");
  if (!Number.isFinite(due) || due <= Date.now()) throw new Error("Choose a reminder time in the future.");
  if (due > Date.now() + 366 * 24 * 60 * 60 * 1000) throw new Error("Reminders can be scheduled up to one year ahead.");
  const task = {
    id: randomUUID(), userId: uid, title: taskTitle,
    notes: clean(notes, 1000), dueAt: due, createdAt: Date.now(),
    status: "scheduled", notifiedAt: null
  };
  await getFirebaseDb().collection(COLLECTION).doc(task.id).create(task);
  return task;
}

export async function listScheduledTasks(userId) {
  const uid = clean(userId, 128);
  if (!uid) return [];
  const snapshot = await getFirebaseDb().collection(COLLECTION)
    .where("userId", "==", uid).get();
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
    .sort((a, b) => Number(a.dueAt) - Number(b.dueAt));
}

export async function updateScheduledTask(userId, taskId, updates = {}) {
  const uid = clean(userId, 128);
  const id = clean(taskId, 64);
  if (!uid || !id) return null;
  const db = getFirebaseDb();
  const ref = db.collection(COLLECTION).doc(id);
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists || snapshot.data().userId !== uid) return null;
    const current = snapshot.data();
    const patch = {};
    if (updates.status === "completed" || updates.status === "scheduled") patch.status = updates.status;
    if (updates.notified === true) patch.notifiedAt = Date.now();
    if (updates.title !== undefined) {
      const title = clean(updates.title, MAX_TITLE);
      if (!title) throw new Error("A reminder title is required.");
      patch.title = title;
    }
    if (updates.notes !== undefined) patch.notes = clean(updates.notes, 1000);
    if (updates.dueAt !== undefined) {
      const due = new Date(updates.dueAt).getTime();
      if (!Number.isFinite(due) || due <= Date.now()) throw new Error("Choose a future reminder time.");
      patch.dueAt = due;
      patch.status = "scheduled";
      patch.notifiedAt = null;
    }
    patch.updatedAt = Date.now();
    tx.update(ref, patch);
    return { ...current, ...patch, id };
  });
}

export async function deleteScheduledTask(userId, taskId) {
  const uid = clean(userId, 128);
  const id = clean(taskId, 64);
  if (!uid || !id) return false;
  const db = getFirebaseDb();
  const ref = db.collection(COLLECTION).doc(id);
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists || snapshot.data().userId !== uid) return false;
    tx.delete(ref);
    return true;
  });
}
