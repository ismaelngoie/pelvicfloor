"use client";

// THE TWO DOORS: Google and Apple. THERE IS NO THIRD ONE.
//
// Why this file exists at all. Google sign-in used to live inline in
// MemberProvider, which meant only the member gate had it: the paywall's log in
// sheet and the funnel could offer nothing but an email link. That was
// survivable while the link worked. It does not work — the mail leaves from the
// default firebaseapp.com sender and Gmail bins it, invisibly to us — so the
// send has been taken off every screen in the product and these two buttons are
// now the entire sign-in surface. See the header of lib/identity.js for the
// full reasoning and for what has to be true before an email door comes back.
//
// That makes this file load-bearing in a way it was not before: if both buttons
// are ever missing at once, a member has no way into the plan she paid for.
// Hence the rule enforced in components/auth/ProviderButtons.jsx — Google is
// never hidden, whatever this file remembers about Apple.
//
// WHY THE FIREBASE IMPORTS ARE DYNAMIC. Same reason as lib/identity.js: this is
// imported by funnel screens, and the funnel is where every paid ad click
// lands. A static `import "firebase/auth"` would put the whole SDK into the
// landing page bundle for the 99% of visitors who never sign in.

// --- "Apple is not switched on for this project" ----------------------------
//
// Sign in with Apple needs a Services ID, a key and a domain verified in the
// Apple Developer portal before Firebase will accept it, and NONE of that can
// be done from this repo. Until it is done, asking Firebase for apple.com
// answers OPERATION_NOT_ALLOWED, which surfaces here as
// auth/operation-not-allowed.
//
// So the button is offered optimistically, and the first time this browser
// watches it be refused, that is remembered and the button stops being drawn.
// No member is shown a control that cannot work twice.
//
// IT EXPIRES, AND THAT IS THE WHOLE POINT OF THE TIMESTAMP rather than a bare
// flag. Turning Apple on is a form in the Firebase console, and the day it is
// filled in this has to heal on its own — the button must come back with no
// code change and no deploy. Twelve hours is the same TTL lib/identity.js uses
// for the email-link switch, for the same reason: long enough that a member is
// not shown a broken button all afternoon, short enough that "I turned it on
// this morning" is true by the evening. A browser that has never seen the
// failure shows the button immediately.
const APPLE_OFF_KEY = "pelvi.apple.off";
const APPLE_OFF_TTL_MS = 12 * 60 * 60 * 1000;

// The display name Apple hands over ONCE and never again. See captureAppleName.
const APPLE_NAME_KEY = "pelvi.apple.name";

/** Codes that mean "this project cannot do Apple yet", not "this attempt failed". */
const APPLE_OFF_CODES = new Set([
  "auth/operation-not-allowed",
  // The Services ID or the key in the Firebase console does not match what
  // Apple has. It is the same class of problem — nothing a member can fix by
  // pressing the button again — and it looks identical to her.
  "auth/invalid-credential",
]);

function noteAppleAvailability(code) {
  if (typeof window === "undefined") return;
  try {
    if (APPLE_OFF_CODES.has(code)) {
      window.localStorage.setItem(APPLE_OFF_KEY, String(Date.now()));
    } else if (!code) {
      // It worked. Forget any older "no" immediately rather than waiting out
      // the TTL, so a member who signs in on the same browser twice is not
      // shown the button, then not shown it, then shown it again.
      window.localStorage.removeItem(APPLE_OFF_KEY);
    }
  } catch {
    // Storage off. Every surface simply finds out for itself, once, as before.
  }
}

/**
 * Should a screen draw the Apple button?
 *
 * False means the last attempt from this browser was refused by the project
 * itself. Never used to hide a working path: a stale "no" ages out.
 *
 * MUST be read after mount, never during render — this site is a static export
 * and there is no localStorage on the build machine.
 */
export function appleSignInLikelyOff() {
  if (typeof window === "undefined") return false;
  try {
    const at = Number(window.localStorage.getItem(APPLE_OFF_KEY) || 0);
    if (!at) return false;
    if (Date.now() - at > APPLE_OFF_TTL_MS) {
      window.localStorage.removeItem(APPLE_OFF_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// --- The name Apple gives you exactly once ----------------------------------
//
// APPLE RETURNS THE DISPLAY NAME ON THE VERY FIRST AUTHORISATION AND NEVER
// AGAIN. Not on the second sign-in, not after a reinstall, not after signing
// out and back in. The only way to see it a second time is for the member to
// go into Settings > her Apple Account > Sign in with Apple, find Pelvi, and
// stop using it — which resets the authorisation. Nobody does that.
//
// Google hands the name back on every sign-in, so `user.displayName` is always
// populated and no product ever had to think about this. With Apple, if the
// name is not captured in the seconds after that first popup closes, the
// member is "" for the life of the account and every screen that greets her by
// name greets nobody.
//
// It is also not in the same place as Google's. Firebase does not copy Apple's
// name onto the user profile for you: it arrives on the credential exchange,
// which is why all three sources below are read.
//
// It is stashed in localStorage rather than pushed straight at Firestore
// because sign-in and the member record are not always the same document. She
// can sign in from the paywall's log in sheet, on pelvi.health, and only reach
// /app — where MemberProvider owns her record — a page load later. localStorage
// survives that; a variable does not.

export function stashAppleName(name) {
  const clean = (name || "").trim();
  if (!clean || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(APPLE_NAME_KEY, clean);
  } catch {
    /* Her name is a nicety. Never fail a sign-in over it. */
  }
}

/** The stashed name without consuming it. */
export function peekAppleName() {
  if (typeof window === "undefined") return "";
  try {
    return (window.localStorage.getItem(APPLE_NAME_KEY) || "").trim();
  } catch {
    return "";
  }
}

/** Called once the name is safely on her record. */
export function forgetAppleName() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(APPLE_NAME_KEY);
  } catch {
    /* see stashAppleName */
  }
}

/**
 * Pull the name out of a completed Apple sign-in, from wherever it landed.
 *
 * Safe to call with any result, from any provider, including null: it answers
 * "" for everything that is not a first Apple authorisation, which is the
 * overwhelmingly common case.
 */
export async function captureProviderName(result) {
  if (!result?.user) return "";
  const providerId =
    result.user.providerData?.[0]?.providerId || result.providerId || "";
  // Google, and every later Apple sign-in, already have a displayName or never
  // will. Only the first Apple authorisation has anything to rescue.
  if (!String(providerId).includes("apple")) return "";

  let name = "";
  try {
    const { getAdditionalUserInfo } = await import("firebase/auth");
    const profile = getAdditionalUserInfo(result)?.profile || {};
    // Apple's shape is { name: { firstName, lastName } }; some SDK versions
    // flatten it. Read both rather than guess.
    const raw = profile.name;
    if (typeof raw === "string") name = raw;
    else if (raw && typeof raw === "object") {
      name = [raw.firstName, raw.lastName].filter(Boolean).join(" ");
    }
    if (!name) name = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  } catch {
    /* fall through to the two sources below */
  }

  // The raw token exchange. Private, undocumented and the only place the name
  // appears on some SDK versions, so it is read defensively and never trusted
  // to exist.
  if (!name) {
    try {
      const token = result._tokenResponse || {};
      name = [token.firstName, token.lastName].filter(Boolean).join(" ");
    } catch {
      /* nothing there */
    }
  }

  if (!name) name = (result.user.displayName || "").trim();

  name = name.trim();
  if (!name) return ""; // Second and every later sign-in. Expected, not a fault.

  stashAppleName(name);

  // Put it on the Firebase profile too, so `user.displayName` is populated for
  // anything that reads it directly and the name survives even if the
  // localStorage copy is thrown away before her record is written.
  try {
    if (!result.user.displayName) {
      const { updateProfile } = await import("firebase/auth");
      await updateProfile(result.user, { displayName: name });
    }
  } catch {
    // The stash above is the one that matters. Never fail a sign-in over a
    // profile write.
  }

  return name;
}

// --- Signing in --------------------------------------------------------------

/**
 * Sign in with "google" or "apple".
 *
 * Resolves to one of:
 *   { ok: true, user }          she is in; onAuthStateChanged takes it from here
 *   { ok: false, cancelled }    she closed the window. Not an error.
 *   { ok: false, redirecting }  the popup was blocked, so this document is
 *                               being replaced. Render nothing new.
 *   { ok: false, code }         it failed. Pass the code to providerErrorMessage.
 *
 * Never throws.
 */
export async function signInWithProvider(kind) {
  if (typeof window === "undefined") return { ok: false, code: "no_window" };

  let fb = null;
  let authInstance = null;
  try {
    const [firebase, sdk] = await Promise.all([
      import("./firebase"),
      import("firebase/auth"),
    ]);
    if (!firebase.isFirebaseConfigured()) return { ok: false, code: "not_configured" };
    fb = sdk;
    authInstance = firebase.auth();
  } catch {
    return { ok: false, code: "not_configured" };
  }

  const provider = buildProvider(fb, kind);

  try {
    const result = await fb.signInWithPopup(authInstance, provider);
    if (kind === "apple") {
      noteAppleAvailability("");
      await captureProviderName(result);
    }
    return { ok: true, user: result.user };
  } catch (error) {
    const code = error?.code || "signin_failed";

    // She changed her mind, or a second popup superseded the first. Neither is
    // worth a red box.
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      return { ok: false, cancelled: true, code };
    }

    // Popups are blocked, or this is a webview that cannot open one at all —
    // which is exactly what an in-app browser from an Instagram or Facebook ad
    // is, and that is a large slice of this product's traffic. Full-page
    // redirect instead. The document is about to go away; the sign-in finishes
    // on the way back in, in getRedirectResult.
    if (
      code === "auth/popup-blocked" ||
      code === "auth/operation-not-supported-in-this-environment"
    ) {
      try {
        await fb.signInWithRedirect(authInstance, provider);
        return { ok: false, redirecting: true, code };
      } catch (redirectError) {
        const redirectCode = redirectError?.code || "signin_failed";
        if (kind === "apple") noteAppleAvailability(redirectCode);
        return { ok: false, code: redirectCode };
      }
    }

    if (kind === "apple") noteAppleAvailability(code);
    return { ok: false, code };
  }
}

function buildProvider(fb, kind) {
  if (kind === "apple") {
    const provider = new fb.OAuthProvider("apple.com");
    // BOTH SCOPES ARE REQUIRED, and the name one is the reason this file has a
    // hundred lines about names. Without `name`, Apple sends no name even on
    // the first authorisation, and there is no second chance to ask.
    provider.addScope("email");
    provider.addScope("name");
    return provider;
  }
  const provider = new fb.GoogleAuthProvider();
  // A shared laptop is normal in this product's audience. Without this Google
  // silently reuses whichever account is already signed in to the browser.
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

/**
 * Copy for a failed provider sign-in. One place, so four screens cannot invent
 * four wordings for the same failure.
 *
 * Nothing here says "above" or "below": the same sentence appears in a bottom
 * sheet on the paywall, on a full screen in the member gate and inside a dialog
 * on /welcome, and the other way in sits somewhere different on each.
 */
export function providerErrorMessage(code, kind = "") {
  const vendor = kind === "apple" ? "Apple" : kind === "google" ? "Google" : "that account";

  if (code === "auth/operation-not-allowed" || code === "auth/invalid-credential") {
    // Apple is the only one of the two this can honestly happen to, and Google
    // is the door that is open. It must not say "or your email address": there
    // is no email door any more, and pointing at one is how a member ends up
    // waiting for a message nobody is sending. See the top of lib/identity.js.
    return kind === "apple"
      ? "Sign in with Apple is not switched on for this site yet. Use the Google button instead."
      : "That way in is not switched on for this site. Email hello@pelvi.health and we will let you in by hand.";
  }
  if (code === "auth/account-exists-with-different-credential") {
    // Firebase is set to one account per email address. She has an account on
    // this address already; it was just made with the other button.
    return "You already have an account on that email address, made with a different button. Try the other one.";
  }
  if (code === "auth/unauthorized-domain") {
    return "This web address is not approved for sign-in yet. Email hello@pelvi.health and we will let you in by hand.";
  }
  if (code === "auth/network-request-failed") {
    return "We could not reach the sign-in service. Check your connection and try again.";
  }
  if (code === "auth/too-many-requests") {
    return "That is a lot of attempts in a short time. Please wait a few minutes and try again.";
  }
  if (code === "auth/user-disabled") {
    return "That account has been closed. Email hello@pelvi.health and we will sort it out.";
  }
  if (code === "not_configured") {
    return "Sign in is switched off on this deployment. Email hello@pelvi.health and we will open your plan by hand.";
  }
  return `We could not sign you in with ${vendor}. Please try again, or use another way in.`;
}
