# Branded web sign-in

Firebase project: `pelvic-floor-exercise-908ed` (project number `703443288211`). The web and native apps continue using this same project. Accounts, Firestore records, app IDs, API keys and browser session persistence are unchanged.

## Implementation and activation

`functions/__/auth/[[path]].js` transparently proxies the Firebase sign-in helpers to the existing project’s Hosting domain. GET, HEAD and Apple’s POST callback are supported; query strings and callback bytes are retained. It does not redirect the browser to `firebaseapp.com`, cache callbacks, forward unrelated first-party cookies/authorization or inject marketing scripts.

The new origin is **off until explicitly configured**. After provider callbacks are authorized, set this production Cloudflare Pages build variable and redeploy:

```
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=pelvi.health
```

`lib/authDomain.js` selects that domain only on `pelvi.health` and `www.pelvi.health`. The same production build on localhost or a Pages preview uses `pelvic-floor-exercise-908ed.firebaseapp.com`. Other explicitly configured staging projects/domains remain separate.

The proxy can be deployed and checked before activating the variable. Do not switch production before the existing provider configurations accept the branded callback; otherwise OAuth can fail with a redirect URI mismatch.

## Existing provider configuration

Add to existing registrations; retain the original callback so old tabs/builds and local development continue to work.

| Location | Required value |
| --- | --- |
| Firebase Authentication → Settings → Authorized domains | `pelvi.health`; include `www.pelvi.health` if the app is served there |
| Google Cloud → Google Auth Platform → Clients → the existing Firebase web OAuth client (`google.com` provider) → Authorized redirect URIs | `https://pelvi.health/__/auth/handler` |
| Apple Developer → Certificates, Identifiers & Profiles → Identifiers → Services IDs → the Service ID configured in Firebase’s `apple.com` provider → Sign in with Apple → Configure → Domains | `pelvi.health` |
| Same Apple Services ID → Return URLs | `https://pelvi.health/__/auth/handler` |

The existing Google web client is `703443288211-uf7edisqmbgniot10hiimso57r6143e7.apps.googleusercontent.com`; the existing Apple Service ID is `com.PelvicFloor.web`, grouped with `78VS2XHBPD.com.PelvicFloor`. These are public registration identifiers, not secrets. Do not substitute an iOS OAuth client, the native App ID or a new Apple Service ID; changing those can change identity grouping. Apple’s current account guide says domain registration does not require uploading a verification file.

On October 18, 2026, the production domain was confirmed in Firebase’s authorized-domain list. Google’s existing web client was saved with `https://pelvi.health` as an additional JavaScript origin and the branded handler as an additional redirect URI. Google’s existing Pelvi Health branding was saved with the Pelvi home, privacy and terms links. Apple’s existing Service ID was saved with the branded handler alongside the original Firebase handler; its primary App ID and existing domains were retained.

## Verification

- `node --test tests/branded-auth.test.mjs tests/service-worker.test.mjs`: 23 checks passed, covering activation gating, preview/local behavior, fixed upstream, query/body preservation, Apple POST, cookie isolation, redirects, cache controls and failures.
- Read-only calls through the local proxy implementation to Firebase’s real `handler`, `iframe` and `handler.js` returned 200, expected content types and unchanged response bodies.
- After deployment, check `https://pelvi.health/__/auth/handler`, `/__/auth/iframe` and `/__/auth/handler.js` before activating the build variable. They must return helper resources, not the app’s HTML fallback or a redirect to the Firebase host.
- After activation, verify Google and Apple popup and redirect completion on production, including mobile Safari/Chrome and blocked-popup fallback. Confirm the OAuth `redirect_uri` is `https://pelvi.health/__/auth/handler`, then confirm the existing account and subscription reopen correctly. Provider account authorization still occurs on Google/Apple domains.

## Primary documentation

- [Firebase redirect best practices, Option 3: reverse proxy](https://firebase.google.com/docs/auth/web/redirect-best-practices#option_3_proxy_auth_requests_to_firebaseappcom)
- [Google sign-in redirect domain](https://firebase.google.com/docs/auth/web/google-signin#customizing-the-redirect-domain-for-google-sign-in)
- [Apple sign-in redirect domain](https://firebase.google.com/docs/auth/web/apple#customizing-the-redirect-domain-for-apple-sign-in)
- [Apple: configure Sign in with Apple for the web](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web/)
- [Cloudflare Pages multipath routing](https://developers.cloudflare.com/pages/functions/routing/#multipath-segments)
