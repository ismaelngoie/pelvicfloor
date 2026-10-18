import assert from "node:assert/strict";
import test from "node:test";
import { automaticMeasurementEligible } from "../functions-lib/marketingPolicy.js";
import { onRequestGet } from "../functions/api/marketing-config.js";
import { handleMarketingConsent } from "../functions/api/marketing-consent.js";
import { createMarketingConsentRegistry, mergeMarketingDecision, normalizeMarketingDecision } from "../functions-lib/marketingConsentRegistry.js";
import { buildMetaAttribution } from "../functions-lib/metaConversions.js";

const now = Date.parse("2026-10-18T20:00:00Z");
const automatic = { v: 1, consentId: "eb942c3a-a51c-4a04-822a-e79384423f11", decidedAt: now,
  basis: "automatic", analytics: true, advertising: true, matching: false };
function incoming({ country = "US", regionCode = "NY", headers = {}, body = automatic, origin = "https://pelvi.health" } = {}) {
  const request = new Request(`${origin}/api/marketing-consent`, { method: "POST",
    headers: { Origin: "https://pelvi.health", "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.208", ...headers }, body: JSON.stringify(body) });
  Object.defineProperty(request, "cf", { value: { country, regionCode } });
  return request;
}

test("automatic rollout uses trusted US region metadata and stays off in consent jurisdictions and unknown places", () => {
  for (const regionCode of ["NY", "CA", "TX", "DC"]) assert.equal(automaticMeasurementEligible(incoming({ regionCode })), true);
  for (const regionCode of ["WA", "NV", "CT", "", null, "ZZ"]) assert.equal(automaticMeasurementEligible(incoming({ regionCode })), false);
  for (const country of ["GB", "CH", "FR", "DE", "CA", "", null, "XX"]) assert.equal(automaticMeasurementEligible(incoming({ country })), false);
  const spoofed = new Request("https://pelvi.health/api/marketing-config", { headers: { "CF-IPCountry": "US", "CF-Region-Code": "NY" } });
  assert.equal(automaticMeasurementEligible(spoofed), false);
  for (const headers of [{ "Sec-GPC": "1" }, { DNT: "1" }]) assert.equal(automaticMeasurementEligible(incoming({ headers })), false);
});

test("automatic defaults are restricted to the production website and never activate fixed ad IDs in preview or development", async () => {
  assert.equal(automaticMeasurementEligible(incoming({ origin: "https://www.pelvi.health" })), true);
  for (const origin of ["https://pelvicfloor.pages.dev", "https://preview.pelvicfloor.pages.dev", "http://localhost:3100", "http://pelvi.health", "https://pelvi.health.evil.example", "https://other.example"]) {
    const request = incoming({ origin });
    assert.equal(automaticMeasurementEligible(request), false);
    assert.equal((await onRequestGet({ request }).json()).automaticMeasurement.eligible, false);
    assert.deepEqual(buildMetaAttribution(automatic, request, { now }), {});
  }
});

test("public bootstrap exposes eligibility and basis without country, credentials or cacheable per-visitor config", async () => {
  const response = onRequestGet({ request: incoming(), env: { META_TRACKING_ENABLED: "true", META_DATASET_ID: "1085385884288765", META_CONVERSIONS_ACCESS_TOKEN: "must-stay-private", META_EMAIL_MATCHING_ENABLED: "false" } });
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.deepEqual(body.automaticMeasurement, { eligible: true, basis: "automatic" });
  assert.equal(body.emailMatchingEnabled, true, "feature availability does not grant visitor matching permission");
  assert.doesNotMatch(JSON.stringify(body), /country|region|must-stay-private/);
  assert.deepEqual((await onRequestGet({ request: incoming({ country: "FR" }) }).json()).automaticMeasurement, { eligible: false, basis: "automatic" });
});

test("automatic registry decisions retain their basis and never obtain email matching permission", () => {
  const choice = normalizeMarketingDecision({ ...automatic, matching: true }, incoming(), { now });
  assert.equal(choice.basis, "automatic"); assert.equal(choice.advertising, true); assert.equal(choice.analytics, true); assert.equal(choice.matching, false);
  for (const request of [incoming({ country: "FR" }), incoming({ regionCode: "WA" }), incoming({ headers: { "Sec-GPC": "1" } }), incoming({ headers: { DNT: "1" } })]) {
    const denied = normalizeMarketingDecision(automatic, request, { now });
    assert.equal(denied.advertising, false); assert.equal(denied.matching, false); assert.equal(denied.analytics, false);
  }
  assert.equal(normalizeMarketingDecision({ ...automatic, basis: "accepted" }, incoming(), { now }), null);
});

test("legacy explicit decisions remain unchanged and automatic defaults never override them", () => {
  const { basis, ...legacy } = automatic;
  assert.deepEqual(normalizeMarketingDecision({ ...legacy, matching: true }, incoming({ country: "FR" }), { now }), { ...legacy, matching: true });
  const denied = { ...legacy, decidedAt: now - 1000, advertising: false, matching: false };
  assert.deepEqual(mergeMarketingDecision(denied, automatic), denied);
  const explicit = { ...denied, basis: "explicit" };
  assert.deepEqual(mergeMarketingDecision(explicit, automatic), explicit);
  const withdrawal = { ...automatic, basis: "explicit", advertising: false, matching: false };
  const effective = mergeMarketingDecision(automatic, withdrawal);
  assert.equal(effective.basis, "explicit"); assert.equal(effective.advertising, false);
  assert.deepEqual(mergeMarketingDecision(effective, { ...automatic, decidedAt: now + 1 }), effective);
});

test("server endpoint normalizes automatic geography and never trusts a client eligibility claim", async () => {
  let saved;
  const registry = { save: async choice => { saved = choice; return choice; } };
  const response = await handleMarketingConsent({ request: incoming({ country: "GB", body: { ...automatic, eligible: true, country: "US", regionCode: "NY" } }), env: {} }, { registry, now });
  assert.equal(response.status, 200); assert.equal(saved.basis, "automatic");
  assert.deepEqual((await response.json()).effective, { advertising: false, matching: false });
  assert.equal(saved.country, undefined); assert.equal(saved.regionCode, undefined);
});

test("Firestore retains automatic basis and a later explicit withdrawal survives attempted automatic restart", async () => {
  let record;
  let version = 0;
  const registry = await createMarketingConsentRegistry({}, {
    authenticate: async () => ({ projectId: "unit-test", token: "unit-test-token" }),
    fetcher: async (_url, options) => {
      if (options.method !== "PATCH") return record ? Response.json(record) : Response.json({}, { status: 404 });
      record = { ...JSON.parse(options.body), updateTime: `version-${++version}` };
      return Response.json(record);
    },
  });
  await registry.save(automatic);
  assert.equal(record.fields.basis.stringValue, "automatic");
  assert.equal((await registry.get(automatic.consentId)).basis, "automatic");
  await registry.save({ ...automatic, basis: "explicit", decidedAt: now + 1, advertising: false, matching: false });
  const result = await registry.save({ ...automatic, decidedAt: now + 2 });
  assert.equal(result.advertising, false); assert.equal(result.basis, "explicit");
  assert.equal(record.fields.advertising.booleanValue, false);
});

test("checkout attribution is labeled automatic, bounded by current server geography and never enables matching", () => {
  const metadata = buildMetaAttribution({ ...automatic, matching: true }, incoming(), { now });
  assert.equal(metadata.meta_basis, "automatic"); assert.equal(metadata.meta_consent, "1"); assert.equal(metadata.meta_email_match, undefined);
  for (const request of [incoming({ country: "FR" }), incoming({ regionCode: "WA" }), incoming({ headers: { "Sec-GPC": "1" } }), incoming({ headers: { DNT: "1" } })]) assert.deepEqual(buildMetaAttribution(automatic, request, { now }), {});
  assert.deepEqual(buildMetaAttribution({ ...automatic, basis: "consented" }, incoming(), { now }), {});
});
