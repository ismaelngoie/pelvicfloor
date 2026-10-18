import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { automaticMeasurementEligible } from "../functions-lib/marketingPolicy.js";
import { mergeMarketingDecision, normalizeMarketingDecision } from "../functions-lib/marketingConsentRegistry.js";
import { buildMetaAttribution } from "../functions-lib/metaConversions.js";

// Owner decision (Oct 2026, testing phase): measurement and purchase email
// matching run for every visitor, with no location, signal or opt-out exceptions.
const now = Date.parse("2026-10-18T20:00:00Z");
const consentId = "eb942c3a-a51c-4a04-822a-e79384423f11";
const automatic = { v: 1, consentId, decidedAt: now, basis: "automatic", analytics: true, advertising: true, matching: true };
const privacySignals = { "Sec-GPC": "1", DNT: "1" };
function incoming({ country, regionCode, headers = {}, origin = "https://pelvi.health" } = {}) {
  const request = new Request(`${origin}/api/marketing-consent`, { method: "POST",
    headers: { Origin: "https://pelvi.health", "Content-Type": "application/json", ...headers }, body: "{}" });
  if (country !== undefined) Object.defineProperty(request, "cf", { value: { country, regionCode } });
  return request;
}

test("every pelvi.health visitor is eligible, whatever the location or browser privacy signal", () => {
  for (const place of [{ country: "US", regionCode: "WA" }, { country: "US", regionCode: "NV" }, { country: "DE", regionCode: "BE" }, {}]) {
    assert.equal(automaticMeasurementEligible(incoming({ ...place, headers: privacySignals })), true, JSON.stringify(place));
  }
  assert.equal(automaticMeasurementEligible(incoming({ origin: "https://www.pelvi.health" })), true);
  for (const origin of ["https://preview.pages.dev", "http://localhost:3100", "https://pelvi.health.evil.test"]) {
    assert.equal(automaticMeasurementEligible(incoming({ origin })), false, origin);
  }
});

test("registry decisions ignore privacy signals and carry email matching whenever advertising is on", () => {
  const decision = normalizeMarketingDecision({ ...automatic, matching: false, gpc: true, doNotTrack: "1" }, incoming({ country: "US", regionCode: "WA", headers: privacySignals }), { now });
  assert.deepEqual(decision, { v: 1, consentId, decidedAt: now, analytics: true, advertising: true, matching: true, basis: "automatic" });
});

test("a newer automatic decision replaces an older saved opt-out", () => {
  const optOut = { v: 1, consentId, decidedAt: now - 60000, basis: "explicit", analytics: false, advertising: false, matching: false };
  assert.deepEqual(mergeMarketingDecision(optOut, { ...automatic }), automatic);
});

test("checkout attribution is kept under privacy signals and always requests email matching", () => {
  const metadata = buildMetaAttribution({ ...automatic, gpc: true, doNotTrack: true, fbp: "fb.1.1800000000000.1234567890" },
    incoming({ country: "US", regionCode: "WA", headers: privacySignals }), { now });
  assert.equal(metadata.meta_consent, "1");
  assert.equal(metadata.meta_basis, "automatic");
  assert.equal(metadata.meta_email_match, "1");
});

test("browser measurement ignores Global Privacy Control and Do Not Track", async () => {
  const source = await readFile(new URL("../public/marketing-consent.js", import.meta.url), "utf8");
  const { readMarketingConsent, clarityConsentPolicy } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const values = new Map([["pelvi.privacy.v1", JSON.stringify({ v: 1, analytics: true, advertising: true, matching: false, decidedAt: now, consentId, basis: "explicit" })]]);
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  const choice = readMarketingConsent({ storage, browser: { globalPrivacyControl: true, doNotTrack: "1" }, now, document: null });
  assert.equal(choice.analytics, true);
  assert.equal(choice.advertising, true);
  assert.equal(choice.matching, true);
  assert.equal(clarityConsentPolicy(choice).enabled, true);
});
