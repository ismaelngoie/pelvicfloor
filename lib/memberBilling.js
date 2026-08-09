"use client";

// The billing calls a signed-in member can make, in one place.
//
// The two older ones used to be a bare fetch with her email address in the
// body, from two screens each. The address proved nothing:
// /api/create-portal-session would open ANY customer's billing portal, cancel
// button and all, for whoever posted their address to it. Every endpoint here
// identifies the caller from a Firebase ID token instead, so the token has to
// be attached, and forgetting it on one of five call sites is exactly the kind
// of mistake a shared file prevents.
//
// The other half of the change: nothing here writes an entitlement. Whether she
// is paying is Stripe's own answer, fetched by fetchEntitlement() below and
// handed to lib/memberEntitlement.js, which is the only file that decides the
// gate.

import { auth, isFirebaseConfigured } from "./firebase";

async function idToken() {
  if (!isFirebaseConfigured()) return "";
  try {
    return (await auth().currentUser?.getIdToken()) || "";
  } catch {
    return "";
  }
}

async function post(path, body) {
  const token = await idToken();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/**
 * Ask Stripe, through our Worker, whether this account is paying.
 *
 * Resolves to { active, status, renewsAt, source, customerId }, or null when we
 * could not get an answer at all.
 *
 * null means UNKNOWN, never "not paying". The caller has to fall through to its
 * other signals: a cold Worker, a dropped connection or a token that expired
 * while the laptop was shut must never read as a cancelled subscription.
 *
 * `refresh` skips the endpoint's one minute memo, and is reserved for the
 * moment a member has just proved she paid and is waiting on the door.
 */
export async function fetchEntitlement({ refresh = false } = {}) {
  try {
    const { ok, data } = await post("/api/entitlement", refresh ? { refresh: true } : {});
    // A body with no boolean `active` is an error body, not an answer.
    if (!ok || typeof data?.active !== "boolean") return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Ask Stripe whether this account is paying, and, when it is, let the server
 * write the entitlement record onto her document.
 *
 * That record is bookkeeping for /admin and support now, not the gate — the
 * gate is fetchEntitlement() above. What this call is still for is the member
 * who has landed on the recovery screen: it links her subscription to her
 * document and repairs the join for next time.
 *
 * Resolves to { isPremium, linked }. `linked` is false when the server could
 * not attach the subscription to a member document.
 */
export async function restorePurchase(email) {
  const { ok, data } = await post("/api/restore-purchase", { email });
  return { isPremium: Boolean(ok && data?.isPremium), linked: Boolean(data?.linked) };
}

/**
 * A billing portal session for the signed-in member.
 * Resolves to { url } or { error } with copy that is safe to show her.
 */
export async function openBillingPortal(returnUrl) {
  const { ok, status, data } = await post("/api/create-portal-session", { returnUrl });
  if (ok && data?.url) return { url: data.url };
  if (status === 401) {
    return { error: "Please sign out and back in, then open billing again." };
  }
  if (status === 404) {
    return { error: null }; // Caller knows whether Apple or Stripe should have it.
  }
  return { error: "We could not reach our billing system. Please try again in a minute." };
}
