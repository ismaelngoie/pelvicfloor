import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../public/clarity-stop.js", import.meta.url), "utf8");
const { stopClarityRecording } = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));
const denied = { analytics_Storage: "denied", ad_Storage: "denied" };

// Model the SDK's relevant behavior: stop replaces the dispatcher with a queue;
// active grant -> denied schedules an internal start. That start drains the queue.
function sdk({ loaded = true, granted = true } = {}) {
  let active = loaded, track = granted, starts = 0;
  const timers = [], calls = [], cookies = [];
  const scope = { location: { href: "https://www.pelvi.health/diastasis-recti" } };
  function queue() {
    scope.clarity = (...args) => { calls.push(args); (scope.clarity.q ||= []).push(args); };
  }
  function start() {
    active = true; starts += 1;
    const pending = scope.clarity?.q || [];
    scope.clarity = dispatch;
    scope.clarity.v = "test-sdk";
    for (const args of pending) scope.clarity(...args);
  }
  function dispatch(method, data) {
    calls.push(data === undefined ? [method] : [method, data]);
    if (method === "stop" && active) { active = false; queue(); }
    if (method === "consentv2" && active && track && data.analytics_Storage === "denied") {
      track = false; active = false; queue(); timers.push(start);
    }
  }
  if (loaded) { scope.clarity = dispatch; scope.clarity.v = "test-sdk"; }
  else queue();
  const doc = { set cookie(value) { cookies.push(value); } };
  return { scope, doc, calls, cookies, timers, start,
    get active() { return active; }, get starts() { return starts; },
    drain() { while (timers.length) timers.shift()(); },
  };
}

test("withdrawing a previously granted session does not schedule the SDK's consent restart", () => {
  const h = sdk();
  stopClarityRecording(h.scope, h.doc);
  assert.equal(h.active, false);
  assert.equal(h.timers.length, 0, "denied must not run while the granted recorder is active");
  assert.deepEqual(h.scope.clarity.q, [["consentv2", denied]]);
  h.drain();
  assert.equal(h.starts, 0, "blocked persistence or an open payment modal cannot restart recording");
  assert.equal(h.active, false);
});

test("an opt-out before the CDN loads removes stale consent calls and remains stopped after load", () => {
  for (const analytics_Storage of ["granted", "denied"]) {
    const h = sdk({ loaded: false });
    h.scope.clarity("consentv2", { analytics_Storage, ad_Storage: "denied" });
    h.scope.clarity("set", "surface", "static_html");
    stopClarityRecording(h.scope, h.doc);
    assert.equal(h.scope.clarity.q.some((entry) => entry[0] === "consentv2" && entry[1].analytics_Storage === "granted"), false);
    h.start(); h.drain();
    assert.equal(h.active, false);
    assert.equal(h.timers.length, 0);
    assert.equal(h.starts, 1, "only the eventual CDN startup occurs, without an automatic second start");
  }
});

test("withdrawal expires only Clarity's known cookies at host and parent domain scopes", () => {
  const h = sdk(); stopClarityRecording(h.scope, h.doc);
  assert.equal(h.cookies.length, 6);
  for (const name of ["_clck", "_clsk"]) {
    const own = h.cookies.filter((value) => value.startsWith(name + "="));
    assert.equal(own.length, 3);
    assert.ok(own.some((value) => !value.includes(";Domain=")));
    for (const domain of ["www.pelvi.health", "pelvi.health", "health"]) {
      assert.equal(own.some((value) => value.includes(";Domain=" + domain + ";")), domain !== "health");
    }
    assert.ok(own.every((value) => value.includes(";Path=/;Max-Age=0;") && value.endsWith(";Secure")));
  }
});

test("blocked cookie writes and a throwing tag cannot interrupt either stop attempt", () => {
  const attempts = [];
  const scope = { location: { href: "https://pelvi.health/" }, clarity: (...args) => { attempts.push(args[0]); throw new Error("tag blocked"); } };
  const doc = { set cookie(_) { throw new Error("cookies blocked"); } };
  assert.doesNotThrow(() => stopClarityRecording(scope, doc));
  assert.deepEqual(attempts, ["stop", "consentv2"]);
});
