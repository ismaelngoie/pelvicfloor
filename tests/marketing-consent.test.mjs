import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../public/marketing-consent.js", import.meta.url), "utf8");
const moduleURL = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
let instance = 0;
const api = () => import(`${moduleURL}#fresh-${++instance}`);
const now = 1800000000000;
const empty = { decided: false, analytics: false, advertising: false, matching: false, decidedAt: 0, consentId: "" };
const consentId = "eab9b6c7-e67c-4aef-bbfa-89f858aa0766";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function storage(initial) {
  const values = new Map(initial === undefined ? [] : [["pelvi.privacy.v1", initial]]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    values,
  };
}
const saved = (overrides = {}) => JSON.stringify({ v: 1, analytics: true, advertising: true, matching: true, decidedAt: now, consentId, ...overrides });

function cookieDocument({ cookie = "", hostname = "pelvi.health", readBlocked = false, writeBlocked = false } = {}) {
  const jar = new Map(cookie.split(/;\s*/).filter(Boolean).map((part) => { const equal = part.indexOf("="); return [part.slice(0, equal), part.slice(equal + 1)]; }));
  const writes = [];
  return {
    location: { hostname }, writes,
    get cookie() { if (readBlocked) throw new Error("cookie read blocked"); return [...jar].map(([key, value]) => `${key}=${value}`).join("; "); },
    set cookie(value) {
      if (writeBlocked) throw new Error("cookie write blocked");
      writes.push(value);
      const [pair] = value.split(";");
      const equal = pair.indexOf("=");
      const key = pair.slice(0, equal), data = pair.slice(equal + 1);
      if (/Max-Age=0(?:;|$)/.test(value)) jar.delete(key);
      else jar.set(key, data);
    },
  };
}

function installGlobal(name, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  return () => { if (previous) Object.defineProperty(globalThis, name, previous); else delete globalThis[name]; };
}

test("a new or browserless visit is undecided and all optional processing is off", async () => {
  const consent = await api();
  assert.deepEqual(consent.readMarketingConsent({ storage: null, browser: {}, now }), empty);
  assert.deepEqual(consent.readMarketingConsent({ storage: storage(), browser: {}, now }), empty);
  const result = consent.readMarketingConsent({ storage: null, browser: {}, now });
  result.analytics = true;
  assert.deepEqual(consent.readMarketingConsent({ storage: null, browser: {}, now }), empty, "callers cannot mutate the default choice");
});

test("the three choices remain independent and matching always requires advertising consent", async () => {
  for (const analytics of [false, true]) for (const advertising of [false, true]) for (const matching of [false, true]) {
    const consent = await api(), store = storage();
    const applied = consent.writeMarketingConsent({ analytics, advertising, matching }, { storage: store, browser: {}, now, notify: false });
    assert.match(applied.consentId, uuidPattern);
    assert.deepEqual(applied, { decided: true, analytics, advertising, matching: advertising && matching, decidedAt: now, consentId: applied.consentId });
    assert.deepEqual(consent.readMarketingConsent({ storage: store, browser: {}, now: now + 1000 }), applied);
    assert.deepEqual(JSON.parse(store.getItem(consent.MARKETING_CONSENT_KEY)), { v: 1, analytics, advertising, matching: advertising && matching, decidedAt: now, consentId: applied.consentId });
  }
});

test("truthy strings and unknown fields cannot opt a visitor in or persist PII", async () => {
  const consent = await api(), store = storage();
  const applied = consent.writeMarketingConsent({ analytics: "true", advertising: 1, matching: true, email: "person@example.com", uid: "member-1", token: "private", healthAnswers: ["pain"] }, { storage: store, browser: {}, now, notify: false });
  assert.match(applied.consentId, uuidPattern);
  assert.deepEqual(applied, { decided: true, analytics: false, advertising: false, matching: false, decidedAt: now, consentId: applied.consentId });
  const record = store.getItem(consent.MARKETING_CONSENT_KEY);
  assert.deepEqual(Object.keys(JSON.parse(record)).sort(), ["v", "analytics", "advertising", "matching", "decidedAt", "consentId"].sort());
  assert.doesNotMatch(record, /person@|member-1|private|healthAnswers|pain|uid|email|token/);
});

test("GPC suppresses advertising and matching while respecting the separate analytics choice", async () => {
  const consent = await api(), store = storage(saved());
  assert.deepEqual(consent.readMarketingConsent({ storage: store, browser: { globalPrivacyControl: true }, now }), { decided: true, analytics: true, advertising: false, matching: false, decidedAt: now, consentId });
  assert.equal(consent.readMarketingConsent({ storage: store, browser: {}, now }).advertising, true, "a browser override does not rewrite an explicit saved choice");
});

test("Do Not Track overrides analytics, advertising and matching on reads and writes", async () => {
  for (const doNotTrack of ["1", "yes", "YES", 1]) {
    const consent = await api(), store = storage(saved());
    const expected = { decided: true, analytics: false, advertising: false, matching: false, decidedAt: now, consentId };
    assert.deepEqual(consent.readMarketingConsent({ storage: store, browser: { doNotTrack }, now }), expected);
    assert.deepEqual(consent.writeMarketingConsent({ analytics: true, advertising: true, matching: true }, { storage: store, browser: { doNotTrack }, now, notify: false }), expected);
  }
  const consent = await api();
  assert.equal(consent.readMarketingConsent({ storage: storage(saved()), browser: { doNotTrack: "0" }, now }).analytics, true);
});

test("expired choices become undecided instead of silently renewing optional processing", async () => {
  const consent = await api(), store = storage(saved());
  assert.equal(consent.readMarketingConsent({ storage: store, browser: {}, now: now + consent.MARKETING_CONSENT_TTL - 1 }).decided, true);
  assert.deepEqual(consent.readMarketingConsent({ storage: store, browser: {}, now: now + consent.MARKETING_CONSENT_TTL + 1 }), empty);
  assert.equal(JSON.parse(store.getItem(consent.MARKETING_CONSENT_KEY)).decidedAt, now, "reading never refreshes a consent timestamp");
});

test("corrupt, unsupported, missing and future-dated records fail closed", async () => {
  const invalid = ["not-json", "null", "[]", '"yes"', saved({ v: 2 }), saved({ v: 0 }), saved({ decidedAt: "1800000000000" }), saved({ decidedAt: null }), saved({ decidedAt: now + 60001 }), JSON.stringify({ v: 1, analytics: true, advertising: true })];
  for (const record of invalid) {
    const consent = await api();
    assert.deepEqual(consent.readMarketingConsent({ storage: storage(record), browser: {}, now }), empty, record);
  }
});

test("read and write failures retain only the explicit choice for this visit", async () => {
  const consent = await api();
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  assert.deepEqual(consent.readMarketingConsent({ storage: blocked, browser: {}, now }), empty);
  const applied = consent.writeMarketingConsent({ analytics: true }, { storage: blocked, browser: {}, now, notify: false });
  assert.match(applied.consentId, uuidPattern);
  const expected = { decided: true, analytics: true, advertising: false, matching: false, decidedAt: now, consentId: applied.consentId };
  assert.deepEqual(applied, expected);
  assert.deepEqual(consent.readMarketingConsent({ storage: blocked, browser: {}, now: now + 1000 }), expected);
  assert.deepEqual(consent.readMarketingConsent({ storage: blocked, browser: {}, now: now + consent.MARKETING_CONSENT_TTL + 1 }), empty);
  const freshVisit = await api();
  assert.deepEqual(freshVisit.readMarketingConsent({ storage: blocked, browser: {}, now }), empty);
});

test("a throwing browser storage getter cannot break a choice or create automatic consent", async () => {
  const consent = await api();
  const scope = {};
  Object.defineProperty(scope, "localStorage", { get() { throw new Error("browser disallows storage"); } });
  const restore = installGlobal("window", scope);
  try {
    assert.deepEqual(consent.readMarketingConsent({ browser: {}, now }), empty);
    assert.equal(consent.writeMarketingConsent({ analytics: true }, { browser: {}, now, notify: false }).analytics, true);
    assert.equal(consent.readMarketingConsent({ browser: {}, now }).advertising, false);
  } finally { restore(); }
});

test("withdrawal immediately resets matching and emits only anonymous effective choices", async () => {
  const consent = await api(), store = storage();
  const events = [];
  const restoreWindow = installGlobal("window", { dispatchEvent: (event) => events.push(event) });
  const restoreEvent = installGlobal("CustomEvent", class { constructor(type, { detail }) { this.type = type; this.detail = detail; } });
  try {
    consent.writeMarketingConsent({ analytics: true, advertising: true, matching: true }, { storage: store, browser: {}, now });
    const withdrawn = consent.writeMarketingConsent({ analytics: false, advertising: false, matching: true, email: "person@example.com", token: "private" }, { storage: store, browser: {}, now: now + 1 });
    assert.match(withdrawn.consentId, uuidPattern);
    assert.equal(withdrawn.consentId, events[0].detail.consentId);
    assert.deepEqual(withdrawn, { decided: true, analytics: false, advertising: false, matching: false, decidedAt: now + 1, consentId: withdrawn.consentId });
    assert.deepEqual(consent.readMarketingConsent({ storage: store, browser: {}, now: now + 2 }), withdrawn);
    assert.equal(events.length, 2);
    assert.equal(events[1].type, consent.MARKETING_CONSENT_EVENT);
    assert.deepEqual(events[1].detail, withdrawn);
    assert.doesNotMatch(JSON.stringify(events), /person@|private|email|token/);
    assert.deepEqual(Object.keys(events[1].detail).sort(), ["decided", "analytics", "advertising", "matching", "decidedAt", "consentId"].sort());
    consent.writeMarketingConsent({}, { storage: store, browser: {}, now: now + 3, notify: false });
    assert.equal(events.length, 2, "notify:false is quiet");
  } finally { restoreEvent(); restoreWindow(); }
});

test("a changed persisted choice is honored on subsequent reads without an account identity", async () => {
  const consent = await api(), store = storage();
  consent.writeMarketingConsent({ analytics: true, advertising: true, matching: true }, { storage: store, browser: {}, now, notify: false });
  store.setItem(consent.MARKETING_CONSENT_KEY, saved({ analytics: false, advertising: false, matching: false, decidedAt: now + 1 }));
  assert.deepEqual(consent.readMarketingConsent({ storage: store, browser: {}, now: now + 2 }), { decided: true, analytics: false, advertising: false, matching: false, decidedAt: now + 1, consentId });
});

test("a failed withdrawal write removes stale consent before a fresh visit", async () => {
  const consent = await api(), store = storage(saved());
  store.setItem = () => { throw new Error("quota full"); };
  const result = consent.writeMarketingConsent({}, { storage: store, browser: {}, now: now + 1, notify: false, document: null });
  assert.equal(result.analytics, false);
  assert.equal(store.getItem(consent.MARKETING_CONSENT_KEY), null);
  const freshVisit = await api();
  assert.deepEqual(freshVisit.readMarketingConsent({ storage: store, browser: {}, now: now + 2, document: null }), empty);
});

test("a first-party withdrawal cookie preserves the consent capability and overrides stale allows", async () => {
  const consent = await api(), store = storage(saved()), doc = cookieDocument();
  store.setItem = () => { throw new Error("write blocked"); };
  store.removeItem = () => { throw new Error("remove blocked"); };
  const result = consent.writeMarketingConsent({}, { storage: store, browser: {}, now: now + 1, notify: false, document: doc });
  assert.equal(result.analytics, false);
  assert.equal(result.advertising, false);
  assert.equal(result.matching, false);
  assert.match(doc.cookie, /pelvi_privacy_denied=1/);
  assert.equal(doc.writes[0], `pelvi_privacy_denied=1.${consentId}.${now + 1}; Path=/; Max-Age=15552000; SameSite=Lax; Secure`);

  const freshVisit = await api();
  const restored = freshVisit.readMarketingConsent({ storage: store, browser: {}, now: now + 2, document: doc });
  assert.equal(restored.decided, true);
  assert.equal(restored.analytics, false);
  assert.equal(restored.advertising, false);
  assert.equal(restored.matching, false);
  assert.equal(restored.consentId, consentId);
  assert.equal(restored.decidedAt, now + 1);
  assert.doesNotMatch(doc.cookie, /email|token|member|health|person/);
});

test("an explicit decision creates an unguessable UUID that remains stable across later decisions", async () => {
  const consent = await api(), store = storage();
  const first = consent.writeMarketingConsent({ analytics: true, advertising: true, matching: true, consentId: "client-supplied-id" }, { storage: store, browser: {}, now, notify: false, document: null });
  assert.match(first.consentId, uuidPattern);
  assert.notEqual(first.consentId, "client-supplied-id");
  const denied = consent.writeMarketingConsent({}, { storage: store, browser: {}, now: now + 1, notify: false, document: null });
  const allowed = consent.writeMarketingConsent({ advertising: true }, { storage: store, browser: {}, now: now + 2, notify: false, document: null });
  assert.equal(denied.consentId, first.consentId);
  assert.equal(allowed.consentId, first.consentId);
  const freshVisit = await api();
  assert.equal(freshVisit.readMarketingConsent({ storage: store, browser: {}, now: now + 3, document: null }).consentId, first.consentId);
});

test("legacy consent requires a new explicit advertising decision before receiving a capability", async () => {
  const consent = await api(), legacy = JSON.parse(saved());
  delete legacy.consentId;
  const store = storage(JSON.stringify(legacy));
  const prior = consent.readMarketingConsent({ storage: store, browser: {}, now, document: null });
  assert.equal(prior.analytics, true);
  assert.equal(prior.advertising, false);
  assert.equal(prior.matching, false);
  assert.equal(prior.consentId, "");
  let requests = 0;
  assert.equal((await consent.syncMarketingConsent(prior, { now, fetch: async () => { requests += 1; } })).ok, false);
  assert.equal(requests, 0);
  const current = consent.writeMarketingConsent({ advertising: true, matching: true }, { storage: store, browser: {}, now: now + 1, notify: false, document: null });
  assert.match(current.consentId, uuidPattern);
  assert.equal(current.advertising, true);
  assert.equal(current.matching, true);
});

test("missing secure randomness cannot create advertising consent or a predictable registry capability", async () => {
  const consent = await api(), store = storage();
  const choice = consent.writeMarketingConsent({ analytics: true, advertising: true, matching: true }, { storage: store, browser: {}, now, notify: false, document: null, crypto: null });
  assert.equal(choice.analytics, true);
  assert.equal(choice.consentId, "");
  assert.equal(choice.advertising, false);
  assert.equal(choice.matching, false);
  const randomFallback = consent.writeMarketingConsent({ advertising: true }, { storage: storage(), browser: {}, now: now + 1, notify: false, document: null, crypto: { getRandomValues(bytes) { return bytes.fill(7); } } });
  assert.match(randomFallback.consentId, uuidPattern);
});

test("all failed persistence with a readable stale allow signals callers to stop without reloading", async () => {
  const consent = await api(), store = storage(saved());
  const originalSet = store.setItem;
  store.setItem = () => { throw new Error("blocked"); };
  store.removeItem = () => { throw new Error("blocked"); };
  const doc = cookieDocument({ readBlocked: true, writeBlocked: true });
  const denied = consent.writeMarketingConsent({}, { storage: store, browser: {}, now: now + 1, notify: false, document: doc });
  assert.equal(denied.analytics, false);
  assert.equal(denied.advertising, false);
  assert.equal(consent.marketingPersistenceBlocked(), true);
  store.setItem = originalSet;
  consent.writeMarketingConsent({}, { storage: store, browser: {}, now: now + 2, notify: false, document: doc });
  assert.equal(consent.marketingPersistenceBlocked(), false, "successful storage persistence makes a subsequent reload safe");
});

test("silently ignored cookie writes also leave the blocked-persistence warning active", async () => {
  const consent = await api(), store = storage(saved());
  store.setItem = () => { throw new Error("blocked"); };
  store.removeItem = () => { throw new Error("blocked"); };
  const doc = { location: { hostname: "pelvi.health" }, get cookie() { return ""; }, set cookie(value) {} };
  consent.writeMarketingConsent({}, { storage: store, browser: {}, now: now + 1, notify: false, document: doc });
  assert.equal(consent.marketingPersistenceBlocked(), true);
});

test("a removed storage record still retains the withdrawal capability for a later registry retry", async () => {
  const consent = await api(), store = storage(saved()), doc = cookieDocument();
  store.setItem = () => { throw new Error("quota full"); };
  consent.writeMarketingConsent({}, { storage: store, browser: {}, now: now + 1, notify: false, document: doc });
  assert.equal(store.getItem(consent.MARKETING_CONSENT_KEY), null);
  assert.equal(consent.marketingPersistenceBlocked(), false);
  const freshVisit = await api();
  const denial = freshVisit.readMarketingConsent({ storage: store, browser: {}, now: now + 2, document: doc });
  assert.equal(denial.consentId, consentId);
  assert.equal(denial.decidedAt, now + 1);
  const calls = [];
  const result = await freshVisit.syncMarketingConsent(denial, { now: now + 2, fetch: async (url, options) => {
    calls.push({ url, ...options });
    return { ok: true, json: async () => ({ ok: true, effective: { advertising: false, matching: false }, decidedAt: now + 1 }) };
  } });
  assert.equal(result.ok, true);
  assert.equal(calls[0].keepalive, true);
  assert.deepEqual(JSON.parse(calls[0].body), { v: 1, consentId, decidedAt: now + 1, analytics: false, advertising: false, matching: false });
});

test("registry sync posts only the helper-issued anonymous decision to a fixed first-party URL", async () => {
  const consent = await api(), store = storage(saved());
  const choice = consent.readMarketingConsent({ storage: store, browser: {}, now, document: null });
  choice.email = "person@example.com"; choice.healthAnswers = ["pain"]; choice.token = "private";
  const requests = [];
  const result = await consent.syncMarketingConsent(choice, { now, fetch: async (url, options) => {
    requests.push({ url, ...options });
    return { ok: true, json: async () => ({ ok: true, effective: { advertising: true, matching: true }, decidedAt: now, consentId, extra: "ignored" }) };
  } });
  assert.deepEqual(result, { ok: true, effective: { advertising: true, matching: true }, decidedAt: now });
  assert.equal(requests[0].url, "/api/marketing-consent");
  assert.equal(requests[0].method, "POST");
  assert.equal(requests[0].credentials, "same-origin");
  assert.equal(requests[0].redirect, "error");
  assert.equal(requests[0].keepalive, false);
  assert.deepEqual(JSON.parse(requests[0].body), { v: 1, consentId, decidedAt: now, analytics: true, advertising: true, matching: true });
  assert.doesNotMatch(requests[0].url + requests[0].body, /person@|healthAnswers|pain|token|private/);
  assert.equal(Object.hasOwn(result, "consentId"), false, "acknowledgement passed to advertising contains no capability");
});

test("arbitrary, copied, mutated or superseded consent objects cannot register a decision", async () => {
  const consent = await api(), store = storage(saved());
  const choice = consent.readMarketingConsent({ storage: store, browser: {}, now, document: null });
  let requests = 0;
  const options = { now: now + 1, fetch: async () => { requests += 1; throw new Error("unexpected"); } };
  for (const candidate of [{ ...choice }, JSON.parse(JSON.stringify(choice)), null]) assert.equal((await consent.syncMarketingConsent(candidate, options)).ok, false);
  choice.matching = false;
  assert.equal((await consent.syncMarketingConsent(choice, options)).ok, false);
  const old = consent.readMarketingConsent({ storage: store, browser: {}, now, document: null });
  consent.writeMarketingConsent({}, { storage: store, browser: {}, now: now + 1, notify: false, document: null });
  assert.equal((await consent.syncMarketingConsent(old, options)).ok, false);
  assert.equal(requests, 0);
});

test("missing, malformed, failed and outdated registry acknowledgements always deny advertising", async () => {
  for (const response of [null, { ok: false }, { ok: true, json: async () => ({}) }, { ok: true, json: async () => ({ ok: true, effective: { advertising: true }, decidedAt: now - 1 }) }, { ok: true, json: async () => ({ ok: true, effective: { advertising: true }, decidedAt: now + 60001 }) }, { ok: true, json: async () => { throw new Error("invalid json"); } }]) {
    const consent = await api(), store = storage(saved());
    const choice = consent.readMarketingConsent({ storage: store, browser: {}, now, document: null });
    const result = await consent.syncMarketingConsent(choice, { now, fetch: async () => response });
    assert.deepEqual(result, { ok: false, effective: { advertising: false, matching: false }, decidedAt: 0 });
  }
  const consent = await api();
  const choice = consent.readMarketingConsent({ storage: storage(saved()), browser: {}, now, document: null });
  assert.equal((await consent.syncMarketingConsent(choice, { now, fetch: async () => { throw new Error("offline"); } })).ok, false);
});

test("registry decisions can narrow local consent but cannot grant unselected advertising or matching", async () => {
  for (const selected of [{ advertising: false, matching: false }, { advertising: true, matching: false }]) {
    const consent = await api(), store = storage(saved(selected));
    const choice = consent.readMarketingConsent({ storage: store, browser: {}, now, document: null });
    const result = await consent.syncMarketingConsent(choice, { now, fetch: async () => ({ ok: true, json: async () => ({ ok: true, effective: { advertising: true, matching: true }, decidedAt: now }) }) });
    assert.deepEqual(result.effective, selected);
  }
  const consent = await api();
  const choice = consent.readMarketingConsent({ storage: storage(saved()), browser: {}, now, document: null });
  const result = await consent.syncMarketingConsent(choice, { now, fetch: async () => ({ ok: true, json: async () => ({ ok: true, effective: { advertising: false, matching: false }, decidedAt: now + 1 }) }) });
  assert.equal(result.ok, true);
  assert.deepEqual(result.effective, { advertising: false, matching: false });
});

test("registry sync has one bounded two-second deadline and aborts a hung request", async () => {
  const consent = await api();
  const choice = consent.readMarketingConsent({ storage: storage(saved()), browser: {}, now, document: null });
  let expire, signal, cleared = false;
  const resultPromise = consent.syncMarketingConsent(choice, {
    now,
    fetch: async (url, options) => { signal = options.signal; return new Promise(() => {}); },
    schedule: (callback, delay) => { assert.equal(delay, 2000); expire = callback; return 1; },
    cancel: (id) => { assert.equal(id, 1); cleared = true; },
  });
  await Promise.resolve(); await Promise.resolve();
  expire();
  assert.deepEqual(await resultPromise, { ok: false, effective: { advertising: false, matching: false }, decidedAt: 0 });
  assert.equal(signal.aborted, true);
  assert.equal(cleared, true);
});

test("a late allow acknowledgement cannot survive a newer local withdrawal", async () => {
  const consent = await api(), store = storage(saved());
  const choice = consent.readMarketingConsent({ storage: store, browser: {}, now, document: null });
  let answer;
  const pending = consent.syncMarketingConsent(choice, { now: now + 1, fetch: () => new Promise((resolve) => { answer = resolve; }) });
  await Promise.resolve(); await Promise.resolve();
  const denied = consent.writeMarketingConsent({}, { storage: store, browser: {}, now: now + 1, notify: false, document: null });
  assert.equal(denied.consentId, consentId);
  answer({ ok: true, json: async () => ({ ok: true, effective: { advertising: true, matching: true }, decidedAt: now + 1 }) });
  assert.deepEqual(await pending, { ok: false, effective: { advertising: false, matching: false }, decidedAt: 0 });
});

test("simultaneous identical consent syncs share only their in-flight request", async () => {
  const consent = await api(), store = storage(saved());
  let answer, requests = 0;
  const fetch = () => { requests += 1; return new Promise((resolve) => { answer = resolve; }); };
  const choices = Array.from({ length: 3 }, () => consent.readMarketingConsent({ storage: store, browser: {}, now, document: null }));
  const pending = choices.map((choice) => consent.syncMarketingConsent(choice, { now, fetch }));
  await Promise.resolve(); await Promise.resolve();
  assert.equal(requests, 1);
  answer({ ok: true, json: async () => ({ ok: true, effective: { advertising: true, matching: true }, decidedAt: now }) });
  const results = await Promise.all(pending);
  assert.equal(results.every((result) => result.ok && result.effective.advertising), true);
  const again = consent.syncMarketingConsent(choices[0], { now, fetch });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(requests, 2, "settled decisions are never cached across later registry checks");
  answer({ ok: true, json: async () => ({ ok: true, effective: { advertising: false, matching: false }, decidedAt: now + 1 }) });
  assert.equal((await again).effective.advertising, false);
});

test("a narrower new decision never reuses an in-flight allow acknowledgement", async () => {
  const consent = await api(), store = storage(saved());
  const answers = [], bodies = [];
  const fetch = (url, options) => { bodies.push(JSON.parse(options.body)); return new Promise((resolve) => answers.push(resolve)); };
  const allow = consent.readMarketingConsent({ storage: store, browser: {}, now, document: null });
  const oldSync = consent.syncMarketingConsent(allow, { now: now + 1, fetch });
  await Promise.resolve(); await Promise.resolve();
  const deny = consent.writeMarketingConsent({}, { storage: store, browser: {}, now: now + 1, document: null, notify: false });
  const newSync = consent.syncMarketingConsent(deny, { now: now + 1, fetch });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].advertising, true);
  assert.equal(bodies[1].advertising, false);
  answers[0]({ ok: true, json: async () => ({ ok: true, effective: { advertising: true, matching: true }, decidedAt: now + 1 }) });
  answers[1]({ ok: true, json: async () => ({ ok: true, effective: { advertising: false, matching: false }, decidedAt: now + 1 }) });
  assert.equal((await oldSync).ok, false);
  assert.deepEqual((await newSync).effective, { advertising: false, matching: false });
});

test("only a successful explicit new allow clears withdrawal persistence", async () => {
  const consent = await api(), store = storage(saved()), doc = cookieDocument({ cookie: "pelvi_privacy_denied=1" });
  const realSet = store.setItem;
  store.setItem = () => { throw new Error("write blocked"); };
  const blockedAllow = consent.writeMarketingConsent({ analytics: true, advertising: true, matching: true }, { storage: store, browser: {}, now, notify: false, document: doc });
  assert.equal(blockedAllow.analytics, false);
  assert.match(doc.cookie, /pelvi_privacy_denied=1/);
  store.setItem = realSet;
  const allowed = consent.writeMarketingConsent({ analytics: true, advertising: false, matching: true }, { storage: store, browser: {}, now: now + 1, notify: false, document: doc });
  assert.equal(allowed.analytics, true);
  assert.equal(allowed.advertising, false);
  assert.equal(allowed.matching, false);
  assert.doesNotMatch(doc.cookie, /pelvi_privacy_denied/);
});

test("a failed initial opt-in write remains off when only denial cookies can be remembered", async () => {
  const consent = await api(), store = storage(), doc = cookieDocument();
  store.setItem = () => { throw new Error("write blocked"); };
  const applied = consent.writeMarketingConsent({ analytics: true, advertising: true, matching: true }, { storage: store, browser: {}, now, notify: false, document: doc });
  assert.equal(applied.analytics, false);
  assert.equal(applied.advertising, false);
  assert.equal(applied.matching, false);
  assert.match(doc.cookie, /pelvi_privacy_denied=1/);
});

test("blocked withdrawal persistence still denies the current visit and localhost can retain the fallback", async () => {
  const consent = await api(), store = storage(saved());
  store.setItem = () => { throw new Error("write blocked"); };
  store.removeItem = () => { throw new Error("remove blocked"); };
  const blockedDoc = cookieDocument({ readBlocked: true, writeBlocked: true });
  assert.doesNotThrow(() => consent.writeMarketingConsent({}, { storage: store, browser: {}, now, notify: false, document: blockedDoc }));
  assert.equal(consent.readMarketingConsent({ storage: store, browser: {}, now, document: blockedDoc }).analytics, false);
  const localDoc = cookieDocument({ hostname: "localhost" });
  consent.writeMarketingConsent({}, { storage: store, browser: {}, now, notify: false, document: localDoc });
  assert.match(localDoc.cookie, /pelvi_privacy_denied=1/);
  assert.doesNotMatch(localDoc.writes[0], /Secure/);
});

test("attribution is absent before advertising consent and under browser opt-out signals", async () => {
  const consent = await api(), doc = cookieDocument();
  const location = { hostname: "pelvi.health", search: "?fbclid=abcdefghij12345" };
  assert.equal(consent.marketingAttribution({ storage: storage(), browser: {}, now, document: doc, location }), undefined);
  for (const browser of [{ globalPrivacyControl: true }, { doNotTrack: "1" }]) assert.equal(consent.marketingAttribution({ storage: storage(saved()), browser, now, document: doc, location }), undefined);
  assert.equal(doc.writes.length, 0);
});

test("attribution retains a stable same-click browser id and sends no page query or PII", async () => {
  const consent = await api(), store = storage(saved());
  const fbc = `fb.1.${now - 1000}.abcdefghij12345`, fbp = `fb.1.${now - 2000}.987654321`;
  const doc = cookieDocument({ cookie: `_fbc=${fbc}; _fbp=${fbp}` });
  const location = { hostname: "pelvi.health", search: "?fbclid=abcdefghij12345&email=person%40example.com&token=private&goal=pain" };
  const result = consent.marketingAttribution({ storage: store, browser: {}, now, document: doc, location });
  assert.deepEqual(result, { v: 1, advertising: true, matching: true, decidedAt: now, consentId, fbp, fbc });
  assert.deepEqual(doc.writes, [], "an existing same-click identifier keeps its original timestamp");
  assert.doesNotMatch(JSON.stringify(result), /person@|private|email|goal|pain|token/);
});

test("optional attribution survives blocked cookie reads/writes and unsafe query access without breaking checkout", async () => {
  const consent = await api(), store = storage(saved());
  const location = { hostname: "pelvi.health", search: "?fbclid=abcdefghij12345" };
  for (const doc of [cookieDocument({ readBlocked: true }), cookieDocument({ writeBlocked: true }), cookieDocument({ readBlocked: true, writeBlocked: true })]) {
    let result;
    assert.doesNotThrow(() => { result = consent.marketingAttribution({ storage: store, browser: {}, now, document: doc, location }); });
    assert.deepEqual(result, { v: 1, advertising: true, matching: true, decidedAt: now, consentId, fbp: "", fbc: `fb.1.${now}.abcdefghij12345` });
  }
  const inaccessible = { get search() { throw new Error("restricted location"); } };
  assert.equal(consent.marketingAttribution({ storage: store, browser: {}, now, document: null, location: inaccessible }), undefined);
});

test("attribution rejects malformed identifiers and writes click cookies only on the first-party production host", async () => {
  const consent = await api(), store = storage(saved());
  for (const click of ["person%40example.com", "short", "pi_secret%3Dprivate", "x".repeat(201)]) {
    const doc = cookieDocument({ cookie: "_fbc=person%40example.com; _fbp=private" });
    const result = consent.marketingAttribution({ storage: store, browser: {}, now, document: doc, location: { hostname: "pelvi.health", search: `?fbclid=${click}` } });
    assert.equal(result.fbc, ""); assert.equal(result.fbp, ""); assert.deepEqual(doc.writes, []);
  }
  const localDoc = cookieDocument({ hostname: "localhost" });
  const local = consent.marketingAttribution({ storage: store, browser: {}, now, document: localDoc, location: { hostname: "localhost", search: "?fbclid=abcdefghij12345" } });
  assert.equal(local.fbc, `fb.1.${now}.abcdefghij12345`);
  assert.deepEqual(localDoc.writes, []);
});
