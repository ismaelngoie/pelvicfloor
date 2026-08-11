"use client";

// Microsoft Clarity, and the exact boundary of what it is allowed to see.
//
// Read this before changing anything in this file or in app/Clarity.jsx. The
// decisions below are not stylistic. Two of them are the difference between a
// legal analytics setup and an unlawful one, and both are the kind of thing a
// later "cleanup" removes by accident because the code looks redundant.
//
// ---------------------------------------------------------------------------
// WHAT IS CAPTURED
// ---------------------------------------------------------------------------
//   Session replay and heatmaps on the PUBLIC surfaces only: the landing page,
//   the funnel screens, the plan reveal, the paywall, the post-purchase page,
//   the blog and the two legal pages. That is where the ad money lands and
//   where the drop-off is, so that is where the recording is.
//
//   Custom tags (clarity "set"). These are the columns you can filter and
//   segment a session list by: which rung of the funnel a session reached,
//   which goal she chose, whether she reached the paywall, how far into checkout
//   she got, and the failure code if checkout broke. This is the part that turns
//   "watch 400 replays" into "38 percent of sessions reach the height picker and
//   never reach the health screen, here are those 90 replays".
//
//   Custom events (clarity "event"). The moments: goal chosen, paywall reached,
//   checkout opened, payment declined, purchase completed.
//
//   Priority retention (clarity "upgrade") on the money moments, so those
//   sessions are the ones Clarity keeps when it starts dropping recordings.
//
// ---------------------------------------------------------------------------
// WHAT IS NOT CAPTURED, AND WHY
// ---------------------------------------------------------------------------
//   1. CARD NUMBER, CVC, EXPIRY. Not a policy choice and not something that can
//      be switched on. Those fields are rendered by Stripe inside a
//      cross-origin iframe on js.stripe.com. This origin cannot read a single
//      pixel or a single keystroke out of it: the browser's same-origin policy
//      forbids it, and no recorder, Clarity included, can cross that line. It
//      is also the reason this site stays outside PCI-DSS scope and inside
//      Stripe's terms of service. See the comment at the PaymentElement mount
//      in components/funnel/CheckoutSheet.jsx.
//
//   2. THE EMAIL ADDRESS ITSELF. The one address the site collects is entered at
//      checkout, and that field is marked data-clarity-mask="true" on top of
//      Clarity's default input masking, so a future change to the project's
//      masking mode cannot quietly start capturing it. What is recorded is that
//      she reached the checkout email rung, never the address. Her name, when
//      she gives one, is masked on the same terms.
//
//   3. THE MEMBER APP AND THE ADMIN DASHBOARD. The tag is never injected on
//      /app or /admin. Those screens carry member names, email addresses,
//      billing state, symptom check-ins and Coach Mia transcripts. Pelvic
//      health is data concerning health, which is special category data under
//      GDPR Article 9: recording it needs an Article 9(2) condition, and
//      "we wanted better analytics" is not one of them. The rules are in
//      public/clarity-gate.js and are deny-by-default, so a new private route
//      is off until somebody adds it to that allowlist on purpose. Both places
//      that can load the tag ask those same rules: app/Clarity.jsx for every
//      app router page, and public/clarity-static.js for the 53 hand-written
//      articles and public/contact.html.
//
//   4. WHICH HEALTH CONDITIONS SHE TICKED. The funnel's health screen is
//      recorded, because it is a funnel step and the drop-off there matters,
//      but the specific conditions are never written into a custom tag. A tag
//      is structured, queryable, exportable data that outlives the replay, and
//      "sessions where condition = prolapse" is an Article 9 dataset. Only the
//      count and whether she chose "none of these" are tagged.
//
//   5. THE STRIPE PAYMENT INTENT SECRET. A card that needs 3-D Secure comes
//      back to /welcome with payment_intent_client_secret in the query string.
//      isTrackedPath refuses that document outright, because a pageview URL is
//      captured before any application code can strip it. The session's earlier
//      pages are still recorded; only that one confirmation view is not.
//
//   6. NOTHING IS SENT TO clarity("identify"). It exists and it would let you
//      join a replay to a named member, which is exactly the join that turns an
//      anonymous funnel recording into health data about an identified person.
//
// ---------------------------------------------------------------------------
// SAFETY
// ---------------------------------------------------------------------------
//   Every call below is a no-op when Clarity is absent: not loaded yet, blocked
//   by an ad blocker or a tracking-protection browser, or deliberately not
//   injected because the route is private. Analytics must never be able to take
//   the checkout down, so nothing here throws and nothing here is awaited.

// --- Route gate -------------------------------------------------------------
//
// The rules themselves moved to public/clarity-gate.js. They did not change:
// deny by default, path AND query, "/app" and "/admin" blocked ahead of any
// allow rule. Read that file for the whole gate; this is only where it enters
// the Next app.
//
// It moved because the 53 hand-written articles in public/blog and
// public/contact.html are served straight off the CDN and nothing in this
// bundle runs on them, so they had no tag at all. A static page can only load
// a URL, and files under lib/ are compiled into content-hashed chunks that
// have no stable one. public/ is copied verbatim into out/, so a file there
// has a URL the articles can reference and this module can still import.
//
// The import below is what keeps the two honest. There is one copy of the
// allowlist in the repo, and the articles and the funnel are gated by the same
// bytes. Widening it widens both, which is the point: nobody can loosen the
// blog's gate without seeing that they are loosening /app's.
//
// Re-exported rather than imported-and-forwarded so that every existing
// `from "@/lib/analytics"` in app/ and components/ keeps working unchanged.

export { CLARITY_PROJECT_ID, normalisePath, isTrackedPath } from "../public/clarity-gate.js";

// The advertised price, read only as the fallback for the Google Ads conversion
// value at the very bottom of this file. lib/pricing.js carries no browser API,
// so importing it into this client module is safe. See its header for why the
// amount lives there rather than being typed here.
import { DEFAULT_PRICE_AMOUNT, PRICE_CURRENCY } from "./pricing";

// --- The safe wrapper -------------------------------------------------------

/**
 * Call Clarity if it is there. Never throws, never returns a promise.
 *
 * Note what "there" means. The tag's own snippet installs window.clarity as a
 * queueing stub the moment it runs, so a call made before clarity.ms has
 * finished downloading is queued and replayed, not lost. If the CDN is blocked
 * the queue simply grows and is never drained, which costs a few bytes of
 * memory and nothing else. If the route is private the tag was never injected,
 * window.clarity is undefined, and this returns false.
 */
function call(...args) {
  if (typeof window === "undefined") return false;
  const clarity = window.clarity;
  if (typeof clarity !== "function") return false;
  try {
    clarity(...args);
    return true;
  } catch {
    // A broken analytics tag must never be able to break a page that takes
    // money. There is nothing useful to do with this error.
    return false;
  }
}

/** Clarity tag values are strings, capped, and never an email address. */
function cleanValue(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  // A cheap standing guard on rule 2 at the top of this file. If a future edit
  // ever passes an address into a tag by accident, it is dropped here rather
  // than becoming a permanent, exportable, searchable column in Clarity.
  if (text.includes("@")) return null;
  return text.slice(0, 200);
}

/**
 * A dimension worth segmenting a session list by. Clarity keeps every value a
 * key is given during a session, so setting the same key at several steps is
 * how "sessions that ever reached the height picker" gets answered.
 */
export function setTag(key, value) {
  const clean = cleanValue(value);
  if (!key || clean === null) return;
  call("set", String(key), clean);
}

/** A moment. Shows up as a filterable custom event on the session list. */
export function track(name) {
  const clean = cleanValue(name);
  if (clean === null) return;
  call("event", clean);
}

/**
 * Ask Clarity to keep this session when it starts sampling recordings away.
 *
 * Used sparingly and on purpose: upgrading everything is the same as upgrading
 * nothing. Only the money moments below call it.
 */
export function prioritise(reason) {
  const clean = cleanValue(reason);
  if (clean === null) return;
  call("upgrade", clean);
}

/** Used by the route gate when a client-side navigation enters a private area. */
export function stopClarity() {
  return call("stop");
}

// --- The funnel ladder ------------------------------------------------------
//
// Numbered so the values sort in the order she walks them in Clarity's filter
// list, which is alphabetical, and so that recordRung can compare two rungs
// with a plain string compare. Renaming a rung breaks continuity with every
// session already recorded, so add rungs rather than renumbering them, and keep
// the numbers two digits or "10_" sorts before "02_".

export const FUNNEL_LADDER = {
  welcome: "01_landing",
  goal: "02_goal",
  howItHelps: "03_how_it_helps",
  // Deliberately null. The intake screen is four questions behind one step id,
  // and "she left on the height picker" is the single most useful thing this
  // whole file exists to answer, so the sub-steps below are the rungs and the
  // parent step records nothing.
  intake: null,
  health: "08_health",
  personalizing: "09_personalizing",
  // The funnel no longer has an email rung. The address is collected at
  // checkout, so "10_email" retired and the plan reveal moved up into its
  // number rather than leaving a gap the depth compare would read as a jump.
  planReveal: "10_plan_reveal",
  paywall: "11_paywall",
};

export const INTAKE_LADDER = {
  name: "04_intake_name",
  age: "05_intake_age",
  weight: "06_intake_weight",
  height: "07_intake_height",
};

export const CHECKOUT_LADDER = {
  email: "12_checkout_email",
  card: "13_checkout_card",
  paid: "14_paid",
};

// How far she ever got, written once on the way out.
//
// DEEPEST, not last, and the difference matters. Someone who reaches the
// paywall, taps back to re-read the plan and then leaves has a LAST rung of
// "11_plan_reveal" and a DEEPEST rung of "12_paywall", and only the second one
// answers "did she see the price". Taking the maximum also makes the write
// idempotent, which is what lets it be attempted more than once safely.
//
// Written on pagehide only. visibilitychange fires every time she switches
// apps, which on a phone happens constantly mid-funnel, and each of those would
// add another value to the key: Clarity keeps every value a key is given during
// a session, so a tag written three times is a tag you cannot count on.
//
// This is best effort by nature. A tab the OS kills outright never fires
// anything. Nothing depends on it: funnel_step below is written at every rung
// as it happens, so "reached the height picker and never reached the health
// screen" is answerable from those alone, and this tag is a convenience.
let deepestRung = null;
let exitTagInstalled = false;
let exitTagWritten = false;

function installExitTag() {
  if (exitTagInstalled || typeof window === "undefined") return;
  exitTagInstalled = true;
  window.addEventListener("pagehide", () => {
    if (exitTagWritten || !deepestRung) return;
    exitTagWritten = true;
    setTag("funnel_deepest_step", deepestRung);
  });
}

function recordRung(rung) {
  if (!rung) return;
  installExitTag();
  // The rungs are numbered so that a string compare is a depth compare. This is
  // the reason for the "01_", "02_" prefixes, beyond sorting in the Clarity UI.
  if (!deepestRung || rung > deepestRung) deepestRung = rung;
  setTag("funnel_step", rung);
}

/** Called with the funnel's own STEP id. Unknown or null rungs are ignored. */
export function trackFunnelStep(step) {
  recordRung(FUNNEL_LADDER[step]);
  if (step === "welcome") track("funnel_landing");
}

/** The four questions inside the intake screen, by sub-step id. */
export function trackIntakeStep(subStep) {
  recordRung(INTAKE_LADDER[subStep]);
}

export function trackGoalChosen(goalId) {
  if (!goalId) return;
  setTag("goal", goalId);
  track("goal_selected");
}

/**
 * The health screen's answers, at the only resolution that is safe to store.
 * Counts and a boolean, never the condition ids. See rule 4 at the top.
 */
export function trackHealthAnswers(profile) {
  if (!profile) return;
  const count = profile.noConditions ? 0 : (profile.conditions || []).length;
  setTag("condition_count", String(count));
  if (profile.noConditions) setTag("conditions_none", "yes");
  if (profile.activity) setTag("activity", profile.activity);
}

// The paywall has two ways in: walking the funnel, and reloading the browser
// straight onto it, and on a reload both Funnel and HomeClient can reasonably
// claim to be the one that noticed. Tag values dedupe on their own inside
// Clarity but events do not, so this is guarded to fire once per document.
let paywallReachedFired = false;

export function trackPaywallReached(profile) {
  recordRung(FUNNEL_LADDER.paywall);
  if (paywallReachedFired) return;
  paywallReachedFired = true;
  setTag("reached_paywall", "yes");
  if (profile?.goalId) setTag("goal", profile.goalId);
  track("paywall_reached");
  // Everything that decides revenue happens from here on. These are the
  // replays worth keeping.
  prioritise("paywall_reached");
}

export function trackCheckoutOpened() {
  recordRung(CHECKOUT_LADDER.email);
  setTag("checkout_stage", "opened");
  track("checkout_opened");
  prioritise("checkout_opened");
}

export function trackCardFormShown() {
  recordRung(CHECKOUT_LADDER.card);
  setTag("checkout_stage", "card_form");
  track("checkout_card_form_shown");
}

/**
 * The subscription could not even be set up, so no card was ever asked for.
 * `code` comes from functions/api/create-payment-intent.js: already_subscribed,
 * price_unresolved, network_error, http_500 and so on.
 */
export function trackCheckoutSetupFailed(code) {
  setTag("checkout_stage", "setup_failed");
  setTag("checkout_error", code || "unknown");
  track("checkout_setup_failed");
  prioritise("checkout_setup_failed");
}

/**
 * Stripe refused the payment. Both codes are recorded because they answer
 * different questions: `code` is what went wrong (card_declined,
 * incomplete_number, authentication required), `decline_code` is the issuing
 * bank's reason (insufficient_funds, do_not_honor, lost_card) and is the one
 * that tells you whether the price or the card is the problem.
 *
 * Neither is personal data. Nothing about the card itself is available here:
 * this object is what Stripe.js hands back from confirmPayment, and the number
 * never left its iframe.
 */
export function trackPaymentFailed(error) {
  setTag("checkout_stage", "declined");
  setTag("checkout_error", error?.code || error?.type || "unknown");
  if (error?.decline_code) setTag("decline_code", error.decline_code);
  track("payment_failed");
  prioritise("payment_failed");
}

/** @param {"succeeded"|"processing"} status */
export function trackPurchaseCompleted(status) {
  recordRung(CHECKOUT_LADDER.paid);
  setTag("checkout_stage", "paid");
  setTag("payment_status", status || "succeeded");
  track("purchase_completed");
  prioritise("purchase_completed");
}

export function trackRestoreOpened() {
  setTag("restore_opened", "yes");
  track("restore_opened");
}

/**
 * How /welcome resolved. The 3-D Secure redirect never gets here, because that
 * document carries the payment intent secret and is refused by isTrackedPath;
 * this covers the inline-confirm and restore arrivals.
 */
export function trackWelcomeStatus(status) {
  if (!status || status === "confirming") return;
  setTag("welcome_status", status);
  track(`welcome_${status}`);
}

/**
 * The web-to-app handoff, which is the one number in
 * recon/APP-BANNER-RESEARCH.md worth watching after launch: the share of web
 * buyers who end up with the app. The benchmark quoted there is 90% or better,
 * and under 85% means the handoff is broken rather than the copy being weak.
 *
 * Three moments, and the ratios between them are the whole story:
 *   "offered"  the App Store sheet was rendered for an iPhone member who paid
 *   "opened"   she tapped through to Apple
 *   "not_now"  she closed it, and will not be asked again on this browser
 *
 * Nothing here identifies a device or a person, and none of it fires on a
 * device that was never offered the app, so Android and desktop sessions carry
 * no app_offer tag at all rather than carrying an empty one.
 *
 * @param {"offered"|"opened"|"not_now"} action
 */
export function trackAppOffer(action) {
  if (!action) return;
  setTag("app_offer", action);
  track(`app_offer_${action}`);
}

// --- Google Ads: the purchase conversion ------------------------------------
//
// The one event the paid-search account optimises against, and the only thing
// in this file that talks to Google's gtag rather than to Microsoft Clarity. It
// lives here on purpose: there is exactly one place that owns the conversion,
// next to the funnel events above it, so nobody has to grep the tree to find
// where money is reported to Google.
//
// WHAT IS ALLOWED TO FIRE IT. A genuine, Stripe-confirmed purchase, from
// /welcome, once the status machine there has resolved to "paid" (the 90-day
// intro). Never a button click, never the paywall, never a page that merely CAN
// be reloaded into a re-fire. See app/welcome/WelcomeClient.jsx: the caller
// hands us the Stripe PaymentIntent id and the amount Stripe actually charged,
// and this function is idempotent per PaymentIntent, so a reload or a re-mount
// cannot count the same sale twice.
//
// NOT GATED BY isTrackedPath. That gate governs whether the Microsoft Clarity
// tag is injected on a document; it has nothing to do with gtag, which
// app/layout.js loads on every route unconditionally. So the Clarity
// "public routes only" rule cannot suppress a purchase fire on /welcome. (For
// the record /welcome is on the Clarity allowlist too, but that is a separate
// vendor and a separate decision.)
//
// THE THREE FIELDS GOOGLE NEEDS, AND WHY NONE IS OPTIONAL HERE:
//   send_to         the account + conversion label the owner gave us. Fixed.
//   value/currency  the real money. Smart Bidding cannot bid to a return on ad
//                   spend without the amount: a conversion with no value teaches
//                   the bidder a sale is worth nothing, which is worse than not
//                   firing. Taken from Stripe's charged amount when /welcome has
//                   it, and from lib/pricing.js otherwise.
//   transaction_id  the PaymentIntent id. It is what lets Google DEDUPE a
//                   reload or a double navigation and what lets a refund be
//                   matched to the click that earned it. NEVER empty: a fire
//                   with no id is refused below, because an empty id makes every
//                   purchase look like one and the same sale to Google.
//
// ENHANCED CONVERSIONS (the sha256 email) are ATTEMPTED AND ALLOWED TO FAIL.
// NOTE FOR THE OWNER: pelvic health is a restricted vertical in Google Ads, and
// Google may reject enhanced conversions for this account. That rejection is
// server-side on Google's end and cannot break the plain value conversion,
// which is the one that has to land. If enhanced conversions are turned on in
// the Ads UI and the vertical permits them, the hashed email below is already
// being sent and lifts match rates; if they are blocked, nothing here changes
// and the value conversion still fires. Confirm the vertical's status in
// Google Ads > Conversions before relying on the hashed email.

const CONVERSION_SEND_TO = "AW-18382744409/PRCtCMubzN8cENnWyb1E";

// Two guards against a second fire, because two different re-entries exist:
//   - firedConversions (in memory) stops a React re-mount inside the SAME
//     document, and holds the id across the async gap below while the email is
//     hashed, so two calls a frame apart cannot both get through.
//   - the localStorage key survives a full RELOAD of /welcome?paid=1 and the
//     3-D Secure round trip, which are fresh documents the in-memory Set never
//     sees. Keyed on the transaction id, so a genuinely new purchase (a new
//     PaymentIntent) still counts as one.
const firedConversions = new Set();
const CONVERSION_STORE_PREFIX = "pelvi.adconv.";

function conversionAlreadyFired(transactionId) {
  if (firedConversions.has(transactionId)) return true;
  try {
    if (
      typeof window !== "undefined" &&
      window.localStorage.getItem(CONVERSION_STORE_PREFIX + transactionId)
    ) {
      return true;
    }
  } catch {
    // Storage blocked (private mode). The in-memory Set is then the only guard,
    // which still stops a re-mount inside this one document.
  }
  return false;
}

function rememberConversionFired(transactionId) {
  firedConversions.add(transactionId);
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        CONVERSION_STORE_PREFIX + transactionId,
        String(Date.now())
      );
    }
  } catch {
    // See conversionAlreadyFired. The durable half is best effort; the fire it
    // is protecting already happened.
  }
}

/** Call Google's gtag if it is there. Never throws. Mirrors call() above. */
function gtagCall(...args) {
  if (typeof window === "undefined") return false;
  const g = window.gtag;
  if (typeof g !== "function") return false;
  try {
    g(...args);
    return true;
  } catch {
    // A broken tag must never be able to take down the page after a payment.
    return false;
  }
}

/**
 * Wait for the gtag stub to exist. app/layout.js injects it with an
 * afterInteractive script, so on a fresh /welcome load it is almost always
 * already there by the time the status machine resolves; this only covers the
 * rare beat where it is a step behind. Bounded, because a member on an ad
 * blocker will never see it appear and must not be waited on forever.
 */
function whenGtagReady(timeoutMs = 4000) {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (typeof window.gtag === "function") return Promise.resolve(true);
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (typeof window !== "undefined" && typeof window.gtag === "function") {
        resolve(true);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        resolve(false);
        return;
      }
      setTimeout(tick, 150);
    };
    setTimeout(tick, 150);
  });
}

/** SHA-256 of a string as lowercase hex, or null when the browser cannot. */
async function sha256Hex(text) {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) return null;
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

/**
 * Fire the Google Ads purchase conversion, exactly once per payment.
 *
 * @param {object} args
 * @param {string} args.transactionId  the Stripe PaymentIntent id. REQUIRED:
 *   no id, no fire, because an empty transaction_id defeats Google's dedupe and
 *   refund matching.
 * @param {number} [args.value]  the real charged amount in the major unit
 *   (dollars). Falls back to the advertised price from lib/pricing.js.
 * @param {string} [args.currency]  ISO currency; defaults to USD.
 * @param {string} [args.email]  for enhanced conversions only. Hashed before it
 *   leaves the browser and never required for the fire. See the header note on
 *   the health vertical.
 * @returns {Promise<boolean>}  whether a conversion was sent on this call.
 */
export async function trackPurchase({ transactionId, value, currency, email } = {}) {
  const txn = transactionId ? String(transactionId).trim() : "";
  // NEVER an empty transaction_id. Without it Google collapses every purchase
  // onto the same id and dedupes real sales away, so a fire with no id is no
  // fire at all.
  if (!txn) return false;
  if (conversionAlreadyFired(txn)) return false;

  // Claim the id in memory before the awaits below, so a re-mount cannot slip a
  // second call through the gap. Released again only if nothing is ever sent.
  firedConversions.add(txn);

  const amount =
    typeof value === "number" && Number.isFinite(value) && value > 0
      ? value
      : Number(DEFAULT_PRICE_AMOUNT);
  const cur = (currency || PRICE_CURRENCY || "USD").toUpperCase();

  const ready = await whenGtagReady();
  if (!ready) {
    // The tag never appeared (blocked, or offline). Nothing was sent, so let go
    // of the in-memory claim: a later attempt, once the tag loads, may succeed,
    // and no durable record was written, so this cannot double-count.
    firedConversions.delete(txn);
    return false;
  }

  // Enhanced conversions, attempted and allowed to fail. Set BEFORE the event so
  // gtag attaches it, and wrapped so a rejection here can never stop the value
  // conversion below. See the header note on the restricted health vertical.
  if (email) {
    try {
      const normalised = String(email).trim().toLowerCase();
      const hashed = normalised ? await sha256Hex(normalised) : null;
      if (hashed) gtagCall("set", "user_data", { sha256_email_address: hashed });
    } catch {
      // The plain conversion still fires. Nothing to recover here.
    }
  }

  const sent = gtagCall("event", "conversion", {
    send_to: CONVERSION_SEND_TO,
    value: amount,
    currency: cur,
    transaction_id: txn,
  });

  if (sent) {
    // Durable, so a reload of /welcome?paid=1 and the 3-D Secure return both
    // find this id already spent and stay quiet.
    rememberConversionFired(txn);
    return true;
  }

  // gtag reported ready but the call did not go through. Release the claim so a
  // later attempt can retry; nothing durable was written.
  firedConversions.delete(txn);
  return false;
}
