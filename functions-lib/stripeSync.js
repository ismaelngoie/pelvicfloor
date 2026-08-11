// Everything the money endpoints share.
//
// This file is deliberately outside functions/ so Cloudflare Pages never turns
// it into a route. It exports no onRequest handler and it must not gain one.
//
// Three jobs:
//   1. Verify a Firebase ID token, so an endpoint can know WHICH member is
//      asking instead of believing an email address typed into a request body.
//      This needs NO service account: Google publishes the signing keys.
//   2. Turn a Stripe subscription into the `entitlement` record support reads,
//      and work out which users/{id} document it belongs to.
//   3. Talk to Firestore over REST with a Google service account, because
//      Workers cannot run the Firebase Admin SDK.
//
// Only job 1 is on the path that decides access. "Has she paid" is now answered
// by asking Stripe live, in functions/api/entitlement.js, so jobs 2 and 3 are
// bookkeeping for /admin and for support — see the note over entitlementFrom.
//
// Nothing here logs a key, a token or a client secret.

// The Firebase project both halves of the product live in, and therefore the
// audience every member's ID token carries. Written in rather than left to an
// environment variable, for the same reason lib/firebase.js writes the web
// config in: a project id is not a secret, it only names the project, and a
// deployment missing it could not verify a single member. An env var still wins
// so a staging project can override without a code change.
export const FIREBASE_PROJECT_ID = "pelvic-floor-exercise-908ed";

/**
 * The project to verify ID tokens against.
 *
 * Deliberately separate from projectIdFrom() below, which answers "which
 * Firestore database may this service account write to". Verification must not
 * depend on a service account existing at all.
 */
export function firebaseProjectId(env) {
  const configured = typeof env?.FIREBASE_PROJECT_ID === "string" ? env.FIREBASE_PROJECT_ID.trim() : "";
  return configured || FIREBASE_PROJECT_ID;
}

// --- Entitlement shaping ----------------------------------------------------

// `active` is true for active, trialing and past_due. past_due is inside the
// grace window while Stripe retries the card; locking her out on the first
// failed retry would punish a member for an expired card.
export const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

// What "she has already bought this" means when we are deciding whether to sell
// again or to hand her back access. Wider than ACTIVE_STATUSES on purpose:
// `unpaid` is a subscription Stripe has given up collecting on but has not
// cancelled, and selling her a second one would charge her twice.
export const OWNED_STATUSES = new Set(["active", "trialing", "past_due", "unpaid"]);

/**
 * The `entitlement` record we store on users/{id}.
 *
 * It is no longer the gate. Access is decided by asking Stripe live
 * (functions/api/entitlement.js), because Stripe already knows who is paying
 * and mirroring its answers into Firestore only created a second copy that
 * could drift. What this object is still good for is /admin: it is the only
 * place the dashboard can read a subscription id, a period end and a raw Stripe
 * status without a Stripe call per row.
 *
 * AND IT IS THE ONLY THING THE IPHONE APP CAN READ. Read this before deciding
 * the object is bookkeeping and deleting it.
 *
 * The shipped iOS app (Core/Account/WebEntitlement.swift, grants()) opens the
 * door for a web buyer by reading THIS object off users/{id}. It cannot ask
 * /api/entitlement instead: that endpoint requires an Origin or a Referer
 * header, and a native URLSession request sends neither, so every call from a
 * phone is refused with 403 bad_origin before the token is even looked at. The
 * app is on the App Store and cannot be changed. So for a woman who buys at
 * pelvi.health and then installs the app, this mirrored object is not a
 * convenience — it is the whole of her access.
 *
 * That is why it is now written at three moments rather than one:
 *
 *   1. functions/api/session-from-payment.js, the instant a payment clears.
 *      This is the one that matters: it is the only write on the path a normal
 *      web buyer actually takes.
 *   2. functions/api/entitlement.js, every time the member app asks Stripe.
 *      Keeps the mirror fresh, and back-fills every member who bought before
 *      any of this was written.
 *   3. functions/api/restore-purchase.js, the recovery screen's button.
 *
 * A stale mirror is safe in the direction that matters. The web never trusts
 * it (it asks Stripe live), and the phone only ever GRANTS from it, so the
 * worst a stale-active copy can do is keep a lapsed member in for a while. The
 * failure it replaces was a paying member locked out.
 */
export function entitlementFrom(subscription) {
  const item = subscription.items?.data?.[0];
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id || null;

  return {
    active: ACTIVE_STATUSES.has(subscription.status),
    source: "stripe",
    priceId: item?.price?.id || null,
    currentPeriodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    subscriptionId: subscription.id,
    status: subscription.status,
    stripeCustomerId: customerId,
    updatedAt: new Date().toISOString(),
  };
}

// identityFrom() lived here and read the member out of a webhook's subscription
// payload. There is no webhook any more, and /api/restore-purchase builds its
// identity from a VERIFIED token instead of from Stripe metadata, so it went
// with the webhook rather than sitting here as the next person's trap.

/**
 * Which users/{id} document is hers, and does it exist yet?
 *
 * memberId first, because checkout resolved it and it is already the document
 * the iOS app writes to. Then the verified email, which is the join key between
 * the phone and the web. The Firebase uid is last: a web-only member has a
 * document keyed by it, but an iOS member does not.
 *
 * `exists` is not a detail. It is the difference between STAMPING a record
 * somebody else owns and CREATING one, and only the second may write profile
 * fields — see the seed handling in recordEntitlement. Writing `platform: "web"`
 * or a fresh `joinDate` over an iPhone member's record would rewrite her history
 * to say she joined the day she bought something.
 */
export async function resolveMemberTarget({ projectId, token, identity }) {
  if (identity.memberId && (await documentExists({ projectId, token, docId: identity.memberId }))) {
    return { docId: identity.memberId, exists: true };
  }
  if (identity.email) {
    const byEmail = await findUserIdByEmail({ projectId, token, email: identity.email });
    if (byEmail) return { docId: byEmail, exists: true };
  }
  if (identity.uid && (await documentExists({ projectId, token, docId: identity.uid }))) {
    return { docId: identity.uid, exists: true };
  }
  // A signed-in member always has a document under her uid, so if we hold a uid
  // and nothing exists yet, creating it there is correct rather than orphaning.
  return { docId: identity.uid || null, exists: false };
}

/** The document id alone, for callers that do not care whether it exists yet. */
export async function resolveMemberDoc({ projectId, token, identity }) {
  const { docId } = await resolveMemberTarget({ projectId, token, identity });
  return docId;
}

/**
 * Write the entitlement where it belongs, or park it where support can find it.
 * Returns the document id it landed on, or null when it was parked.
 *
 * TWO THINGS ARE WRITTEN BESIDE THE ENTITLEMENT, and both are load-bearing.
 *
 * `emailLower` ALWAYS, whenever we hold an address. It is the field the iPhone
 * app never writes, so stamping it can never fight the app, and it is the only
 * spelling of her address that always matches: findUserIdByEmail here, the
 * `emailLower` query in lib/memberStore.js, MemberAccountLink.findMemberByEmail
 * on the phone, and the `emailLower == callerEmail()` arm of ownsRecord() in
 * firestore.rules all depend on it. An entitlement written onto a record that
 * cannot then be found by address is an entitlement nobody ever reads.
 *
 * `seed` ONLY WHEN WE ARE CREATING THE DOCUMENT. A brand new web buyer has no
 * users/{id} at all at the moment she pays — nothing has signed her in yet —
 * so this call is what brings the record into being, and a record holding an
 * entitlement and nothing else is a mystery row in /admin with no address, no
 * join date and no program day. Never applied to a record that already exists,
 * because that record may be the one her phone owns.
 *
 * @param {object|null} [seed] plain profile fields for a document being created.
 */
export async function recordEntitlement({ projectId, token, entitlement, identity, seed = null }) {
  const { docId, exists } = await resolveMemberTarget({ projectId, token, identity });

  if (docId) {
    const fields = { entitlement: mapValue(entitlement) };
    const updateMask = ["entitlement"];

    const lower = (identity.email || "").trim().toLowerCase();
    if (lower) {
      fields.emailLower = { stringValue: lower };
      updateMask.push("emailLower");
    }

    if (!exists && seed) {
      for (const [key, value] of Object.entries(seed)) {
        // Never let a seed field shadow what this function is actually for, and
        // never write a blank over a field the member will fill in herself.
        if (key === "entitlement" || key === "emailLower") continue;
        if (value === null || value === undefined || value === "") continue;
        fields[key] = typedValue(value);
        updateMask.push(key);
      }
    }

    await patchDocument({
      projectId,
      token,
      path: `users/${encodeURIComponent(docId)}`,
      fields,
      updateMask,
    });
    return docId;
  }

  // Nobody to attach this to. Park it where support can find it instead of
  // dropping a paid subscription on the floor.
  await patchDocument({
    projectId,
    token,
    path: `stripeOrphans/${encodeURIComponent(entitlement.subscriptionId)}`,
    fields: {
      entitlement: mapValue(entitlement),
      email: stringOrNull(identity.email),
      firebaseUID: stringOrNull(identity.uid),
      memberId: stringOrNull(identity.memberId),
      noticedAt: { timestampValue: new Date().toISOString() },
    },
    updateMask: ["entitlement", "email", "firebaseUID", "memberId", "noticedAt"],
  });
  return null;
}

// --- Firestore over REST ----------------------------------------------------

export function projectIdFrom(env, account) {
  const id = env.FIREBASE_PROJECT_ID || account?.project_id;
  if (!id) throw new Error("No Firebase project id.");
  return id;
}

function documentsUrl(projectId, suffix = "") {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents${suffix}`;
}

export async function documentExists({ projectId, token, docId }) {
  const res = await fetch(documentsUrl(projectId, `/users/${encodeURIComponent(docId)}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`Firestore get failed: ${res.status}`);
  return true;
}

/**
 * The users/{id} whose `email` matches, case insensitively.
 *
 * The iPhone app stores the address exactly as she typed it (CloudSync
 * captureEmail does not lower case it), so an equality filter on `email` alone
 * silently misses "Jane@Gmail.com" and parks a paid subscription as an orphan.
 * The web stamps a lower cased `emailLower` the first time she signs in, which
 * is the spelling asked for first.
 *
 * Results are sorted by document name here so two records carrying the same
 * address always resolve to the SAME one. Picking a different twin on different
 * deliveries is how an entitlement lands on the record she is not using, and
 * she ends up paying and locked out. Sorting happens in JavaScript rather than
 * in the query because an ordered IN query can need a composite index nobody
 * has created, and a 400 from Firestore here would fail a webhook that is
 * holding somebody's access.
 */
export async function findUserIdByEmail({ projectId, token, email }) {
  const lower = (email || "").trim().toLowerCase();
  if (!lower) return null;

  // `emailLower` first. lib/memberStore.js stamps it the moment she signs in on
  // the web, and the iPhone app never writes it, so it is the one spelling of
  // her address that cannot drift back to whatever she typed on her phone.
  const byLower = await queryUsers({ projectId, token, field: "emailLower", values: [lower] });
  if (byLower) return byLower;

  return queryUsers({ projectId, token, field: "email", values: [lower] });
}

async function queryUsers({ projectId, token, field, values }) {
  const res = await fetch(documentsUrl(projectId, ":runQuery"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "users" }],
        where: {
          fieldFilter: {
            field: { fieldPath: field },
            op: "IN",
            value: { arrayValue: { values: values.map((v) => ({ stringValue: v })) } },
          },
        },
        limit: 10,
      },
    }),
  });
  if (!res.ok) throw new Error(`Firestore query failed: ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows)) return null;

  const docs = rows.map((row) => row.document).filter((doc) => doc?.name);
  if (docs.length === 0) return null;
  docs.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  // When two records share an address, prefer the one the phone owns: it holds
  // the 90 day history and the guarantee clock. `platform` is only written by
  // the app. Otherwise the first by document name, which never changes.
  const chosen = docs.find((doc) => doc.fields?.platform?.stringValue === "ios") || docs[0];
  return chosen.name.split("/").pop();
}

export async function patchDocument({ projectId, token, path, fields, updateMask }) {
  const params = updateMask
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join("&");
  const res = await fetch(documentsUrl(projectId, `/${path}?${params}`), {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Firestore patch failed: ${res.status}`);
}

/** Firestore's typed JSON. Anything not modelled here is written as a string. */
export function mapValue(object) {
  const fields = {};
  for (const [key, value] of Object.entries(object)) {
    fields[key] = typedValue(value);
  }
  return { mapValue: { fields } };
}

/**
 * ISO-8601 STRINGS ARE WRITTEN AS STRINGS, and that is the fix, not an
 * oversight. Read this before "improving" it into a timestamp.
 *
 * This function used to promote anything matching an ISO-8601 shape to a
 * Firestore `timestampValue`. It looked tidy and it broke the only reader the
 * field has. The entitlement object's `currentPeriodEnd` is consumed in exactly
 * one place in this product — the iPhone app, Core/Account/WebEntitlement.swift:
 *
 *     if let end = ent["currentPeriodEnd"] as? String, let date = iso8601(end),
 *        date > Date() { return true }
 *
 * A Firestore timestamp arrives in the iOS SDK as a `Timestamp`, so `as? String`
 * is nil and that whole branch — the one that keeps a member in on a plan whose
 * `active` flag was written by an older client — silently never fires. Nothing
 * on the web reads the field at all: lib/adminMetrics.js deliberately ignores
 * the entitlement object, and lib/memberEntitlement.js asks Stripe instead.
 *
 * The same rule is what the seeded profile fields need. lib/memberStore.js
 * writes `joinDate` as a plain ISO string from the browser SDK, and
 * lib/adminMetrics.js reads it back as one, so a record seeded by a Worker has
 * to be indistinguishable from a record the web app created itself. One
 * function, one rule, nothing to pick wrongly between.
 */
export function typedValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  return { stringValue: String(value) };
}

export function stringOrNull(value) {
  return value ? { stringValue: value } : { nullValue: null };
}

// --- Google service-account auth -------------------------------------------

// What a token is allowed to do. Firestore writes need one scope and the
// Identity Toolkit (creating an account, minting a session for a member who has
// just paid) needs another, so the scope is a parameter and the cache is keyed
// by it. Asking for both at once would hand every Firestore write the power to
// mint sessions.
export const DATASTORE_SCOPE = "https://www.googleapis.com/auth/datastore";
export const IDENTITY_SCOPE = "https://www.googleapis.com/auth/identitytoolkit";

const cachedTokens = new Map(); // scope -> { value, expiresAt }

export function parseServiceAccount(raw) {
  const account = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!account?.client_email || !account?.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is missing client_email or private_key.");
  }
  return account;
}

export async function accessToken(account, scope = DATASTORE_SCOPE) {
  const now = Math.floor(Date.now() / 1000);
  const cachedToken = cachedTokens.get(scope);
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value;

  const claim = {
    iss: account.client_email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const unsigned = `${b64url(encode(JSON.stringify({ alg: "RS256", typ: "JWT" })))}.${b64url(
    encode(JSON.stringify(claim))
  )}`;

  const key = await importPrivateKey(account.private_key);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encode(unsigned));
  const assertion = `${unsigned}.${b64url(new Uint8Array(signature))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }).toString(),
  });

  if (!res.ok) {
    // The response body can quote the assertion back, so it is not logged.
    throw new Error(`Google token exchange failed: ${res.status}`);
  }

  const body = await res.json();
  if (!body.access_token) throw new Error("Google token exchange returned no token.");

  cachedTokens.set(scope, {
    value: body.access_token,
    expiresAt: now + (Number(body.expires_in) || 3600),
  });
  return body.access_token;
}

export async function importPrivateKey(pem) {
  // Cloudflare's environment editor sometimes stores the JSON with the newlines
  // already escaped, which leaves literal backslash-n inside the PEM.
  const normalized = pem.includes("\\n") ? pem.replace(/\\n/g, "\n") : pem;
  const base64 = normalized
    .replace(/-----BEGIN [A-Z ]+-----/, "")
    .replace(/-----END [A-Z ]+-----/, "")
    .replace(/\s+/g, "");
  const bytes = base64ToBytes(base64);

  return crypto.subtle.importKey(
    "pkcs8",
    bytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

// --- Firebase ID tokens -----------------------------------------------------
//
// The only way an endpoint can know which member is asking. An email address in
// a request body proves nothing: before this existed, "open my billing portal"
// and "restore my purchase" both believed whatever address was posted to them,
// so anyone who knew a member's address could open her billing portal and
// cancel her plan.

// Google's public signing certificates for Firebase ID tokens. Public, so this
// costs no service account and no secret: anybody may fetch them, and the only
// thing holding them is that Google's private half signed the token.
const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

// Google rotates these roughly daily and says how long they are good for in the
// Cache-Control header, which is honoured below rather than guessed at. Without
// the cache every verified request would cost a round trip to Google.
const FALLBACK_KEY_TTL_MS = 60 * 60 * 1000;

let cachedKeys = null; // { keys: Map<kid, CryptoKey>, expiresAt }

async function firebaseKeys() {
  const now = Date.now();
  if (cachedKeys && cachedKeys.expiresAt > now) return cachedKeys.keys;

  const res = await fetch(CERTS_URL);
  if (!res.ok) throw new Error(`Firebase key fetch failed: ${res.status}`);
  const body = await res.json();

  const keys = new Map();
  for (const [kid, pem] of Object.entries(body || {})) {
    if (!kid || typeof pem !== "string") continue;
    try {
      keys.set(kid, await importCertificateKey(pem));
    } catch {
      // A certificate we cannot read is a key we will not trust. Skip it: the
      // other three in the response are enough to verify anybody's token.
    }
  }
  if (keys.size === 0) throw new Error("Firebase published no usable signing keys.");

  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get("Cache-Control") || "")?.[1]);
  cachedKeys = {
    keys,
    expiresAt: now + (Number.isFinite(maxAge) && maxAge > 0 ? maxAge * 1000 : FALLBACK_KEY_TTL_MS),
  };
  return keys;
}

/** The verify key inside a PEM encoded X.509 certificate. */
async function importCertificateKey(pem) {
  const der = base64ToBytes(pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, ""));
  return crypto.subtle.importKey(
    "spki",
    publicKeyInfoOf(der),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

/**
 * The SubjectPublicKeyInfo out of a DER encoded X.509 certificate.
 *
 * SubtleCrypto imports an SPKI, not a certificate, and Workers have no X.509
 * parser, so the structure is walked by hand. It is a fixed shape (RFC 5280):
 *
 *   Certificate  ::= SEQUENCE { tbsCertificate, signatureAlgorithm, signature }
 *   TBSCertificate ::= SEQUENCE {
 *     [0] version         OPTIONAL,   <- context tag 0xA0, absent on a v1 cert
 *         serialNumber,
 *         signature, issuer, validity, subject,
 *         subjectPublicKeyInfo        <- the five hops below land here
 *     ... }
 *
 * Verified against all four of Google's live certificates: the bytes this
 * returns are identical to `openssl x509 -pubkey`, and the imported keys match
 * the modulus and exponent Google publishes separately as JWKs.
 */
function publicKeyInfoOf(der) {
  const certificate = readTag(der, 0);
  if (certificate.tag !== 0x30) throw new Error("Not a certificate.");
  const tbs = readTag(der, certificate.start);
  if (tbs.tag !== 0x30) throw new Error("No tbsCertificate.");

  let offset = tbs.start;
  const first = readTag(der, offset);
  if (first.tag === 0xa0) offset = first.end; // explicit [0] version
  // serialNumber, signature, issuer, validity, subject.
  for (let i = 0; i < 5; i += 1) offset = readTag(der, offset).end;

  const spki = readTag(der, offset);
  if (spki.tag !== 0x30) throw new Error("No subjectPublicKeyInfo.");
  return der.subarray(spki.headerStart, spki.end);
}

/** One DER tag-length-value at `offset`. Throws rather than reading past the end. */
function readTag(bytes, offset) {
  if (offset + 2 > bytes.length) throw new Error("Truncated DER.");
  const tag = bytes[offset];
  const first = bytes[offset + 1];
  let length;
  let start;
  if (first < 0x80) {
    length = first;
    start = offset + 2;
  } else {
    const count = first & 0x7f;
    if (count === 0 || count > 4) throw new Error("Unsupported DER length.");
    length = 0;
    for (let i = 0; i < count; i += 1) length = length * 256 + bytes[offset + 2 + i];
    start = offset + 2 + count;
  }
  const end = start + length;
  if (end > bytes.length) throw new Error("DER length overruns the certificate.");
  return { tag, headerStart: offset, start, end };
}

/**
 * Verify a Firebase ID token, and say why when it does not check out.
 *
 * Resolves to { ok: true, uid, email, emailVerified } or { ok: false, reason },
 * where reason is one of:
 *
 *   "missing"      nothing was presented
 *   "malformed"    not a Firebase ID token at all
 *   "invalid"      the signature or the claims did not check out
 *   "expired"      it did check out, but not any more
 *   "unavailable"  Google's key endpoint could not be reached. OUR problem, not
 *                  the caller's, and worth keeping separate: a caller told
 *                  "your token is bad" signs out, a caller told "we are down"
 *                  tries again.
 *
 * Never throws for a bad token.
 */
export async function checkIdToken(idToken, projectId) {
  if (typeof idToken !== "string" || !idToken) return { ok: false, reason: "missing" };
  if (idToken.length < 20 || idToken.length > 8192) return { ok: false, reason: "malformed" };
  if (!projectId) return { ok: false, reason: "unavailable" };

  const parts = idToken.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };

  let header;
  let payload;
  try {
    header = JSON.parse(decode(base64UrlToBytes(parts[0])));
    payload = JSON.parse(decode(base64UrlToBytes(parts[1])));
  } catch {
    return { ok: false, reason: "malformed" };
  }

  // RS256 and nothing else. Accepting the algorithm the token names is how a
  // verifier gets talked into "alg": "none".
  if (header?.alg !== "RS256" || !header?.kid) return { ok: false, reason: "malformed" };

  let keys;
  try {
    keys = await firebaseKeys();
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  const key = keys.get(header.kid);
  if (!key) return { ok: false, reason: "invalid" };

  let signed = false;
  try {
    signed = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64UrlToBytes(parts[2]),
      encode(`${parts[0]}.${parts[1]}`)
    );
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!signed) return { ok: false, reason: "invalid" };

  // Signed by Google is not the same as issued for US. Without the audience and
  // issuer checks, a token minted by any other Firebase project in the world
  // would verify here.
  const now = Math.floor(Date.now() / 1000);
  const skew = 60; // clocks drift; a minute is the usual allowance
  if (payload.aud !== projectId) return { ok: false, reason: "invalid" };
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    return { ok: false, reason: "invalid" };
  }
  if (!payload.sub || typeof payload.sub !== "string") return { ok: false, reason: "invalid" };
  if (!(Number(payload.iat) < now + skew)) return { ok: false, reason: "invalid" };
  if (!(Number(payload.auth_time) < now + skew)) return { ok: false, reason: "invalid" };
  if (!(Number(payload.exp) > now - skew)) return { ok: false, reason: "expired" };

  return {
    ok: true,
    uid: payload.sub,
    email: (payload.email || "").trim().toLowerCase(),
    emailVerified: payload.email_verified === true,
  };
}

/**
 * Who the token belongs to, or null.
 *
 * For callers that only need "this person, or nobody" and have nothing useful
 * to say about the difference between an expired token and a forged one.
 */
export async function verifyIdToken(idToken, projectId) {
  const result = await checkIdToken(idToken, projectId);
  if (!result.ok) return null;
  return { uid: result.uid, email: result.email, emailVerified: result.emailVerified };
}

/** The bearer token on the request, if there is one. */
export function bearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : "";
}

// --- Shared request guards --------------------------------------------------

const DEFAULT_ORIGIN_HOSTS = ["pelvi.health", "www.pelvi.health"];

export function safeHost(value) {
  if (!value) return "";
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Same-site only. Not a security boundary on its own (curl sends any header it
 * likes) but it keeps a browser on another site from driving these endpoints
 * with a member's cookies or a stolen token pasted into a page.
 */
export function originAllowed(request, env) {
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

// Per IP, per isolate. Cloudflare gives each colo its own isolate and recycles
// them, so this is a speed bump rather than a wall.
const recentByIp = new Map();

export function ipRateLimited(request, { windowMs = 10 * 60 * 1000, max = 20 } = {}) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  const seen = (recentByIp.get(ip) || []).filter((t) => now - t < windowMs);
  seen.push(now);
  recentByIp.set(ip, seen);
  if (recentByIp.size > 5000) recentByIp.clear();
  return seen.length > max;
}

export async function readJson(request, maxBytes = 8192) {
  const type = request.headers.get("Content-Type") || "";
  if (!type.includes("application/json")) return null;
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > maxBytes) return null;
  const raw = await request.text();
  if (raw.length > maxBytes) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function text(status, body) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
  });
}

export function makeStripe(Stripe, secret) {
  const options = { apiVersion: "2023-10-16", maxNetworkRetries: 1, telemetry: false };
  if (typeof Stripe.createFetchHttpClient === "function") {
    options.httpClient = Stripe.createFetchHttpClient();
  }
  return new Stripe(secret, options);
}

// --- Bytes ------------------------------------------------------------------

export function encode(value) {
  return new TextEncoder().encode(value);
}

function decode(bytes) {
  return new TextDecoder().decode(bytes);
}

export function b64url(bytes) {
  let binary = "";
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < array.length; i += 1) binary += String.fromCharCode(array[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return base64ToBytes(padded + "=".repeat((4 - (padded.length % 4)) % 4));
}
