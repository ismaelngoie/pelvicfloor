import { FIREBASE_DEFAULT_AUTH_DOMAIN } from "../../../lib/authDomain.js";

const UPSTREAM_ORIGIN = `https://${FIREBASE_DEFAULT_AUTH_DOMAIN}`;
const AUTH_PREFIX = "/__/auth/";
const MAX_POST_BYTES = 65536;
const FORWARDED_HEADERS = ["accept", "accept-language", "content-type", "origin", "referer", "user-agent", "x-client-version"];

export async function onRequest({ request }) { return proxyFirebaseAuth(request); }

// Firebase's documented reverse-proxy flow supports Apple form_post as well as
// popup/redirect helper documents. This is not a browser redirect to Firebase:
// the helper iframe and callback retain the pelvi.health origin.
export async function proxyFirebaseAuth(request, { fetcher = fetch } = {}) {
  const incoming = new URL(request.url);
  if (!incoming.pathname.startsWith(AUTH_PREFIX)) return failure(404);
  if (!["GET", "HEAD", "POST"].includes(request.method)) return failure(405, { Allow: "GET, HEAD, POST" });
  const target = new URL(UPSTREAM_ORIGIN);
  target.pathname = incoming.pathname;
  target.search = incoming.search;
  const headers = new Headers({ "Cache-Control": "no-cache" });
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  let body;
  if (request.method === "POST") {
    try { body = await boundedBody(request); }
    catch { return failure(413); }
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const upstream = await fetcher(target.toString(), {
      method: request.method, headers, body, redirect: "manual", signal: controller.signal,
      cf: { cacheTtl: -1, cacheEverything: false },
    });
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set("Cache-Control", "private, no-store, max-age=0");
    responseHeaders.set("CDN-Cache-Control", "no-store");
    responseHeaders.set("Referrer-Policy", "no-referrer");
    responseHeaders.set("X-Content-Type-Options", "nosniff");
    responseHeaders.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    responseHeaders.delete("Content-Length");
    const location = responseHeaders.get("Location");
    if (location) {
      const redirect = new URL(location, target);
      if (redirect.origin === UPSTREAM_ORIGIN && redirect.pathname.startsWith(AUTH_PREFIX)) {
        responseHeaders.set("Location", `${incoming.origin}${redirect.pathname}${redirect.search}${redirect.hash}`);
      }
    }
    // Hosting normally sets no helper cookie. If it does, retain it as a
    // first-party auth cookie instead of an unusable firebaseapp.com cookie.
    const cookies = typeof upstream.headers.getSetCookie === "function" ? upstream.headers.getSetCookie()
      : typeof upstream.headers.getAll === "function" ? upstream.headers.getAll("Set-Cookie")
        : upstream.headers.has("Set-Cookie") ? [upstream.headers.get("Set-Cookie")] : [];
    if (cookies.length) {
      responseHeaders.delete("Set-Cookie");
      for (const cookie of cookies) responseHeaders.append("Set-Cookie", cookie.replace(/;\s*Domain=[^;]+/ig, ""));
    }
    return new Response(request.method === "HEAD" ? null : upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
  } catch { return failure(502); }
  finally { clearTimeout(timeout); }
}

function failure(status, headers = {}) {
  return new Response("Sign in is temporarily unavailable. Please return to Pelvi and try again.", {
    status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow", ...headers },
  });
}

async function boundedBody(request) {
  if (Number(request.headers.get("Content-Length")) > MAX_POST_BYTES) throw new Error("body_too_large");
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_POST_BYTES) { await reader.cancel(); throw new Error("body_too_large"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
