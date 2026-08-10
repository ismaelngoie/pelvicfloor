// The price and the length of the subscription, in one place that every half of
// the product can read: the marketing pages, the paywall, the checkout, the
// receipt copy, the terms, the structured data a crawler sees, and the
// Cloudflare Worker that actually creates the Stripe subscription.
//
// This used to live in lib/checkout.js, which carries "use client". A server
// component cannot read a plain constant out of a client module (Next replaces
// the module with a client reference), so the structured data on the homepage
// had no way to quote the same number the paywall shows. Splitting the two
// constants out means the price a crawler is told and the price a member sees
// come from the same line, instead of being typed twice and drifting the first
// time Stripe changes.
//
// KEEP THIS FILE FREE OF "use client" AND OF EVERY BROWSER API. Four kinds of
// caller import it and three of them are not a browser: a server component at
// export time, and functions/api/create-payment-intent.js, which runs on
// Cloudflare's edge with no DOM at all. A single `window` in here breaks the
// checkout endpoint.
//
// lib/checkout.js re-exports the price names, so every existing import works.
//
// Authority note: this is the ADVERTISED price. The amount she is actually
// charged comes back from Stripe with the payment intent, and the checkout
// sheet shows that one. See lib/checkout.js.

// --- What she pays ----------------------------------------------------------

export const DEFAULT_PRICE_LABEL = "$24.99";

/** "$24.99" -> "24.99", the form schema.org's `price` wants. */
export const DEFAULT_PRICE_AMOUNT = DEFAULT_PRICE_LABEL.replace(/[^0-9.]/g, "");

/**
 * The same amount in cents, which is the only unit Stripe deals in.
 *
 * Derived rather than typed a second time. functions/api/create-payment-intent.js
 * refuses to charge anybody through a price whose unit_amount is not exactly
 * this, so a number that drifted from the label above would not silently charge
 * the wrong amount, it would take the checkout down. Derivation removes that
 * failure mode entirely.
 */
export const PRICE_AMOUNT_CENTS = Math.round(Number(DEFAULT_PRICE_AMOUNT) * 100);

export const PRICE_CURRENCY = "USD";

// --- How long a subscription lasts ------------------------------------------
//
// THIS IS THE ONE EDIT. A 365 day plan is coming, and every place in the
// product that assumes a month reads it from here, so the change is these three
// lines and the price label above, and nothing else:
//
//   BILLING_INTERVAL       "month" -> "year"
//   BILLING_INTERVAL_COUNT 1       -> 1        (12 with interval "month" would
//                                               also be a year, and Stripe
//                                               allows it; keep whichever the
//                                               price in the Stripe dashboard
//                                               actually uses, because the
//                                               Worker matches on both fields)
//   DEFAULT_PRICE_PERIOD   "month" -> "year"
//
// WHAT READS THEM, so nobody has to go looking:
//
//   functions/api/create-payment-intent.js  will only sell through an active,
//     recurring price on the Pelvi product whose interval, interval_count,
//     currency and unit_amount all match these exactly. That guard exists
//     because the Stripe account still has archived prices on it at other
//     amounts, and picking the wrong one charges a member the wrong money. It
//     is also why these two constants are not just copy: change them without
//     changing the price in Stripe and the endpoint answers "price_unresolved"
//     and sells nothing, loudly, which is the correct failure.
//   app/terms/page.js                       the subscription terms, in prose.
//   lib/seo/schema.js                       the Offer a crawler and an
//                                           assistant read.
//   components/funnel/Paywall.jsx           "$24.99 per month" under the button.
//   components/postpurchase/ProgramIntro.jsx and lib/postPurchase.js, as the
//     fallback for when Stripe's own answer did not survive the trip.
//
// Stripe's own vocabulary, on purpose. `interval` and `interval_count` are the
// two fields on price.recurring, so these can be compared to a Stripe object
// field for field with no translation in between.
export const BILLING_INTERVAL = "month";
export const BILLING_INTERVAL_COUNT = 1;

/**
 * The word a member reads: "$24.99 per month", "every month", "the month you
 * have already paid for".
 *
 * The same string as BILLING_INTERVAL today and deliberately a separate
 * constant, because it is not the same fact. One is what Stripe was told; this
 * one is English, and a price billed every 12 months would still be sold as a
 * "year". Every sentence in the product that names the period reads this.
 */
export const DEFAULT_PRICE_PERIOD = BILLING_INTERVAL;
