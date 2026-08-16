import {
  accessToken,
  json,
  parseServiceAccount,
  patchDocument,
  projectIdFrom,
  readJson,
  typedValue,
} from "../../functions-lib/stripeSync.js";

// RevenueCat webhook destination:
//   https://pelvi.health/api/revenuecat-events
//
// The configured Authorization header must exactly match
// REVENUECAT_WEBHOOK_AUTH in Cloudflare. Event ids are used as Firestore
// document ids, so RevenueCat retries are naturally idempotent.
export async function onRequestPost({ request, env }) {
  if (!env.REVENUECAT_WEBHOOK_AUTH || request.headers.get("Authorization") !== env.REVENUECAT_WEBHOOK_AUTH) {
    return json(401, { error: "Unauthorized." });
  }
  if (!env.FIREBASE_SERVICE_ACCOUNT) return json(503, { error: "Firebase service account is not configured." });

  const body = await readJson(request, 131072);
  if (!body) return json(400, { error: "RevenueCat sent invalid JSON." });
  const event = body.event;
  if (!event?.id || !event?.type) return json(400, { error: "RevenueCat event is missing its id or type." });

  // The admin is intentionally app-only. Ignore Stripe, sandbox, and the
  // other RevenueCat projects even if a wider webhook is configured.
  if (event.environment !== "PRODUCTION" || !["APP_STORE", "MAC_APP_STORE"].includes(event.store)) {
    return json(200, { received: true, stored: false });
  }

  try {
    const account = parseServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
    const token = await accessToken(account);
    const projectId = projectIdFrom(env, account);
    const attributes = event.subscriber_attributes || {};
    const campaign = attributionPair(
      attribute(attributes, "$campaign"),
      attribute(attributes, "$appleAdsCampaignId")
    );
    const adGroup = attributionPair(
      attribute(attributes, "$adGroup"),
      attribute(attributes, "$appleAdsAdGroupId")
    );
    const fields = {
      type: typedValue(event.type),
      store: typedValue(event.store),
      environment: typedValue(event.environment),
      appId: typedValue(event.app_id || ""),
      appUserId: typedValue(event.app_user_id || ""),
      originalAppUserId: typedValue(event.original_app_user_id || ""),
      productId: typedValue(event.product_id || ""),
      periodType: typedValue(event.period_type || ""),
      occurredAt: typedValue(iso(event.event_timestamp_ms)),
      purchasedAt: typedValue(iso(event.purchased_at_ms)),
      expirationAt: typedValue(iso(event.expiration_at_ms)),
      transactionId: typedValue(event.transaction_id || ""),
      originalTransactionId: typedValue(event.original_transaction_id || ""),
      campaignId: typedValue(campaign.id),
      campaignName: typedValue(campaign.name),
      adGroupId: typedValue(adGroup.id),
      adGroupName: typedValue(adGroup.name),
      keyword: typedValue(attribute(attributes, "$keyword")),
      mediaSource: typedValue(attribute(attributes, "$mediaSource")),
      price: typedValue(Number(event.price) || 0),
      currency: typedValue(event.currency || "USD"),
      trialConversion: typedValue(event.is_trial_conversion === true),
      cancelReason: typedValue(event.cancel_reason || ""),
      expirationReason: typedValue(event.expiration_reason || ""),
      receivedAt: typedValue(new Date().toISOString()),
    };
    await patchDocument({
      projectId,
      token,
      path: `revenuecat_events/${encodeURIComponent(event.id)}`,
      fields,
      updateMask: Object.keys(fields),
    });
    return json(200, { received: true, stored: true });
  } catch (error) {
    console.error("RevenueCat event storage failed", { message: error?.message || "unknown", type: event.type });
    return json(503, { error: "The event could not be stored yet. RevenueCat should retry it." });
  }
}

function attribute(attributes, name) {
  const entry = attributes?.[name];
  return typeof entry?.value === "string" ? entry.value : "";
}

// The approved iPhone app sends Apple's numeric ids through RevenueCat's
// $campaign/$adGroup fields. RevenueCat's Advanced integration can instead
// resolve those same fields to human-readable names. Accept both shapes, and
// prefer the dedicated id attribute if a future SDK supplies it.
function attributionPair(value, explicitId) {
  const raw = typeof value === "string" ? value.trim() : "";
  const id = typeof explicitId === "string" && explicitId.trim()
    ? explicitId.trim()
    : /^\d+$/.test(raw) ? raw : "";
  return { id, name: id === raw ? "" : raw };
}

function iso(milliseconds) {
  const value = Number(milliseconds);
  if (!Number.isFinite(value) || value <= 0) return "";
  return new Date(value).toISOString();
}
