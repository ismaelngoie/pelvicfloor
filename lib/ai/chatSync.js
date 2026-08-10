"use client";

// Writing Coach Mia's side of the conversation to Firestore.
//
// Her side, because the member's side already has a home in lib/memberData.js
// (sendChatMessage). This file exists so the reply write sits next to the code
// that generates it, and it uses the same document shape:
//
//   users/{id}/chat/{messageID}
//     role    "user" | "mia"
//     source  "user" | "gemini" | "admin" | "proactive"
//     text    string          the RAW reply, markers and all
//     date    timestamp
//
// That shape comes from CloudSync.swift on iOS, which pushes a Gemini reply as
// role "mia", source "gemini". Writing the same thing here means the transcript
// reads identically wherever she opens it, and /admin sees one conversation
// rather than half of one.
//
// SOURCE IS "gemini", NEVER "admin". The dashboard's takeover writes "admin",
// and the phone listens for exactly that value to pop a reply into the chat
// live. Labelling a generated reply "admin" would make every web answer look
// like the owner typed it and would fire the phone's admin path. The provenance
// stays honest. A locally screened safety reply is written as "safety", which
// /admin renders as Coach Mia like any other non-admin source.
//
// THE RAW TEXT IS WHAT IS STORED, not the parsed text. The phone re-derives its
// routine card from "**Recommendation:** Today's 5-Minute Routine" every time it
// loads a message, so stripping that line here would cost the card on reload.

import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Save one of Mia's replies.
 *
 * The id is time-ordered so the transcript still sorts correctly in the instant
 * before the server timestamp resolves, matching sendChatMessage.
 *
 * @returns the document id, or null when there was nothing to write
 */
export async function saveCoachReply(memberId, text, { id: givenId, source = "gemini" } = {}) {
  const body = String(text || "").trim();
  if (!memberId || !body) return null;
  // The caller may name the document. That is what lets the screen show a reply
  // while it streams and then hand the same bubble over to the live listener
  // without it appearing twice or blinking in between.
  const id = givenId || `web_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
  await setDoc(doc(db(), "users", memberId, "chat", id), {
    role: "mia",
    source,
    text: body,
    date: serverTimestamp(),
    platform: "web",
  });
  return id;
}
