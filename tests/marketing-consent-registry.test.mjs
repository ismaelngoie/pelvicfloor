import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { CONSENT_MAX_AGE_MS, consentRegistryKey, createMarketingConsentRegistry, mergeMarketingDecision, normalizeMarketingDecision } from "../functions-lib/marketingConsentRegistry.js";
import { handleMarketingConsent } from "../functions/api/marketing-consent.js";

const now = Date.parse("2026-10-18T16:00:00Z");
const consentId = "eb942c3a-a51c-4a04-822a-e79384423f11";
const grant = { v: 1, consentId, decidedAt: now - 1000, analytics: true, advertising: true, matching: true };
function incoming(body = grant, headers = {}) {
  return new Request("https://pelvi.health/api/marketing-consent", { method: "POST", headers: { Origin: "https://pelvi.health", "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.89", ...headers }, body: JSON.stringify(body) });
}
function fields(choice) {
  return { v: { integerValue: "1" }, decidedAt: { integerValue: String(choice.decidedAt) }, analytics: { booleanValue: choice.analytics }, advertising: { booleanValue: choice.advertising }, matching: { booleanValue: choice.matching } };
}
async function firestore(initial, { beforeWrite, failReads = false } = {}) {
  let version = initial ? 1 : 0;
  let record = initial ? { fields: fields(initial), updateTime: `version-${version}` } : null;
  const calls = [];
  const set = (choice) => { version += 1; record = { fields: fields(choice), updateTime: `version-${version}` }; };
  const fetcher = async (url, options) => {
    assert.doesNotMatch(url, new RegExp(consentId));
    calls.push({ url, ...options });
    if (options.method !== "PATCH") {
      if (failReads) return Response.json({ error: "Unavailable" }, { status: 503 });
      return record ? Response.json(record) : Response.json({}, { status: 404 });
    }
    await beforeWrite?.({ set, calls });
    const parsed = new URL(url);
    if (parsed.searchParams.get("currentDocument.exists") === "false" ? record !== null : parsed.searchParams.get("currentDocument.updateTime") !== record?.updateTime) return Response.json({ error: { status: "FAILED_PRECONDITION" } }, { status: 412 });
    version += 1; record = { ...JSON.parse(options.body), updateTime: `version-${version}` };
    return Response.json(record);
  };
  const registry = await createMarketingConsentRegistry({}, { fetcher, authenticate: async () => ({ projectId: "unit-test-project", token: "unit-test-token" }) });
  return { registry, calls, record: () => record, set };
}

test("registry keys hash the capability and records contain no capability or identifying data", async () => {
  assert.equal(await consentRegistryKey(consentId), createHash("sha256").update(consentId).digest("hex"));
  const store = await firestore();
  await store.registry.save(grant);
  const write = store.calls.find((call) => call.method === "PATCH");
  assert.match(write.url, /currentDocument\.exists=false/);
  assert.deepEqual(JSON.parse(write.body), { fields: fields(grant) });
  assert.doesNotMatch(write.body, /eb942c3a|email|name|ip|agent|url/i);
  assert.equal((await store.registry.get(consentId)).advertising, true);
});

test("a later withdrawal wins over older grants, and a later new choice can grant again", () => {
  const withdrawn = { ...grant, decidedAt: now, advertising: false, matching: false };
  assert.deepEqual(mergeMarketingDecision(withdrawn, grant), withdrawn);
  assert.deepEqual(mergeMarketingDecision(grant, withdrawn), withdrawn);
  const newGrant = { ...grant, decidedAt: now + 1 };
  assert.deepEqual(mergeMarketingDecision(withdrawn, newGrant), newGrant);
});

test("equal-time decisions intersect so denial and narrower matching win in either arrival order", () => {
  const narrower = { ...grant, analytics: false, matching: false };
  assert.deepEqual(mergeMarketingDecision(grant, narrower), narrower);
  assert.deepEqual(mergeMarketingDecision(narrower, grant), narrower);
  const denied = { ...grant, advertising: false, matching: false };
  assert.equal(mergeMarketingDecision(grant, denied).advertising, false);
  assert.equal(mergeMarketingDecision(denied, grant).advertising, false);
});

test("Firestore update preconditions prevent an in-flight older grant from undoing a withdrawal", async () => {
  let raced = false;
  const withdrawn = { ...grant, decidedAt: now, advertising: false, matching: false };
  const store = await firestore({ ...grant, decidedAt: now - 3000 }, { beforeWrite: ({ set }) => {
    if (!raced) { raced = true; set(withdrawn); }
  } });
  const result = await store.registry.save(grant);
  assert.equal(result.advertising, false); assert.equal(result.decidedAt, withdrawn.decidedAt);
  const write = store.calls.find((call) => call.method === "PATCH");
  assert.match(write.url, /currentDocument\.updateTime=version-1/);
  assert.equal(store.record().fields.advertising.booleanValue, false);
  assert.equal(store.calls.filter((call) => call.method !== "PATCH").length, 2);
});

test("the first grant cannot overwrite a simultaneous equal-time withdrawal during document creation", async () => {
  let raced = false;
  const denied = { ...grant, advertising: false, matching: false };
  const store = await firestore(undefined, { beforeWrite: ({ set }) => {
    if (!raced) { raced = true; set(denied); }
  } });
  const result = await store.registry.save(grant);
  assert.equal(result.advertising, false);
  assert.match(store.calls.find((call) => call.method === "PATCH").url, /currentDocument\.exists=false/);
  assert.equal(store.record().fields.advertising.booleanValue, false);
});

test("an unchanged decision produces no unnecessary Firestore write", async () => {
  const store = await firestore(grant);
  await store.registry.save(grant);
  assert.equal(store.calls.filter((call) => call.method === "PATCH").length, 0);
});

test("malformed, expired, future and guessable consent capabilities are rejected", () => {
  for (const choice of [null, {}, { ...grant, v: 2 }, { ...grant, consentId: "known-user@example.com" }, { ...grant, consentId: "123" }, { ...grant, decidedAt: now + 60001 }, { ...grant, decidedAt: now - CONSENT_MAX_AGE_MS - 1 }]) {
    assert.equal(normalizeMarketingDecision(choice, incoming(), { now }), null);
  }
});

test("privacy signals force denial and normalization drops all extra body fields", () => {
  const gpc = normalizeMarketingDecision({ ...grant, email: "private@example.com", goalId: "private-goal" }, incoming(grant, { "Sec-GPC": "1" }), { now });
  assert.equal(gpc.advertising, false); assert.equal(gpc.matching, false); assert.equal(gpc.analytics, true);
  assert.deepEqual(Object.keys(gpc).sort(), ["advertising", "analytics", "consentId", "decidedAt", "matching", "v"]);
  const dnt = normalizeMarketingDecision(grant, incoming(grant, { DNT: "1" }), { now });
  assert.equal(dnt.advertising, false); assert.equal(dnt.analytics, false);
});

test("endpoint persists only normalized decisions and returns no capability", async () => {
  const store = await firestore();
  const response = await handleMarketingConsent({ request: incoming({ ...grant, email: "private@example.com" }), env: {} }, { registry: store.registry, now });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, effective: { advertising: true, matching: true }, decidedAt: grant.decidedAt });
  assert.equal(JSON.stringify(store.record()).includes("private@example.com"), false);
});

test("endpoint returns effective newer denial when a delayed older grant arrives", async () => {
  const store = await firestore({ ...grant, decidedAt: now, advertising: false, matching: false });
  const response = await handleMarketingConsent({ request: incoming(grant), env: {} }, { registry: store.registry, now });
  assert.deepEqual(await response.json(), { ok: true, effective: { advertising: false, matching: false }, decidedAt: now });
  assert.equal(store.calls.some((call) => call.method === "PATCH"), false);
});

test("registry outages fail closed without claiming consent synchronized", async () => {
  const store = await firestore(undefined, { failReads: true });
  const response = await handleMarketingConsent({ request: incoming(), env: {} }, { registry: store.registry, now });
  assert.equal(response.status, 503); assert.deepEqual(await response.json(), { ok: false });
});

test("foreign origins, oversized bodies and absent server configuration cannot write consent", async () => {
  let saves = 0;
  const registry = { save: async () => { saves += 1; return grant; } };
  const foreign = await handleMarketingConsent({ request: incoming(grant, { Origin: "https://foreign.example" }), env: {} }, { registry, now });
  assert.equal(foreign.status, 403);
  const oversized = await handleMarketingConsent({ request: incoming({ ...grant, extra: "x".repeat(3000) }), env: {} }, { registry, now });
  assert.equal(oversized.status, 400);
  const missing = await handleMarketingConsent({ request: incoming(), env: {} }, { now });
  assert.equal(missing.status, 503); assert.equal(saves, 0);
});
