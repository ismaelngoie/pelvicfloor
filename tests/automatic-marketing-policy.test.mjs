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

test("automatic defaults are restricted to the production website and never activate fixed ad IDs in preview or development", async () => {
  assert.equal(automaticMeasurementEligible(incoming({ origin: "https://www.pelvi.health" })), true);
  for (const origin of ["https://pelvicfloor.pages.dev", "https://preview.pelvicfloor.pages.dev", "http://localhost:3100", "http://pelvi.health", "https://pelvi.health.evil.example", "https://other.example"]) {
    const request = incoming({ origin });
    assert.equal(automaticMeasurementEligible(request), false);
    assert.equal((await onRequestGet({ request }).json()).automaticMeasurement.eligible, false);
    assert.deepEqual(buildMetaAttribution(automatic, request, { now }), {});
  }
});

