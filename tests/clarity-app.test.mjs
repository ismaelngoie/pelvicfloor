import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const dataURL = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const gateURL = dataURL(await readFile(new URL("public/clarity-gate.js", root), "utf8"));
const consentURL = dataURL(await readFile(new URL("public/marketing-consent.js", root), "utf8"));
const navigationURL = dataURL(await readFile(new URL("lib/marketingNavigation.js", root), "utf8"));
const stopURL = dataURL(await readFile(new URL("public/clarity-stop.js", root), "utf8"));
const { clarityConsentPolicy } = await import(consentURL);
const source = (await readFile(new URL("app/Clarity.jsx", root), "utf8"))
  .replace('import { useEffect } from "react";', 'const useEffect = () => {};')
  .replace('import { usePathname } from "next/navigation";', 'const usePathname = () => "/";')
  .replace('"@/lib/analytics"', JSON.stringify(gateURL))
  .replace('"@/lib/marketingConsent"', JSON.stringify(consentURL))
  .replace('"@/lib/marketingNavigation"', JSON.stringify(navigationURL))
  .replace('"../public/clarity-stop.js"', JSON.stringify(stopURL));
const { createClarityController } = await import(dataURL(source));
const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }

function harness({ decided = false, analytics = false, browser = {}, path = "/diastasis-recti", search = "", blocked = false, sync, holdReload = false } = {}) {
  const calls = [], scripts = [], replacements = [], syncs = [], reloadRequests = [], navigation = [];
  let choice = { decided, analytics, advertising: false, matching: false, consentId: decided ? "existing-consent" : "", decidedAt: decided ? 1000 : 0 };
  let persistenceBlocked = blocked;
  const scope = { location: { pathname: path, search, href: `https://pelvi.health${path}${search}`, replace: (url) => replacements.push(url) }, clarity: (...args) => calls.push(args) };
  const doc = { createElement: () => ({}), head: { appendChild: (script) => scripts.push(script) } };
  const controller = createClarityController({ scope, doc,
    getConsent: () => choice,
    getPolicy: (current) => clarityConsentPolicy(current, { browser }),
    persistenceBlocked: () => persistenceBlocked,
    syncConsent: (current) => { syncs.push(current); return sync ? sync(current) : Promise.resolve({ ok: true }); },
    deferReload: (request) => { reloadRequests.push(request); if (!holdReload && request.canReload()) scope.location.replace(scope.location.href); },
    markNavigation: (document) => navigation.push(document),
  });
  return { scope, doc, controller, calls, scripts, replacements, syncs, reloadRequests, navigation,
    apply: (event) => controller.applyChoice(scope.location.pathname, event),
    choose(next) { choice = { ...choice, ...next }; return choice; },
    block(value) { persistenceBlocked = value; },
    getConsent: () => choice,
  };
}

test("undecided public app-router visits load cookieless Clarity and do not manufacture a consent decision", () => {
  const h = harness(); h.apply(); h.apply();
  assert.equal(h.scripts.length, 1);
  assert.deepEqual(h.calls, [["consentv2", { analytics_Storage: "denied", ad_Storage: "denied" }]]);
  assert.equal(h.syncs.length, 0);
  assert.equal(h.getConsent().decided, false);
  assert.equal(h.getConsent().consentId, "");
  assert.equal(h.getConsent().advertising, false);
  assert.equal(h.getConsent().matching, false);
});

test("existing explicit analytics permission is preserved with Microsoft Ads sharing still denied", () => {
  const h = harness({ decided: true, analytics: true }); h.apply();
  assert.deepEqual(h.calls[0], ["consentv2", { analytics_Storage: "granted", ad_Storage: "denied" }]);
  assert.equal(h.syncs.length, 0);
  assert.equal(h.scripts.length, 1);
});

test("explicit denials, GPC, DNT, private routes and sensitive queries all prevent loading", () => {
  for (const options of [{ decided: true, analytics: false }, { browser: { globalPrivacyControl: true } }, { browser: { doNotTrack: "1" } }, { path: "/app" }, { path: "/admin" }, { path: "/diastasis-recti/start" }, { search: "?payment_intent_client_secret=private" }]) {
    const h = harness(options); h.apply();
    assert.deepEqual(h.scripts, [], JSON.stringify(options));
    assert.deepEqual(h.calls, []);
  }
});

test("an explicit opt-out stops cookieless collection immediately and syncs before the safe reload", async () => {
  const pending = deferred(), h = harness({ sync: () => pending.promise }); h.apply();
  h.choose({ decided: true, analytics: false, decidedAt: 1001 }); h.apply({ type: "pelvi:privacy-choice" });
  assert.deepEqual(h.calls.slice(-2), [["stop"], ["consentv2", { analytics_Storage: "denied", ad_Storage: "denied" }]]);
  assert.equal(h.syncs.length, 1);
  assert.deepEqual(h.replacements, []);
  pending.resolve({ ok: true }); await tick();
  assert.equal(h.reloadRequests.length, 1);
  assert.equal(h.replacements.length, 1);
});

test("a private soft-navigation stops and replaces the document without granting or syncing consent", () => {
  const h = harness(); h.apply();
  h.scope.location.pathname = "/app"; h.scope.location.href = "https://pelvi.health/app"; h.apply();
  assert.equal(h.calls.at(-2)[0], "stop");
  assert.deepEqual(h.navigation, [h.doc]);
  assert.deepEqual(h.replacements, ["https://pelvi.health/app"]);
  assert.deepEqual(h.syncs, []);
});

test("an analytics cleanup uses the existing deferred-modal reload coordinator", async () => {
  const h = harness({ holdReload: true }); h.apply();
  h.choose({ decided: true, analytics: false, decidedAt: 1001 }); h.apply(); await tick();
  assert.equal(h.calls.at(-2)[0], "stop");
  assert.equal(h.reloadRequests.length, 1);
  assert.equal(h.reloadRequests[0].document, h.doc);
  assert.equal(h.reloadRequests[0].window, h.scope);
  assert.equal(h.reloadRequests[0].canReload(), true);
  assert.deepEqual(h.replacements, [], "the controller leaves active payment-dialog timing to the coordinator");
  h.choose({ decided: true, analytics: true, decidedAt: 1002 });
  assert.equal(h.reloadRequests[0].canReload(), false, "a stale callback cannot reload into a changed permission state");
});

test("failed persistence leaves the recorder stopped without a reload", async () => {
  const h = harness({ blocked: true }); h.apply();
  h.choose({ decided: true, analytics: false, decidedAt: 1001 }); h.apply(); await tick();
  assert.equal(h.calls.at(-2)[0], "stop");
  assert.equal(h.reloadRequests[0].canReload(), false);
  assert.deepEqual(h.replacements, []);
});

test("unrelated storage events cannot stop an active cookieless recording", () => {
  const h = harness(); h.apply();
  h.choose({ decided: true, analytics: false, decidedAt: 1001 });
  h.apply({ type: "storage", key: "unrelated" });
  assert.equal(h.calls.length, 1);
  assert.equal(h.syncs.length, 0);
});

test("a newer privacy transition invalidates an older pending reload", async () => {
  const pending = [], h = harness({ holdReload: true, sync: () => { const work = deferred(); pending.push(work); return work.promise; } }); h.apply();
  h.choose({ decided: true, analytics: false, decidedAt: 1001 }); h.apply();
  h.choose({ decided: true, analytics: true, decidedAt: 1002 }); h.apply();
  pending[0].resolve({ ok: true }); await tick();
  assert.equal(h.reloadRequests[0].canReload(), false);
  pending[1].resolve({ ok: true }); await tick();
  assert.equal(h.reloadRequests[1].canReload(), true);
  assert.equal(h.scripts.length, 1, "stopped recorders only restart in a fresh document");
});
