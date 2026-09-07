"use client";

// The money screen: a faithful port of the iOS 3.1.8 SubscriptionViewController
// on atelier paper. Headline, the "why your plan is different" card, the Day 1
// exercise card, the DAY 1 / 3 / 7 strip, the reviewer row, the member quote
// with her face, the guarantee pill, and the priced button.
//
// Where the web has to differ it is marked WEB CHANGE:
//   1. The price and period on the button come from lib/pricing.js. The
//      renewal term is stated on the checkout sheet itself.
//   2. "Restore" opens the log-in sheet: there is no App Store to ask here.
//   3. Closing the checkout without paying opens Dr Reed's recovery sheet,
//      which is what the phone does when the Apple sheet is dismissed.
//
// No back button, like the phone. The browser's own Back still returns to
// the reveal (app/HomeClient.jsx) so a swipe does not throw her off the site.

import React, { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { BadgeCheck, Info, Play } from "lucide-react";
import { frequencyData, goalData, memberPortrait, situationData, triedData } from "./appCopy";
import {
  DR_REED, PAYWALL, dayOneTitle, paywallBaseCopy, paywallHeadline, paywallImage, paywallStrategySymbol, pricedCta,
  tailoredContext,
} from "./revealCopy";
import { trackCheckoutOpened, trackRestoreOpened } from "@/lib/analytics";
import SFIcon from "./icons";
import { Button, Face } from "./atelier";
import CheckoutSheet from "./CheckoutSheet";
import LoginSheet from "./LoginSheet";
import { usePageChrome } from "./paywallHooks";

const CredentialsSheet = dynamic(() => import("./ReedSheets").then((m) => m.CredentialsSheet), { ssr: false });
const RecoverySheet = dynamic(() => import("./ReedSheets").then((m) => m.RecoverySheet), { ssr: false });
const DayOneSheet = dynamic(() => import("./ReedSheets").then((m) => m.DayOneSheet), { ssr: false });

// eslint-disable-next-line no-unused-vars
export default function Paywall({ profile, onPaid, onBack }) {
  usePageChrome("#F6F1EA");
  const pathway = profile?.pathway || "womensPelvicHealth";
  const goalId = profile?.goalId || "coreStrength";
  const goal = goalData(pathway, goalId) || goalData("womensPelvicHealth", "coreStrength");
  const base = useMemo(() => paywallBaseCopy(goalId, pathway), [goalId, pathway]);
  const situation = situationData(pathway, goalId, profile?.situationId);
  const frequency = frequencyData(pathway, goalId, profile?.frequencyId);
  const tried = triedData(pathway, goalId, profile?.triedId);
  const name = (profile?.name || "").trim().split(" ")[0];
  const context = tailoredContext({ situation, frequency, tried }) || base.context;
  const sessionTitle = dayOneTitle(goalId, profile?.situationId, base.dayOneTitle);
  const image = paywallImage(goalId, pathway, base.imageName);
  const cta = pricedCta(base.ctaTitle);
  const portrait = memberPortrait(base.reviewerName);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [dayOneOpen, setDayOneOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [setupFailed, setSetupFailed] = useState(false);
  const paidRef = useRef(false);

  const openCheckout = useCallback(() => {
    setDayOneOpen(false);
    setRecoveryOpen(false);
    setSetupFailed(false);
    setCheckoutOpen(true);
    trackCheckoutOpened();
  }, []);

  const closeCheckout = useCallback(() => {
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
    <section className="relative flex h-full min-h-full w-full flex-col overflow-hidden bg-atelier-paper font-figtree text-atelier-ink">
      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar px-5 pb-4 pt-[max(env(safe-area-inset-top),14px)]">
        <h1 className="funnel-rise mt-2 font-serif text-[30px] leading-[1.06] text-atelier-ink" style={{ animationDelay: "40ms" }}>
          {paywallHeadline(name, base.outcome)}
        </h1>
        <p className="funnel-rise mt-2 text-[14.5px] leading-snug text-atelier-ink2" style={{ animationDelay: "110ms" }}>
          {context}
        </p>

        <div className="funnel-rise mt-4 flex items-start gap-3 rounded-[20px] border border-atelier-line bg-atelier-card p-4" style={{ animationDelay: "180ms" }}>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-atelier-rose">{PAYWALL.differenceEyebrow}</p>
            <p className="mt-1 text-[17px] font-bold leading-snug text-atelier-ink">{base.strategyTitle}</p>
            <p className="mt-1 text-[13.5px] leading-snug text-atelier-ink2">{base.strategyBody}</p>
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-atelier-rose/[0.12] text-atelier-rose">
            <SFIcon name={paywallStrategySymbol(goalId, goal?.symbol)} size={26} strokeWidth={1.6} />
          </span>
        </div>

        <button
          type="button"
          onClick={() => setDayOneOpen(true)}
          className="funnel-rise relative mt-3 block h-[150px] w-full overflow-hidden rounded-[20px] bg-atelier-ink text-left"
          style={{ animationDelay: "250ms" }}
          aria-label={`${PAYWALL.exerciseEyebrow}. ${sessionTitle}. ${PAYWALL.exerciseSubtitle}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
          <span aria-hidden="true" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-atelier-ink">
            <Play size={18} fill="currentColor" />
          </span>
          <span className="absolute inset-x-4 bottom-3.5">
            <span className="block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/80">{PAYWALL.exerciseEyebrow}</span>
            <span className="mt-0.5 block font-serif text-[22px] leading-tight text-white">{sessionTitle}</span>
            <span className="mt-0.5 block text-[12.5px] text-white/80">{PAYWALL.exerciseSubtitle}</span>
          </span>
        </button>

        <ol className="funnel-rise mt-3 grid grid-cols-3 gap-2" style={{ animationDelay: "310ms" }} aria-label={base.milestones.map(([e, r]) => `${e}, ${r}`).join(". ")}>
          {base.milestones.map(([eyebrow, result], i) => (
            <li key={eyebrow} className="rounded-[16px] border border-atelier-line bg-atelier-card px-2.5 py-3 text-center">
              <span aria-hidden="true" className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-atelier-rose text-[11px] font-bold text-white">{i + 1}</span>
              <span className="mt-1.5 block text-[10.5px] font-bold tracking-[0.12em] text-atelier-rose">{eyebrow}</span>
              <span className="mt-0.5 block text-[12.5px] font-semibold leading-tight text-atelier-ink">{result}</span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => setCredentialsOpen(true)}
          className="funnel-rise mt-3 flex w-full items-center gap-3 rounded-full border border-atelier-line bg-atelier-card py-1.5 pl-1.5 pr-3 text-left"
          style={{ animationDelay: "360ms" }}
          aria-label="Plan reviewed by Doctor Evelyn Reed, physical therapist. Shows her credentials."
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={DR_REED.headshot} alt="" width={34} height={34} className="h-[34px] w-[34px] rounded-full object-cover object-top" />
          <span className="flex-1 truncate text-[13px] text-atelier-ink2">
            Plan reviewed by <span className="font-semibold text-atelier-ink">{DR_REED.planReviewedStrong}</span>
          </span>
          <Info aria-hidden="true" size={16} className="shrink-0 text-atelier-rose" />
        </button>

        <div className="funnel-rise mt-3 flex items-start gap-3 rounded-[20px] border border-atelier-line bg-atelier-card p-4" style={{ animationDelay: "410ms" }}>
          <Face src={portrait} name={base.reviewerName} size={44} />
          <div className="min-w-0 flex-1">
            <p className="whitespace-pre-line font-serif text-[18px] italic leading-snug text-atelier-ink">“{base.quote}”</p>
            <p className="mt-1.5 text-[12.5px] font-semibold text-atelier-ink2">{base.reviewerName}</p>
            <p className="text-[12px] tracking-[0.1em] text-atelier-rose" aria-label="Five stars">{PAYWALL.stars}</p>
          </div>
        </div>

        <p className="funnel-rise mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full bg-atelier-rose/[0.12] px-3.5 py-1.5 text-[12.5px] font-semibold text-atelier-rosewood" style={{ animationDelay: "460ms" }}>
          <BadgeCheck aria-hidden="true" size={15} /> {PAYWALL.guarantee}
        </p>
      </div>

      <footer className="relative z-20 shrink-0 bg-atelier-paper px-5 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
        <Button onClick={openCheckout} variant="roseBright" breathe id="paywall.purchase">
          {setupFailed ? "Try Again" : cta}
        </Button>
        <p className="mt-2 text-center text-[13px] font-semibold text-atelier-ink2">
          {setupFailed ? "The plan is temporarily unavailable. Please try again." : PAYWALL.subtext}
        </p>
        <p className="mt-1.5 flex items-center justify-center gap-4 text-[12px] font-medium text-atelier-ink3">
          <button
            type="button"
            onClick={() => {
              setLoginOpen(true);
              trackRestoreOpened();
            }}
            className="-my-2 inline-flex min-h-[40px] items-center px-1"
          >
            {PAYWALL.legal.restore}
          </button>
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="-my-2 inline-flex min-h-[40px] items-center px-1">
            {PAYWALL.legal.privacy}
          </a>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="-my-2 inline-flex min-h-[40px] items-center px-1">
            {PAYWALL.legal.terms}
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
      {dayOneOpen ? (
        <DayOneSheet open sessionTitle={sessionTitle} ctaTitle={cta} image={image} onStart={openCheckout} onClose={() => setDayOneOpen(false)} />
      ) : null}
      {recoveryOpen ? <RecoverySheet open onClose={() => setRecoveryOpen(false)} onContinue={openCheckout} /> : null}
    </section>
  );
}
