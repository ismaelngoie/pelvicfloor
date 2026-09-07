"use client";

// The first screen, exactly as the phone draws it: the serif headline with
// "five minutes" in italic, the four benefits, the reviewer badge, the review
// ticker, the ink CTA and the member counter underneath.

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Info } from "lucide-react";
import { WELCOME } from "./appCopy";
import { DR_REED } from "./revealCopy";
import SFIcon from "./icons";
import { Button, Screen } from "./atelier";
import { useMounted, useReducedMotion } from "./ui";

const LoginSheet = dynamic(() => import("./LoginSheet"), { ssr: false });
const CredentialsSheet = dynamic(() => import("./ReedSheets").then((m) => m.CredentialsSheet), { ssr: false });

const TICKER_INTERVAL_MS = 3000;
const TICKER_OUT_MS = 220;
const TICKER_IN_MS = 260;

function MemberCounter() {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(WELCOME.memberCountFrom);
  useEffect(() => {
    if (reduced) {
      setCount(WELCOME.memberCountTo);
      return undefined;
    }
    let frame = 0;
    const start = performance.now();
    const span = WELCOME.memberCountTo - WELCOME.memberCountFrom;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 2400);
      const eased = 1 - Math.pow(1 - t, 3);
      setCount(Math.round(WELCOME.memberCountFrom + span * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);
  return (
    <p className="text-center text-[14px] leading-snug text-atelier-ink2 sm:text-[15px]">
      {WELCOME.memberCountLine(count)}
    </p>
  );
}

function ReviewTicker() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("in");
  const timers = useRef([]);
  useEffect(() => {
    const cycle = setInterval(() => {
      if (reduced) {
        setIndex((i) => (i + 1) % WELCOME.reviews.length);
        return;
      }
      setPhase("out");
      timers.current.push(
        setTimeout(() => {
          setIndex((i) => (i + 1) % WELCOME.reviews.length);
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
  const review = WELCOME.reviews[index];
  const style = reduced
    ? undefined
    : {
        transitionProperty: "opacity, transform",
        transitionDuration: phase === "out" ? `${TICKER_OUT_MS}ms` : `${TICKER_IN_MS}ms`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        opacity: phase === "in" ? 1 : 0,
        transform: phase === "out" ? "translateY(-10px)" : phase === "enter" ? "translateY(10px)" : "translateY(0)",
      };
  return (
    <div className="flex h-[56px] items-center justify-center overflow-hidden px-2">
      <p style={style} className="line-clamp-2 text-center text-[13.5px] leading-[1.3] text-atelier-ink sm:text-[14.5px]">
        <em className="font-serif text-[16px] italic">“{review.text}”</em>{" "}
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-atelier-ink2">{review.author}</span>
      </p>
    </div>
  );
}

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

export default function WelcomeScreen({ onNext, returning = false }) {
  const rise = (i) => ({ animationDelay: `${0.2 + i * 0.12}s` });
  const [loginOpen, setLoginOpen] = useState(false);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  return (
    <Screen>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
        style={{ background: "linear-gradient(180deg, #E9D7D2 0%, rgba(246,241,234,0) 100%)" }}
      />
      <Butterflies count={3} tint="rgba(230,84,115,0.45)" zClass="z-0" />
      <Butterflies count={12} tint="rgba(230,84,115,0.3)" zClass="z-20" />
      <div className="relative flex h-full min-h-0 w-full flex-col">
        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar">
          <div className="flex min-h-full flex-col items-center justify-center px-7 pb-4 pt-[max(env(safe-area-inset-top),20px)] text-center md:pt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Pelvic Floor & Kegel Coach logo"
              width={64}
              height={64}
              className="funnel-rise h-14 w-14 rounded-2xl object-contain"
              style={rise(0)}
            />
            <h1
              className="funnel-rise mt-4 w-full whitespace-pre-line font-serif text-[34px] leading-[1.02] tracking-[-0.01em] text-atelier-ink"
              style={rise(1)}
              aria-label={WELCOME.headlineA11y}
            >
              <span aria-hidden="true">
                {WELCOME.headline.before}
                <em>{WELCOME.headline.italic}</em>
                {WELCOME.headline.after}
              </span>
            </h1>
            <p className="funnel-rise mt-3 max-w-[20rem] text-[15px] leading-[1.25] text-atelier-ink2 sm:text-[16px]" style={rise(2)}>
              {WELCOME.subtitle}
            </p>
            <ul className="mt-5 w-full max-w-[21rem] space-y-[10px] text-left">
              {WELCOME.benefits.map((benefit, i) => (
                <li key={benefit.text} className="funnel-rise flex items-center gap-3.5" style={rise(3 + i)}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-atelier-rose/[0.12] text-atelier-rose">
                    <SFIcon name={benefit.icon} size={18} strokeWidth={2} />
                  </span>
                  <span className="text-[15px] font-medium leading-snug text-atelier-ink sm:text-[16px]">{benefit.text}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setCredentialsOpen(true)}
              className="funnel-rise mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-atelier-line bg-atelier-card py-1.5 pl-1.5 pr-3 text-left"
              style={rise(7)}
              aria-label="Clinically reviewed by Doctor Evelyn Reed, physical therapist. Shows her credentials."
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={DR_REED.headshot} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover object-top" />
              <span className="truncate text-[12.5px] font-semibold text-atelier-ink">{WELCOME.reviewer}</span>
              <Info aria-hidden="true" size={14} className="shrink-0 text-atelier-rose" />
            </button>
          </div>
        </div>
        <div className="relative z-30 shrink-0 space-y-3 bg-atelier-paper px-5 pb-[max(env(safe-area-inset-bottom),14px)] pt-2 md:pb-4">
          <ReviewTicker />
          {returning ? (
            <a
              href="/app"
              className="funnel-breathe flex h-14 w-full items-center justify-center rounded-[28px] bg-atelier-ink px-4 text-center text-[17px] font-bold text-white"
            >
              Open your plan
            </a>
          ) : (
            <Button onClick={onNext} variant="ink" breathe id="onboarding.welcome.start">
              {WELCOME.cta}
            </Button>
          )}
          {returning ? null : <MemberCounter />}
          {returning ? (
            <button type="button" onClick={onNext} className="flex h-10 w-full items-center justify-center text-[14px] font-semibold text-atelier-ink2">
              Not you? Start a new plan
            </button>
          ) : (
            <button type="button" onClick={() => setLoginOpen(true)} className="flex h-10 w-full items-center justify-center text-[14px] font-semibold text-atelier-rosewood">
              Already have an account? Log in
            </button>
          )}
          <p className="flex items-center justify-center gap-3 text-[12px] text-atelier-ink2">
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="-my-2 inline-flex min-h-[44px] items-center px-1 underline underline-offset-2">
              Privacy
            </a>
            <span aria-hidden="true">&middot;</span>
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="-my-2 inline-flex min-h-[44px] items-center px-1 underline underline-offset-2">
              Terms
            </a>
          </p>
        </div>
      </div>
      <LoginSheet open={loginOpen} onClose={() => setLoginOpen(false)} />
      {credentialsOpen ? <CredentialsSheet open onClose={() => setCredentialsOpen(false)} /> : null}
    </Screen>
  );
}
