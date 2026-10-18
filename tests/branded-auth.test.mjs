import assert from "node:assert/strict";
import test from "node:test";
import { FIREBASE_AUTH_PROJECT, FIREBASE_DEFAULT_AUTH_DOMAIN, resolveFirebaseAuthDomain } from "../lib/authDomain.js";
import { proxyFirebaseAuth } from "../functions/__/auth/[[path]].js";

test("production uses branded auth only after explicit activation without changing the Firebase project", () => {
  for (const hostname of ["pelvi.health", "www.pelvi.health"]) {
    assert.equal(resolveFirebaseAuthDomain({ hostname, configuredDomain: "pelvi.health" }), "pelvi.health");
    assert.equal(resolveFirebaseAuthDomain({ hostname }), FIREBASE_DEFAULT_AUTH_DOMAIN);
    assert.equal(resolveFirebaseAuthDomain({ hostname, configuredDomain: FIREBASE_DEFAULT_AUTH_DOMAIN }), FIREBASE_DEFAULT_AUTH_DOMAIN);
  }
  assert.equal(FIREBASE_AUTH_PROJECT, "pelvic-floor-exercise-908ed");
});

test("local, preview and prerender contexts retain the previously authorized Firebase domain", () => {
  for (const hostname of ["", "localhost", "127.0.0.1", "[::1]", "preview.pelvicfloor.pages.dev", "pelvi.health.evil.example"]) {
    assert.equal(resolveFirebaseAuthDomain({ hostname }), FIREBASE_DEFAULT_AUTH_DOMAIN);
    assert.equal(resolveFirebaseAuthDomain({ hostname, configuredDomain: "pelvi.health" }), FIREBASE_DEFAULT_AUTH_DOMAIN);
  }
});

test("an explicitly configured staging project/domain is not routed through production", () => {
  assert.equal(resolveFirebaseAuthDomain({ hostname: "preview.example", projectId: "staging-project" }), "staging-project.firebaseapp.com");
  assert.equal(resolveFirebaseAuthDomain({ hostname: "pelvi.health", projectId: "staging-project", configuredDomain: "staging.example" }), "staging.example");
  assert.equal(resolveFirebaseAuthDomain({ hostname: "pelvi.health", configuredDomain: "auth.staging.example" }), "auth.staging.example");
});

test("auth documents and scripts are transparently proxied with the full original query", async () => {
  for (const path of ["handler", "handler.js", "iframe", "iframe.js", "experiments.js", "links", "links.js"]) {
    const query = "?apiKey=public-web-key&providerId=google.com&redirectUrl=https%3A%2F%2Fpelvi.health%2Fapp&eventId=unit-test";
    let outgoing;
    const response = await proxyFirebaseAuth(new Request(`https://pelvi.health/__/auth/${path}${query}`), { fetcher: async (url, options) => {
      outgoing = { url, options };
      return new Response("helper-body", { headers: { "Content-Type": path.endsWith(".js") ? "text/javascript" : "text/html", "Cache-Control": "public, max-age=1800" } });
    } });
    assert.equal(outgoing.url, `https://${FIREBASE_DEFAULT_AUTH_DOMAIN}/__/auth/${path}${query}`);
    assert.equal(outgoing.options.redirect, "manual"); assert.equal(outgoing.options.cf.cacheTtl, -1);
    assert.equal(response.status, 200); assert.equal(await response.text(), "helper-body");
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.match(response.headers.get("x-robots-tag"), /noindex/);
  }
});

test("Apple form_post callback retains the exact body, content type and origin", async () => {
  const body = "state=unit%2Bstate&code=test-only&user=%7B%22name%22%3A%22Example%22%7D";
  let forwarded;
  const response = await proxyFirebaseAuth(new Request("https://pelvi.health/__/auth/handler", { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: "https://appleid.apple.com", "User-Agent": "Example browser" } }), { fetcher: async (url, options) => {
    forwarded = { url, options };
    return new Response("callback", { status: 200 });
  } });
  assert.equal(response.status, 200); assert.equal(forwarded.options.method, "POST");
  assert.equal(new TextDecoder().decode(forwarded.options.body), body);
  assert.equal(forwarded.options.headers.get("content-type"), "application/x-www-form-urlencoded");
  assert.equal(forwarded.options.headers.get("origin"), "https://appleid.apple.com");
});

test("first-party cookies and authorization are not disclosed to the upstream helper", async () => {
  await proxyFirebaseAuth(new Request("https://pelvi.health/__/auth/iframe", { headers: { Cookie: "private_session=unit-only", Authorization: "Bearer unit-only", "CF-Connecting-IP": "203.0.113.1", "X-Forwarded-Host": "evil.example", "User-Agent": "Example browser" } }), { fetcher: async (url, options) => {
    for (const name of ["cookie", "authorization", "cf-connecting-ip", "x-forwarded-host"]) assert.equal(options.headers.has(name), false);
    assert.equal(options.headers.get("user-agent"), "Example browser");
    return new Response("iframe");
  } });
});

test("internal Firebase helper redirects retain the brand while provider redirects are untouched", async () => {
  const internal = await proxyFirebaseAuth(new Request("https://pelvi.health/__/auth/handler"), { fetcher: async () => new Response(null, { status: 302, headers: { Location: `https://${FIREBASE_DEFAULT_AUTH_DOMAIN}/__/auth/handler?eventId=unit-only` } }) });
  assert.equal(internal.status, 302); assert.equal(internal.headers.get("location"), "https://pelvi.health/__/auth/handler?eventId=unit-only");
  const provider = "https://accounts.google.com/o/oauth2/auth?state=unit-only";
  const external = await proxyFirebaseAuth(new Request("https://pelvi.health/__/auth/handler"), { fetcher: async () => new Response(null, { status: 302, headers: { Location: provider } }) });
  assert.equal(external.headers.get("location"), provider);
});

test("an upstream auth cookie is host-only on the branded response", async () => {
  const response = await proxyFirebaseAuth(new Request("https://pelvi.health/__/auth/handler"), { fetcher: async () => new Response("handler", { headers: { "Set-Cookie": `auth_example=unit-only; Domain=${FIREBASE_DEFAULT_AUTH_DOMAIN}; Path=/__/auth; Secure; HttpOnly; SameSite=None` } }) });
  assert.equal(response.headers.get("set-cookie"), "auth_example=unit-only; Path=/__/auth; Secure; HttpOnly; SameSite=None");
});

test("the proxy cannot fetch an arbitrary host or an unrelated app path", async () => {
  let calls = 0;
  const fetcher = async (url) => { calls += 1; assert.equal(new URL(url).origin, `https://${FIREBASE_DEFAULT_AUTH_DOMAIN}`); return new Response("helper"); };
  assert.equal((await proxyFirebaseAuth(new Request("https://pelvi.health/__/auth/handler?target=https://evil.example"), { fetcher })).status, 200);
  for (const path of ["/app", "/api/entitlement", "/__/auth/../firebase/init.json"]) assert.equal((await proxyFirebaseAuth(new Request(`https://pelvi.health${path}`), { fetcher })).status, 404);
  assert.equal(calls, 1);
});

test("oversized POSTs, unsupported methods and upstream failures fail without reflecting auth data", async () => {
  let calls = 0;
  const fetcher = async () => { calls += 1; throw new Error("unit-only-private-upstream-error"); };
  const large = await proxyFirebaseAuth(new Request("https://pelvi.health/__/auth/handler", { method: "POST", body: "x".repeat(65537) }), { fetcher });
  assert.equal(large.status, 413);
  const unsupported = await proxyFirebaseAuth(new Request("https://pelvi.health/__/auth/handler", { method: "DELETE" }), { fetcher });
  assert.equal(unsupported.status, 405); assert.equal(calls, 0);
  const failed = await proxyFirebaseAuth(new Request("https://pelvi.health/__/auth/handler?code=unit-only-private"), { fetcher });
  assert.equal(failed.status, 502); assert.doesNotMatch(await failed.text(), /unit-only-private/);
});

test("HEAD probes retain status and headers without a response body", async () => {
  const response = await proxyFirebaseAuth(new Request("https://pelvi.health/__/auth/iframe", { method: "HEAD" }), { fetcher: async () => new Response(null, { headers: { "Content-Type": "text/html" } }) });
  assert.equal(response.status, 200); assert.equal(await response.text(), "");
});
