import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
const offlineHTML = await readFile(new URL("../public/offline.html", import.meta.url), "utf8");
const ORIGIN = "https://pelvi.health";

function makeWorker(network = async () => new Response("script", { headers: { "Content-Type": "application/javascript" } })) {
  const handlers = new Map(); const stores = new Map(); const requests = [];
  const counters = { skipWaiting: 0, claim: 0 };
  const key = (request) => new URL(typeof request === "string" ? request : request.url, ORIGIN).href;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async match(request) { return store.get(key(request))?.clone(); },
        async put(request, response) { store.set(key(request), response.clone()); },
        async keys() { return [...store.keys()].map((url) => ({ url })); },
        async delete(request) { return store.delete(key(request)); },
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
  };
  const context = vm.createContext({
    URL, Response, Headers, Promise,
    caches,
    fetch: async (request, options) => { requests.push({ url: key(request), options }); return network(request, options); },
    self: { location: { origin: ORIGIN }, addEventListener: (type, callback) => handlers.set(type, callback),
      skipWaiting: () => { counters.skipWaiting += 1; }, clients: { claim: () => { counters.claim += 1; } } },
  });
  vm.runInContext(source, context, { filename: "sw.js" });
  return {
    stores, caches, requests, counters,
    async lifecycle(type) { const waiting = []; handlers.get(type)({ waitUntil: (promise) => waiting.push(promise) }); await Promise.all(waiting); },
    async request(path, { method = "GET", mode = "cors", headers = {} } = {}) {
      let response;
      handlers.get("fetch")({ request: { url: new URL(path, ORIGIN).href, method, mode, headers: new Headers(headers) }, respondWith: (value) => { response = value; } });
      return response ? await response : null;
    },
  };
}

test("content-hashed public Next assets use the cache after the first successful load", async () => {
  const worker = makeWorker();
  assert.equal(await (await worker.request("/_next/static/chunks/app/page-a123456789abcdef.js")).text(), "script");
  assert.equal(await (await worker.request("/_next/static/chunks/app/page-a123456789abcdef.js")).text(), "script");
  assert.equal(worker.requests.length, 1);
  assert.equal(worker.stores.get("pelvi-static-v1").size, 1);
});

test("APIs, authentication, health records, media, RSC payloads and third-party requests are untouched", async () => {
  const worker = makeWorker();
  const paths = [
    "/api/entitlement", "/api/create-payment-intent", "/api/session-from-payment", "/__/auth/handler",
    "/content/programs_intimacy.json", "/app.txt", "/app?_rsc=private", "/welcome.txt",
    "/audio/audio_track_pain_flare.mp3", "/paywall_video.mp4", "/users/member/checkins/today",
    "https://firestore.googleapis.com/v1/projects/example/databases/default/documents/users/member",
    "https://firebasestorage.googleapis.com/video.mp4", "https://js.stripe.com/v3/",
  ];
  for (const path of paths) assert.equal(await worker.request(path), null, path);
  assert.equal(await worker.request("/api/entitlement", { mode: "navigate" }), null);
  assert.equal(await worker.request("/_next/static/chunks/page-abcdef123456.js", { method: "POST" }), null);
  assert.equal(worker.requests.length, 0);
  assert.equal(worker.stores.size, 0);
});

test("unhashed development assets, query strings, authenticated and partial asset requests are never cached", async () => {
  const worker = makeWorker();
  for (const path of ["/_next/static/development/_buildManifest.js", "/_next/static/chunks/app/page.js", "/_next/static/chunks/page-abcdef123456.js?token=private"]) {
    assert.equal(await worker.request(path), null, path);
  }
  assert.equal(await worker.request("/_next/static/chunks/page-abcdef123456.js", { headers: { Authorization: "Bearer private" } }), null);
  assert.equal(await worker.request("/_next/static/chunks/page-abcdef123456.js", { headers: { Range: "bytes=0-99" } }), null);
  assert.equal(worker.stores.size, 0);
});

test("HTML, redirects, private responses and errors cannot masquerade as cacheable script assets", async () => {
  const responses = [
    new Response("account HTML", { headers: { "Content-Type": "text/html" } }),
    new Response("private", { headers: { "Content-Type": "application/javascript", "Cache-Control": "private" } }),
    new Response("sensitive", { headers: { "Content-Type": "application/javascript", "Cache-Control": "no-store" } }),
    new Response("varies", { headers: { "Content-Type": "application/javascript", Vary: "*" } }),
    new Response("cookie", { headers: { "Content-Type": "application/javascript", "Set-Cookie": "private=1" } }),
    new Response("missing", { status: 404, headers: { "Content-Type": "application/javascript" } }),
    new Response("partial", { status: 206, headers: { "Content-Type": "application/javascript" } }),
    new Response("big", { headers: { "Content-Type": "application/javascript", "Content-Length": String(6 * 1024 * 1024) } }),
  ];
  const redirected = new Response("redirected", { headers: { "Content-Type": "application/javascript" } });
  Object.defineProperty(redirected, "redirected", { value: true }); responses.push(redirected);
  for (const response of responses) {
    const worker = makeWorker(async () => response);
    assert.equal(await worker.request("/_next/static/chunks/page-abcdef123456.js"), response);
    assert.equal(worker.stores.get("pelvi-static-v1").size, 0);
  }
});

test("install stores only the neutral fallback and does not replace the worker under an open page", async () => {
  const worker = makeWorker(async () => new Response(offlineHTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }));
  await worker.lifecycle("install");
  assert.deepEqual(worker.requests.map((request) => request.url), [`${ORIGIN}/offline`]);
  assert.equal(worker.requests[0].options.cache, "reload");
  assert.equal(worker.requests[0].options.credentials, "omit");
  assert.equal(worker.stores.get("pelvi-offline-v1").size, 1);
  assert.deepEqual(worker.counters, { skipWaiting: 0, claim: 0 });
});

test("navigation always fetches fresh HTML and never adds account or checkout responses to a cache", async () => {
  let calls = 0;
  const worker = makeWorker(async () => new Response(`fresh-${++calls}`, { headers: { "Content-Type": "text/html" } }));
  const url = "/welcome?payment_intent_client_secret=not-a-real-secret";
  assert.equal(await (await worker.request(url, { mode: "navigate" })).text(), "fresh-1");
  assert.equal(await (await worker.request(url, { mode: "navigate" })).text(), "fresh-2");
  assert.equal(worker.stores.size, 0);
});

test("offline navigation returns generic help without storing or echoing the requested URL", async () => {
  const worker = makeWorker(async (request) => {
    if ((typeof request === "string" ? request : request.url).endsWith("/offline")) return new Response(offlineHTML, { headers: { "Content-Type": "text/html" } });
    throw new TypeError("network offline");
  });
  await worker.lifecycle("install");
  const response = await worker.request("/app/you?private=test-marker", { mode: "navigate" });
  const body = await response.text();
  assert.match(body, /You’re offline/);
  assert.match(body, /account and sessions are loaded online/);
  assert.ok(!body.includes("test-marker"));
  assert.deepEqual([...worker.stores.keys()], ["pelvi-offline-v1"]);
});

test("the worker and offline fallback still work when installing the fallback fails", async () => {
  const worker = makeWorker(async () => { throw new TypeError("offline"); });
  await worker.lifecycle("install");
  const response = await worker.request("/app", { mode: "navigate" });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(await response.text(), /Connect to the internet/);
});

test("HTTP application errors pass through instead of being disguised as offline", async () => {
  const worker = makeWorker(async () => new Response("real server error", { status: 500 }));
  const response = await worker.request("/app", { mode: "navigate" });
  assert.equal(response.status, 500);
  assert.equal(await response.text(), "real server error");
});

test("activation removes only obsolete worker caches and preserves downloaded audio and other apps", async () => {
  const worker = makeWorker();
  for (const name of ["pelvi-static-v0", "pelvi-offline-v0", "pelvi-static-v1", "pelvi-offline-v1", "pelvi-recorded-audio-v1", "another-app-cache"]) await worker.caches.open(name);
  await worker.lifecycle("activate");
  assert.deepEqual([...worker.stores.keys()].sort(), ["another-app-cache", "pelvi-offline-v1", "pelvi-recorded-audio-v1", "pelvi-static-v1"]);
  assert.deepEqual(worker.counters, { skipWaiting: 0, claim: 0 });
});

test("a storage quota error cannot prevent a public script from loading", async () => {
  const worker = makeWorker();
  worker.caches.open = async () => { throw new Error("quota exceeded"); };
  assert.equal(await (await worker.request("/_next/static/chunks/page-abcdef123456.js")).text(), "script");
});

test("the runtime asset cache stays bounded", async () => {
  const worker = makeWorker();
  const cache = await worker.caches.open("pelvi-static-v1");
  for (let index = 0; index < 160; index += 1) await cache.put(`${ORIGIN}/_next/static/chunks/old-${index}-abcdef123456.js`, new Response("old"));
  await worker.request("/_next/static/chunks/new-abcdef123456.js");
  assert.equal(worker.stores.get("pelvi-static-v1").size, 160);
  assert.equal(await cache.match(`${ORIGIN}/_next/static/chunks/old-0-abcdef123456.js`), undefined);
});
