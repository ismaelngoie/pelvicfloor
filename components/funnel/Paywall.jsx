"use client";

// The money screen: a faithful port of the iOS 3.1.9 SubscriptionViewController.
// The looping video of the woman on the hill sits behind everything, then the
// question headline, the rotating benefit showcase, the 4.9 rating beside the
// 500+ video library, the rotating member review with the count-up, the
// expandable "how will this app..." list, and a pinned footer with the
// reviewer badge, the button (no price on it) and the 2025 line under it:
// her seven-day outcome, then the price and the one-tap refund.
//
// Where the web has to differ it is marked WEB CHANGE:
//   1. The price comes from lib/pricing.js instead of StoreKit.
//   2. "Restore Purchase" opens the log-in sheet: there is no App Store here.
//   3. Closing the checkout without paying opens Dr Reed's recovery sheet,
//      which is what the phone does when the Apple sheet is dismissed.
//
// No back button, like the phone. The browser's own Back still returns to
// the reveal (app/HomeClient.jsx) so a swipe does not throw her off the site.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Info } from "lucide-react";
import { DR_REED, PAYWALL } from "./revealCopy";
import { VIDEO_PAYWALL, ctaSubtext, ctaTitle, headlineParts, planValue, reviewsFor, showcaseFeatures } from "./videoPaywallCopy";
import { trackCheckoutOpened, trackRestoreOpened } from "@/lib/analytics";
import SFIcon from "./icons";
import { Button, Face } from "./atelier";
import CheckoutSheet from "./CheckoutSheet";
import LoginSheet from "./LoginSheet";
import { useCountUp, usePageChrome, useReducedMotion, useRotation } from "./paywallHooks";

const CredentialsSheet = dynamic(() => import("./ReedSheets").then((m) => m.CredentialsSheet), { ssr: false });
const RecoverySheet = dynamic(() => import("./ReedSheets").then((m) => m.RecoverySheet), { ssr: false });

const INK = "#141218";

// eslint-disable-next-line no-unused-vars
export default function Paywall({ profile, onPaid, onBack }) {
  usePageChrome(INK);
  const reduced = useReducedMotion();
  const pathway = profile?.pathway || "womensPelvicHealth";
  const goalId = profile?.goalId || "coreStrength";
  const name = (profile?.name || "").trim().split(" ")[0];
  // Her focus only changes the words when it is the web-only "Tighten Vaginal
  // Canal" option; every other focus leaves the phone's goal copy alone.
  const focusId = profile?.focusId || null;

  const headline = useMemo(() => headlineParts(name, goalId, pathway, focusId), [name, goalId, pathway, focusId]);
  const features = useMemo(() => showcaseFeatures(goalId, pathway, focusId), [goalId, pathway, focusId]);
  const reviews = useMemo(() => reviewsFor(goalId, pathway, focusId), [goalId, pathway, focusId]);
  const plan = useMemo(() => planValue(goalId, pathway, focusId), [goalId, pathway, focusId]);
  const cta = ctaTitle(goalId, pathway, focusId);
  const subtext = useMemo(() => ctaSubtext(goalId, pathway, profile?.situationId, focusId), [goalId, pathway, profile?.situationId, focusId]);

  const featureIndex = useRotation(features.length, VIDEO_PAYWALL.showcaseMs, !reduced);
  const reviewIndex = useRotation(reviews.length, VIDEO_PAYWALL.reviewMs, !reduced);
  const memberCount = useCountUp(0, VIDEO_PAYWALL.members.count, 1600, { reduced });
  const feature = features[featureIndex] || features[0];
  const review = reviews[reviewIndex] || reviews[0];

  // Phones and the in-app browser pause a background clip when the tab hides
  // or a sheet opens; nudge it back so the paywall never sits on a frozen frame.
  const videoRef = useRef(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v || reduced) return undefined;
    const play = () => {
      if (document.hidden) return;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    play();
    document.addEventListener("visibilitychange", play);
    v.addEventListener("pause", play);
    return () => {
      document.removeEventListener("visibilitychange", play);
      v.removeEventListener("pause", play);
    };
  }, [reduced]);

  const [planOpen, setPlanOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [setupFailed, setSetupFailed] = useState(false);
  const paidRef = useRef(false);

  const openCheckout = useCallback(() => {
    setRecoveryOpen(false);
    setSetupFailed(false);
    setCheckoutOpen(true);
    trackCheckoutOpened();
  }, []);

  // Only a checkout she actually opened and then left brings Dr Reed back.
  // The checkout sheet stays mounted while closed, so its close path must not
  // be able to raise the recovery sheet from a stray Escape or focus change.
  const checkoutOpenRef = useRef(false);
  checkoutOpenRef.current = checkoutOpen;
  const closeCheckout = useCallback(() => {
    if (!checkoutOpenRef.current) return;
    setCheckoutOpen(false);
    if (!paidRef.current) setRecoveryOpen(true);
  }, []);

  const handlePaid = useCallback(
    async (...args) => {
      paidRef.current = true;
      return onPaid?.(...args);
    },
    [onPaid]
  );

  return (
    <section className="relative flex h-full min-h-full w-full flex-col overflow-hidden font-figtree text-white" style={{ backgroundColor: INK }}>
      {/* The looping clip behind everything, muted and inline so phones autoplay it. */}
      <video
        ref={videoRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        src={VIDEO_PAYWALL.video}
        poster={VIDEO_PAYWALL.poster}
        autoPlay={!reduced}
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        tabIndex={-1}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(20,18,24,0.62) 0%, rgba(20,18,24,0.40) 42%, rgba(20,18,24,0.58) 72%, rgba(20,18,24,0.92) 100%)" }}
      />

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar px-5 pb-5 pt-[max(env(safe-area-inset-top),44px)]">
        <h1 className="funnel-rise text-center font-serif text-[36px] leading-[1.04] text-white" style={{ animationDelay: "40ms" }}>
          {headline.lead} <em className="italic">{headline.phrase}</em>
          {headline.tail}
        </h1>

        <p className="funnel-rise mt-7 text-center font-mono text-[12.5px] uppercase tracking-[0.2em] text-white/90" style={{ animationDelay: "110ms" }}>
          {VIDEO_PAYWALL.eyebrow}
        </p>

        {/* The rotating benefit showcase: one promise at a time, four seconds each. */}
        <div
          className="funnel-rise mt-3 flex min-h-[150px] flex-col items-center justify-center rounded-[24px] border border-white/15 bg-white/[0.06] px-5 py-7 text-center"
          style={{ animationDelay: "180ms" }}
          aria-live="polite"
        >
          <span key={`i${featureIndex}`} className="funnel-rise text-atelier-rose">
            <SFIcon name={feature.icon} size={38} strokeWidth={1.7} />
          </span>
          <p key={`t${featureIndex}`} className="funnel-rise mt-4 font-serif text-[23px] leading-tight text-white">
            {feature.text}
          </p>
        </div>
        <ol className="mt-4 flex items-center justify-center gap-2" aria-hidden="true">
          {features.map((f, i) => (
            <li
              key={f.text}
              className={`h-[3px] rounded-full transition-all duration-300 ${i === featureIndex ? "w-6 bg-white" : "w-5 bg-white/30"}`}
            />
          ))}
        </ol>

        {/* 4.9 beside the 500+ library, then the rotating member review. */}
        <div className="funnel-rise mt-5 rounded-[24px] border border-white/15 bg-white/[0.06] px-4 pb-5 pt-4" style={{ animationDelay: "250ms" }}>
          <div className="grid grid-cols-2 divide-x divide-white/20">
            <div className="flex flex-col items-center gap-1 px-2 text-center">
              <span className="font-serif text-[26px] leading-none text-white">{VIDEO_PAYWALL.rating.number}</span>
              <SFIcon name="star.fill" size={22} className="mt-1" style={{ color: "#E2A33B", fill: "#E2A33B" }} />
              <span className="mt-1 text-[11px] font-semibold text-white/80">{VIDEO_PAYWALL.rating.caption}</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-2 text-center">
              <span className="font-serif text-[26px] leading-none text-white">{VIDEO_PAYWALL.library.number}</span>
              <SFIcon name="play.rectangle.on.rectangle.fill" size={22} className="mt-1 text-atelier-rose" />
              <span className="mt-1 text-[11px] font-semibold text-white/80">{VIDEO_PAYWALL.library.caption}</span>
            </div>
          </div>

          <div key={`r${reviewIndex}`} className="funnel-rise mt-5 flex flex-col items-center text-center" aria-label={`Review from ${review.name}: ${review.text}`}>
            <Face src={review.image} name={review.name} size={56} className="ring-2 ring-white/70" />
            <p className="mt-3 font-serif text-[18px] italic leading-snug text-white/90">&quot;{review.text}&quot;</p>
            <p className="mt-1.5 text-[13px] font-bold text-white">{review.name}</p>
          </div>

          <p className="mt-4 text-center text-[17px] text-white/95" aria-label={`${VIDEO_PAYWALL.members.lead}${VIDEO_PAYWALL.members.strong}${VIDEO_PAYWALL.members.tail}`}>
            {VIDEO_PAYWALL.members.lead}
            <span className="font-bold">{memberCount >= VIDEO_PAYWALL.members.count ? VIDEO_PAYWALL.members.strong : `${memberCount.toLocaleString("en-US")} members`}</span>
            {VIDEO_PAYWALL.members.tail}
          </p>
        </div>

        {/* "How will this app stop your bladder leaks?" expands to the plan list. */}
        <div className="funnel-rise mt-5 rounded-[24px] border border-white/15 bg-white/[0.06]" style={{ animationDelay: "320ms" }}>
          <button
            type="button"
            onClick={() => setPlanOpen((v) => !v)}
            aria-expanded={planOpen}
            className="flex w-full items-center gap-3 px-4 py-4 text-left"
          >
            <span className="min-w-0 flex-1 truncate font-serif text-[19px] italic text-white">{plan.title}</span>
            <span className={`shrink-0 text-white/65 transition-transform duration-300 ${planOpen ? "rotate-180" : ""}`}>
              <SFIcon name="chevron.down" size={18} />
            </span>
          </button>
          {planOpen ? (
            <ul className="space-y-3 px-4 pb-4">
              {plan.features.map((f) => (
                <li key={f.title} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-atelier-rose/25 text-atelier-rose">
                    <SFIcon name={f.icon} size={18} />
                  </span>
                  <span className="text-[15px] leading-snug text-white">{f.title}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <footer className="relative z-20 shrink-0 px-5 pb-[max(env(safe-area-inset-bottom),10px)] pt-2" style={{ background: "linear-gradient(180deg, rgba(20,18,24,0) 0%, rgba(20,18,24,0.85) 30%, rgba(20,18,24,0.95) 100%)" }}>
        <button
          type="button"
          onClick={() => setCredentialsOpen(true)}
          className="mx-auto flex w-full max-w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 py-1.5 pl-1.5 pr-3 text-left backdrop-blur-sm"
          aria-label="Clinically reviewed by Doctor Evelyn Reed, physical therapist. Shows her credentials."
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DR_REED.headshot} alt="" width={30} height={30} className="h-[30px] w-[30px] rounded-full object-cover object-top" />
          <span className="min-w-0 text-[12px] font-semibold leading-tight text-white">{VIDEO_PAYWALL.reviewedLine}</span>
          <Info aria-hidden="true" size={15} className="shrink-0 text-white/80" />
        </button>

        <div className="mt-3">
          <Button onClick={openCheckout} variant="rose" breathe id="paywall.purchase">
            {setupFailed ? "Try Again" : cta}
          </Button>
        </div>
        <p className="mt-2 text-center text-[12px] font-medium leading-snug text-white/65">
          {setupFailed ? "The plan is temporarily unavailable. Please try again." : subtext}
        </p>
        <p className="mt-1 flex flex-wrap items-center justify-center gap-x-3 text-[11px] font-medium text-white/50">
          <button
            type="button"
            onClick={() => {
              setLoginOpen(true);
              trackRestoreOpened();
            }}
            className="-my-2 inline-flex min-h-[36px] items-center whitespace-nowrap px-1"
          >
            {PAYWALL.legal.restore}
          </button>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="-my-2 inline-flex min-h-[36px] items-center whitespace-nowrap px-1">
            {PAYWALL.legal.terms}
          </a>
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="-my-2 inline-flex min-h-[36px] items-center whitespace-nowrap px-1">
            {PAYWALL.legal.privacy}
          </a>
        </p>
      </footer>

      <CheckoutSheet
        open={checkoutOpen}
        onClose={closeCheckout}
        goalId={goalId}
        name={name}
        onPaid={handlePaid}
        onSetupError={() => setSetupFailed(true)}
      />
      <LoginSheet open={loginOpen} onClose={() => setLoginOpen(false)} />
      {credentialsOpen ? <CredentialsSheet open onClose={() => setCredentialsOpen(false)} /> : null}
      {recoveryOpen ? <RecoverySheet open onClose={() => setRecoveryOpen(false)} onContinue={openCheckout} /> : null}
    </section>
  );
}
