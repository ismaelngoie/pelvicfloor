import Stripe from "stripe";
import { ipRateLimited, json, makeStripe, originAllowed, readJson } from "../../functions-lib/stripeSync.js";
import { buildMetaAttribution, reportMetaInvoicePurchase, metaTrackingState } from "../../functions-lib/metaConversions.js";

export async function onRequestPost(context) { return handleMetaPurchase(context); }

/** Receipt fallback for inline confirmations and 3DS returns. Browser values
 * and email never become conversion facts; Stripe supplies the whole receipt. */
export async function handleMetaPurchase({ request, env }, { stripe, report = reportMetaInvoicePurchase, now = Date.now() } = {}) {
  if (!originAllowed(request, env)) return json(403, { sent: false, status: "bad_origin" });
  if (ipRateLimited(request, { max: 30 })) return json(429, { sent: false, status: "rate_limited" });
  const body = await readJson(request, 2048);
  const secret = typeof body?.clientSecret === "string" ? body.clientSecret : "";
  const paymentId = /^(pi_[A-Za-z0-9]{8,})_secret_[A-Za-z0-9]+$/.exec(secret)?.[1];
  if (!paymentId || secret.length > 400) return json(400, { sent: false, status: "bad_payment" });
  const currentConsent = buildMetaAttribution(body.marketing, request, { now });
  if (currentConsent.meta_consent !== "1") return json(200, { sent: false, status: "no_consent" });
  const state = metaTrackingState(env);
  if (state !== "enabled" || !env.STRIPE_SECRET_KEY) return json(200, { sent: false, status: state === "enabled" ? "not_configured" : state });
  try {
    const client = stripe || makeStripe(Stripe, env.STRIPE_SECRET_KEY);
    const payment = await client.paymentIntents.retrieve(paymentId);
    if (!secretsMatch(payment.client_secret, secret)) return json(403, { sent: false, status: "bad_payment" });
    if (payment.status !== "succeeded" || payment.livemode !== true) return json(200, { sent: false, status: "not_settled" });
    const age = now - Number(payment.created) * 1000;
    if (!payment.created || age < -300000 || age > 86400000) return json(410, { sent: false, status: "expired" });
    const invoiceId = typeof payment.invoice === "string" ? payment.invoice : payment.invoice?.id;
    const result = await report({ stripe: client, invoiceId, env, now, emailMatchingAllowed: currentConsent.meta_email_match === "1" });
    return json(200, result);
  } catch { return json(503, { sent: false, status: "retry" }); }
}

function secretsMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !a.length || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
