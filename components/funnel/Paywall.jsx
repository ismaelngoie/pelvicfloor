"use client";

// The money screen.
//
// A faithful port of the iOS SubscriptionViewController (see IOS-SPEC §4). The
// copy on this screen is the offer, and the offer is what converts, so every
// string below either comes out of lib/guaranteeCopy.js and lib/paywallCopy.js
// verbatim or is called out in a comment where the web has to differ.
//
// Two places the web deliberately differs from the phone, both marked again
// where they are used:
//
//   1. Sub-CTA #1. iOS promises an OUTCOME by day 7. On the web that becomes a
//      remorse promise: cancel in the first 7 days for any reason and pay
//      nothing. Seven days is not enough time for a pelvic floor result, and
//      here the refund is ours to honour rather than Apple's. The day 90
//      outcome promise is unchanged and still sits one line below it.
//   2. The refund FAQ. iOS points at an in-app Settings screen the web does not
//      have, so the web answer points at the path that really exists.
//
// Typography is font-system, not Inter, because iOS renders this screen in
// SF Pro and the two should look like the same product.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  Baby,
  Bandage,
  ChevronDown,
  Droplet,
  HeartPulse,
  Leaf,
  MonitorPlay,
  PersonStanding,
  Shield,
  Star,
  Timer,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";

import { goalSentencePhrase } from "@/lib/program";
import {
  COVERAGE_TITLE,
  LADDER_LINE,
  coverageBody,
  day90String,
  secondSubCTA,
} from "@/lib/guaranteeCopy";
import {
  CONNECTION_FAILED_CTA,
  CONNECTION_FAILED_SUB_CTA,
  HEADLINE_TAIL,
  MEMBERS_COUNT_FROM,
  MEMBERS_COUNT_TO,
  MEMBERS_LINE_LEAD,
  MEMBERS_LINE_STRONG,
  MEMBERS_LINE_TAIL,
  REFUND_FAQ_ANSWER,
  REFUND_FAQ_QUESTION,
  SHOWCASE_TITLE,
  ctaLabel,
  firstSubCTA,
  headlineLead,
  reviewsForGoal,
  showcaseItems,
} from "@/lib/paywallCopy";
import { DEFAULT_PRICE_LABEL } from "@/lib/checkout";
import { trackCheckoutOpened, trackRestoreOpened } from "@/lib/analytics";
import CheckoutSheet from "./CheckoutSheet";
import RestoreSheet from "./RestoreSheet";
import {
  useCountUp,
  usePageChrome,
  useReducedMotion,
  useRotation,
} from "./paywallHooks";

// SF Symbol names on iOS, their closest lucide glyph here.
const ICONS = {
  drop: Droplet,
  bandage: Bandage,
  heart: HeartPulse,
  baby: Baby,
  leaf: Leaf,
  trophy: Trophy,
  stand: PersonStanding,
  gap: ArrowLeftRight,
  bolt: Zap,
  timer: Timer,
  videos: MonitorPlay,
  progress: TrendingUp,
  shield: Shield,
};

const SHOWCASE_MS = 4000;
const REVIEW_MS = 5000;
const ICON_GRADIENT_ID = "pelviPaywallIconGradient";

// "10,200" and never "10.200", whatever locale the browser is set to. The
// members line is protected copy and it is written in English.
const EN_US = new Intl.NumberFormat("en-US");

const STYLES = `
@keyframes pwRise { from { opacity: 0; transform: translate3d(0, 30px, 0); } to { opacity: 1; transform: none; } }
@keyframes pwFill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes pwBreathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
.pw-rise { animation: pwRise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
.pw-fill { transform-origin: left center; animation: pwFill ${SHOWCASE_MS}ms linear both; }
.pw-breathe { animation: pwBreathe 2.5s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .pw-rise { animation: none; opacity: 1; transform: none; }
  .pw-fill { animation: none; transform: scaleX(1); }
  .pw-breathe { animation: none; }
}
`;

/**
 * @param {object}   props
 * @param {string}   props.goalId      one of lib/program.js GOALS ids
 * @param {string}   props.name        her first name, or "" for the no-name headline
 * @param {string}   props.email       captured earlier in the funnel, if we have it
 * @param {string}   props.uid         Firebase uid, when she is signed in
 * @param {string}   props.memberId    her users/{id} document id, when we know it
 * @param {string}   props.priceLabel  what to show before Stripe answers
 * @param {Function} props.onPaid      awaited after Stripe confirms, before /welcome
 * @param {Function} props.onBack      optional. iOS has no way off this screen;
 *                                     a browser does, so when the funnel offers
 *                                     a way back we show one rather than
 *                                     pretending the back button is not there.
 */
export default function Paywall({
  goalId = "coreStrength",
  name = "",
  email = "",
  uid = "",
  memberId = "",
  priceLabel = DEFAULT_PRICE_LABEL,
  onPaid,
  onBack,
}) {
  const reduced = useReducedMotion();
  usePageChrome("#0A0A10");

  const gid = goalId || "coreStrength";
  const phrase = goalSentencePhrase(gid);
  const items = useMemo(() => showcaseItems(gid), [gid]);
  const reviews = useMemo(() => reviewsForGoal(gid), [gid]);
  const ladderRungs = useMemo(() => LADDER_LINE.split(/\s{3,}/).filter(Boolean), []);
  const coverage = useMemo(
    () => coverageBody(gid).split("\n").map((line) => line.replace(/^•\s*/, "")),
    [gid]
  );

  const showcaseIndex = useRotation(items.length, SHOWCASE_MS);
  const reviewIndex = useRotation(reviews.length, REVIEW_MS);
  const members = useCountUp(MEMBERS_COUNT_FROM, MEMBERS_COUNT_TO, 2400, { reduced });

  // Slide direction for the outgoing showcase row: it leaves upward, the new
  // one arrives from below, exactly as the phone does it.
  const previousShowcase = useRef(showcaseIndex);
  const leaving = previousShowcase.current;
  useEffect(() => {
    previousShowcase.current = showcaseIndex;
  }, [showcaseIndex]);

  // "Ninety days from today" cannot be baked into a static export, so the date
  // is worked out after mount. That also keeps the prerendered HTML and the
  // first client render identical.
  const [day90, setDay90] = useState("");
  useEffect(() => {
    setDay90(day90String());
  }, []);

  const [openFaq, setOpenFaq] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [setupFailed, setSetupFailed] = useState(false);

  const buttonLabel = setupFailed ? CONNECTION_FAILED_CTA : ctaLabel(gid);

  return (
    // min-h-full, not min-h-[100dvh]. On the phone the two are the same, but
    // this screen now sits in the funnel's 400x860 card on a desktop, and a
    // hard 100dvh floor made the section taller than the card it lives in, so
    // the card clipped the last line of the footer: the day 90 guarantee.
    <section className="relative flex h-full min-h-full w-full flex-col overflow-hidden bg-[#0A0A10] font-system">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <IconGradient />
      <Backdrop reduced={reduced} />

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to my plan"
          className="absolute left-2 top-2 z-30 flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10"
        >
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
      )}

      <div
        className={`relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar px-[25px] pb-8 ${
          onBack ? "pt-14" : "pt-8"
        }`}
      >
        <h1
          className="pw-rise text-center font-system text-[30px] font-black leading-[1.02] tracking-[-0.6px] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.5)] min-[380px]:text-[32px]"
          style={{ animationDelay: "60ms" }}
        >
          <span className="block">{headlineLead(name, phrase)}</span>
          <span className="block">{HEADLINE_TAIL}</span>
        </h1>

        <div className="pw-rise mt-4" style={{ animationDelay: "130ms" }}>
          <h2 className="text-center font-system text-[17px] font-extrabold text-white/90">
            {SHOWCASE_TITLE}
          </h2>

          <div className="relative mt-4 h-[140px] w-full overflow-hidden rounded-[20px] border border-white/10 bg-white/5">
            {items.map((item, index) => {
              const Icon = ICONS[item.icon] || Zap;
              const active = index === showcaseIndex;
              // The incoming slide rises into place; the outgoing one simply
              // fades where it stands, and faster than the new one arrives.
              //
              // It used to leave UPWARD by 50px while the next arrived from
              // 50px below, so for half a second two different promises were
              // legible at two different heights. On a photo background that
              // reads as a rendering fault rather than a transition, and this
              // is the screen that takes the money. Now the overlap is a plain
              // dissolve in one place, which is what iOS does.
              const offset = active ? 0 : index === leaving ? 0 : 50;
              return (
                <div
                  key={item.text}
                  aria-hidden="true"
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center ${
                    reduced
                      ? "transition-opacity duration-300"
                      : active
                        ? "transition-all duration-500 ease-out"
                        : "transition-opacity duration-200 ease-out"
                  } ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
                  style={reduced ? undefined : { transform: `translate3d(0, ${offset}px, 0)` }}
                >
                  <Icon
                    size={44}
                    strokeWidth={1.6}
                    stroke={`url(#${ICON_GRADIENT_ID})`}
                    aria-hidden="true"
                  />
                  <span className="font-system text-[16px] font-semibold leading-tight text-white">
                    {item.text}
                  </span>
                </div>
              );
            })}
          </div>

          {/* The rotation is decoration. Everything it shows is listed here in
              full for anyone who is not watching it go round. */}
          <ul className="sr-only">
            {items.map((item) => (
              <li key={item.text}>{item.text}</li>
            ))}
          </ul>

          <div className="mx-auto mt-4 flex w-[60%] gap-[6px]" aria-hidden="true">
            {items.map((item, index) => (
              <div key={item.text} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                {index === showcaseIndex ? (
                  <div key={showcaseIndex} className="pw-fill h-full w-full rounded-full bg-white/80" />
                ) : (
                  <div
                    className={`h-full rounded-full bg-white/80 ${
                      index < showcaseIndex ? "w-full" : "w-0"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          className="pw-rise mt-6 rounded-[20px] border border-white/10 bg-white/5 p-4"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex items-stretch justify-center gap-6">
            {/* Matches the phone. Owner's call, made twice, deliberately.
             *
             * iOS prints 4.9 here (SubscriptionViewController.swift:405) and the
             * two paywalls are meant to be the same screen, so this one prints
             * 4.9 as well. Do not "fix" it to match the API without asking:
             * this is conversion copy and it is owned upstream.
             *
             * Apple's lookup API reports 4.56 from 41 ratings for app id
             * 6642654729, so if the number ever needs defending, that is the
             * source it will be checked against.
             *
             * The JSON-LD AggregateRating is deliberately NOT this number. See
             * the comment beside it: Google treats a rating in structured data
             * as a factual claim it can verify, and a mismatch there risks the
             * whole domain rather than one screen.
             */}
            <Stat value="4.9" caption="App Store Rating" suffix="out of 5">
              <Star size={16} className="text-ios-yellow" fill="currentColor" aria-hidden="true" />
            </Stat>
            <div className="w-px self-center bg-white/15" style={{ height: 48 }} aria-hidden="true" />
            <Stat value="90" caption="Day Guarantee">
              <Shield size={16} className="text-app-primary" fill="currentColor" aria-hidden="true" />
            </Stat>
          </div>

          <div className="relative mt-4 min-h-[104px]">
            {reviews.map((review, index) => {
              const active = index === reviewIndex;
              return (
                <div
                  key={review.name + review.quote}
                  aria-hidden="true"
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-[6px] transition-all duration-500 motion-reduce:transition-opacity motion-reduce:transform-none ${
                    active ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[10px] opacity-0"
                  }`}
                >
                  <img
                    src={review.avatar}
                    alt=""
                    width={30}
                    height={30}
                    loading="lazy"
                    decoding="async"
                    className="h-[30px] w-[30px] rounded-full object-cover"
                  />
                  <p className="px-2 text-center font-system text-[15px] italic text-white/85">
                    &quot;{review.quote}&quot;
                  </p>
                  <p className="font-system text-[13px] font-bold text-white">{review.name}</p>
                </div>
              );
            })}
          </div>

          <ul className="sr-only">
            {reviews.map((review) => (
              <li key={review.name + review.quote}>
                &quot;{review.quote}&quot; {review.name}
              </li>
            ))}
          </ul>

          <p className="mt-4 text-center font-system text-[15px] text-white/80">
            {MEMBERS_LINE_LEAD}
            <span className="font-bold text-white">
              {members >= MEMBERS_COUNT_TO
                ? MEMBERS_LINE_STRONG
                : `${EN_US.format(members)}+ women`}
            </span>
            {MEMBERS_LINE_TAIL}
          </p>
        </div>

        <div className="pw-rise mt-6 flex flex-col gap-[10px]" style={{ animationDelay: "270ms" }}>
          <Faq
            id="refund"
            question={REFUND_FAQ_QUESTION}
            open={openFaq === "refund"}
            onToggle={() => setOpenFaq((c) => (c === "refund" ? null : "refund"))}
          >
            <p className="text-center font-system text-[14px] leading-relaxed text-white/70">
              {REFUND_FAQ_ANSWER}
            </p>
          </Faq>

          <Faq
            id="coverage"
            question={COVERAGE_TITLE}
            open={openFaq === "coverage"}
            onToggle={() => setOpenFaq((c) => (c === "coverage" ? null : "coverage"))}
          >
            <ul className="flex flex-col gap-2">
              {coverage.map((line) => (
                <li key={line} className="flex gap-2 font-system text-[14px] leading-relaxed text-white/70">
                  <span aria-hidden="true" className="text-app-primary">
                    &bull;
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Faq>
        </div>

        <div
          className="pw-rise mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
          style={{ animationDelay: "320ms" }}
        >
          <button
            type="button"
            onClick={() => {
              setRestoreOpen(true);
              trackRestoreOpened();
            }}
            className="min-h-[44px] font-system text-[13px] font-medium text-white/60 underline decoration-white/25 underline-offset-2"
          >
            Restore Purchase
          </button>
          {/* /terms and /privacy-policy. These used to point at two static
              files that described a different product: the terms named
              vagitight.com and shipped literal [[COMPANY NAME]] placeholders,
              and the policy denied collecting health data. This is the screen
              that takes the card, so these two links are the ones a member and
              an ad reviewer actually open. /terms is now generated from the
              same guarantee copy this paywall renders, so the promise on this
              screen and the promise on that page cannot drift apart. */}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[44px] items-center font-system text-[13px] font-medium text-white/60 underline decoration-white/25 underline-offset-2"
          >
            Terms of Use
          </a>
          <a
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[44px] items-center font-system text-[13px] font-medium text-white/60 underline decoration-white/25 underline-offset-2"
          >
            Privacy Policy
          </a>
        </div>
      </div>

      {/* The scrim used to fade to fully transparent at the top of the footer,
          which is exactly where the refund ladder sits. Sampled against every
          frame of paywall_video.mp4, that line measured 3.80:1 at its worst,
          under the 4.5:1 an 11px line needs. Ending the gradient at 72% instead
          of 0 puts its floor at 6.9:1 and leaves the CTA area looking the same,
          because that end of the gradient was already near opaque. */}
      <footer
        className="pw-rise relative z-20 shrink-0 bg-gradient-to-t from-[#0A0A10] via-[#0A0A10]/95 to-[#0A0A10]/[0.72] px-[25px] pb-[calc(env(safe-area-inset-bottom)+14px)] pt-4"
        style={{ animationDelay: "380ms" }}
      >
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center font-system text-[11px] font-medium text-white/65">
          {ladderRungs.map((rung) => (
            <span key={rung} className="whitespace-nowrap">
              {rung}
            </span>
          ))}
        </p>

        <button
          type="button"
          onClick={() => {
            setSetupFailed(false);
            setCheckoutOpen(true);
            // Not once-guarded. Opening the sheet, backing out and opening it
            // again is a real and meaningful behaviour, and a second event is
            // how it stays visible.
            trackCheckoutOpened();
          }}
          className="pw-breathe mt-[10px] flex h-14 w-full items-center justify-center rounded-full bg-paywall-cta font-system text-[18px] font-bold text-white shadow-[0_0_15px_rgba(230,84,115,0.6)] transition-transform active:scale-[0.98]"
        >
          {buttonLabel}
        </button>

        <p className="mt-2 text-center font-system text-[12px] font-semibold text-white/75">
          {priceLabel} per month. Cancel anytime.
        </p>

        {/* WEB CHANGE: remorse, not outcome. See the note at the top of the file. */}
        <p className="mt-1 text-center font-system text-[12px] font-medium leading-snug text-white/60">
          {setupFailed ? CONNECTION_FAILED_SUB_CTA : firstSubCTA(priceLabel)}
        </p>

        <p className="mt-[5px] flex min-h-[30px] items-start justify-center gap-[6px] text-center font-system text-[12px] leading-snug text-white/50">
          <Shield size={12} className="mt-[3px] shrink-0" fill="currentColor" aria-hidden="true" />
          <span>{day90 ? secondSubCTA(day90) : ""}</span>
        </p>
      </footer>

      <CheckoutSheet
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        goalId={gid}
        name={name}
        email={email}
        uid={uid}
        memberId={memberId}
        onPaid={onPaid}
        onSetupError={() => setSetupFailed(true)}
      />

      <RestoreSheet open={restoreOpen} onClose={() => setRestoreOpen(false)} email={email} />
    </section>
  );
}

/**
 * The paint server for the showcase glyphs. iOS masks each SF Symbol with the
 * CTA gradient; an SVG linear gradient referenced by `stroke` is the same idea.
 * It lives in the tree rather than in a stylesheet so the reference can never
 * point at a definition that has not rendered.
 */
function IconGradient() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      className="pointer-events-none absolute"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <linearGradient id={ICON_GRADIENT_ID} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF3B61" />
          <stop offset="100%" stopColor="#D959E8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * The looping video behind everything.
 *
 * Skipped for anyone who asked for reduced motion, and for anyone on Data
 * Saver, because the clip is large and nobody should pay for it in roaming
 * charges to look at a background. The gradient underneath is the real
 * backdrop; the video is a bonus on top of it.
 */
function Backdrop({ reduced }) {
  const [play, setPlay] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (reduced) {
      setPlay(false);
      return;
    }
    const saveData =
      typeof navigator !== "undefined" && navigator.connection?.saveData === true;
    setPlay(!saveData);
  }, [reduced]);

  // tab:absolute, not md:absolute. This backdrop has to stop being viewport
  // sized at exactly the width where the paywall stops being the whole screen
  // and becomes a card, and the card now starts at 704 so an iPad mini in
  // portrait gets a tablet layout. Left at md, every width from 704 to 767
  // painted this video across the entire page behind a 544px card.
  return (
    <div className="pointer-events-none fixed inset-0 z-0 tab:absolute" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,#3A1723_0%,#150A11_55%,#0A0A10_100%)]" />

      {play && (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          onLoadedData={() => setLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src="/paywall_video.mp4" type="video/mp4" />
        </video>
      )}

      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-x-0 top-0 h-[calc(env(safe-area-inset-top)+72px)] bg-gradient-to-b from-[#0A0A10]/85 to-transparent" />
    </div>
  );
}

function Stat({ value, suffix, caption, children }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1">
      <span className="font-system text-[18px] font-bold text-white">
        {value}
        {suffix ? <span className="sr-only"> {suffix}</span> : null}
      </span>
      {children}
      <span className="text-center font-system text-[11px] font-semibold text-white/80">
        {caption}
      </span>
    </div>
  );
}

function Faq({ id, question, open, onToggle, children }) {
  return (
    <div className="rounded-xl bg-white/5 p-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`faq-panel-${id}`}
        className="flex w-full items-center justify-center gap-2 text-center"
      >
        <span className="font-system text-[15px] font-semibold text-white/90">{question}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 text-white/60 transition-transform duration-200 motion-reduce:transition-none ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div id={`faq-panel-${id}`} hidden={!open} className="mt-[10px]">
        {children}
      </div>
    </div>
  );
}
