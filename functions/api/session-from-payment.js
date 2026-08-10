import Stripe from "stripe";

import {
  accessToken,
  findUserIdByEmail,
  ipRateLimited,
  json,
  makeStripe,
  originAllowed,
  parseServiceAccount,
  projectIdFrom,
  readJson,
} from "../../functions-lib/stripeSync.js";
import { identityToken, mintCustomToken, payerUid } from "../../functions-lib/firebaseIdentity.js";

// POST /api/session-from-payment
//
// She has just paid. Sign her in. Do not ask her anything.
//
// THE PRINCIPLE. Once a member pays we already have her email address: she typed
// it into our own checkout one screen ago and Stripe is holding it as the
// customer on the payment. Asking her to then choose a Google account before she
// can open the plan she has bought is a step that exists for our convenience and
// costs us the member. Paying IS the identity event, so this endpoint turns a
// payment into a session.
//
// WHAT IT TAKES. The PaymentIntent client secret the browser is already holding.
// Nothing else. Not an email address.
//
// SECURITY, AND THIS IS THE WHOLE FILE. A session is NEVER minted from an email
// address supplied by the browser. The address is read off a PaymentIntent that
// THIS SERVER fetched from Stripe with its own secret key, and the caller has to
// produce that intent's full client secret, which only the browser that ran the
// checkout ever sees. Anything less would mean anyone could type a member's
// address and be signed in as her: the exact hole /api/restore-purchase was
// rewritten to close. If you are tempted to accept `body.email` here as a hint,
// a shortcut or a fallback, do not. There is no safe version of it.
//
// TWO PATHS OUT, and the browser is told which one it got:
//
//   mode: "custom_token"  Zero clicks. Needs FIREBASE_SERVICE_ACCOUNT, because
//     minting a Firebase session means signing a JWT with the project's own
//     private key, and there is no way to do that without one. The browser calls
//     signInWithCustomToken and she is simply in.
//
//   mode: "email_link"    One click, from her inbox. No service account needed.
//     The browser calls sendSignInLinkToEmail with the address WE returned, and
//     Firebase's email link sign-in gives a verified session.
//
// AND THE LINE BETWEEN THEM. The zero click path is only ever given to an
// address with no history here: no Firebase account, no member record. Paying
// proves you own the CARD, not the address you typed, so anyone with a history
// gets the link, which proves the inbox. The reasoning, and the attack it stops,
// is written out over payerUid() in functions-lib/firebaseIdentity.js. Read it
// before loosening anything here: the thing on the other side of that rule is a
// member's symptom history.
//
// So the site works either way, and it never silently does nothing. If the
// service account is missing the member still gets in, she just taps once.
//
// Environment (Cloudflare Pages > Settings > Environment variables):
//   STRIPE_SECRET_KEY         required, secret
//   FIREBASE_SERVICE_ACCOUNT  optional, secret. REQUIRED for the zero click path.
//   FIREBASE_PROJECT_ID       optional, defaults to the live project
//   ALLOWED_ORIGINS           optional, comma separated extra origins

// A payment that has cleared, or that the bank has taken and is still settling.
// `processing` counts: the money has left, the subscription exists, and making
// her wait outside for an ACH debit to settle is not a thing we would do.
const PAID_STATUSES = new Set(["succeeded", "processing", "requires_capture"]);

const MAX_SECRET_LENGTH = 400;

// HOW LONG A PAYMENT IS A KEY TO AN ACCOUNT.
//
// Without this the client secret of a successful payment is a permanent bearer
// credential for the account it created: the PaymentIntent stays `succeeded`
// for ever, payerUid() re-mints for its own pay_<hash> uid every time by
// design, so anyone who ever gets hold of the string is signed in as her, this
// month or next year. And it is not a well-guarded string — it is put in the
// address bar by Stripe's own 3-D Secure redirect, which means browser history,
// synced history on her other devices, and any screenshot or support thread
// taken before the page strips it out.
//
// A day covers everything the flow actually needs: the checkout, the redirect
// back, a reload of /welcome, and a member who leaves the tab open overnight.
// Past that she has an account and signs in like anybody else, and a leaked
// secret is worth nothing.
const MAX_INTENT_AGE_S = 24 * 60 * 60;

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!originAllowed(request, env)) {
    return fail(403, "bad_origin", "This request did not come from pelvi.health.");
  }
  // Far above anything a real member reaches: a checkout produces one call, and
  // a reload of /welcome produces one more.
  if (ipRateLimited(request, { max: 30 })) {
    return fail(429, "rate_limited", "Please wait a moment and try again.");
  }
  if (!env.STRIPE_SECRET_KEY) {
    console.error("session-from-payment: STRIPE_SECRET_KEY is not set");
    return fail(503, "not_configured", "We cannot confirm that payment right now.");
  }

  const body = (await readJson(request, 2048)) || {};
  const clientSecret = typeof body.clientSecret === "string" ? body.clientSecret.trim() : "";
  const intentId = intentIdFrom(clientSecret);
  if (!intentId) {
    return fail(400, "bad_payment", "We could not read that payment. Please reload the page.");
  }

  let email = "";
  let name = "";
  let customerId = "";

  try {
    const stripe = makeStripe(Stripe, env.STRIPE_SECRET_KEY);
    const intent = await stripe.paymentIntents.retrieve(intentId, { expand: ["customer"] });

    // The id alone is not a credential: it turns up in Stripe's own redirect
    // URLs and in support threads. The secret is what proves this browser ran
    // the checkout, so it has to match the one Stripe is holding.
    if (!secretsMatch(intent?.client_secret, clientSecret)) {
      return fail(403, "bad_payment", "We could not confirm that payment.");
    }
    if (!PAID_STATUSES.has(intent.status)) {
      return fail(409, "not_paid", "That payment has not gone through yet.");
    }

    // Old payment, no session. See MAX_INTENT_AGE_S. The message names the way
    // back in rather than the rule, because the only person who ever sees this
    // is a member on a stale tab and the answer for her is the sign-in screen.
    const ageS = Math.floor(Date.now() / 1000) - Number(intent.created || 0);
    if (!intent.created || ageS > MAX_INTENT_AGE_S) {
      return fail(410, "payment_too_old", "Please sign in to open your plan.");
    }

    const customer = typeof intent.customer === "object" ? intent.customer : null;
    customerId = customer?.id || (typeof intent.customer === "string" ? intent.customer : "");
    // Stripe's copy of who paid, in the order we trust it. The customer record
    // is what /api/entitlement and the billing portal look her up by, so it is
    // the address that has to become her account.
    email = normalizeEmail(customer?.email || intent.receipt_email);
    name = typeof customer?.name === "string" ? customer.name : "";
  } catch (error) {
    console.error("session-from-payment: Stripe lookup failed", {
      type: error?.type || "unknown",
      code: error?.code || null,
      requestId: error?.requestId || null,
    });
    return fail(502, "stripe_unreachable", "We could not reach our billing system.");
  }

  if (!email) {
    // A paid intent with no address anywhere on it. Nothing to sign in as, and
    // nowhere to send a link either, so say so rather than hang.
    console.error("session-from-payment: paid intent carries no email", { intentId });
    return fail(409, "no_email", "We could not find the email on that payment.");
  }

  // No service account: the browser takes the email link path with the address
  // we just proved. Never an error, because getting in is the point.
  const account = env.FIREBASE_SERVICE_ACCOUNT
    ? safeParseAccount(env.FIREBASE_SERVICE_ACCOUNT)
    : null;
  const projectId = account ? safeProjectId(env, account) : "";
  if (!account || !projectId) {
    return json(200, { mode: "email_link", email, reason: "no_service_account" });
  }

  try {
    const token = await identityToken(account);
    const resolved = await payerUid({
      projectId,
      token,
      email,
      name,
      // "Has this address got a history with us." A member record under this
      // address means somebody has used this product with it, and paying with an
      // address is not the same as owning it, so she gets the email link
      // instead. See the rule at the top of payerUid: this is the check that
      // protects an App Store member, who has a full record here and often no
      // Firebase account at all for the lookup above to find.
      //
      // A separate, Firestore-scoped token: the Identity Toolkit one cannot read
      // documents, and the document reader has no business minting sessions.
      hasHistory: async (address) => {
        const dataToken = await accessToken(account);
        const found = await findUserIdByEmail({ projectId, token: dataToken, email: address });
        return Boolean(found);
      },
    });
    if (resolved.blocked) {
      return json(200, { mode: "email_link", email, reason: resolved.blocked });
    }

    const customToken = await mintCustomToken(account, resolved.uid);

    // Best effort, and after the session is in hand: stamping her Firebase id
    // onto the Stripe customer is what lets /admin and support tie the two
    // halves of her account together by something better than a spelling of an
    // address. A failure here must never keep a paying member outside, so it is
    // not awaited.
    if (customerId && typeof context.waitUntil === "function") {
      context.waitUntil(
        stampFirebaseUID(env, customerId, resolved.uid).catch(() => {})
      );
    }

    return json(200, { mode: "custom_token", token: customToken, email });
  } catch (error) {
    // A service account without Identity Toolkit permission, a project with the
    // API disabled, a Google outage. All of them land here, and all of them have
    // the same answer: fall back to the link rather than leave her outside.
    console.error("session-from-payment: could not mint a session", {
      status: error?.status || null,
      reason: error?.reason || error?.message || null,
    });
    return json(200, { mode: "email_link", email, reason: "mint_failed" });
  }
}

// Only onRequestPost is exported on purpose. Cloudflare Pages answers every
// other method on this path itself, and a catch-all onRequest here would be one
// more thing that could shadow the POST handler.

// --- Helpers ----------------------------------------------------------------

/**
 * `pi_3Abc..._secret_XyZ` -> `pi_3Abc...`, or "" for anything that is not one.
 *
 * The shape is checked rather than trusted: this string goes into a Stripe URL,
 * and a lenient parse here is how a request ends up somewhere it was not meant
 * to go.
 */
function intentIdFrom(clientSecret) {
  if (!clientSecret || clientSecret.length > MAX_SECRET_LENGTH) return "";
  const marker = clientSecret.indexOf("_secret_");
  if (marker < 4) return "";
  const id = clientSecret.slice(0, marker);
  if (!/^pi_[A-Za-z0-9]{8,}$/.test(id)) return "";
  if (!/^[A-Za-z0-9_]+$/.test(clientSecret)) return "";
  return id;
}

/** Length-safe compare, so the secret cannot be guessed a character at a time. */
function secretsMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function stampFirebaseUID(env, customerId, uid) {
  const stripe = makeStripe(Stripe, env.STRIPE_SECRET_KEY);
  const customer = await stripe.customers.retrieve(customerId);
  if (!customer || customer.deleted) return;
  if (customer.metadata?.firebaseUID === uid) return;
  await stripe.customers.update(customerId, {
    metadata: { ...customer.metadata, firebaseUID: uid },
  });
}

function safeParseAccount(raw) {
  try {
    return parseServiceAccount(raw);
  } catch {
    console.error("session-from-payment: FIREBASE_SERVICE_ACCOUNT could not be read");
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

function fail(status, code, message) {
  return json(status, { error: { code, message } });
}

// No Firebase ID token is read anywhere in this file, and that is deliberate
// rather than an oversight. Every other money endpoint identifies its caller
// from a token because it is answering a question ABOUT her account. This one
// is answering "who just paid", and the only honest source for that is the
// payment. A member who is already signed in when she pays lands on the same
// uid anyway, because payerUid() finds her existing account by the address
// Stripe holds.
