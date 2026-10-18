import Stripe from "stripe";
import { json, makeStripe } from "../../functions-lib/stripeSync.js";
import { metaTrackingState, reportMetaInvoicePurchase } from "../../functions-lib/metaConversions.js";

export async function onRequestPost(context) { return handleStripeEvents(context); }

// Stripe retries non-2xx responses. Advertising delivery never grants access,
// writes a member profile or runs on the customer's payment request.
export async function handleStripeEvents({ request, env }, { stripe, report = reportMetaInvoicePurchase } = {}) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) return json(503, { received: false, status: "not_configured" });
  const signature = request.headers.get("Stripe-Signature");
  if (!signature) return json(400, { received: false, status: "bad_signature" });
  let event;
  const client = stripe || makeStripe(Stripe, env.STRIPE_SECRET_KEY);
  try {
    const raw = await readBoundedBody(request, 524288);
    event = await client.webhooks.constructEventAsync(raw, signature, env.STRIPE_WEBHOOK_SECRET, undefined, Stripe.createSubtleCryptoProvider());
  } catch { return json(400, { received: false, status: "bad_signature" }); }
  if (event.type !== "invoice.payment_succeeded" || event.livemode !== true) return json(200, { received: true, status: "ignored" });
  const state = metaTrackingState(env);
  if (state === "disabled") return json(200, { received: true, status: "disabled" });
  if (state !== "enabled") return json(503, { received: false, status: "not_configured" });
  try {
    const result = await report({ stripe: client, invoiceId: event.data?.object?.id, env });
    return json(["not_configured", "pending_consent"].includes(result.status) ? 503 : 200, { received: true, ...result });
  } catch { return json(503, { received: false, status: "retry" }); }
}

async function readBoundedBody(request, limit) {
  if (Number(request.headers.get("Content-Length")) > limit || !request.body) throw new Error("bad_body");
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new Error("bad_body"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
