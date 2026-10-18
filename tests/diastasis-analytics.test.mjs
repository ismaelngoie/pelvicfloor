import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const gateSource = await readFile(new URL("public/clarity-gate.js", root), "utf8");
const gateURL = `data:text/javascript;base64,${Buffer.from(gateSource).toString("base64")}`;
const { isTrackedPath } = await import(gateURL);
const consentURL = `data:text/javascript;base64,${Buffer.from(await readFile(new URL("public/marketing-consent.js", root), "utf8")).toString("base64")}`;
const analyticsSource = await readFile(new URL("lib/diastasisAnalytics.js", root), "utf8");
const isolatedSource = analyticsSource
  .replace('"../public/clarity-gate.js"', JSON.stringify(gateURL))
  .replace('"./marketingConsent.js"', JSON.stringify(consentURL));
const { createDiastasisTelemetry, DIASTASIS_CLARITY_EVENTS } = await import(
  `data:text/javascript;base64,${Buffer.from(isolatedSource).toString("base64")}`
);

function harness({ ready = true, consent = true, path = "/diastasis-recti", search = "" } = {}) {
  const calls = [], timers = new Map();
  let nextTimer = 0, analytics = consent;
  const scope = { location: { pathname: path, search } };
  const recorder = (...args) => calls.push(args);
  if (ready) scope.clarity = recorder;
  const telemetry = createDiastasisTelemetry({
    getWindow: () => scope,
    getConsent: () => ({ decided: true, analytics }),
    schedule: (callback) => { const id = ++nextTimer; timers.set(id, callback); return id; },
    cancel: (id) => timers.delete(id),
  });
  return {
    telemetry, scope, calls, timers, recorder,
    consent(value) { analytics = value; },
    tick() { const first = timers.entries().next().value; if (first) { timers.delete(first[0]); first[1](); } },
  };
}

test("only the public diastasis entry is newly recorded, never setup, member or admin routes", () => {
  for (const path of ["/diastasis-recti", "/diastasis-recti/", "/DIASTASIS-RECTI.html"]) assert.equal(isTrackedPath(path), true, path);
  for (const path of ["/diastasis-recti/start", "/diastasis-recti/start.html", "/diastasis-recti/guarantee", "/app", "/app.html", "/app/you", "/admin", "/admin/acquisition"]) assert.equal(isTrackedPath(path), false, path);
  assert.equal(isTrackedPath("/", "?utm_source=test"), true);
  assert.equal(isTrackedPath("/blog/example"), true);
});

test("initial pageviews refuse clear and encoded email, token and payment query keys", () => {
  for (const search of ["?email=person%40example.com", "?%65mail=person%40example.com", "?%45mail=person%40example.com", "?to%6ben=secret", "?%54oken=secret", "?payment_intent_client_secret=pi_secret", "?payment_%69ntent=pi_1", "?setup_intent=si_1", "?custom_client%5Fsecret=private"]) {
    assert.equal(isTrackedPath("/diastasis-recti", search), false, search);
    const h = harness({ search });
    assert.equal(h.telemetry.track("landing_view"), false);
    assert.deepEqual(h.calls, []);
    assert.equal(h.timers.size, 0);
  }
  assert.equal(isTrackedPath("/diastasis-recti", "?utm_source=meta&gclid=abc"), true);
});

test("declined or undecided analytics never queues events for later consent", () => {
  const h = harness({ ready: false, consent: false });
  assert.equal(h.telemetry.track("landing_view"), false);
  assert.equal(h.telemetry.track("checkout_open"), false);
  assert.equal(h.timers.size, 0);
  h.scope.clarity = h.recorder;
  h.consent(true);
  h.telemetry.flush();
  assert.deepEqual(h.calls, []);
  assert.equal(h.telemetry.track("landing_view"), true);
  assert.deepEqual(h.calls, [["set", "landing_page", "diastasis_recti"], ["event", "dr_landing_view"]]);
});

test("undecided public visits emit only anonymous cookieless events without granting permissions", () => {
  const calls = [], choice = { decided: false, analytics: false, advertising: false, matching: false, consentId: "" };
  const scope = { location: { pathname: "/diastasis-recti", search: "" }, clarity: (...args) => calls.push(args) };
  const telemetry = createDiastasisTelemetry({ getWindow: () => scope, getConsent: () => choice });
  assert.equal(telemetry.track("landing_view"), true);
  assert.deepEqual(calls, [["set", "landing_page", "diastasis_recti"], ["event", "dr_landing_view"]]);
  assert.deepEqual(choice, { decided: false, analytics: false, advertising: false, matching: false, consentId: "" });
  telemetry.dispose();
});

test("initial render waits for the existing Clarity stub and sends the view once", () => {
  const h = harness({ ready: false });
  assert.equal(h.telemetry.track("landing_view"), true);
  assert.equal(h.telemetry.track("landing_view"), false);
  h.telemetry.track("checkout_open");
  assert.equal(h.scope.clarity, undefined, "the helper never creates a second loader or stub");
  assert.deepEqual(h.calls, []);
  assert.equal(h.timers.size, 1);
  h.scope.clarity = h.recorder;
  h.tick();
  assert.deepEqual(h.calls, [["set", "landing_page", "diastasis_recti"], ["event", "dr_landing_view"], ["event", "dr_checkout_open"]]);
  assert.equal(h.timers.size, 0);
  assert.equal(h.telemetry.track("landing_view"), false, "React remounts do not duplicate the document view");
});

test("a loaded queueing stub receives the same fixed calls before the CDN is ready", () => {
  const h = harness();
  const queued = [];
  h.scope.clarity = (...args) => queued.push(args);
  h.telemetry.track("landing_view");
  h.telemetry.track("checkout_ready");
  assert.deepEqual(queued, [["set", "landing_page", "diastasis_recti"], ["event", "dr_landing_view"], ["event", "dr_checkout_ready"]]);
  assert.equal(h.timers.size, 0);
});

test("pending public events are discarded if navigation enters a private route", () => {
  for (const path of ["/app", "/admin", "/diastasis-recti/start", "/welcome"]) {
    const h = harness({ ready: false });
    h.telemetry.track("landing_view");
    h.scope.location.pathname = path;
    h.scope.clarity = h.recorder;
    h.tick();
    assert.deepEqual(h.calls, [], path);
    assert.equal(h.timers.size, 0);
    assert.equal(h.telemetry.track("payment_completed"), false, path);
  }
});

test("pending events recheck the query and analytics choice at delivery", () => {
  for (const change of [(h) => { h.scope.location.search = "?%65mail=person%40example.com"; }, (h) => h.consent(false)]) {
    const h = harness({ ready: false });
    h.telemetry.track("landing_view");
    change(h);
    h.scope.clarity = h.recorder;
    h.tick();
    assert.deepEqual(h.calls, []);
    assert.equal(h.timers.size, 0);
  }
});

test("withdrawal clears the loader wait and a later opt-in can send an undelivered view", () => {
  const h = harness({ ready: false });
  h.telemetry.track("landing_view");
  h.consent(false);
  h.telemetry.track("landing_view");
  assert.equal(h.timers.size, 0);
  h.consent(true);
  h.scope.clarity = h.recorder;
  h.telemetry.track("landing_view");
  assert.deepEqual(h.calls, [["set", "landing_page", "diastasis_recti"], ["event", "dr_landing_view"]]);
});

test("arbitrary names and extra user values cannot become replay tags or events", () => {
  const h = harness();
  for (const value of ["person@example.com", "pi_123_secret_private", "prolapse", "identify", "__proto__", {}, null]) assert.equal(h.telemetry.track(value), false);
  h.telemetry.track("checkout_open", { email: "person@example.com", token: "private", healthAnswers: ["pain"] });
  assert.deepEqual(h.calls, [["set", "landing_page", "diastasis_recti"], ["event", "dr_checkout_open"]]);
  assert.equal(Object.values(DIASTASIS_CLARITY_EVENTS).every((name) => /^dr_[a-z_]+$/.test(name)), true);
});

test("video starts and errors are bounded per document while checkout attempts remain countable", () => {
  const h = harness();
  for (let i = 0; i < 5; i += 1) { h.telemetry.track("video_play"); h.telemetry.track("video_error"); h.telemetry.track("checkout_open"); }
  assert.equal(h.calls.filter((call) => call[1] === "dr_video_play").length, 1);
  assert.equal(h.calls.filter((call) => call[1] === "dr_video_error").length, 1);
  assert.equal(h.calls.filter((call) => call[1] === "dr_checkout_open").length, 5);
  assert.equal(h.calls.filter((call) => call[0] === "set").length, 1);
});

test("blocked analytics has bounded retry and memory, and never breaks the purchase caller", () => {
  const h = harness({ ready: false });
  for (let i = 0; i < 100; i += 1) h.telemetry.track("checkout_open");
  for (let i = 0; i < 60; i += 1) h.tick();
  assert.equal(h.timers.size, 0);
  h.scope.clarity = h.recorder;
  h.telemetry.flush();
  assert.equal(h.calls.filter((call) => call[0] === "event").length, 32);
  h.scope.clarity = () => { throw new Error("blocked analytics"); };
  assert.doesNotThrow(() => h.telemetry.track("payment_completed"));
  assert.equal(h.timers.size <= 1, true);
  h.telemetry.dispose();
  assert.equal(h.timers.size, 0);
});

test("browserless evaluation and disposed telemetry never schedule or send", () => {
  const telemetry = createDiastasisTelemetry({ getWindow: () => null, getConsent: () => ({ analytics: true }), schedule: () => assert.fail("no timer") });
  assert.equal(telemetry.track("landing_view"), false);
  const h = harness({ ready: false });
  h.telemetry.track("landing_view"); h.telemetry.dispose();
  h.scope.clarity = h.recorder;
  assert.equal(h.telemetry.flush(), false);
  assert.equal(h.telemetry.track("checkout_open"), false);
  assert.deepEqual(h.calls, []);
});

test("protected sources outside the explicitly authorized tracking changes retain their original hashes", async () => {
  const fixture = JSON.parse(await readFile(new URL("tests/fixtures/protected-surfaces-sha256.json", root), "utf8"));
  // Explicit user-authorized analytics/privacy integration only. The remaining
  // original fixture values are themselves locked so a broad rebaseline cannot
  // silently accept changes to home, the existing funnel, pricing or billing.
  const authorized = new Set([
    "public/clarity-gate.js", "public/clarity-static.js", "lib/analytics.js", "app/Clarity.jsx", "app/GoogleAds.jsx",
    "app/layout.js", "app/privacy-policy/page.js", "functions/api/create-payment-intent.js", "lib/checkout.js", "lib/firebase.js",
    "app/diastasis-recti/start/StartClient.jsx", "components/diastasis/DiastasisCheckoutSheet.jsx",
  ]);
  const unchanged = Object.entries(fixture.files).filter(([file]) => !authorized.has(file)).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  assert.equal(unchanged.length, 57);
  assert.equal(createHash("sha256").update(JSON.stringify(unchanged)).digest("hex"), "483ad984fa8cf07917d8f5b36b0110b3d3e420a488a3e8c62b86f756c7df1afd");
  for (const [file, expected] of unchanged) {
    assert.equal(createHash("sha256").update(await readFile(new URL(file, root))).digest("hex"), expected, file);
  }
});
