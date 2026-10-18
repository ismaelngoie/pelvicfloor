import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const dataURL = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const gateURL = dataURL(await readFile(new URL("public/clarity-gate.js", root), "utf8"));
const consentURL = dataURL(await readFile(new URL("public/marketing-consent.js", root), "utf8"));
const stopURL = dataURL(await readFile(new URL("public/clarity-stop.js", root), "utf8"));
const { clarityConsentPolicy } = await import(consentURL);
const source = (await readFile(new URL("public/clarity-static.js", root), "utf8"))
  .replace('"/clarity-gate.js"', JSON.stringify(gateURL))
  .replace('"/marketing-consent.js"', JSON.stringify(consentURL))
  .replace('"/clarity-stop.js"', JSON.stringify(stopURL));
const { installStaticClarity } = await import(dataURL(source));
const consentKey = "pelvi.privacy.v1";
const choiceEvent = "pelvi:privacy-choice";
const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

function harness({ analytics = true, decided = true, browser = {}, path = "/blog/example", search = "", blocked = false, sync } = {}) {
  const calls = [], scripts = [], replacements = [], listeners = new Map(), syncs = [];
  let choice = { decided, analytics, advertising: false, matching: false, consentId: decided ? "first-party-capability" : "", decidedAt: decided ? 1000 : 0 };
  let persistenceBlocked = blocked;
  const scope = {
    location: { pathname: path, search, href: `https://pelvi.health${path}${search}`, replace: (url) => replacements.push(url) },
    clarity: (...args) => calls.push(args),
    addEventListener(type, listener) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(listener); },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
  };
  const options = {
    scope,
    doc: { createElement: () => ({}), head: { appendChild: (script) => scripts.push(script) } },
    getConsent: () => choice,
    getPolicy: (choice) => clarityConsentPolicy(choice, { browser }),
    persistenceBlocked: () => persistenceBlocked,
    syncConsent: (current) => { syncs.push(current); return sync ? sync(current) : Promise.resolve({ ok: true }); },
  };
  return {
    ...options, options, calls, scripts, replacements, listeners, syncs,
    install: () => installStaticClarity(options),
    choose(next) { choice = { ...choice, ...next }; return choice; },
    block(value) { persistenceBlocked = value; },
    emit(type, values = {}) { for (const listener of listeners.get(type) || []) listener({ type, ...values }); },
  };
}

test("an allowed static article loads one gated tag and one lifecycle", () => {
  const h = harness();
  const first = h.install();
  assert.equal(h.scripts.length, 1);
  assert.match(h.scripts[0].src, /^https:\/\/www\.clarity\.ms\/tag\//);
  assert.deepEqual(h.calls, [["consentv2", { analytics_Storage: "granted", ad_Storage: "denied" }], ["set", "surface", "static_html"]]);
  assert.equal(h.install(), first);
  assert.equal(h.scripts.length, 1);
  assert.equal(h.listeners.get(choiceEvent).size, 1);
  first.dispose();
});

test("an undecided static visit starts cookieless analytics without a permission write or sync", () => {
  const h = harness({ analytics: false, decided: false }), lifecycle = h.install();
  assert.equal(h.scripts.length, 1);
  assert.deepEqual(h.calls[0], ["consentv2", { analytics_Storage: "denied", ad_Storage: "denied" }]);
  assert.equal(h.calls.some((call) => call[0] === "stop"), false);
  assert.equal(h.syncs.length, 0);
  assert.equal(h.getConsent().consentId, "");
  assert.equal(h.getConsent().decided, false);
  lifecycle.dispose();
});

test("static cookieless analytics remains off under GPC and DNT", () => {
  for (const browser of [{ globalPrivacyControl: true }, { doNotTrack: "1" }]) {
    const h = harness({ analytics: false, decided: false, browser }), lifecycle = h.install();
    assert.equal(h.scripts.length, 0);
    assert.deepEqual(h.calls, []);
    lifecycle.dispose();
  }
});

test("opting out of a cookieless static visit stops collection immediately", async () => {
  const h = harness({ analytics: false, decided: false }), lifecycle = h.install();
  h.choose({ decided: true, analytics: false, decidedAt: 1001 }); h.emit(choiceEvent);
  assert.deepEqual(h.calls.slice(-2), [["stop"], ["consentv2", { analytics_Storage: "denied", ad_Storage: "denied" }]]);
  await tick();
  assert.equal(h.replacements.length, 1);
  lifecycle.dispose();
});

test("denied consent and private or sensitive documents inject no static recorder", () => {
  for (const options of [{ analytics: false }, { path: "/app" }, { path: "/admin" }, { path: "/blog/example", search: "?email=person%40example.com" }]) {
    const h = harness(options), lifecycle = h.install();
    assert.equal(h.scripts.length, 0);
    assert.deepEqual(h.calls, []);
    assert.deepEqual(h.replacements, []);
    lifecycle.dispose();
  }
});

test("cross-tab withdrawal denies and stops immediately, then waits for registry sync before reload", async () => {
  const pending = deferred(), h = harness({ sync: () => pending.promise });
  const lifecycle = h.install();
  h.choose({ analytics: false, decidedAt: 1001 });
  h.emit("storage", { key: consentKey });
  assert.deepEqual(h.calls.slice(-2), [["stop"], ["consentv2", { analytics_Storage: "denied", ad_Storage: "denied" }]]);
  assert.equal(h.syncs.length, 1);
  assert.equal(h.syncs[0].analytics, false);
  assert.deepEqual(h.replacements, [], "reload cannot cancel the pending withdrawal sync");
  pending.resolve({ ok: true }); await tick();
  assert.deepEqual(h.replacements, [h.scope.location.href]);
  lifecycle.dispose();
});

test("unrelated storage writes have no playback or navigation effect", async () => {
  const h = harness(), lifecycle = h.install();
  h.choose({ analytics: false, decidedAt: 1001 });
  h.emit("storage", { key: "unrelated-preference" }); await tick();
  assert.equal(h.calls.length, 2);
  assert.equal(h.syncs.length, 0);
  assert.equal(h.replacements.length, 0);
  lifecycle.dispose();
});

test("storage.clear and same-document privacy events both stop an active recorder", async () => {
  for (const [type, values] of [["storage", { key: null }], [choiceEvent, {}]]) {
    const h = harness(), lifecycle = h.install();
    h.choose({ analytics: false, decidedAt: 1001 });
    h.emit(type, values);
    assert.equal(h.calls.at(-2)[0], "stop");
    await tick();
    assert.equal(h.replacements.length, 1);
    lifecycle.dispose();
  }
});

test("blocked withdrawal persistence stops and syncs without reloading into a stale stored grant", async () => {
  const h = harness({ blocked: true }), lifecycle = h.install();
  h.choose({ analytics: false, decidedAt: 1001 }); h.emit(choiceEvent);
  assert.equal(h.calls.at(-2)[0], "stop");
  await tick();
  assert.equal(h.syncs.length, 1, "durable server withdrawal is still attempted");
  assert.deepEqual(h.replacements, []);
  h.block(false); h.choose({ analytics: false, decidedAt: 1002 }); h.emit(choiceEvent); await tick();
  assert.equal(h.replacements.length, 1, "later successfully persisted choices can clear the stopped document");
  lifecycle.dispose();
});

test("persistence and the consent snapshot are checked again after the sync settles", async () => {
  for (const change of [(h) => h.block(true), (h) => h.choose({ analytics: true, decidedAt: 1002 })]) {
    const pending = deferred(), h = harness({ sync: () => pending.promise }), lifecycle = h.install();
    h.choose({ analytics: false, decidedAt: 1001 }); h.emit(choiceEvent);
    change(h);
    pending.resolve({ ok: true }); await tick();
    assert.deepEqual(h.replacements, [], "a stale callback must never reload a fallback grant");
    lifecycle.dispose();
  }
});

test("a later opt-in after stopping gets a fresh document instead of restarting the recorder", async () => {
  const pending = [], h = harness({ sync: () => { const work = deferred(); pending.push(work); return work.promise; } });
  const lifecycle = h.install();
  h.choose({ analytics: false, decidedAt: 1001 }); h.emit(choiceEvent);
  h.choose({ analytics: true, decidedAt: 1002 }); h.emit(choiceEvent);
  pending[0].resolve({ ok: true }); await tick();
  assert.deepEqual(h.replacements, []);
  pending[1].resolve({ ok: true }); await tick();
  assert.equal(h.replacements.length, 1);
  assert.equal(h.scripts.length, 1);
  assert.equal(h.calls.filter((call) => call[0] === "consentv2" && call[1].analytics_Storage === "granted").length, 1);
  lifecycle.dispose();
});

test("duplicate withdrawal events cause at most one reload when their syncs settle out of order", async () => {
  const pending = [], h = harness({ sync: () => { const work = deferred(); pending.push(work); return work.promise; } });
  const lifecycle = h.install();
  h.choose({ analytics: false, decidedAt: 1001 });
  h.emit(choiceEvent); h.emit("storage", { key: consentKey });
  pending[1].resolve({ ok: true }); await tick();
  pending[0].resolve({ ok: true }); await tick();
  assert.equal(h.replacements.length, 1);
  assert.equal(h.calls.filter((call) => call[0] === "stop").length, 1);
  lifecycle.dispose();
});

test("failed optional sync and throwing Clarity calls cannot prevent immediate stop attempts", async () => {
  const h = harness({ sync: () => Promise.reject(new Error("offline")) }), lifecycle = h.install();
  const attempts = [];
  h.scope.clarity = (...args) => { attempts.push(args[0]); throw new Error("blocked tag"); };
  h.choose({ analytics: false, decidedAt: 1001 });
  assert.doesNotThrow(() => h.emit(choiceEvent));
  assert.deepEqual(attempts, ["stop", "consentv2"]);
  await tick();
  assert.equal(h.replacements.length, 1);
  lifecycle.dispose();
});

test("initial denial can become allowed through a relevant cross-tab choice", () => {
  const h = harness({ analytics: false }), lifecycle = h.install();
  h.choose({ analytics: true, decidedAt: 1001 }); h.emit("storage", { key: consentKey });
  assert.equal(h.scripts.length, 1);
  assert.equal(h.calls[0][1].analytics_Storage, "granted");
  lifecycle.dispose();
});

test("disposing the lifecycle cancels listeners and invalidates pending reload callbacks", async () => {
  const pending = deferred(), h = harness({ sync: () => pending.promise }), lifecycle = h.install();
  h.choose({ analytics: false, decidedAt: 1001 }); h.emit(choiceEvent);
  lifecycle.dispose(); pending.resolve({ ok: true }); await tick();
  assert.equal(h.listeners.get(choiceEvent).size, 0);
  assert.equal(h.listeners.get("storage").size, 0);
  assert.deepEqual(h.replacements, []);
});
