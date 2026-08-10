// The advertised price, in one place that both halves of the app can read.
//
// This used to live in lib/checkout.js, which carries "use client". A server
// component cannot read a plain constant out of a client module (Next replaces
// the module with a client reference), so the structured data on the homepage
// had no way to quote the same number the paywall shows. Splitting the two
// constants out means the price a crawler is told and the price a member sees
// come from the same line, instead of being typed twice and drifting the first
// time Stripe changes.
//
// lib/checkout.js re-exports both names, so every existing import still works.
//
// Authority note: this is the ADVERTISED price. The amount she is actually
// charged comes back from Stripe with the payment intent, and the checkout
// sheet shows that one. See lib/checkout.js.

export const DEFAULT_PRICE_LABEL = "$24.99";
export const DEFAULT_PRICE_PERIOD = "month";

/** "$24.99" -> "24.99", the form schema.org's `price` wants. */
export const DEFAULT_PRICE_AMOUNT = DEFAULT_PRICE_LABEL.replace(/[^0-9.]/g, "");

export const PRICE_CURRENCY = "USD";
