import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import Stripe from "stripe";
import { buildMetaAttribution, metaPurchaseEventId, reportMetaInvoicePurchase } from "../functions-lib/metaConversions.js";
import { handleMetaPurchase } from "../functions/api/meta-purchase.js";
import { handleStripeEvents } from "../functions/api/stripe-events.js";

const now = Date.parse("2026-10-18T16:00:00Z");
const retainedDecisionAt = Date.parse("2010-10-18T16:00:00Z");
const second = Math.floor(now / 1000);
const marketing = { v: 1, consentId: "eb942c3a-a51c-4a04-822a-e79384423f11", advertising: true, matching: true, decidedAt: now - 60000, fbp: "fb.1.1792339100000.123456789", fbc: "fb.1.1792339100000.MetaClick_123" };
const env = { META_TRACKING_ENABLED: "true", META_DATASET_ID: "123456789012345", META_CONVERSIONS_ACCESS_TOKEN: "unit-test-token", STRIPE_SECRET_KEY: "sk_test_unit_only", STRIPE_WEBHOOK_SECRET: "whsec_unit_only", FIREBASE_SERVICE_ACCOUNT: "unit-test-ledger-injected" };
const paymentSecret = "pi_abcdefgh123456_secret_exampleProof123";
let requestCount = 0;
function request(body, headers = {}) {
  requestCount += 1;
  return new Request("https://pelvi.health/api/meta-purchase", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://pelvi.health", "CF-Connecting-IP": `203.0.113.${requestCount % 250}`, "User-Agent": "Example mobile browser", ...headers }, body: JSON.stringify(body) });
}
function fixture() {
  const attribution = buildMetaAttribution(marketing, request({}), { now });
  const invoice = {
    id: "in_invoice123", livemode: true, status: "paid", paid: true,
    billing_reason: "subscription_create", amount_paid: 2499, currency: "usd",
    status_transitions: { paid_at: second - 15 },
    customer: { id: "cus_example", email: " Verified@Example.com " },
    subscription: { id: "sub_example", metadata: { source: "web", ...attribution, goalId: "diastasisRecti", memberEmail: "private@example.com", name: "Private Name" } },
    payment_intent: { id: "pi_abcdefgh123456", client_secret: paymentSecret, livemode: true, status: "succeeded", created: second - 30, invoice: "in_invoice123", customer: "cus_example", latest_charge: { id: "ch_example", refunded: false, amount_refunded: 0 } },
  };
  const sent = [], receipts = new Map();
  const ledger = { has: async (id) => receipts.has(id), markSent: async (id, details) => receipts.set(id, details) };
  const stripe = {
    invoices: { retrieve: async (id) => { assert.equal(id, invoice.id); return invoice; } },
    paymentIntents: { retrieve: async (id) => { assert.equal(id, invoice.payment_intent.id); return invoice.payment_intent; } },
    subscriptions: { retrieve: async () => invoice.subscription },
    customers: { retrieve: async () => invoice.customer },
    charges: { retrieve: async () => invoice.payment_intent.latest_charge },
  };
  const fetcher = async (url, options) => {
    assert.equal(url, `https://graph.facebook.com/v26.0/${env.META_DATASET_ID}/events`);
    sent.push({ body: JSON.parse(options.body), headers: options.headers });
    return Response.json({ events_received: 1 });
  };
  const registry = { get: async () => ({ decidedAt: marketing.decidedAt, advertising: true, matching: true }) };
  return { invoice, stripe, sent, receipts, options: { stripe, invoiceId: invoice.id, env, ledger, registry, fetcher, now } };
}

test("malformed cookies and untrusted forwarded IP do not become attribution", () => {
  const metadata = buildMetaAttribution({ ...marketing, fbp: "health_answer", fbc: "not-a-click-id" }, request({}, { "CF-Connecting-IP": "not-an-ip", "X-Forwarded-For": "203.0.113.44", "User-Agent": "x".repeat(700) }), { now });
  assert.equal(metadata.meta_fbp, undefined); assert.equal(metadata.meta_fbc, undefined); assert.equal(metadata.meta_client_ip, undefined);
  assert.equal(metadata.meta_user_agent.length, 400);
});

test("canonical settled invoice supplies price and anonymous event ID without sensitive metadata", async () => {
  const context = fixture(); context.invoice.amount_paid = 1799;
  const result = await reportMetaInvoicePurchase(context.options);
  assert.equal(result.status, "sent"); assert.equal(result.value, 17.99); assert.equal(result.currency, "USD");
  assert.equal(result.eventId, `pelvi_purchase_${createHash("sha256").update(context.invoice.id).digest("hex")}`);
  const event = context.sent[0].body.data[0];
  assert.deepEqual(event.custom_data, { value: 17.99, currency: "USD" });
  assert.equal(event.event_source_url, "https://pelvi.health/"); assert.equal(event.event_time, second - 15);
  assert.equal(event.event_name, "Purchase"); assert.equal(event.action_source, "website");
  const serialized = JSON.stringify(context.sent[0].body);
  assert.doesNotMatch(serialized, /private@example|Verified@Example|diastasis|Private Name|client_secret|secret_exampleProof|goalId|subscription_create|in_invoice123|sub_example|eb942c3a/);
  assert.deepEqual(event.user_data.em, [createHash("sha256").update("verified@example.com").digest("hex")]);
  assert.deepEqual(Object.keys(context.receipts.get(result.eventId)).sort(), ["currency", "sentAt", "value"]);
});

test("Purchase includes hashed customer first and last names without raw names or changed sale data", async () => {
  const context = fixture();
  context.invoice.customer.name = "  JANE   Mary DOE  ";
  context.invoice.customer_name = "Other Person";
  context.invoice.payment_intent.latest_charge.billing_details = { name: "Different Cardholder" };
  const result = await reportMetaInvoicePurchase(context.options);
  const event = context.sent[0].body.data[0];
  assert.equal(result.status, "sent");
  assert.deepEqual(event.user_data.fn, [createHash("sha256").update("jane").digest("hex")]);
  assert.deepEqual(event.user_data.ln, [createHash("sha256").update("doe").digest("hex")]);
  assert.deepEqual(event.user_data.em, [createHash("sha256").update("verified@example.com").digest("hex")]);
  assert.deepEqual(event.custom_data, { value: 24.99, currency: "USD" });
  assert.equal(event.event_id, await metaPurchaseEventId(context.invoice.id));
  assert.doesNotMatch(JSON.stringify(context.sent[0].body), /jane|mary|doe|other person|different cardholder/i);
  assert.deepEqual(Object.keys(context.receipts.get(result.eventId)).sort(), ["currency", "sentAt", "value"]);
});

test("missing customer names fall back to invoice and settled payment billing names", async () => {
  for (const source of ["invoice", "charge"]) {
    const context = fixture();
    context.invoice.customer.name = "   ";
    context.invoice.payment_intent.latest_charge.billing_details = { name: source === "invoice" ? "Different Cardholder" : "  ÉLODIE O’NEILL  " };
    if (source === "invoice") context.invoice.customer_name = "  ÉLODIE O’NEILL  ";
    assert.equal((await reportMetaInvoicePurchase(context.options)).status, "sent");
    const userData = context.sent[0].body.data[0].user_data;
    assert.deepEqual(userData.fn, [createHash("sha256").update("élodie").digest("hex")]);
    assert.deepEqual(userData.ln, [createHash("sha256").update("o’neill").digest("hex")]);
  }
});

test("single and missing names do not invent matching fields or prevent Purchase", async () => {
  for (const name of ["Cher", "", undefined]) {
    const context = fixture();
    context.invoice.customer.name = name;
    assert.equal((await reportMetaInvoicePurchase(context.options)).status, "sent");
    const userData = context.sent[0].body.data[0].user_data;
    assert.equal(userData.ln, undefined);
    if (name) assert.deepEqual(userData.fn, [createHash("sha256").update("cher").digest("hex")]);
    else assert.equal(userData.fn, undefined);
  }
});

test("the existing matching guard also applies to customer names", async () => {
  const context = fixture();
  context.invoice.customer.name = "Jane Doe";
  assert.equal((await reportMetaInvoicePurchase({ ...context.options, emailMatchingAllowed: false })).status, "sent");
  const userData = context.sent[0].body.data[0].user_data;
  assert.equal(userData.em, undefined);
  assert.equal(userData.fn, undefined);
  assert.equal(userData.ln, undefined);
});

for (const [name, mutate] of [
  ["subscription update invoices", (invoice) => { invoice.billing_reason = "subscription_update"; }],
  ["zero-value trials", (invoice) => { invoice.amount_paid = 0; }],
  ["unpaid invoices", (invoice) => { invoice.paid = false; }],
  ["test invoices", (invoice) => { invoice.livemode = false; }],
  ["processing payments", (invoice) => { invoice.payment_intent.status = "processing"; }],
  ["refunded charges", (invoice) => { invoice.payment_intent.latest_charge.amount_refunded = 100; }],
  ["different invoice proofs", (invoice) => { invoice.payment_intent.invoice = "in_another"; }],
  ["different customer proofs", (invoice) => { invoice.payment_intent.customer = "cus_another"; }],
]) {
  test(`${name} never send Purchase`, async () => {
    const context = fixture(); mutate(context.invoice);
    assert.equal((await reportMetaInvoicePurchase(context.options)).sent, false);
    assert.equal(context.sent.length, 0); assert.equal(context.receipts.size, 0);
  });
}

test("missing persisted consent prevents delayed webhook advertising", async () => {
  for (const metadata of [{}, { source: "web", meta_consent: "1", meta_consent_at: String(retainedDecisionAt) }]) {
    const context = fixture(); context.invoice.subscription.metadata = metadata;
    assert.equal((await reportMetaInvoicePurchase(context.options)).status, "no_consent"); assert.equal(context.sent.length, 0);
  }
});

test("retained measurement attribution has no age-based expiry", () => {
  const metadata = buildMetaAttribution({ ...marketing, decidedAt: retainedDecisionAt }, request({}), { now });
  assert.equal(metadata.meta_consent, "1");
  assert.equal(metadata.meta_consent_at, String(retainedDecisionAt));
  for (const decidedAt of [0, NaN, Infinity, now + 300001]) {
    assert.deepEqual(buildMetaAttribution({ ...marketing, decidedAt }, request({}), { now }), {});
  }
});

test("renewal charges report current payments even when the retained record is years old", async () => {
  const context = fixture();
  context.invoice.billing_reason = "subscription_cycle";
  context.invoice.subscription.metadata.meta_consent_at = String(retainedDecisionAt);
  context.options.registry = { get: async () => ({ decidedAt: retainedDecisionAt, advertising: true, matching: true }) };
  assert.equal((await reportMetaInvoicePurchase(context.options)).status, "sent");
  const event = context.sent[0].body.data[0];
  assert.equal(event.event_time, second - 15);
  assert.equal(event.event_id, await metaPurchaseEventId(context.invoice.id));
  assert.deepEqual(event.custom_data, { value: 24.99, currency: "USD" });
  assert.equal((await reportMetaInvoicePurchase(context.options)).status, "duplicate");
  assert.equal(context.sent.length, 1);
});

test("retained renewals still require a valid allowed registry record", async () => {
  const denied = fixture(); denied.invoice.billing_reason = "subscription_cycle";
  denied.invoice.subscription.metadata.meta_consent_at = String(retainedDecisionAt);
  for (const choice of [
    { decidedAt: retainedDecisionAt, advertising: false, matching: false },
    { decidedAt: now, advertising: false, matching: false },
    { decidedAt: now + 300001, advertising: true, matching: true },
  ]) {
    assert.equal((await reportMetaInvoicePurchase({ ...denied.options, registry: { get: async () => choice } })).sent, false);
  }
  assert.equal(denied.sent.length, 0);
});

test("removing record expiry does not allow stale or future paid-sale timestamps", async () => {
  for (const paidAt of [second - 7 * 86400 - 1, second + 301]) {
    const context = fixture();
    context.invoice.status_transitions.paid_at = paidAt;
    assert.equal((await reportMetaInvoicePurchase(context.options)).status, "expired");
    assert.equal(context.sent.length, 0);
  }
});

test("missing or older consent registry decision waits for synchronization without sending", async () => {
  for (const choice of [null, { decidedAt: marketing.decidedAt - 1, advertising: true, matching: true }, { decidedAt: marketing.decidedAt - 1, advertising: false, matching: false }]) {
    const context = fixture();
    assert.equal((await reportMetaInvoicePurchase({ ...context.options, registry: { get: async () => choice } })).status, "pending_consent");
    assert.equal(context.sent.length, 0);
  }
});

test("a sent ledger prevents replay even after a new request or process", async () => {
  const context = fixture();
  const first = await reportMetaInvoicePurchase(context.options);
  const replay = await reportMetaInvoicePurchase({ ...context.options });
  assert.equal(replay.status, "duplicate"); assert.equal(replay.eventId, first.eventId); assert.equal(replay.sent, true);
  assert.equal(context.sent.length, 1);
});

test("Meta rejection or missing acknowledgment leaves delivery retryable", async () => {
  for (const response of [Response.json({ error: { message: "Rejected" } }, { status: 400 }), Response.json({ events_received: 0 })]) {
    const context = fixture();
    await assert.rejects(reportMetaInvoicePurchase({ ...context.options, fetcher: async () => response }), /meta_delivery_failed/);
    assert.equal(context.receipts.size, 0);
    assert.equal((await reportMetaInvoicePurchase(context.options)).status, "sent");
  }
});

test("tracking remains disabled without feature approval or complete server configuration", async () => {
  const context = fixture();
  for (const [configuration, expected] of [[{ ...env, META_TRACKING_ENABLED: "false" }, "disabled"], [{ ...env, META_CONVERSIONS_ACCESS_TOKEN: "" }, "not_configured"]]) {
    assert.equal((await reportMetaInvoicePurchase({ ...context.options, env: configuration })).status, expected);
  }
  assert.equal(context.sent.length, 0);
});

test("receipt fallback uses exact live Stripe proof and ignores browser money or email", async () => {
  const context = fixture(); let received;
  const response = await handleMetaPurchase({ request: request({ clientSecret: paymentSecret, marketing, value: 1, email: "attacker@example.com", invoiceId: "in_another" }), env }, { stripe: context.stripe, now, report: async (options) => { received = options; return { sent: true, status: "sent", eventId: "safe_event", value: 24.99, currency: "USD" }; } });
  assert.equal(response.status, 200); assert.equal(received.invoiceId, context.invoice.id);
  assert.deepEqual(Object.keys(received).sort(), ["emailMatchingAllowed", "env", "invoiceId", "now", "stripe"]);
  assert.deepEqual(await response.json(), { sent: true, status: "sent", eventId: "safe_event", value: 24.99, currency: "USD" });
});

test("wrong, unsettled, stale or foreign-origin receipt proofs never reach conversion", async () => {
  let reports = 0;
  for (const [mutate, headers, secret, expected] of [
    [() => {}, {}, "pi_abcdefgh123456_secret_wrong", 403],
    [(payment) => { payment.status = "processing"; }, {}, paymentSecret, 200],
    [(payment) => { payment.created = second - 86401; }, {}, paymentSecret, 410],
    [() => {}, { Origin: "https://foreign.example" }, paymentSecret, 403],
  ]) {
    const context = fixture(); mutate(context.invoice.payment_intent);
    const response = await handleMetaPurchase({ request: request({ clientSecret: secret, marketing }, headers), env }, { stripe: context.stripe, now, report: async () => { reports += 1; } });
    assert.equal(response.status, expected);
  }
  assert.equal(reports, 0);
});

const signer = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
function signedWebhook(event, { valid = true } = {}) {
  const raw = JSON.stringify(event);
  const signature = signer.webhooks.generateTestHeaderString({ payload: raw, secret: valid ? env.STRIPE_WEBHOOK_SECRET : "whsec_wrong" });
  return new Request("https://pelvi.health/api/stripe-events", { method: "POST", headers: { "Stripe-Signature": signature }, body: raw });
}
const paidEvent = { id: "evt_example", type: "invoice.payment_succeeded", livemode: true, data: { object: { id: "in_invoice123" } } };

test("real signature verification rejects tampered webhooks before reporting", async () => {
  let reports = 0;
  const response = await handleStripeEvents({ request: signedWebhook(paidEvent, { valid: false }), env }, { stripe: signer, report: async () => { reports += 1; } });
  assert.equal(response.status, 400); assert.equal(reports, 0);
});

test("signed unrelated and test events are ignored while settled live invoice triggers canonical lookup", async () => {
  let reports = 0;
  for (const event of [{ ...paidEvent, type: "invoice.payment_failed" }, { ...paidEvent, livemode: false }]) {
    const response = await handleStripeEvents({ request: signedWebhook(event), env }, { stripe: signer, report: async () => { reports += 1; } });
    assert.equal(response.status, 200);
  }
  const response = await handleStripeEvents({ request: signedWebhook(paidEvent), env }, { stripe: signer, report: async (options) => { reports += 1; assert.equal(options.invoiceId, paidEvent.data.object.id); return { sent: true, status: "sent" }; } });
  assert.equal(response.status, 200); assert.equal(reports, 1);
});

test("webhook delivery failures and enabled missing configuration request Stripe retries", async () => {
  const failed = await handleStripeEvents({ request: signedWebhook(paidEvent), env }, { stripe: signer, report: async () => { throw new Error("Meta unavailable"); } });
  assert.equal(failed.status, 503);
  const missing = await handleStripeEvents({ request: signedWebhook(paidEvent), env: { ...env, META_CONVERSIONS_ACCESS_TOKEN: "" } }, { stripe: signer });
  assert.equal(missing.status, 503);
  const disabled = await handleStripeEvents({ request: signedWebhook(paidEvent), env: { ...env, META_TRACKING_ENABLED: "false" } }, { stripe: signer });
  assert.equal(disabled.status, 200); assert.equal((await disabled.json()).status, "disabled");
  const pending = await handleStripeEvents({ request: signedWebhook(paidEvent), env }, { stripe: signer, report: async () => ({ sent: false, status: "pending_consent" }) });
  assert.equal(pending.status, 503);
});

test("hashed event identifiers are deterministic across webhook and receipt paths", async () => {
  assert.equal(await metaPurchaseEventId("in_invoice123"), await metaPurchaseEventId("in_invoice123"));
  assert.notEqual(await metaPurchaseEventId("in_invoice123"), await metaPurchaseEventId("in_invoice456"));
});
