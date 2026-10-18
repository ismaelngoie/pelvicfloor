import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const asModule = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const source = (await readFile(new URL("../lib/metaPixel.js", import.meta.url), "utf8"))
  .replace('"./marketingConsent.js"', JSON.stringify(new URL("../lib/marketingConsent.js", import.meta.url).href))
  .replace('"./marketingNavigation.js"', JSON.stringify(new URL("../lib/marketingNavigation.js", import.meta.url).href));
const api = await import(asModule(source));
const configAPI = await import(new URL("../functions/api/marketing-config.js", import.meta.url));
const { metaPixelPageAllowed, normalizeMetaConfig, registryMetaConsentAllowed, captureWelcomePaymentProof, createMetaPurchaseStore, createMetaPixelController,
  reportVerifiedMetaPurchase, META_PURCHASE_KEY, META_PURCHASE_TTL_MS } = api;
const event = { eventId: "purchase_abcdefgh1234", value: 29.99, currency: "USD" };
const config = { enabled: true, datasetId: "123456789012345", emailMatchingEnabled: false };
const consent = { advertising: true, matching: false, decidedAt: Date.now(), consentId: "b48dd5c8-a99f-4c48-9a5d-bbce711f922a" };
const currentMarketing = { v: 1, ...consent, fbp: "", fbc: "" };
const registryAllow = async choice => ({ ok: true, effective: { advertising: true, matching: false }, decidedAt: choice.decidedAt });
function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
function fixture(href = "https://pelvi.health/", referrer = "") {
  const scope = new EventTarget(), doc = new EventTarget();
  let reloads = 0;
  const navigations = [];
  scope.location = { href, origin: new URL(href).origin, assign(value) { navigations.push(value); this.href = value; }, replace(value) { navigations.push({ replace: value }); this.href = value; }, reload() { reloads += 1; } };
  scope.history = { pushState(_state, _unused, value) { if (value != null) scope.location.href = new URL(value, scope.location.href).href; }, replaceState(_state, _unused, value) { if (value != null) scope.location.href = new URL(value, scope.location.href).href; } };
  doc.referrer = referrer;
  doc.querySelector = () => null;
  const calls = [];
  let loads = 0, choices = consent;
  return { scope, doc, calls, navigations, get reloads() { return reloads; }, get loads() { return loads; }, setConsent(value) { choices = value; },
    options: { getWindow: () => scope, getDocument: () => doc, getConsent: () => choices, getRegistryConsent: registryAllow, persistenceBlocked: () => false, fetchConfig: async () => config,
      purchases: createMetaPurchaseStore(), loadScript: async () => { loads += 1; scope.fbq.callMethod = (...args) => calls.push(args); } } };
}

test("public configuration is disabled by default and never exposes secret fields", async () => {
  for (const env of [{}, { META_TRACKING_ENABLED: "TRUE", META_DATASET_ID: config.datasetId }, { META_TRACKING_ENABLED: "true", META_DATASET_ID: "bad-id" }]) {
    const response = configAPI.onRequestGet({ env });
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await response.json(), { enabled: false, datasetId: "", emailMatchingEnabled: false, automaticMeasurement: { eligible: false, basis: "automatic" } });
  }
  for (const retiredSwitch of [undefined, "false", "true"]) {
    const response = configAPI.onRequestGet({ env: { META_TRACKING_ENABLED: "true", META_DATASET_ID: config.datasetId, META_EMAIL_MATCHING_ENABLED: retiredSwitch, META_ACCESS_TOKEN: "never-expose-this" } });
    assert.deepEqual(await response.json(), { ...config, emailMatchingEnabled: true, automaticMeasurement: { eligible: false, basis: "automatic" } });
  }
  assert.deepEqual(normalizeMetaConfig({ enabled: "true", datasetId: config.datasetId, accessToken: "never" }), { enabled: false, datasetId: "", emailMatchingEnabled: false });
});

test("registry permission requires an acknowledged grant for an unchanged, nonstale local decision", async () => {
  const allow = await registryAllow(consent);
  assert.equal(registryMetaConsentAllowed(allow, consent), true);
  for (const answer of [{ ...allow, ok: false }, { ...allow, effective: { advertising: false } }, { ...allow, decidedAt: consent.decidedAt - 1 }]) assert.equal(registryMetaConsentAllowed(answer, consent), false);
  for (const changed of [{ ...consent, advertising: false }, { ...consent, decidedAt: consent.decidedAt + 1 }, { ...consent, consentId: "different" }, { ...consent, consentId: "" }]) assert.equal(registryMetaConsentAllowed(allow, changed, consent), false);
});

test("payment proof capture reads only exact welcome and ignores caller money/email", () => {
  let savedReads = 0, windowReads = 0;
  const options = { getWindow: () => { windowReads += 1; return { location: new URL("https://pelvi.health/welcome?paid=1&value=1&email=ignored%40example.com") }; }, readSaved: () => { savedReads += 1; return "pi_saved123_secret_savedProof"; } };
  for (const path of ["/", "/app", "/diastasis-recti", "/welcome/start"]) assert.equal(captureWelcomePaymentProof(path, options), "");
  assert.equal(savedReads, 0); assert.equal(windowReads, 0);
  assert.equal(captureWelcomePaymentProof("/welcome", options), "pi_saved123_secret_savedProof"); assert.equal(savedReads, 1);
  assert.equal(captureWelcomePaymentProof("/welcome", { ...options, getWindow: () => ({ location: new URL("https://pelvi.health/welcome?payment_intent_client_secret=pi_url123_secret_urlProof&value=1") }) }), "pi_url123_secret_urlProof");
  assert.equal(savedReads, 1, "URL proof takes priority without reading session storage");
  assert.equal(captureWelcomePaymentProof("/welcome", { ...options, getWindow: () => ({ location: new URL("https://pelvi.health/app?payment_intent_client_secret=pi_url123_secret_urlProof") }) }), "");
});

test("verified receipts are allowlisted, bounded and deduplicated across remounts", () => {
  const storage = memoryStorage();
  const store = createMetaPurchaseStore({ getStorage: () => storage });
  assert.equal(store.queue({ ...event, email: "not-stored@example.com", answers: { symptom: "never" }, clientSecret: "never" }), true);
  assert.equal(store.queue({ ...event, value: 999 }), false);
  assert.equal(store.flush(() => false), 0);
  let payload;
  assert.equal(store.flush(value => { payload = value; return true; }), 1);
  assert.deepEqual(payload, { name: "Purchase", data: { value: event.value, currency: "USD" }, options: { eventID: event.eventId } });
  assert.doesNotMatch(storage.getItem(META_PURCHASE_KEY), /email|answers|symptom|clientSecret|never/);
  const remount = createMetaPurchaseStore({ getStorage: () => storage });
  assert.equal(remount.queue(event), false);
  assert.equal(remount.flush(() => { throw new Error("must not re-emit"); }), 0);
});

test("failed delivery retains the outcome, blocked storage falls back to memory, and stale receipts expire", () => {
  let time = 1800000000000;
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  const store = createMetaPurchaseStore({ getStorage: () => blocked, now: () => time });
  assert.equal(store.queue(event), true);
  assert.equal(store.flush(() => { throw new Error("tag unavailable"); }), 0);
  assert.equal(store.pending().length, 1);
  assert.equal(store.flush(() => true), 1);
  assert.equal(store.queue(event), false);
  assert.equal(store.queue({ ...event, eventId: "purchase_other123" }), true);
  time += META_PURCHASE_TTL_MS;
  assert.deepEqual(store.pending(), []);
  for (const invalid of [{ value: NaN }, { value: Infinity }, { value: -1 }, { value: "29.99" }, { currency: "usd" }, { eventId: "email_private_person" }, { eventId: "purchase with spaces" }]) assert.equal(store.queue({ ...event, ...invalid }), false);
});

test("reentrant flushing cannot duplicate a receipt", () => {
  const store = createMetaPurchaseStore(); store.queue(event); let calls = 0;
  assert.equal(store.flush(() => { calls += 1; assert.equal(store.flush(() => true), 0); return true; }), 1);
  assert.equal(calls, 1);
});

test("Pixel waits for registry acknowledgment and rejects denied/stale responses", async () => {
  const f = fixture(), registry = deferred();
  f.options.getRegistryConsent = () => registry.promise;
  const controller = createMetaPixelController(f.options), run = controller.start();
  await new Promise(resolve => setImmediate(resolve)); assert.equal(f.loads, 0); assert.equal(f.scope.fbq, undefined);
  registry.resolve(await registryAllow(consent)); assert.equal(await run, true); assert.equal(f.loads, 1); controller.dispose();
  for (const reply of [{ ok: false }, { ok: true, effective: { advertising: false }, decidedAt: consent.decidedAt }, { ok: true, effective: { advertising: true }, decidedAt: consent.decidedAt - 1 }]) {
    const denied = fixture(); denied.options.getRegistryConsent = async () => reply;
    const blocked = createMetaPixelController(denied.options); assert.equal(await blocked.start(), false); assert.equal(denied.loads, 0); blocked.dispose();
  }
});

test("a decision changed while registry synchronization is pending cannot load a script", async () => {
  const f = fixture(), registry = deferred(); f.options.getRegistryConsent = () => registry.promise;
  const controller = createMetaPixelController(f.options), run = controller.start();
  await new Promise(resolve => setImmediate(resolve)); f.setConsent({ ...consent, decidedAt: consent.decidedAt + 1 });
  registry.resolve(await registryAllow(consent)); assert.equal(await run, false); assert.equal(f.loads, 0); controller.dispose();
});

test("consent revocation reloads a clean document and prevents later purchases", async () => {
  const f = fixture("https://pelvi.health/welcome"), controller = createMetaPixelController(f.options);
  await controller.start(); f.setConsent({ advertising: false });
  f.scope.dispatchEvent(new Event("pelvi:privacy-choice"));
  assert.equal(f.reloads, 0);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.reloads, 1);
  f.options.purchases.queue(event); assert.equal(await controller.refresh(), false);
  assert.equal(f.calls.filter(call => call[2] === "Purchase").length, 0);
  controller.dispose();
});

test("cross-tab withdrawal revokes immediately but a failed withdrawal persistence never reloads stale permission", async () => {
  for (const persistenceBlocked of [false, true]) {
    const f = fixture(); f.options.persistenceBlocked = () => persistenceBlocked;
    const controller = createMetaPixelController(f.options); await controller.start();
    f.setConsent({ ...consent, advertising: false });
    const storageEvent = new Event("storage"); Object.defineProperty(storageEvent, "key", { value: "pelvi.privacy.v1" });
    f.scope.dispatchEvent(storageEvent);
    assert.ok(f.calls.some(call => call[0] === "consent" && call[1] === "revoke"));
    assert.equal(f.reloads, 0);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.reloads, persistenceBlocked ? 0 : 1);
    f.setConsent(consent); assert.equal(await controller.refresh(), false, "revoked runtime stays stopped until a fresh document");
    controller.dispose();
  }
});

test("withdrawal revokes now and waits for registry acknowledgment before reload", async () => {
  const f = fixture(), acknowledgment = deferred(); let withdrawals = 0;
  f.options.getRegistryConsent = choice => {
    if (choice.advertising) return registryAllow(choice);
    withdrawals += 1; return acknowledgment.promise;
  };
  const controller = createMetaPixelController(f.options); await controller.start();
  f.setConsent({ ...consent, advertising: false }); f.scope.dispatchEvent(new Event("pelvi:privacy-choice"));
  assert.ok(f.calls.some(call => call[0] === "consent" && call[1] === "revoke")); assert.equal(f.reloads, 0);
  await new Promise(resolve => setImmediate(resolve)); assert.equal(withdrawals, 1); assert.equal(f.reloads, 0);
  assert.equal(await controller.refresh(), false); assert.equal(f.reloads, 0, "concurrent refresh cannot bypass pending withdrawal");
  acknowledgment.resolve({ ok: true, effective: { advertising: false }, decidedAt: consent.decidedAt });
  await new Promise(resolve => setImmediate(resolve)); assert.equal(f.reloads, 1); controller.dispose();
});

test("withdrawal reload wait is bounded even if registry synchronization never settles", async () => {
  const f = fixture();
  f.options.withdrawalTimeoutMs = 10;
  f.options.getRegistryConsent = choice => choice.advertising ? registryAllow(choice) : new Promise(() => {});
  const controller = createMetaPixelController(f.options); await controller.start();
  f.setConsent({ ...consent, advertising: false }); f.scope.dispatchEvent(new Event("pelvi:privacy-choice"));
  assert.equal(f.reloads, 0);
  await new Promise(resolve => setTimeout(resolve, 25)); assert.equal(f.reloads, 1); controller.dispose();
});

test("local or registry consent withdrawal preserves an active payment dialog until it closes", async () => {
  for (const mode of ["local", "registry"]) {
    const f = fixture(); let registryDenied = false;
    f.options.getRegistryConsent = choice => registryDenied ? Promise.resolve({ ok: true, effective: { advertising: false }, decidedAt: consent.decidedAt }) : registryAllow(choice);
    const controller = createMetaPixelController(f.options); await controller.start();
    f.doc.querySelector = () => ({ paymentForm: true });
    if (mode === "local") { f.setConsent({ ...consent, advertising: false }); f.scope.dispatchEvent(new Event("pelvi:privacy-choice")); }
    else { registryDenied = true; await controller.refresh(); }
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(f.calls.some(call => call[0] === "consent" && call[1] === "revoke"), mode);
    assert.equal(f.reloads, 0, `${mode} denial must preserve the confirmation form`);
    f.doc.querySelector = () => null; f.doc.dispatchEvent(new Event("close"));
    assert.equal(f.reloads, 1, mode); controller.dispose();
  }
});

test("Strict Mode replacement can await the same in-flight script without duplicate PageView or Purchase", async () => {
  const f = fixture("https://pelvi.health/welcome"), loading = deferred(); let loads = 0;
  f.options.loadScript = async () => { loads += 1; await loading.promise; f.scope.fbq.callMethod = (...args) => f.calls.push(args); };
  f.options.purchases.queue(event);
  const first = createMetaPixelController(f.options), firstRun = first.start();
  await new Promise(resolve => setImmediate(resolve)); first.dispose();
  const second = createMetaPixelController(f.options), secondRun = second.start();
  await new Promise(resolve => setImmediate(resolve)); loading.resolve();
  await Promise.all([firstRun, secondRun]);
  assert.equal(loads, 1); assert.equal(f.calls.filter(call => call[2] === "PageView").length, 1); assert.equal(f.calls.filter(call => call[2] === "Purchase").length, 1);
  second.dispose();
});

test("receipt reporting uses first-party verified results, current consent, and no caller amount or email", async () => {
  let request, queued;
  const options = { getConsent: () => consent, getRegistryConsent: registryAllow, getAttribution: () => currentMarketing, queue: value => { queued = value; return true; }, fetcher: async (url, init) => { request = { url, init }; return { ok: true, json: async () => ({ sent: true, ...event, email: "never-forward@example.com" }) }; } };
  assert.equal(await reportVerifiedMetaPurchase("pi_fixture_secret_fixture", options), true);
  assert.equal(request.url, "/api/meta-purchase"); assert.equal(request.init.credentials, "same-origin"); assert.equal(request.init.keepalive, true);
  assert.deepEqual(JSON.parse(request.init.body), { clientSecret: "pi_fixture_secret_fixture", marketing: currentMarketing });
  assert.deepEqual(queued, event);
  for (const result of [{ sent: false, ...event }, { sent: true, ...event, value: "29.99" }, { sent: true, ...event, eventId: "diastasis_purchase" }]) {
    assert.equal(await reportVerifiedMetaPurchase("pi_fixture_secret_fixture", { ...options, fetcher: async () => ({ ok: true, json: async () => result }) }), false);
  }
});

test("denied consent avoids receipt requests, a revoked choice prevents queueing, and stalled requests expire", async () => {
  let calls = 0, choice = consent, queued = 0;
  const options = { getConsent: () => choice, getRegistryConsent: registryAllow, getAttribution: () => currentMarketing, queue: () => { queued += 1; return true; }, fetcher: async () => { calls += 1; return { ok: true, json: async () => ({ sent: true, ...event }) }; } };
  choice = { advertising: false };
  assert.equal(await reportVerifiedMetaPurchase("pi_fixture_secret_fixture", options), false); assert.equal(calls, 0);
  choice = consent;
  assert.equal(await reportVerifiedMetaPurchase("pi_fixture_secret_fixture", { ...options, fetcher: async () => { choice = { advertising: false }; return { ok: true, json: async () => ({ sent: true, ...event }) }; } }), false);
  assert.equal(queued, 0);
  choice = consent;
  assert.equal(await reportVerifiedMetaPurchase("pi_fixture_secret_fixture", { ...options, timeoutMs: 10, fetcher: () => new Promise(() => {}) }), false);
});

test("registry and receipt reporting share one timeout and a late grant cannot start a receipt request", async () => {
  const registry = deferred(); let requests = 0;
  const result = await reportVerifiedMetaPurchase("pi_fixture_secret_fixture", { getConsent: () => consent, getRegistryConsent: () => registry.promise,
    getAttribution: () => currentMarketing, timeoutMs: 10, fetcher: async () => { requests += 1; return { ok: true, json: async () => ({ sent: true, ...event }) }; } });
  assert.equal(result, false); assert.equal(requests, 0);
  registry.resolve(await registryAllow(consent)); await new Promise(resolve => setImmediate(resolve)); assert.equal(requests, 0);
});

// Owner decision (Oct 2026, testing phase): the Pixel runs on every page except
// /admin, with any query string and referrer.
test("every page, query and referrer is eligible except the owner's admin dashboard", () => {
  for (const href of ["https://pelvi.health/", "https://www.pelvi.health/", "https://pelvi.health/diastasis-recti", "https://pelvi.health/diastasis-recti?utm_source=meta&utm_campaign=diastasis",
    "https://pelvi.health/stop-bladder-leaks?fbclid=IwAR_opaqueClickIdentifier1234", "https://pelvi.health/app", "https://pelvi.health/app/insights?ask=1", "https://pelvi.health/welcome?paid=1"]) {
    assert.equal(metaPixelPageAllowed({ href, referrer: "https://pelvi.health/diastasis-recti" }), true, href);
  }
  for (const href of ["https://pelvi.health/admin", "https://pelvi.health/admin/members", "https://preview.pages.dev/", "http://localhost:3100/", "not a URL"]) {
    assert.equal(metaPixelPageAllowed({ href }), false, href);
  }
});

test("a condition landing page sends PageView, a queued InitiateCheckout and a verified Purchase", async () => {
  const f = fixture("https://pelvi.health/diastasis-recti?utm_source=meta", "https://l.instagram.com/");
  f.options.purchases.queue(event);
  const previous = globalThis.window;
  globalThis.window = { dispatchEvent() { return true; } };
  try { assert.equal(api.trackMetaInitiateCheckout({ value: 24.99, currency: "usd" }), true); } finally { globalThis.window = previous; }
  const controller = createMetaPixelController(f.options);
  assert.equal(await controller.start(), true);
  assert.deepEqual(f.calls, [
    ["trackSingle", config.datasetId, "PageView"],
    ["trackSingle", config.datasetId, "InitiateCheckout", { value: 24.99, currency: "USD" }],
    ["trackSingle", config.datasetId, "Purchase", { value: 29.99, currency: "USD" }, { eventID: event.eventId }],
  ]);
  controller.dispose();
});

test("the member area loads the Pixel and the admin dashboard does not", async () => {
  const member = fixture("https://pelvi.health/app"), memberController = createMetaPixelController(member.options);
  assert.equal(await memberController.start(), true);
  assert.deepEqual(member.calls, [["trackSingle", config.datasetId, "PageView"]]);
  memberController.dispose();
  const admin = fixture("https://pelvi.health/admin"), adminController = createMetaPixelController(admin.options);
  assert.equal(await adminController.start(), false);
  assert.equal(admin.loads, 0);
  adminController.dispose();
});
