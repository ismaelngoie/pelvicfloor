// Turning an address this server has already verified into a Firebase session.
//
// WHY THIS EXISTS. Paying is the identity event. By the time Stripe says the
// card cleared we know her email address, we know it is real enough to send a
// receipt to, and she has typed it into our own checkout thirty seconds ago.
// Asking her to then pick a Google account before she can open the thing she
// just bought is a door with no lock in it, and it is where members were being
// lost.
//
// THE ONE RULE. Nothing in this file may ever be called with an address that
// came out of a request body. The caller has to have proved it, and today the
// only proof we accept is "Stripe told us this is the email on a PaymentIntent
// whose client secret the browser could produce". See
// functions/api/session-from-payment.js. An address a browser can choose is a
// claim, not an identity, and minting a session from one would let anybody sign
// in as any member by typing her address.
//
// Everything here needs FIREBASE_SERVICE_ACCOUNT. Without it the caller has to
// fall back to Firebase's email link sign-in, which proves the inbox instead and
// costs her one tap. That fallback lives in the browser, in lib/identity.js.
//
// Nothing here logs a key, a token or an address.

import {
  IDENTITY_SCOPE,
  accessToken,
  b64url,
  encode,
  importPrivateKey,
} from "./stripeSync.js";

const IDENTITY_BASE = "https://identitytoolkit.googleapis.com/v1/projects";

// Fixed by Firebase: a custom token is only accepted when it is addressed to
// this exact audience.
const CUSTOM_TOKEN_AUDIENCE =
  "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";

// An hour is the maximum Firebase allows, but this one is redeemed by the very
// next line of JavaScript that receives it, so it is short on purpose: it is a
// bearer credential for her whole account while it lives.
const CUSTOM_TOKEN_TTL_S = 5 * 60;

/**
 * A token for the Identity Toolkit specifically.
 *
 * Deliberately not the datastore token the entitlement writes use: a service
 * account that can write Firestore documents should not be handed the ability
 * to mint member sessions as a side effect of a shared cache entry.
 */
export function identityToken(account) {
  return accessToken(account, IDENTITY_SCOPE);
}

/**
 * The uid a payer gets when she has no Firebase account yet.
 *
 * Derived from the address so the same woman paying twice, on two devices, in
 * two browsers, is the same account every time. It is a hash rather than the
 * address itself because a uid turns up in logs and in document ids.
 */
export async function uidForEmail(email) {
  const digest = await sha256Hex(`pelvi:payer:${email}`);
  return `pay_${digest.slice(0, 24)}`;
}

/**
 * Which account, if any, already owns this address.
 *
 * Firebase enforces one account per email address by default, so this is
 * normally a list of nought or one. If a project ever has more, the verified one
 * wins, because that is the one whose owner has proved she reads the inbox.
 */
export async function accountForEmail({ projectId, token, email }) {
  const data = await identityRequest({
    projectId,
    token,
    path: "accounts:lookup",
    body: { email: [email] },
  });
  const users = Array.isArray(data.users) ? data.users : [];
  if (users.length === 0) return null;
  return users.find((user) => user.emailVerified === true) || users[0];
}

/**
 * The uid this payer should be signed in as, or why she cannot be.
 *
 * Resolves to { uid } or { blocked: reason }.
 *
 * THE RULE, AND IT IS THE MOST IMPORTANT THING IN THIS FILE:
 *
 *   A payment buys a session ONLY for an address that has no history with us.
 *
 * Read the attack it stops, because the rule looks over-cautious until you do.
 * Paying does not prove you own the address you typed into the checkout, it
 * only proves you own the CARD. So somebody could pay us $24.99 with a member's
 * address, and if that minted a session we would hand them her account: her
 * check-ins, her symptom history and her Coach Mia transcripts, which is special
 * category health data under GDPR Article 9. Twenty five dollars is not a
 * meaningful obstacle to somebody who wants one specific woman's records.
 *
 * Three things make the rule cheap in practice:
 *
 *   1. It costs the common case nothing. A woman paying for the first time has
 *      no account and no record by definition, so there is nothing to expose and
 *      she gets the zero click path, which is the whole point of the feature.
 *   2. Anybody with a history gets the email link instead: one tap, and it
 *      proves the inbox rather than the card.
 *   3. /api/create-payment-intent already refuses to sell to an address with a
 *      live subscription, so the only addresses that can reach this code at all
 *      are new ones, cancelled ones, and App Store members who have no Stripe
 *      subscription. That last group is exactly who this rule protects: an
 *      iPhone member has a full Firestore record and often no Firebase account
 *      at all, so `hasHistory` below is the only thing standing in front of it.
 *
 * @param {Function} [hasHistory] async (email) => boolean. Whether a member
 *   record already exists for this address. Optional: when it is not supplied,
 *   or when it throws, we assume there IS history and fall back to the link.
 *   Failing safe here is not paranoia, it is the difference between a member
 *   tapping once and a stranger reading her medical history.
 */
export async function payerUid({ projectId, token, email, name = "", hasHistory }) {
  const ownUid = await uidForEmail(email);
  const existing = await accountForEmail({ projectId, token, email });

  if (existing?.localId) {
    // An account we minted ourselves, on this path, for this same address. She
    // has reloaded the success page, or paid again after cancelling. Re-minting
    // is not a new grant: whoever paid was handed this exact session already.
    if (existing.localId === ownUid) return { uid: ownUid, created: false };
    // Anything else is somebody's real account, Google or otherwise. A card is
    // not permission to open it.
    return { blocked: "existing_account" };
  }

  if (typeof hasHistory !== "function") return { blocked: "no_history_check" };
  try {
    if (await hasHistory(email)) return { blocked: "existing_record" };
  } catch {
    return { blocked: "history_check_failed" };
  }

  const uid = ownUid;
  try {
    await identityRequest({
      projectId,
      token,
      path: "accounts",
      body: {
        localId: uid,
        email,
        // Stripe holds this address as the customer on a payment we verified,
        // the receipt is going to it, and the checks above have established that
        // nobody else has ever claimed it. On this path, and only on this path,
        // that is what "verified" means. It is never set on an account we did
        // not create in this call.
        emailVerified: true,
        ...(name ? { displayName: name.slice(0, 120) } : {}),
      },
    });
    return { uid, created: true };
  } catch (error) {
    // Two tabs confirmed the same payment at once, so the account already
    // exists. Read it back rather than fail somebody who has just paid, but only
    // accept OUR uid: if the address has landed on a different account in the
    // last few milliseconds, the rule at the top of this function applies to it
    // exactly as it would have a moment earlier.
    const retry = await accountForEmail({ projectId, token, email });
    if (retry?.localId === uid) return { uid, created: false };
    if (retry?.localId) return { blocked: "existing_account" };
    throw error;
  }
}

/**
 * A Firebase custom token: a short lived JWT, signed with the service account's
 * own private key, that the browser exchanges for a real session through
 * signInWithCustomToken. No IAM role and no extra Google call is needed, because
 * the signing happens here.
 */
export async function mintCustomToken(account, uid) {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: account.client_email,
    sub: account.client_email,
    aud: CUSTOM_TOKEN_AUDIENCE,
    iat: now,
    exp: now + CUSTOM_TOKEN_TTL_S,
    uid,
  };

  const unsigned = `${b64url(encode(JSON.stringify({ alg: "RS256", typ: "JWT" })))}.${b64url(
    encode(JSON.stringify(claim))
  )}`;
  const key = await importPrivateKey(account.private_key);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encode(unsigned));
  return `${unsigned}.${b64url(new Uint8Array(signature))}`;
}

// --- Internals --------------------------------------------------------------

async function identityRequest({ projectId, token, path, body }) {
  const res = await fetch(`${IDENTITY_BASE}/${encodeURIComponent(projectId)}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(`identitytoolkit ${path} failed: ${res.status}`);
    error.status = res.status;
    // Google's message names the check that failed (EMAIL_EXISTS,
    // DUPLICATE_LOCAL_ID, PERMISSION_DENIED) and never quotes a secret back, so
    // it is safe to keep for the log. It is not returned to the browser.
    error.reason = typeof data?.error?.message === "string" ? data.error.message : "";
    throw error;
  }
  return data || {};
}

async function sha256Hex(input) {
  const digest = await crypto.subtle.digest("SHA-256", encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
