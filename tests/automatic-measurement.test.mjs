import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../public/marketing-consent.js", import.meta.url), "utf8");
let instance = 0;
const api = () => import("data:text/javascript;base64," + Buffer.from(source).toString("base64") + "#automatic-" + ++instance);
const now = 1800000000000;
const consentId = "eab9b6c7-e67c-4aef-bbfa-89f858aa0766";
const eligible = { automaticMeasurement: { eligible: true, basis: "automatic" } };
const response = (body) => ({ ok: true, json: async () => body });
function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
function storage(initial) {
  let value = initial ?? null;
  const writes = [];
  return { getItem: () => value, setItem: (_, next) => { value = next; writes.push(JSON.parse(next)); }, removeItem: () => { value = null; }, writes };
}
const saved = (values = {}) => JSON.stringify({ v: 1, analytics: true, advertising: true, matching: true, consentId, decidedAt: now, ...values });
const context = (store) => ({ allowed: true, storage: store, browser: {}, now, document: null, notify: false });

test("ineligible, unknown, malformed and failed config responses leave visitors cookieless without an ID", async () => {
  for (const config of [{ automaticMeasurement: { eligible: false, basis: "automatic" } }, {}, { automaticMeasurement: { eligible: true } }, { automaticMeasurement: { eligible: "true", basis: "automatic" } }, null]) {
    const consent = await api(), store = storage(), options = context(store);
    const choice = await consent.bootstrapMarketingConsent({ ...options, fetch: async () => response(config) });
    assert.equal(choice.decided, false);
    assert.equal(choice.analytics, false);
    assert.equal(choice.advertising, false);
    assert.equal(choice.consentId, "");
    assert.equal(store.writes.length, 0);
    assert.equal(consent.clarityConsentPolicy(choice, { browser: {} }).analyticsStorage, "denied");
  }
  const consent = await api(), store = storage();
  const choice = await consent.bootstrapMarketingConsent({ ...context(store), fetch: async () => { throw new Error("offline"); } });
  assert.equal(choice.decided, false);
  assert.equal(store.writes.length, 0);
});

test("simultaneous bootstrap callers share the policy request and one generated setting", async () => {
  const consent = await api(), store = storage(), pending = deferred();
  let requests = 0;
  const options = { ...context(store), fetch: () => { requests += 1; return pending.promise; } };
  const works = Array.from({ length: 3 }, () => consent.bootstrapMarketingConsent(options));
  await Promise.resolve(); assert.equal(requests, 1);
  pending.resolve(response(eligible));
  const choices = await Promise.all(works);
  assert.equal(new Set(choices.map((choice) => choice.consentId)).size, 1);
  assert.equal(store.writes.length, 1);
  const repeated = await consent.bootstrapMarketingConsent({ ...options, now: now + 100 });
  assert.equal(repeated.consentId, choices[0].consentId);
  assert.equal(repeated.decidedAt, choices[0].decidedAt, "privacy-event rechecks cannot refresh the automatic timestamp");
  assert.equal(store.writes.length, 1, "a privacy event cannot recursively persist or dispatch another choice");
  assert.equal(requests, 1);
});

test("a saved opt-out or navigation during the policy request prevents a stale automatic grant", async () => {
  for (const change of ["choice", "route"]) {
    const consent = await api(), store = storage(), pending = deferred();
    let publicRoute = true;
    const options = { ...context(store), allowed: () => publicRoute, fetch: () => pending.promise };
    const work = consent.bootstrapMarketingConsent(options);
    if (change === "choice") consent.writeMarketingConsent({}, options);
    else publicRoute = false;
    pending.resolve(response(eligible));
    const choice = await work;
    assert.equal(choice.advertising, false);
    assert.equal(store.writes.some((write) => write.basis === "automatic"), false);
  }
});

test("automatic settings are revalidated per document while retaining their first-party ID", async () => {
  const consent = await api(), store = storage(saved({ basis: "automatic", matching: false })), options = context(store);
  const pending = consent.readMarketingConsent(options);
  assert.equal(pending.decided, false);
  assert.equal(pending.analytics, false);
  assert.equal(pending.advertising, false);
  const verified = await consent.bootstrapMarketingConsent({ ...options, fetch: async () => response(eligible) });
  assert.equal(verified.advertising, true);
  assert.equal(verified.consentId, consentId);
  assert.equal(store.writes.length, 1, "a fresh policy check refreshes the same ID's automatic decision");
  const nextDocument = await api();
  assert.equal(nextDocument.readMarketingConsent(options).advertising, false);
  const restricted = await nextDocument.bootstrapMarketingConsent({ ...options, fetch: async () => response({ automaticMeasurement: { eligible: false, basis: "automatic" } }) });
  assert.equal(restricted.decided, false);
  assert.equal(restricted.advertising, false);
  assert.equal(store.writes.length, 1, "a regional restriction creates no new preference or ID");
});

test("a newly restricted document revokes retained automatic attribution in the registry", async () => {
  const consent = await api(), store = storage(saved({ basis: "automatic", matching: false })), calls = [];
  const options = { ...context(store), now: now + 1, fetch: async (url, init) => {
    calls.push({ url, init });
    if (url === "/api/marketing-config") return response({ automaticMeasurement: { eligible: false, basis: "automatic" } });
    const body = JSON.parse(init.body);
    return response({ ok: true, effective: { advertising: body.advertising, matching: body.matching }, decidedAt: body.decidedAt });
  } };
  const restricted = await consent.bootstrapMarketingConsent(options);
  assert.deepEqual(calls.map((call) => call.url), ["/api/marketing-config", "/api/marketing-consent"]);
  const denial = JSON.parse(calls[1].init.body);
  assert.equal(denial.consentId, consentId);
  assert.equal(denial.basis, "automatic");
  assert.equal(denial.decidedAt, now + 1);
  assert.equal(denial.advertising, false, "retained intent and renewal attribution must see a registry denial");
  assert.equal(denial.analytics, false);
  assert.equal(denial.matching, false);
  assert.equal(restricted.decided, false);
  assert.equal(consent.clarityConsentPolicy(restricted, { browser: {} }).analyticsStorage, "denied");
  assert.equal(store.writes.length, 0);
  const nextDocument = await api();
  const restored = await nextDocument.bootstrapMarketingConsent({ ...context(store), now: now + 2, fetch: async () => response(eligible) });
  assert.equal(restored.consentId, consentId);
  assert.equal(restored.basis, "automatic");
  assert.equal(restored.advertising, true);
  assert.equal(restored.decidedAt, now + 2, "only a newer automatic decision can supersede the earlier geographic restriction");
});

test("unknown or failed policy checks also narrow an existing automatic registry grant", async () => {
  for (const result of [{ ok: false }, response({}), new Error("offline")]) {
    const consent = await api(), store = storage(saved({ basis: "automatic", matching: false })), calls = [];
    const choice = await consent.bootstrapMarketingConsent({ ...context(store), now: now + 1, fetch: async (url, init) => {
      calls.push({ url, init });
      if (url === "/api/marketing-config") {
        if (result instanceof Error) throw result;
        return result;
      }
      return response({ ok: true, effective: { advertising: false, matching: false }, decidedAt: now + 1 });
    } });
    assert.deepEqual(calls.map((call) => call.url), ["/api/marketing-config", "/api/marketing-consent"]);
    const denial = JSON.parse(calls[1].init.body);
    assert.equal(denial.consentId, consentId);
    assert.equal(denial.basis, "automatic");
    assert.equal(denial.advertising, false);
    assert.equal(choice.advertising, false);
    assert.equal(store.writes.length, 0);
  }
});

test("a caller cannot label a settings action automatic or create an automatic ID without secure randomness", async () => {
  const consent = await api(), store = storage(), options = context(store);
  const choice = consent.writeMarketingConsent({ analytics: true, advertising: true, basis: "automatic" }, options);
  assert.notEqual(choice.basis, "automatic");
  const fresh = await api(), otherStore = storage();
  const unavailable = await fresh.bootstrapMarketingConsent({ ...context(otherStore), crypto: null, fetch: async () => response(eligible) });
  assert.equal(unavailable.decided, false);
  assert.equal(unavailable.consentId, "");
  assert.equal(otherStore.writes.length, 0);
});

test("a timed-out bootstrap cannot apply a late policy response", async () => {
  const consent = await api(), store = storage(), pending = deferred();
  let expire;
  const work = consent.bootstrapMarketingConsent({ ...context(store), fetch: () => pending.promise, schedule: (callback) => { expire = callback; return 1; }, cancel: () => {} });
  expire();
  assert.equal((await work).advertising, false);
  pending.resolve(response(eligible)); await new Promise((resolve) => setImmediate(resolve));
  assert.equal(store.writes.length, 0);
});

test("failed registry acknowledgement and a late withdrawal omit optional checkout attribution", async () => {
  for (const withdraw of [false, true]) {
    const consent = await api(), store = storage(), pending = deferred(), options = context(store);
    const work = consent.marketingAttributionForCheckout({ ...options, location: { hostname: "pelvi.health", search: "" }, fetch: async (url) => url === "/api/marketing-config" ? response(eligible) : pending.promise });
    await new Promise((resolve) => setImmediate(resolve));
    if (withdraw) consent.writeMarketingConsent({}, { ...options, now: now + 1 });
    pending.resolve(response(withdraw ? { ok: true, effective: { advertising: true, matching: false }, decidedAt: now } : { ok: false }));
    assert.equal(await work, undefined);
  }
});
