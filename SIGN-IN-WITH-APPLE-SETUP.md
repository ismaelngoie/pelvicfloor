# Sign in with Apple, and the real fix for the email that never arrives

Two jobs in this file. The first is Sign in with Apple, which is code that is
already written and waiting for you. The second is our mail: it goes out from a
Firebase-owned sender that Gmail treats as spam.

**Apple is now the urgent one, and that is a change.** The login-link door has
been taken off every screen on the site. It was a door that failed silently —
the send always reported success, even when the message was binned — so a
member could sit on "check your email" for ever with no way for the code to
know. Google and Apple are the only ways in now, and until you finish Part One,
**Google is the only one.** Google alone works, and the site is built so it can
never be hidden: if Apple is refused, the Google button goes full width and
stays reachable on every screen. But one door is one door.

Part Two has not stopped mattering, it has changed job. Nothing on the site
promises a member an email any more, so no one is left waiting on your DNS. But
password resets, Apple's Hide My Email relay and every notification you send in
future all ride that same pipe, and none of them work properly until it is
verified. It is also the prerequisite for ever putting the email door back —
the conditions are written at the top of `lib/identity.js`.

---

## What the site does right now, before you touch anything

The code is deployed and it is already handling all of this on its own.

* Every sign-in screen — the member gate at `/app`, the log in sheet on the
  paywall, the log in sheet on the welcome screen, the "you are already a
  member" screen in the funnel, the already-subscribed state in checkout, and
  the dialog on `/welcome` when a payment could not be turned into a session —
  shows **Google and Apple side by side and nothing else**. There is no "use my
  email instead" anywhere. It has been removed, on purpose; the reasoning is in
  the header of `lib/identity.js`.
* **Links that have already gone out still work.** The code that redeems one is
  untouched, including the case where she opens it in a browser that does not
  remember which address it was for and has to confirm it. Nothing new is ever
  sent.
* **Google can never disappear.** It is drawn with no condition in front of it.
  Apple comes and goes with what the browser has learned; Google does not, and
  it takes the full width whenever Apple is not there.
* The Apple button is drawn **optimistically**. A browser cannot ask Firebase
  "is Apple configured", it can only try. So the first time a member taps it and
  Firebase answers `auth/operation-not-allowed`, that browser remembers, tells
  her plainly that Apple is not switched on yet, and **stops drawing the
  button**. Google goes full width in its place. Nobody is shown a control that
  cannot work twice.
* That memory **expires after twelve hours**. So the moment you finish the setup
  below, the button comes back on its own. **There is no deploy, no code change
  and nothing to ask for.** On a browser that never tried, it is there
  immediately.

To see it on your own phone the second you finish, rather than waiting out the
twelve hours: Safari → Settings → Safari → Advanced → Website Data → delete
pelvi.health. Or just open a private tab.

---

# PART ONE: Sign in with Apple

Five steps at Apple, one step at Firebase. Budget half an hour. You need the
paid Apple Developer Program membership you already have for the App Store.

One value you will need in several places, so copy it somewhere now:

```
pelvic-floor-exercise-908ed.firebaseapp.com
```

That is the **Firebase auth domain**. It is not a typo and it is not
pelvi.health. Apple's sign-in window opens on that domain, so that is the domain
Apple has to be told about. This trips up nearly everybody.

## Read this before you start: you are setting up the iPhone app at the same time

Everything below is done **once**, and it covers the website and the iOS app
both. This is not an optimisation, it is how Apple's model works, and if you set
it up as though the two were separate products you will get two accounts per
member and spend a weekend working out why.

* **One App ID is the parent of both.** The iPhone app's bundle id is
  `com.PelvicFloor`. That App ID is what you enable as a **primary App ID** in
  step 1, and it is what you must choose as the **Primary App ID** of the
  website's Services ID in step 3 and of the key in step 4. Nothing else.
* **The website's Services ID is named after it:** `com.PelvicFloor.web`. Same
  scheme, one level down, so it is obvious at a glance which app it belongs to.
  A Services ID on an unrelated scheme still *works*, but the day someone else
  opens the Apple portal they cannot tell what it is for.
* **One Key, one Key ID, one Team ID, for both.** The `.p8` you download in
  step 4 and the Key ID beside it serve the website today and the iOS release
  later. You do **not** make a second key for the app, and you must not: you can
  only download each one once, so a spare key is a file you will lose.
* **Because of all of the above, a member gets the same account on both.**
  She signs in with Apple on pelvi.health and later installs the iPhone app, or
  the other way round, and Apple issues the **same user identifier** to both —
  because both roll up to `com.PelvicFloor`. Firebase therefore matches her to
  the **same Firebase account**, and if she chose **Hide My Email** she gets the
  **same `@privaterelay.appleid.com` relay address** in both places. Her plan,
  her day count, her streak and her Coach Mia history follow her across without
  anyone doing anything.
* **Get the Primary App ID wrong and none of that holds.** Point the Services ID
  at a different App ID and Apple treats the website as a separate app: a
  different user identifier, a different relay address, and a member who has to
  find her subscription by hand every time she changes device. It is the single
  most important field in this whole document.

## At Apple — developer.apple.com

Sign in, then click **Certificates, Identifiers & Profiles** (also reachable from
Account → the "Certificates, IDs & Profiles" tile).

### Step 1. Let the existing app act as the parent

In the left sidebar click **Identifiers**. You will see the App ID for the
iPhone app — **`com.PelvicFloor`**. Click it.

Scroll the **Capabilities** list to **Sign In with Apple** and tick it. A blue
**Edit** button appears next to it — click that, choose **Enable as a primary
App ID**, and **Save**. Then **Save** at the top right of the page.

*Why: Apple groups a website and an app under one identity so a member who signs
in on her phone and on the website is the same person. `com.PelvicFloor` is the
parent, and every other thing you make below points back at it.*

### Step 2. Make a Services ID — this is the website's identity

Still under **Identifiers**, click the blue **+** next to the heading.

Choose **Services IDs** (not App IDs) and click **Continue**.

* **Description:** `Pelvi Web Sign In`
* **Identifier:** `com.PelvicFloor.web`

**Type that identifier exactly.** It must not be the same as the iPhone app's
bundle id `com.PelvicFloor` — Apple will not let it be — but it should be the
bundle id with `.web` on the end, so that anyone opening this portal later can
see in one glance that the website belongs to the app. Firebase asks for this
string later, character for character.

Click **Continue**, then **Register**.

### Step 3. Point that Services ID at our Firebase domain

You are back on the Identifiers list, which is still filtered to App IDs. Use
the dropdown at the top right of the list to switch it to **Services IDs**, then
click the `Pelvi Web Sign In` row you just made.

Tick **Sign In with Apple**, then click the **Configure** button beside it. A
panel called **Web Authentication Configuration** opens.

* **Primary App ID:** choose **`com.PelvicFloor`**, the App ID from step 1.
  This is the field that makes the website and the phone the same account and
  the same Hide My Email address. Anything else here quietly splits them.
* **Domains and Subdomains:** `pelvic-floor-exercise-908ed.firebaseapp.com`
* **Return URLs:** `https://pelvic-floor-exercise-908ed.firebaseapp.com/__/auth/handler`

Two underscores before `auth`. Copy that line rather than typing it.

Now click **Verify** next to the domain. It should go green straight away:
Firebase serves the file Apple looks for on its own domain, so there is normally
nothing for you to upload.

**If Verify fails**, Apple offers a **Download** button for a file called
`apple-developer-domain-association.txt`. Before doing anything with that file,
try this instead, because it fixes it nine times out of ten: open the Firebase
console → **Hosting** in the left sidebar → **Get started**, and click through
until Hosting exists on the project. You do not have to deploy anything. Then
come back here and press **Verify** again. Firebase only serves that file on
projects where Hosting has been initialised.

Click **Next**, then **Done**, then **Continue**, then **Save**.

### Step 4. Make the private key

In the left sidebar click **Keys**, then the blue **+**.

* **Key Name:** `Pelvi Sign In Key` — not "Web". **This one key serves the
  website and the iPhone app.** Name it as though it belongs to both, because it
  does.
* Tick **Sign in with Apple**, then click **Configure** next to it and choose
  **`com.PelvicFloor`** as the **Primary App ID**. **Save**.

Click **Continue**, then **Register**.

Now the page shows a **Key ID** — a ten character code like `A1B2C3D4E5`. Write
it down. Then click **Download**, which gives you a file named something like
`AuthKey_A1B2C3D4E5.p8`.

**You can only download this once.** Apple will never show it to you again. Put
it somewhere you will not lose it. It is a password: anybody holding it can sign
people into Pelvi. Do not email it to yourself and do not put it in this repo.

**Do not make a second key when the iOS release comes.** This Key, this Key ID
and your Team ID are what the app uses too. Making a fresh one is how you end up
with a `.p8` nobody can find, because the download only ever happens once.

### Step 5. Find your Team ID

Top right of the developer site, under your name, or Account → **Membership
details**. It is ten characters, like `9XY8Z7W6V5`. Write it down.

### What you should now have written down

| Thing | Looks like | From | Used by |
|---|---|---|---|
| Parent App ID | `com.PelvicFloor` | step 1 | both |
| Services ID | `com.PelvicFloor.web` | step 2 | the website |
| Key ID | `A1B2C3D4E5` | step 4 | **both** |
| The `.p8` file | `AuthKey_A1B2C3D4E5.p8` | step 4 | **both** |
| Team ID | `9XY8Z7W6V5` | step 5 | **both** |

Keep this list. Three of the five rows are the iOS release's setup as well, and
the `.p8` cannot be downloaded twice.

## At Firebase — console.firebase.google.com

Open the project **pelvic-floor-exercise-908ed**.

### Step 6. Turn Apple on

Left sidebar → **Build** → **Authentication** → the **Sign-in method** tab. You
will see Google and Email/Password already there.

Click **Add new provider** and choose **Apple**. Turn the **Enable** switch on.

* **Services ID:** paste `com.PelvicFloor.web` from step 2. This is the
  Services ID, **not** the bundle id — `com.PelvicFloor` on its own here is the
  most common way to get `invalid_client` in the Apple window.
* Open the section called **OAuth code flow configuration**. It is labelled as
  optional. **It is not optional for a website** — without it Apple sign-in
  works on iPhones and fails in browsers, which is the only place we use it.
  * **Apple team ID:** paste the Team ID from step 5.
  * **Key ID:** paste the Key ID from step 4.
  * **Private key:** open the `.p8` file in TextEdit and paste the whole
    contents, including the `-----BEGIN PRIVATE KEY-----` and
    `-----END PRIVATE KEY-----` lines. All of it.

Click **Save**.

### Step 7. Check the authorised domains, once

Same **Authentication** section, the **Settings** tab, then **Authorized
domains**. `pelvi.health` and `www.pelvi.health` must both be in the list. Add
either that is missing.

### Step 8. That is it

Open pelvi.health on your phone in a private tab and tap "Already have an
account? Log in". The Apple button will be there and it will work. No deploy.

---

# PART TWO: the sending domain

**Why this is still here now that nothing on the site emails a login link.**
Because the pipe is the same pipe. Password resets go down it. Anything you ever
send a member goes down it. And Apple's Hide My Email relay, which arrives with
Part One, **drops mail from unregistered senders silently** — see the section
below. Verifying pelvi.health is also the first of the three conditions for ever
offering an email door again; the other two are listed at the top of
`lib/identity.js`.

## What is wrong

Firebase sends its mail from
`noreply@pelvic-floor-exercise-908ed.firebaseapp.com`.

That is a Google-owned domain that has nothing to do with pelvi.health. Gmail,
Outlook and Yahoo all check whether the sending domain is allowed to send on
behalf of the brand in the message — SPF and DKIM — and here the answer is no.
The message says Pelvi, the envelope says a random firebaseapp.com subdomain,
and there is no signature tying the two together. So it goes to spam, or it is
dropped silently.

**Our code cannot see this.** `sendSignInLinkToEmail` returns success the
instant Google accepts the message for delivery. Whether it is ever put in front
of a human is invisible to us. That is exactly what happened to the member who
told you nothing arrived: our screen said "check your email", and it was telling
the truth as far as it could see.

The site's answer to that was first to warn about the spam folder, then to demote
the email field, and now to remove it. **No screen offers to email anybody a
login link.** That closes the hole for members — nobody is left waiting — but it
does not fix the pipe, and the pipe is what the rest of this part is about.

## The fix: send from pelvi.health

Firebase console → **Authentication** → the **Templates** tab.

You will see the email templates (Password reset, Email address verification,
and so on). Near the "from" address there is a link to **customise the domain**
— in some versions of the console it is a pencil icon on a template and then
**Customize domain**, in others it is a **Customize domain** button above the
templates. Either way it opens a short wizard.

The wizard asks for a domain — enter **pelvi.health** — and then shows you a
list of DNS records to add. Typically:

* a **TXT** record that proves you own the domain,
* one or two records for **DKIM**, which is the cryptographic signature that
  makes mail from us provably from us,
* an **MX** record, or an instruction to leave the existing one alone.

Add them in **Cloudflare** → the pelvi.health zone → **DNS** → **Records**.

Two Cloudflare specifics that will otherwise waste an hour:

* **Turn the orange cloud OFF** (set to "DNS only") for anything Firebase asks
  you to add. A proxied record does not answer the query Firebase makes.
* Do not delete any MX record you already have unless Firebase explicitly tells
  you to. That is how you stop receiving mail at hello@pelvi.health.

Then click **Verify** in the Firebase wizard. DNS can take a few minutes; it is
occasionally an hour. When it goes green, every login link, every password reset
and every verification email comes from **pelvi.health**, signed, and lands in
the inbox.

**How to prove it, now that no screen will send you one.** Use Firebase console
→ **Authentication** → **Users**, pick your own account, and use the row's menu
to send a password reset. Check the "from" address on what arrives, and check it
arrives in the **inbox** rather than the spam folder. Try it against a Gmail, a
Hotmail and an iCloud address if you have them — Gmail is the strict one.

That test, three times, green, is what condition 1 at the top of
`lib/identity.js` means. Do not put a login-link field back on the site before
it passes.

## One more, and it only matters once Apple is live

Sign in with Apple offers members a **Hide My Email** option. If she takes it,
we never see her real address — we get something like
`a1b2c3d4e5@privaterelay.appleid.com` instead.

That address is real: it is stable, it is hers for ever, and mail sent to it is
forwarded to her actual inbox. Our code treats it as a normal address
everywhere, and joining her records by it works exactly as it does for any other
address (see the note at the top of `lib/memberStore.js`).

**But Apple will only forward mail from domains you have registered.** An
unregistered sender is dropped, silently, and she never gets her receipt or her
password reset. This is the same failure mode as the login-link bug — mail that
is accepted, then quietly binned — arriving from a different direction, which is
why Part Two does not stop mattering just because the login link has gone.

So once Part Two is done, go back to developer.apple.com →
**Certificates, Identifiers & Profiles** → **Services** in the left sidebar →
**Sign in with Apple for Email Communication** → **Configure**, and register:

* the domain **pelvi.health**, and
* the specific sender addresses we use, at minimum `noreply@pelvi.health` and
  whatever address Stripe sends receipts from.

Apple verifies these with an SPF check, so do it after the DNS records in Part
Two have gone green, not before.

### What Hide My Email does and does not cost us

**It does not split the website from the app.** Because the Services ID's
Primary App ID is `com.PelvicFloor` — step 3 — Apple hands the *same* relay
address to pelvi.health and to the iPhone app. She is one Firebase account with
one plan and one history, whichever she opens.

**What it does cost us** is the join to a purchase made under a different
address. If a member bought on the App Store as `jane@gmail.com` and later signs
in with Apple and Hide My Email, those are two different addresses and nothing
can automatically connect them. She is not stranded — the member gate has "Find
my subscription", which asks her for an address and looks it up in Stripe — but
the join is manual. That is how the feature works for everyone who uses it, not
something we have got wrong.

---

# Quick reference: which console does what

| Job | Where |
|---|---|
| App ID `com.PelvicFloor`, "enable as primary" | Apple Developer → Certificates, Identifiers & Profiles → Identifiers |
| Services ID (the website's identity) | Apple Developer → Identifiers → Services IDs |
| Domain + return URL + Verify | Apple Developer → that Services ID → Sign In with Apple → Configure |
| The `.p8` private key and Key ID | Apple Developer → Keys |
| Team ID | Apple Developer → Account → Membership details |
| Turning Apple on, pasting all four values | Firebase → Authentication → Sign-in method → Apple |
| Authorised domains | Firebase → Authentication → Settings → Authorized domains |
| Sending from pelvi.health | Firebase → Authentication → Templates → Customize domain |
| DNS records for the above | Cloudflare → pelvi.health → DNS → Records |
| Letting Apple relay our mail | Apple Developer → Services → Sign in with Apple for Email Communication |

# If something goes wrong

**The Apple button disappeared after I tapped it.** That is the honest
degradation working: Firebase answered "provider not enabled". Finish Part One.
It comes back by itself.

**"invalid_client" in the Apple window.** One of three things. The Services ID
in Firebase does not match the one at Apple — it must be `com.PelvicFloor.web`,
the Services ID, not `com.PelvicFloor`, the bundle id. Or the return URL at
Apple is not exactly
`https://pelvic-floor-exercise-908ed.firebaseapp.com/__/auth/handler`. Or the
key you pasted belongs to a different Primary App ID. Compare all three
character by character.

**A member has her plan on the website but not in the app, or the other way
round.** Check the **Primary App ID** on the Services ID (step 3). If it is not
`com.PelvicFloor`, Apple is issuing her two different identifiers and two
different relay addresses, and the two will never join by themselves. Fixing the
field fixes it for everyone who signs in afterwards; anyone who already signed
in on the wrong setup has an account that has to be merged by hand.

**Apple sign-in works but she has no name.** Expected on any sign-in after the
first. Apple hands the name over on the very first authorisation and never
again; we capture it at that moment and store it. Nothing can recover it later
except the member removing Pelvi under Settings → her Apple Account → Sign in
with Apple, which resets the authorisation.

**"account exists with different credential".** She already has an account on
that email address, made with the other button. The screen tells her to use the
other one. This is Firebase's one-account-per-address setting and it is the
right setting: it stops one address becoming two accounts with two half
histories.
