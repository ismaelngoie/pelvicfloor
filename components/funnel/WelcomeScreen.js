"use client";

// Screen 1. This is where the ad traffic lands, so it does one job: make the
// next tap obvious and make the promise above it credible.
//
// The layout is the fix for two real bugs. The old welcome screen was the only
// one in the funnel whose footer was missing `shrink-0`, so on a short viewport
// the testimonial ticker was squeezed up into the benefit list and the two
// painted on top of each other. And the butterflies were drawn over the social
// proof line. Here the hero scrolls, the footer cannot move, and the footer
// sits above the flock exactly as it does on the phone.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Shield } from "lucide-react";
import {
  MEMBER_COUNT_DURATION_MS, MEMBER_COUNT_FROM, MEMBER_COUNT_TO, TESTIMONIALS,
  WELCOME_BENEFITS, WELCOME_CTA, WELCOME_HEADLINE_A11Y, WELCOME_HEADLINE_LINES,
  WELCOME_SUBHEADLINE, memberCountLine,
} from "./copy";
import { BADGE_TITLE } from "@/lib/guaranteeCopy";
import SFIcon from "./icons";
import {
  PrimaryButton, useIsomorphicLayoutEffect, useMounted, useReducedMotion,
} from "./ui";

const TICKER_INTERVAL_MS = 3000;
const TICKER_OUT_MS = 220;
const TICKER_IN_MS = 260;
const HEADLINE_BASE_PX = 32;
const HEADLINE_MIN_SCALE = 0.45;

/**
 * The headline, at the largest size that still fits on two lines.
 *
 * "From Your Core Outward." is 395px wide at 32px, and the content column is
 * 311px on a 375px phone, so the second line wraps to three and the shape of
 * the hero falls apart. iOS solves this with minimumScaleFactor. This is the
 * same idea: a hidden probe holds the sentence at full size and never changes,
 * the visible copy is sized from the ratio between that and the real column
 * width, and the font size itself changes so the text stays crisp.
 *
 * Measuring the column rather than the viewport is what makes it correct inside
 * the 400px phone card on desktop too, where a vw-based size would be wrong.
 */
function FitHeadline({ lines, a11yLabel }) {
  const boxRef = useRef(null);
  const probeRef = useRef(null);
  // A size that fits the narrowest phone, so the exported HTML is never wrong
  // before the layout effect below corrects it.
  const [fontSize, setFontSize] = useState(24);

  useIsomorphicLayoutEffect(() => {
    const measure = () => {
      const box = boxRef.current;
      const probe = probeRef.current;
      if (!box || !probe) return;
      const available = box.clientWidth;
      // getBoundingClientRect, not scrollWidth: scrollWidth reports 0 for a
      // non-replaced inline box, and one stray style change turning the probe
      // inline would silently pin the headline at its fallback size forever.
      const natural = probe.getBoundingClientRect().width;
      if (!available || !natural) return;
      const scale = Math.min(1, Math.max(HEADLINE_MIN_SCALE, available / natural));
      setFontSize(Math.floor(HEADLINE_BASE_PX * scale));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(boxRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <h1
      ref={boxRef}
      aria-label={a11yLabel}
      className="relative w-full overflow-hidden font-bold leading-[1.04] tracking-[-0.4px] text-app-textPrimary"
      style={{ fontSize }}
    >
      <span aria-hidden="true" className="block whitespace-nowrap">
        {lines[0]}
        <br />
        {lines[1]}
      </span>
      <span
        ref={probeRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap"
        style={{ fontSize: HEADLINE_BASE_PX }}
      >
        {lines[0]}
        <br />
        {lines[1]}
      </span>
    </h1>
  );
}

/**
 * Counts 9,800 up to 10,200 with an ease-out, so it decelerates into the number
 * instead of stopping dead. Under reduced motion it is simply the number.
 */
function MemberCounter() {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(MEMBER_COUNT_FROM);

  useEffect(() => {
    if (reduced) {
      setCount(MEMBER_COUNT_TO);
      return undefined;
    }
    let frame = 0;
    const start = performance.now();
    const span = MEMBER_COUNT_TO - MEMBER_COUNT_FROM;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / MEMBER_COUNT_DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(MEMBER_COUNT_FROM + span * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  return (
    <p className="text-center text-[14px] leading-snug text-app-textSecondary sm:text-[15px]">
      {memberCountLine(count)}
    </p>
  );
}

/**
 * One quote at a time, and only ever one in the DOM.
 *
 * The old ticker stacked all ten slides edge to edge inside a 56px window and
 * translated the strip, so for 500ms of every 3s the tail of the outgoing quote
 * and the head of the incoming one were both inside the window. That is the
 * overlap. Here a single element fades and lifts out, the text is swapped while
 * nothing is visible, and the new one fades in. Overlap is not possible.
 */
function TestimonialTicker() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("in");
  const timers = useRef([]);

  useEffect(() => {
    const cycle = setInterval(() => {
      if (reduced) {
        setIndex((i) => (i + 1) % TESTIMONIALS.length);
        return;
      }
      setPhase("out");
      timers.current.push(
        setTimeout(() => {
          setIndex((i) => (i + 1) % TESTIMONIALS.length);
          setPhase("enter");
          timers.current.push(setTimeout(() => setPhase("in"), 20));
        }, TICKER_OUT_MS)
      );
    }, TICKER_INTERVAL_MS);
    return () => {
      clearInterval(cycle);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [reduced]);

  const quote = TESTIMONIALS[index];
  const style = reduced
    ? undefined
    : {
        transitionProperty: "opacity, transform",
        transitionDuration: phase === "out" ? `${TICKER_OUT_MS}ms` : `${TICKER_IN_MS}ms`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        opacity: phase === "in" ? 1 : 0,
        transform:
          phase === "out"
            ? "translateY(-10px)"
            : phase === "enter"
              ? "translateY(10px)"
              : "translateY(0)",
      };

  return (
    <div className="flex h-[72px] items-center justify-center overflow-hidden px-2">
      <p
        style={style}
        className="line-clamp-3 text-center text-[13.5px] leading-[1.3] text-app-textPrimary/80 sm:text-[15px]"
      >
        <em className="italic">“{quote.text}”</em>{" "}
        <span className="font-semibold not-italic">- {quote.author}</span>
      </p>
    </div>
  );
}

/**
 * Butterflies drift up behind and in front of the content. Purely decorative:
 * rendered only after mount so the prerendered HTML and the first client render
 * agree, and not rendered at all under reduced motion.
 */
function Butterflies({ count, tint, zClass }) {
  const mounted = useMounted();
  const reduced = useReducedMotion();
  const flock = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        key: i,
        left: Math.random() * 92,
        size: 25 + Math.random() * 25,
        duration: 8 + Math.random() * 7,
        delay: -Math.random() * 15,
        drift: (Math.random() - 0.5) * 90,
        opacity: 0.26 + Math.random() * 0.32,
      })),
    [count]
  );
  if (!mounted || reduced) return null;

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${zClass}`}>
      {flock.map((b) => (
        <span
          key={b.key}
          className="funnel-butterfly absolute block"
          style={{
            left: `${b.left}%`,
            bottom: "-60px",
            width: b.size,
            height: b.size,
            backgroundColor: tint,
            WebkitMaskImage: "url(/butterfly_template.png)",
            maskImage: "url(/butterfly_template.png)",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            "--funnel-drift-duration": `${b.duration}s`,
            "--funnel-drift-x": `${b.drift}px`,
            "--funnel-butterfly-opacity": b.opacity,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function WelcomeScreen({ onNext }) {
  const rise = (i) => ({ animationDelay: `${0.2 + i * 0.12}s` });

  return (
    // No z-index on the flex wrapper on purpose: `position: relative` with
    // `z-index: auto` does not open a stacking context, so the footer below can
    // sit above the front flock while the hero sits under it.
    <div className="relative h-full w-full overflow-hidden bg-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
        style={{
          background: "linear-gradient(180deg, rgba(255,45,85,0.10) 0%, rgba(255,255,255,0) 100%)",
        }}
      />
      <Butterflies count={3} tint="rgba(255,45,85,0.5)" zClass="z-0" />
      <Butterflies count={12} tint="rgba(255,45,85,0.32)" zClass="z-20" />

      <div className="relative flex h-full min-h-0 w-full flex-col">
        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar">
          <div className="flex min-h-full flex-col items-center justify-center px-8 pb-6 pt-[max(env(safe-area-inset-top),20px)] text-center md:pt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Pelvic Floor Coach logo"
              width={70}
              height={70}
              className="funnel-rise h-[70px] w-[70px] rounded-2xl object-contain"
              style={rise(0)}
            />
            <div className="funnel-rise mt-6 w-full" style={rise(1)}>
              <FitHeadline lines={WELCOME_HEADLINE_LINES} a11yLabel={WELCOME_HEADLINE_A11Y} />
            </div>
            <p
              className="funnel-rise mt-4 max-w-[19rem] text-[15px] leading-[1.18] text-app-textSecondary sm:text-[17px]"
              style={rise(2)}
            >
              {WELCOME_SUBHEADLINE}
            </p>

            <ul className="mt-9 w-full max-w-[21rem] space-y-[18px] text-left">
              {WELCOME_BENEFITS.map((benefit, i) => (
                <li key={benefit.text} className="funnel-rise flex items-start gap-3.5" style={rise(3 + i)}>
                  <span className="flex w-7 shrink-0 justify-center pt-0.5">
                    <SFIcon name={benefit.icon} size={22} className="text-ios-pink" strokeWidth={2} />
                  </span>
                  <span className="text-[15px] font-medium leading-snug text-app-textPrimary sm:text-[16px]">
                    {benefit.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative z-30 shrink-0 space-y-4 bg-white px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-4 md:pb-5">
          <TestimonialTicker />
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-[14px] border border-app-primary/[0.18] bg-app-primary/10 px-3.5 py-1.5">
              <Shield aria-hidden="true" size={13} strokeWidth={2.4} className="text-app-primary/85" />
              <span className="text-[12px] font-semibold tracking-wide text-app-primary/90 sm:text-[13px]">
                {BADGE_TITLE}
              </span>
            </span>
          </div>
          <PrimaryButton onClick={onNext} variant="solid" breathe>
            {WELCOME_CTA}
          </PrimaryButton>
          <MemberCounter />

          {/* THIS SCREEN IS THE LANDING PAGE FOR EVERY PAID CLICK ON A PHONE.
              The desktop marketing page (LandingScreen.jsx) has carried a
              footer with these two links all along; below 704px that page is
              display:none and this is what an ad click actually gets, and it
              had no route to a policy at all. Google Ads and Meta both check
              the destination URL for a reachable privacy policy, and the next
              screen but three asks her about pelvic pain and bladder leaks, so
              this is also the last honest moment to offer it before the
              questions start.

              New tab, so tapping Privacy out of curiosity does not throw away
              the funnel she is standing in. `space-y-4` on the parent already
              spaces it; the row itself is one line at 12px, which is the size
              the skip reassurance on the email screen uses and which
              app-textSecondary clears AA at. */}
          <p className="flex items-center justify-center gap-3 text-[12px] text-app-textSecondary">
            <a
              href="/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Privacy
            </a>
            <span aria-hidden="true">&middot;</span>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Terms
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
