"use client";

// "You're in." The first screen after money changes hands.
//
// Three jobs, in this order:
//   1. Tell her, truthfully, what happened to the payment. A card that needed
//      3-D Secure comes back here through Stripe's redirect, and the old flow
//      never noticed: it wrote nothing, so the member was bounced back into
//      onboarding on her next visit as though she had never paid.
//   2. Offer the app, on iPhone and iPad only, with a reason she can check
//      (reminders and the in-the-moment tools genuinely are app only).
//   3. Never block the web. "Continue on the web" is always here, for everyone,
//      whatever device she is on and whatever she does with the app card.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BellRing, Check, LoaderCircle, ShieldCheck } from "lucide-react";

import { appStoreURL, isIOSDevice } from "@/lib/appStore";
import { DEFAULT_PRICE_LABEL } from "@/lib/checkout";
import { isEntitled, markEntitlementActive, writeEntitlement } from "@/lib/entitlement";
import { trackWelcomeStatus } from "@/lib/analytics";

const COPY = {
  confirming: {
    title: "Checking your payment",
    body: "One moment. We are confirming this with your bank.",
  },
  paid: {
    title: "Your plan is ready.",
    body: "Payment confirmed. Your 90 days start today.",
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
  unknown: {
    title: "Your plan is ready.",
    body: "Pick up where you left off, or put it on your phone first.",
  },
};

export default function WelcomeClient() {
  const [status, setStatus] = useState("unknown");
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(isIOSDevice());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const params = new URLSearchParams(window.location.search);
    const clientSecret = params.get("payment_intent_client_secret");
    const redirectStatus = params.get("redirect_status");
    const restored = params.get("restored") === "1";
    const paidFlag = params.get("paid") === "1";

    // A payment intent client secret must not sit in the address bar: it ends
    // up in history, in the referrer and in session replay. Read it, then take
    // it out.
    if (clientSecret || redirectStatus) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (restored) {
      setStatus("restored");
      return undefined;
    }

    if (!clientSecret) {
      if (paidFlag || isEntitled()) setStatus("paid");
      else setStatus("unknown");
      return undefined;
    }

    let cancelled = false;
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
      } else {
        setStatus("processing");
      }
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

  const copy = COPY[status] || COPY.unknown;
  const showInstallCard = isIOS && status !== "failed";

  return (
    // The page picks up the brand blush from tablet width up. On a phone this
    // screen fills the viewport and a gradient there would be invisible; on
    // anything wider it is the difference between a designed page and a narrow
    // column stranded on a flat grey field.
    <div className="relative min-h-full w-full bg-app-background tab:bg-transparent">
      {/* The gradient is a fixed layer rather than this element's background
          because the root layout caps its column at 1152px for the member
          app's sake, and a page background that stopped dead at 1152 with grey
          either side would read as a seam. position: fixed is measured against
          the viewport, so it escapes the cap; it sits above the wrapper's own
          background and below the content, which is why the column below is
          `relative`. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 hidden bg-blush tab:block"
      />
      {/* The column itself never gets wider than 520px through the header.
          This is a receipt and a decision, and a longer measure makes both
          harder to read. What changes above 1024 is that the two cards below
          sit side by side instead of stacked. */}
      <div className="relative mx-auto flex w-full max-w-[520px] flex-col gap-6 px-5 pb-[calc(var(--sab)+40px)] pl-[max(1.25rem,var(--sal))] pr-[max(1.25rem,var(--sar))] pt-10 tab:max-w-[600px] tab:pt-16 lg:max-w-[64rem] lg:pt-20">
        <header className="mx-auto flex w-full max-w-[520px] flex-col items-center text-center">
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

          {status === "paid" && (
            <p className="mt-3 text-[14px] text-app-textSecondary">
              {DEFAULT_PRICE_LABEL} a month. Cancel anytime.
            </p>
          )}
        </header>

        {status === "failed" && (
          <Link
            href="/"
            className="mx-auto flex h-14 w-full max-w-[520px] items-center justify-center rounded-full bg-cta-gradient text-[17px] font-bold text-white shadow-lg transition-transform active:scale-[0.98]"
          >
            Try again
          </Link>
        )}

        {/* Two columns from 1024, and only when the install card exists to fill
            the second one. On a desktop she is almost never on iOS, so that
            card is absent and this stays the single 520px column it is on a
            phone rather than a lopsided half-empty grid. */}
        <div
          className={`mx-auto flex w-full flex-col gap-6 ${
            showInstallCard
              ? "lg:grid lg:max-w-none lg:grid-cols-2 lg:items-start lg:gap-8"
              : "max-w-[520px]"
          }`}
        >
        {showInstallCard && (
          <section
            aria-labelledby="install-card-title"
            className="w-full rounded-[24px] border border-app-borderIdle bg-app-surface p-6 shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
          >
            <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-app-primary/10 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-app-primary">
              <BellRing size={13} aria-hidden="true" />
              App only
            </span>

            <h2
              id="install-card-title"
              className="text-[22px] font-extrabold leading-snug tracking-[-0.3px] text-app-textPrimary"
            >
              You&apos;re in. Now get the app.
            </h2>

            <p className="mt-3 text-[15px] leading-relaxed text-app-textSecondary">
              Your daily reminders live in the app, and so do the in-the-moment
              tools: Urge Rescue when you need 60 seconds right now, and Audio
              Kegels with your eyes closed. Your plan, your day count and your
              streak all come with you.
            </p>

            <a
              href={appStoreURL("success")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-cta-gradient text-[17px] font-bold text-white shadow-[0_6px_16px_rgba(230,84,115,0.35)] transition-transform active:scale-[0.98]"
            >
              Get the Pelvi app
              <ArrowRight size={19} aria-hidden="true" />
            </a>

            <p className="mt-3 text-center text-[13px] leading-relaxed text-app-textSecondary">
              Sign in with the same email you just used and your program opens
              exactly where you left off.
            </p>
          </section>
        )}

        {/* The two blocks that are always here, kept together so they travel
            into the second column as one unit when the install card takes the
            first. */}
        <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          {/* /app, not /dashboard. /dashboard is the screen this rebuild
              replaced: it reads a localStorage blob nothing writes any more, so
              a member who had just paid landed on an empty stranger's account,
              and its billing box opened the Stripe portal for any address typed
              into it. This is the first link after money changes hands.

              A PLAIN <a>, NOT next/link, AND IT HAS TO STAY ONE.
              This is the only place in the product where somebody crosses from
              a page Microsoft Clarity records into one it must never record.
              next/link would make that a client-side route change: same
              document, same recorder, and the member app's DOM, her name, her
              email, her check-ins and her Coach Mia transcripts, committed
              inside a live recording before any guard could run. A plain anchor
              is a full page load, so /app arrives as a fresh document that the
              gate in app/Clarity.jsx simply never injects the tag into. The
              cost is one navigation that is a hair slower; the alternative is
              recording special category health data. */}
          <a
            href="/app"
            className={`flex h-14 w-full items-center justify-center gap-2 rounded-full text-[17px] font-bold transition-transform active:scale-[0.98] ${
              showInstallCard
                ? "border border-app-borderIdle bg-app-surface text-app-textPrimary"
                : "bg-cta-gradient text-white shadow-[0_6px_16px_rgba(230,84,115,0.35)]"
            }`}
          >
            Continue on the web
            <ArrowRight size={19} aria-hidden="true" />
          </a>
          <p className="text-center text-[13px] text-app-textSecondary">
            Everything works in your browser too. Nothing is locked behind the app.
          </p>
        </div>

        <div className="rounded-[20px] border border-app-borderIdle bg-app-surface p-5">
          <p className="flex items-start gap-2 text-[14px] leading-relaxed text-app-textSecondary">
            <ShieldCheck size={17} className="mt-[2px] shrink-0 text-app-primary" aria-hidden="true" />
            <span>
              Your 90-Day Goal Guarantee is live from today. Cancel in the first
              7 days for any reason and pay nothing. Questions, refunds or
              anything at all:{" "}
              <a
                href="mailto:hello@pelvi.health"
                className="font-semibold text-app-primary underline underline-offset-2"
              >
                hello@pelvi.health
              </a>
              .
            </span>
          </p>
        </div>
        </div>
        </div>
      </div>
    </div>
  );
}
