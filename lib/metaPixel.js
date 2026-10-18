import { MARKETING_CONSENT_KEY, marketingAttribution, marketingPersistenceBlocked,
  readMarketingConsent, syncMarketingConsent } from "./marketingConsent.js";
import { deferMarketingReload, markMarketingNavigationStarted } from "./marketingNavigation.js";

// Owner decision (Oct 2026, testing phase): the Pixel runs on every pelvi.health
// page except the owner's /admin dashboard, with full URLs and query strings.
export const META_PURCHASE_KEY = "pelvi.meta.verified-purchases.v1";
export const META_PURCHASE_TTL_MS = 24 * 60 * 60 * 1000;
export const META_SENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_PENDING = 20;
const MAX_SENT = 128;
const SENSITIVE = /diastasis|bladder|incontinen|prolaps|postpartum|pregnan|menopaus|pelvic.?pain|prostate|symptom|diagnos|intimacy|sexual|client.?secret|payment.?intent|session.?id|email|token|password|\/app(?:\/|$)|\/admin(?:\/|$)|\/member(?:\/|$)|\/video(?:\/|$)|\/start(?:\/|$)/i;
const runtimes = new WeakMap();

// Every page on the site, any query string, any referrer. /admin is excluded
// only so the owner's own dashboard visits do not land in ad audiences.
export function metaPixelPageAllowed({ href } = {}) {
  try {
    const url = new URL(href);
    return ["https://pelvi.health", "https://www.pelvi.health"].includes(url.origin) && !/^\/admin(?:\/|$)/.test(url.pathname);
  } catch { return false; }
}

// Checkout opens queue an InitiateCheckout event. The live controller sends it
// as soon as the Pixel is ready on the page.
const checkoutEvents = [];
export function trackMetaInitiateCheckout({ value, currency = "USD" } = {}) {
  if (typeof window === "undefined") return false;
  const amount = Number(value);
  const code = typeof currency === "string" && /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : "USD";
  checkoutEvents.push(Number.isFinite(amount) && amount > 0 ? { value: amount, currency: code } : { currency: code });
  if (checkoutEvents.length > 5) checkoutEvents.shift();
  window.dispatchEvent(new Event("pelvi:meta-checkout"));
  return true;
}

export function normalizeMetaConfig(value) {
  const datasetId = typeof value?.datasetId === "string" && /^[1-9]\d{4,31}$/.test(value.datasetId) ? value.datasetId : "";
  const enabled = value?.enabled === true && Boolean(datasetId);
  return { enabled, datasetId: enabled ? datasetId : "", emailMatchingEnabled: enabled && value?.emailMatchingEnabled === true };
}

// An acknowledged registry denial overrides a stale local grant. Never start
// measurement with a response belonging to an earlier local decision or ID.
export function registryMetaConsentAllowed(result, current, requested = current) {
  return result?.ok === true && result.effective?.advertising === true
    && current?.advertising === true && requested?.advertising === true
    && typeof current.consentId === "string" && current.consentId.length > 0
    && current.consentId === requested.consentId && current.decidedAt === requested.decidedAt
    && Number.isFinite(current.decidedAt) && Number.isFinite(result.decidedAt)
    && result.decidedAt >= current.decidedAt;
}

function purchaseRecord(value, now, createdAt = value?.createdAt) {
  if (typeof value?.eventId !== "string" || !/^[A-Za-z0-9_:-]{8,160}$/.test(value.eventId)
    || SENSITIVE.test(value.eventId) || typeof value.value !== "number" || !Number.isFinite(value.value)
    || value.value <= 0 || value.value > 1000000 || typeof value.currency !== "string"
    || !/^[A-Z]{3}$/.test(value.currency) || !Number.isFinite(createdAt)
    || createdAt > now + 60000 || now - createdAt >= META_PURCHASE_TTL_MS) return null;
  return { eventId: value.eventId, value: value.value, currency: value.currency, createdAt };
}

export function metaPurchasePayload(record) {
  return { name: "Purchase", data: { value: record.value, currency: record.currency }, options: { eventID: record.eventId } };
}

export function createMetaPurchaseStore({ getStorage = () => null, now = () => Date.now() } = {}) {
  const pending = new Map();
  const sent = new Map();
  let flushing = false;
  function read() {
    const time = now();
    try {
      const raw = getStorage()?.getItem(META_PURCHASE_KEY) || "null";
      const saved = raw.length <= 50000 ? JSON.parse(raw) : null;
      if (Array.isArray(saved?.pending)) for (const item of saved.pending.slice(0, MAX_PENDING)) {
        const record = purchaseRecord(item, time);
        if (record && !pending.has(record.eventId)) pending.set(record.eventId, record);
      }
      if (Array.isArray(saved?.sent)) for (const item of saved.sent.slice(-MAX_SENT)) {
        if (typeof item?.eventId === "string" && /^[A-Za-z0-9_:-]{8,160}$/.test(item.eventId) && !SENSITIVE.test(item.eventId)
          && Number.isFinite(item.sentAt) && item.sentAt <= time + 60000 && time - item.sentAt < META_SENT_TTL_MS) sent.set(item.eventId, item.sentAt);
      }
    } catch { /* Session storage can be blocked; memory is sufficient to continue. */ }
    for (const [id, record] of pending) if (!purchaseRecord(record, time) || sent.has(id)) pending.delete(id);
    for (const [id, timeSent] of sent) if (time - timeSent >= META_SENT_TTL_MS) sent.delete(id);
    while (sent.size > MAX_SENT) sent.delete(sent.keys().next().value);
  }
  function save() {
    try { getStorage()?.setItem(META_PURCHASE_KEY, JSON.stringify({ pending: [...pending.values()].slice(0, MAX_PENDING), sent: [...sent].slice(-MAX_SENT).map(([eventId, sentAt]) => ({ eventId, sentAt })) })); } catch { /* Memory fallback. */ }
  }
  return {
    queue(value) {
      read();
      const record = purchaseRecord(value, now(), now());
      if (!record || sent.has(record.eventId) || pending.has(record.eventId) || pending.size >= MAX_PENDING) return false;
      pending.set(record.eventId, record); save(); return true;
    },
    flush(emit) {
      if (flushing) return 0;
      read(); flushing = true; let count = 0;
      try {
        for (const [id, record] of pending) {
          try {
            if (emit(metaPurchasePayload(record)) !== true) continue;
            // Mark only after fbq has accepted the call. A throwing/blocked tag
            // leaves the verified record available for a later allowed retry.
            pending.delete(id); sent.set(id, now()); count += 1; save();
          } catch { /* Preserve the outcome until an allowed retry or TTL. */ }
        }
      } finally { flushing = false; }
      return count;
    },
    pending() { read(); return [...pending.values()]; },
  };
}

let browserPurchases;
function browserStore() {
  if (!browserPurchases) browserPurchases = createMetaPurchaseStore({ getStorage: () => typeof window === "undefined" ? null : window.sessionStorage });
  return browserPurchases;
}

// Call only with the receipt fields returned by the server's verified payment
// endpoint. URL amounts, client payment state and email are never inputs here.
export function queueVerifiedMetaPurchase(value) {
  if (typeof window === "undefined") return false;
  const queued = browserStore().queue(value);
  if (queued) window.dispatchEvent(new Event("pelvi:verified-meta-purchase"));
  return queued;
}

export function captureWelcomePaymentProof(pathname, {
  getWindow = () => typeof window === "undefined" ? null : window,
  readSaved = () => "",
} = {}) {
  if (pathname !== "/welcome") return "";
  try {
    const location = getWindow()?.location;
    if (location?.pathname !== "/welcome") return "";
    const proof = new URLSearchParams(location.search).get("payment_intent_client_secret") || readSaved();
    return typeof proof === "string" && proof.length <= 512 && /^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/.test(proof) ? proof : "";
  } catch { return ""; }
}

// This first-party endpoint independently verifies the receipt. Persisted
// checkout consent bounds any matching; a fresh choice can only restrict it.
// A failed/timed-out report must never delay onboarding. Server webhooks remain
// authoritative; this call is a best-effort browser/server dedup bridge.
export async function reportVerifiedMetaPurchase(clientSecret, {
  getConsent = readMarketingConsent,
  getRegistryConsent = syncMarketingConsent,
  getAttribution = marketingAttribution,
  fetcher = (...args) => fetch(...args),
  queue = queueVerifiedMetaPurchase,
  timeoutMs = 2000,
} = {}) {
  if (typeof clientSecret !== "string" || clientSecret.length > 512 || !/^pi_[A-Za-z0-9]+_secret_[A-Za-z0-9]+$/.test(clientSecret)) return false;
  try {
    const requested = getConsent();
    if (requested?.advertising !== true) return false;
    const abort = new AbortController();
    let timer;
    let registry;
    try {
      const result = await Promise.race([
        Promise.resolve().then(async () => {
          registry = await getRegistryConsent(requested);
          if (abort.signal.aborted || !registryMetaConsentAllowed(registry, getConsent(), requested)) return null;
          const marketing = getAttribution();
          if (marketing?.advertising !== true) return null;
          const response = await fetcher("/api/meta-purchase", {
            method: "POST", credentials: "same-origin", cache: "no-store", keepalive: true,
            referrerPolicy: "no-referrer", signal: abort.signal,
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ clientSecret, marketing }),
          });
          return response.ok ? response.json() : null;
        }),
        new Promise(resolve => { timer = setTimeout(() => { abort.abort(); resolve(null); }, Math.max(1, Math.min(2000, timeoutMs))); }),
      ]);
      if (!registryMetaConsentAllowed(registry, getConsent(), requested) || result?.sent !== true) return false;
      const record = purchaseRecord(result, Date.now(), Date.now());
      return record ? queue({ eventId: record.eventId, value: record.value, currency: record.currency }) : false;
    } finally { clearTimeout(timer); }
  } catch { return false; }
}

function runtimeFor(scope) {
  if (!runtimes.has(scope)) runtimes.set(scope, { requested: false, ready: false, initialized: false, revoked: false, privateDocument: false, datasetId: "", pageViews: new Set(), fbq: null, loading: null, script: null, withdrawalTask: null, leaving: false });
  return runtimes.get(scope);
}

export function createMetaPixelController({
  getWindow = () => typeof window === "undefined" ? null : window,
  getDocument = () => typeof document === "undefined" ? null : document,
  getConsent = () => ({ advertising: false }),
  getRegistryConsent = syncMarketingConsent,
  persistenceBlocked = marketingPersistenceBlocked,
  withdrawalTimeoutMs = 2000,
  purchases = browserStore(),
  fetchConfig = async () => {
    const response = await fetch("/api/marketing-config", { cache: "no-store", credentials: "omit", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Measurement unavailable");
    return response.json();
  },
  loadScript,
  navigate = (href, { replace = false } = {}) => replace ? getWindow()?.location.replace(href) : getWindow()?.location.assign(href),
  reload = () => getWindow()?.location.reload(),
} = {}) {
  let disposed = false, revision = 0, configPromise = null, removeGuards = null;
  const scope = getWindow();
  const doc = getDocument();
  const runtime = scope ? runtimeFor(scope) : null;
  function allowed(href = scope?.location?.href) {
    try {
      return !disposed && getConsent()?.advertising === true && metaPixelPageAllowed({ href });
    } catch { return false; }
  }
  function revoke() {
    if (!runtime?.requested || runtime.revoked) return;
    runtime.revoked = true;
    try { runtime.fbq?.("consent", "revoke"); } catch { /* Navigation still clears the tag. */ }
    runtime.script?.remove?.();
  }
  function consentReloadWhenSafe() {
    deferMarketingReload({ document: doc, window: scope,
      canReload: () => !disposed && !runtime.leaving && !persistenceBlocked(),
      reload: () => { runtime.leaving = true; reload(); },
    });
  }
  function leaveDocument(href, replace = false, immediate = false) {
    revoke();
    try {
      if (href) { runtime.leaving = true; markMarketingNavigationStarted(doc); navigate(href, { replace }); }
      else if (runtime.withdrawalTask && !immediate) return;
      else if (!immediate && metaPixelPageAllowed({ href: scope.location.href, referrer: doc.referrer || "" })) consentReloadWhenSafe();
      // A reload could resurrect an older persisted grant if both local
      // storage and the essential withdrawal cookie rejected the new choice.
      else if (!persistenceBlocked()) { runtime.leaving = true; markMarketingNavigationStarted(doc); reload(); }
    } catch { /* Stay revoked if persistence/navigation cannot be checked. */ }
  }
  function withdrawThenReload(choice) {
    revoke();
    revision += 1;
    if (runtime.withdrawalTask) return;
    // Starting the first-party keepalive request in a microtask then reloading
    // immediately can cancel it before fetch begins. Keep this document stopped
    // while the withdrawal is acknowledged or the two-second deadline expires.
    const task = (async () => {
      let timer;
      try {
        await Promise.race([
          Promise.resolve().then(() => getRegistryConsent(choice)).catch(() => null),
          new Promise(resolve => { timer = setTimeout(resolve, Math.max(1, Math.min(2000, withdrawalTimeoutMs))); }),
        ]);
      } finally {
        clearTimeout(timer);
        consentReloadWhenSafe();
      }
    })();
    runtime.withdrawalTask = task;
  }
  function installGuards() {
    if (removeGuards || !scope?.history || !doc?.addEventListener) return;
    const restores = [];
    for (const method of ["pushState", "replaceState"]) {
      const original = scope.history[method];
      if (typeof original !== "function") continue;
      const guarded = function(state, unused, href) {
        let target;
        try { target = href == null ? scope.location.href : new URL(href, scope.location.href).href; } catch { return original.apply(this, arguments); }
        if (runtime.requested && !metaPixelPageAllowed({ href: target, referrer: doc.referrer || "" })) { leaveDocument(target, method === "replaceState"); return; }
        const result = original.apply(this, arguments);
        scope.dispatchEvent(new Event("pelvi:meta-navigation"));
        return result;
      };
      scope.history[method] = guarded;
      restores.push(() => { if (scope.history[method] === guarded) scope.history[method] = original; });
    }
    const click = (event) => {
      if (!runtime.requested || event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target?.closest?.("a[href]");
      if (!anchor || anchor.download || (anchor.target && anchor.target !== "_self")) return;
      let target;
      try { target = new URL(anchor.href, scope.location.href); } catch { return; }
      if (target.origin !== scope.location.origin || metaPixelPageAllowed({ href: target.href, referrer: doc.referrer || "" })) return;
      event.preventDefault(); event.stopImmediatePropagation(); leaveDocument(target.href);
    };
    const pop = () => { if (runtime.requested && !allowed()) leaveDocument(null, false, true); else void refresh(); };
    const privacy = () => {
      const choice = getConsent();
      if (runtime.requested && choice?.advertising !== true) withdrawThenReload(choice);
      else if (runtime.requested && !allowed()) leaveDocument();
      else void refresh();
    };
    const storage = (event) => { if (event.key == null || event.key === MARKETING_CONSENT_KEY) privacy(); };
    doc.addEventListener("click", click, true);
    scope.addEventListener("popstate", pop, true);
    scope.addEventListener("pelvi:privacy-choice", privacy);
    scope.addEventListener("storage", storage);
    scope.addEventListener("pelvi:verified-meta-purchase", refresh);
    scope.addEventListener("pelvi:meta-navigation", refresh);
    scope.addEventListener("pelvi:meta-checkout", refresh);
    removeGuards = () => {
      restores.forEach(restore => restore());
      doc.removeEventListener("click", click, true);
      scope.removeEventListener("popstate", pop, true);
      scope.removeEventListener("pelvi:privacy-choice", privacy);
      scope.removeEventListener("storage", storage);
      scope.removeEventListener("pelvi:verified-meta-purchase", refresh);
      scope.removeEventListener("pelvi:meta-navigation", refresh);
      scope.removeEventListener("pelvi:meta-checkout", refresh);
    };
  }
  async function ensurePixel(datasetId) {
    if (runtime.revoked || (runtime.datasetId && runtime.datasetId !== datasetId)) return false;
    if (runtime.ready) return true;
    if (runtime.loading) return runtime.loading;
    // Refuse to adopt another tag's global state: its automatic collection or
    // dataset configuration is outside this allowlist's control.
    if (scope.fbq && scope.fbq !== runtime.fbq) return false;
    const fbq = runtime.fbq || function(...args) { if (fbq.callMethod) fbq.callMethod.apply(fbq, args); else fbq.queue.push(args); };
    fbq.push = fbq; fbq.loaded = true; fbq.version = "2.0"; fbq.queue = fbq.queue || [];
    runtime.fbq = scope.fbq = fbq;
    if (!scope._fbq) scope._fbq = fbq;
    runtime.datasetId = datasetId; runtime.requested = true;
    if (!runtime.initialized) {
      // These commands precede SDK loading/initialization. No advanced-matching
      // data is passed to init. Automatic advanced matching must ALSO be off in
      // Events Manager before META_TRACKING_ENABLED is approved/enabled.
      fbq("set", "autoConfig", false, datasetId);
      fbq("consent", "grant");
      fbq("init", datasetId);
      runtime.initialized = true;
    }
    installGuards();
    runtime.loading = (async () => {
      try {
        if (loadScript) await loadScript({ scope, doc });
        else await new Promise((resolve, reject) => {
          const script = doc.createElement("script");
          script.id = "pelvi-meta-pixel"; script.async = true;
          script.referrerPolicy = "no-referrer";
          script.src = "https://connect.facebook.net/en_US/fbevents.js";
          script.onload = resolve; script.onerror = reject;
          runtime.script = script;
          doc.head.appendChild(script);
        });
        // Readiness belongs to the document, not one React effect. Strict Mode
        // can dispose the first controller while a replacement awaits this tag.
        runtime.ready = !runtime.revoked;
        return runtime.ready;
      } catch { return false; }
    })();
    const loading = runtime.loading;
    void loading.then(() => { if (runtime.loading === loading) runtime.loading = null; });
    return runtime.loading;
  }
  async function refresh() {
    const current = ++revision;
    if (!scope || !doc || !allowed()) { if (!disposed && runtime?.requested) leaveDocument(); return false; }
    try {
      if (!configPromise) configPromise = Promise.resolve().then(fetchConfig).then(normalizeMetaConfig).catch(() => { configPromise = null; return { enabled: false }; });
      const config = await configPromise;
      if (disposed || current !== revision || !allowed()) return false;
      if (!config.enabled) { if (runtime.requested) leaveDocument(); return false; }
      const requested = getConsent();
      const registry = await getRegistryConsent(requested);
      if (disposed || current !== revision || !allowed()) return false;
      if (!registryMetaConsentAllowed(registry, getConsent(), requested)) { if (runtime.requested) leaveDocument(); return false; }
      if (!await ensurePixel(config.datasetId) || disposed || current !== revision || !allowed()) return false;
      if (!registryMetaConsentAllowed(registry, getConsent(), requested)) { if (runtime.requested) leaveDocument(); return false; }
      const path = new URL(scope.location.href).pathname;
      if (!runtime.pageViews.has(path)) {
        runtime.fbq("trackSingle", config.datasetId, "PageView");
        runtime.pageViews.add(path);
      }
      while (checkoutEvents.length && allowed() && !runtime.revoked) {
        runtime.fbq("trackSingle", config.datasetId, "InitiateCheckout", checkoutEvents.shift());
      }
      purchases.flush(payload => {
        if (!allowed() || runtime.revoked) return false;
        runtime.fbq("trackSingle", config.datasetId, payload.name, payload.data, payload.options);
        return true;
      });
      return true;
    } catch { if (runtime.requested) revoke(); return false; }
  }
  return {
    start() { installGuards(); return refresh(); },
    refresh,
    dispose() { disposed = true; revision += 1; removeGuards?.(); removeGuards = null; },
  };
}
