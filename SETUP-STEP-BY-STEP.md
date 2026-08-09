# What is left for you to do

Two jobs, plus one security tidy-up at the end. Both jobs are in Firebase and take about five minutes together. Nothing here needs the command line.

| # | Job | Where | What it buys you |
|---|-----|-------|------------------|
| 1 | Turn on Google sign-in | Firebase | The sign-in button on /admin does something |
| 2 | Publish `firestore.rules` | Firebase | /admin can read your members, and member data is locked to its owner |

After those two, there is one section about the Stripe price. It used to be a job. It is now only an explanation, and it is worth two minutes of your time because it explains why nobody could check out.

**Everything on the code side is done.** Three things that used to be in this file are gone, and it is worth knowing why, so you do not go looking for them:

- **No Firebase keys to paste anywhere.** They are written into `lib/firebase.js` in the repo. A Firebase web config is not a secret: it is shipped inside the JavaScript of every Firebase website in the world. All it does is name the project. What actually protects your members is Job 2.
- **No service account to generate.** That step existed so the Stripe webhook could write into your database. There is no webhook now, so there is nothing to create and nothing secret to keep safe.
- **No Stripe webhook to register.** The website used to wait for Stripe to knock. Now it asks Stripe directly, at the moment a member opens the app, and gets a live answer. There is no endpoint to add and no signing secret to copy.

---

## Job 1. Turn on Google sign-in

**Why:** /admin has exactly one way in, a Google button. Firebase refuses Google sign-in for a project until you switch that provider on, so today the button opens a window and comes straight back with an error.

1. Go to **console.firebase.google.com** and open the project **Pelvi Health** (`pelvic-floor-exercise-908ed`).
2. In the left sidebar, under the **Build** heading, click **Authentication**.
3. If you have never used Authentication in this project you get a splash screen with a **Get started** button. Click it. Otherwise you land on the **Users** tab.
4. Click the **Sign-in method** tab along the top.
5. You will see either a list of providers or an empty state with **Add new provider**. Either way, click **Google**.
6. A panel slides open. Flip the **Enable** switch at its top right.
7. Two fields appear. **Project public-facing name** is what members see in the Google window, so put `Pelvi`. **Project support email** is a dropdown, so pick your address.
8. Click **Save**.

Give it a minute. After that the button on /admin opens a real Google window.

If /admin ever tells you sign-in is not allowed on this web address, it means the domain is not on the list: same **Authentication** page, **Settings** tab, **Authorized domains**, **Add domain**, then `pelvi.health`.

---

## Job 2. Publish `firestore.rules`

**Why:** once Job 1 is done, this is the only thing left blocking both /admin and signing in on the website. Nothing else. Everything else is written, deployed and waiting.

Two reasons it blocks them, and they are different reasons:

- **/admin.** The rules that are live in Firebase today do not know your address is the owner, so the dashboard signs you in and then says Firestore refused to hand over the member list. The sign-in works. The reading does not.
- **Members on the website.** The moment a member signs in, the site looks up her record so it can show her plan, her streak and her day. A database that will not hand over her own record means she sees an error instead of her programme.

The same file is also the actual lock on your members' data: it is what says nobody can read anybody else's record, and what stops a member editing her own record to give herself a paid account. Until it is published, all of that is whatever was set on the project long ago, which is not a thing to leave to chance on a live app.

1. Same project. Left sidebar, under **Build**, click **Firestore Database**.
2. Click the **Rules** tab along the top.
3. Click inside the editor, select everything (**Cmd+A**) and delete it.
4. Open **`firestore.rules`** in the `PelvicFloorWeb` folder on your Desktop. Copy the whole file, comments and all.
5. Paste it in and click **Publish**. It takes under a minute.

**Do not trim the file first.** Two blocks in it, `workout_categories` and `refund_feedback`, exist only for version 2.7.5 of the iPhone app. 3.0.0 is approved, but an approved update does not reach every phone at once, and 2.7.5 will be in the wild for weeks. Deleting either block breaks the app for whoever has not updated.

If anything on the phone stops working after you publish, the previous version of the rules is one click away on that same screen, in the list of timestamps down the left side.

Your own email address is written into the file, in a function called `isAdmin()`. If you ever want a second person in the dashboard, that line and `ADMIN_EMAIL` in `lib/firebase.js` both have to change. Changing one without the other is how a dashboard quietly stops matching its own database.

---

## The Stripe price. Nothing to do, but worth knowing

**This used to be a job for you. It is now just an explanation.**

The website used to build every subscription from a price id typed into the code, `price_1SwG0JJcZ3jBmTIvffUjnsOq`. That id is not a price on your account. Your live $24.99 monthly price is `price_1SuIhbJcZ3jBmTIvpjkDwzJo`. Stripe rejects a subscription built on an id it does not recognise, so checkout was not failing for some people on some phones. It was failing for everybody, every time, and the only thing anyone saw was a message suggesting they check their internet connection.

Hard coding the correct id would have fixed today and broken again later, because editing a price in Stripe does not change it: it archives the old one and creates a new id. So the code no longer names a price at all. It asks Stripe for the prices on the product **Pelvi Health Premium** (`prod_Ts2n6VY8K08rao`) and takes the one that is active, recurring, monthly, in USD, and costs exactly $24.99.

That last check is the important one. This product also carries two **archived** prices, at $4.99 and $14.99, which still have subscribers on them. "The monthly one" does not pick a single price here. If nothing matches $24.99 exactly, the site sells nothing and says which product to look at, rather than quietly charging somebody the wrong amount.

**What this means for you:** change the price in Stripe whenever you like and the site follows. Change the *amount* and the site will stop selling until the amount in the code is changed to match, which is deliberate.

**If you ever need to force a specific price** (a promotion, a test), set `STRIPE_PRICE_ID` in Cloudflare: **dash.cloudflare.com**, then **Workers & Pages**, then **pelvicfloor**, then **Settings**, then **Variables and secrets**. Add it as Plaintext, save, and redeploy from the **Deployments** tab. It wins over everything above. Variables only take effect on a new build, so saving one changes nothing until you redeploy.

---

## One security job, while you are in Cloudflare

Your live Stripe secret key appeared in a screenshot you shared, and it is stored on Cloudflare as Plaintext rather than as a Secret. Both are worth fixing in the same sitting:

1. In Stripe, roll the key: **Developers**, then **API keys**, then roll the secret key. The old one stops working the moment you do.
2. In Cloudflare, on the same **Variables and secrets** screen as above, delete `STRIPE_SECRET_KEY` and add it again as a **Secret** with the new value. Secrets are encrypted and masked afterwards. Plaintext ones are not.
3. Redeploy.

---

## How you will know it worked

Open **https://pelvi.health/admin** and sign in with **ismael@ngoie.com**. You should land on the dashboard with your members listed. Any other Google account is turned away, both by the page and by the database itself.

---

## What the dashboard can and cannot tell you about money

Worth knowing before you read it, so the numbers do not surprise you.

The dashboard reads member records out of Firestore. A member record does not say who is subscribed on the website, because that answer lives in Stripe and is fetched live, one member at a time, when she opens the app. There is no way for the dashboard to ask Stripe about everybody at once.

So the two subscription tiles count only what the dashboard can genuinely see: members who bought on the iPhone, and members you have marked by hand on the Members tab. They say as much on their face, and they tell you how many members they have no answer for. Anyone who paid on the website and was never marked reads as "Not known here", which is the truth rather than a zero.

**Your Stripe dashboard is the real figure for revenue and subscriber count.** Nothing on /admin replaces it, and /admin does not pretend to.

---

## What I cannot do for you

Jobs 1 and 2 both need somebody signed in as you, with owner rights on the Firebase project. That is the only reason they are still on your plate.
