import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../lib/diastasisPayment.js", import.meta.url), "utf8");
const { submitDiastasisPayment } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);

function checkout({ submission = {}, setup = {}, confirmation = {}, beforeConfirm } = {}) {
  const calls = [];
  const intent = { ok: true, clientSecret: "pi_example_secret_test", amount: 2499, currency: "usd", interval: "month", ...setup };
  const paymentIntent = { id: "pi_example", status: "succeeded" };
  const purchase = { email: "payer@example.com", name: "Example Payer", goalId: "diastasisRecti", attemptKey: "stable-attempt" };
  let confirmedWith;
  const options = {
    elements: { submit: async () => { calls.push("validate"); return submission; } },
    createIntent: async (received) => { calls.push("create"); assert.equal(received, purchase); return intent; },
    purchase,
    returnUrl: "https://pelvi.health/diastasis-recti/start?paid=1&utm_source=test",
    expectedPrice: { amount: 2499, currency: "USD", interval: "month" },
    beforeConfirm: async (received) => {
      calls.push("remember"); assert.equal(received, intent);
      await beforeConfirm?.(received);
    },
    stripe: { confirmPayment: async (received) => {
      calls.push("confirm"); confirmedWith = received;
      return { paymentIntent, ...confirmation };
    } },
  };
  return { options, calls, intent, paymentIntent, confirmedWith: () => confirmedWith };
}

test("invalid payment fields never create a subscription or attempt a charge", async () => {
  const error = { type: "validation_error", message: "Enter a complete card number." };
  const context = checkout({ submission: { error } });
  assert.deepEqual(await submitDiastasisPayment(context.options), { kind: "validation_error", error });
  assert.deepEqual(context.calls, ["validate"]);
});

for (const code of ["already_subscribed", "network_error", "price_unavailable"]) {
  test(`${code} from the subscription API prevents payment confirmation`, async () => {
    const context = checkout({ setup: { ok: false, code, message: "Setup did not proceed." } });
    assert.deepEqual(await submitDiastasisPayment(context.options), { kind: "setup_error", result: context.intent });
    assert.deepEqual(context.calls, ["validate", "create"]);
  });
}

for (const [name, setup] of [
  ["amount", { amount: 2999 }],
  ["currency", { currency: "eur" }],
  ["subscription period", { interval: "year" }],
  ["missing price", { amount: null }],
]) {
  test(`a different ${name} cannot be charged through the displayed offer`, async () => {
    const context = checkout({ setup });
    assert.deepEqual(await submitDiastasisPayment(context.options), { kind: "price_mismatch", intent: context.intent });
    assert.deepEqual(context.calls, ["validate", "create"]);
  });
}

test("confirmation uses the API secret, receipt identity, return URL and validated Elements", async () => {
  const context = checkout();
  const result = await submitDiastasisPayment(context.options);
  assert.deepEqual(context.calls, ["validate", "create", "remember", "confirm"]);
  assert.deepEqual(context.confirmedWith(), {
    elements: context.options.elements,
    clientSecret: context.intent.clientSecret,
    confirmParams: {
      return_url: context.options.returnUrl,
      receipt_email: "payer@example.com",
      payment_method_data: { billing_details: { email: "payer@example.com", name: "Example Payer" } },
    },
    redirect: "if_required",
  });
  assert.deepEqual(result, { kind: "paid", status: "succeeded", intent: context.intent, paymentIntent: context.paymentIntent });
});

test("receipt persistence finishes before Stripe is allowed to confirm", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let remembering;
  const started = new Promise((resolve) => { remembering = resolve; });
  const context = checkout({ beforeConfirm: async () => { remembering(); await gate; } });
  const pending = submitDiastasisPayment(context.options);
  await started;
  assert.deepEqual(context.calls, ["validate", "create", "remember"]);
  release();
  assert.equal((await pending).kind, "paid");
  assert.equal(context.calls.at(-1), "confirm");
});

test("a settling payment is handed off as processing without another charge attempt", async () => {
  const paymentIntent = { id: "pi_example", status: "processing" };
  const context = checkout({ confirmation: { paymentIntent } });
  assert.deepEqual(await submitDiastasisPayment(context.options), { kind: "paid", status: "processing", intent: context.intent, paymentIntent });
  assert.equal(context.calls.filter((call) => call === "confirm").length, 1);
});

test("Stripe declines are returned for recovery without claiming payment succeeded", async () => {
  const error = { type: "card_error", code: "card_declined", decline_code: "insufficient_funds" };
  const context = checkout({ confirmation: { error, paymentIntent: undefined } });
  assert.deepEqual(await submitDiastasisPayment(context.options), { kind: "payment_error", error, intent: context.intent });
});

for (const status of ["requires_payment_method", "requires_action", undefined]) {
  test(`an unconfirmed ${status || "missing"} payment never grants access`, async () => {
    const context = checkout({ confirmation: { paymentIntent: status ? { status } : undefined } });
    assert.deepEqual(await submitDiastasisPayment(context.options), { kind: "unconfirmed", intent: context.intent });
  });
}

test("unexpected failures propagate for the payment screen to recover", async () => {
  const error = new Error("Receipt storage callback failed");
  const context = checkout({ beforeConfirm: () => { throw error; } });
  await assert.rejects(submitDiastasisPayment(context.options), (received) => received === error);
  assert.deepEqual(context.calls, ["validate", "create", "remember"]);
});
