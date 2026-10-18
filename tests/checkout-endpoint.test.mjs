import assert from "node:assert/strict";
import test from "node:test";
import { BILLING_INTERVAL, BILLING_INTERVAL_COUNT, DEFAULT_STRIPE_PRICE_ID, PRICE_AMOUNT_CENTS, PRICE_CURRENCY } from "../lib/pricing.js";
import { buildMetaAttribution } from "../functions-lib/metaConversions.js";

let caseNumber = 0;
const environment = { STRIPE_SECRET_KEY: "sk_test_endpoint_unit_only" };
const buyer = { email: " Payer@Example.com ", name: "Example Payer", uid: "uid_example", memberId: "member_example", goalId: "diastasisRecti", attemptKey: "same-checkout-attempt" };
const price = { id: DEFAULT_STRIPE_PRICE_ID, active: true, type: "recurring", unit_amount: PRICE_AMOUNT_CENTS, currency: PRICE_CURRENCY.toLowerCase(), recurring: { interval: BILLING_INTERVAL, interval_count: BILLING_INTERVAL_COUNT } };
const consent = { v: 1, consentId: "eb942c3a-a51c-4a04-822a-e79384423f11", advertising: true, matching: true, decidedAt: Date.now(), fbp: "fb.1.1792339100000.123456789", fbc: "fb.1.1792339100000.ExampleClick" };
function purchaseRequest(body = buyer, headers = {}) {
  return new Request("https://pelvi.health/api/create-payment-intent", { method: "POST", headers: { Origin: "https://pelvi.health", "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.77", "User-Agent": "Example browser", ...headers }, body: JSON.stringify(body) });
}
async function fixture({ subscriptions = [], customers, invalidPrice = false, updateFailure = false } = {}) {
  // A fresh endpoint module gives each case the same empty isolate price cache.
  caseNumber += 1;
  const { handleCheckout } = await import(`../functions/api/create-payment-intent.js?endpoint_case=${caseNumber}`);
  const calls = [];
  const existing = customers || (subscriptions.length ? [{ id: "cus_existing", email: "payer@example.com", metadata: { existing: "keep" } }] : []);
  const subscription = { id: "sub_created", customer: "cus_created", status: "incomplete", current_period_end: 1800000000, items: { data: [{ price }] }, latest_invoice: { payment_intent: { status: "requires_payment_method", client_secret: "pi_example_secret_example" } } };
  const stripe = {
    prices: {
      retrieve: async (id) => { calls.push(["price.retrieve", id]); return invalidPrice ? { ...price, unit_amount: 499 } : price; },
      list: async () => { calls.push(["price.list"]); return { data: invalidPrice ? [] : [price] }; },
    },
    customers: {
      list: async (options) => { calls.push(["customer.list", options]); return { data: existing }; },
      create: async (options) => { calls.push(["customer.create", options]); return { id: "cus_created", ...options }; },
      update: async (id, options) => { calls.push(["customer.update", id, options]); return { id, ...options }; },
    },
    subscriptions: {
      list: async (options) => { calls.push(["subscription.list", options]); return { data: subscriptions.filter((item) => item.customer === options.customer) }; },
      create: async (options, requestOptions) => { calls.push(["subscription.create", options, requestOptions]); return { ...subscription, metadata: options.metadata }; },
      update: async (id, options) => { calls.push(["subscription.update", id, options]); if (updateFailure) throw new Error("Unit-test metadata update failed"); return { id, ...options }; },
    },
  };
  return { calls, stripe, subscription, run: (body = buyer, headers = {}) => handleCheckout({ request: purchaseRequest(body, headers), env: environment }, { stripeFactory: () => stripe }) };
}
function draft(metadata = {}) {
  return { id: "sub_existing", customer: "cus_existing", status: "incomplete", metadata, items: { data: [{ price }] }, latest_invoice: { payment_intent: { status: "requires_payment_method", client_secret: "pi_existing_secret_example" } } };
}
function callsNamed(context, name) { return context.calls.filter(([operation]) => operation === name); }

test("legacy checkout retains verified price, incomplete subscription behavior and customer identity without Meta", async () => {
  const context = await fixture();
  const response = await context.run();
  assert.equal(response.status, 200);
  const receipt = await response.json();
  assert.equal(receipt.amount, PRICE_AMOUNT_CENTS); assert.equal(receipt.currency, PRICE_CURRENCY.toLowerCase()); assert.equal(receipt.interval, BILLING_INTERVAL);
  const customer = callsNamed(context, "customer.create")[0][1];
  assert.equal(customer.email, "payer@example.com");
  const creation = callsNamed(context, "subscription.create")[0][1];
  assert.deepEqual(creation.items, [{ price: DEFAULT_STRIPE_PRICE_ID }]);
  assert.equal(creation.payment_behavior, "default_incomplete");
  assert.deepEqual(creation.payment_settings, { save_default_payment_method: "on_subscription" });
  assert.deepEqual(creation.expand, ["latest_invoice.payment_intent"]);
  assert.deepEqual(creation.metadata, { memberEmail: "payer@example.com", firebaseUID: buyer.uid, memberId: buyer.memberId, goalId: buyer.goalId, source: "web" });
  assert.equal(Object.keys(customer.metadata).some((key) => key.startsWith("meta_")), false);
  assert.equal(callsNamed(context, "subscription.update").length, 0);
});

test("consented attribution belongs only to the subscription and does not alter payment parameters", async () => {
  const context = await fixture();
  assert.equal((await context.run({ ...buyer, marketing: consent })).status, 200);
  const creation = callsNamed(context, "subscription.create")[0][1];
  const expected = buildMetaAttribution(consent, purchaseRequest());
  for (const [key, value] of Object.entries(expected)) assert.equal(creation.metadata[key], value);
  assert.equal(Object.keys(callsNamed(context, "customer.create")[0][1].metadata).some((key) => key.startsWith("meta_")), false);
  assert.equal(creation.payment_behavior, "default_incomplete");
  assert.deepEqual(creation.items, [{ price: DEFAULT_STRIPE_PRICE_ID }]);
});

test("reusing a legacy draft with no prior or current attribution adds no Stripe update", async () => {
  const context = await fixture({ subscriptions: [draft({ source: "web", goalId: "existingGoal" })] });
  const response = await context.run();
  assert.equal(response.status, 200); assert.equal((await response.json()).subscriptionId, "sub_existing");
  assert.equal(callsNamed(context, "subscription.update").length, 0);
  assert.equal(callsNamed(context, "subscription.create").length, 0);
});

test("withdrawing consent clears only the old draft's advertising metadata before returning its payment", async () => {
  const metadata = { source: "web", goalId: "existingGoal", privateSetting: "keep", ...buildMetaAttribution(consent, purchaseRequest()) };
  const context = await fixture({ subscriptions: [draft(metadata)] });
  const response = await context.run({ ...buyer, marketing: { ...consent, advertising: false } });
  assert.equal(response.status, 200);
  const update = callsNamed(context, "subscription.update")[0];
  assert.equal(update[1], "sub_existing");
  assert.deepEqual(update[2], { metadata: Object.fromEntries(Object.keys(metadata).filter((key) => key.startsWith("meta_")).map((key) => [key, ""])) });
  assert.equal(callsNamed(context, "subscription.create").length, 0);
});

test("unchanged consent on a reused draft does not create an unnecessary Stripe request", async () => {
  const context = await fixture({ subscriptions: [draft({ source: "web", ...buildMetaAttribution(consent, purchaseRequest()) })] });
  assert.equal((await context.run({ ...buyer, marketing: consent })).status, 200);
  assert.equal(callsNamed(context, "subscription.update").length, 0);
});

test("changed matching choice updates only the changed Meta field on the draft", async () => {
  const context = await fixture({ subscriptions: [draft({ source: "web", ...buildMetaAttribution(consent, purchaseRequest()) })] });
  assert.equal((await context.run({ ...buyer, marketing: { ...consent, matching: false } })).status, 200);
  assert.deepEqual(callsNamed(context, "subscription.update")[0][2], { metadata: { meta_email_match: "" } });
});

test("optional metadata update failure cannot block a retained checkout or create a second subscription", async () => {
  const context = await fixture({ subscriptions: [draft({ source: "web", meta_consent: "1" })], updateFailure: true });
  const response = await context.run();
  assert.equal(response.status, 200);
  const answer = await response.json(); assert.equal(answer.subscriptionId, "sub_existing"); assert.equal(answer.clientSecret, "pi_existing_secret_example");
  assert.equal(callsNamed(context, "subscription.create").length, 0);
});

for (const status of ["active", "trialing", "past_due", "unpaid"]) {
  test(`an existing ${status} member cannot receive a second subscription`, async () => {
    const context = await fixture({ subscriptions: [{ ...draft(), status }] });
    const response = await context.run({ ...buyer, marketing: consent });
    assert.equal(response.status, 409); assert.equal((await response.json()).error.code, "already_subscribed");
    assert.equal(callsNamed(context, "subscription.create").length, 0); assert.equal(callsNamed(context, "subscription.update").length, 0);
  });
}

test("a live subscription on any matching customer blocks a second charge", async () => {
  const context = await fixture({ customers: [{ id: "cus_empty" }, { id: "cus_existing" }], subscriptions: [{ ...draft(), status: "active" }] });
  assert.equal((await context.run()).status, 409);
  assert.equal(callsNamed(context, "subscription.list").length, 2);
  assert.equal(callsNamed(context, "subscription.create").length, 0);
});

test("missing or invalid payer email and foreign origin touch no Stripe object", async () => {
  for (const [body, headers, status] of [[{ ...buyer, email: "" }, {}, 400], [{ ...buyer, email: "not-an-email" }, {}, 400], [buyer, { Origin: "https://foreign.example" }, 403]]) {
    const context = await fixture(); assert.equal((await context.run(body, headers)).status, status); assert.equal(context.calls.length, 0);
  }
});

test("incorrect Stripe pricing cannot create any customer or subscription", async () => {
  const context = await fixture({ invalidPrice: true });
  const response = await context.run(); assert.equal(response.status, 503); assert.equal((await response.json()).error.code, "price_unavailable");
  assert.equal(callsNamed(context, "customer.create").length, 0); assert.equal(callsNamed(context, "subscription.create").length, 0);
});

test("the same email and checkout attempt retain one stable Stripe idempotency key", async () => {
  const first = await fixture(), second = await fixture();
  await first.run(); await second.run({ ...buyer, email: "payer@example.com" });
  const firstKey = callsNamed(first, "subscription.create")[0][2].idempotencyKey;
  const secondKey = callsNamed(second, "subscription.create")[0][2].idempotencyKey;
  assert.equal(firstKey, secondKey); assert.match(firstKey, /^pf_[a-f0-9]{48}$/);
  const other = await fixture(); await other.run({ ...buyer, email: "another@example.com" });
  assert.notEqual(callsNamed(other, "subscription.create")[0][2].idempotencyKey, firstKey);
});
