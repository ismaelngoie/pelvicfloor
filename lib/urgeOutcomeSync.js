"use client";

import { doc, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import { FIXTURES_ON } from "./devFixtures";
import { logDiaryEntry } from "@/components/member/youStore";

export async function writeQueuedUrgeOutcome(memberId, entry) {
  const record = { kind: "urge", timestamp: new Date(entry.timestamp), note: entry.note,
    volumeML: null, leakSize: null, urgencyLevel: null, fluidType: null, source: "web" };
  if (!isFirebaseConfigured() || (process.env.NODE_ENV !== "production" && FIXTURES_ON)) {
    await logDiaryEntry(memberId, record);
    return;
  }
  // A retry after a lost acknowledgement replaces this same document. It never
  // creates a duplicate diary entry, even across a page reload while offline.
  await setDoc(doc(db(), "users", memberId, "diary", entry.id), record);
}
