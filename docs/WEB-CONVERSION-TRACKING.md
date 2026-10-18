# Web conversion tracking

Owner request: connect the website to the existing Pelvic Floor & Kegel Coach app’s Meta reporting, measure actual paid sales, preserve payment flow and make Clarity work on the diastasis landing page. App ID: `1057030602450173`.

## Release state

The payment-only email gate removal, rose/cream checkout and **Start Fixing Diastasis** payment action shipped in PR #10. The web tracking release is separate. Meta is **disabled by default** until the owner approves Meta’s final combined-dataset terms/access step and production credentials are configured. Disabled code must not send test or live Meta events.

Stripe endpoint `we_1URweaJcZ3jBmTIviiUCz4ue` is configured for `https://pelvi.health/api/stripe-events`, only `invoice.payment_succeeded`, API version `2023-10-16`. Its signing secret is stored in the Cloudflare production `STRIPE_WEBHOOK_SECRET` binding. The endpoint does not activate Meta reporting; the separate Meta feature gate remains off.

## Data flow

- Privacy choices gate Clarity, Google advertising and Meta browser/server reporting. Browser privacy signals override ad permission. Email matching requires a separate explicit customer choice and a server eligibility flag; it is off by default.
- An anonymous random first-party consent capability links checkout permission to a private Firestore consent registry. Only a SHA-256 capability key is stored in Firestore. Newer decisions win; equal-time narrowing wins. A late request cannot re-grant withdrawn permission. This registry is checked before server purchase delivery, including renewals and retained checkout intents.
- The existing checkout API persists only bounded permitted attribution to Stripe subscription metadata. Customer email remains the payment/account identity. Optional metadata refresh cannot prevent payment.
- A signed Stripe `invoice.payment_succeeded` webhook reads the authoritative live paid invoice, successful PaymentIntent and charge. It reports settled first payments and regular renewals with positive actual value. No free/trial invoice, failed/processing payment, refund or proration upgrade is treated as a paid sale by this integration.
- CAPI sends standard Purchase, actual value/currency, stable SHA-256 invoice event ID and permitted consented matching identifiers. The source URL is the general website domain. No goal, condition, health answer, exercise history, coach message, payment secret or card/bank detail is included.
- A private delivery ledger records acknowledgement after Meta accepts the event. Retries use the same event ID. Failed delivery returns a retryable webhook response. Missing/newer consent registry decisions are retried; explicit denial is skipped.
- `/api/meta-purchase` is a bounded receipt fallback. It verifies the exact PaymentIntent secret server-side, settled live state, age, canonical paid invoice and current consent. It never trusts a client email, amount, currency or paid-query flag. Only its verified public receipt can populate the optional browser Purchase queue.
- Meta Pixel runs only on eligible general public documents after permission and registry confirmation. It does not run on condition landing pages, member/admin/private routes, sensitive returns, health-referrer documents or arbitrary query strings. Automatic form/DOM collection and automatic advanced matching are disabled. Condition landing purchases use the permitted server integration; blocked Meta categories/events must never be bypassed.
- Clarity now includes the exact diastasis landing route. Anonymous fixed event names cover the landing, product gallery, video, FAQ, guarantee, checkout and payment outcomes. Checkout is masked, private account setup is excluded and payment success enters it through a full navigation. Clarity Consent V2 grants analytics only; Microsoft Ads storage stays denied.
- Privacy withdrawal stops active tags immediately, including open static articles. Consent-related document reloads wait for any open payment dialog to close, preserving a confirmation or 3DS challenge already in progress. Private navigation still leaves the tracked document immediately.

## Production configuration

Existing production bindings: `STRIPE_SECRET_KEY` and `FIREBASE_SERVICE_ACCOUNT`. New configuration:

| Variable | Purpose |
| --- | --- |
| `META_DATASET_ID` | The combined dataset linked to Pelvic Floor & Kegel Coach; never substitute the unrelated DiastaFix dataset. |
| `META_CONVERSIONS_ACCESS_TOKEN` | Server-only CAPI credential limited to this dataset. Store as Cloudflare secret. |
| `META_TRACKING_ENABLED=true` | Activate only after account restrictions, consent, server delivery and test-event checks pass. |
| `META_EMAIL_MATCHING_ENABLED=true` | Optional; leave off until matching eligibility is confirmed for this health-related business. Customers must also explicitly choose matching. |
| `META_GRAPH_API_VERSION` | Optional supported version override; code defaults to `v26.0`, verified from Meta’s official SDK. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `https://pelvi.health/api/stripe-events`, subscribed only to `invoice.payment_succeeded`. |

Never put a CAPI token, Stripe secret or webhook signing secret in `NEXT_PUBLIC_*`, source control, screenshots, URLs or logs. The public marketing-config endpoint returns feature switches and the public dataset ID only.

Meta’s app is currently unlinked. Its Linking wizard is prepared at the final **Confirm dataset creation** step: create a dataset and automatically link the existing app. The final screen accepts Meta Business Tools Terms and copies app/ad-account/business permissions; owner approval is pending. Do not finish that step or generate the conversion credential before the pending approval arrives. Keep current app integrations and data-source restrictions intact.

## Verification and limits

Focused tests cover payment setup/confirmation order, legacy checkout parity, current and withdrawn consent, stale/racing decisions, inaccessible storage, signature/body validation, authoritative pricing, settlement/refund filtering, CAPI retries, durable dedupe, generic browser scope and script lifecycle. Browser checks must verify no tags before consent, Clarity collection after analytics opt-in, no Meta tag on the diastasis route, withdrawal, masked checkout and mobile payment layout. Never make a real charge merely to test tracking.

The final local suite passes **353/353** checks. Local browser QA confirmed direct Stripe payment rendering, the exact payment-button text, masked checkout and analytics-only tag loading. Clarity explicitly excludes localhost through project settings, so collection itself must be checked on the production domain. No real payment or live Meta event was made during these checks.

Meta Test Events requires the actual approved dataset/credential. Do not send a fabricated live Purchase. Test-mode fixtures and mocked passing tests are not evidence of actual Meta delivery, matching quality or eligibility for Purchase optimization. Ad blockers, declined consent and platform restrictions mean not every customer is individually matchable. Purchase counts represent settled charges, including renewals, rather than unique new customers.

## Primary references

- [Meta data-source categories](https://www.facebook.com/business/help/1402913027039332)
- [Meta core setup](https://www.facebook.com/business/help/124742407297678)
- [Meta Business Tools Terms](https://www.facebook.com/legal/technology_terms)
- [Meta server-event SDK](https://github.com/facebook/facebook-nodejs-business-sdk/blob/main/src/objects/serverside/server-event.js)
- [Clarity Consent API V2](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2)

The business account itself warns about health-related sharing restrictions. Keep these restrictions and automatic collection protections intact; hashed email does not anonymize a health association.
