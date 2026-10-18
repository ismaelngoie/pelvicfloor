import { ipRateLimited, json, originAllowed, readJson } from "../../functions-lib/stripeSync.js";
import { createMarketingConsentRegistry, normalizeMarketingDecision } from "../../functions-lib/marketingConsentRegistry.js";

export async function onRequestPost(context) { return handleMarketingConsent(context); }

export async function handleMarketingConsent({ request, env }, { registry, now = Date.now() } = {}) {
  if (!originAllowed(request, env)) return json(403, { ok: false });
  if (ipRateLimited(request, { max: 60 })) return json(429, { ok: false });
  const body = await readJson(request, 2048);
  const choice = normalizeMarketingDecision(body, request, { now });
  if (!choice) return json(400, { ok: false });
  if (!registry && !env.FIREBASE_SERVICE_ACCOUNT) return json(503, { ok: false });
  try {
    const store = registry || await createMarketingConsentRegistry(env);
    const effective = await store.save(choice);
    return json(200, { ok: true, effective: { advertising: effective.advertising, matching: effective.matching }, decidedAt: effective.decidedAt });
  } catch { return json(503, { ok: false }); }
}
