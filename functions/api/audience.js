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
} from "../../functions-lib/stripeSync.js";

// POST /api/audience
//
// Every email address the business has ever captured at checkout, and whether
// that woman went on to pay.
//
// WHY THIS EXISTS. /api/create-payment-intent calls findOrCreateCustomer BEFORE
// it takes a card, so the moment somebody types an address into the checkout
// sheet she becomes a Stripe CUSTOMER whether or not the payment ever clears.
// Those records are the most valuable list this business owns — they are people
// who wanted the product enough to open the checkout — and until now they were
// invisible outside the Stripe dashboard. This endpoint hands them to /admin so
// they can be counted and exported.
//
// THE ONLY CALLER IS THE OWNER. Not "a signed-in member", not "a member who is
// paying": one address, checked against a verified Firebase ID token, the same
// address firestore.rules and lib/firebase.js name. This is the one endpoint on
// the site that returns OTHER PEOPLE'S email addresses, so the gate is the
// whole feature. Read the three checks in order below before changing any of
// them:
//
//   1. The token's RS256 signature is verified against Google's published
//      certificates, and its audience and issuer must be our Firebase project.
//      A token minted by any other project in the world fails here.
//   2. email_verified must be true. Firebase will mint a token for an
//      email/password sign-up that never confirmed the inbox, so without this
//      anybody could sign up AS the owner's address and be handed the list.
//   3. The verified address must equal ADMIN_EMAIL exactly.
//
// A failure at any of those returns a fixed sentence and no data at all. There
// is no partial answer, no count, and no "how close were you".
//
// WHAT IT DOES NOT DO. It does not read Firestore, and it does not need a
// service account. The member records are already loaded in the browser by
// lib/adminData.js, under the Firestore rules that gate them, so the merge
// happens there (lib/adminAudience.js). This function's whole job is the half
// of the picture only a secret key can see.
//
// Environment:
//   STRIPE_SECRET_KEY    required, secret
//   FIREBASE_PROJECT_ID  optional, defaults to the live project
//   ALLOWED_ORIGINS      optional, comma separated extra origins

// The one account allowed. Kept in step with ADMIN_EMAIL in lib/firebase.js and
// with the admin clause in firestore.rules. It is written out rather than
// imported because those are browser modules and this runs on a Worker.
const ADMIN_EMAIL = "ismael@ngoie.com";

// Stripe's maximum page size. Fewer pages means fewer subrequests.
const PAGE_SIZE = 100;

// How many pages of each list we will walk. Two lists at 20 pages is 40
// subrequests, plus one for Google's certificates: comfortably inside the 50 a
// Cloudflare Worker gets on the free plan, and 2,000 records of headroom on a
// business that has a few hundred. Past the cap the answer says so out loud
// rather than quietly showing a short list — see `truncated` below, which the
// dashboard turns into a visible warning. Raise both together.
const MAX_PAGES = 20;

// Statuses that mean money actually changed hands at some point, even though it
// has stopped. `canceled` is a member who paid and left; `unpaid` is one whose
// card failed for long enough that Stripe gave up. Neither is an abandoned
// checkout and calling them one would put a former customer in a "never bought"
// ad audience.
const LAPSED_STATUSES = new Set(["canceled", "unpaid"]);

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!originAllowed(request, env)) {
    return json(403, { error: "This request did not come from pelvi.health." });
  }
  if (ipRateLimited(request, { max: 30 })) {
    return json(429, { error: "That is a lot of requests. Wait a minute and try again." });
  }

  // IDENTITY FIRST, CONFIGURATION SECOND, and that order is deliberate here even
  // though the other endpoints in this folder check the Stripe key first. They
  // answer a member about herself and a 503 tells her something useful. This one
  // is owner-only, so a stranger should not be able to learn even whether this
  // deployment has a Stripe key wired up. Nobody who is not the owner gets a
  // fact about our setup.
  const caller = await checkIdToken(bearerToken(request), firebaseProjectId(env));

  if (!caller.ok && caller.reason === "unavailable") {
    return json(503, { error: "We could not check who you are. Try again in a moment." });
  }

  // One sentence for every way of not being the owner. A caller who is signed
  // in as somebody else learns nothing from the wording that a caller with a
  // forged token does not, which is the point: this endpoint must not become a
  // way to test whether an address is the admin one.
  const isOwner =
    caller.ok && caller.emailVerified === true && caller.email === ADMIN_EMAIL;
  if (!isOwner) {
    return json(403, {
      error: "This is the owner's dashboard. Sign in with the account that owns the business.",
    });
  }

  if (!env.STRIPE_SECRET_KEY) {
    console.error("audience: STRIPE_SECRET_KEY is not set");
    return json(503, {
      error:
        "This deployment has no Stripe key, so there is no customer list to read. Add STRIPE_SECRET_KEY in Cloudflare Pages > Settings > Environment variables.",
    });
  }

  try {
    const stripe = makeStripe(Stripe, env.STRIPE_SECRET_KEY);

    // TWO LISTS, NOT ONE LOOKUP PER CUSTOMER.
    //
    // The obvious shape — walk the customers, ask Stripe for each one's
    // subscriptions — is one HTTP call per customer. At a few hundred customers
    // that is a few hundred subrequests, which is past the Worker limit and
    // past the CPU budget long before it is past anybody's patience.
    //
    // So: read every subscription once, keep only the customer id and the
    // status, and read every customer once. Two walks, whatever the size.
    const subscriptions = await walkSubscriptions(stripe);
    const customers = await walkCustomers(stripe);

    const rows = [];
    let withoutEmail = 0;

    for (const customer of customers.data) {
      const email = normalizeEmail(customer.email);
      if (!email) {
        // A customer with no address is real (somebody created by hand in the
        // Stripe dashboard) but it is not an audience row, because there is
        // nothing to upload. Counted so the totals still add up.
        withoutEmail += 1;
        continue;
      }
      // THE GOAL SHE PICKED IS NOT RETURNED, AND THAT IS ON PURPOSE.
      // create-payment-intent writes goalId onto the Stripe customer, so it is
      // sitting right here and it would be one line to include. It is health
      // data: bladder leaks, pelvic pain, postpartum recovery. The privacy
      // policy promises she will never be put in an advertising audience
      // because of it, Google's own policies forbid targeting on sensitive
      // health status, and this endpoint feeds a screen whose whole output is
      // ad platform uploads. The safe design is for the marketing path never to
      // carry it at all rather than to carry it and be careful. It stays
      // visible per member in the Members tab, which is a support screen.
      const seen = subscriptions.byCustomer.get(customer.id) || null;
      rows.push({
        id: customer.id,
        email,
        name: cleanName(customer.name),
        // Seconds from Stripe, milliseconds everywhere in the browser.
        createdAt: Number.isFinite(customer.created) ? customer.created * 1000 : null,
        // "paid" · "lapsed" · "never". What STRIPE can prove, and nothing else:
        // the dashboard keeps this separate from its merged verdict so an App
        // Store member is never counted as a web checkout that converted.
        paidState: seen ? seen.state : "never",
        // The exact Stripe word behind that verdict, so a surprising row can be
        // looked up in the Stripe dashboard without guessing.
        subscriptionStatus: seen ? seen.status : "",
      });
    }

    return json(200, {
      fetchedAt: Date.now(),
      rows,
      withoutEmail,
      // Honesty about the ceiling. Either flag true means the numbers on the
      // screen are a floor, not a total, and the dashboard says so.
      truncated: {
        customers: customers.truncated,
        subscriptions: subscriptions.truncated,
      },
      pageSize: PAGE_SIZE,
      maxPages: MAX_PAGES,
    });
  } catch (error) {
    // Stripe's message can quote the request back, so it is not echoed.
    console.error("audience failed", {
      type: error?.type || "unknown",
      code: error?.code || null,
      requestId: error?.requestId || null,
    });
    return json(502, {
      error: "We could not reach Stripe. Try again in a minute.",
    });
  }
}

/**
 * Every subscription Stripe holds, reduced to "what is the strongest thing this
 * customer's subscriptions prove about her".
 *
 * A customer really can carry several: a cancelled one from last year and a
 * live one from today, or three incompletes from a card that kept failing. The
 * strongest wins, so paid beats lapsed beats never.
 */
async function walkSubscriptions(stripe) {
  const byCustomer = new Map();
  let startingAfter;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = { status: "all", limit: PAGE_SIZE };
    if (startingAfter) params.starting_after = startingAfter;
    const batch = await stripe.subscriptions.list(params);

    for (const subscription of batch.data) {
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id || "";
      if (!customerId) continue;

      const state = stateOf(subscription.status);
      const current = byCustomer.get(customerId);
      if (!current || rank(state) > rank(current.state)) {
        byCustomer.set(customerId, { state, status: subscription.status || "" });
      }
    }

    if (!batch.has_more) return { byCustomer, truncated: false };
    startingAfter = batch.data[batch.data.length - 1]?.id;
    if (!startingAfter) return { byCustomer, truncated: false };
  }

  return { byCustomer, truncated: true };
}

/** Every customer Stripe holds, oldest page first. */
async function walkCustomers(stripe) {
  const data = [];
  let startingAfter;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = { limit: PAGE_SIZE };
    if (startingAfter) params.starting_after = startingAfter;
    const batch = await stripe.customers.list(params);
    data.push(...batch.data);

    if (!batch.has_more) return { data, truncated: false };
    startingAfter = batch.data[batch.data.length - 1]?.id;
    if (!startingAfter) return { data, truncated: false };
  }

  return { data, truncated: true };
}

function stateOf(status) {
  if (ACTIVE_STATUSES.has(status)) return "paid";
  if (LAPSED_STATUSES.has(status)) return "lapsed";
  // incomplete, incomplete_expired and paused all mean the same thing for this
  // list: a checkout that was started and never became money.
  return "never";
}

function rank(state) {
  if (state === "paid") return 2;
  if (state === "lapsed") return 1;
  return 0;
}

function normalizeEmail(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length < 3 || trimmed.length > 320) return "";
  return trimmed.includes("@") ? trimmed : "";
}

function cleanName(value) {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

