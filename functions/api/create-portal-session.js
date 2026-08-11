import Stripe from "stripe";

import {
  bearerToken,
  firebaseProjectId,
  ipRateLimited,
  json,
  makeStripe,
  originAllowed,
  readJson,
  verifyIdToken,
} from "../../functions-lib/stripeSync.js";

// POST /api/create-portal-session
//
// The door to Stripe's billing portal: her invoices, her card, and the button
// that cancels her plan.
//
// THE BUG THIS FIXES. The version this replaces took an email address out of
// the request body, looked the customer up by it and handed back a portal
// session URL. It asked for nothing else. Anyone who knew a member's email
// address could POST it from anywhere and receive a working link into her
// billing account: read her invoices and her card's last four digits, swap the
// card, or cancel her subscription outright. It was two lines of curl.
//
// A billing portal session must be tied to a person we have identified, so the
// caller now has to present a Firebase ID token, and the customer is looked up
// by the VERIFIED email inside that token. The body's address is ignored.
//
// The return URL is also checked. A portal session's return_url is a link the
// member is sent to by Stripe with our name on it, so an attacker who could
// choose it would have a redirect to hand around.
//
// This endpoint used to refuse to run without FIREBASE_SERVICE_ACCOUNT, and it
// only ever read the project id out of it — it makes no Firestore call. Now
// that there is no webhook, a deployment is expected to have no service account
// at all, and demanding one here would have left "Manage or cancel" answering
// 503 for every member on the site. Verifying a token needs a project id and
// Google's public keys, and nothing else.
//
// Environment:
//   STRIPE_SECRET_KEY    required, secret
//   FIREBASE_PROJECT_ID  optional, defaults to the live project
//   ALLOWED_ORIGINS      optional, comma separated extra origins

const DEFAULT_RETURN_PATH = "/app/you";
const MAX_CUSTOMERS = 5;

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!originAllowed(request, env)) {
    return json(403, { error: "This request did not come from pelvi.health." });
  }
  if (ipRateLimited(request, { max: 20 })) {
    return json(429, {
      error: "That is a lot of attempts in a short time. Please wait a few minutes and try again.",
    });
  }
  if (!env.STRIPE_SECRET_KEY) {
    console.error("create-portal-session: STRIPE_SECRET_KEY is not set");
    return json(503, {
      error: "We cannot open billing right now. Please email contact@pelvi.health and we will help.",
    });
  }

  const projectId = firebaseProjectId(env);

  // Identity, not an assertion. Without a verified token this endpoint has no
  // way to know the address belongs to whoever is asking, and there is nothing
  // safe it can do with it.
  const caller = await verifyIdToken(bearerToken(request), projectId);
  if (!caller?.emailVerified || !caller.email) {
    return json(401, {
      error: "Please sign in again, then open billing from your account.",
    });
  }

  const body = (await readJson(request)) || {};
  const returnUrl = safeReturnUrl(body.returnUrl, request);

  try {
    const stripe = makeStripe(Stripe, env.STRIPE_SECRET_KEY);

    // One address can sit on more than one Stripe customer. Prefer the one that
    // actually holds a subscription, so "Manage or cancel" does not open an
    // empty portal for a member who is definitely paying.
    const customers = await stripe.customers.list({ email: caller.email, limit: MAX_CUSTOMERS });
    if (customers.data.length === 0) {
      return json(404, { error: "We could not find a billing account for you." });
    }

    let chosen = customers.data[0];
    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 1 });
      if (subs.data.length > 0) {
        chosen = customer;
        break;
      }
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: chosen.id,
      // pelvi.health, not pelvic.health. The old default sent every member who
      // finished in the billing portal to a domain we do not own.
      return_url: returnUrl,
    });

    return json(200, { url: session.url });
  } catch (error) {
    // Stripe's message can quote the request back, so it is not echoed.
    console.error("create-portal-session failed", {
      type: error?.type || "unknown",
      code: error?.code || null,
      requestId: error?.requestId || null,
    });
    return json(502, {
      error: "We could not reach our billing system. Please try again in a minute.",
    });
  }
}

/**
 * Only ever a path on the site that made the request. A return_url an attacker
 * can choose is an open redirect wearing our domain and Stripe's.
 */
function safeReturnUrl(value, request) {
  const base = new URL(request.url).origin;
  if (typeof value !== "string" || !value) return `${base}${DEFAULT_RETURN_PATH}`;
  try {
    const url = new URL(value, base);
    if (url.origin !== base) return `${base}${DEFAULT_RETURN_PATH}`;
    return url.toString();
  } catch {
    return `${base}${DEFAULT_RETURN_PATH}`;
  }
}
