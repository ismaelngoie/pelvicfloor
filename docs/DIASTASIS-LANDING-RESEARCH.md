# Diastasis recti landing-page research

Research checked: **18 October 2026**. Program audit baseline: tracked Git `HEAD` **4d42704**. Intended route: `/diastasis-recti`.

This note supports a concise landing page for the existing web product. It separates clinical findings, actual product behavior, and anecdotal customer language. It does not establish that Pelvi itself has been clinically tested. Existing pages, programs, terms and checkout behavior are outside this document's change scope.

## Refresh revision: 18 October 2026

- The owner explicitly confirmed **10,734+ women using Pelvi for diastasis recti**. This is the source for the refreshed user-count statement. It is a usage count, not a count of women who healed, closed their gap, avoided surgery or achieved a measured result.
- [DiastaFix's landing page](https://diastafix.com/) and its [App Store marketing](https://apps.apple.com/us/app/diastafix-diastasis-recti/id6758866144) were examined on this date as commercial references. Their assessment, safety and results language is marketing, not clinical validation of Pelvi or permission to import those claims. The owner confirmation above, rather than a number copied from that page, substantiates the Pelvi count.
- Five minutes is a **starting habit**, paired with daily coach demonstrations and a nearby explanation that full sessions vary and may take longer. The audited timing below does not substantiate a complete five-minute daily routine.
- The refresh uses **Pelvi's pink branding**, a real paused `app-player.webp` capture instead of the empty `app-practice.webp` presentation, and grounded benefits: guided self-assessment, pressure-aware guidance and a twelve-week progress focus without guaranteed results.
- The landing email field is removed. All three primary purchase CTAs open the unchanged `CheckoutSheet` at its existing email step. The attribution helper remains; no diastasis entry is written before checkout. Updated flow details are recorded below.
- The owner confirmed that the six supplied press logos represent **general coverage of diastasis recti**, not endorsement of Pelvi or DiastaFix. The section is labeled “Diastasis recti, in the news,” rather than “As Seen In.” The inline preview now shows the visually verified Coach Laura abdominal-bracing demonstration.

Refresh checks on 18 October 2026: **191 tests passed**; 320px/390px local checks found no horizontal overflow or landing email input. All three purchase CTAs invoke the unchanged sheet. Full deployed checkout-email/Stripe verification is pending because the local Stripe key is absent. The refreshed production build is running and has not yet been confirmed successful.

## Positioning decision

Lead with a clear, progressive core-training routine: guided breathing, core exercises, pressure-control practice, everyday movement and simple check-ins. Address uncertainty about where to start and difficulty maintaining a routine. Five minutes can invite a manageable start; it does not describe every full session. Treat strength and confidence as training goals, rather than guaranteed results.

Do not sell guaranteed anatomical closure, a flat stomach, pain relief, prevention of surgery, or healing within 90 days. Current reviews disagree about gap reduction, and a narrower gap does not necessarily mean less disability. The 90 days describe the program structure, not a biological deadline.

## Primary clinical evidence

All sources below were checked on 18 October 2026. Findings are paraphrased; results belong to the cited studies, not Pelvi members.

| Source and publication date | Finding relevant to the page | Limitation and claim consequence |
| --- | --- | --- |
| [European Hernia Society guideline](https://academic.oup.com/bjs/article/108/10/1189/6378260), October 2021. DOI: `10.1093/bjs/znab128`. | The guideline uses separation wider than 2 cm as its definition. Body-image concerns and core instability are important reported symptoms. Physiotherapy may be considered before surgery. | The relationship between width and symptom severity is uncertain. No particular exercise regimen is established. Do not present a self-rated gap as the whole diagnosis or promise an alternative to surgery. |
| [Beamish and colleagues, BJSM systematic review](https://doi.org/10.1136/bjsports-2024-108619), online December 2024; journal issue 2025. | The review found low-certainty evidence that abdominal training reduced separation at rest and during a head lift compared with no exercise. | Programs, measurements and co-interventions varied. This supports discussing exercise as an option, not claiming that Pelvi reproduces a published result. |
| [Lyons and colleagues, updated review](https://pubmed.ncbi.nlm.nih.gov/41995773/), 17 April 2026. DOI: `10.1007/s10029-026-03660-4`. | Fifteen studies included 803 participants. The three sufficiently comparable studies pooled for TrA-focused training found no statistically significant difference from minimal/no intervention: mean difference −0.06 cm, 95% CI −1.19 to 1.08. | The pooled estimate is imprecise and protocols were heterogeneous. It does not establish that exercise has no value; it does rule out presenting gap closure from deep-core exercise as settled evidence. |
| [Capoccia Giovannini and colleagues, systematic review](https://pubmed.ncbi.nlm.nih.gov/41995887/), 17 April 2026. DOI: `10.1007/s10029-026-03671-1`. | Nine RCTs with 450 participants found approximately 8.05 mm greater narrowing with structured exercise. A smaller functional-outcome analysis did not find a significant disability-score improvement. | Substantial heterogeneity, different protocols and limited functional evidence constrain generalization. The result conflicts with the review above because the comparisons and included evidence differ. Do not select only the positive estimate for advertising. |
| [Gluppe and colleagues, randomized trial](https://pubmed.ncbi.nlm.nih.gov/37286390/), July 2023. DOI: `10.1016/j.jphys.2023.05.017`. | Seventy women 6–12 months postpartum undertook a 12-week home program containing curl-ups, five days weekly. Strength and muscle thickness improved; separation did not meaningfully improve or worsen. | This was a specific program and population. It supports distinguishing strength from anatomical closure and avoiding blanket claims that all curl-ups damage diastasis. It does not prove Pelvi's efficacy or suitability for everyone. |
| [Sperstad and colleagues, prospective cohort](https://bjsm.bmj.com/content/50/17/1092), 2016. DOI: `10.1136/bjsports-2016-096065`. | Among 300 first-time pregnant women followed after birth, separation remained present in some at 12 months. Women with and without predominantly mild diastasis did not differ significantly in reported lumbopelvic pain at that point. | Definitions, measurement location and population affect prevalence. Do not claim that diastasis inevitably causes back pain, or use one cohort's percentage as a universal prevalence estimate. |
| [ACOG postpartum exercise guidance](https://www.acog.org/womens-health/faqs/exercise-after-pregnancy), reviewed October 2024; [NHS post-pregnancy guidance](https://www.nhs.uk/baby/support-and-services/your-post-pregnancy-body/), current page checked on research date. | Return to exercise should be gradual. C-section or complications require advice on timing. NHS advises assessment for an obvious persistent separation or concerning symptoms. | Do not supply a universal postpartum start date. NHS early-recovery advice is not a promise that every gap resolves in eight weeks. A program can complement appropriate clinical care, not replace assessment. |

### Timeline interpretation

Research includes training periods such as eight weeks and twelve weeks, alongside longer studies. These are observation windows, not deadlines for individual improvement. The 2023 trial demonstrates that strength may change without gap closure. Natural postpartum recovery also complicates attribution, particularly in early-postpartum studies.

Suggested brief explanation: **“Think consistent practice over weeks. Studies assess changes over periods such as 8–12 weeks, with mixed results. Your 90-day plan provides structure; it does not guarantee gap closure or a particular recovery date.”**

The eight-week example is discussed in the 2026 structured-exercise review; the twelve-week duration is directly specified in the 2023 trial. Do not turn this into “results in 8–12 weeks.”

For the refreshed benefit, “Follow your progress over 12 weeks” describes a period of practice and self-reporting within the 90-day plan. “Visible results in 12 weeks” would promise a result that the evidence and product audit do not establish.

## Actual shipped product and dose

These observations come from tracked source, not a live clinical assessment or a timed device test.

| Verified feature | Source | Copy boundary |
| --- | --- | --- |
| Ninety authored daily sessions across thirteen weeks. Base days reference three to five exercise clips; adaptive form lessons can produce six. The bundle has 125 distinct catalog IDs; that is not a verified count of unique video files. | `public/content/programs_diastasisRecti.json`, `programs[0].weeks[*].days[*]`; `lib/planAdaptation.js`. The JSON occupies one source line. | “A progressive 90-day plan” and “short exercise demonstrations” match the full adaptive experience. Do not promise a fixed exercise count or advertise 125 unique videos without a separate media audit. |
| The opening session contains diaphragmatic breathing, supine bracing and seated core bracing. The first-week recheck adds heel slides. Later sessions include marching, bridges, lifting/bed-mobility technique and supported strength/plank variations. | Same bundle; days 1, 7, 30 and later weeks. | Describe the actual progression. Do not call every exercise universally postpartum-safe or claim the particular sequence is clinically proven. |
| Prescriptions use foundation days 1–14, build days 15–56 and later progression. Practice type, dose, rest and supported setup vary with exercise, difficulty, profile and focus. | `lib/exercisePrescription.js:109–172`; diastasis calibration at line 27. | “Adjustable practice” is supportable. Avoid implying a clinician has assessed or prescribed for the visitor. |
| Example calculation: Easy difficulty, doming focus, no additional profile values gives three 35-second practices on day 1. On day 7 it adds one round of five heel-slide repetitions. Later dose can increase. | `exercisePrescription(video, { goalId: 'diastasisRecti', difficulty: 'easy', focusId: 'diastasis.doming', programDay })`. | These are illustrative profile-dependent values, not a universal dose or complete session runtime. |
| Authored clip-duration metadata totals 50–410 seconds per day, with a median of 199 seconds. Fifty of ninety days have at least one zero/missing clip duration. Adding Easy prescribed practice gives metadata-based medians of 8 min 16.5 sec without a focus and 7 min 9 sec with doming focus, before between-exercise transitions. Day 1 is 6 min 5 sec or 5 min 50 sec respectively. | Program IDs joined to `public/content/video_catalog.json`, plus `exercisePrescription(...).estimatedPracticeSeconds`; calculation checked 18 October 2026. | These are calculations with incomplete clip metadata, not timed sessions. Use “Start with five minutes for your core,” with a nearby statement that full sessions vary and can take longer. Neither “exactly five minutes” nor “about five minutes” accurately describes every complete routine. |
| The goal's check-ins ask about doming/pressure, deep-core connection and movement confidence. The exercise cue asks for exhaling through effort and reducing range when doming appears. | `lib/nativeDailyTrackingData.js:199–262`; `lib/exercisePrescription.js:92`. | “Track doming, connection and confidence” describes self-reporting. The app does not measure anatomical gap width or diagnose healing. |
| The existing terms describe a separate seven-day, any-reason refund with no session-completion condition. | `app/terms-of-service/page.js:198–202`; the canonical copy is imported there. | Reuse that verified refund promise and canonical price/period. It is financial reassurance, not a promise of a health result. Do not alter existing billing behavior for this page. |

Some existing program titles and intentions refer to repair, healing or closing the gap. They are product copy, not evidence that those results occur. Do not reuse those statements as scientific substantiation for the new landing page.

## Customer-language research, separate from clinical evidence

The following public Reddit threads were read on 18 October 2026. This is a small, self-selected set of anecdotes, not a representative survey. Comments may be inaccurate, promotional or outdated. No quoted person is a Pelvi customer endorsement, and no reported outcome is evidence about Pelvi. The themes below are paraphrased; no patient quotes or identities are reproduced.

| Thread | Useful theme | Page implication |
| --- | --- | --- |
| [Diastasis Recti Repair?](https://www.reddit.com/r/beyondthebump/comments/11mrz2v/diastasis_recti_repair/), March 2023. | Concern that exercise could make the condition worse, uncertainty about which movement to choose, and barriers to paying for assessment. | Explain the starting point and progression clearly. Do not exploit cost concerns by presenting the program as a substitute for needed care. |
| [Q for my fellow diastasis recti moms](https://www.reddit.com/r/DiastasisRecti/comments/1va8oaw/q_for_my_fellow_diastasis_recti_moms/), 2026 thread. | A desire for an organized routine instead of navigating saved social videos, repeated audio, automatic switching and ads. | Show a concrete daily plan and a real exercise preview. Emphasize the usable routine rather than adding a long persuasive essay. |
| [Anyone doing Every Mother app?](https://www.reddit.com/r/DiastasisRecti/comments/np30c6/anyone_doing_every_mother_app/), May 2021 thread with later replies. | Mixed self-reported experiences, inconsistent adherence, confusion about three-week versus twelve-week expectations, and disappointment when strength changes do not produce the hoped-for appearance. | State realistic timelines and distinguish training goals from a flat-belly promise. These older comments do not establish current competitor quality. |

Do not convert anecdotes into testimonials, efficacy percentages, invented member counts, before/after proof, competitor superiority claims or statements that it is never too late for every person.

## Claim matrix

| Proposed wording or idea | Decision | Reason |
| --- | --- | --- |
| “Rebuild your core, one clear step at a time.” | Suitable as an aspirational headline. | Focuses on the training journey, without guaranteeing a measured medical result. |
| “A progressive 90-day plan with guided breathing, core exercises and everyday movement practice.” | Supported product description. | Matches the bundle and practice experience. |
| “Practice breath and pressure control.” | Supported process description. | Describes what the program teaches, not a proven anatomical effect. |
| “Track doming, core connection and movement confidence.” | Supported with self-report context. | Matches the goal-specific questions. |
| “Start with five minutes for your core.” | Suitable as a starting-habit invitation, with nearby duration qualification. | The visitor can begin with a small amount of practice. Full sessions vary and may exceed five minutes; do not imply otherwise through the headline or video caption. |
| “Your daily plan, demonstrated by coaches.” | Supported product description. | The plan contains coach demonstrations. This does not promise a newly recorded, unique five-minute coach video every day. |
| “Guided self-assessment” and “pressure-aware guidance.” | Suitable when the page describes self-reported observations and exercise cues. | Do not relabel the check-ins as a medical-grade diagnosis, measured gap assessment or assurance that pressure-related symptoms cannot occur. |
| “Follow your progress over 12 weeks.” | Suitable as a progress focus within the 90-day program. | It describes tracking and practice, not guaranteed visible change, anatomical closure or a fixed recovery deadline. |
| “10,734+ women using Pelvi for diastasis recti.” | Supported by the owner's explicit confirmation on 18 October 2026. | A user count can communicate adoption. It must not become a treatment-success count or an efficacy percentage. |
| “Notice results in 8–12 weeks.” | Exclude. | Study windows do not guarantee a visitor's timing or outcome. |
| “Close/heal your gap in 90 days,” “repair guaranteed,” or “100% success.” | Exclude. | Evidence is mixed; Pelvi has no verified clinical outcome dataset establishing these claims. |
| “Get a flat belly,” “lose belly fat,” or unverified before/after images. | Exclude. | Cosmetic/body-composition outcomes are not established by this program audit or the cited evidence. |
| “Fix back pain,” “avoid surgery,” “replace physiotherapy,” or “safe for every postpartum body.” | Exclude. | These claims exceed both the evidence and an app's individualized assessment capability. |
| “Never do crunches/planks” or “doming means damage.” | Exclude. | Too absolute; the evidence and stage-specific guidance do not justify universal fear-based rules. |
| “Clinically proven Pelvi plan,” expert endorsement, or medical-review badge. | Exclude unless independently substantiated. | Citing research on other interventions is not product validation or reviewer authorization. |
| “Exactly five minutes daily,” “no equipment ever,” or fabricated urgency/social proof. | Exclude without separate verification. | Runtime varies, later exercises may use household support, and no true scarcity or live activity measurement was established here. |
| Seven-day refund reassurance. | Reuse canonical terms. | Keep financial terms accurate and separate from health outcomes. |

## Concise copy rationale and example

The page should answer four questions quickly: does this concern sound familiar, what will I actually do, how does progression work, and what happens after the CTA. A real exercise preview and clear daily-plan example provide more useful evidence than generic medical imagery. Avoid shame-based language and long lists of diagnoses.

Example direction, subject to the final page's visual hierarchy:

- **Headline direction:** Five minutes for your core. A clear place to start.
- **Lead:** Noticing doming, or unsure where to start? Follow a progressive 90-day plan with guided breathing, core exercises and everyday movement practice.
- **Feature line:** Your daily plan, demonstrated by coaches, with adjustable practice and simple check-ins for doming, connection and confidence.
- **Nearby duration note:** Start small and build at your pace. Full sessions vary and may take longer than five minutes.
- **CTA:** Build My Core Plan.
- **Suitability note:** Recently had a C-section or abdominal surgery, have pain or a known hernia, or have clinician restrictions? Check with your clinician before starting. Stop if exercise causes pain.

This example is not a requirement to add all research detail to the landing page. Keep the main page concise, with the longer nuance in a small FAQ and source links. Explain the actual purchase/onboarding steps accurately; this document does not authorize changing any existing checkout, subscription, guarantee or page.

## Source-use and review notes

- Medical findings above come from original studies, research reviews, a professional-society guideline and official patient guidance. Reddit is used only to understand concerns and language.
- Findings and anecdotes are paraphrased. No long article passages, patient quotations or copied clinical diagrams are included. Linked sources retain their own licenses; a citation does not grant permission to reuse imagery or endorsements.
- Do not use evidence about urinary incontinence, prolapse or other outcomes as a diastasis-specific success rate.
- Do not extrapolate postpartum trial results to all adults, severe cases, pregnancy, hernia or postoperative rehabilitation without separate evidence and appropriate review.
- Source pages, product behavior and commercial terms can change. Recheck before revising material claims, doses or pricing.
- Independent review of the implemented clinical copy found no material overclaim. Its exercise-count phrase was changed to cover adaptive form lessons. Browser and purchase-flow verification are recorded in the implementation notes below.

## Page assets and design provenance

- The original `public/diastasis/app-player.webp`, `app-practice.webp` and `app-check-in.webp` assets were captures of the actual web app at 390 CSS pixels, using the existing local-only fixture account after selecting the diastasis goal. For this refresh, the real paused `app-player.webp` demonstration replaces the empty practice presentation; the page must not suggest that an empty area demonstrates working guidance. The check-in screen shows unanswered goal-specific questions. No patient outcome, personal health record, fabricated before/after or live-member counter is included. The page identifies the screens as examples.
- `public/diastasis/at-home-1200.webp` and `at-home-720.webp` are responsive, compressed versions of one new image made with the built-in ImageGen tool. The lifestyle image illustrates home practice, not a real member, clinician or treatment result. The footer identifies lifestyle imagery as illustrative.
- Final generation prompt: “Use case: photorealistic-natural. Asset type: supporting lifestyle photograph for Pelvi Health diastasis recti exercise landing page. A warm, premium editorial wellness photograph of an adult woman in her mid 30s with a normal, soft, realistic postpartum body, wearing comfortable muted sage leggings and a cream t-shirt, lying on her back on a terracotta exercise mat in a sunlit calm living room. Knees bent, feet flat, head resting, hands gently resting on lower ribs while taking an easy breath. Natural unretouched skin, relaxed face, welcoming home setting, linen curtain and oak floor. The composition must be visually beautiful, candid and reassuring, high-end magazine photography, subtle film texture, warm ivory and earthy green palette. Landscape 3:2 frame, entire comfortable lying posture visible. No text, no logos, no phone UI, no before-and-after transformation, no weight-loss imagery, no clinician endorsement, no baby, no anatomy overlays. This illustrates at-home practice, not a patient outcome.”
- `components/diastasis/InlineExercisePreview.jsx` uses the exact catalog URL for Coach Laura's **Supine Abdominal Bracing**, defined in `components/diastasis/sampleExercise.js` (catalog ID `workout-with-coaches-leakproof-with-coach-laura-supine-abdominal-bracing-hands-on-stomach`). Visual QA confirmed that the clip actually demonstrates the exercise. Its source attaches only when nearby; muted looping playback begins while visible, pauses offscreen or when the page is hidden, and uses manual playback for reduced motion. Native controls remain available. It writes no member progress.
- The original `DiastasisPreview.jsx` modal remains unchanged and unused by this landing page. Its former Heel Slides URL was visually found to open a nutrition introduction, so it is not presented as the refreshed exercise preview. A matching catalog label alone was insufficient to verify the media content.
- The six original PNG assets under `public/diastasis/press/` are retained byte for byte: CafeMom, Women's Health, TODAY, NPR, USA TODAY and Mother Muse. The owner confirmed general diastasis-recti coverage. The heading “Diastasis recti, in the news” does not claim that those publications reviewed, featured or endorsed Pelvi or DiastaFix; no “As Seen In” claim is used.
- The ecommerce reference informed the gallery, visible price and direct purchase action; the WEGLOW reference informed product screenshots and concise sections. Neither site's branding, media, testimonials or claimed results were copied.
- The refreshed interface retains Pelvi's pink identity. Examining DiastaFix's commercial message informed the need to distinguish a manageable starting habit and useful guidance from unsupported healing, medical-grade or guaranteed-result claims; it did not supply clinical substantiation.

## Implementation and verification

- Landing work is isolated to this route, its preview components, assets and research notes. The existing public home, welcome, paywall, Stripe checkout, pricing, payment APIs, member app, analytics rules and service worker are unchanged. All 63 protected-file hashes match the baseline.
- The landing has no separate email form. All three primary purchase CTAs directly open the unchanged `CheckoutSheet`, passing the diastasis goal and using its existing email step. No landing-email validation or pre-checkout diastasis-entry write is part of this refreshed flow. Its existing Payment Element chooses Apple Pay, Google Pay, cards and other eligible methods according to Stripe/device support. No wallets or payment methods were added or promised universally.
- The new `/diastasis-recti/start` route uses existing payment authentication and Google/Apple sign-in helpers, then requires the authenticated server entitlement response. An atomic transaction fills only missing diastasis goal/pathway fields for an unconfigured web member; established plans and native records are preserved. It then returns to the existing canonical welcome/receipt.
- The new entry helper covers edited checkout emails using only the server-verified payer email. Missing/blocked/expired entry storage can use an in-memory preference after authenticated server access is confirmed. When blocked storage loses an inline payment secret in the unchanged checkout, provider sign-in is the recovery path; this is not claimed to preserve zero-click sign-in or a fresh purchase conversion in that case.
- Existing canonical welcome behavior is retained: a server that cannot mint a payment-auth session may ask for Google/Apple again after the new setup route's provider sign-in. The goal is committed before this handoff. Avoid claiming a universally single-tap purchase or sign-in experience.
- The attribution helper is retained: only eight bounded campaign parameters are carried into the existing receipt. Emails, arbitrary tokens, redirects and unknown query parameters are excluded. Retaining attribution does not require writing a diastasis entry before checkout. The existing analytics allowlist is unchanged; the new landing/setup pages do not introduce session replay or new advertising scripts.
- Refresh local QA on 18 October 2026 covered 320px and 390px phone layouts and a 1280px desktop: no horizontal overflow, zero landing email inputs, and all three direct purchase CTAs opening the unchanged sheet component. The real paused player image and visually verified inline bracing demonstration replace the earlier empty/incorrect presentations. Muted autoplay, offscreen pause and reduced-motion manual playback were verified in the browser; the temporary reduced-motion override was reset. Full sheet-email and payment-element QA awaits a deployed environment because the local Stripe key is absent. No real payment was made; physical wallets, bank authentication and a live paid-account lifecycle remain unverified.
- The refreshed suite passed **191 tests**, including setup/account-change/transaction-handoff/attribution cases. The refreshed production build passed, with 120 kB first-load JavaScript for this landing. Cloudflare preview `9f419615.pelvicfloor.pages.dev` deployed successfully. That preview does not include the Stripe publishable-key configuration; the current production checkout bundle does contain its live public key. Final checkout-email verification therefore belongs on production after deployment. No checkout configuration or payment code was changed.
