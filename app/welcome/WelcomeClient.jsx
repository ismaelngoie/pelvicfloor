"use client";

// The screen after payment.
//
// It has exactly one job now, and it is the job the iPhone app does at this
// moment: hand her the 90-day guarantee she just bought, with her name and her
// goal in it, and get out of the way. Everything that used to be here and was
// selling something has gone. She is a member. There is nothing left to sell
// her, and a benefit list on this screen is a benefit list aimed at somebody
// who already said yes.
//
// The one thing this file still has to be careful about is the truth of the
// payment itself. A card that needed 3-D Secure comes back here through
// Stripe's redirect, and the flow before the rebuild never noticed: it wrote
// nothing, so the member was bounced back into onboarding on her next visit as
// though she had never paid. The status machine below is that fix, and it is
// deliberately conservative about the word "failed".
//
// WHAT RENDERS WHAT:
//   paid        she just paid, here and now  -> the 90-day intro
//   restored    a lookup found her plan      -> a short welcome back
//   member      this browser already had a live entitlement, no fresh purchase
//                                            -> a short welcome back, NOT the
//                                               intro: someone on day 40 must
//                                               not be told her 90 days start
//                                               today
//   processing  the bank has not answered    -> honest holding screen
//   failed      definitely not paid          -> try again
//   confirming  we are asking Stripe         -> a spinner
//   unknown     no signal at all             -> a door, no claims

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Check, LoaderCircle, ShieldCheck, Smartphone,
} from "lucide-react";

import ProviderButtons from "@/components/auth/ProviderButtons";
import AppInstallSheet from "@/components/postpurchase/AppInstallSheet";
import ProgramIntro from "@/components/postpurchase/ProgramIntro";
import { canOfferApp } from "@/lib/appPrompt";
import { isValidEmail } from "@/lib/checkout";
import { isEntitled, markEntitlementActive, readEntitlement, writeEntitlement } from "@/lib/entitlement";
// No `sendLoginLink`. This page does not offer to email anything, and the
// payment path no longer falls back to a link either — see the note on
// signInFromPayment in lib/identity.js. `completeEmailLinkSignIn` and
// `looksLikeSignInLink` stay: a link that reached a real inbox while we were
// still sending them must still open her plan when she taps it.
import {
  clearPaidIntent, completeEmailLinkSignIn, looksLikeSignInLink, loginErrorMessage,
  readPaidIntent, signInFromPayment,
} from "@/lib/identity";
import { readPlan } from "@/lib/postPurchase";
import { trackPurchase, trackWelcomeStatus } from "@/lib/analytics";

const COPY = {
  confirming: {
    title: "Checking your payment",
    body: "One moment. We are confirming this with your bank.",
  },
  processing: {
    title: "Almost there.",
    body: "Your bank is still working on the payment. Your plan unlocks the moment it clears, and your receipt lands in your inbox.",
  },
  failed: {
    title: "That payment did not go through.",
    body: "Nothing was charged. Your plan is still waiting for you, so you can try again whenever you are ready.",
  },
  restored: {
    title: "Welcome back.",
    body: "We found your plan and turned it back on for this browser.",
  },
  member: {
    title: "Welcome back.",
    body: "Your plan is open on this browser. Pick up where you left off.",
  },
  unknown: {
    title: "Your plan is ready.",
    body: "Pick up where you left off.",
  },
};

export default function WelcomeClient() {
  const [status, setStatus] = useState("unknown");
  // Her goal and her first name, or nulls. See lib/postPurchase.js: nulls are a
  // supported answer and the intro has a real shape for them.
  const [plan, setPlan] = useState({ goalId: null, name: "", price: null });

  // The Stripe PaymentIntent id, pulled off the client secret this browser paid
  // with. It is the transaction_id for the Google Ads purchase conversion below:
  // the thing that lets Google dedupe a reload and match a refund. Null until we
  // have a real secret in hand, and it stays null on a reload (the secret is a
  // one-shot in sessionStorage, cleared once redeemed, and stripped out of the
  // 3-D Secure return URL), which is exactly why a reload cannot re-fire.
  const [paymentIntentId, setPaymentIntentId] = useState(null);

  /**
   * "Have we worked out yet which of these screens this is?"
   *
   * Not the same question as `status`, because "unknown" is itself a real
   * answer, and this is what tells the two apart before the first effect has
   * run. It exists to kill a flash on the one screen that must not have one.
   *
   * The site is a static export: /welcome.html is a single file served to every
   * arrival, so the build cannot know whether this visit carries ?paid=1. Which
   * screen this is gets decided on the client from the query string. Without
   * this flag the browser paints the prerendered light "Your plan is ready"
   * card first and then swaps it for the black 90-day screen a moment later,
   * and a light-to-black flip on the screen straight after payment is exactly
   * the tell that this is a web page and not an app.
   *
   * So nothing paints until the answer is in. It costs one frame on every
   * arrival and it is over before a phone has finished its own navigation
   * animation.
   */
  const [resolved, setResolved] = useState(false);

  // HOW THE SESSION IS GOING, which is a different question from how the
  // payment went, and it is kept separate on purpose: a card can clear while
  // the sign-in is still in flight, and telling her the payment failed because
  // a token did not mint would be a lie about her money.
  //
  // idle | working | in | needsEmail | failed
  //
  // Only the states that need something FROM HER ever render anything. The
  // whole point of the zero click path is that she never learns it happened.
  //
  // THERE IS NO "link" STATE ANY MORE. It meant "we have emailed you, go and
  // wait", and it was the single most damaging place in the product to say
  // that: she had been charged seconds earlier. The mail leaves from the
  // default firebaseapp.com sender and Gmail bins it, invisibly to us. That
  // branch now resolves to "failed", which puts Google and Apple in front of
  // her with the address she paid with named. `needsEmail` survives untouched —
  // it is REDEEMING a link she already has, not sending one.
  const [session, setSession] = useState("idle");
  const [sessionEmail, setSessionEmail] = useState("");
  const [sessionMessage, setSessionMessage] = useState(null);

  useEffect(() => {
    setPlan(readPlan() || { goalId: null, name: "", price: null });
  }, []);

  // Arriving from the link in her inbox. Finished here rather than on /app so
  // that one page owns every way a session can begin.
  useEffect(() => {
    if (!looksLikeSignInLink()) return undefined;
    let cancelled = false;
    // A link from her inbox carries no payment, so which screen this is was
    // never in doubt. Let it paint while the token is exchanged.
    setResolved(true);
    setSession("working");

    completeEmailLinkSignIn().catch(() => ({ done: false })).then((result) => {
      if (cancelled) return;
      if (result.done) {
        setSession("in");
        setStatus("member");
        return;
      }
      if (result.needsEmail) {
        setSession("needsEmail");
        return;
      }
      setSession("failed");
      setSessionMessage(loginErrorMessage(result.code));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  /** The link opened in a browser that does not remember which address it was for. */
  const confirmLinkEmail = useCallback(async (address) => {
    setSession("working");
    const result = await completeEmailLinkSignIn(address).catch(() => ({ done: false }));
    if (result.done) {
      setSession("in");
      setStatus("member");
      return;
    }
    setSession(result.needsEmail ? "needsEmail" : "failed");
    setSessionMessage(loginErrorMessage(result.code));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    // A sign-in link carries no payment. The effect above owns that arrival,
    // including releasing the first paint.
    if (looksLikeSignInLink()) return undefined;

    const params = new URLSearchParams(window.location.search);
    const redirectSecret = params.get("payment_intent_client_secret");
    // Two ways the same secret reaches this page. Stripe's own redirect puts it
    // in the query string after 3-D Secure; the inline card path confirms in a
    // sheet that is about to unmount and leaves it in sessionStorage on the way
    // past. Either way it is the thing that proves this browser paid, and it is
    // what her account is built from.
    const clientSecret = redirectSecret || readPaidIntent();
    // The PaymentIntent id is the client secret with its "_secret_..." tail cut
    // off (pi_ABC_secret_xyz -> pi_ABC). It is the id the conversion below is
    // keyed and deduped on. Set once, here, while we still hold the secret.
    if (clientSecret) {
      setPaymentIntentId(clientSecret.split("_secret_")[0] || null);
    }
    const redirectStatus = params.get("redirect_status");
    const restored = params.get("restored") === "1";
    const paidFlag = params.get("paid") === "1";

    // A payment intent client secret must not sit in the address bar: it ends
    // up in history, in the referrer and in session replay. Read it, then take
    // it out.
    if (redirectSecret || redirectStatus) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    // From here down every branch has decided which screen this is, so each one
    // releases the first paint. See the `resolved` declaration above.
    setResolved(true);

    if (restored && !clientSecret) {
      setStatus("restored");
      return undefined;
    }

    let cancelled = false;

    /**
     * SIGN HER IN FROM THE PAYMENT. This is the fix for the loop.
     *
     * She has just paid, so we already have her email address: Stripe is
     * holding it as the customer on this very payment. /api/session-from-payment
     * verifies the secret below against Stripe with our own key, reads the
     * address off the customer, and mints her a Firebase session. She is never
     * asked to pick a Google account, and there is no "I am new here" state for
     * her to fall back into.
     *
     * The address is NEVER taken from this browser. If that ever changes,
     * anybody could sign in as any member by typing her address.
     */
    const openTheDoor = async () => {
      setSession("working");
      // Nothing below this line may throw past here. It is fired and not
      // awaited, so a rejection would leave the page silently mid-sign-in with
      // no way for her to find out.
      const result = await signInFromPayment(clientSecret).catch(() => ({
        ok: false,
        code: "signin_failed",
      }));
      clearPaidIntent();

      // WHOSE PAYMENT THIS WAS, written onto the browser's own note.
      //
      // lib/memberEntitlement.js will only honour that note for the member it
      // names: it compares the address on it against the address on the record
      // that is signed in, because otherwise anyone who knew a member's email
      // could sell herself a pass by running the restore sheet against it. A
      // note with no address on it therefore matches nobody and does nothing.
      //
      // The inline card path writes the address at checkout, but the 3-D Secure
      // path never reaches that line: Stripe redirects the browser away and it
      // comes back to this page as a fresh document, so the only write was
      // markEntitlementActive() below, which has no address to give. That left
      // every member whose bank asked for a code with a dead note, and with it
      // the thirty minute grace that covers the gap between "card approved" and
      // Stripe reporting the subscription as active. She landed on the recovery
      // screen instead. This is the address, proved by the Worker against
      // Stripe, arriving at the one moment we have it.
      if (result.email) writeEntitlement({ email: result.email });

      if (cancelled) return;
      if (result.ok && result.mode === "instant") {
        setSession("in");
        return;
      }
      setSession("failed");
      setSessionEmail(result.email || "");
      setSessionMessage(loginErrorMessage(result.code));
    };

    // No redirect to interpret. Either she confirmed her card inline, in which
    // case the checkout sheet has already seen Stripe say yes and paid=1 IS that
    // answer, or she is simply on this page. Deliberately NOT routed through the
    // confirmation below: that would put a spinner in front of the one screen
    // she is meant to see the moment she pays, to re-answer a question that has
    // already been answered.
    //
    // The sign-in still runs, and it is the Worker that checks the payment.
    if (!redirectSecret) {
      // paid=1 is the inline-confirmation path and means "this just happened".
      // A cached entitlement with no such flag means she has been a member for
      // a while, which is a different screen.
      if (paidFlag) setStatus("paid");
      else if (isEntitled()) setStatus("member");
      else setStatus("unknown");
      if (clientSecret) openTheDoor();
      return () => {
        cancelled = true;
      };
    }

    setStatus("confirming");

    // Never tell someone her payment failed on a guess. Only the statuses that
    // definitely mean "not paid" write the door shut; anything we cannot read
    // is reported as still processing, and the live check the member app runs
    // when she opens it settles the question properly.
    const FAILED = new Set([
      "requires_payment_method",
      "requires_confirmation",
      "requires_action",
      "canceled",
      "failed",
    ]);

    const applyStatus = (intentStatus) => {
      if (cancelled) return;
      if (intentStatus === "succeeded") {
        markEntitlementActive({ source: "stripe", pending: false });
        setStatus("paid");
      } else if (intentStatus === "processing") {
        markEntitlementActive({ source: "stripe", pending: true });
        setStatus("processing");
      } else if (FAILED.has(intentStatus)) {
        writeEntitlement({ active: false, pending: false });
        setStatus("failed");
        // Nothing was paid, so there is no identity to build. This is the one
        // branch that does not try.
        return;
      } else {
        setStatus("processing");
      }
      // Everything else attempts the sign-in, including a status this browser
      // could not read. It costs one request, and the Worker is what decides:
      // it refuses any intent Stripe does not report as paid, so being
      // optimistic here can only ever be slow, never wrong.
      openTheDoor();
    };

    (async () => {
      const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!key) {
        applyStatus(redirectStatus);
        return;
      }
      try {
        const { loadStripe } = await import("@stripe/stripe-js");
        const stripe = await loadStripe(key);
        const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
        applyStatus(paymentIntent?.status || redirectStatus);
      } catch {
        // Stripe.js could not be reached. The redirect status Stripe put in the
        // URL is less authoritative but it is honest, and Stripe itself is the
        // real source of truth either way: the member app asks it on arrival.
        applyStatus(redirectStatus);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // How this page resolved, as a segmentable dimension. Note which arrivals
  // this can actually see: a card that went through 3-D Secure comes back here
  // with payment_intent_client_secret in the query string, and isTrackedPath
  // refuses to load Clarity on that document at all, because a pageview URL is
  // captured before the effect above can strip the secret out. So this covers
  // the inline confirmations and the restores, and the 3-D Secure sessions are
  // recorded up to the paywall and no further. That is the intended trade.
  useEffect(() => {
    trackWelcomeStatus(status);
  }, [status]);

  // THE GOOGLE ADS PURCHASE CONVERSION. Fired once, here, and nowhere else in
  // the product. The two conditions are the whole guarantee that it is real:
  //   status === "paid"   the page has resolved to a genuine, Stripe-confirmed
  //                       purchase (the 90-day intro). "processing", "restored",
  //                       "member", "failed" and "unknown" never reach this, so
  //                       a returning member, a recovery, or a page reloaded
  //                       without a fresh payment cannot fire it.
  //   paymentIntentId     a real Stripe id is in hand. A QA or preview visit
  //                       that lands on /welcome?paid=1 with no client secret
  //                       has no id, so it cannot fire either. This is what
  //                       keeps the conversion off the funnel's test paths.
  // Everything else (the once-only guard, the never-empty transaction_id, the
  // value fallback, the optional hashed email) lives in trackPurchase. It is
  // idempotent per PaymentIntent, so calling it again after a re-mount is safe.
  useEffect(() => {
    if (status !== "paid" || !paymentIntentId) return;
    // Prefer the amount Stripe actually charged, kept by rememberPrice at
    // checkout. price.amount is in cents; Google wants dollars. When it is not
    // known (a restore, storage off), trackPurchase falls back to the advertised
    // price in lib/pricing.js rather than sending a valueless conversion.
    const saved = readPlan();
    const value =
      saved?.price && Number.isFinite(saved.price.amount)
        ? saved.price.amount / 100
        : undefined;
    const currency = saved?.price?.currency || undefined;
    // Enhanced conversions only, and best effort: the address Stripe verified is
    // on the entitlement note by now on the inline path, and may not be yet on
    // the 3-D Secure path. Absent is fine; the value conversion is what matters.
    const email = readEntitlement()?.email || undefined;
    trackPurchase({ transactionId: paymentIntentId, value, currency, email });
  }, [status, paymentIntentId]);

  // The held frame. This is what welcome.html actually contains, and what a
  // browser paints for the instant between that file arriving and the effects
  // above reading the query string. Deliberately empty and deliberately black:
  // black is where the common case is going, so the overwhelmingly likely next
  // paint is a continuation rather than a flip. See `resolved` above.
  if (!resolved) {
    return (
      <div className="relative min-h-full w-full bg-black">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-black" />
        {/* The frame is empty for one paint, and empty forever for a browser
            with scripting off, which would otherwise be a black screen and no
            way out of it. noscript is the right tool precisely because it never
            renders for anybody else, so this door costs the flash nothing. */}
        <noscript>
          <div className="relative mx-auto flex w-full max-w-[520px] flex-col items-center gap-5 px-6 pt-20 text-center">
            <p className="text-[20px] font-bold text-white">Your plan is ready.</p>
            <a
              href="/app"
              className="flex h-14 w-full items-center justify-center rounded-full bg-cta-gradient text-[17px] font-bold text-white"
            >
              Open your plan
            </a>
            <p className="text-[13px] text-white/60">
              Anything at all: <a className="underline" href="mailto:hello@pelvi.health">hello@pelvi.health</a>
            </p>
          </div>
        </noscript>
      </div>
    );
  }

  return (
    <>
      {status === "paid" ? (
        // `sessionPending` is the one thing this screen has to know about the
        // sign-in: "Start Day 1" is pinned, above the fold and the only thing
        // to press, and /app is a full page load into a gate that asks who she
        // is. A member who taps it in the second before the token lands is
        // shown a sign-in screen, having paid thirty seconds earlier. See the
        // note on the button in ProgramIntro.
        <ProgramIntro
          goalId={plan.goalId}
          name={plan.name}
          price={plan.price}
          sessionPending={session === "working"}
        />
      ) : (
        <StatusScreen status={status} />
      )}
      {/* Renders nothing at all when the sign-in worked, which is the normal
          case and the whole point: she paid, she is in, and she never found out
          there was a question. */}
      <SessionNotice
        session={session}
        email={sessionEmail}
        message={sessionMessage}
        onConfirmEmail={confirmLinkEmail}
      />
    </>
  );
}

/**
 * The only part of the sign-in she ever sees, and only when the zero click path
 * was not available to her.
 *
 * A dialog rather than a banner, because in both of these states getting her
 * signed in IS the screen: "Open your plan" behind it would take her to a
 * member app she is not signed in to yet.
 *
 * TWO STATES, AND NEITHER OF THEM ASKS HER TO GO AND LOOK IN HER INBOX.
 *
 *   failed      the Worker could not mint her a session — usually because
 *               FIREBASE_SERVICE_ACCOUNT is not set — or the exchange broke.
 *               She has PAID. Google and Apple, right here, with the address
 *               Stripe gave us printed above them so she picks the same one.
 *   needsEmail  she has opened a sign-in link from her inbox in a browser that
 *               does not remember which address it was for, and Firebase will
 *               not spend the code until she names it. This is REDEMPTION, not
 *               a send, and it must keep working for every link that ever went
 *               out. See the header of lib/identity.js.
 *
 * The third state, "link", is gone. It said "we sent you an email" on the
 * screen immediately after a woman was charged, and the send resolves
 * successfully even when Gmail files the mail as spam, which it does. Nothing
 * on this page promises a message any more.
 */
function SessionNotice({ session, email, message, onConfirmEmail }) {
  const [address, setAddress] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [providerMessage, setProviderMessage] = useState(null);

  const needed = session === "needsEmail" || session === "failed";
  if (!needed || dismissed) return null;

  const openTheApp = () => {
    if (typeof window !== "undefined") window.location.assign("/app");
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 px-4 pb-[max(1rem,var(--sab))] backdrop-blur-sm sm:items-center sm:pb-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-notice-title"
        // THE HEIGHT CAP IS NOT DECORATION. The wrapper pins this dialog to the
        // BOTTOM of the viewport, so anything that does not fit is cut off the
        // TOP — where the heading is — and nothing on the page can scroll it
        // back into view. On a 320x568 phone the failed state is a heading, two
        // paragraphs, two provider buttons and two links. Capped and
        // scrollable, the worst case is a short scroll rather than a member who
        // cannot read what the dialog is asking her.
        className="max-h-[calc(100dvh-2rem)] w-full max-w-[420px] overflow-y-auto overscroll-contain rounded-[24px] bg-app-surface p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)]"
      >
        <span
          aria-hidden="true"
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-app-primary/12"
        >
          <ShieldCheck size={22} className="text-app-primary" />
        </span>

        <h2
          id="session-notice-title"
          className="text-[20px] font-extrabold leading-snug tracking-[-0.2px] text-app-textPrimary"
        >
          {session === "needsEmail" ? "Which email was that?" : "One tap and you are in"}
        </h2>

        <p className="mt-2 text-[15px] leading-relaxed text-app-textSecondary">
          {session === "needsEmail"
            ? "For your security we need the address that link was sent to before we can open it."
            : message || "We could not finish signing you in."}
        </p>

        {/* THE ADDRESS SHE PAID WITH, NAMED. Firebase is one account per email
            address: pressing Google with a different account does not error, it
            quietly makes a second empty account, and the only symptom she sees
            is the plan she has just bought apparently missing. Printed only
            when Stripe actually gave us one. */}
        {session === "failed" && email && (
          <p className="mt-3 rounded-[14px] bg-app-background px-4 py-3 text-[14px] leading-snug text-app-textSecondary">
            Use <span className="font-semibold text-app-textPrimary">{email}</span> — the address
            you paid with — and everything is attached to it straight away.
          </p>
        )}

        {session === "failed" && (
          <div className="mt-4">
            <ProviderButtons
              onError={(next) => setProviderMessage(next)}
              onSignedIn={openTheApp}
            />
            {providerMessage && (
              <p role="alert" className="mt-3 text-[13px] leading-snug text-app-textPrimary">
                {providerMessage}
              </p>
            )}
          </div>
        )}

        {session === "needsEmail" && (
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!isValidEmail(address)) return;
              onConfirmEmail(address.trim());
            }}
          >
            <label htmlFor="session-notice-email" className="sr-only">
              Your email address
            </label>
            <input
              id="session-notice-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck="false"
              data-clarity-mask="true"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="you@example.com"
              className="h-[52px] w-full rounded-[14px] border border-app-borderIdle bg-app-background px-4 text-[16px] text-app-textPrimary outline-none focus:border-app-primary"
            />
            <button
              type="submit"
              disabled={!isValidEmail(address)}
              className="flex h-[52px] w-full items-center justify-center rounded-full bg-cta-gradient text-[16px] font-bold text-white disabled:opacity-60"
            >
              Open my plan
            </button>
          </form>
        )}

        {/* A DOOR THAT DOES NOT DEPEND ON REMEMBERING THE ADDRESS. If she
            cannot recall which inbox that link went to, the providers on /app
            are the way in, and they are one tap rather than a guess. A plain
            anchor because /app is a different document and app/Clarity.jsx
            depends on that. */}
        {session === "needsEmail" && (
          <a
            href="/app"
            className="mt-3 flex h-11 w-full items-center justify-center text-[14px] font-semibold text-app-primaryInk underline underline-offset-4"
          >
            Continue with Google or Apple instead
          </a>
        )}

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="mt-3 flex h-11 w-full items-center justify-center text-[14px] font-medium text-app-textSecondary"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

/**
 * Everything that is not "she just paid". Short by design: it says what
 * happened, gives her the one door she needs, and stops.
 */
function StatusScreen({ status }) {
  const copy = COPY[status] || COPY.unknown;
  const paidMember = status === "restored" || status === "member";

  const [sheetOpen, setSheetOpen] = useState(false);
  const [offerApp, setOfferApp] = useState(false);

  // After mount, never during render. canOfferApp reads the user agent and
  // localStorage, and it is a user-agent check rather than a width one, so an
  // Android phone at 375px never renders an App Store link.
  useEffect(() => {
    setOfferApp(paidMember && canOfferApp());
  }, [paidMember]);

  return (
    <div className="relative min-h-full w-full bg-app-background tab:bg-transparent">
      {/* The gradient is a fixed layer rather than this element's background
          because the root layout caps its column at 1152px for the member
          app's sake, and a page background that stopped dead at 1152 with grey
          either side would read as a seam. position: fixed is measured against
          the viewport, so it escapes the cap. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 hidden bg-blush tab:block"
      />

      <div className="relative mx-auto flex w-full max-w-[520px] flex-col gap-6 px-5 pb-[calc(var(--sab)+40px)] pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] pt-12 tab:pt-20">
        <header className="flex flex-col items-center text-center">
          <span
            aria-hidden="true"
            className={`mb-5 flex h-14 w-14 items-center justify-center rounded-full ${
              status === "failed" ? "bg-app-borderIdle" : "bg-app-positive/15"
            }`}
          >
            {status === "confirming" ? (
              <LoaderCircle size={26} className="animate-spin text-app-primary" />
            ) : status === "failed" ? (
              <ShieldCheck size={26} className="text-app-textSecondary" />
            ) : (
              <Check size={28} strokeWidth={3} className="text-app-positive" />
            )}
          </span>

          <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.4px] text-app-textPrimary">
            {copy.title}
          </h1>
          <p className="mt-3 text-[16px] leading-relaxed text-app-textSecondary">{copy.body}</p>
        </header>

        {status === "failed" ? (
          <Link
            href="/"
            className="flex h-14 w-full items-center justify-center rounded-full bg-cta-gradient text-[17px] font-bold text-white shadow-lg transition-transform active:scale-[0.98]"
          >
            Try again
          </Link>
        ) : status === "confirming" ? null : (
          <div className="flex flex-col gap-2.5">
            {/* A PLAIN <a>, NOT next/link, AND IT HAS TO STAY ONE. This is the
                only place in the product where somebody crosses from a page
                Microsoft Clarity records into one it must never record.
                next/link would make that a client-side route change: same
                document, same recorder, and the member app's DOM, her name, her
                email, her check-ins and her Coach Mia transcripts, committed
                inside a live recording before any guard could run. A plain
                anchor is a full page load, so /app arrives as a fresh document
                that the gate in app/Clarity.jsx simply never injects the tag
                into. The same note is on the button in ProgramIntro; keep both. */}
            <a
              href="/app"
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-cta-gradient text-[17px] font-bold text-white shadow-[0_6px_16px_rgba(230,84,115,0.35)] transition-transform active:scale-[0.98]"
            >
              Open your plan
              <ArrowRight size={19} aria-hidden="true" />
            </a>

            {offerApp ? (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-app-textSecondary"
              >
                <Smartphone size={16} aria-hidden="true" />
                Download the app on iPhone
              </button>
            ) : null}
          </div>
        )}

        <p className="text-center text-[13px] leading-relaxed text-app-textSecondary">
          Anything at all:{" "}
          <a
            href="mailto:hello@pelvi.health"
            className="font-semibold text-app-primaryInk underline underline-offset-2"
          >
            hello@pelvi.health
          </a>
        </p>
      </div>

      <AppInstallSheet
        open={sheetOpen}
        surface="success"
        onClose={() => {
          setSheetOpen(false);
          setOfferApp(false);
        }}
      />
    </div>
  );
}
