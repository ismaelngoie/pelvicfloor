/*
 * Pelvi's small production service worker. The registration in
 * app/ServiceWorker.jsx deliberately stays off in development.
 *
 * Only content-hashed, same-origin Next build assets enter the runtime cache.
 * HTML routes, React server payloads, APIs, Firebase, health/account records,
 * workout videos and audio are never cached here. The one HTML cache entry is
 * our generic, account-free offline page. This does not make sessions available
 * offline; it gives a failed navigation a useful way back when connected.
 *
 * Updates wait for existing tabs to close. Never skipWaiting or claim a running
 * page: swapping workers under an open workout or checkout is unnecessary.
 */
const STATIC_CACHE = "pelvi-static-v1";
const OFFLINE_CACHE = "pelvi-offline-v1";
const OFFLINE_URL = new URL("/offline.html", self.location.origin).href;
const MAX_STATIC_ENTRIES = 160;
const MAX_STATIC_BYTES = 5 * 1024 * 1024;
const HASHED_NAME = /(?:^|[.\-])[a-f0-9]{8,}(?:[.\-]|$)/i;
const STATIC_EXTENSION = /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|webp|avif|svg|ico)$/i;

function cacheableRequest(request, url) {
  if (request.method !== "GET" || url.origin !== self.location.origin) return false;
  if (url.search || !url.pathname.startsWith("/_next/static/")) return false;
  if (request.headers.has("authorization") || request.headers.has("range")) return false;
  const filename = url.pathname.slice(url.pathname.lastIndexOf("/") + 1);
  return HASHED_NAME.test(filename) && STATIC_EXTENSION.test(filename);
}

function cacheableResponse(response, pathname) {
  if (response.status !== 200 || response.redirected) return false;
  if (response.type !== "basic" && response.type !== "default") return false;
  if (/\b(?:private|no-store|no-cache)\b/i.test(response.headers.get("cache-control") || "")) return false;
  if (response.headers.get("vary")?.trim() === "*" || response.headers.has("set-cookie")) return false;
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_STATIC_BYTES) return false;
  const type = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (/\.js$/i.test(pathname)) return ["application/javascript", "text/javascript", "application/x-javascript"].includes(type);
  if (/\.css$/i.test(pathname)) return type === "text/css";
  if (/\.(?:woff2?|ttf|otf)$/i.test(pathname)) return type.startsWith("font/") || ["application/font-woff", "application/x-font-ttf", "application/x-font-opentype", "application/octet-stream"].includes(type);
  return type.startsWith("image/");
}

async function staticAsset(request, url) {
  let cache;
  try {
    cache = await caches.open(STATIC_CACHE);
    const saved = await cache.match(request);
    if (saved) return saved;
  } catch { /* Storage may be unavailable. The network remains the authority. */ }
  const response = await fetch(request);
  if (cache && cacheableResponse(response, url.pathname)) {
    try {
      await cache.put(request, response.clone());
      const keys = await cache.keys();
      await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_STATIC_ENTRIES)).map((key) => cache.delete(key)));
    } catch { /* A full or disabled cache must never break an asset request. */ }
  }
  return response;
}

function basicOfflinePage() {
  return new Response("<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Connect to Pelvi</title><body><main><h1>You’re offline</h1><p>Connect to the internet to continue. Your account and sessions are loaded online.</p><a href=\"/app\">Try Pelvi again</a></main></body></html>", {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}

async function navigation(request) {
  try {
    // Never read/write a route cache, including welcome and payment returns.
    return await fetch(request);
  } catch {
    try {
      const saved = await (await caches.open(OFFLINE_CACHE)).match(OFFLINE_URL);
      if (saved) return saved;
    } catch { /* The plain fallback below works without Cache Storage too. */ }
    return basicOfflinePage();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    try {
      const response = await fetch(OFFLINE_URL, { cache: "reload", credentials: "omit" });
      if (response.status === 200 && !response.redirected && (response.headers.get("content-type") || "").startsWith("text/html")) {
        await (await caches.open(OFFLINE_CACHE)).put(OFFLINE_URL, response);
      }
    } catch { /* Installing still succeeds if the fallback cannot be fetched. */ }
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.all(names.filter((name) =>
        (name.startsWith("pelvi-static-") || name.startsWith("pelvi-offline-"))
        && name !== STATIC_CACHE && name !== OFFLINE_CACHE
      ).map((name) => caches.delete(name)));
    } catch { /* Cleanup is optional, and never touches saved recordings. */ }
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Leave all cross-origin traffic, writes, APIs and session endpoints alone.
  if (request.method !== "GET" || url.origin !== self.location.origin || /^\/(?:api|__\/auth)(?:\/|$)/.test(url.pathname)) return;
  if (cacheableRequest(request, url)) {
    event.respondWith(staticAsset(request, url));
  } else if (request.mode === "navigate") {
    event.respondWith(navigation(request));
  }
});
