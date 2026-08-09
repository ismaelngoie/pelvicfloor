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
import { normalizeMember, toDate, goalTitleFor, ASSIGNABLE_GOALS } from "./adminMetrics";

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

  const [completionsRaw, checkinsRaw, chatRaw] = await Promise.all([
    readSubcollection(memberId, "completions"),
    readSubcollection(memberId, "checkins"),
    readSubcollection(memberId, "chat"),
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

  return { completions, checkins, chat };
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

/** Move a member onto a different goal. Her program restarts from her own day. */
export async function updateMemberGoal(memberId, goalId) {
  if (!memberId) throw new Error("A member id is required.");
  if (!ASSIGNABLE_GOALS.some((g) => g.id === goalId)) {
    throw new Error("Pick one of the eight goals first.");
  }
  await setDoc(
    doc(db(), "users", memberId),
    stamp({ goal: goalId, goalTitle: goalTitleFor(goalId) }),
    { merge: true }
  );
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
 * Record by hand whether she is paying.
 *
 * This writes `entitlementOverride`, NOT `entitlement`. That distinction is
 * still load bearing even now the Stripe webhook is gone. `entitlement` is a
 * leftover object on older records, holding a subscription id and a period end
 * from the day the webhook last ran. Nothing keeps it current and nothing
 * should write it: a plain string dropped over it would erase a record of what
 * happened, for no gain. The override is a separate field that simply wins.
 *
 * Pass null to clear it. The member then counts as whatever her record shows on
 * its own, which for a web member is "not known here" until somebody looks her
 * up in Stripe.
 */
export async function updateMemberEntitlement(memberId, entitlement) {
  if (!memberId) throw new Error("A member id is required.");
  const allowed = ["active", "trial", "free", "expired"];
  if (entitlement !== null && !allowed.includes(entitlement)) {
    throw new Error("That is not a subscription state.");
  }
  await setDoc(
    doc(db(), "users", memberId),
    stamp({
      entitlementOverride: entitlement,
      entitlementUpdatedAt: serverTimestamp(),
      entitlementUpdatedBy: ADMIN_EMAIL,
    }),
    { merge: true }
  );
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
