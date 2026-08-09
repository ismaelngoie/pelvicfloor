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
import { getAuth } from "firebase/auth";
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

export function auth() {
  return getAuth(app());
}

export function db() {
  return getFirestore(app());
}

/** The one account allowed into /admin. Checked again by Firestore rules. */
export const ADMIN_EMAIL = "ismael@ngoie.com";

export function isAdminEmail(email) {
  return typeof email === "string" && email.trim().toLowerCase() === ADMIN_EMAIL;
}
