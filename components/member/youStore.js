"use client";

// The two record types the You tab owns that nothing else on the web writes:
// the bladder diary and the clinical progress check.
//
// WHERE THEY LIVE, AND WHY THERE
//
//   users/{id}/diary/{entryID}     one document per logged event
//   users/{id}/outcomes/{checkID}  one document per completed progress check
//
// Both paths are the ones the iPhone app already names for itself. The diary
// record is "Pelvic Floor/Core/Persistence/PelviStore.swift" (DiaryEntryRecord)
// and the outcome record is "Pelvic Floor/Core/Clinical/OutcomeMeasures.swift",
// whose header says in as many words: "CloudSync should mirror this record type
// to users/{rcID}/outcomes/{checkID}; that push is not wired up here."
//
// So today the phone keeps both on the device and pushes neither. Field names
// here are the phone's own property names, unchanged, so the day that push is
// wired up the two halves meet instead of colliding. Nothing in this file
// changes a document the phone reads, and every path is a subcollection of the
// member's own record, which firestore.rules already grants her.
//
// A note on the local fallback. Reads and writes go to a module-level Map
// instead of Firestore in exactly two cases: a deployment with no Firebase keys,
// and a `next dev` session running on ?fixtures=1. The second one is why it
// exists — the fixture member is invented and is not signed in, so every real
// write comes back "permission-denied" and none of these screens can be checked
// at 320px without it. It is not a cache, it is never consulted when Firestore
// is live, and it dies with the tab.

import {
  collection, deleteDoc, doc, getDocs, orderBy, query, setDoc, updateDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { FIXTURES_ON } from "@/lib/devFixtures";

/**
 * True when there is nowhere real to write. See the block comment above.
 *
 * `process.env.NODE_ENV` is written out here rather than left to FIXTURES_ON
 * because only a literal at the point of use folds to false in a production
 * bundle — the same rule lib/devFixtures.js sets out, for the same reason.
 */
function localOnly() {
  if (!isFirebaseConfigured()) return true;
  return process.env.NODE_ENV !== "production" && FIXTURES_ON;
}

const localDiary = new Map(); // memberId -> [entry]
const localOutcomes = new Map(); // memberId -> [check]

function localList(store, memberId) {
  if (!store.has(memberId)) store.set(memberId, []);
  return store.get(memberId);
}

function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
}

/** A value that may be a Firestore Timestamp, an ISO string, or a Date. */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === "function") return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// --- Bladder diary ---------------------------------------------------------

export const DIARY_KINDS = ["void", "leak", "fluid", "urge"];

/** Wording, captions and colours, ported from BladderDiaryModels.swift. */
export const DIARY_KIND = {
  void: {
    id: "void",
    buttonTitle: "Bathroom trip",
    caption: "Every time you go",
    accent: "#2E9E9A",
    loggedMessage: "Bathroom trip logged",
  },
  leak: {
    id: "leak",
    buttonTitle: "Leak",
    caption: "Any amount at all",
    accent: "#E65473",
    loggedMessage: "Leak logged",
  },
  fluid: {
    id: "fluid",
    buttonTitle: "Drink",
    caption: "Water, coffee, anything",
    accent: "#4E9BE6",
    loggedMessage: "Drink logged",
  },
  urge: {
    id: "urge",
    buttonTitle: "Strong urge",
    caption: "A sudden need to go",
    accent: "#E8934A",
    loggedMessage: "Urge logged",
  },
};

export const LEAK_SIZES = [
  { id: "drops", shortTitle: "Drops", title: "A few drops" },
  { id: "small", shortTitle: "Small", title: "Small, felt damp" },
  { id: "large", shortTitle: "Larger", title: "Larger, needed a change" },
];

export const FLUID_TYPES = [
  { id: "water", title: "Water", irritant: false },
  { id: "coffee", title: "Coffee", irritant: true },
  { id: "tea", title: "Tea", irritant: false },
  { id: "soda", title: "Soda", irritant: true },
  { id: "juice", title: "Juice", irritant: false },
  { id: "alcohol", title: "Alcohol", irritant: true },
  { id: "other", title: "Something else", irritant: false },
];

export const URGENCY_LEVELS = [
  { value: 0, shortTitle: "Comfortable", title: "Could wait comfortably" },
  { value: 1, shortTitle: "Mild", title: "Mild, could still wait" },
  { value: 2, shortTitle: "Strong", title: "Strong, needed to go soon" },
  { value: 3, shortTitle: "Couldn't wait", title: "Couldn't wait" },
];

/** Cup sizes people actually drink from, in mL (≈ 4, 8, 12, 16, 20 oz). */
export const VOLUME_PRESETS = [120, 240, 350, 475, 600];

/** Night is 10pm to 6am, the same window the phone counts nocturia in. */
export const NIGHT_START_HOUR = 22;
export const NIGHT_END_HOUR = 6;
export const NIGHT_WINDOW_DESCRIPTION = "Night means 10pm to 6am";
/** The number of days a pelvic floor therapist typically asks for. */
export const RECOMMENDED_DAY_COUNT = 3;

/**
 * Ounces or millilitres, decided the way the phone decides it: by the reader's
 * own locale rather than by a setting nobody would find.
 */
export function usesOunces() {
  if (typeof navigator === "undefined") return true;
  const region = (navigator.language || "en-US").toUpperCase();
  // The three that do not use millilitres for a glass of water.
  return /-(US|LR|MM)$/.test(region) || region === "EN";
}

export function volumeLabel(millilitres) {
  if (!usesOunces()) return `${millilitres} ml`;
  return `${Math.round(millilitres / 29.5735)} oz`;
}

export function volumeUnit() {
  return usesOunces() ? "oz" : "ml";
}

export function volumeDisplayValue(millilitres) {
  return usesOunces() ? Math.round(millilitres / 29.5735) : millilitres;
}

export function isNight(date) {
  const hour = date.getHours();
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

/** "8 oz · Coffee · Strong" — the grey line under an entry in the timeline. */
export function entryDetail(entry) {
  const parts = [];
  if (entry.volumeML > 0) parts.push(volumeLabel(entry.volumeML));
  const fluid = FLUID_TYPES.find((f) => f.id === entry.fluidType);
  if (fluid) parts.push(fluid.title);
  const leak = LEAK_SIZES.find((l) => l.id === entry.leakSize);
  if (leak) parts.push(leak.shortTitle);
  const urgency = URGENCY_LEVELS.find((u) => u.value === entry.urgencyLevel);
  // "Comfortable" is noise next to a leak; everywhere else it is information.
  if (urgency && !(entry.kind === "leak" && urgency.value === 0)) {
    parts.push(urgency.shortTitle);
  }
  if (entry.note) parts.push(entry.note);
  return parts.join(" · ");
}

/** Every diary entry, oldest first. */
export async function fetchDiaryEntries(memberId) {
  if (!memberId) return [];
  if (localOnly()) return [...localList(localDiary, memberId)];
  const snap = await getDocs(
    query(collection(db(), "users", memberId, "diary"), orderBy("timestamp", "asc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data(), timestamp: toDate(d.data().timestamp) }));
}

/** Logs an entry and hands it back, so the caller can offer an undo. */
export async function logDiaryEntry(memberId, entry) {
  if (!memberId) return null;
  const record = {
    id: newId("web"),
    timestamp: entry.timestamp || new Date(),
    kind: entry.kind,
    volumeML: entry.volumeML ?? null,
    leakSize: entry.leakSize ?? null,
    urgencyLevel: entry.urgencyLevel ?? null,
    fluidType: entry.fluidType ?? null,
    note: entry.note?.trim() || null,
    source: "web",
  };
  if (localOnly()) {
    localList(localDiary, memberId).push(record);
    return record;
  }
  const { id, ...body } = record;
  await setDoc(doc(db(), "users", memberId, "diary", id), body);
  return record;
}

export async function updateDiaryEntry(memberId, entryId, patch) {
  if (!memberId || !entryId) return;
  if (localOnly()) {
    const list = localList(localDiary, memberId);
    const index = list.findIndex((e) => e.id === entryId);
    if (index >= 0) list[index] = { ...list[index], ...patch };
    return;
  }
  await updateDoc(doc(db(), "users", memberId, "diary", entryId), patch);
}

export async function deleteDiaryEntry(memberId, entryId) {
  if (!memberId || !entryId) return;
  if (localOnly()) {
    const list = localList(localDiary, memberId);
    const index = list.findIndex((e) => e.id === entryId);
    if (index >= 0) list.splice(index, 1);
    return;
  }
  await deleteDoc(doc(db(), "users", memberId, "diary", entryId));
}

/**
 * One row per day that has at least one entry, oldest first. The maths is the
 * phone's `DiaryStore.summarise`, line for line, so the report a member prints
 * here and the report she prints on the phone cannot disagree about what a
 * night void is.
 */
export function summariseDiary(entries) {
  const byDay = new Map();
  for (const entry of entries || []) {
    const date = toDate(entry.timestamp);
    if (!date) continue;
    const key = startOfDay(date).getTime();
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push({ ...entry, timestamp: date });
  }

  return [...byDay.keys()].sort((a, b) => a - b).map((key) => {
    const dayEntries = byDay.get(key);
    let voids = 0, nightVoids = 0, leaks = 0, largerLeaks = 0, urges = 0;
    let fluid = 0, irritants = 0, urgencySum = 0, urgencyCount = 0;

    for (const entry of dayEntries) {
      switch (entry.kind) {
        case "void":
          voids += 1;
          if (isNight(entry.timestamp)) nightVoids += 1;
          break;
        case "leak":
          leaks += 1;
          if (entry.leakSize === "large") largerLeaks += 1;
          break;
        case "fluid": {
          fluid += entry.volumeML || 0;
          const type = FLUID_TYPES.find((f) => f.id === entry.fluidType);
          if (type?.irritant) irritants += 1;
          break;
        }
        case "urge":
          urges += 1;
          break;
        default:
          break;
      }
      if (typeof entry.urgencyLevel === "number") {
        urgencySum += entry.urgencyLevel;
        urgencyCount += 1;
      }
    }

    return {
      date: new Date(key),
      voids,
      nightVoids,
      leaks,
      largerLeaks,
      urges,
      averageUrgency: urgencyCount > 0 ? urgencySum / urgencyCount : null,
      fluidMillilitres: fluid,
      irritantDrinks: irritants,
      entryCount: dayEntries.length,
    };
  });
}

/** How many of the last three days already have entries. */
export function recentLoggedDays(entries, endingOn = new Date()) {
  const days = new Set(
    (entries || [])
      .map((e) => toDate(e.timestamp))
      .filter(Boolean)
      .map((d) => startOfDay(d).getTime())
  );
  const today = startOfDay(endingOn);
  const out = [];
  for (let offset = RECOMMENDED_DAY_COUNT - 1; offset >= 0; offset -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    out.push(days.has(d.getTime()));
  }
  return out;
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function sameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

// --- Progress check (ICIQ-UI SF and PFDI-20) --------------------------------

/** Every completed check, oldest first — the order the report wants. */
export async function fetchOutcomeChecks(memberId) {
  if (!memberId) return [];
  if (localOnly()) return [...localList(localOutcomes, memberId)];
  const snap = await getDocs(
    query(collection(db(), "users", memberId, "outcomes"), orderBy("date", "asc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data(), date: toDate(d.data().date) }));
}

/**
 * Writes one check. Field names are OutcomeCheckRecord's own property names.
 */
export async function saveOutcomeCheck(memberId, record) {
  if (!memberId) return null;
  const checkID = newId("web");
  const body = {
    checkID,
    date: new Date(),
    milestone: record.milestone ?? 0,
    programDay: record.programDay ?? 0,
    iciqTotal: record.iciqTotal ?? null,
    iciqFrequency: record.iciqFrequency ?? null,
    iciqAmount: record.iciqAmount ?? null,
    iciqInterference: record.iciqInterference ?? null,
    iciqSituations: record.iciqSituations ?? null,
    popdiScore: record.popdiScore ?? null,
    cradiScore: record.cradiScore ?? null,
    udiScore: record.udiScore ?? null,
    pfdiTotal: record.pfdiTotal ?? null,
    answersJSON: record.answersJSON ?? null,
    source: "web",
  };
  if (localOnly()) {
    const saved = { id: checkID, ...body };
    localList(localOutcomes, memberId).push(saved);
    return saved;
  }
  await setDoc(doc(db(), "users", memberId, "outcomes", checkID), body);
  return { id: checkID, ...body };
}

/**
 * Baseline, then once a month. The phone's ProgressCheckSchedule, with the
 * snooze left out: nothing on the web interrupts her with it, so there is
 * nothing to put off. `milestones.last(where: { $0 <= day })` is the same rule,
 * which is what keeps a member who was busy on day 30 still owed it on day 34.
 */
export const CHECK_MILESTONES = [1, 30, 60, 90];

export function owedMilestone(currentDayNumber, checks) {
  const reached = [...CHECK_MILESTONES].reverse().find((m) => m <= currentDayNumber);
  if (!reached) return null;
  const done = (checks || []).some((c) => Number(c.milestone) === reached);
  return done ? null : reached;
}

export function milestoneLabel(milestone) {
  return milestone > 0 ? `Day ${milestone}` : "Anytime";
}
