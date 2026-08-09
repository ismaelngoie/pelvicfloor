"use client";

// The reads and writes the member app needs that lib/memberStore.js does not
// already cover: the live Coach Mia transcript, the daily check-in, watch
// history and her saved exercises.
//
// Every shape here is the shape the iOS app already writes, so a day done on a
// laptop and a day done on a phone are the same record. Field names come from
// "Pelvic Floor/Core/Sync/CloudSync.swift".

import {
  collection, doc, getDoc, getDocs, limit, limitToLast, onSnapshot, orderBy,
  query, serverTimestamp, setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { updateMember } from "./memberStore";

// --- Coach Mia -------------------------------------------------------------
//
// users/{id}/chat/{messageID}
//   role    "user" | "mia"
//   source  "user" | "gemini" | "admin" | "proactive"
//   text    string
//   date    timestamp

/**
 * Live transcript, oldest first. The phone writes into the same subcollection,
 * so a conversation started in bed carries on at a desk without a refresh.
 *
 * @returns unsubscribe function
 */
export function subscribeChat(memberId, onChange, onError, max = 300) {
  if (!memberId) return () => {};
  // limitToLast, not limit. With orderBy(date, asc) a plain limit(300) returns
  // the OLDEST 300 messages: past that count the transcript freezes on the first
  // conversation she ever had, her new messages never appear, and Mia's replies
  // land in a window nobody is looking at. limitToLast takes the newest 300 and
  // still hands them back oldest first, which is the order the bubbles want.
  const q = query(
    collection(db(), "users", memberId, "chat"),
    orderBy("date", "asc"),
    limitToLast(max)
  );
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError?.(err)
  );
}

/**
 * Write her message. The id is time-ordered so the transcript still sorts
 * correctly in the instant before the server timestamp resolves.
 */
export async function sendChatMessage(memberId, text) {
  const body = (text || "").trim();
  if (!memberId || !body) return null;
  const id = `web_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
  await setDoc(doc(db(), "users", memberId, "chat", id), {
    role: "user",
    source: "user",
    text: body,
    date: serverTimestamp(),
    platform: "web",
  });
  return id;
}

/** A timestamp that may be a Firestore Timestamp, an ISO string, or missing. */
export function messageDate(message) {
  const value = message?.date;
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// --- Daily check-in --------------------------------------------------------
//
// users/{id}/checkins/{yyyy-MM-dd}

export async function fetchCheckIn(memberId, dateKey) {
  if (!memberId || !dateKey) return null;
  const snap = await getDoc(doc(db(), "users", memberId, "checkins", dateKey));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveCheckIn(memberId, dateKey, values) {
  if (!memberId || !dateKey) return;
  await setDoc(
    doc(db(), "users", memberId, "checkins", dateKey),
    {
      date: serverTimestamp(),
      leakLevel: values.leakLevel ?? null,
      painLevel: values.painLevel ?? null,
      mood: values.mood || "😊",
      energyLevel: values.energyLevel ?? null,
      goalFeeling: values.goalFeeling ?? null,
      source: "web",
    },
    { merge: true }
  );
}

/** The last few weeks of check-ins, newest first, for the Insights charts. */
export async function fetchRecentCheckIns(memberId, max = 90) {
  if (!memberId) return [];
  const snap = await getDocs(
    query(collection(db(), "users", memberId, "checkins"), orderBy("date", "desc"), limit(max))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// --- Watch history ---------------------------------------------------------
//
// users/{id}/events/{autoID}. One document per video she actually watched,
// written by both platforms, so "watched" markers and the Jump back in row
// carry across devices.

export async function fetchRecentEvents(memberId, max = 300) {
  if (!memberId) return [];
  const snap = await getDocs(
    query(collection(db(), "users", memberId, "events"), orderBy("date", "desc"), limit(max))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Turn the raw event log into the two things the UI asks it: which videos are
 * finished, and which she watched most recently (newest first, no repeats).
 */
export function summarizeEvents(events) {
  const completed = new Set();
  const recent = [];
  const seen = new Set();
  let totalSeconds = 0;

  for (const e of events || []) {
    const id = e.videoID || e.videoId;
    totalSeconds += Number(e.secondsWatched) || 0;
    if (e.completed && id) completed.add(id);
    if (id && !seen.has(id)) {
      seen.add(id);
      recent.push(id);
    }
  }
  return { completed, recent, totalSeconds };
}

// --- Saved exercises -------------------------------------------------------
//
// The phone keeps favourites on device only (FavoriteExerciseRecord has no
// push path), so the web keeps its own list on the member document. It is a
// plain array of catalog ids: additive, ignored by iOS, and it follows her to
// any browser she signs in on.

export function savedIdsOf(member) {
  const list = member?.savedExerciseIDs;
  return Array.isArray(list) ? list.filter((id) => typeof id === "string") : [];
}

export async function setSavedIds(memberId, ids) {
  await updateMember(memberId, { savedExerciseIDs: ids });
}
