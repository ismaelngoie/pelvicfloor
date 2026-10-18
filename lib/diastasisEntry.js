// Isolated context for the direct diastasis purchase. This is a plan preference,
// never proof of payment; only the authenticated entitlement endpoint grants it.
export const DIASTASIS_ENTRY_KEY = "pelvi.diastasisEntry.v1";
export const DIASTASIS_ENTRY_TTL_MS = 24 * 60 * 60 * 1000;
export const DIASTASIS_GOAL = "diastasisRecti";
export const DIASTASIS_PATHWAY = "womensPelvicHealth";
const normalizeEmail = (value) => typeof value === "string" ? value.trim().toLowerCase() : "";
const browserStorage = () => { try { return typeof window === "undefined" ? null : window.sessionStorage; } catch { return null; } };
const CAMPAIGN_KEYS = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

export function allowedDiastasisAttribution(search = "") {
  const incoming = new URLSearchParams(search);
  const allowed = new URLSearchParams();
  for (const key of CAMPAIGN_KEYS) {
    const value = (incoming.get(key) || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 512);
    if (value) allowed.set(key, value);
  }
  return allowed;
}

export function diastasisSuccessPath(search = "") {
  const params = new URLSearchParams({ paid: "1" });
  for (const [key, value] of allowedDiastasisAttribution(search)) params.set(key, value);
  return `/diastasis-recti/start?${params}`;
}

export function canonicalDiastasisReceiptPath(search = "", { clientSecret = "", paid = true } = {}) {
  const params = new URLSearchParams(paid ? { paid: "1" } : {});
  for (const [key, value] of allowedDiastasisAttribution(search)) params.set(key, value);
  // Only this explicit fallback argument may carry the Stripe proof. Arbitrary
  // incoming email/token/client-secret/redirect parameters are never forwarded.
  if (/^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/.test(clientSecret)) params.set("payment_intent_client_secret", clientSecret);
  const query = params.toString();
  return `/welcome${query ? `?${query}` : ""}`;
}

export function validDiastasisEntry(entry, now = Date.now()) {
  return Boolean(entry?.v === 1 && typeof entry.id === "string" && entry.id.length > 0 && entry.id.length <= 100
    && entry.goalId === DIASTASIS_GOAL && entry.pathway === DIASTASIS_PATHWAY
    && typeof entry.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email) && entry.email.length <= 254
    && Number.isFinite(entry.createdAt) && entry.createdAt <= now + 5 * 60 * 1000
    && now - entry.createdAt < DIASTASIS_ENTRY_TTL_MS);
}

export function createDiastasisEntry({ email } = {}, { now = Date.now() } = {}) {
  const entry = {
    v: 1, id: globalThis.crypto?.randomUUID?.() || `entry_${now}_${Math.random().toString(36).slice(2)}`,
    email: normalizeEmail(email), goalId: DIASTASIS_GOAL, pathway: DIASTASIS_PATHWAY, createdAt: now,
  };
  if (!validDiastasisEntry(entry, now)) return null;
  return entry;
}

/** Call immediately before opening the unchanged CheckoutSheet. No payment secrets are stored. */
export function rememberDiastasisEntry({ email } = {}, { storage = browserStorage(), now = Date.now() } = {}) {
  const entry = createDiastasisEntry({ email }, { now });
  if (!entry) return null;
  try { if (!storage) return null; storage.setItem(DIASTASIS_ENTRY_KEY, JSON.stringify(entry)); return entry; } catch { return null; }
}

// Reconcile an edited checkout address only with the payer email returned by the
// payment server. A blocked/expired store still yields an in-memory preference.
export function entryForVerifiedDiastasisPayer(entry, verifiedEmail, { storage = browserStorage(), now = Date.now() } = {}) {
  const next = validDiastasisEntry(entry, now)
    ? { ...entry, email: normalizeEmail(verifiedEmail) }
    : createDiastasisEntry({ email: verifiedEmail }, { now });
  if (!validDiastasisEntry(next, now)) return null;
  try { storage?.setItem(DIASTASIS_ENTRY_KEY, JSON.stringify(next)); } catch { /* The active page retains the preference. */ }
  return next;
}

export function readDiastasisEntry({ storage = browserStorage(), now = Date.now() } = {}) {
  try {
    const entry = JSON.parse(storage?.getItem(DIASTASIS_ENTRY_KEY) || "null");
    if (validDiastasisEntry(entry, now)) return entry;
    storage?.removeItem(DIASTASIS_ENTRY_KEY);
  } catch { /* A blocked browser store must not block the receipt. */ }
  return null;
}

export function clearDiastasisEntry(id, { storage = browserStorage() } = {}) {
  try {
    const saved = JSON.parse(storage?.getItem(DIASTASIS_ENTRY_KEY) || "null");
    if (saved?.id === id) storage.removeItem(DIASTASIS_ENTRY_KEY);
  } catch { /* Receipt and account access remain available. */ }
}

// Called again inside the Firestore transaction, so a plan chosen in another
// tab while entitlement is loading always wins over this purchase preference.
export function diastasisProfilePatch(profile, entry) {
  if (normalizeEmail(profile?.email || profile?.emailLower) !== normalizeEmail(entry?.email)) return null;
  if (profile?.isLinkedToApp || profile?.platform === "ios") return {};
  if ((profile?.goal && profile.goal !== DIASTASIS_GOAL)
    || (profile?.pathway && profile.pathway !== DIASTASIS_PATHWAY)) return {};
  if (Number(profile?.programDay || 1) > 1 || profile?.programStartedAt
    || Number(profile?.streak || 0) > 0 || Number(profile?.bestStreak || 0) > 0) return {};
  return {
    ...(!profile?.goal ? { goal: DIASTASIS_GOAL, goalTitle: "Fix Diastasis Recti" } : {}),
    ...(!profile?.pathway ? { pathway: DIASTASIS_PATHWAY } : {}),
  };
}

async function verifyLiveEntitlement(user) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const token = await user.getIdToken();
    const response = await fetch("/api/entitlement", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ refresh: true }), signal: controller.signal, cache: "no-store",
    });
    if (!response.ok) throw new Error("verification_unavailable");
    const answer = await response.json();
    if (typeof answer?.active !== "boolean") throw new Error("verification_unavailable");
    return answer;
  } finally { clearTimeout(timer); }
}

async function resolveCurrentMember(user) {
  const { resolveMember } = await import("./memberStore");
  return resolveMember(user);
}

async function commitMissingProfile({ member, entry, user, isCurrent }) {
  const [{ auth, db }, { doc, runTransaction }] = await Promise.all([import("./firebase"), import("firebase/firestore")]);
  const reference = doc(db(), "users", member.id);
  return runTransaction(db(), async (transaction) => {
    if (!isCurrent() || auth().currentUser?.uid !== user.uid) return { stale: true };
    const snapshot = await transaction.get(reference);
    if (!isCurrent() || auth().currentUser?.uid !== user.uid) return { stale: true };
    if (!snapshot.exists()) throw new Error("profile_unavailable");
    const patch = diastasisProfilePatch({ ...snapshot.data(), isLinkedToApp: member.isLinkedToApp }, entry);
    if (patch === null) throw new Error("payer_mismatch");
    if (Object.keys(patch).length) transaction.update(reference, patch);
    return { changed: Object.keys(patch).length > 0 };
  });
}

/** Dependencies are injectable so account changes and server failures can be tested without live accounts. */
export async function initializeDiastasisEntry({ entry, user, isCurrent = () => true, now = Date.now(),
  verify = verifyLiveEntitlement, resolve = resolveCurrentMember, commit = commitMissingProfile } = {}) {
  if (!validDiastasisEntry(entry, now)) return { state: "none" };
  if (!user?.uid) return { state: "waiting" };
  if (normalizeEmail(user.email) !== normalizeEmail(entry.email)) return { state: "mismatch" };
  if (!isCurrent()) return { state: "stale" };
  try {
    const answer = await verify(user);
    if (!isCurrent()) return { state: "stale" };
    if (answer?.active !== true) return { state: "payment_pending" };
    const member = await resolve(user);
    if (!isCurrent()) return { state: "stale" };
    if (!member?.id || diastasisProfilePatch(member, entry) === null) return { state: "mismatch" };
    const result = await commit({ member, entry, user, isCurrent });
    if (!isCurrent() || result?.stale) return { state: "stale" };
    return { state: "ready", changed: Boolean(result?.changed) };
  } catch { return isCurrent() ? { state: "error" } : { state: "stale" }; }
}

// Both instant payment authentication and provider completion use this same
// handoff. Navigation is held until the atomic setup acknowledges success.
export async function completeDiastasisSetup({ onReady, initialize = initializeDiastasisEntry, ...options } = {}) {
  const result = await initialize(options);
  if (result.state === "ready" && (options.isCurrent?.() ?? true)) await onReady?.(result);
  return result;
}
