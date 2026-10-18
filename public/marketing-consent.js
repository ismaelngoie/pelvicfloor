// Anonymous privacy choices. No account identifiers, health answers or emails.
export const MARKETING_CONSENT_KEY = "pelvi.privacy.v1";
export const MARKETING_CONSENT_EVENT = "pelvi:privacy-choice";
export const MARKETING_CONSENT_TTL = 180 * 24 * 60 * 60 * 1000;
export const MARKETING_DENIED_COOKIE = "pelvi_privacy_denied";
const EMPTY = { decided: false, analytics: false, advertising: false, matching: false, decidedAt: 0, consentId: "" };
const browserStorage = () => { try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; } };
const browserNavigator = () => typeof navigator === "undefined" ? {} : navigator;
const browserDocument = () => typeof document === "undefined" ? null : document;
const browserLocation = () => { try { return typeof window === "undefined" ? null : window.location; } catch { return null; } };
const browserCrypto = () => typeof globalThis.crypto === "undefined" ? null : globalThis.crypto;
const validConsentId = (value) => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : "";
let memoryChoice = null;
let memoryOnly = false;
let persistenceBlocked = false;
let decisionEpoch = 0;
const issuedChoices = new WeakMap();

function newConsentId(crypto) {
  try {
    if (typeof crypto?.randomUUID === "function") return validConsentId(crypto.randomUUID());
    if (typeof crypto?.getRandomValues !== "function") return "";
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch { return ""; }
}

function expose(choice, context) {
  const result = { ...choice };
  issuedChoices.set(result, { value: { ...result }, context, epoch: decisionEpoch });
  return result;
}

function readCookie(name, doc = browserDocument()) {
  if (!doc) return "";
  try { return decodeURIComponent(doc.cookie.split(/;\s*/).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1) || ""); } catch { return ""; }
}

function deniedCookie(doc, now) {
  const value = readCookie(MARKETING_DENIED_COOKIE, doc);
  if (!value.startsWith("1")) return null;
  const [, id, timestamp] = value.split(".");
  const decidedAt = Number(timestamp);
  return { consentId: validConsentId(id), decidedAt: Number.isFinite(decidedAt) && decidedAt > 0 && decidedAt <= now + 60000 && now - decidedAt <= MARKETING_CONSENT_TTL ? decidedAt : 0 };
}

function writeDeniedCookie(doc, denied, choice) {
  if (!doc) return false;
  try {
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(doc.location?.hostname);
    const marker = denied ? (choice.consentId ? `1.${choice.consentId}.${choice.decidedAt}` : "1") : "";
    doc.cookie = `${MARKETING_DENIED_COOKIE}=${marker}; Path=/; Max-Age=${denied ? Math.floor(MARKETING_CONSENT_TTL / 1000) : 0}; SameSite=Lax${local ? "" : "; Secure"}`;
    return readCookie(MARKETING_DENIED_COOKIE, doc) === marker;
  } catch { /* Keep the effective in-memory denial if all persistence is blocked. */ }
  return false;
}

export function readMarketingConsent({ storage = browserStorage(), browser = browserNavigator(), now = Date.now(), document: doc = browserDocument() } = {}) {
  const context = { storage, browser, document: doc };
  let choice = memoryChoice;
  try { if (storage && !memoryOnly) choice = JSON.parse(storage.getItem(MARKETING_CONSENT_KEY) || "null"); } catch { /* The current visit can still retain a choice. */ }
  // The capability is first-party consent state only. The fallback retains it
  // so an interrupted withdrawal can still revoke old payment attribution.
  const denied = deniedCookie(doc, now);
  if (denied) return expose({ ...EMPTY, decided: true, consentId: denied.consentId || validConsentId(choice?.consentId), decidedAt: denied.decidedAt || (Number.isFinite(choice?.decidedAt) ? choice.decidedAt : 0) }, context);
  if (choice?.v !== 1 || !Number.isFinite(choice.decidedAt) || choice.decidedAt > now + 60000 || now - choice.decidedAt > MARKETING_CONSENT_TTL) return expose(EMPTY, context);
  const consentId = validConsentId(choice.consentId);
  const optedOut = browser.globalPrivacyControl === true || ["1", "yes"].includes(String(browser.doNotTrack || "").toLowerCase());
  // Legacy choices without a revocable capability require a new explicit ad
  // decision. Existing anonymous analytics preference is still respected.
  const advertising = Boolean(consentId) && choice.advertising === true && !optedOut;
  return expose({ decided: true, analytics: choice.analytics === true && !["1", "yes"].includes(String(browser.doNotTrack || "").toLowerCase()), advertising, matching: advertising && choice.matching === true, decidedAt: choice.decidedAt, consentId }, context);
}

export function writeMarketingConsent(choice, { storage = browserStorage(), browser = browserNavigator(), now = Date.now(), notify = true, document: doc = browserDocument(), crypto = browserCrypto() } = {}) {
  let previous = memoryChoice;
  try { previous = JSON.parse(storage?.getItem(MARKETING_CONSENT_KEY) || "null") || previous; } catch { /* In-memory capability remains available. */ }
  const priorDenial = deniedCookie(doc, now);
  const consentId = priorDenial?.consentId || validConsentId(previous?.consentId) || newConsentId(crypto);
  decisionEpoch += 1;
  memoryChoice = { v: 1, analytics: choice?.analytics === true, advertising: Boolean(consentId) && choice?.advertising === true, matching: Boolean(consentId) && choice?.advertising === true && choice?.matching === true, decidedAt: now, consentId };
  memoryOnly = !storage;
  let persisted = false;
  try {
    if (storage) { storage.setItem(MARKETING_CONSENT_KEY, JSON.stringify(memoryChoice)); persisted = true; }
  } catch {
    memoryOnly = true;
    try { storage?.removeItem(MARKETING_CONSENT_KEY); } catch { /* Cookie fallback below can still retain a withdrawal. */ }
  }
  const rejectedAll = !memoryChoice.analytics && !memoryChoice.advertising;
  const cookieRemembered = (!persisted || rejectedAll) ? writeDeniedCookie(doc, true, memoryChoice) : writeDeniedCookie(doc, false, memoryChoice);
  // If every withdrawal persistence mechanism failed while an old allow can
  // still be read, callers must stop their tags without reloading this visit.
  let staleAllowReadable = false;
  if (!persisted && !cookieRemembered) {
    try {
      const stale = JSON.parse(storage?.getItem(MARKETING_CONSENT_KEY) || "null");
      staleAllowReadable = stale?.analytics === true || stale?.advertising === true;
    } catch { /* A new document cannot read an allow from blocked storage. */ }
  }
  persistenceBlocked = !persisted && !cookieRemembered && staleAllowReadable;
  const applied = readMarketingConsent({ storage, browser, now, document: doc });
  try {
    if (notify && typeof window !== "undefined") window.dispatchEvent(new CustomEvent(MARKETING_CONSENT_EVENT, { detail: applied }));
  } catch { /* Optional event consumers cannot prevent a privacy choice. */ }
  return applied;
}

export function marketingPersistenceBlocked() { return persistenceBlocked; }

const syncDenied = () => ({ ok: false, effective: { advertising: false, matching: false }, decidedAt: 0 });
const sameChoice = (a, b) => ["consentId", "decidedAt", "analytics", "advertising", "matching", "decided"].every((key) => a[key] === b[key]);
const syncingChoices = new Map();

// The capability is sent only to this same-origin consent registry. Arbitrary
// objects (or mutated/spread copies) cannot mint registry decisions. Ads receive
// only effective booleans; this ID must never be included in pixel payloads.
export async function syncMarketingConsent(choice = readMarketingConsent(), {
  fetch: request = typeof fetch === "undefined" ? null : fetch,
  now = Date.now(),
  schedule = (callback, delay) => setTimeout(callback, delay),
  cancel = (timer) => clearTimeout(timer),
} = {}) {
  const issued = choice && typeof choice === "object" ? issuedChoices.get(choice) : null;
  if (!issued || !issued.value.decided || !validConsentId(issued.value.consentId) || typeof request !== "function") return syncDenied();
  const value = issued.value;
  const current = () => { try { return issued.epoch === decisionEpoch && sameChoice(value, choice) && sameChoice(value, readMarketingConsent({ ...issued.context, now })); } catch { return false; } };
  if (!current()) return syncDenied();
  const key = JSON.stringify([issued.epoch, value.consentId, value.decidedAt, value.analytics, value.advertising, value.matching]);
  const existing = syncingChoices.get(key);
  if (existing) {
    const result = await existing;
    return current() ? result : syncDenied();
  }
  if (syncingChoices.size >= 8) return syncDenied();
  const operation = (async () => {
    let timer;
    const controller = typeof AbortController === "undefined" ? null : new AbortController();
    try {
      const timeout = new Promise((resolve) => {
        timer = schedule(() => { controller?.abort(); resolve(syncDenied()); }, 2000);
      });
      const send = Promise.resolve().then(() => request("/api/marketing-consent", {
        method: "POST", credentials: "same-origin", redirect: "error", cache: "no-store",
        headers: { "Content-Type": "application/json" }, keepalive: !value.advertising,
        ...(controller ? { signal: controller.signal } : {}),
        body: JSON.stringify({ v: 1, consentId: value.consentId, decidedAt: value.decidedAt, analytics: value.analytics, advertising: value.advertising, matching: value.matching }),
      })).then(async (response) => {
        if (!response?.ok) return syncDenied();
        const result = await response.json();
        if (result?.ok !== true || !Number.isFinite(result.decidedAt) || result.decidedAt < value.decidedAt || result.decidedAt > now + 60000 || !current()) return syncDenied();
        const advertising = value.advertising && result.effective?.advertising === true;
        return { ok: true, effective: { advertising, matching: advertising && value.matching && result.effective?.matching === true }, decidedAt: result.decidedAt };
      }).catch(syncDenied);
      return await Promise.race([send, timeout]);
    } catch { return syncDenied(); }
    finally { if (timer !== undefined) cancel(timer); }
  })();
  syncingChoices.set(key, operation);
  try { return await operation; }
  finally { if (syncingChoices.get(key) === operation) syncingChoices.delete(key); }
}

const validBrowserId = (value) => typeof value === "string" && /^fb\.\d+\.\d{10,16}\.[A-Za-z0-9_.-]{1,512}$/.test(value) ? value : "";
export function marketingAttribution({ storage = browserStorage(), browser = browserNavigator(), now = Date.now(), document: doc = browserDocument(), location = browserLocation() } = {}) {
  try {
    const choice = readMarketingConsent({ storage, browser, now, document: doc });
    if (!choice.advertising || !location) return undefined;
    let fbc = validBrowserId(readCookie("_fbc", doc));
    // The opaque click identifier is the only incoming query value retained.
    const clickId = new URLSearchParams(location.search).get("fbclid") || "";
    if (/^[A-Za-z0-9_-]{10,200}$/.test(clickId) && !fbc.endsWith(`.${clickId}`)) {
      fbc = `fb.1.${now}.${clickId}`;
      try {
        if (["pelvi.health", "www.pelvi.health"].includes(location.hostname) && doc) doc.cookie = `_fbc=${encodeURIComponent(fbc)}; Path=/; Max-Age=7776000; SameSite=Lax; Secure`;
      } catch { /* Browser cookie restrictions must never block checkout. */ }
    }
    return { v: 1, advertising: true, matching: choice.matching, decidedAt: choice.decidedAt, consentId: choice.consentId, fbp: validBrowserId(readCookie("_fbp", doc)), fbc };
  } catch {
    return undefined;
  }
}
