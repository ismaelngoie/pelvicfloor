import Stripe from "stripe";

import {
  ACTIVE_STATUSES,
  bearerToken,
  checkIdToken,
  firebaseProjectId,
  ipRateLimited,
  json,
  makeStripe,
  originAllowed,
  readJson,
} from "../../functions-lib/stripeSync.js";

// POST /api/entitlement
//
// "Is this person paying?" — asked of Stripe, which already knows.
//
// WHAT THIS REPLACES. There used to be a Stripe webhook that mirrored every
// subscription change into users/{id}.entitlement, and the member app read that
// copy. A mirror is a second copy of the truth, and a second copy can be wrong:
// a missed delivery, a signature mismatch, a Firestore outage or a member whose
// first purchase happened before she ever signed in all ended the same way,
// with somebody who had paid looking at a locked door. Keeping that mirror also
// meant handing a robot a Firebase service account with write access to every
// member record, to store an answer Stripe would have given us for free.
//
// So there is no mirror. This endpoint asks Stripe, live, every time the member
// app opens. No webhook, no webhook secret, and no service account: the only
// key it needs is the Stripe one we already had.
//
// HOW IT KNOWS WHO IS ASKING. A Firebase ID token in the Authorization header,
// with its RS256 signature verified against Google's published certificates
// (see checkIdToken in functions-lib/stripeSync.js). The email address then
// comes out of the VERIFIED token and never out of the request body, because an
// address in a body is a claim, not an identity: believing one would turn this
// into an oracle that told anybody whether a given woman is a paying member of
// a pelvic health product.
//
// Answers { active, status, renewsAt, source, customerId }, and every answer is
// memoised for a minute per address, so a page that asks three times still only
// costs one Stripe call.
//
// Environment (Cloudflare Pages > Settings > Environment variables):
//   STRIPE_SECRET_KEY    required, secret
//   FIREBASE_PROJECT_ID  optional, defaults to the live project
//   ALLOWED_ORIGINS      optional, comma separated extra origins

// How many Stripe customer records carrying the same address we will inspect.
// One address really does end up on several customers — a support refund, a
// card retried under a new record — and reading only the first is how a paying
// member is told she has never paid.
const MAX_CUSTOMERS = 5;
const MAX_SUBSCRIPTIONS = 20;

// Long enough that a tab which mounts the gate, the You tab and a refresh costs
// one Stripe call; short enough that a cancellation bites almost immediately.
const CACHE_MS = 60 * 1000;
const CACHE_MAX_ENTRIES = 2000;

// Per isolate, keyed by the VERIFIED address. Cloudflare recycles isolates and
// gives each colo its own, so this is a cost saver, never a security boundary.
const answers = new Map(); // email -> { expiresAt, payload }

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!originAllowed(request, env)) {
    return fail(403, "bad_origin", "This request did not come from pelvi.health.");
  }

  if (!env.STRIPE_SECRET_KEY) {
    console.error("entitlement: STRIPE_SECRET_KEY is not set");
    // 503, not 401. The caller's token is fine; we are the ones who cannot
    // answer, and the member app falls back to its other signals rather than
    // shutting a paying member out over our own misconfiguration.
    return fail(503, "not_configured", "We cannot check your plan right now.");
  }

  const caller = await checkIdToken(bearerToken(request), firebaseProjectId(env));

  if (!caller.ok) {
    if (caller.reason === "unavailable") {
      return fail(503, "auth_unavailable", "We could not check who you are. Please try again.");
    }
    // One message for every way a token can be wrong, and a code that says only
    // as much as the member needs to act on: "expired" means sign in again,
    // everything else means the token is not one we accept. Naming the failed
    // check any more precisely — bad signature, wrong audience, unknown key —
    // would let someone forging tokens use this endpoint to grade their work.
    return fail(
      401,
      caller.reason === "expired" ? "auth_expired" : "auth_invalid",
      "Please sign in again, then reload the page."
    );
  }

  // An unverified address is not an identity either. Firebase will happily mint
  // a token for an email/password sign-up that never confirmed the address, so
  // without this check anyone could claim a paying member's address, sign up
  // with it, and be told her subscription status.
  if (!caller.emailVerified || !caller.email) {
    return fail(401, "auth_unverified", "Please confirm your email address, then reload the page.");
  }

  const email = caller.email;
  const body = (await readJson(request, 1024)) || {};

  // The recovery screen asks again the moment it has linked a subscription, and
  // a minute-old "no" on that screen is a member who just proved she paid still
  // looking at a locked door. Skipping the memo costs one Stripe call, for her
  // own address, and still passes the rate limit below.
  const skipCache = body.refresh === true;

  if (!skipCache) {
    const cached = answers.get(email);
    if (cached && cached.expiresAt > Date.now()) return json(200, cached.payload);
  }

  // Only requests that are actually about to cost a Stripe call are counted, so
  // reloading the app twenty times in an afternoon can never rate limit a member
  // out of her own subscription. The ceiling is far above anything a real member
  // reaches: every answer is memoised for a minute, and reaching it takes a
  // signed-in account deliberately spinning.
  if (ipRateLimited(request, { max: 120 })) {
    return fail(429, "rate_limited", "Please wait a moment and try again.");
  }

  try {
    const stripe = makeStripe(Stripe, env.STRIPE_SECRET_KEY);
    const payload = await lookUp(stripe, email);

    remember(email, payload);
    return json(200, payload);
  } catch (error) {
    // Stripe's message can quote the request back, so only the classification
    // is logged and nothing is echoed to the browser.
    console.error("entitlement lookup failed", {
      type: error?.type || "unknown",
      code: error?.code || null,
      requestId: error?.requestId || null,
    });
    return fail(502, "stripe_unreachable", "We could not reach our billing system.");
  }
}

// Only onRequestPost is exported on purpose. Cloudflare Pages answers every
// other method on this path itself, and a catch-all onRequest here would be one
// more thing that could shadow the POST handler.

// --- Asking Stripe ----------------------------------------------------------

/**
 * Every subscription sitting under this address, boiled down to one answer.
 */
async function lookUp(stripe, email) {
  const customers = await stripe.customers.list({ email, limit: MAX_CUSTOMERS });

  const subscriptions = [];
  for (const customer of customers.data) {
    const owned = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: MAX_SUBSCRIPTIONS,
    });
    subscriptions.push(...owned.data);
  }

  const chosen = pick(subscriptions);

  if (!chosen) {
    return {
      active: false,
      status: null,
      renewsAt: null,
      source: "stripe",
      customerId: customers.data[0]?.id || null,
    };
  }

  return {
    active: ACTIVE_STATUSES.has(chosen.status),
    status: chosen.status,
    renewsAt: chosen.current_period_end
      ? new Date(chosen.current_period_end * 1000).toISOString()
      : null,
    source: "stripe",
    customerId: customerIdOf(chosen),
  };
}

/**
 * The subscription that decides the answer.
 *
 * A live one always wins, and among several live ones the one running longest,
 * so a member who was moved onto a new plan is not reported on the old one's
 * end date. With nothing live, the newest dead subscription is reported instead
 * of a bare "no": "canceled" and "never subscribed" look the same to a locked
 * out member but they are different support problems.
 */
function pick(subscriptions) {
  const live = subscriptions.filter((sub) => ACTIVE_STATUSES.has(sub.status));
  if (live.length) {
    return live.reduce((best, sub) =>
      (sub.current_period_end || 0) > (best.current_period_end || 0) ? sub : best
    );
  }
  if (!subscriptions.length) return null;
  return subscriptions.reduce((best, sub) => ((sub.created || 0) > (best.created || 0) ? sub : best));
}

function customerIdOf(subscription) {
  return typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id || null;
}

// --- The memo ---------------------------------------------------------------

function remember(email, payload) {
  // Cheapest possible eviction. The map only ever holds a minute of traffic,
  // and dropping it wholesale costs one extra Stripe call per member, once.
  if (answers.size > CACHE_MAX_ENTRIES) answers.clear();
  answers.set(email, { expiresAt: Date.now() + CACHE_MS, payload });
}

// --- Replies ----------------------------------------------------------------

/**
 * Failures deliberately carry no `active` field.
 *
 * The member app treats "no usable answer" and "Stripe says no" as different
 * things — the first falls back to its other signals, the second locks the door
 * — so an error body must never be readable as a subscription answer.
 */
function fail(status, code, message) {
  return json(status, { error: { code, message } });
}
