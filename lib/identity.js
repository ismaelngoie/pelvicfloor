"use client";

// Who she is, in one file, for a product where PAYING IS THE IDENTITY EVENT.
//
// ============================================================================
// THE EMAIL LINK IS NO LONGER OFFERED ANYWHERE IN THE INTERFACE. THE CODE THAT
// SENDS ONE IS STILL HERE, ON PURPOSE, AND IT MUST STAY.
// ============================================================================
//
// WHY THE SEND WAS TAKEN OFF EVERY SCREEN. Firebase sends auth mail from the
// project's default sender, noreply@pelvic-floor-exercise-908ed.firebaseapp.com.
// That is a Google-owned domain with no SPF or DKIM aligned to pelvi.health, so
// the message says Pelvi and the envelope says something else, and Gmail files
// it as spam or drops it. sendSignInLinkToEmail RESOLVES SUCCESSFULLY when this
// happens: success here means "Google accepted the message for delivery", never
// "she received it". So the product cheerfully sat a paying member on a "check
// your email" screen, waiting for something that was never going to visibly
// arrive, with no way for any code in this repo to find out. A door that fails
// silently is worse than no door, so the door is closed. Google and Apple both
// either work or say so immediately, and they are the only two we offer.
//
// WHAT HAS TO BE TRUE BEFORE THE SEND CAN BE PUT BACK IN FRONT OF A MEMBER.
// All three, in this order, and the first one is the whole point:
//
//   1. A CUSTOM SENDING DOMAIN, VERIFIED. Firebase console > Authentication >
//      Templates > "Customize domain", entered as pelvi.health, with the TXT
//      and DKIM records it asks for added in Cloudflare with the orange cloud
//      OFF, and the wizard showing green. Step by step in
//      SIGN-IN-WITH-APPLE-SETUP.md, Part Two. Until this is green, every
//      sentence below about a link arriving is a sentence we cannot honour.
//   2. EMAIL LINK SIGN-IN SWITCHED ON, in the same console under
//      Authentication > Sign-in method > Email/Password > "Email link
//      (passwordless sign-in)". It is off today: sendSignInLinkToEmail answers
//      400 OPERATION_NOT_ALLOWED, surfacing here as auth/operation-not-allowed.
//   3. PROOF, BY HAND, NOT BY THE API ANSWERING OK. Send one to a Gmail
//      address, a Hotmail address and an iCloud address from a browser that has
//      never signed in, and confirm all three land in the inbox rather than the
//      spam folder. Nothing in this file can run that test for you.
//
// Only then does a send button go back on a screen. Re-adding it means new UI —
// a field, a "check your spam folder" line, and a resend with a cooldown, all
// of which were deleted along with components/auth/emailLinkHelp.js and are in
// git history if they are wanted back.
//
// WHAT IS STILL LIVE, AND MUST NOT BE REMOVED. Every link this product has ever
// sent is still redeemable. `looksLikeSignInLink` and `completeEmailLinkSignIn`
// are wired into MemberProvider and into /welcome exactly as they were, so a
// member who taps a link that reached her inbox last month is signed in the way
// she always was — including the case where she opens it in a browser that does
// not remember which address it was for, which is why the "confirm the address"
// field survives on both of those screens. `sendLoginLink` is kept and exported
// so that turning the door back on is a UI change and nothing more.
//
// So, two ways in that a screen actually offers:
//
//   1. FROM THE PAYMENT, zero clicks. The browser is holding the PaymentIntent
//      client secret. /api/session-from-payment verifies it with Stripe, reads
//      the address off the customer, mints a Firebase custom token, and she is
//      in before the success page finishes painting. Requires
//      FIREBASE_SERVICE_ACCOUNT on the Worker; see that file's header.
//   2. GOOGLE OR APPLE, on every sign-in surface. lib/authProviders.js.
//
// THE SWITCH ONLY THE OWNER CAN THROW, and it is not in this repo:
//
//   FIREBASE_SERVICE_ACCOUNT, on Cloudflare Pages > Settings > Environment
//     variables. REQUIRED for path 1. There is no way around it: minting a
//     Firebase session means signing a JWT with the project's private key.
//     Without it a member who has just paid is asked to continue with Google or
//     Apple on the address she paid with, which is one tap rather than none.
//
// WHY THE FIREBASE IMPORTS ARE ALL DYNAMIC. This module is imported by funnel
// screens, and the funnel is where every paid ad click lands. A static
// `import "firebase/auth"` here would put the whole Firebase SDK into the
// landing page's bundle for the 99% of visitors who never sign in. Loaded this
// way it costs nothing until a member actually asks to be let in.

const LOGIN_EMAIL_KEY = "pelvi.login.email";
const PAID_INTENT_KEY = "pelvi.paid.intent";

// WHERE `linkSignInLikelyOff` WENT, so nobody puts it back by reflex.
//
// This file used to remember, per browser, that a send had been refused with
// OPERATION_NOT_ALLOWED, and the member gate read that flag to decide WHICH
// DOOR TO OFFER FIRST: normally the email field, and Google first once the link
// had been seen to fail. There is no such question left to answer. No screen
// offers a send at all, so nothing anywhere depends on whether the last one
// worked.
//
// The equivalent mechanism for Apple lives in lib/authProviders.js, where it
// still earns its keep: there it decides whether a button exists at all, which
// is a real question, because Apple genuinely is not configured yet.

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
    // Private browsing. The sign-in falls back to Google or Apple.
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
 *   { ok: true,  mode: "instant", email }   she is signed in, nothing to do
 *   { ok: false, code, email }              it did not happen by itself; the
 *                                           screen asks her to continue with
 *                                           Google or Apple on that address
 *
 * THERE IS NO "link" MODE ANY MORE. The Worker still answers mode "email_link"
 * when it has no service account to mint a token with, and this function used
 * to honour that by quietly sending her a sign-in link and reporting "check
 * your email". That was the single worst instance of the bug this whole change
 * is about: a woman had just been charged, and the last thing the product told
 * her was to wait for a message that Gmail had already binned. Now the same
 * answer resolves to `needs_provider`, and /welcome asks her for one tap on the
 * address she paid with instead of a wait with no end.
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
      // The token was good but the exchange failed. She has paid, so she is
      // never left with nothing: the address Stripe gave us is handed back with
      // the failure, and the screen puts Google and Apple in front of her with
      // that address named, so the one tap she makes lands on the same account.
      if (data.email) return { ok: false, code: "needs_provider", email: data.email };
      return { ok: false, code: error?.code || "signin_failed", email: "" };
    }
  }

  // No service account on the Worker, or the mint was refused. Nothing to send
  // and nothing to wait for — one tap on a provider, on the address she paid
  // with, is the whole of what is left.
  if (data.mode === "email_link" && data.email) {
    return { ok: false, code: "needs_provider", email: data.email };
  }

  return { ok: false, code: "unsupported" };
}

// --- The link in her inbox: still redeemed, no longer sent ------------------

/**
 * Email her a one-tap sign-in link.
 *
 * NOTHING IN THE INTERFACE CALLS THIS, and that is deliberate rather than an
 * oversight — see the top of this file. It is kept, exported and working so
 * that the day the sending domain is verified, putting the door back is a
 * screen change and not an archaeology exercise. Do not delete it, and do not
 * wire it to a button before the three conditions in the header are all true.
 *
 * Resolves to { ok: true } or { ok: false, code }. The codes worth knowing:
 *   auth/operation-not-allowed  email link sign-in is switched off in the
 *                               Firebase console. Nothing in this repo can turn
 *                               it on.
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
    return { ok: true };
  } catch (error) {
    return { ok: false, code: error?.code || "send_failed" };
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
 * here buys her the sentence "you already have a plan" and a pair of provider
 * buttons; the provider is what proves she owns the address.
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
 * Copy for a sign-in that did not finish. One place, so five screens cannot
 * each invent their own wording for the same failure.
 *
 * EVERY SENTENCE HERE NOW ENDS AT GOOGLE OR APPLE. Not one of them offers to
 * send anything, promises anything to an inbox, or tells her to wait: the only
 * caller left is a link being REDEEMED, or a payment that could not be turned
 * into a session by itself, and in both cases the thing that will actually work
 * is the pair of buttons already on the screen with this message.
 *
 * The one instruction repeated across them is to use the SAME ADDRESS she
 * joined or paid with. Firebase is one account per address, so a member who
 * signs in with a different Google account gets a clean new account and an
 * empty plan, and the only visible symptom is her history apparently gone.
 *
 * Nothing here says "below" or "above": the same sentence is shown in a bottom
 * sheet on the paywall, on a full screen in the funnel and inside the member
 * gate, and the buttons sit somewhere different on each of them.
 */
export function loginErrorMessage(code) {
  // The Worker had no service account to mint a session with, or the mint was
  // refused. She has PAID. Nothing is wrong with her money and nothing is wrong
  // with her; this sentence must not sound like either.
  if (code === "needs_provider") {
    return "Your payment went through. Continue with Google or Apple using the same email address you paid with, and your plan opens straight away.";
  }
  if (code === "auth/expired-action-code" || code === "auth/invalid-action-code") {
    return "That link has already been used or has expired. Continue with Google or Apple instead, using the same email address you joined with.";
  }
  if (code === "auth/invalid-email") {
    return "That does not look like a complete email address.";
  }
  if (code === "auth/too-many-requests") {
    return "That is a lot of attempts in a short time. Please wait a few minutes and try again.";
  }
  // The email-link provider is switched off in the Firebase console, so an old
  // link can no longer be redeemed either. No code in this repo can turn it on.
  if (code === "auth/operation-not-allowed" || code === "auth/unauthorized-continue-uri") {
    return "That link cannot be opened any more. Continue with Google or Apple using the same email address you joined with, or email hello@pelvi.health and we will let you in by hand.";
  }
  return "We could not finish signing you in. Continue with Google or Apple using the same email address you joined with, or email hello@pelvi.health.";
}
