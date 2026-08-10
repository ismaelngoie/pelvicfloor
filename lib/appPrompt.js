"use client";

// Whether to offer the iPhone app, and the memory of having been told no.
//
// THE RULE THE OWNER SET, IN HIS WORDS: "If they have paid that means they are
// convinced. Just put a beautiful popup if they want to download." So this file
// is deliberately narrow. It answers one question, and it answers it "no" more
// often than "yes":
//
//   - Not an iPhone or iPad?            no. Android and desktop must never be
//                                       shown an App Store link they cannot use.
//   - Already said "not now"?           no, and never again on this browser.
//   - Already tapped through to Apple?  no. She has the link; asking twice is
//                                       nagging, and she may already have the app.
//
// DETECTION IS BY USER AGENT, NEVER BY SCREEN WIDTH. A 375px viewport is a
// phone, not an iPhone, and the single most common way to ship "download our
// iOS app" to an Android user is a media query. isIOSDevice lives in
// lib/appStore.js next to the App Store link it guards, and covers iPadOS,
// which reports itself as a Mac and is caught by the touch-point count.
//
// A note on where this is NOT used: nothing in the funnel may call it. Sending
// a warm prospect to the App Store before she has paid costs the whole sale to
// save a 15% commission on it. The reasoning is written up in full in
// recon/APP-BANNER-RESEARCH.md.

import { APP_HANDOFF_READY, isIOSDevice } from "./appStore";

export const APP_OFFER_KEY = "pelvi.appOffer.v1";

// The one switch lives in lib/appStore.js, next to the App Store link and the
// Smart App Banner it also governs, because that module carries no "use client"
// and a page's metadata export has to be able to read it. Re-exported here so
// anything reasoning about the offer can find it from the file that decides
// whether to make it. Read the comment on it before changing anything below.
export { APP_HANDOFF_READY };

/** Why the offer stopped being shown. Kept for the analytics tag, nothing else. */
export const OFFER_CLOSED = {
  notNow: "not_now",
  openedStore: "opened_store",
};

function read() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(APP_OFFER_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return saved && typeof saved === "object" ? saved : null;
  } catch {
    return null;
  }
}

/**
 * Has she already closed this offer?
 *
 * No expiry on purpose. "Never shown again once dismissed" means never, not
 * "not for a fortnight". If she wants the app later the Smart App Banner is
 * still there in Safari on every signed-in page, and Safari owns that
 * dismissal separately.
 */
export function isAppOfferClosed() {
  return Boolean(read()?.closedAt);
}

/** Record the no, or the yes. Either way the offer is finished. */
export function closeAppOffer(reason = OFFER_CLOSED.notNow) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      APP_OFFER_KEY,
      JSON.stringify({ v: 1, closedAt: Date.now(), reason })
    );
  } catch {
    // Storage is off. The worst case is that she is offered the app once more
    // on her next visit, which is a great deal better than a checkout that
    // throws because a preference could not be saved.
  }
}

/**
 * May we offer the app on this device, right now?
 *
 * CALL THIS AFTER MOUNT, NEVER DURING RENDER. It reads navigator and
 * localStorage, so a server render and the first client render would disagree
 * and React would blow the whole tree away. Every caller holds the answer in
 * state set from an effect, which also means the button fades in rather than
 * appearing mid-read.
 */
export function canOfferApp() {
  if (!APP_HANDOFF_READY) return false;
  return isIOSDevice() && !isAppOfferClosed();
}
