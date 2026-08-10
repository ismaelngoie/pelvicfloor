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
//   the eight funnel screens, the plan reveal, the paywall, the post-purchase
//   page, the blog and the two legal pages. That is where the ad money lands
//   and where the drop-off is, so that is where the recording is.
//
//   Custom tags (clarity "set"). These are the columns you can filter and
//   segment a session list by: which rung of the funnel a session reached,
//   which goal she chose, whether she gave an email or skipped, whether she
//   reached the paywall, how far into checkout she got, and the failure code if
//   checkout broke. This is the part that turns "watch 400 replays" into
//   "38 percent of sessions reach the height picker and never reach the health
//   screen, here are those 90 replays".
//
//   Custom events (clarity "event"). The moments: goal chosen, email given or
//   skipped, paywall reached, checkout opened, payment declined, purchase
//   completed.
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
//   2. THE EMAIL ADDRESS ITSELF. Clarity masks input values by default and both
//      email fields are additionally marked data-clarity-mask="true" so that a
//      future change to the project's masking mode cannot quietly unmask them.
//      What is recorded is the DECISION, not the address: "given" or "skipped".
//      Her name is masked on the same terms.
//
//   3. THE MEMBER APP AND THE ADMIN DASHBOARD. The tag is never injected on
//      /app or /admin. Those screens carry member names, email addresses,
//      billing state, symptom check-ins and Coach Mia transcripts. Pelvic
//      health is data concerning health, which is special category data under
//      GDPR Article 9: recording it needs an Article 9(2) condition, and
//      "we wanted better analytics" is not one of them. The gate lives in
//      app/Clarity.jsx and is deny-by-default, so a new private route is off
//      until somebody adds it to the allowlist here on purpose.
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

export const CLARITY_PROJECT_ID = "vaulq5g8w8";

// --- Route gate -------------------------------------------------------------
//
// Deny by default. A path has to be named here to be recorded.
//
// The static export means one URL can be reached more than one way: Cloudflare
// Pages serves out/index.html at both "/" and "/index.html", and out/app.html
// is reachable at "/app" AND at "/app.html". normalisePath folds those together
// so the gate cannot be walked around by typing the file name.

const ALLOWED_EXACT = new Set([
  "/", // landing page, the whole funnel, the plan reveal and the paywall
  "/welcome", // post-purchase confirmation
  "/blog",
  "/privacy-policy",
  "/terms",
  "/cora/contact",
  "/cora/privacy-policy",
  // Still served from public/ as hand-written HTML rather than by the app
  // router, so nothing in this file runs on them and no tag loads there at all.
  // Named anyway, so the intent survives the day they are ported.
  "/contact",
  // Redirected to /terms by public/_redirects. A 301 is a fresh document, so
  // this line is only reached if that rule is ever dropped.
  "/terms-of-use",
]);

const ALLOWED_PREFIXES = ["/blog/"];

// Redundant against deny-by-default, and kept anyway. It is the line somebody
// will read when they are about to widen ALLOWED_PREFIXES to "/".
const BLOCKED_PREFIXES = ["/app", "/admin"];

// Query parameters that must never reach a replay. Clarity records the page URL
// with the pageview, before any effect in the page can rewrite it, so the only
// safe answer is not to record that document at all.
const SENSITIVE_PARAMS = [
  "payment_intent",
  "payment_intent_client_secret",
  "setup_intent",
  "setup_intent_client_secret",
  "email",
  "token",
];

/** "/App.HTML" and "/app/" and "/app" are all "/app". */
export function normalisePath(pathname) {
  let path = String(pathname || "/").split("?")[0].split("#")[0].toLowerCase();
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.endsWith(".html")) path = path.slice(0, -5);
  if (path.endsWith("/index")) path = path.slice(0, -6) || "/";
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path || "/";
}

/**
 * May Clarity run on this document?
 *
 * @param {string} pathname  window.location.pathname, or the router's pathname
 * @param {string} [search]  window.location.search, including the "?"
 */
export function isTrackedPath(pathname, search = "") {
  const path = normalisePath(pathname);

  for (const prefix of BLOCKED_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return false;
  }

  const query = String(search || "").toLowerCase();
  if (query) {
    for (const param of SENSITIVE_PARAMS) {
      if (query.includes(`${param}=`)) return false;
    }
  }

  if (ALLOWED_EXACT.has(path)) return true;
  return ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

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
  email: "10_email",
  planReveal: "11_plan_reveal",
  paywall: "12_paywall",
};

export const INTAKE_LADDER = {
  name: "04_intake_name",
  age: "05_intake_age",
  weight: "06_intake_weight",
  height: "07_intake_height",
};

export const CHECKOUT_LADDER = {
  email: "13_checkout_email",
  card: "14_checkout_card",
  paid: "15_paid",
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
 * Whether she gave an address or skipped, never the address.
 * @param {"given"|"skipped"} choice
 */
export function trackEmailChoice(choice) {
  setTag("email_choice", choice);
  track(choice === "given" ? "email_submitted" : "email_skipped");
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
  if (profile && !profile.emailAsked) setTag("email_choice", "not_asked");
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
