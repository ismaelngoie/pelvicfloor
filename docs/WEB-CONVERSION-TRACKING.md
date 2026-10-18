# Web conversion tracking

Owner request: connect the website to the existing Pelvic Floor & Kegel Coach app’s Meta reporting, measure actual paid sales, preserve payment flow and make Clarity work on the diastasis landing page. App ID: `1057030602450173`.

## Release state

The payment-only email gate removal, rose/cream checkout and **Start Fixing Diastasis** payment action shipped in PR #10; the tracking implementation shipped in PR #11. On October 18, 2026, the owner approved Meta’s Business Tools Terms, combined-dataset permission sharing and the conversion-only credential. Dataset **1085385884288765**, owned by Pelvi Health, is now linked to Pelvic Floor & Kegel Coach app **1057030602450173** and its existing ad account. Production credentials and the activation switch are configured for this release. The code remains disabled by default in unconfigured environments.

Stripe endpoint `we_1URweaJcZ3jBmTIviiUCz4ue` is configured for `https://pelvi.health/api/stripe-events`, only `invoice.payment_succeeded`, API version `2023-10-16`. Its signing secret is stored in the Cloudflare production `STRIPE_WEBHOOK_SECRET` binding. Meta reporting also requires the separate production feature switch and current customer advertising consent.

## Data flow

- Privacy choices gate Clarity, Google advertising and Meta browser/server reporting. Browser privacy signals override ad permission. Email matching requires a separate explicit customer choice and a server eligibility flag; it is off by default.
- An anonymous random first-party consent capability links checkout permission to a private Firestore consent registry. Only a SHA-256 capability key is stored in Firestore. Newer decisions win; equal-time narrowing wins. A late request cannot re-grant withdrawn permission. This registry is checked before server purchase delivery, including renewals and retained checkout intents.
- The existing checkout API persists only bounded permitted attribution to Stripe subscription metadata. Customer email remains the payment/account identity. Optional metadata refresh cannot prevent payment.
- A signed Stripe `invoice.payment_succeeded` webhook reads the authoritative live paid invoice, successful PaymentIntent and charge. It reports settled first payments and regular renewals with positive actual value. No free/trial invoice, failed/processing payment, refund or proration upgrade is treated as a paid sale by this integration.
- CAPI sends standard Purchase, actual value/currency, stable SHA-256 invoice event ID and permitted consented matching identifiers. The source URL is the general website domain. No goal, condition, health answer, exercise history, coach message, payment secret or card/bank detail is included.
- A private delivery ledger records acknowledgement after Meta accepts the event. Retries use the same event ID. Failed delivery returns a retryable webhook response. Missing/newer consent registry decisions are retried; explicit denial is skipped.
- `/api/meta-purchase` is a bounded receipt fallback. It verifies the exact PaymentIntent secret server-side, settled live state, age, canonical paid invoice and current consent. It never trusts a client email, amount, currency or paid-query flag. Only its verified public receipt can populate the optional browser Purchase queue.
- Meta Pixel runs only on eligible general public documents after permission and registry confirmation. It does not run on condition landing pages, member/admin/private routes, sensitive returns, health-referrer documents or arbitrary query strings. Automatic form/DOM collection and website advanced matching are disabled. Existing app matching settings are preserved. Condition landing purchases use the permitted server integration; blocked Meta categories/events must never be bypassed.
- Clarity now includes the exact diastasis landing route. Anonymous fixed event names cover the landing, product gallery, video, FAQ, guarantee, checkout and payment outcomes. Checkout is masked, private account setup is excluded and payment success enters it through a full navigation. Clarity Consent V2 grants analytics only; Microsoft Ads storage stays denied.
- Privacy withdrawal stops active tags immediately, including open static articles. Consent-related document reloads wait for any open payment dialog to close, preserving a confirmation or 3DS challenge already in progress. Private navigation still leaves the tracked document immediately.

## Production configuration

Existing production bindings: `STRIPE_SECRET_KEY` and `FIREBASE_SERVICE_ACCOUNT`. New configuration:

| Variable | Purpose |
| --- | --- |
| `META_DATASET_ID` | `1085385884288765`, the combined dataset linked to Pelvic Floor & Kegel Coach; never substitute the unrelated DiastaFix dataset. |
| `META_CONVERSIONS_ACCESS_TOKEN` | Server-only CAPI credential limited to this dataset. Store as Cloudflare secret. |
| `META_TRACKING_ENABLED=true` | Activate only after account restrictions, consent, server delivery and test-event checks pass. |
| `META_EMAIL_MATCHING_ENABLED=true` | Optional; leave off until matching eligibility is confirmed for this health-related business. Customers must also explicitly choose matching. |
| `META_GRAPH_API_VERSION` | Optional supported version override; code defaults to `v26.0`, verified from Meta’s official SDK. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `https://pelvi.health/api/stripe-events`, subscribed only to `invoice.payment_succeeded`. |

Never put a CAPI token, Stripe secret or webhook signing secret in `NEXT_PUBLIC_*`, source control, screenshots, URLs or logs. The public marketing-config endpoint returns feature switches and the public dataset ID only.

The CAPI credential was generated with **Set up without Dataset Quality API** selected, avoiding the additional quality-reporting permissions. It is stored only in Cloudflare production secrets; the temporary transfer file was removed. `META_EMAIL_MATCHING_ENABLED` stays `false`.

Meta website settings have automatic page/product-detail collection off, automatic event creation off and all website advanced-matching fields off. The app’s existing matching/SDK settings and health-related restrictions remain intact. Website traffic is allowed from `pelvi.health` and its subdomains only.

## Verification and limits

Focused tests cover payment setup/confirmation order, legacy checkout parity, current and withdrawn consent, stale/racing decisions, inaccessible storage, signature/body validation, authoritative pricing, settlement/refund filtering, CAPI retries, durable dedupe, generic browser scope and script lifecycle. Browser checks must verify no tags before consent, Clarity collection after analytics opt-in, no Meta tag on the diastasis route, withdrawal, masked checkout and mobile payment layout. Never make a real charge merely to test tracking.

The implementation suite passes **353/353** checks. Local and production browser QA confirmed direct Stripe payment rendering, the exact payment-button text, masked checkout and analytics-only tag loading. Production consent synchronization returned 200. Cross-tab privacy withdrawal preserved the open payment dialog; closing it performed the cleanup reload without tracking scripts. The webhook rejects unsigned input with 400.

A synthetic server **Purchase** was submitted directly to Graph v26.0 with this dataset’s Test Events code while live tracking was disabled. Meta returned HTTP 200, `events_received: 1`, no messages; Events Manager displayed **Processed / Server / Manual Setup**, the matching event ID `pelvi_synthetic_e0841df8-a9c6-4765-968e-9c89e6fdaad6`, the general website URL, value **24.99** and currency **USD**. Only a hashed random synthetic identifier and a generic test user agent were included; no real payment or customer data was used. This validates server transport/schema, not a real Stripe-to-Meta sale or attribution quality. Never send a fabricated live Purchase.

Clarity’s scripts load after analytics permission. This test connection receives Microsoft’s documented IP-exclusion warning, so production recording collection is not verified from this connection. The owner explicitly chose to **leave the existing IP exclusion**. Do not change it merely to create a QA recording.

Ad blockers, declined consent and platform restrictions mean not every customer is individually matchable. Purchase counts represent settled charges, including renewals, rather than unique new customers.

## Primary references

- [Meta data-source categories](https://www.facebook.com/business/help/1402913027039332)
- [Meta core setup](https://www.facebook.com/business/help/124742407297678)
- [Meta Business Tools Terms](https://www.facebook.com/legal/technology_terms)
- [Meta server-event SDK](https://github.com/facebook/facebook-nodejs-business-sdk/blob/main/src/objects/serverside/server-event.js)
- [Clarity Consent API V2](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2)
- [Clarity IP exclusion](https://learn.microsoft.com/en-us/clarity/setup-and-installation/ip-exclusion)

The business account itself warns about health-related sharing restrictions. Keep these restrictions and automatic collection protections intact; hashed email does not anonymize a health association.
