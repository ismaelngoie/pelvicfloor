// Deferred checkout keeps the payment form visible before a subscription exists.
// Validate Stripe's fields first, then ask the existing API to prevent duplicate
// subscriptions and return the authoritative amount before confirming payment.
export async function submitDiastasisPayment({
  stripe,
  elements,
  createIntent,
  purchase,
  returnUrl,
  expectedPrice,
  beforeConfirm,
}) {
  const submitted = await elements.submit();
  if (submitted.error) return { kind: "validation_error", error: submitted.error };

  const intent = await createIntent(purchase);
  if (!intent.ok) return { kind: "setup_error", result: intent };

  const currency = (value) => typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!Number.isInteger(intent.amount) || intent.amount <= 0
    || intent.amount !== expectedPrice.amount
    || !currency(intent.currency)
    || currency(intent.currency) !== currency(expectedPrice.currency)
    || !intent.interval || intent.interval !== expectedPrice.interval) {
    return { kind: "price_mismatch", intent };
  }

  await beforeConfirm?.(intent);
  const { error, paymentIntent } = await stripe.confirmPayment({
    elements,
    clientSecret: intent.clientSecret,
    confirmParams: {
      return_url: returnUrl,
      receipt_email: purchase.email,
      payment_method_data: {
        billing_details: { email: purchase.email, name: purchase.name || undefined },
      },
    },
    redirect: "if_required",
  });

  if (error) return { kind: "payment_error", error, intent };
  const status = paymentIntent?.status;
  if (status === "succeeded" || status === "processing") {
    return { kind: "paid", status, intent, paymentIntent };
  }
  return { kind: "unconfirmed", intent };
}
