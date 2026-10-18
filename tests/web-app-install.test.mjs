import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/webAppInstall.js", import.meta.url), "utf8");
const { createInstallPromptController, createWebAppInstallStore, webAppInstallEnvironment, INSTALL_GUIDES } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

function installEvent(outcome = "accepted") {
  let calls = 0;
  let prevented = 0;
  return {
    get calls() { return calls; },
    get prevented() { return prevented; },
    preventDefault() { prevented += 1; },
    async prompt() { calls += 1; },
    userChoice: Promise.resolve({ outcome }),
  };
}

function memberBrowser() {
  const listeners = new Map();
  return {
    navigator: { userAgent: "Mozilla/5.0 (Linux; Android 16) Chrome/140.0.0.0 Mobile Safari/537.36" },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) { listeners.get(type)?.delete(listener); },
    dispatch(type, event) { for (const listener of listeners.get(type) || []) listener(event); },
    listenerCount(type) { return listeners.get(type)?.size || 0; },
  };
}

test("a browser event received on Today survives opening and leaving You", async () => {
  const store = createWebAppInstallStore();
  const browser = memberBrowser();
  const disconnectLayout = store.connect(browser);
  const event = installEvent();
  // MemberFrame has mounted on Today; You and its setup sheet do not exist yet.
  browser.dispatch("beforeinstallprompt", event);
  assert.equal(event.calls, 0);
  assert.equal(store.getSnapshot().available, true);
  assert.equal(store.getSnapshot().environment.guide, "android");
  let sheetUpdates = 0;
  const leaveYou = store.subscribe(() => { sheetUpdates += 1; });
  assert.equal(store.getSnapshot().available, true);
  leaveYou();
  // Tab unmount only removes the sheet subscription, not the layout listener.
  assert.equal(browser.listenerCount("beforeinstallprompt"), 1);
  const returnToYou = store.subscribe(() => { sheetUpdates += 1; });
  assert.equal(store.getSnapshot().available, true);
  assert.equal(await store.requestInstall(), "accepted");
  assert.equal(event.calls, 1);
  assert.ok(sheetUpdates > 0);
  assert.equal(store.getSnapshot().outcome, "accepted");
  assert.equal(await store.requestInstall(), "unavailable");
  returnToYou();
  disconnectLayout();
});

test("events arriving while You is unmounted still reach its next subscriber", async () => {
  const store = createWebAppInstallStore();
  const browser = memberBrowser();
  const disconnectLayout = store.connect(browser);
  let oldSheetUpdates = 0;
  const leaveYou = store.subscribe(() => { oldSheetUpdates += 1; });
  leaveYou();
  const event = installEvent("dismissed");
  browser.dispatch("beforeinstallprompt", event);
  assert.equal(oldSheetUpdates, 0);
  assert.equal(store.getSnapshot().available, true);
  const leaveAgain = store.subscribe(() => {});
  assert.equal(await store.requestInstall(), "dismissed");
  leaveAgain();
  browser.dispatch("appinstalled", {});
  assert.equal(store.getSnapshot().installed, true);
  assert.equal(store.getSnapshot().available, false);
  disconnectLayout();
  assert.equal(browser.listenerCount("beforeinstallprompt"), 0);
  assert.equal(browser.listenerCount("appinstalled"), 0);
});

test("layout effect reconnection preserves the pending event without duplicate listeners", async () => {
  const store = createWebAppInstallStore();
  const browser = memberBrowser();
  const disconnect = store.connect(browser);
  const event = installEvent();
  browser.dispatch("beforeinstallprompt", event);
  const ready = store.getSnapshot();
  // Cached snapshots are stable between changes for useSyncExternalStore.
  assert.equal(store.getSnapshot(), ready);
  disconnect();
  const disconnectAgain = store.connect(browser);
  assert.equal(browser.listenerCount("beforeinstallprompt"), 1);
  assert.equal(store.getSnapshot().available, true);
  assert.equal(await store.requestInstall(), "accepted");
  assert.equal(event.calls, 1);
  disconnectAgain();
});

test("capturing an install event waits for an explicit install action", async () => {
  const updates = [];
  const controller = createInstallPromptController((state) => updates.push(state));
  const event = installEvent();
  assert.equal(controller.capture(event), true);
  assert.equal(event.prevented, 1);
  assert.equal(event.calls, 0);
  assert.deepEqual(controller.snapshot(), { available: true, busy: false, installed: false });
  assert.equal(await controller.prompt(), "accepted");
  assert.equal(event.calls, 1);
  assert.deepEqual(updates.map((state) => state.busy), [false, true, false]);
  assert.equal(await controller.prompt(), "unavailable");
  assert.equal(event.calls, 1);
  // Agreeing to a browser prompt is distinct from observing installation.
  assert.equal(controller.snapshot().installed, false);
});

test("dismissal consumes the event and a fresh browser event enables retry", async () => {
  const controller = createInstallPromptController();
  const dismissed = installEvent("dismissed");
  controller.capture(dismissed);
  assert.equal(await controller.prompt(), "dismissed");
  assert.equal(await controller.prompt(), "unavailable");
  assert.equal(dismissed.calls, 1);
  const retry = installEvent();
  controller.capture(retry);
  assert.equal(await controller.prompt(), "accepted");
  assert.equal(retry.calls, 1);
});

test("simultaneous install clicks never reuse a deferred event", async () => {
  const controller = createInstallPromptController();
  let finish;
  let calls = 0;
  controller.capture({ prompt: () => { calls += 1; return new Promise((resolve) => { finish = resolve; }); }, userChoice: Promise.resolve({ outcome: "accepted" }) });
  const pending = controller.prompt();
  assert.equal(controller.snapshot().busy, true);
  assert.equal(await controller.prompt(), "unavailable");
  finish();
  assert.equal(await pending, "accepted");
  assert.equal(calls, 1);
});

test("browser failure leaves setup usable without reusing a failed event", async () => {
  const controller = createInstallPromptController();
  controller.capture({ prompt: async () => { throw new Error("Install unavailable"); } });
  assert.equal(await controller.prompt(), "error");
  assert.deepEqual(controller.snapshot(), { available: false, busy: false, installed: false });
  assert.equal(await controller.prompt(), "unavailable");
  assert.ok(INSTALL_GUIDES.android.steps.length);
});

test("observed installation clears pending prompts and prevents further offers", async () => {
  const controller = createInstallPromptController();
  const event = installEvent();
  controller.capture(event);
  controller.markInstalled();
  assert.deepEqual(controller.snapshot(), { available: false, busy: false, installed: true });
  assert.equal(await controller.prompt(), "unavailable");
  const next = installEvent();
  assert.equal(controller.capture(next), false);
  assert.equal(next.prevented, 0);
  assert.equal(event.calls, 0);
});

test("missing install support never exposes an active browser action", async () => {
  const controller = createInstallPromptController();
  assert.equal(controller.capture({}), false);
  assert.equal(controller.capture(null), false);
  assert.equal(await controller.prompt(), "unavailable");
  assert.equal(controller.snapshot().available, false);
});

test("iPhone Safari gets Safari setup, and iPhone Chrome gets an open-in-Safari hint", () => {
  const safari = webAppInstallEnvironment({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) Version/26.0 Mobile/15E148 Safari/604.1" });
  assert.equal(safari.guide, "apple");
  assert.equal(safari.browserHint, null);
  const chrome = webAppInstallEnvironment({ userAgent: "Mozilla/5.0 (iPhone) CriOS/140.0 Mobile/15E148 Safari/604.1" });
  assert.equal(chrome.guide, "apple");
  assert.match(chrome.browserHint, /Safari/);
});

test("iPad desktop user agents still get mobile Safari setup", () => {
  assert.equal(webAppInstallEnvironment({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X) Version/26.0 Safari/605.1.15", platform: "MacIntel", maxTouchPoints: 5 }).guide, "apple");
  assert.equal(webAppInstallEnvironment({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X) Version/26.0 Safari/605.1.15", platform: "MacIntel", maxTouchPoints: 0 }).guide, "desktop");
});

test("Android chooses Chrome instructions without assuming other browsers are Chrome", () => {
  const chrome = webAppInstallEnvironment({ userAgent: "Mozilla/5.0 (Linux; Android 16) Chrome/140.0.0.0 Mobile Safari/537.36" });
  assert.equal(chrome.guide, "android");
  assert.equal(chrome.browserHint, null);
  const samsung = webAppInstallEnvironment({ userAgent: "Mozilla/5.0 (Linux; Android 16) SamsungBrowser/28.0 Chrome/140.0.0.0 Mobile Safari/537.36" });
  assert.match(samsung.browserHint, /Chrome/);
});

test("standalone launches are recognized through both supported platform signals", () => {
  assert.equal(webAppInstallEnvironment({ standalone: true }).standalone, true);
  assert.equal(webAppInstallEnvironment({ displayMode: true }).standalone, true);
  assert.equal(webAppInstallEnvironment().standalone, false);
});

test("manual guides remain browser-only, with current official setup destinations", () => {
  assert.equal(new URL(INSTALL_GUIDES.apple.url).hostname, "support.apple.com");
  assert.equal(new URL(INSTALL_GUIDES.android.url).hostname, "support.google.com");
  assert.equal(new URL(INSTALL_GUIDES.desktop.url).hostname, "support.google.com");
  assert.match(INSTALL_GUIDES.apple.steps.join(" "), /Open as Web App/);
  assert.match(INSTALL_GUIDES.android.steps.join(" "), /Install and create shortcut/);
  assert.match(INSTALL_GUIDES.desktop.steps.join(" "), /Install page as app/);
  assert.doesNotMatch(JSON.stringify(INSTALL_GUIDES), /apps\.apple\.com|play\.google\.com|offline/i);
});
