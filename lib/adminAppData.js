"use client";

import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { toDate } from "./adminMetrics";

const GOALS = [
  "pregnancyPrep",
  "postpartum",
  "coreStrength",
  "bladderLeaks",
  "pelvicPain",
  "intimacy",
  "fitness",
  "stability",
  "diastasisRecti",
];

function memberIdFrom(snapshot) {
  const pieces = snapshot.ref.path.split("/");
  return pieces[0] === "users" ? pieces[1] || "" : "";
}

function cleanString(value) {
  return typeof value === "string" ? value : "";
}

function cleanNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export async function fetchAppTelemetry() {
  const [completionSnap, eventSnap, checkinSnap, commandSnap, lifecycleResult] = await Promise.all([
    getDocs(collectionGroup(db(), "completions")),
    getDocs(collectionGroup(db(), "events")),
    getDocs(collectionGroup(db(), "checkins")),
    getDocs(collectionGroup(db(), "adminCommands")),
    getDocs(collection(db(), "revenuecat_events"))
      .then((snapshot) => ({ snapshot, available: true }))
      .catch(() => ({ snapshot: { docs: [] }, available: false })),
  ]);

  const completions = completionSnap.docs.map((row) => {
    const value = row.data();
    return {
      id: row.id,
      memberId: memberIdFrom(row),
      goal: cleanString(value.programID || value.goal),
      day: cleanNumber(value.day, null),
      completedAt: toDate(value.completedAt),
      secondsWatched: cleanNumber(value.secondsWatched),
    };
  });

  const events = eventSnap.docs.map((row) => {
    const value = row.data();
    return {
      id: row.id,
      memberId: memberIdFrom(row),
      type: cleanString(value.type || value.name || value.event),
      date: toDate(value.date || value.createdAt || value.timestamp),
      goal: cleanString(value.goal || value.programID),
      day: cleanNumber(value.programDay || value.day, null),
      videoID: cleanString(value.videoID),
      videoTitle: cleanString(value.videoTitle),
      secondsWatched: cleanNumber(value.secondsWatched),
      completed: value.completed === true,
      error: cleanString(value.error || value.reason),
    };
  });

  const checkins = checkinSnap.docs.map((row) => {
    const value = row.data();
    return {
      id: row.id,
      memberId: memberIdFrom(row),
      date: toDate(value.date),
      goalFeeling: cleanNumber(value.goalFeeling, null),
      painLevel: cleanNumber(value.painLevel, null),
      leakLevel: cleanString(value.leakLevel),
    };
  });

  const commands = commandSnap.docs.map((row) => {
    const value = row.data();
    return {
      id: row.id,
      memberId: memberIdFrom(row),
      type: cleanString(value.type),
      status: cleanString(value.status) || "pending",
      createdAt: toDate(value.createdAt),
      appliedAt: toDate(value.appliedAt),
      error: cleanString(value.error),
      day: cleanNumber(value.day, null),
    };
  });

  const lifecycle = lifecycleResult.snapshot.docs.map((row) => {
    const value = row.data();
    return {
      id: row.id,
      type: cleanString(value.type),
      store: cleanString(value.store),
      environment: cleanString(value.environment),
      periodType: cleanString(value.periodType),
      occurredAt: toDate(value.occurredAt || value.purchasedAt || value.eventTimestamp),
      purchasedAt: toDate(value.purchasedAt),
      appUserId: cleanString(value.appUserId),
      campaignId: cleanString(value.campaignId),
      campaignName: cleanString(value.campaignName),
      adGroupId: cleanString(value.adGroupId),
      adGroupName: cleanString(value.adGroupName),
      keyword: cleanString(value.keyword),
      price: cleanNumber(value.price),
      currency: cleanString(value.currency) || "USD",
      trialConversion: value.trialConversion === true,
    };
  });

  return {
    completions,
    events,
    checkins,
    commands,
    lifecycle,
    lifecycleAvailable: lifecycleResult.available,
    fetchedAt: new Date(),
  };
}

export async function fetchAppleAdsReport(user, startDate, endDate) {
  if (!user) throw new Error("Sign in again before loading Apple Ads.");
  const token = await user.getIdToken();
  const response = await fetch("/api/app-analytics", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ startDate, endDate }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Apple Ads did not load.");
  return payload;
}

function parseContent(value, label) {
  if (!value.exists()) return null;
  const raw = value.data()?.json;
  if (typeof raw !== "string" || !raw.trim()) throw new Error(`${label} is present but has no JSON.`);
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${label} contains invalid JSON.`);
  }
}

export async function fetchProgramContent() {
  const [catalogDoc, programsDoc] = await Promise.all([
    getDoc(doc(db(), "content", "catalog_v1")),
    getDoc(doc(db(), "content", "programs_v1")),
  ]);
  const catalog = parseContent(catalogDoc, "The video catalog");
  const programs = parseContent(programsDoc, "The program library");
  return { catalog, programs };
}

export function validateProgramContent(catalog, programs) {
  const errors = [];
  const videos = Array.isArray(catalog?.videos) ? catalog.videos : [];
  const plans = Array.isArray(programs?.programs) ? programs.programs : [];
  const videoIds = new Set();

  if (!Number.isInteger(catalog?.version) || catalog.version < 1) errors.push("Catalog version must be a positive whole number.");
  if (!Number.isInteger(programs?.version) || programs.version < 1) errors.push("Program version must be a positive whole number.");
  if (!videos.length) errors.push("The catalog has no videos.");

  for (const video of videos) {
    if (!video?.id || typeof video.id !== "string") errors.push("A catalog video is missing its id.");
    else if (videoIds.has(video.id)) errors.push(`Duplicate video id: ${video.id}`);
    else videoIds.add(video.id);
    try {
      const url = new URL(video?.url || "");
      if (url.protocol !== "https:" || !url.hostname) throw new Error("invalid");
    } catch {
      errors.push(`${video?.title || video?.id || "A video"} needs a secure https URL.`);
    }
  }

  const planByGoal = new Map(plans.map((plan) => [plan?.goal, plan]));
  for (const goal of GOALS) {
    const plan = planByGoal.get(goal);
    if (!plan) {
      errors.push(`Missing program: ${goal}`);
      continue;
    }
    const weeks = Array.isArray(plan.weeks) ? plan.weeks : [];
    if (new Set(weeks.map((week) => week?.week)).size !== weeks.length) errors.push(`${goal} contains a repeated week number.`);
    const days = weeks.flatMap((week) => Array.isArray(week?.days) ? week.days : []);
    if (days.length !== 90) errors.push(`${goal} must contain exactly 90 days.`);
    days.forEach((day, index) => {
      if (day?.day !== index + 1) errors.push(`${goal} has a missing or out-of-order day near ${index + 1}.`);
      const expectedWeek = Math.floor(index / 7) + 1;
      const storedWeek = weeks.find((week) => Array.isArray(week?.days) && week.days.includes(day))?.week;
      if (storedWeek !== expectedWeek) errors.push(`${goal}, day ${index + 1}, is stored in the wrong week.`);
      const ids = Array.isArray(day?.videoIDs) ? day.videoIDs : [];
      if (!ids.length) errors.push(`${goal}, day ${index + 1}, has no videos.`);
      if (new Set(ids).size !== ids.length) errors.push(`${goal}, day ${index + 1}, repeats a video.`);
      ids.forEach((id) => {
        if (!videoIds.has(id)) errors.push(`${goal}, day ${index + 1}, refers to a missing video: ${id}`);
      });
    });
  }

  if (plans.length !== GOALS.length) errors.push(`There must be exactly ${GOALS.length} goal programs.`);
  return [...new Set(errors)];
}

export async function publishProgramContent(catalog, programs) {
  const errors = validateProgramContent(catalog, programs);
  if (errors.length) throw new Error(errors.slice(0, 5).join(" "));

  await setDoc(doc(db(), "content", "programs_v1"), {
    json: JSON.stringify(programs),
    version: programs.version,
    updatedAt: serverTimestamp(),
  });
}

export { GOALS as APP_GOAL_IDS };
