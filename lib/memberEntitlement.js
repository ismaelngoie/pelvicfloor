"use client";

// Who gets into the member app.
//
// There is no single "entitled" flag anywhere in the world, because the two
// halves of this product sell through different shops and neither of them keeps
// its answer in our database:
//
//   web    Stripe. Ask it. functions/api/entitlement.js verifies who is asking
//          from her Firebase ID token, looks her subscriptions up by the
//          verified address and answers { active, status, renewsAt, ... }. That
//          answer is passed IN to this file — see the note on `live` below.
//
//   iOS    RevenueCat and the App Store. The phone never writes an entitlement
//          field at all, and RevenueCat never touches Firestore. What it does
//          write is `programStartedAt`, and the program clock only starts on the
//          screen that appears after a successful purchase, so a non-null
//          `programStartedAt` on an iOS document is a purchase and nothing else
//          can produce one.
//
// WHAT CHANGED. This file used to read an `entitlement` object off the member
// document, mirrored there by a Stripe webhook. The webhook is gone and so is
// that branch: reading a stale mirror was how a member who had paid an hour ago
// got a locked door.
//
// THE OBJECT ITSELF IS BACK, AND THIS FILE STILL MUST NOT READ IT. Three
// Workers write it now — /api/session-from-payment the moment a payment clears,
// /api/entitlement on every live check, /api/restore-purchase from the recovery
// screen — but it is written for a reader that is not this one. The iPhone app
// cannot call /api/entitlement: that endpoint answers 403 to a native request,
// which sends no Origin header, so the mirror is the only way a web buyer gets
// into the app she was told to install. On the phone that is safe because the
// app only ever GRANTS from it. Here it would not be: a browser CAN ask Stripe,
// so anything less than asking is a stale copy standing between a paying member
// and her program. Ask.
//
// Everything here defaults to DENY. Signed in but not entitled gets the
// recovery screen, never the program.

// Namespace import on purpose: lib/entitlement.js is the checkout's file, not
// this one, and a rename there should degrade to "check the record" rather than
// break the member app's build.
import * as browserCache from "./entitlement";

// How long a fresh card approval opens the door on its own, before Stripe has
// to back it up. Long enough to cover the seconds between "card approved" and
// the first live check, far too short to be a way in.
const PENDING_CHECK_MS = 30 * 60 * 1000;

function normalize(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate(); // Firestore Timestamp
  if (typeof value === "number") {
    // Stripe period ends are seconds, JS dates are milliseconds.
    return new Date(value < 1e12 ? value * 1000 : value);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {object|null} member  her users/{id} document
 * @param {object|null} live    the body of a successful POST /api/entitlement,
 *   or null when we have not got one. Passed in rather than fetched here on
 *   purpose: this stays a pure function that a render can call on every pass,
 *   and the one place that owns the fetch is the member gate.
 *
 *   null means "we do not know", NEVER "she is not paying". A network blip, a
 *   cold Worker or an expired token must not turn into a locked door for
 *   somebody whose card cleared, so an absent answer simply falls through to
 *   the signals below it.
 *
 * @returns {{ active: boolean, source: "web"|"ios"|"pending"|null, renewsAt: Date|null }}
 */
export function entitlementState(member, live = null) {
  // 0. A human decision made in /admin beats every automatic signal, in both
  //    directions: it unlocks someone Stripe has not caught up with, and it
  //    cuts off a refunded member straight away. It is the only signal that can
  //    say no as well as yes.
  if (member) {
    const override = normalize(member.entitlementOverride);
    if (override === "active" || override === "trial") {
      return { active: true, source: "web", renewsAt: null };
    }
    if (override === "free" || override === "expired") {
      return { active: false, source: null, renewsAt: null };
    }
  }

  // 1. What Stripe said just now. `active` is the endpoint's decision, made
  //    from the raw subscription status, and it already covers the awkward one:
  //    `past_due` is a card Stripe is still retrying, and locking her out on the
  //    first failed retry would punish a member for an expired card.
  //
  //    Only ever consulted to let her IN. Stripe saying no is not the end of the
  //    question, because an App Store member has no Stripe subscription at all
  //    and would otherwise be shut out by an answer that was never about her.
  if (live?.active === true) {
    return { active: true, source: "web", renewsAt: toDate(live.renewsAt) };
  }

  // 2. Bought on the phone. Still the only way an App Store purchase is
  //    recognised, because RevenueCat does not write to Firestore.
  if (member && normalize(member.platform) === "ios" && member.programStartedAt) {
    return { active: true, source: "ios", renewsAt: null };
  }

  // 3. She paid on this browser minutes ago. Deliberately last and deliberately
  //    short lived: Stripe is the truth, and this only covers the gap between
  //    "card approved" and the first live check, so the happiest moment in the
  //    funnel is not a locked door.
  if (justPaidOnThisBrowser(member)) {
    return { active: true, source: "pending", renewsAt: null };
  }

  return { active: false, source: null, renewsAt: null };
}

/**
 * The cache only ever speaks for the person it was written for.
 *
 * It carries the address that paid, and the restore sheet in the funnel writes
 * it for ANY address Stripe reports as paying. Without the match below, someone
 * who knows a member's email address could sign in with her own account, run
 * the restore sheet against that address, and be let into the member app on the
 * strength of a note her own browser had just written. Once there is a record
 * on screen, the cache has to agree about who she is.
 */
function justPaidOnThisBrowser(member) {
  if (typeof browserCache.isEntitled !== "function") return false;
  if (!browserCache.isEntitled()) return false;
  if (typeof browserCache.readEntitlement !== "function") return false;
  const cached = browserCache.readEntitlement();
  const stamped = Date.parse(cached?.updatedAt || "");
  if (Number.isNaN(stamped)) return false;
  if (Date.now() - stamped >= PENDING_CHECK_MS) return false;

  const memberEmail = normalize(member?.email);
  if (!memberEmail) return true; // Nobody signed in yet: the funnel's own gap.
  return normalize(cached?.email) === memberEmail;
}

export function hasEntitlement(member, live = null) {
  return entitlementState(member, live).active;
}
