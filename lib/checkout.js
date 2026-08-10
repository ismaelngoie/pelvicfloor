"use client";

// The browser half of checkout. One call, one clear result.
//
// The server half is functions/api/create-payment-intent.js. It answers with
// either { clientSecret, ... } or { error: { code, message } }, and `message`
// is always something we are happy to show a member, so this file never has to
// invent copy for a failure it does not understand.

/**
 * Shown on the paywall before Stripe has told us anything. The authoritative
 * amount comes back from the API with the client secret and the checkout sheet
 * shows that one, so a price change in Stripe can never leave a stale number on
 * the button she actually presses.
 *
 * The values now live in lib/pricing.js and are re-exported here so every
 * existing import keeps working. They moved because this file is a client
 * module, and the homepage structured data is built on the server: a server
 * component cannot read a constant through a client reference, so quoting the
 * price to a crawler meant typing it a second time. Read the header of
 * lib/pricing.js before changing either name.
 */
export { DEFAULT_PRICE_LABEL, DEFAULT_PRICE_PERIOD } from "./pricing";
import { DEFAULT_PRICE_LABEL } from "./pricing";

/** 2499, "usd" -> "$24.99". Falls back to the plain amount for odd currencies. */
export function formatAmount(amount, currency = "usd") {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return DEFAULT_PRICE_LABEL;
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: (currency || "usd").toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${(currency || "usd").toUpperCase()}`;
  }
}

/** An id that survives a retry, so a double tap cannot double charge. */
export function newAttemptKey() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    // Old browser. The fallback below is good enough: the server hashes this
    // together with her email before handing it to Stripe.
  }
  return `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export function isValidEmail(value) {
  const v = (value || "").trim();
  if (v.length < 6 || v.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

const GENERIC_FAILURE =
  "We could not start the checkout. Please check your internet connection and try again.";

/**
 * Ask the server for a subscription and its payment client secret.
 * Resolves to { ok: true, ...data } or { ok: false, code, message }.
 */
export async function createSubscriptionIntent({
  email,
  name = "",
  uid = "",
  memberId = "",
  goalId = "",
  attemptKey,
  signal,
} = {}) {
  if (!isValidEmail(email)) {
    return {
      ok: false,
      code: "invalid_email",
      message: "Enter a valid email address so we can send your receipt.",
    };
  }

  let res;
  try {
    res = await fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        name: (name || "").trim().slice(0, 120),
        uid,
        memberId,
        goalId,
        attemptKey: attemptKey || newAttemptKey(),
      }),
      signal,
    });
  } catch {
    return { ok: false, code: "network_error", message: GENERIC_FAILURE };
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || !data || data.error) {
    const err = data?.error;
    return {
      ok: false,
      code: err?.code || `http_${res.status}`,
      message: err?.message || GENERIC_FAILURE,
    };
  }

  if (!data.clientSecret) {
    return { ok: false, code: "no_client_secret", message: GENERIC_FAILURE };
  }

  return { ok: true, ...data };
}
