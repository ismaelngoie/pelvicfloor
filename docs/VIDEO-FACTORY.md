# Pelvi Video Factory

Private owner studio at `https://pelvi.health/video`.

## What one title produces

1. Current web research restricted to approved medical and public-health domains.
2. A claim ledger that ties every health statement to a direct source.
3. A 2 to 4 minute question-led script with the answer delivered early.
4. An independent medical-safety and human-voice review. Rendering is blocked below 85/100, on any safety failure, or when a source cannot be reproduced.
5. A scene-by-scene production brief for one consistent educational host whose avatar and voice are commercially authorized.
6. A 16:9 thumbnail, captions, title, description, tags, chapters, pinned comment, and next-video bridge.
7. A private YouTube upload. Public release always requires the owner to click the upload button or choose a future publish time.

Projects and long-running provider job IDs persist in Firestore. A render becomes ready only after its captions match the approved narration word for word and its MP4 and caption file are copied into Pelvi-owned private storage. The owner can close the page and return later without depending on an expiring renderer link.

## Provider setup without deployments

Open the gear button inside `/video`. The owner can add or rotate these values without editing the repository:

- OpenAI API key and research/review models
- Google Gemini key and Nano Banana image model
- HeyGen key, commercially authorized avatar ID, voice ID, style ID, and brand-kit ID
- YouTube OAuth client ID and secret

The browser sends each value once to the authenticated owner endpoint. Secrets are encrypted with AES-GCM before Firestore storage. The UI receives only the final four characters. The server decrypts a key only when it calls its allowlisted provider.

The default research and independent-review model is `gpt-5.6-sol` at high reasoning effort. Both model IDs remain editable in the private Settings screen.

The encryption root can be an explicit 32-byte `VIDEO_FACTORY_ENCRYPTION_KEY`. When it is absent, the current deployment derives a stable root from the existing Firebase service identity, so the factory works without another Cloudflare setup step. Add the explicit root before rotating the Firebase service account.

The only required one-time Google action is adding this OAuth callback to the YouTube client:

`https://pelvi.health/api/video-factory-youtube`

No Google password is stored. YouTube grants only the `youtube.upload` scope, and its refresh token is encrypted in the same vault.

## Provider decision

The selected initial production renderer is HeyGen Video Agent. It accepts stable avatar, voice, style, and brand-kit IDs and handles presenter scenes, visual composition, captions, and the final edit from one approved production brief.

Nano Banana is an image provider, not a full presenter-video system:

| Model | Factory use | Current approximate image cost |
| --- | --- | ---: |
| Nano Banana 2 Lite | Cheap simple stills | $0.0336 at 1K |
| Nano Banana 2 | Routine thumbnails and consistent scenes | $0.101 at 2K |
| Nano Banana Pro | Final premium thumbnail or difficult visual | $0.134 at 1K or 2K |

The studio defaults to Nano Banana Pro for the one public-facing thumbnail. Nano Banana 2 is available in Settings when the lower cost is preferable. Lite automatically switches to its supported 1K output.

OpenAI GPT Image 2 is also selectable. Every provider path produces a 16:9 JPEG within YouTube's 2 MB thumbnail limit before upload.

A future economy renderer can implement Runway GWM-1 plus Shotstack behind the same project state machine. It is not exposed yet because it needs a complete visual and failure-rate benchmark against HeyGen before it can safely become the default.

## Editorial standard

The host is described as a Pelvi educational host. The system never invents a clinical license, clinic, patient story, or first-person treatment experience. A named clinician may be credited only when a separate, documented human review has actually occurred.

Hard blocks include:

- Diagnosing tight versus weak from symptoms
- Universal Kegels
- Repeated urine-stream stopping
- Advice to push through pain
- Generic internal release, wand, or dilator instructions
- Guaranteed orgasms, leak-proof outcomes, closed gaps, cures, or permanent results
- Social posts, clinic marketing pages, or other videos used as medical evidence
- Missing urgent triage when the title contains a red-flag scenario

Approved source families currently include NICE, ACOG, AUA, EAU, ICS, WHO, CDC, Cochrane, PubMed, NHS, RCOG, IUGA, and current Canadian pregnancy/postpartum guidance.

## Privacy and indexing

- Every API request verifies same origin plus the exact verified Firebase owner email.
- `/video`, `/video.txt`, and child paths send `X-Robots-Tag: noindex, nofollow, noarchive`.
- Google Ads and Microsoft Clarity are not injected on this private route.
- Provider job IDs, encrypted settings, OAuth tokens, and raw storage paths are omitted from browser project objects.
- Generated thumbnails are stored privately and served only through an owner-authenticated proxy.
- YouTube uploads use a persisted resumable session, so an interrupted upload continues from YouTube's saved byte instead of creating a duplicate.
- YouTube metadata sets `containsSyntheticMedia=true` for realistic generated presenters.

## Verification

Run:

```sh
npm test
npm run build
git diff --check
```

The focused tests cover source-domain enforcement, claim linkage, review thresholds, idempotency, secret encryption, OAuth tamper protection, browser-safe project output, official Gemini Interactions payloads, OpenAI background web-search jobs, and private YouTube synthetic-media metadata.
