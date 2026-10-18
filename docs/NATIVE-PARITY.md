# Native member experience parity

Reference: the `PelvicFloor` desktop iOS source, commit `69f29cc`. Web starting point: `31268ca`.

The public home/welcome, paywall, Stripe checkout, pricing, subscription access logic, and existing member billing controls are preserved. `tests/protected-surfaces.test.mjs` verifies the original source hashes, including shared dependencies and the member subscription component. The public landing goal grid remains unchanged; the signed-in app uses the current native pathway goal lists.

## Content and behavior

- All twelve 90-day program bundles, the master program file, and the 533-entry video catalog are copied directly from native. Matching native Firestore catalog/program overrides are validated as a pair before use.
- Daily program progress is scoped to the selected goal, unlocks at local midnight, and retains the native 80% video / 60% playlist completion rules. A program day is credited only at session finish after its write succeeds.
- Focus, chosen difficulty, recent workout feedback, clinical calibration, exercise dose/rounds/rest, body-position transitions, and guided practice follow the native rules. Replays retain their original dosing day. Library sessions cannot fill the daily program ring.
- Graduation enters the native repeating 30-day continuation cycle using program days 61–90.
- The audio library includes the native goal/pathway sessions, recorded tracks/cues, transcripts, saved audio, listening history, recommendations, outcome feedback, and private rituals. Urge Rescue and Audio Kegel builders use the exact native scripts.
- Insights includes all 62 native articles and covers, clinical metadata, pathway-aware recommendations, sources, reading navigation, saved reading, asked articles, and saved Coach answers. Coach Mia uses the native default model and clinical/action context.
- Existing members without a stored body pathway make the same required pathway choice as the native app before receiving clinical guidance. Profile includes pathway and workout difficulty, a photo picker, native tracking rooms, night waking, clinician reports, therapist search, and a personal archive. Daily check-ins start unanswered and use the native goal-specific three-question plan and document keys.

## Browser boundaries

WidgetKit widgets, Apple Health, Siri/App Intents, iPhone Live Activities, and iCloud key-value storage are native platform services and cannot be implemented by a website. Browser media playback, background audio, offline recording storage, wake locking, and vibration use the browser's supported APIs. The UI does not promise unsupported device behavior.

Native preferences, saved items, audio history, and some trackers currently use iCloud or device storage. The web uses member-scoped browser storage and Firestore for its supported records; the native app does not automatically consume browser-only preferences. Shared Firestore check-ins, workout history, completions, chat, and diary records retain their native field shapes. No native iCloud data is fabricated or silently imported.

## Verification

Run `npm test` and `npm run build`. The tests cover native content integrity, adaptation, continuation, dose calibration, audio assets/scripts, Insights/Coach behavior, playback accounting, tracker rules, and protected surfaces. When the native sibling checkout is available, content is also checked byte for byte against it.

Browser verification uses development-only `?fixtures=1` data; the fixture bypass is compiled out of production. Production verification checks the deployed Git commit, content asset versions, representative signed-in pages, and unchanged protected sources.

Content export helpers live in `scripts/`. Re-run them against the native checkout when its authored content changes, then run the parity tests.
