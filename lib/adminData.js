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

/**
 * Live App Store membership from RevenueCat.
 *
 * This intentionally goes through a server route. A RevenueCat secret key must
 * never be present in the browser bundle, and Firestore profile fields are not
 * subscription truth: the iPhone creates them before somebody buys.
 */
export async function fetchRevenueCatMembers(user, memberIds, ownerMetrics = null) {
  if (!user) throw new Error("Sign in again before loading memberships.");
  const token = await user.getIdToken();
  const ids = [...new Set((Array.isArray(memberIds) ? memberIds : []).filter(Boolean))];
  const batches = [];
  // The server deliberately accepts only 30 ids so every Cloudflare request
  // stays below its external-request ceiling. The browser quietly assembles
  // the batches back into one report.
  for (let index = 0; index < ids.length; index += 30) {
    const customerIds = ids.slice(index, index + 30);
    const response = await fetch("/api/revenuecat-members", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerIds, includeHeadline: false }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "RevenueCat memberships did not load.");
    batches.push(payload);
  }

  const first = batches[0] || {};
  // RevenueCat aliases can make two Firebase document ids resolve to the same
  // App Store subscription. Collapse those rows before any synced metric is
  // counted, while preserving every identity id so the winning row can still
  // join back to the correct app profile.
  const customers = consolidateRevenueCatCustomers(
    batches.flatMap((batch) => Array.isArray(batch.customers) ? batch.customers : [])
  );
  const activeCustomers = customers.filter((customer) => customer.isActivePremium === true);
  const canceledCustomers = customers.filter((customer) => customer.state === "canceled_with_access");
  const paid = ownerMetricValue(ownerMetrics, "activeSubscriptions");
  const trials = ownerMetricValue(ownerMetrics, "activeTrials");
  const headline = Number.isFinite(paid) && Number.isFinite(trials)
    ? {
      activePremium: paid + trials,
      paid,
      trials,
      lastComputedAt: ownerMetrics?.scope?.overviewLastUpdatedAt || null,
    }
    : first.headline || null;
  return {
    source: first.source || "RevenueCat API v2",
    definition: first.definition || "Production App Store subscriptions that currently give access",
    fetchedAt: Math.max(...batches.map((batch) => Number(batch.fetchedAt) || 0), Date.now()),
    projectId: first.projectId || "",
    headline,
    customers,
    totals: {
      activePremium: Number.isFinite(headline?.activePremium) ? headline.activePremium : activeCustomers.length,
      paid: Number.isFinite(headline?.paid) ? headline.paid : activeCustomers.filter((customer) => customer.phase === "paid").length,
      trials: Number.isFinite(headline?.trials) ? headline.trials : activeCustomers.filter((customer) => customer.phase === "trial").length,
      syncedActivePremium: activeCustomers.length,
      syncedPaid: activeCustomers.filter((customer) => customer.phase === "paid").length,
      syncedTrials: activeCustomers.filter((customer) => customer.phase === "trial").length,
      canceledWithAccess: canceledCustomers.length,
      profilesChecked: ids.length,
    },
  };
}

function ownerMetricValue(report, name) {
  const metric = report?.metrics?.[name];
  return metric?.available === true && Number.isFinite(Number(metric.value))
    ? Number(metric.value)
    : null;
}

/**
 * Owner-level subscription economics from RevenueCat's Charts API.
 *
 * This stays server-side so the RevenueCat secret never enters the browser.
 * The requested range is UTC and is shared with Apple Ads, which keeps cost
 * per trial and cost per first paid customer mathematically comparable.
 */
export async function fetchRevenueCatOwnerMetrics(user, startDate, endDate, currency = "USD", compare = null) {
  if (!user) throw new Error("Sign in again before loading business metrics.");
  const token = await user.getIdToken();
  const response = await fetch("/api/revenuecat-owner-metrics", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    // The comparison window rides inside the same request so it can never
    // race the main report for the server's one-fresh-report-per-minute slot.
    body: JSON.stringify({ startDate, endDate, currency, ...(compare ? { compareStartDate: compare.startDate, compareEndDate: compare.endDate } : {}) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "RevenueCat business metrics did not load.");
  return payload;
}

async function coachInboxRequest(user, payload) {
  if (!user) throw new Error("Sign in again before opening Coach Mia.");
  const token = await user.getIdToken();
  const response = await fetch("/api/coach-inbox", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Coach Mia conversations did not load.");
  return data;
}

/** Every member conversation, ordered with unanswered questions first. */
export async function fetchCoachInbox(user) {
  return coachInboxRequest(user, { action: "list", limit: 4000 });
}

/**
 * Send the same `source: admin` message shape the shipped iPhone app already
 * listens for. requestId makes a retry idempotent instead of duplicating it.
 */
export async function sendCoachInboxReply(user, memberId, text, requestId) {
  return coachInboxRequest(user, { action: "reply", memberId, text, requestId });
}

function consolidateRevenueCatCustomers(rows) {
  const consolidated = new Map();

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const subscriptionId = typeof row.subscription?.id === "string" ? row.subscription.id.trim() : "";
    const rowId = typeof row.id === "string" ? row.id.trim() : "";
    const key = subscriptionId ? `subscription:${subscriptionId}` : `customer:${rowId}`;
    const current = consolidated.get(key);
    if (!current) {
      consolidated.set(key, {
        ...row,
        identityIds: [...new Set([rowId, ...(Array.isArray(row.identityIds) ? row.identityIds : [])].filter(Boolean))],
      });
      continue;
    }

    const identityIds = [...new Set([
      ...(Array.isArray(current.identityIds) ? current.identityIds : []),
      rowId,
      ...(Array.isArray(row.identityIds) ? row.identityIds : []),
    ].filter(Boolean))];
    // Prefer the renewing representation if aliases briefly disagree, then an
    // access-granting row and finally the fuller subscription payload. The
    // authoritative headline remains RevenueCat Overview either way.
    const preferred = row.isRenewing && !current.isRenewing
      ? row
      : row.isActivePremium && !current.isActivePremium
      ? row
      : current.subscription ? current : row;
    consolidated.set(key, { ...preferred, identityIds });
  }

  return [...consolidated.values()];
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
