"use client";

// Who she is, in one file, for a product where PAYING IS THE IDENTITY EVENT.
//
// The rule this file exists to enforce: once a member has paid we already have
// her email address, so she is never asked to prove who she is again. Google
// sign-in stops being the door and becomes one of the doors, for the people who
// prefer it.
//
// Three ways in, in the order we try them:
//
//   1. FROM THE PAYMENT, zero clicks. The browser is holding the PaymentIntent
//      client secret. /api/session-from-payment verifies it with Stripe, reads
//      the address off the customer, mints a Firebase custom token, and she is
//      in before the success page finishes painting. Requires
//      FIREBASE_SERVICE_ACCOUNT on the Worker; see that file's header.
//   2. AN EMAIL LINK, one click. Firebase's sendSignInLinkToEmail. No password,
//      no Google account, and it still yields a VERIFIED address, which is what
//      lib/memberStore.js joins her phone record on. This is the fallback when
//      the service account is absent, and the only path we will use for an
//      address that was typed rather than paid with.
//   3. GOOGLE, for anybody who would rather. Lives in MemberProvider.
//
// TWO SWITCHES ONLY THE OWNER CAN THROW, and neither of them is in this repo.
// Everything below degrades to the next path down without them, and Google is
// always the floor, so nothing is ever a dead end. But until they are on, the
// zero click promise is not being kept:
//
//   FIREBASE_SERVICE_ACCOUNT, on Cloudflare Pages > Settings > Environment
//     variables. REQUIRED for path 1. There is no way around it: minting a
//     Firebase session means signing a JWT with the project's private key.
//     Without it every payer falls to path 2.
//
//   Email link sign-in, in the Firebase console under Authentication >
//     Sign-in method > Email/Password > "Email link (passwordless sign-in)".
//     REQUIRED for path 2. As of this change it is OFF: sendSignInLinkToEmail
//     answers 400 OPERATION_NOT_ALLOWED, which surfaces here as
//     auth/operation-not-allowed. With it off AND no service account, every
//     member is back to Google being the only door.
//
// WHY THE FIREBASE IMPORTS ARE ALL DYNAMIC. This module is imported by funnel
// screens, and the funnel is where every paid ad click lands. A static
// `import "firebase/auth"` here would put the whole Firebase SDK into the
// landing page's bundle for the 99% of visitors who never sign in. Loaded this
// way it costs nothing until a member actually asks to be let in.

const LOGIN_EMAIL_KEY = "pelvi.login.email";
const PAID_INTENT_KEY = "pelvi.paid.intent";

// "The link path is switched off on this deployment."
//
// Not a preference and not user data: a fact about the project, learned the
// only way it can be learned from a browser, which is by asking Firebase to
// send one and being told OPERATION_NOT_ALLOWED. It is remembered because the
// screens that offer the link are spread over three documents — the funnel, the
// paywall sheet and the member gate — and each of them would otherwise have to
// find out for itself, by putting its biggest button in front of a member and
// having it fail.
//
// It expires, and that is the point of the timestamp rather than a bare flag:
// the switch is one checkbox in the Firebase console (Authentication >
// Sign-in method > Email/Password > "Email link (passwordless sign-in)"), and
// the day it is turned on this must heal on its own rather than leave the
// product permanently hiding a door that now works.
const LINK_OFF_KEY = "pelvi.linkSignIn.off";
const LINK_OFF_TTL_MS = 12 * 60 * 60 * 1000;

const LINK_OFF_CODES = new Set(["auth/operation-not-allowed", "auth/unauthorized-continue-uri"]);

function noteLinkAvailability(code) {
  if (typeof window === "undefined") return;
  try {
    if (LINK_OFF_CODES.has(code)) {
      window.localStorage.setItem(LINK_OFF_KEY, String(Date.now()));
    } else if (!code) {
      window.localStorage.removeItem(LINK_OFF_KEY);
    }
  } catch {
    // Storage off. Every screen simply finds out for itself, as before.
  }
}

/**
 * Should a screen still offer "email me a login link" as the way in?
 *
 * False means the last attempt from this browser was refused by the project
 * itself, so the link is not a door today and whatever else the screen has is.
 * Never used to hide a working path: a stale "no" ages out in twelve hours.
 */
export function linkSignInLikelyOff() {
  if (typeof window === "undefined") return false;
  try {
    const at = Number(window.localStorage.getItem(LINK_OFF_KEY) || 0);
    if (!at) return false;
    if (Date.now() - at > LINK_OFF_TTL_MS) {
      window.localStorage.removeItem(LINK_OFF_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Where the link in her inbox comes back to. /welcome knows how to finish a
// sign-in and is the page she has already been told to expect after paying.
const LOGIN_LANDING = "/welcome";

// The funnel must never be held up by a lookup. Past this, we simply carry on
// and let the paywall do its job.
const QUIET_CHECK_MS = 3000;

// --- The payment she has just made -----------------------------------------

/**
 * Keep the client secret for the page after this one.
 *
 * The inline card path confirms the payment and then navigates, so the secret
 * would otherwise be gone by the time /welcome could use it. sessionStorage, not
 * local: it dies with the tab, and it is cleared the moment it is redeemed.
 *
 * The 3-D Secure path does not need this. Stripe puts the same secret in the
 * return URL, and /welcome reads it from there.
 */
export function stashPaidIntent(clientSecret) {
  if (typeof window === "undefined" || !clientSecret) return;
  try {
    window.sessionStorage.setItem(PAID_INTENT_KEY, clientSecret);
  } catch {
    // Private browsing. The sign-in falls back to the link, or to Google.
  }
}

export function readPaidIntent() {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(PAID_INTENT_KEY) || "";
  } catch {
    return "";
  }
}

export function clearPaidIntent() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(PAID_INTENT_KEY);
  } catch {
    /* see stashPaidIntent */
  }
}

// --- Path 1: the session that comes out of a payment -----------------------

/**
 * Turn a payment into a session.
 *
 * Resolves to:
 *   { ok: true,  mode: "instant" }          she is signed in, nothing to do
 *   { ok: true,  mode: "link", email }      a sign-in link is in her inbox
 *   { ok: false, code, email }              neither worked; offer Google
 *
 * The email in the answer comes from Stripe by way of our own Worker, never
 * from anything typed in this browser. See functions/api/session-from-payment.js.
 */
export async function signInFromPayment(clientSecret) {
  if (!clientSecret) return { ok: false, code: "no_payment" };

  let data = null;
  try {
    const res = await fetch("/api/session-from-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientSecret }),
    });
    data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      return { ok: false, code: data?.error?.code || `http_${res.status}` };
    }
  } catch {
    return { ok: false, code: "network_error" };
  }

  if (data.mode === "custom_token" && data.token) {
    try {
      const [{ auth }, { signInWithCustomToken }] = await Promise.all([
        import("./firebase"),
        import("firebase/auth"),
      ]);
      await signInWithCustomToken(auth(), data.token);
      forgetLoginEmail();
      return { ok: true, mode: "instant", email: data.email || "" };
    } catch (error) {
      // The token was good but the exchange failed. Fall through to the link
      // rather than strand her: she has paid.
      //
      // When the link fails too, HER error is the one that gets reported, not
      // the token's. Reporting the token's code here printed "we could not send
      // that link, please try again" on a deployment where the link can never
      // be sent at all, which is a sentence that asks a member to keep pressing
      // a button that has no chance of working. loginErrorMessage() has real
      // copy for the switch being off; it just never got the code to use it.
      if (data.email) {
        const sent = await sendLoginLink(data.email);
        if (sent.ok) return { ok: true, mode: "link", email: data.email };
        return { ok: false, code: sent.code, email: data.email };
      }
      return { ok: false, code: error?.code || "signin_failed", email: "" };
    }
  }

  if (data.mode === "email_link" && data.email) {
    const sent = await sendLoginLink(data.email);
    if (sent.ok) return { ok: true, mode: "link", email: data.email };
    return { ok: false, code: sent.code, email: data.email };
  }

  return { ok: false, code: "unsupported" };
}

// --- Path 2: the link in her inbox -----------------------------------------

/**
 * Email her a one-tap sign-in link.
 *
 * Resolves to { ok: true } or { ok: false, code }. The codes worth knowing:
 *   auth/operation-not-allowed  email link sign-in is switched off in the
 *                               Firebase console. Nothing in this repo can turn
 *                               it on; see the note in the README of this change.
 *   auth/unauthorized-continue-uri  this origin is not an authorized domain.
 */
export async function sendLoginLink(email) {
  const address = (email || "").trim().toLowerCase();
  if (!address) return { ok: false, code: "no_email" };
  if (typeof window === "undefined") return { ok: false, code: "no_window" };

  try {
    const [{ auth, isFirebaseConfigured }, { sendSignInLinkToEmail }] = await Promise.all([
      import("./firebase"),
      import("firebase/auth"),
    ]);
    if (!isFirebaseConfigured()) return { ok: false, code: "not_configured" };

    await sendSignInLinkToEmail(auth(), address, {
      url: `${window.location.origin}${LOGIN_LANDING}`,
      handleCodeInApp: true,
    });
    rememberLoginEmail(address);
    noteLinkAvailability("");
    return { ok: true };
  } catch (error) {
    const code = error?.code || "send_failed";
    noteLinkAvailability(code);
    return { ok: false, code };
  }
}

/**
 * Is this page load the other end of one of those links?
 *
 * Synchronous, and deliberately does not touch Firebase: the member gate has to
 * decide whether to show a spinner or a sign-in screen in its first render, and
 * it cannot await an SDK to find out.
 */
export function looksLikeSignInLink(href) {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(href || window.location.href);
    return url.searchParams.get("mode") === "signIn" && Boolean(url.searchParams.get("oobCode"));
  } catch {
    return false;
  }
}

/**
 * Finish a sign-in that started in her inbox.
 *
 * Resolves to:
 *   { done: true }                 signed in
 *   { done: false, needsEmail }    the link opened in a browser that does not
 *                                  remember which address it was for. Firebase
 *                                  requires it, to stop a link forwarded to
 *                                  somebody else from signing THEM in, so the
 *                                  caller has to ask for it and call again.
 *   { done: false, code }          the link was used, or expired
 */
export async function completeEmailLinkSignIn(explicitEmail = "") {
  if (!looksLikeSignInLink()) return { done: false };

  try {
    const [{ auth, isFirebaseConfigured }, { isSignInWithEmailLink, signInWithEmailLink }] =
      await Promise.all([import("./firebase"), import("firebase/auth")]);
    if (!isFirebaseConfigured()) return { done: false, code: "not_configured" };

    const href = window.location.href;
    if (!isSignInWithEmailLink(auth(), href)) return { done: false };

    const email = (explicitEmail || rememberedLoginEmail() || "").trim().toLowerCase();
    if (!email) return { done: false, needsEmail: true };

    await signInWithEmailLink(auth(), email, href);
    forgetLoginEmail();
    stripSignInParams();
    return { done: true };
  } catch (error) {
    const code = error?.code || "signin_failed";
    // A wrong address is the one failure worth asking again about. Everything
    // else means the link itself is spent.
    if (code === "auth/invalid-email") return { done: false, needsEmail: true, code };
    stripSignInParams();
    return { done: false, code };
  }
}

/**
 * A single-use sign-in code has no business sitting in the address bar, the
 * browser history or a referrer header once it has been spent.
 */
function stripSignInParams() {
  try {
    const url = new URL(window.location.href);
    for (const key of ["mode", "oobCode", "apiKey", "continueUrl", "lang", "tenantId"]) {
      url.searchParams.delete(key);
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Nothing to do, and nothing worth failing a sign-in over.
  }
}

export function rememberLoginEmail(email) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOGIN_EMAIL_KEY, email);
  } catch {
    /* she will be asked to confirm the address instead */
  }
}

export function rememberedLoginEmail() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(LOGIN_EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

export function forgetLoginEmail() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOGIN_EMAIL_KEY);
  } catch {
    /* see rememberLoginEmail */
  }
}

// --- Recognising a member before we try to sell to her ----------------------

/**
 * Quietly: does this address already have a live plan?
 *
 * Used at the two places in the funnel where she hands us an address, so that a
 * member who is already paying is never sold a second subscription and never
 * told to "restore" anything. It answers a bare boolean and it is the same
 * lookup /api/restore-purchase has always answered for a signed-out caller, so
 * it opens no new surface.
 *
 * It CANNOT and MUST NOT sign her in on its own. The address was typed into this
 * browser, so it proves nothing: anyone could enter a member's address. A yes
 * here buys her the link in her inbox, which proves it.
 *
 * Never throws, and never waits long. A yes has to be right; a no only has to be
 * quick, because the worst case is the paywall she was about to see anyway.
 */
export async function hasActivePlan(email) {
  const address = (email || "").trim().toLowerCase();
  if (!address || typeof window === "undefined") return false;

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), QUIET_CHECK_MS) : null;

  try {
    const res = await fetch("/api/restore-purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: address }),
      signal: controller?.signal,
    });
    const data = await res.json().catch(() => null);
    return Boolean(data?.isPremium);
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// --- Small conveniences -----------------------------------------------------

/** The address of whoever is signed in on this browser, or "". */
export async function currentUserEmail() {
  try {
    const { auth, isFirebaseConfigured } = await import("./firebase");
    if (!isFirebaseConfigured()) return "";
    return (auth().currentUser?.email || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Copy for a failed sign-in attempt. One place, so five screens cannot each
 * invent their own wording for "the console switch is off".
 *
 * Nothing here says "below" or "above": the same sentence is shown in a bottom
 * sheet on the paywall, on a full screen in the funnel and inside the member
 * gate, and the other way in is in a different place on each of them.
 */
export function loginErrorMessage(code) {
  // auth/operation-not-allowed means email link sign-in is switched off in the
  // Firebase console. No code in this repo can turn it on. See the note in
  // functions/api/session-from-payment.js and tell the owner rather than
  // dressing it up as her problem.
  if (code === "auth/operation-not-allowed" || code === "auth/unauthorized-continue-uri") {
    return "We could not email you a link just now. Use one of the other ways in, or email hello@pelvi.health and we will let you in by hand.";
  }
  if (code === "auth/invalid-email") {
    return "That does not look like a complete email address.";
  }
  if (code === "auth/too-many-requests") {
    return "That is a lot of attempts in a short time. Please wait a few minutes and try again.";
  }
  if (code === "auth/expired-action-code" || code === "auth/invalid-action-code") {
    return "That link has already been used or has expired. Enter your email below and we will send a fresh one.";
  }
  return "We could not send that link. Please try again, or email hello@pelvi.health.";
}
