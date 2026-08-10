"use client";

// The browser's copy of "has she paid".
//
// IMPORTANT: this is a CACHE, never the truth. The truth is Stripe itself,
// asked live through /api/entitlement once she is signed in, and the App Store
// for anyone who bought on the phone. This file exists so that the seconds
// between "card approved" and that first live check do not look like a locked
// door, and so a member who is not signed in on this device still gets through
// the success page.
//
// Anything that actually costs money (video access on another device, a support
// claim, a refund) must go and ask, not read this.

import { allowOpenPlan } from "./openPlan";

export const ENTITLEMENT_KEY = "pelvi.entitlement";

// The pre-rebuild dashboard reads a single localStorage blob with an
// `isPremium` boolean. Mirror into it so a member who pays today is not locked
// out by a screen that has not been rebuilt yet.
const LEGACY_KEY = "pelvic_user_data";

function safeParse(raw) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

/** What the browser currently believes. Never throws. */
export function readEntitlement() {
  if (typeof window === "undefined") return null;
  try {
    return safeParse(window.localStorage.getItem(ENTITLEMENT_KEY));
  } catch {
    return null;
  }
}

/** True when this browser has a cached, unexpired entitlement. */
export function isEntitled() {
  const e = readEntitlement();
  if (!e?.active) return false;
  if (!e.currentPeriodEnd) return true;
  const end = new Date(e.currentPeriodEnd).getTime();
  if (Number.isNaN(end)) return true;
  // One day of slack so a renewal in flight does not lock her out.
  return end + 24 * 60 * 60 * 1000 > Date.now();
}

/**
 * Write the cache. The shape mirrors what a Stripe subscription answer looks
 * like, so this and a live answer can be compared field for field when
 * something looks wrong.
 */
export function writeEntitlement(patch) {
  if (typeof window === "undefined") return null;
  const next = {
    active: false,
    source: "stripe",
    priceId: null,
    currentPeriodEnd: null,
    subscriptionId: null,
    email: null,
    ...(readEntitlement() || {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(next));
  } catch {
    // Private browsing with storage disabled. The Firestore record still
    // exists, so she is not actually locked out once she signs in.
  }
  mirrorLegacyFlag(next.active);
  // A payment ends the one situation that switches the landing page redirect
  // off. Somebody who reached the funnel from the recovery screen, because
  // Stripe said she had no plan, has just proved otherwise by buying one; from
  // here on pelvi.health belongs to her dashboard again. Only on a yes: writing
  // active:false is a failed payment, which is not evidence of anything.
  if (next.active) allowOpenPlan();
  return next;
}

/** Called the moment Stripe confirms a payment. */
export function markEntitlementActive(details = {}) {
  return writeEntitlement({ ...details, active: true });
}

export function clearEntitlement() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ENTITLEMENT_KEY);
  } catch {
    // Nothing to do. See writeEntitlement.
  }
  mirrorLegacyFlag(false);
}

function mirrorLegacyFlag(active) {
  try {
    const blob = safeParse(window.localStorage.getItem(LEGACY_KEY));
    if (!blob) return;
    if (blob.isPremium === active) return;
    window.localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({ ...blob, isPremium: Boolean(active) })
    );
  } catch {
    // Best effort only.
  }
}
