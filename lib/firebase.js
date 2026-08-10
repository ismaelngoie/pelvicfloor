"use client";

// Firebase for the web app. Same project as the iOS app
// (pelvic-floor-exercise-908ed), so a member's data is one document whichever
// device she opens.
//
// Everything here is client-side and lazy: the SDK is only fetched when a
// screen actually needs auth or data, so the marketing funnel stays fast for
// the visitor who never signs in.
//
// These values are NOT secrets. A Firebase web config identifies the project,
// it does not grant access — access is decided by Firestore security rules.
// See firestore.rules in the repo root for the rules this app expects.

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  browserLocalPersistence, browserPopupRedirectResolver, getAuth,
  indexedDBLocalPersistence, initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// These are the real values, written in on purpose rather than left as
// environment variables.
//
// A Firebase web config is NOT a secret. It is shipped inside the JavaScript of
// every Firebase website in the world, and anyone can read it with View Source.
// All it does is name the project to talk to. What actually decides who may read
// what is firestore.rules.
//
// Keeping them here means the site cannot deploy half-configured, and there is
// one less thing to set up by hand. The env vars still win if they are present,
// so a staging project can override without a code change.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    || "AIzaSyDaXbISNKC-lUcKBqIuPGsrRFxVGPdNHGw",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    || "pelvic-floor-exercise-908ed.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    || "pelvic-floor-exercise-908ed",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    || "pelvic-floor-exercise-908ed.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    || "703443288211",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    || "1:703443288211:web:c107beb03d9784423f8d66",
};

/** True when the deployment has been given its Firebase keys. */
export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.appId);
}

let cachedApp = null;

function app() {
  if (cachedApp) return cachedApp;
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured for this deployment.");
  }
  cachedApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return cachedApp;
}

// --- How long a member stays signed in --------------------------------------
//
// A YEAR IS NOT THE CEILING. A Firebase session does not expire on a timer at
// all. What the browser stores is a REFRESH TOKEN, and a refresh token has no
// expiry date: it lives until one of four things happens to it.
//
//   1. She signs out.  signOut() deletes it from this browser.
//   2. Her password changes, or the account is disabled or deleted.
//   3. Somebody revokes it (Firebase console, or the Admin SDK).
//   4. The browser throws the storage away: she clears site data, or the OS
//      evicts it. Safari's Intelligent Tracking Prevention deletes script
//      written localStorage after SEVEN DAYS of no interaction with the site,
//      and that is the one real world clock on this. It is a Safari policy, not
//      something this code can lengthen; the fix for a member who hits it is
//      that /app asks for her address and emails her a link, once.
//
// The ID token inside it expires every hour, which is why a tab left open still
// works: the SDK swaps a fresh one in on its own, silently, using the refresh
// token. Nothing in this product does anything on an hourly boundary.
//
// WHY initializeAuth AND NOT getAuth. getAuth() picks a persistence for us, and
// the list it picks from is, in order:
//
//   [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence]
//
// Two problems with accepting that default, and both of them cost a member her
// session.
//
//   browserSessionPersistence IS ON THE END OF THAT LIST. It is sessionStorage:
//   it dies when the tab is closed. Any browser where IndexedDB and localStorage
//   both look unavailable falls all the way through to it, and that member is
//   signed out by closing a tab. Naming the two durable stores explicitly, and
//   leaving that one off, means the worst case is an in-memory session for the
//   current page rather than a session that quietly lasts one tab.
//
//   IndexedDB IS ASYNCHRONOUS. Nothing can read it before the first paint. The
//   landing page has to answer "has this browser already paid" before it paints
//   anything, or a member who paid gets one frame of the page that sells the
//   thing she owns. localStorage is synchronous, so putting it first is what
//   makes lib/openPlan.js possible at all. See that file.
//
// The array is a search order, not a single choice: PersistenceUserManager
// looks for an existing session in EVERY entry and then migrates it to the
// first available one. So a member who signed in before this change, whose
// session is sitting in IndexedDB, is not signed out. Her session is moved into
// localStorage the first time she opens /app after this deploys, and every
// visit after that gets the instant redirect.
//
// browserPopupRedirectResolver has to be passed by hand here. getAuth() adds it
// for us; initializeAuth does not, and without it signInWithPopup and
// signInWithRedirect fail with auth/argument-error. Google sign-in in
// MemberProvider is exactly that call.
let cachedAuth = null;

export function auth() {
  if (cachedAuth) return cachedAuth;
  const instance = app();
  try {
    cachedAuth = initializeAuth(instance, {
      persistence: [browserLocalPersistence, indexedDBLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    // auth/already-initialized. Something got there first (a chunk that reached
    // for getAuth), and the instance it made is the one every other call in
    // this document is already holding, so take that rather than fail.
    cachedAuth = getAuth(instance);
  }
  return cachedAuth;
}

export function db() {
  return getFirestore(app());
}

/** The one account allowed into /admin. Checked again by Firestore rules. */
export const ADMIN_EMAIL = "ismael@ngoie.com";

export function isAdminEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase() === ADMIN_EMAIL;
}
