"use client";

// The only file in /admin that talks to Firestore.
//
// Reads are deliberately dumb: pull the collection, sort in JavaScript. Ordering
// server-side would quietly drop any document that is missing the sort field,
// and a support screen that hides half a transcript is worse than a slow one.
//
// Writes go through named functions so every change the dashboard can make to a
// member is in one list, and so the two-part writes stay together: changing a
// member's program day has to update her record AND post a command the phone
// picks up, or the app and the dashboard start disagreeing.

import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, ADMIN_EMAIL } from "./firebase";
import { normalizeMember, toDate } from "./adminMetrics";

/** Every member record, cleaned up and ready to count. */
export async function fetchAllMembers() {
  const snap = await getDocs(collection(db(), "users"));
  return snap.docs.map((d) => normalizeMember({ id: d.id, ...d.data() }));
}

function sortByDate(rows, field, direction = "asc") {
  return [...rows].sort((a, b) => {
    const at = a[field] ? a[field].getTime() : 0;
    const bt = b[field] ? b[field].getTime() : 0;
    return direction === "asc" ? at - bt : bt - at;
  });
}

async function readSubcollection(memberId, name) {
  const snap = await getDocs(collection(db(), "users", memberId, name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Everything the detail panel shows for one member.
 * Each part is fetched separately so one empty subcollection never blanks the
 * others, and a single failure is reported against the whole panel.
 */
export async function fetchMemberDetail(memberId) {
  if (!memberId) throw new Error("A member id is required.");

  const [completionsRaw, checkinsRaw, chatRaw, eventsRaw, commandsRaw] = await Promise.all([
    readSubcollection(memberId, "completions"),
    readSubcollection(memberId, "checkins"),
    readSubcollection(memberId, "chat"),
    readSubcollection(memberId, "events"),
    readSubcollection(memberId, "adminCommands"),
  ]);

  const completions = sortByDate(
    completionsRaw.map((c) => ({
      id: c.id,
      programID: typeof c.programID === "string" ? c.programID : "",
      day: Number.isFinite(c.day) ? c.day : null,
      completedAt: toDate(c.completedAt),
      secondsWatched: Number.isFinite(c.secondsWatched) ? c.secondsWatched : 0,
      creditedFromLegacy: c.creditedFromLegacy === true,
      source: typeof c.source === "string" ? c.source : "",
    })),
    "completedAt",
    "desc"
  );

  const checkins = sortByDate(
    checkinsRaw.map((c) => ({
      id: c.id,
      date: toDate(c.date) || toDate(c.id),
      leakLevel: typeof c.leakLevel === "string" ? c.leakLevel : null,
      painLevel: Number.isFinite(c.painLevel) ? c.painLevel : null,
      mood: typeof c.mood === "string" ? c.mood : "",
      energyLevel: Number.isFinite(c.energyLevel) ? c.energyLevel : null,
      goalFeeling: Number.isFinite(c.goalFeeling) ? c.goalFeeling : null,
    })),
    "date",
    "desc"
  );

  const chat = sortByDate(
    chatRaw.map((c) => ({
      id: c.id,
      role: c.role === "user" ? "user" : "mia",
      source: typeof c.source === "string" ? c.source : "",
      text: typeof c.text === "string" ? c.text : "",
      date: toDate(c.date),
    })),
    "date",
    "asc"
  );

  const events = sortByDate(
    eventsRaw.map((event) => ({
      id: event.id,
      type: typeof event.type === "string" ? event.type : typeof event.name === "string" ? event.name : "App event",
      date: toDate(event.date || event.createdAt || event.timestamp),
      videoID: typeof event.videoID === "string" ? event.videoID : "",
      videoTitle: typeof event.videoTitle === "string" ? event.videoTitle : "",
      secondsWatched: Number.isFinite(event.secondsWatched) ? event.secondsWatched : 0,
      completed: event.completed === true,
      error: typeof event.error === "string" ? event.error : typeof event.reason === "string" ? event.reason : "",
      day: Number.isFinite(event.programDay) ? event.programDay : Number.isFinite(event.day) ? event.day : null,
    })),
    "date",
    "desc"
  );

  const commands = sortByDate(
    commandsRaw.map((command) => ({
      id: command.id,
      type: typeof command.type === "string" ? command.type : "Command",
      status: typeof command.status === "string" ? command.status : "pending",
      createdAt: toDate(command.createdAt),
      appliedAt: toDate(command.appliedAt),
      day: Number.isFinite(command.day) ? command.day : null,
      error: typeof command.error === "string" ? command.error : "",
    })),
    "createdAt",
    "desc"
  );

  return { completions, checkins, chat, events, commands };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

function stamp(patch) {
  return { ...patch, adminUpdatedAt: serverTimestamp(), adminUpdatedBy: ADMIN_EMAIL };
}

function newId(prefix) {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${Date.now()}_${random}`;
}

/**
 * Post a command the phone picks up and applies.
 * The app listens on status == "pending" and writes back "applied", which is
 * how the dashboard knows the change actually landed.
 */
async function postCommand(memberId, command) {
  const id = newId("admin");
  await setDoc(doc(db(), "users", memberId, "adminCommands", id), {
    ...command,
    status: "pending",
    createdAt: serverTimestamp(),
    createdBy: ADMIN_EMAIL,
  });
  return id;
}

/**
 * Set which day of the 90 she is on.
 *
 * Two writes on purpose. The record keeps the dashboard honest straight away,
 * and the command makes her phone agree the next time it is opened. The phone
 * clears her old completions and back-fills the days before this one, so the
 * screen warns about that before it is used.
 */
export async function updateMemberProgramDay(memberId, goalId, day) {
  if (!memberId) throw new Error("A member id is required.");
  const value = Math.round(Number(day));
  if (!Number.isFinite(value) || value < 1 || value > 90) {
    throw new Error("Pick a day between 1 and 90.");
  }
  // Name the program only when we actually know it. The shipped app reads
  // `data["programID"] as? String ?? GoalID.current.rawValue`, so leaving the
  // field off makes the phone apply the day to whichever program she is really
  // on. Guessing "coreStrength" for a member with no goal on record would wipe
  // and back-fill a program she has never opened, leave her real day untouched,
  // and put this dashboard and her phone permanently out of step.
  const command = goalId
    ? { type: "setProgramDay", programID: goalId, day: value }
    : { type: "setProgramDay", day: value };
  await setDoc(doc(db(), "users", memberId), stamp({ programDay: value }), { merge: true });
  await postCommand(memberId, command);
}

/**
 * Write a message into her chat. It shows up on her phone as Coach Mia, live.
 * The shape matches what the app already listens for: source "admin".
 */
export async function sendCoachMiaMessage(memberId, text) {
  if (!memberId) throw new Error("A member id is required.");
  const body = (text || "").trim();
  if (!body) throw new Error("Type a message first.");
  if (body.length > 2000) throw new Error("Keep the message under 2000 characters.");
  const id = newId("mia");
  await setDoc(doc(db(), "users", memberId, "chat", id), {
    role: "mia",
    source: "admin",
    text: body,
    date: serverTimestamp(),
  });
  return { id, role: "mia", source: "admin", text: body, date: new Date() };
}

/** Restart the member's current 90-day program from day one on her phone. */
export async function resetMemberProgram(memberId, goalId) {
  if (!memberId) throw new Error("A member id is required.");
  const command = goalId ? { type: "resetProgram", programID: goalId } : { type: "resetProgram" };
  return postCommand(memberId, command);
}

/** Give back one missed streak day. The phone validates and applies it. */
export async function grantMemberStreakRestore(memberId) {
  if (!memberId) throw new Error("A member id is required.");
  return postCommand(memberId, { type: "grantStreakRestore" });
}
