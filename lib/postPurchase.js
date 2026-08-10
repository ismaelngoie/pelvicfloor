"use client";

// The two facts the screen after payment needs, kept somewhere that survives
// the payment.
//
// WHY THIS FILE EXISTS. The funnel keeps everything she answered in
// `pelvi.funnel.v1`, and components/PaywallScreen.js deliberately deletes that
// record the moment a payment succeeds, so a paying member is never dropped
// back onto the money screen. That delete happens BEFORE the push to /welcome,
// which means the screen she sees straight after paying had no idea what her
// goal was. It showed her the same generic page it showed everybody.
//
// That is the mismatch the owner named: someone who came for intimacy being
// shown bladder-leak content. Showing nothing is better than showing the wrong
// thing, so this record is the difference between the post-purchase screen
// being hers and being anyone's.
//
// WHAT IS STORED, AND WHAT IS NOT. Her goal id and her first name. Nothing
// else. No email, no age, no health answers, no conditions: none of it is
// needed to render the 90-day screen, and a health condition sitting in
// localStorage for months is a liability with no upside.
//
// WHEN IT IS WRITTEN. On arrival at the paywall, not on success. Stripe can
// take a card through a 3-D Secure redirect, and on that path the browser
// leaves the page and comes back to /welcome as a fresh document, so any code
// that was going to run "after the payment resolves" never ran. Writing at the
// paywall covers the redirect path and the inline path with one line.

export const PLAN_KEY = "pelvi.plan.v1";

// A month. Long enough for a 3-D Secure detour, an interrupted checkout or a
// reload, and short enough that a browser someone else uses later is not still
// carrying a stranger's first name.
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Remember whose plan this is.
 *
 * @param {{goalId?: string|null, name?: string}} profile
 */
export function rememberPlan(profile) {
  if (typeof window === "undefined") return;
  const goalId = typeof profile?.goalId === "string" ? profile.goalId : null;
  // First name only, and capped. The 90-day screen greets her with one word.
  const name = String(profile?.name || "").trim().split(/\s+/)[0].slice(0, 40);
  if (!goalId && !name) return;
  try {
    window.localStorage.setItem(
      PLAN_KEY,
      JSON.stringify({ v: 1, goalId, name, savedAt: Date.now() })
    );
  } catch {
    // Private browsing, or storage switched off. The post-purchase screen
    // degrades to its no-goal shape, which is a real design and not a broken
    // one. Nothing here is worth throwing over.
  }
}

/**
 * What she is actually being charged, from Stripe's own answer.
 *
 * WHY THIS IS NOT lib/pricing.js. That file holds the ADVERTISED price, which
 * is the right number for a paywall and for structured data. The screen after
 * payment prints a RECEIPT line, and a receipt has to be the real amount: a
 * promotional price, a legacy price a returning member is still on, or a member
 * charged in another currency all turn the advertised label into a false
 * statement about her money, on the one screen where being wrong about it is
 * least forgivable. Before this, that line read the advertised constant and
 * called it "Payment confirmed".
 *
 * Written when the payment intent comes back rather than on success, for the
 * same reason the goal above is written on arrival at the paywall: the 3-D
 * Secure path never runs another line of this document's JavaScript after the
 * card is confirmed.
 *
 * Nothing personal is stored. An amount, a currency and an interval.
 */
export function rememberPrice({ amount, currency, interval } = {}) {
  if (typeof window === "undefined") return;
  if (typeof amount !== "number" || !Number.isFinite(amount)) return;
  try {
    const raw = window.localStorage.getItem(PLAN_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    const base = saved && saved.v === 1 ? saved : { v: 1, goalId: null, name: "" };
    window.localStorage.setItem(
      PLAN_KEY,
      JSON.stringify({
        ...base,
        price: { amount, currency: currency || "usd", interval: interval || "month" },
        savedAt: Date.now(),
      })
    );
  } catch {
    // See rememberPlan. A missing price renders as no price, never as a guess.
  }
}

/**
 * Whose plan this is, or null.
 *
 * Null is a supported answer, not a failure: it is what a restore on a new
 * browser looks like, and every caller has to render something honest for it.
 * That is the whole point. A default goal here would be a guess printed as a
 * fact on the one screen where being wrong is most expensive.
 */
export function readPlan() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || saved.v !== 1) return null;
    if (!saved.savedAt || Date.now() - saved.savedAt > MAX_AGE_MS) return null;
    const goalId = typeof saved.goalId === "string" ? saved.goalId : null;
    const name = typeof saved.name === "string" ? saved.name : "";
    const price =
      saved.price && typeof saved.price.amount === "number" && Number.isFinite(saved.price.amount)
        ? {
            amount: saved.price.amount,
            currency: typeof saved.price.currency === "string" ? saved.price.currency : "usd",
            interval: typeof saved.price.interval === "string" ? saved.price.interval : "month",
          }
        : null;
    if (!goalId && !name && !price) return null;
    return { goalId, name, price };
  } catch {
    return null;
  }
}

export function forgetPlan() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PLAN_KEY);
  } catch {
    // See rememberPlan.
  }
}
