"use client";

// One member, one record, whichever device she used.
//
// THE JOIN. The iOS app has no visible sign-in: it identifies a member by her
// RevenueCat app user id and writes her document to users/{revenueCatId}. The
// web app signs her in with Google, which gives a different id but a *verified
// email address*. So email is the join key, and it is the only one available.
//
// iOS writes `email` into its own document whenever she gives one (see
// CloudSync.captureEmail in the iOS repo), so the lookup below is:
//
//     users where email == <her verified Google email>
//
// Firestore rules must allow that query for the signed-in owner only. Without
// the rule in firestore.rules this returns nothing rather than leaking data.
//
// Document shape (written by iOS, mirrored here so the two stay compatible):
//   name, email, goal, goalTitle, age, weightLbs, heightInches, joinDate,
//   programDay, programStartedAt, streak, bestStreak, lastActiveAt,
//   appVersion, platform, authUID
// Subcollections: completions, events, checkins, chat

import {
  collection, query, where, limit, limitToLast, getDocs, doc, getDoc, setDoc,
  serverTimestamp, orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Find the document the iOS app already writes for this email, if any.
 *
 * Two things this has to get right, and neither is obvious:
 *
 *   1. CASE. The iPhone app stores the address exactly as she typed it into the
 *      email capture screen (CloudSync.captureEmail trims it but does not lower
 *      case it), so a member who typed "Jane@Gmail.com" is invisible to a query
 *      for "jane@gmail.com". She would be handed a brand new record: no streak,
 *      no history, day 1 again, and a guarantee clock that starts over. Both
 *      spellings are asked for. firestore.rules has to lower case both sides of
 *      its own email comparison for this to be allowed through.
 *
 *   2. TWINS. If two records genuinely carry the address, `limit(1)` with no
 *      ordering returns whichever one Firestore feels like, and it does not
 *      have to be the same one twice. Adopting a different record on different
 *      visits makes her progress appear and disappear. The phone's record wins
 *      when there is one, because it holds the real history; otherwise the
 *      first by document id, which never changes.
 */
export async function findMemberByEmail(email) {
  const raw = (email || "").trim();
  const clean = raw.toLowerCase();
  if (!clean) return null;

  const spellings = [...new Set([clean, raw])];
  const pick = (snap) => {
    if (snap.empty) return null;
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  };

  const byEmail = pick(
    await getDocs(query(collection(db(), "users"), where("email", "in", spellings), limit(10)))
  );
  if (byEmail) return byEmail.find((row) => row.platform === "ios") || byEmail[0];

  // SECOND ASK, ON THE FIELD THE APP DOES NOT OWN.
  //
  // `email` is whatever she typed on her phone, so the query above is exact and
  // case sensitive against a value nothing normalises. `emailLower` is written
  // by this file the first time a record is adopted, so from then on there is a
  // spelling that always matches. Asking for it costs one read on the path
  // where the first query already failed — which is the path where a member is
  // about to be handed a blank record and told she is on day 1.
  //
  // This does NOT close the case gap on its own: a record written only by the
  // iPhone app has no `emailLower` at all, and no Firestore query can lower
  // case a stored field. The remaining half of the fix is a one-off backfill of
  // `emailLower` across `users`, which needs the service account. See the note
  // in the QA report; do not delete this query when that lands, it is what
  // keeps working afterwards.
  const byLower = pick(
    await getDocs(query(collection(db(), "users"), where("emailLower", "==", clean), limit(10)))
  );
  if (byLower) return byLower.find((row) => row.platform === "ios") || byLower[0];

  return null;
}

/**
 * Resolve the record this signed-in member should use.
 *
 * If she already has an iOS document under the same email we adopt it, so her
 * streak, program day and history carry straight over. Otherwise we create a
 * web-owned record keyed by her Firebase uid.
 *
 * Returns { id, isLinkedToApp, ...data }.
 */
export async function resolveMember(user) {
  if (!user?.uid) throw new Error("resolveMember needs a signed-in user.");
  const email = (user.email || "").trim().toLowerCase();

  // The address AS THE PROVIDER SPELLS IT, not the lower cased one.
  //
  // findMemberByEmail asks for two spellings on purpose, because the iPhone app
  // stores the address exactly as she typed it. Handing it an already lower
  // cased string collapsed both spellings into one and made the entire defence
  // it documents a no-op — every caller of it is this line. Google normalises
  // its own addresses, so this only differs for providers that do not, but the
  // point is that the function is now given the chance it was written to have.
  const existing = email ? await findMemberByEmail((user.email || "").trim()) : null;
  if (existing) {
    // Adopt the iOS record. Stamp the web uid so support can see both halves,
    // and never overwrite anything the app owns.
    //
    // `emailLower` is stamped on the way past, and it is the durable half of
    // the join. Anything that has to match her record against an address later,
    // whether that is a subscription lookup or a support search, has no signed
    // in member to guess spellings for, so a record that only ever says
    // "Jane@Gmail.com" is a record nobody finds. Lower casing `email`
    // itself would not hold: the app pushes its own copy back on every profile
    // sync and it cannot be changed. A field the app never writes can.
    await setDoc(
      doc(db(), "users", existing.id),
      { webUID: user.uid, emailLower: email, lastWebActiveAt: serverTimestamp() },
      { merge: true }
    );
    return { ...existing, emailLower: email, isLinkedToApp: existing.platform === "ios" };
  }

  const ref = doc(db(), "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await setDoc(ref, { emailLower: email, lastWebActiveAt: serverTimestamp() }, { merge: true });
    return { id: ref.id, isLinkedToApp: false, ...snap.data(), emailLower: email };
  }

  const fresh = {
    email,
    emailLower: email,
    name: user.displayName || "",
    platform: "web",
    webUID: user.uid,
    authUID: user.uid,
    joinDate: new Date().toISOString(),
    programDay: 1,
    streak: 0,
    bestStreak: 0,
    lastWebActiveAt: serverTimestamp(),
  };
  await setDoc(ref, fresh, { merge: true });
  return { id: ref.id, isLinkedToApp: false, ...fresh };
}

/** Merge a partial profile update. Never clears fields it was not given. */
export async function updateMember(memberId, patch) {
  if (!memberId) return;
  await setDoc(
    doc(db(), "users", memberId),
    { ...patch, lastWebActiveAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Record a finished day. Written in the same shape the iOS app uses so a day
 * done on the web shows up on the phone and counts toward the guarantee.
 */
export async function recordDayCompletion(memberId, { programID, day, secondsWatched }) {
  if (!memberId) return;
  await setDoc(
    doc(db(), "users", memberId, "completions", `${programID}_${day}`),
    {
      programID,
      day,
      completedAt: serverTimestamp(),
      secondsWatched: Math.max(0, Math.round(secondsWatched || 0)),
      creditedFromLegacy: false,
      source: "web",
    },
    { merge: true }
  );
}

/** Record a single watched video, matching the iOS `events` subcollection. */
export async function recordWorkoutEvent(memberId, event) {
  if (!memberId) return;
  const id = `${Date.now()}_${Math.round(Math.random() * 1e6)}`;
  await setDoc(doc(db(), "users", memberId, "events", id), {
    ...event,
    date: serverTimestamp(),
    source: "web",
  });
}

/** Everything the member has finished, so the pathway can draw itself. */
export async function fetchCompletions(memberId) {
  if (!memberId) return [];
  const snap = await getDocs(collection(db(), "users", memberId, "completions"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Coach Mia transcript, oldest first, shared with the phone. */
export async function fetchChat(memberId, max = 200) {
  if (!memberId) return [];
  // limitToLast: with an ascending order a plain limit returns the START of the
  // conversation, so a long-standing member would never see a recent message.
  const snap = await getDocs(
    query(collection(db(), "users", memberId, "chat"), orderBy("date", "asc"), limitToLast(max))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
