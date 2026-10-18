import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../lib/marketingNavigation.js", import.meta.url), "utf8");
const { deferMarketingReload, markMarketingNavigationStarted } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
function fixture() {
  const doc = new EventTarget(), scope = new EventTarget();
  let open = true, reloads = 0, safe = true;
  let observer;
  doc.documentElement = {};
  doc.querySelector = selector => {
    assert.equal(selector, 'dialog[open], [role="dialog"][aria-modal="true"]');
    return open ? { paymentForm: true } : null;
  };
  class Observer {
    constructor(callback) { this.callback = callback; this.disconnected = false; observer = this; }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  const options = { document: doc, window: scope, Observer, canReload: () => safe, reload: () => { reloads += 1; } };
  return { doc, scope, options, get reloads() { return reloads; }, get observer() { return observer; }, setSafe(value) { safe = value; }, close() { open = false; observer.callback(); }, removeModal() { open = false; observer.callback(); } };
}

test("an open payment modal keeps its document and form until close, without a forced deadline", () => {
  const f = fixture(); deferMarketingReload(f.options);
  for (let i = 0; i < 100; i += 1) f.observer.callback();
  assert.equal(f.reloads, 0); assert.equal(f.observer.disconnected, false);
  f.close(); assert.equal(f.reloads, 1); assert.equal(f.observer.disconnected, true);
});

test("modal removal resumes exactly one shared reload across several stopped tags", () => {
  const f = fixture(); deferMarketingReload(f.options); deferMarketingReload(f.options); deferMarketingReload(f.options);
  f.removeModal(); assert.equal(f.reloads, 1); assert.equal(f.observer.disconnected, true);
});

test("persistence safety is rechecked after payment closes, and unsafe state stays stopped", () => {
  const f = fixture(); deferMarketingReload(f.options); f.setSafe(false); f.close();
  assert.equal(f.reloads, 0); assert.equal(f.observer.disconnected, true);
});

test("private navigation cancels pending and future consent-only reloads", () => {
  const f = fixture(); deferMarketingReload(f.options); markMarketingNavigationStarted(f.doc);
  f.close(); deferMarketingReload(f.options);
  assert.equal(f.reloads, 0); assert.equal(f.observer.disconnected, true);
});

test("page departure disconnects the observer and cannot reload after a later modal mutation", () => {
  for (const type of ["pagehide", "beforeunload"]) {
    const f = fixture(); deferMarketingReload(f.options); f.scope.dispatchEvent(new Event(type)); f.close();
    assert.equal(f.reloads, 0); assert.equal(f.observer.disconnected, true);
  }
});

test("cancellation releases observation without affecting another pending tag", () => {
  const f = fixture(); const cancel = deferMarketingReload(f.options);
  deferMarketingReload(f.options); cancel(); assert.equal(f.observer.disconnected, false);
  f.close(); assert.equal(f.reloads, 1);
  const alone = fixture(); deferMarketingReload(alone.options)();
  assert.equal(alone.observer.disconnected, true); alone.close(); assert.equal(alone.reloads, 0);
});

test("browsers without MutationObserver use polling only until the modal closes", () => {
  const f = fixture(); let tick, cleared = 0;
  deferMarketingReload({ ...f.options, Observer: null, schedulePoll: callback => { tick = callback; return 1; }, cancelPoll: () => { cleared += 1; } });
  assert.equal(f.reloads, 0); f.doc.querySelector = () => null; tick();
  assert.equal(f.reloads, 1); assert.equal(cleared, 1);
});
