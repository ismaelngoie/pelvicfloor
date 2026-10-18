import { accessToken, parseServiceAccount, projectIdFrom } from "./stripeSync.js";

export const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
export const validConsentId = (id) => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
const optedOut = (value) => value === true || value === 1 || value === "1" || value === "yes";

export function normalizeMarketingDecision(body, request, { now = Date.now() } = {}) {
  if (body?.v !== 1 || !validConsentId(body.consentId) || !Number.isSafeInteger(body.decidedAt)
    || body.decidedAt <= 0 || body.decidedAt > now + 60000 || now - body.decidedAt > CONSENT_MAX_AGE_MS) return null;
  const dnt = request.headers.get("DNT") === "1" || [body.doNotTrack, body.dnt].some(optedOut);
  const gpc = request.headers.get("Sec-GPC") === "1" || [body.globalPrivacyControl, body.gpc].some(optedOut);
  const advertising = body.advertising === true && !dnt && !gpc;
  return { v: 1, consentId: body.consentId.toLowerCase(), decidedAt: body.decidedAt,
    analytics: body.analytics === true && !dnt, advertising, matching: advertising && body.matching === true };
}

/** A late grant cannot undo a withdrawal. At equal timestamps the narrower
 * decision wins, regardless of which request reaches Firestore first. */
export function mergeMarketingDecision(current, incoming) {
  if (!current || incoming.decidedAt > current.decidedAt) return incoming;
  if (incoming.decidedAt < current.decidedAt) return current;
  const advertising = current.advertising === true && incoming.advertising === true;
  return { ...current, analytics: current.analytics === true && incoming.analytics === true,
    advertising, matching: advertising && current.matching === true && incoming.matching === true };
}

export async function consentRegistryKey(consentId) {
  if (!validConsentId(consentId)) throw new Error("invalid_consent_id");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(consentId.toLowerCase()));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function authenticateRegistry(env) {
  const account = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  return { projectId: projectIdFrom(env, account), token: await accessToken(account) };
}
function storedDecision(record) {
  const fields = record?.fields || {};
  const decidedAt = Number(fields.decidedAt?.integerValue ?? fields.decidedAt?.doubleValue);
  if (Number(fields.v?.integerValue) !== 1 || !Number.isSafeInteger(decidedAt) || decidedAt <= 0) return null;
  const advertising = fields.advertising?.booleanValue === true;
  return { v: 1, decidedAt, analytics: fields.analytics?.booleanValue === true,
    advertising, matching: advertising && fields.matching?.booleanValue === true };
}
function decisionFields(decision) {
  return { v: { integerValue: "1" }, decidedAt: { integerValue: String(decision.decidedAt) },
    analytics: { booleanValue: decision.analytics }, advertising: { booleanValue: decision.advertising }, matching: { booleanValue: decision.matching } };
}

// Consent IDs are first-party capabilities. Only their SHA256 keys reach this
// server-only collection; documents contain decisions and no identifying data.
export async function createMarketingConsentRegistry(env, { fetcher = fetch, authenticate = authenticateRegistry } = {}) {
  const { projectId, token } = await authenticate(env);
  const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/marketingConsentRegistry`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  async function read(id) {
    const url = `${base}/${await consentRegistryKey(id)}`;
    const response = await fetcher(url, { headers });
    if (response.status === 404) return { url, decision: null, updateTime: null };
    if (!response.ok) throw new Error("consent_registry_unavailable");
    const record = await response.json();
    const decision = storedDecision(record);
    if (!decision || !record.updateTime) throw new Error("consent_registry_invalid");
    return { url, decision, updateTime: record.updateTime };
  }
  return {
    async get(consentId) { return (await read(consentId)).decision; },
    async save(incoming) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const snapshot = await read(incoming.consentId);
        const effective = mergeMarketingDecision(snapshot.decision, incoming);
        if (snapshot.decision && ["decidedAt", "analytics", "advertising", "matching"].every((key) => snapshot.decision[key] === effective[key])) return effective;
        const precondition = snapshot.updateTime ? `currentDocument.updateTime=${encodeURIComponent(snapshot.updateTime)}` : "currentDocument.exists=false";
        const response = await fetcher(`${snapshot.url}?${precondition}`, { method: "PATCH", headers, body: JSON.stringify({ fields: decisionFields(effective) }) });
        if (response.ok) return effective;
        if ([409, 412].includes(response.status)) continue;
        const failure = await response.json().catch(() => null);
        if (failure?.error?.status === "FAILED_PRECONDITION" || failure?.error?.status === "ABORTED") continue;
        throw new Error("consent_registry_unavailable");
      }
      throw new Error("consent_registry_conflict");
    },
  };
}
