# Pelvi Health — Google Search Ads Launch Playbook (Do This Tonight)

**For:** the owner of pelvi.health, first-time Google Ads advertiser
**Product:** Pelvic Floor & Core Coach — $149.99/year, 90-day money-back guarantee
**Google Ads account (conversion ID):** AW-18382744409
**Purchase conversion tag (already on the site):** send_to `AW-18382744409/PRCtCMubzN8cENnWyb1E`, value $149.99
**Goal:** daily, profitable sales
**Date:** 2026-08-10

---

## How to use this document

Read section A first, then do B → C → D → E → F in order tonight, then follow G for the next 14 days. Every button name is written exactly as it appears in Google Ads. Do not skip B — if the Purchase conversion is not recording, everything else is flying blind.

**Tonight's order of operations (the whole night in one glance):**
1. **B** — Confirm the Purchase conversion is set up and set to Primary (5 min).
2. **C.1** — Build the negative keyword list first (paste block provided) (5 min).
3. **C.2–C.9** — Create the Search campaign, one ad group, three exact keywords (20 min).
4. **D** — Set bidding to **Maximize clicks** with a **$3.00 max CPC cap** (2 min).
5. **E** — Paste the 15 headlines, 4 descriptions, sitelinks, callouts, structured snippet (15 min).
6. **F** — Set the Final URL and send the 3 landing-page changes to your developer.
7. Publish. Then **G** — check daily, don't touch it for 14 days.

**One mindset rule for the whole night:** your cheapest path to profit is *not* raising bids — it's keeping the ad group tight, the message matched, and the junk traffic blocked with negatives. That's what earns a high Quality Score, and a high Quality Score can cut your cost-per-click by a third or more.

---

## A. Before you start: budget, the ONE keyword cluster, and the sales math

### A1. The budget to set

- **Daily budget: $100/day** to start. (Range is $100–150; start at the low end because it's your first campaign and you're buying data, not scaling yet.) At roughly $2.50 per click that's ~40 clicks a day.
- **Max CPC cap: $3.00** (set in section D). This is your circuit breaker so a single expensive click can't run away with your money.
- **Learning-phase budget you should mentally set aside: $1,000–$2,000 over the first 1–2 weeks.** You need roughly 300–600 clicks before the conversion rate is trustworthy. Expect break-even to thin profit *while it learns*. Do not judge success on the first 2–3 sales.
- Note: Google can spend up to **2× your daily budget on a busy day** but never more than about 30× your daily budget across a month. So $100/day = up to ~$3,040/month. That's normal, not a bug.

### A2. The ONE keyword cluster to launch with

Launch with the **symptom / leak-fix intent** only — a woman who has bladder leaks and wants a fix. Not the "kegel app" shoppers (that's a Week-2 group), not the generic "kegel exercises" crowd (that's a budget trap you'll block with negatives).

Why this cluster and nothing else in the first test:
- It's **qualified by a medical problem**, so it filters out idle "how do I do a kegel" browsers.
- It's the **perfect match for your 90-day money-back guarantee**, which is what neutralizes the $149.99 risk in the buyer's mind.
- It has **enough volume for daily sales** without being so broad you drown in free-info seekers.

**The three exact-match keywords (this is the entire ad group):**
```
[pelvic floor exercises for incontinence]
[bladder leakage exercises]
[exercises for urinary incontinence]
```
The square brackets = **exact match**. In 2026, exact match still catches close and same-meaning variants, but it keeps your day-one economics controllable. Do **not** add phrase or broad match yet. Those come only after exact match proves a conversion rate of 2% or better.

### A3. The daily-sales math (memorize this — it's your whole strategy)

Net per sale after Stripe fees ≈ **$144**. Planning cost-per-click = **$2.50**. Clicks needed per sale = 1 ÷ your conversion rate.

| Conversion rate | Clicks per sale | Ad cost per sale | Result per sale |
|---|---|---|---|
| 1.5% | 67 | $167 | **LOSS of ~$23** |
| 1.9% (break-even) | 53 | ~$132 | ~break-even |
| **2.0%** | 50 | $125 | **+$19 profit** |
| 3.0% | 33 | $83 | **+$61 profit** |

**Break-even is a 1.9% conversion rate at a $2.50 click.** This is a genuine tightrope on day one. It's why you launch on exact match, cap the CPC, and put the guarantee front-and-center. If you get the click down to $2.00 and the conversion rate to 2.5%, your cost per sale drops to $80 and you make $64/sale.

**What each budget buys (conservative case: $2.50 CPC, 2.0% CVR → $125/sale):**
- $100/day → ~40 clicks → ~**0.8–1 sale/day**
- $250/day → ~2 sales/day
- $375/day → ~3 sales/day

Start at $100/day. **Scale budget only after you've confirmed CVR ≥ 2% and CPC ≤ $2.50 on real conversions** — never on the strength of your first couple of sales.

---

## B. Conversion tracking check (do this BEFORE you build anything)

**One setting to fix first.** When you created the Purchase conversion you picked
"Use the same value for each conversion: 149.99". The website now reports the REAL
amount of every sale automatically. Change it so Google uses the real number:
Tools icon > Conversions > click "Purchase" > Settings > Value > choose
**"Use different values for each conversion"** > Save. If you skip this, Google
ignores the value the site sends.

You cannot run a profitable campaign if you can't see sales. Confirm the Purchase conversion is alive and counts as a **Primary** action.

### B1. Sign in and find Conversions
1. Go to **ads.google.com** and sign in.
2. Top of the page, confirm you're in the correct account — the conversion account for this campaign is **AW-18382744409**. (If you have more than one account, use the account switcher at the top right.)
3. In the left-hand menu, click **Goals**. (If you don't see it, click the **Tools** icon — the wrench — then under **Measurement** click **Conversions**.)
4. Click **Conversions**, then the **Summary** tab.

### B2. Find the Purchase action and read its row
Look for a conversion action named **Purchase** (or similar). Read these columns:
- **Conversion source:** should say **Website** / **Google tag**.
- **Status:** this is the key field. You want one of:
  - **"Recording conversions"** — perfect, it's live and has data.
  - **"No recent conversions"** — fine for a brand-new account; the tag is installed, it just hasn't fired a sale yet.
  - **BAD:** "Inactive," "Tag inactive," "No data / unverified," or "Needs attention." That means Google isn't seeing the tag — stop and fix this before spending a cent.
- **Include in "Conversions":** must say **Yes**. "Yes" = this is a **Primary** action that Smart Bidding will optimize toward. If it says "No," it's Secondary and won't drive optimization — click into the action and change it (see B3).
- **Count:** should be **"One"** (one purchase = one conversion), not "Every." A subscription purchase should count once.
- **Value:** should show **$149.99** (or "Use transaction-specific values" pulling $149.99 from the tag).

### B3. If you need to change Primary/Secondary or the value
1. Click the conversion action's **name** to open it.
2. Click **Edit settings**.
3. Under **Goal and action optimization**, set it as a **Primary action** (Include in "Conversions" = Yes).
4. Under **Value**, confirm $149.99 (or transaction-specific). Under **Count**, choose **One**.
5. Click **Save**.

### B4. Confirm the tag actually fires (without buying anything)
The status can lag, so verify the tag fires on the purchase-confirmation page:
- Open **tagassistant.google.com** in Chrome → click **Add domain** → enter `pelvi.health` → **Connect**.
- Complete a test path to the purchase confirmation / thank-you page (use Stripe **test mode** if available so you don't charge a real card).
- In Tag Assistant, watch for a **conversion event** firing to **AW-18382744409** with the label **PRCtCMubzN8cENnWyb1E** and **value 149.99**. If you see it, tracking is verified.
- Alternatively, open the conversion action → **Diagnostics** tab; it flags tag problems and shows recent activity.

### B5. What "verified" looks like (all six must be true)
1. A conversion action named **Purchase** exists.
2. Source = **Website / Google tag**.
3. Status = **"Recording conversions"** or **"No recent conversions"** (never "Inactive/Unverified").
4. **Include in "Conversions" = Yes** (Primary).
5. **Count = One**, **Value = $149.99**.
6. Tag Assistant shows the conversion event firing on the confirmation page with value 149.99.

If all six are true, proceed. If not, do not launch — a campaign that can't measure sales will happily burn your budget while telling you nothing.

---

## C. Build the campaign — every screen, every click

### C1. FIRST: build the negative keyword list (this is what stops the money leaking)
Do this before the campaign so you can attach it during setup.
1. Click the **Tools** icon (wrench).
2. Click **Shared library** → **Negative keyword lists**.
3. Click the blue **+** (plus) button.
4. **List name:** `Pelvi – Master Negatives`
5. In the big text box, **paste this entire block** (one term per line; these are broad negatives that block any search containing the term):
```
free
free app
best free
youtube
video
videos
pdf
printable
handout
worksheet
chart
images
pictures
diagram
how to
what is
what are
definition
meaning
symptoms
causes
why do i
nhs
mayo
cleveland clinic
harvard
wikipedia
niddk
near me
clinic
physical therapist
physiotherapy
physical therapy
doctor
specialist
urologist
gynecologist
appointment
treatment cost
surgery
medicare
insurance
device
cones
weights
balls
chair
emsella
machine
wand
dilator
pessary
catheter
men
male
prostate
prostatectomy
fecal
bowel
prolapse surgery
```
6. Click **Save**. You'll attach it to the campaign in step C8.

*(Optional now, or break out later as a deliberate "conquesting" campaign: you can also add competitor/device brand names — `elvie`, `perifit`, `kegg`, `squeezy` — as negatives so you don't pay to compete against branded searchers before you're ready.)*

**Why these matter:** the two head terms "kegel exercises" and "pelvic floor exercises" (tens of thousands of searches, but pure information seekers) are budget traps. So are "free," "youtube," "pdf," "near me," "doctor," and all the medical-device terms. This list is the single thing that keeps your $2.50 clicks landing on buyers, not browsers.

### C2. Start the new campaign
1. Left menu → **Campaigns**.
2. Click the blue **+** → **New campaign** (or the big **Create campaign** button).

### C3. Choose the objective
1. On "What's your campaign objective?" choose **Sales**.
2. Confirm the conversion goal shown includes **Purchase**. If Google lists other default goals you don't want driving this campaign, remove them so **Purchase** is the goal it optimizes toward. Click **Continue**.
   - *(Alternative if you want every setting visible with zero nudging: pick "Create a campaign without a goal's guidance" instead. Either works; "Sales + Purchase" gives cleaner reporting.)*

### C4. Choose the campaign type
1. Select **Search**. (Not Performance Max, not Display, not Demand Gen — those come much later, in section H.)
2. When asked "How do you want to reach your goal?" — you can enter your website `https://pelvi.health` and, if prompted for **results to get**, **uncheck / do not add** phone calls, app, or store-visit results. You only want website visits/purchases.
3. Click **Continue**.

### C5. Name the campaign and set bidding
1. **Campaign name:** `Pelvi | Search | Leak-Fix | US`
2. **Bidding** — this is important, see full detail in **section D**. For now: under "What do you want to focus on?", you want **Maximize clicks**. If the screen only shows Conversions/Conversion value, click the small link **"Or, select a bid strategy directly"** (sometimes labeled "not recommended" — ignore that label), then choose **Maximize clicks**.
3. Check the box **"Set a maximum cost-per-click bid limit"** and enter **`3.00`**.

### C6. Networks — turn OFF the expansions (critical)
On the campaign settings screen, find **Networks** (it may be under "More settings" — click to expand):
- **Uncheck "Include Google search partners."**
- **Uncheck "Include Google Display Network."**

**Why:** Search Partners are third-party search sites with weaker intent and no quality control. Display Network turns your tight Search test into cheap, low-intent banner clicks on random apps and websites — it will quietly eat 30–70% of your budget on garbage. For a first profitable test you want **Google Search results only**, nothing else.

### C7. Locations, language, and other settings
1. **Locations:** choose **Enter another location** → type **United States** → **Target**.
2. Click **Location options** (small link) and set targeting to **"Presence: People in or regularly in your targeted locations."** *Do not* leave it on "Presence or interest" — that shows your ad to people abroad merely searching *about* the US and wastes money.
3. **Language:** select **English**. (Leave it at just English.)
4. **Audience segments:** **add none.** Do not attach any audience list. (Health-policy reason in section I — attaching an audience is a top cause of disapproval.)
5. **Broad match toggle:** if you see "Turn on broad match for keywords in this campaign," leave it **OFF**.
6. **Ad rotation** (under More settings): leave default (**Optimize**).
7. **Ad schedule:** leave as **All day** for now.
8. **Devices:** leave all on (most of your traffic will be mobile — that's expected and your page is built for it).
9. **Start/end dates:** start today, no end date.

### C8. Attach the negative keyword list
Depending on the flow, you'll attach negatives either now or right after publishing:
- **During setup:** if a "Negative keywords" or "Additional settings" section appears, click it → **Use negative keyword list** → select **Pelvi – Master Negatives**.
- **If not shown during setup:** finish creating the campaign, then go to the campaign → left menu **Audiences, keywords, and content** → **Negative keywords** → click **+** → **Use negative keyword list** → select **Pelvi – Master Negatives** → **Save**.

### C9. Set the daily budget
- **Budget:** enter **`100`** per day.

### C10. Create the ONE ad group
1. **Ad group name:** `Leak-Fix | Exact`
2. In the keywords box, **paste exactly** (keep the brackets):
```
[pelvic floor exercises for incontinence]
[bladder leakage exercises]
[exercises for urinary incontinence]
```
3. Delete any keyword suggestions Google auto-adds that aren't these three.

Now build the ad (section E), then set the Final URL (section F), then publish.

---

## D. Bidding — exactly what to pick tonight, and when to change it

### D1. Day one (zero conversion history)
- **Bid strategy: Maximize clicks.**
- **Max CPC bid limit: $3.00.**

**Why not "Target CPA" or "Maximize Conversions" on day one?** With zero conversion history, Smart Bidding has no idea what a buyer looks like — a Target-CPA strategy will throttle you out of auctions, and Maximize Conversions can bid erratically until it has data. **Maximize clicks with a hard CPC cap** buys you clean data cheaply and keeps your cost per click controllable while your landing page and tag prove out. It is a *data-gathering* tool, never a permanent strategy.

*(Manual CPC starting at ~$2.50/click is an acceptable alternative if you prefer total control, but Maximize clicks with the $3.00 cap is simpler for a first-timer and does the same job.)*

### D2. The exact rule for when to change bidding
Do **not** change bidding for the first 14 days no matter what. After that, use this ladder, checking the **"Conversions"** and **"Conv. rate"** columns for the trailing 30 days:

1. **Stay on Maximize clicks** until tracking shows **~15–30 conversions in the last 30 days** AND your conversion rate is **≥ 2%** AND CPC is **≤ $2.50**.
2. **Then switch to Maximize Conversions** (most forgiving Smart Bidding; works at ~15–20 conversions/month, no target needed). Change bidding at: campaign → **Settings** → **Bidding** → **Change bid strategy** → **Maximize conversions** → **Save**.
3. **Only after ~30–50 conversions in 30 days at a stable, acceptable cost per sale**, layer on **Target CPA**. Set the target **slightly ABOVE your observed average cost/conversion, not below it** — start around **$120** (near break-even), then tighten toward **~$85** for margin over the following weeks. A target set too low starves the campaign of impressions.

**Never** jump straight to Target CPA. And each time you change bid strategy you reset the learning period — so change it deliberately, not restlessly.

---

## E. The ad — ready to paste

Create **one Responsive Search Ad** in the `Leak-Fix | Exact` ad group. In the ad group, click **Ads and assets** (or the **+** when prompted) → **Responsive search ad**.

Character limits: **headlines ≤ 30 characters**, **descriptions ≤ 90 characters**. Google shows up to 3 headlines and 2 descriptions per impression, machine-chosen per search. Every one below is within limit, product-led, third-person, and policy-compliant. Aim for **"Good"** Ad Strength — do not sacrifice the compliant, on-message keyword lines to chase "Excellent."

### E1. Final URL (top of the ad)
Enter the leak landing URL from **section F** (e.g. `https://pelvi.health/stop-leaks` if built, otherwise `https://pelvi.health/`).

### E2. The 15 headlines (paste one per headline slot)
| # | Headline | Pin |
|---|---|---|
| 1 | `Pelvic Floor Exercises at Home` | **Pin to Position 1** |
| 2 | `Bladder Leakage Exercises` | **Pin to Position 1** |
| 3 | `Exercises for Incontinence` | **Pin to Position 1** |
| 4 | `90-Day Money-Back Guarantee` | (unpinned) |
| 5 | `5-Minute Daily Sessions` | (unpinned) |
| 6 | `Built With Women's Health PTs` | (unpinned) |
| 7 | `Guided Pelvic Floor Program` | (unpinned) |
| 8 | `No Clinic Visits Needed` | (unpinned) |
| 9 | `Train at Home, No Equipment` | (unpinned) |
| 10 | `Bladder Leak Help for Women` | (unpinned) |
| 11 | `Start Your Program Today` | (unpinned) |
| 12 | `Cancel Anytime, Risk-Free` | (unpinned) |
| 13 | `Take the 2-Minute Quiz` | (unpinned) |
| 14 | `Postpartum Core Recovery` | (unpinned) |
| 15 | `Rebuild Pelvic Strength` | (unpinned) |

**Pinning — do exactly this:** pin headlines **1, 2, and 3 all to Position 1**. To pin, hover the headline → click the **pin icon** → choose **"Show in position 1."** Pinning all three to the same slot means Google **rotates among them** in position 1, so a keyword-mirror headline is always first (great message match) while still testing which one wins. **Leave headlines 4–15 unpinned** so Google can freely test benefit, proof, offer, objection, and CTA lines in positions 2 and 3. Do **not** over-pin — pinning everything collapses testing and hurts performance.

These 15 deliberately span every angle: keyword mirrors (1–3), offer/risk-reversal (4, 12), benefit (5, 7, 15), credibility (6), objection-handlers (8, 9), audience (10, 14), and CTAs (11, 13).

### E3. The 4 descriptions (paste one per description slot; leave unpinned)
1. `Guided pelvic floor exercises for women you can do at home in five minutes a day.`
2. `Backed by a 90-day money-back guarantee. Train at home, cancel anytime, no equipment.`
3. `Follow a step-by-step plan built with women's health physios. Start your program today.`
4. `Short daily sessions to strengthen your pelvic floor and core. No clinic visits needed.`

Do not pin descriptions.

### E4. Sitelinks (add 4–6, each pointing to a DISTINCT page)
Add at the campaign or ad-group level → **Assets** → **Sitelinks**. Link text ≤ 25 chars; each description line ≤ 35 chars.

| Sitelink text | Description line 1 | Description line 2 |
|---|---|---|
| `How the Program Works` | `See the daily 5-minute routine.` | `Simple guided sessions at home.` |
| `What's Inside` | `300+ physio-approved workouts.` | `For bladder, core and recovery.` |
| `90-Day Guarantee` | `Money-back if you're not happy.` | `Cancel anytime, no questions.` |
| `For Bladder Leaks` | `Exercises focused on leaks.` | `Do them at home, 5 min a day.` |
| `For Postpartum Recovery` | `Rebuild core after birth.` | `Gentle, guided, at your pace.` |
| `Pricing` | `$149.99/yr, 90-day guarantee.` | `One plan, cancel anytime.` |

Point each to a matching page/anchor if they exist; if not, point them all at the same leak landing page for now and differentiate later.

### E5. Callouts (add 6–8; ≤ 25 chars each; non-clickable trust snippets)
```
Money-Back Guarantee
5 Minutes a Day
Designed With Physios
Cancel Anytime
Train at Home
No Equipment Needed
300+ Guided Workouts
For Postpartum Recovery
```

### E6. Structured snippet (add one)
- **Header:** `Types`
- **Values:** `Kegel Coaching`, `Bladder Control`, `Postpartum Recovery`, `Core Recovery`, `Prolapse Support`

### E7. Compliance guardrails baked into this ad (do not break them)
- **Third-person, product-led only.** Never "Struggling with bladder leaks?", "Do you leak when you sneeze?", or "Your incontinence, solved." That second-person condition language is the #1 health disapproval trigger.
- **Guarantee = refund only.** Advertise strictly as a **"90-day money-back guarantee."** Never "guaranteed results," "cure incontinence," "stop leaks for good," or "guaranteed relief" — those are outcome claims that get disapproved.

---

## F. Landing page — where to send the click, and the 3 changes to request

### F1. The URL to put in "Final URL"
- **Best (build this first if you can):** a dedicated leak page, e.g. **`https://pelvi.health/stop-leaks`**, whose first-second message is about leaks and that drops the visitor straight into the funnel with the **bladderLeaks** goal preselected (skipping the "what would you like to work on?" question). Dedicated matched pages convert far better than a generic homepage.
- **If that page isn't live tonight:** you can launch pointing at **`https://pelvi.health/`**, but understand the homepage currently message-matches *poorly* for this keyword (details below), which will lower your Quality Score and conversion rate. The higher-return move is to get the dedicated page built within a day or two, then point the ad at it. Either way, **launch — don't wait indefinitely** — but treat the leak page as the #1 pre-scale task.

### F2. The top 3 landing-page changes to ask your developer for
Hand your developer these three, with the exact file references so there's no ambiguity:

1. **Rewrite the H1 to name the leak first (highest impact).** Today the biggest text a leak-searcher sees is "Strength & Confidence / From Your Core Outward," and her problem word "leaks" is buried mid-subhead. Lead instead with a refund-safe line **that already exists in your code**: `lib/guaranteeCopy.js:33` → *"getting through a cough, a laugh and a run without thinking about it"* or `components/funnel/copy.js:524` → *"Cough, laugh and work out with confidence."* Demote "Strength & Confidence From Your Core Outward" to the subhead. (Current H1 lives in `components/funnel/copy.js:27-36`, rendered by `components/funnel/WelcomeScreen.js:311-318`.) This is the single biggest lever on both bounce rate and Google's ad-relevance Quality Score for this keyword.

2. **Build a dedicated leak ad-destination path** (e.g. `/stop-leaks`) with a leak-first hero that enters the *same* funnel with **bladderLeaks preselected** via `start('bladderLeaks')`, skipping the goal question. The funnel currently reads no goal from the URL (`components/funnel/Funnel.js:295-320` — `chooseGoal/start` only fire from on-page taps), so this needs a small hook. Nearly all the copy already exists (`copy.js:119-130` leak tiles; `HEALTH.bladderLeaks.cta` = "Build My Leak-Free Plan"). Mark the new page **noindex + canonical to "/"** so it never splits SEO authority; keep "/" as the brand/organic homepage.

3. **Add price / "free to start" transparency near the CTA.** Right now $149.99/yr isn't shown until screen 8, with no free-to-start cue (confirmed: no price/trial string in `WelcomeScreen.js`, `LandingScreen.jsx`, or `copy.js`). Add one honest line by the "Start My 5-Min Journey" button — **"Free to start. Cancel anytime."** if the funnel is genuinely free to enter, or **"From $149.99/yr · 90-day money-back"** if not. This reduces the bait-and-switch feel at the paywall and the "why am I answering all this" drop-off, and it's exactly what Google's landing-page-experience guidance rewards.

*(Two cheap bonus wins, if he wants them: pin the static "Zero leaks by week 2 — Emily, 39" testimonial instead of leaving it to a 10-quote rotating ticker; and upgrade the animated "10,200+ members" counter to a harder trust signal like a star rating or a named physio credential.)*

---

## G. Launch day and the first 14 days

### G1. Right after you click Publish
- Confirm the ad status isn't **"Disapproved"** or **"Under review"** stuck red. "Eligible" or "Under review" (which clears in a few hours) is fine.
- Confirm the campaign, ad group, and keywords are all **Enabled** (not Paused).
- Re-confirm the negative list **Pelvi – Master Negatives** is attached to the campaign.

### G2. Check EVERY DAY (10 minutes)
1. **Disapprovals:** any ad or keyword flagged? Fix copy per section I if so.
2. **Spend pacing:** is it spending roughly your $100/day, not $0 (something broken) and not maxing weirdly?
3. **Search terms report** (the most valuable daily task): ad group → **Insights and reports** / **Search terms**. Read the *actual* phrases people typed. Any that are junk (free-info, off-topic, wrong audience) → select them → **Add as negative keyword**. This is the main way you tighten the campaign in week one.
4. **Tag firing:** glance at the Conversions summary to confirm the Purchase action is still active (and celebrate your first "1" in the Conversions column).

### G3. The ONE number that says it's working
After ~1–2 weeks and **300–600 clicks**, look at **Cost/conv.** (cost per conversion) and **Conv. rate**:
- **Working / profitable:** **Cost/conv. ≤ $125** (you net ~$144, so that's profit) and **Conv. rate ≥ 2%**. Ideal is Cost/conv. ≤ $90.
- The single headline number to watch is **Cost/conv.** Below ~$125 = you're making money. Below ~$85 = you're ready to scale.

### G4. The signal that says PAUSE and diagnose
- **Spend reaches ~$300 (about 120+ clicks) with ZERO conversions** → something is broken. Pause and check, in this order: is the conversion tag firing (Tag Assistant)? does the landing page match the ad? are the search terms actually leak-buyers? Don't keep spending into a black hole.
- Or, after the learning window, **Conv. rate stuck below 1.5% and Cost/conv. above $150** consistently → pause, fix the landing page (section F changes) *before* spending more. The page, not the bid, is almost always the fix.

### G5. The ONE rule while it learns (days 1–14)
**Do not touch the machine while it learns.** For the full 14 days:
- **Allowed daily:** add negative keywords from the search-terms report, check disapprovals, confirm the tag fires, pause an obviously broken keyword.
- **Forbidden (these reset learning and destroy your data):** changing the bid strategy, changing the budget by more than ±20%, editing the Purchase conversion action, or rewriting/swapping the RSA.

Judge results only **after ~2 weeks / a full conversion cycle**, never on day 3.

---

## H. Scale — the ordered path toward the million-dollar goal

Keep this framing: **~$1M/yr at $149.99 ≈ 6,700 subscriptions ≈ ~19 sales/day.** The high-intent leak-buyer search pool nationally is only a few thousand searches/day — **pure search cannot supply 19 sales/day.** Search is your profitable *floor*; the million comes from stacking multiple engines on top of it. Do these **in order**, and only advance when the prior phase is proven.

- **Phase 0 (now):** the `Leak-Fix | Exact` group, $100/day, Maximize clicks + $3 cap. **Goal: prove CVR ≥ 2% and CPC ≤ $2.50.**
- **Phase 1:** add a **sibling ad group with phrase-match** versions of the same 3 terms, plus cheap acute long-tails: `"stop bladder leaks"`, `"how to stop leaking when i sneeze"`, `"bladder leaks when running"`, `"stop peeing when i cough"`. Do this only after exact proves ≥ 2% CVR.
- **Phase 2:** add a separate **COMMERCIAL "app" ad group** with its *own* ad ("a clinical guided program, not a free timer"): `[kegel app]`, `[pelvic floor app]`, `[bladder control app]`, `[app for bladder leaks]`. Different intent, different ad, so it stays its own group.
- **Phase 3:** launch **Postpartum** and **Menopause** campaigns, each with its own ad + dedicated landing page (Postpartum: "postpartum bladder leaks," "leaking after birth," "postpartum incontinence exercises." Menopause: "menopause bladder leakage," "perimenopause incontinence"). **These are your best $149.99 converters** — motivated, higher lifetime value, not anchored on "free app." This is the core of the million-dollar path.
- **Phase 4:** add an **Intimacy / other-goal** campaign as its own ad + page. Keep language clinical to stay inside Google's sexual-wellness ad policy.
- **Phase 5:** once **each** campaign has ~15–30 conversions/month AND value-based tracking imports the real $149.99 value, move that campaign to **Maximize Conversions → then Target CPA** near break-even (~$120), tightening toward ~$85.
- **Phase 6:** at **30–50+ conversions/month total** AND revenue-value tracking live, launch **Performance Max** (fed by your winning search themes) and **Demand Gen** ($100/day minimum) to take your proven "stop leaks" creative to the far larger in-market/lookalike pool across YouTube/Discover/Gmail. **This is the step that breaks past the few-thousand-searches/day ceiling.** (Note the health-audience limits in section I when you build these.)
- **Phase 7:** add **retargeting** to the ~98% who click but don't buy on visit one (at $150 most buyers need 2–5 touches — this is where sales often actually close), plus **competitor/device conquesting** (Elvie, Perifit, kegg, Squeezy). **Read the retargeting caveat in section I first — this vertical has restrictions.**

---

## I. Health-vertical policy warnings for THIS account (read so you don't get suspended)

Pelvic-floor/incontinence is a **sensitive health topic** under Google's policies. These four rules protect your account:

### I1. NO audience lists on your health search campaigns
Google **prohibits** using advertiser-curated audiences for health-related ads: **Customer Match lists, your-data/remarketing segments, similar/lookalike audiences, and audience expansion / "optimized targeting."** Attaching any of these to a campaign, ad group, or asset is a top cause of disapproval. That's why section C7 says **add no audience segments.**
- **Allowed** (use these later if you want): Google's **predefined in-market and affinity audiences**, **demographics** (e.g. women, likely age bands), **life events**, **location**, and **custom segments** built from keywords/URLs. Rely on **keyword intent + allowed in-market/demographic + geo** — nothing user-data-based.

### I2. The retargeting restriction (affects Phase 7)
Standard site-visitor **remarketing lists built from people who visited a pelvic-floor/incontinence page are health-inferred audiences and are restricted** on this vertical. Do **not** assume you can run classic "show ads to everyone who visited" remarketing here. When you reach Phase 7, plan to reach non-buyers through **contextual placements and broad Demand Gen without health-based audience lists**, and confirm the specific tactic against Google's "Health in personalized advertising" policy before you build it. Don't build a remarketing audience from these visitors and attach it to a campaign — that's exactly the kind of thing that triggers a suspension.

### I3. Enhanced Conversions caveat
Enhanced conversions (sending hashed customer email from the purchase to improve *measurement* accuracy) is a **measurement** feature and is generally permitted — the health restriction is on **audience targeting**, not measurement. But because this is sensitive data: (a) make sure your privacy policy/consent covers it, and (b) **do not repurpose that conversion data to build Customer Match audiences** for these health campaigns — that would cross from allowed measurement into prohibited personalized targeting. Keep it for measurement only.

### I4. Copy disapproval triggers (the two that get ads killed)
- **Second-person condition language** that implies you/Google know her health status: "Struggling with bladder leaks?", "Do you leak when you sneeze?", "Your incontinence, solved." **Fix:** product-led, third-person, factual — "Bladder Leakage Exercises," "Pelvic Floor Training at Home," "Guided Exercises Designed With Physios." (Every headline and description in section E already follows this.)
- **Guaranteed health outcomes:** "Cure incontinence," "Stop leaks for good," "Guaranteed relief," "Guaranteed results." These violate the misrepresentation / unreliable-claims policy. **Your 90-day guarantee is a commercial money-back/refund guarantee — advertise it only as "90-day money-back guarantee," never as guaranteed results.**

If an ad does get disapproved, it's almost always one of the two above (or a banned audience from I1). Fix the wording or remove the audience, and the ad automatically goes back for re-review.

---

### Final sanity check before you hit Publish tonight
- [ ] Purchase conversion verified, Primary, value $149.99 (B5)
- [ ] Negative list `Pelvi – Master Negatives` created and attached (C1, C8)
- [ ] One Search campaign, US, English, presence-only, Search Partners OFF, Display OFF (C6–C7)
- [ ] One ad group, three exact keywords in brackets (C10)
- [ ] Bidding = Maximize clicks, max CPC $3.00 (D1)
- [ ] Budget $100/day (C9)
- [ ] One RSA: 15 headlines (1–3 pinned to Position 1), 4 descriptions, sitelinks, callouts, structured snippet (E)
- [ ] Final URL set; 3 landing changes sent to developer (F)
- [ ] No audience segments attached (I1)

Publish, then leave it alone and follow section G. You are aiming to see **Cost/conv. under $125** within two weeks. That's the number that means you have a profitable machine worth scaling.
