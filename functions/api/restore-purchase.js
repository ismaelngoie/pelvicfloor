import Stripe from "stripe";

import {
  OWNED_STATUSES,
  accessToken,
  bearerToken,
  entitlementFrom,
  firebaseProjectId,
  ipRateLimited,
  json,
  makeStripe,
  originAllowed,
  parseServiceAccount,
  projectIdFrom,
  readJson,
  recordEntitlement,
  verifyIdToken,
} from "../../functions-lib/stripeSync.js";

// POST /api/restore-purchase
//
// "I already paid. Let me back in."
//
// WHAT THIS IS FOR, now that /api/entitlement exists. The gate no longer needs
// this endpoint: the member app asks Stripe about the signed-in member on every
// load, and a first web purchase — made before she had ever signed in, under a
// Stripe customer carrying no Firebase uid — is found by her email address like
// any other. She gets in without pressing anything.
//
// Two jobs are left, and both are about the record rather than the door:
//
//   1. It writes the `entitlement` object onto users/{id}: the subscription id,
//      the period end and the raw status, which is what /admin shows and what
//      support reads when somebody writes in. Nothing else writes it.
//   2. It repairs the join. Her Firebase uid is stamped onto the Stripe
//      customer and the subscription, so the two halves of her account can be
//      tied together by something better than a spelling of her address.
//
// It is also the button on the recovery screen, for the member who wants to see
// something happen rather than be told to wait.
//
// What was wrong with the version this replaces:
//
//   1. It believed whatever email was posted to it, answered `isPremium` and
//      handed back the customer's NAME. That made it an open oracle: anyone
//      could ask whether an address was a paying member of a pelvic health
//      product and get a real name back. It now answers a bare boolean, and a
//      signed-in caller is identified by a verified Firebase token instead.
//   2. It listed only `active` and `trialing` subscriptions. A member whose
//      card is being retried is `past_due`: she counts as entitled, and
//      /api/create-payment-intent refuses to sell her a second plan because she
//      already owns one, so "no active subscription found" left her charged
//      with no way in and no way to buy her way back in either.
//   3. It wrote nothing. The browser wrote the entitlement itself, which meant
//      a thin record with no subscription id and no period end, and it only
//      worked because the security rules let a member edit her own entitlement,
//      which is the same door anyone could walk through for free access. The
//      write is now made here, server side, with the real subscription id and
//      period end.
//   4. It echoed Stripe's error text straight back to the browser.
//
// Environment: STRIPE_SECRET_KEY. FIREBASE_SERVICE_ACCOUNT (and optionally
// FIREBASE_PROJECT_ID) are needed only for the Firestore write in job 1 —
// without them the lookup still answers and the member still gets in, because
// getting in is /api/entitlement's business now, not this file's.

const MAX_CUSTOMERS = 5;

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!originAllowed(request, env)) {
    return json(403, { isPremium: false, error: "This request did not come from pelvi.health." });
  }
  if (ipRateLimited(request, { max: 20 })) {
    return json(429, {
      isPremium: false,
      error: "That is a lot of attempts in a short time. Please wait a few minutes and try again.",
    });
  }
  if (!env.STRIPE_SECRET_KEY) {
    return json(503, {
      isPremium: false,
      error: "We cannot reach our billing system right now. Please email contact@pelvi.health.",
    });
  }

  const body = (await readJson(request)) || {};

  // Who is asking. A verified Firebase token is the only thing that lets this
  // endpoint write anything; an address in the body only ever buys a yes or no.
  //
  // Verification deliberately does NOT depend on the service account below.
  // It used to, and the effect was backwards: a deployment without one stopped
  // identifying its callers and started believing whatever address was posted
  // to it, which is exactly the oracle the header complains about. Google's
  // signing keys are public, so this works with no secret at all.
  const caller = await verifyIdToken(bearerToken(request), firebaseProjectId(env));
  const verified = caller?.emailVerified && caller.email ? caller : null;

  // The Firestore write is the one thing that genuinely needs a service
  // account. Without one the lookup still answers, it just cannot record it.
  const account = env.FIREBASE_SERVICE_ACCOUNT
    ? safeParseAccount(env.FIREBASE_SERVICE_ACCOUNT)
    : null;
  const projectId = account ? safeProjectId(env, account) : "";

  // Her verified address wins over anything posted alongside it.
  const email = normalizeEmail(verified?.email || body.email);
  if (!email) {
    return json(400, { isPremium: false, error: "Enter the email address you paid with." });
  }

  try {
    const stripe = makeStripe(Stripe, env.STRIPE_SECRET_KEY);
    const found = await findLiveSubscription(stripe, email);

    if (!found) return json(200, { isPremium: false, linked: false });

    // Signed out, in the funnel. She gets the answer and the browser opens the
    // door locally; nothing is written, because we cannot prove this is her.
    if (!verified || !account || !projectId) {
      return json(200, { isPremium: true, linked: false });
    }

    const entitlement = entitlementFrom(found.subscription);
    const token = await accessToken(account);
    const docId = await recordEntitlement({
      projectId,
      token,
      entitlement,
      identity: { memberId: "", uid: verified.uid, email },
    });

    // Best effort, and deliberately after the unlock: stamping her Firebase id
    // onto the Stripe records is what lets support tie the two together later,
    // but a failure here must never leave a paying member outside.
    await stampIdentity(stripe, found, {
      memberEmail: email,
      firebaseUID: verified.uid,
      memberId: docId || "",
    }).catch(() => {});

    return json(200, { isPremium: true, linked: Boolean(docId) });
  } catch (error) {
    // Stripe and Google error text can quote request contents back at us, so
    // only the classification is logged and nothing is echoed to the browser.
    console.error("restore-purchase failed", {
      type: error?.type || "unknown",
      code: error?.code || null,
      requestId: error?.requestId || null,
    });
    return json(502, {
      isPremium: false,
      error: "We could not reach our billing system. Please try again in a minute.",
    });
  }
}

/**
 * The live subscription for this address, across every Stripe customer that
 * carries it. One address can end up on more than one customer record, and
 * looking at only the first is how a paying member is told she has never paid.
 */
async function findLiveSubscription(stripe, email) {
  const customers = await stripe.customers.list({ email, limit: MAX_CUSTOMERS });
  for (const customer of customers.data) {
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 20,
    });
    const subscription = subs.data.find((sub) => OWNED_STATUSES.has(sub.status));
    if (subscription) return { customer, subscription };
  }
  return null;
}

async function stampIdentity(stripe, { customer, subscription }, metadata) {
  const prune = (object) => {
    const out = {};
    for (const [key, value] of Object.entries(object)) if (value) out[key] = value;
    return out;
  };
  const next = prune(metadata);
  if (Object.keys(next).length === 0) return;

  await stripe.customers.update(customer.id, {
    metadata: { ...customer.metadata, ...next },
  });
  await stripe.subscriptions.update(subscription.id, {
    metadata: { ...subscription.metadata, ...next, source: subscription.metadata?.source || "web" },
  });
}

function safeParseAccount(raw) {
  try {
    return parseServiceAccount(raw);
  } catch {
    console.error("restore-purchase: FIREBASE_SERVICE_ACCOUNT could not be read");
    return null;
  }
}

function safeProjectId(env, account) {
  try {
    return projectIdFrom(env, account);
  } catch {
    return "";
  }
}

function normalizeEmail(value) {
  const email = typeof value === "string" ? value.trim().slice(0, 254).toLowerCase() : "";
  if (email.length < 6) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "";
  return email;
}
