import Stripe from "stripe";
import {
  BILLING_INTERVAL, BILLING_INTERVAL_COUNT, PRICE_AMOUNT_CENTS, PRICE_CURRENCY,
} from "../../lib/pricing.js";

// POST /api/create-payment-intent
//
// Creates (or finds) the Stripe customer for this member, opens the monthly
// subscription in `incomplete` state and hands back the client secret the
// Payment Element needs.
//
// What this replaces, and why each change is here:
//
//   1. `stripe.customers.create()` with no arguments. Every buyer ended up with
//      customer.email === null, and both "Restore Purchase" and the billing
//      portal look customers up BY email. So neither could ever succeed for
//      anyone. The address is now required before Stripe is touched at all, and
//      it is written to the customer, the subscription metadata and the
//      invoice, so support and /api/entitlement can all find the same person.
//   2. No idempotency key. A double tap, a flaky connection or a retry created
//      a second subscription. Stripe is now given a key derived from her email
//      and this checkout attempt, so a repeat of the same attempt returns the
//      same subscription instead of a new one.
//   3. A price id typed into the source, and it was WRONG. See the block over
//      resolvePriceId() below: the id in here was not the live price, so every
//      checkout failed. It is now resolved from the product.
//   4. No caller checks at all. The endpoint minted Stripe objects for anyone
//      on the internet who could send a POST. It now requires a same-site
//      origin and is rate limited per IP and per address.
//
// Nothing here logs a key, a token, a client secret or a full request body.
//
// Environment (Cloudflare Pages > Settings > Environment variables):
//   STRIPE_SECRET_KEY      required, secret
//   STRIPE_PRICE_ID        optional, pins the price and skips the lookup below
//   ALLOWED_ORIGINS        optional, comma separated extra origins
//   CHECKOUT_RATE_LIMIT    optional KV namespace binding, see rateLimit()

const STRIPE_API_VERSION = "2023-10-16";

// The subscription product. Checked against Stripe before anybody is charged —
// see resolvePriceId().
const PRODUCT_ID = "prod_Ts2n6VY8K08rao";
const PRODUCT_NAME = "Pelvi Health Premium";

// WHAT WE INTEND TO SELL, and it is imported rather than typed here.
//
// The amount, the currency and the LENGTH OF THE SUBSCRIPTION all come from
// lib/pricing.js, which is the file the paywall, the terms page and the
// structured data read too. A 365 day plan is coming, and a price interval
// typed into this Worker as well would mean a duration change that looks
// complete on every screen and then quietly fails at the one place that takes
// money: this endpoint would keep hunting for a monthly price, find none, and
// answer price_unresolved to every buyer.
//
// lib/pricing.js is plain ESM with no browser API in it, which is what makes it
// safe to pull into an edge Worker. Keep it that way.
const EXPECTED_AMOUNT = PRICE_AMOUNT_CENTS; // cents
const CURRENCY = PRICE_CURRENCY.toLowerCase(); // Stripe stores currencies lower case
const EXPECTED_INTERVAL = BILLING_INTERVAL;
const EXPECTED_INTERVAL_COUNT = BILLING_INTERVAL_COUNT;

/**
 * "every month", "every year", "every 3 months". Only ever used in an error
 * message, and phrased this way because it stays correct for every value Stripe
 * allows: "month" + "ly" reads, "day" + "ly" does not.
 */
const PERIOD_WORD =
  EXPECTED_INTERVAL_COUNT === 1
    ? `every ${EXPECTED_INTERVAL}`
    : `every ${EXPECTED_INTERVAL_COUNT} ${EXPECTED_INTERVAL}s`;

const DEFAULT_ORIGIN_HOSTS = ["pelvi.health", "www.pelvi.health"];

// Per IP, per isolate. Cloudflare gives each colo its own isolate and recycles
// them, so this is a speed bump rather than a wall; the KV limiter below is the
// durable one when the binding exists.
const recentByIp = new Map();
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX = 10;
const EMAIL_WINDOW_S = 60 * 60;
const EMAIL_MAX = 5;

// How many Stripe customer records carrying the same address we are willing to
// inspect before deciding she does not already have a plan.
const MAX_CUSTOMERS = 5;

const SUBSCRIBED_STATUSES = new Set(["active", "trialing", "past_due", "unpaid"]);
const REUSABLE_INTENT_STATUSES = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
]);

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!originAllowed(request, env)) {
    return fail(403, "bad_origin", "This request did not come from pelvi.health.");
  }

  if (!env.STRIPE_SECRET_KEY) {
    return fail(
      503,
      "not_configured",
      "Checkout is not available right now. Please email contact@pelvi.health and we will set you up by hand."
    );
  }

  let body;
  try {
    body = await readJson(request);
  } catch (err) {
    return fail(
      err?.code === "too_large" ? 413 : 400,
      "bad_request",
      "We could not read that request. Please refresh the page and try again."
    );
  }

  const email = normalizeEmail(body.email);
  if (!email) {
    return fail(400, "invalid_email", "Enter a valid email address so we can send your receipt.");
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const limited = await rateLimit(env, ip, email);
  if (limited) {
    return fail(
      429,
      "rate_limited",
      "That is a lot of attempts in a short time. Please wait a few minutes and try again."
    );
  }

  const name = clean(body.name, 120);
  const uid = clean(body.uid, 128);
  const memberId = clean(body.memberId, 200);
  const goalId = clean(body.goalId, 40).replace(/[^A-Za-z0-9_-]/g, "");

  const stripe = makeStripe(env.STRIPE_SECRET_KEY);

  let priceId;
  try {
    priceId = await resolvePriceId(stripe, env);
  } catch (error) {
    console.error("create-payment-intent: no usable price", {
      product: PRODUCT_ID,
      code: error?.code || null,
      message: error?.message || null,
    });
    return fail(
      503,
      "price_unavailable",
      `Checkout is not available right now. No active $${(EXPECTED_AMOUNT / 100).toFixed(2)} ` +
        `${CURRENCY.toUpperCase()} price billed ${PERIOD_WORD} could be found on ` +
        `"${PRODUCT_NAME}" (${PRODUCT_ID}). ` +
        "Please email contact@pelvi.health and we will set you up by hand."
    );
  }

  const metadata = {
    memberEmail: email,
    firebaseUID: uid || "",
    memberId: memberId || "",
    goalId: goalId || "",
    source: "web",
  };

  try {
    const { customer, owned } = await findOrCreateCustomer(stripe, { email, name, metadata });

    // Already paying. Sending her through checkout again would charge twice.
    // The check covers EVERY Stripe customer carrying this address, not just
    // the first one: an address can end up on more than one customer record,
    // and looking at only one of them is how someone pays twice.
    if (owned.some((sub) => SUBSCRIBED_STATUSES.has(sub.status))) {
      // The CODE is what matters: CheckoutSheet intercepts it and turns the
      // sheet into the way back in, so this sentence is a fallback for any
      // caller that only reads the message. It no longer says "Use Restore
      // Purchase" — that button does not exist on the web — and it no longer
      // offers to email her anything, because nothing here sends mail.
      return fail(
        409,
        "already_subscribed",
        "That email already has an active plan. Continue with Google or Apple using the same address, or email contact@pelvi.health."
      );
    }

    // She started checkout before and did not finish. Hand back the same
    // unfinished subscription instead of leaving another one behind.
    // Only one belonging to the customer we are about to bill: handing back a
    // client secret cut from a different customer's invoice would charge the
    // wrong record.
    const reusable = owned.find(
      (sub) =>
        customerIdOf(sub) === customer.id &&
        sub.status === "incomplete" &&
        sub.items?.data?.some((item) => item.price?.id === priceId) &&
        REUSABLE_INTENT_STATUSES.has(sub.latest_invoice?.payment_intent?.status)
    );
    if (reusable) {
      return respond(reusable, customer, priceId);
    }

    const idempotencyKey = await idempotencyKeyFor(email, clean(body.attemptKey, 100));

    const subscription = await stripe.subscriptions.create(
      {
        customer: customer.id,
        items: [{ price: priceId }],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
        metadata,
      },
      { idempotencyKey }
    );

    const clientSecret = subscription?.latest_invoice?.payment_intent?.client_secret;
    if (!clientSecret) {
      // Stripe accepted the subscription but gave us nothing to confirm with.
      // Nearly always a price that is not recurring, or a disabled account.
      console.error("create-payment-intent: no client secret", {
        subscriptionId: subscription?.id,
        status: subscription?.status,
      });
      return fail(
        502,
        "payment_setup_failed",
        "We could not start the checkout. Please try again, or email contact@pelvi.health."
      );
    }

    return respond(subscription, customer, priceId);
  } catch (error) {
    // Stripe error objects carry no credentials, but the request body might, so
    // only the classified fields are ever written to the log.
    console.error("create-payment-intent failed", {
      type: error?.type || "unknown",
      code: error?.code || null,
      requestId: error?.requestId || null,
      message: error?.message || null,
    });

    if (error?.type === "StripeCardError") {
      return fail(402, "card_declined", error.message || "That card was declined.");
    }
    return fail(
      502,
      "payment_setup_failed",
      "We could not start the checkout. Please check your internet connection and try again."
    );
  }
}

// Only onRequestPost is exported on purpose. Cloudflare Pages answers every
// other method on this path itself, and a catch-all onRequest here would be one
// more thing that could shadow the POST handler.

// --- The price --------------------------------------------------------------

// Resolved once per isolate. A price id does not change between two checkouts a
// second apart, and looking it up on every one would add a Stripe round trip to
// the slowest moment in the funnel.
let cachedPriceId = null;

/**
 * Which price to charge.
 *
 * THE BUG THIS FIXES. The id hard coded here was
 * `price_1SwG0JJcZ3jBmTIvffUjnsOq`, and it is not a price on this account. The
 * live $24.99 monthly price is `price_1SuIhbJcZ3jBmTIvpjkDwzJo`. Stripe rejects
 * a subscription built on an id it does not recognise, so checkout did not fail
 * for some people in some browsers — it failed for everybody, every time, and
 * the only sign of it was a 502 telling her to check her internet connection.
 *
 * Hard coding the replacement would fix today and break again the next time a
 * price is edited, because editing a price in Stripe does not change it: it
 * archives the old one and mints a new id. So the id is resolved from the
 * PRODUCT, which is stable, and checked against what we intend to charge.
 *
 * That check is the point. This product carries two ARCHIVED prices, at $4.99
 * and $14.99, that still have subscribers on them. "The monthly one" is not a
 * unique description here — picking the wrong one would silently charge a new
 * member a fifth of the price, or charge a member on an old plan a new one.
 * Only an active, recurring price whose interval, interval_count, currency and
 * unit_amount are all exactly what lib/pricing.js declares will do, and if
 * there is not exactly one of those we sell nothing and say so.
 *
 * That is also the safety net under a change of subscription length. Move
 * lib/pricing.js to a year without creating the matching price in Stripe and
 * this endpoint refuses to sell anything at all, with price_unresolved in the
 * log. Loud and immediate beats charging somebody a month for a year's plan.
 *
 * STRIPE_PRICE_ID still wins, unresolved, so a price can be swapped from the
 * Cloudflare dashboard without a deploy.
 */
async function resolvePriceId(stripe, env) {
  const pinned = clean(env.STRIPE_PRICE_ID, 120);
  if (pinned) return pinned;
  if (cachedPriceId) return cachedPriceId;

  // `active: true` already excludes the two archived prices. The rest of the
  // filter is belt and braces: it is cheap, and the thing it guards against is
  // charging a woman the wrong amount.
  const prices = await stripe.prices.list({ product: PRODUCT_ID, active: true, limit: 100 });

  const matches = prices.data.filter(
    (price) =>
      price.active === true &&
      price.type === "recurring" &&
      price.recurring?.interval === EXPECTED_INTERVAL &&
      (price.recurring?.interval_count ?? 1) === EXPECTED_INTERVAL_COUNT &&
      price.currency === CURRENCY &&
      price.unit_amount === EXPECTED_AMOUNT
  );

  if (matches.length === 0) {
    const error = new Error(
      `No active ${EXPECTED_AMOUNT} ${CURRENCY} price billed ${PERIOD_WORD} on ` +
        `${PRODUCT_NAME} (${PRODUCT_ID}).`
    );
    error.code = "price_unresolved";
    throw error;
  }

  // Two prices for the same amount is not an error, it is a duplicate. Take the
  // oldest so every member lands on the same one and the choice does not move
  // between isolates.
  const chosen = matches.reduce((best, price) =>
    (price.created || 0) < (best.created || 0) ? price : best
  );

  cachedPriceId = chosen.id;
  return chosen.id;
}

// --- Stripe -----------------------------------------------------------------

function makeStripe(secret) {
  const options = {
    apiVersion: STRIPE_API_VERSION,
    maxNetworkRetries: 1,
    telemetry: false,
  };
  if (typeof Stripe.createFetchHttpClient === "function") {
    options.httpClient = Stripe.createFetchHttpClient();
  }
  return new Stripe(secret, options);
}

/**
 * Her Stripe customer, and every subscription already sitting under this
 * address.
 *
 * Both halves come back together because they have to be decided together: an
 * address can be spread over several customer records, and a "do you already
 * have a plan" check that only reads the first one will happily sell a second
 * subscription to someone who is already paying.
 */
async function findOrCreateCustomer(stripe, { email, name, metadata }) {
  const found = await stripe.customers.list({ email, limit: MAX_CUSTOMERS });

  if (found.data.length === 0) {
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: prune(metadata),
    });
    return { customer, owned: [] };
  }

  const owned = [];
  let withSubscription = null;
  for (const candidate of found.data) {
    const subs = await stripe.subscriptions.list({
      customer: candidate.id,
      status: "all",
      limit: 20,
      expand: ["data.latest_invoice.payment_intent"],
    });
    owned.push(...subs.data);
    if (!withSubscription && subs.data.length > 0) withSubscription = candidate;
  }

  const existing = withSubscription || found.data[0];
  // Keep the join keys fresh without ever clearing something already set.
  await stripe.customers.update(existing.id, {
    name: name || existing.name || undefined,
    metadata: { ...existing.metadata, ...prune(metadata) },
  });
  return { customer: existing, owned };
}

function customerIdOf(subscription) {
  return typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer?.id || "";
}

function respond(subscription, customer, priceId) {
  const item = subscription.items?.data?.[0];
  const price = item?.price;
  return json(200, {
    clientSecret: subscription.latest_invoice.payment_intent.client_secret,
    subscriptionId: subscription.id,
    customerId: customer.id,
    priceId: price?.id || priceId,
    amount: typeof price?.unit_amount === "number" ? price.unit_amount : null,
    currency: price?.currency || "usd",
    interval: price?.recurring?.interval || EXPECTED_INTERVAL,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
  });
}

// --- Guards -----------------------------------------------------------------

function originAllowed(request, env) {
  const host = safeHost(request.url);
  const allowed = new Set([
    ...DEFAULT_ORIGIN_HOSTS,
    ...String(env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => safeHost(value.trim()))
      .filter(Boolean),
  ]);
  if (host) allowed.add(host); // preview deployments serve themselves

  const origin = request.headers.get("Origin");
  if (origin) return allowed.has(safeHost(origin));

  // Some in-app browsers drop Origin on same-site posts. Referer is the
  // fallback; a request with neither is not coming from our own page.
  const referer = request.headers.get("Referer");
  if (referer) return allowed.has(safeHost(referer));

  return false;
}

function safeHost(value) {
  if (!value) return "";
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Two counters: one per IP, one per email address.
 *
 * Durable when a KV namespace is bound as CHECKOUT_RATE_LIMIT
 * (Cloudflare Pages > Settings > Functions > KV namespace bindings). Without
 * the binding it still holds inside a single isolate, which is enough to blunt
 * a naive loop.
 */
async function rateLimit(env, ip, email) {
  const now = Date.now();
  const seen = (recentByIp.get(ip) || []).filter((t) => now - t < IP_WINDOW_MS);
  seen.push(now);
  recentByIp.set(ip, seen);
  if (recentByIp.size > 5000) recentByIp.clear();
  if (seen.length > IP_MAX) return true;

  const kv = env.CHECKOUT_RATE_LIMIT;
  if (!kv || typeof kv.get !== "function") return false;

  try {
    const ipKey = `pi:ip:${ip}`;
    const emailKey = `pi:em:${await sha256Hex(email)}`;
    const [ipCount, emailCount] = await Promise.all([kv.get(ipKey), kv.get(emailKey)]);

    const nextIp = Number(ipCount || 0) + 1;
    const nextEmail = Number(emailCount || 0) + 1;

    await Promise.all([
      kv.put(ipKey, String(nextIp), { expirationTtl: EMAIL_WINDOW_S }),
      kv.put(emailKey, String(nextEmail), { expirationTtl: EMAIL_WINDOW_S }),
    ]);

    return nextIp > IP_MAX * 3 || nextEmail > EMAIL_MAX;
  } catch {
    // A limiter that is down must not take checkout down with it.
    return false;
  }
}

// --- Small helpers ----------------------------------------------------------

async function readJson(request) {
  const type = request.headers.get("Content-Type") || "";
  if (!type.includes("application/json")) {
    const err = new Error("expected json");
    err.code = "bad_type";
    throw err;
  }
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > 4096) {
    const err = new Error("body too large");
    err.code = "too_large";
    throw err;
  }
  const text = await request.text();
  if (text.length > 4096) {
    const err = new Error("body too large");
    err.code = "too_large";
    throw err;
  }
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("expected an object");
  }
  return parsed;
}

function clean(value, max) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function normalizeEmail(value) {
  const email = clean(value, 254).toLowerCase();
  if (email.length < 6) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "";
  return email;
}

function prune(object) {
  const out = {};
  for (const [key, value] of Object.entries(object)) {
    if (value) out[key] = value;
  }
  return out;
}

/**
 * The client picks a nonce per checkout attempt, but it never becomes the
 * Stripe key on its own: it is hashed together with the address first. A
 * stranger who guessed someone else's nonce would otherwise be handed back
 * their client secret.
 */
async function idempotencyKeyFor(email, attemptKey) {
  const nonce = attemptKey || `${Date.now()}`;
  return `pf_${(await sha256Hex(`${email}|${nonce}`)).slice(0, 48)}`;
}

async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function fail(status, code, message) {
  return json(status, { error: { code, message } });
}
