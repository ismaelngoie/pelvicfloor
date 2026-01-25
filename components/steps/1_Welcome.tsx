"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useOnboarding } from "@/app/context/OnboardingContext";

const SYSTEM_PINK = "#FF2D55"; // iOS systemPink

const userReviews = [
  { text: "Zero leaks by week 2. I cried happy tears.", author: "Emily, 39" },
  { text: "Sneezed today. No panic. I’m free.", author: "Dana, 46" },
  { text: "More sensation, less worry, more us.", author: "Jess, 35" },
  { text: "Pain-free sitting. Sleep through the night. Life feels possible again.", author: "Olivia, 41" },
  { text: "From wobbly to steady, lifting my baby feels safe again.", author: "Mia, 33" },
  { text: "Bathroom maps? Deleted. I go where I want.", author: "Priya, 37" },
  { text: "Post-prostate rehab that finally clicked.", author: "James, 62" },
  { text: "Five minutes I actually do, and it changes everything.", author: "Paige, 28" },
  { text: "Jumped on the trampoline with my kids, first time in years.", author: "Priya, 37" },
];

type Butterfly = {
  id: string;
  layer: "behind" | "front";
  size: number;
  startX: number; // px
  endX: number; // px
  duration: number; // s
  rotation: number; // rad
  tint: "pink" | "pink60" | "white";
  alpha: number;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeButterfly(layer: Butterfly["layer"], vw: number): Butterfly {
  const size = rand(25, 50);
  const startX = rand(-40, vw + 40);
  const endX = rand(-40, vw + 40);
  const duration = rand(8, 15);
  const rotation = rand(-0.4, 0.4);
  const tint = pick<Butterfly["tint"]>(["pink", "pink60", "white"]);

  // iOS logic:
  // behind alpha ~0.2
  // front: white ~0.4 else ~0.8
  const alpha = layer === "behind" ? 0.2 : tint === "white" ? 0.4 : 0.8;

  return {
    id: crypto.randomUUID(),
    layer,
    size,
    startX,
    endX,
    duration,
    rotation,
    tint,
    alpha,
  };
}

export default function WelcomeStep() {
  const { nextStep } = useOnboarding();

  // --- social proof (matches Swift increments + timer cadence)
  const [socialCount, setSocialCount] = useState(9800);
  const socialRef = useRef({ current: 9800, final: 10200, timer: 0 as any });

  // --- review ticker (2-label slide up, 3.0s interval, 0.6s spring-ish)
  const [currentReview, setCurrentReview] = useState(userReviews[0]);
  const [nextReview, setNextReview] = useState(userReviews[1]);
  const reviewIndexRef = useRef(0);
  const [sliding, setSliding] = useState(false);

  // --- butterflies: 3 behind + 12 front, respawn after each flight
  const [butterfliesBehind, setButterfliesBehind] = useState<Butterfly[]>([]);
  const [butterfliesFront, setButterfliesFront] = useState<Butterfly[]>([]);

  // --- parallax drag (matches UIPan parallax feel)
  const [parallax, setParallax] = useState({ x: 0, y: 0, active: false });
  const dragRef = useRef<{ sx: number; sy: number } | null>(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  }, []);

  useEffect(() => {
    // init butterflies based on viewport width
    const vw = typeof window !== "undefined" ? window.innerWidth : 430;
    setButterfliesBehind(Array.from({ length: 3 }).map(() => makeButterfly("behind", vw)));
    setButterfliesFront(Array.from({ length: 12 }).map(() => makeButterfly("front", vw)));
  }, []);

  // start animations after the same moment the Swift code starts them (after rise-in completes per element)
  useEffect(() => {
    if (prefersReducedMotion) return;

    // Social proof starts when label finishes rising in (Swift: when element == socialProofLabel)
    const socialStart = window.setTimeout(() => {
      socialRef.current.current = 9800;
      socialRef.current.final = 10200;
      setSocialCount(9800);

      socialRef.current.timer = window.setInterval(() => {
        const cur = socialRef.current.current;
        const fin = socialRef.current.final;

        if (cur < fin) {
          const diff = fin - cur;
          const inc = diff > 100 ? 27 : 17;
          const next = Math.min(fin, cur + inc);
          socialRef.current.current = next;
          setSocialCount(next);
        } else {
          window.clearInterval(socialRef.current.timer);
        }
      }, 30);
    }, 1200);

    // Review ticker starts when container finishes rising in (Swift: when element == reviewContainerView)
    const reviewStart = window.setTimeout(() => {
      reviewIndexRef.current = 0;
      setCurrentReview(userReviews[0]);
      setNextReview(userReviews[1]);

      const interval = window.setInterval(() => {
        const nextIndex = (reviewIndexRef.current + 1) % userReviews.length;
        const afterNext = (nextIndex + 1) % userReviews.length;

        setNextReview(userReviews[nextIndex]);
        setSliding(true);

        window.setTimeout(() => {
          setCurrentReview(userReviews[nextIndex]);
          setNextReview(userReviews[afterNext]);
          reviewIndexRef.current = nextIndex;
          setSliding(false);
        }, 600);
      }, 3000);

      return () => window.clearInterval(interval);
    }, 1100);

    return () => {
      window.clearTimeout(socialStart);
      window.clearTimeout(reviewStart);
      window.clearInterval(socialRef.current.timer);
    };
  }, [prefersReducedMotion]);

  function respawnButterfly(id: string, layer: Butterfly["layer"]) {
    const vw = typeof window !== "undefined" ? window.innerWidth : 430;

    if (layer === "behind") {
      setButterfliesBehind((prev) =>
        prev.map((b) => (b.id === id ? makeButterfly("behind", vw) : b))
      );
    } else {
      setButterfliesFront((prev) =>
        prev.map((b) => (b.id === id ? makeButterfly("front", vw) : b))
      );
    }
  }

  function tintToCss(t: Butterfly["tint"]) {
    if (t === "white") return "rgba(255,255,255,1)";
    if (t === "pink60") return "rgba(255,45,85,0.6)";
    return "rgba(255,45,85,1)";
  }

  // --- parallax handlers
  function onPointerDown(e: React.PointerEvent) {
    dragRef.current = { sx: e.clientX, sy: e.clientY };
    setParallax((p) => ({ ...p, active: true }));
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.sx;
    const dy = e.clientY - dragRef.current.sy;
    // iOS factor ~0.15
    setParallax({ x: -dx * 0.15, y: -dy * 0.15, active: true });
  }
  function onPointerUp() {
    dragRef.current = null;
    setParallax({ x: 0, y: 0, active: false });
  }

  const rise = (delaySeconds: number) =>
    prefersReducedMotion
      ? ""
      : `pf-rise pf-rise-delay-${Math.round(delaySeconds * 1000)}`;

  return (
    <div
      className="pf-welcome"
      onPointerDown={prefersReducedMotion ? undefined : onPointerDown}
      onPointerMove={prefersReducedMotion ? undefined : onPointerMove}
      onPointerUp={prefersReducedMotion ? undefined : onPointerUp}
      onPointerCancel={prefersReducedMotion ? undefined : onPointerUp}
    >
      {/* Butterfly layers */}
      <div
        className={`pf-butterfly-layer pf-butterfly-layer-behind ${
          parallax.active ? "pf-parallax-active" : ""
        }`}
        style={{ transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0)` }}
        aria-hidden
      >
        {butterfliesBehind.map((b) => (
          <span
            key={b.id}
            className="pf-butterfly"
            onAnimationEnd={() => respawnButterfly(b.id, "behind")}
            style={
              {
                "--pf-size": `${b.size}px`,
                "--pf-sx": `${b.startX}px`,
                "--pf-ex": `${b.endX}px`,
                "--pf-dur": `${b.duration}s`,
                "--pf-rot": `${b.rotation}rad`,
                "--pf-alpha": b.alpha,
                "--pf-tint": tintToCss(b.tint),
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div
        className={`pf-butterfly-layer pf-butterfly-layer-front ${
          parallax.active ? "pf-parallax-active" : ""
        }`}
        style={{ transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0)` }}
        aria-hidden
      >
        {butterfliesFront.map((b) => (
          <span
            key={b.id}
            className="pf-butterfly"
            onAnimationEnd={() => respawnButterfly(b.id, "front")}
            style={
              {
                "--pf-size": `${b.size}px`,
                "--pf-sx": `${b.startX}px`,
                "--pf-ex": `${b.endX}px`,
                "--pf-dur": `${b.duration}s`,
                "--pf-rot": `${b.rotation}rad`,
                "--pf-alpha": b.alpha,
                "--pf-tint": tintToCss(b.tint),
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Main centered stack (centerY - 60), 32px side padding */}
      <div className="pf-main" aria-label="Welcome content">
        <div className={`pf-logo ${rise(0.2)}`}>
          <Image src="/icon.png" alt="Pelvic Floor Coach logo" fill className="pf-logo-img" priority />
        </div>

        <h1 className={`pf-headline ${rise(0.32)}`}>
          Strength &amp; Confidence
          <br />
          From Your Core Outward.
        </h1>

        <p className={`pf-subheadline ${rise(0.44)}`}>
          Your personal AI physio-coach for leaks, pain,
          <br />
          and confidence.
        </p>

        <div className={`pf-benefits ${rise(0.56)}`}>
          <div className="pf-benefit">
            <span className="pf-icon" style={{ backgroundColor: SYSTEM_PINK }} aria-hidden>
              {/* runner in circle (filled-ish) */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"
                  fill="rgba(255,255,255,0.0)"
                />
                <path
                  d="M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Z"
                  fill="white"
                  opacity="0.0"
                />
                <path
                  d="M13.2 7.2a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z"
                  fill="white"
                />
                <path
                  d="M10.7 19h-1.8l1.2-4.8-1.1-1.2c-.4-.5-.5-1.1-.2-1.7l1.2-2.1c.2-.3.6-.6 1-.6h2.2c.4 0 .8.2 1 .6l.8 1.4 2.1.6c.6.2.9.8.7 1.4-.2.6-.8.9-1.4.7l-2.6-.7c-.3-.1-.5-.2-.6-.5l-.2-.3-.7 1.3 1.4 1.5c.3.3.4.8.3 1.2l-.8 3.2h-1.8l.6-2.6-1.2-1.1L10.7 19Z"
                  fill="white"
                />
                <path
                  d="M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0Z"
                  stroke="white"
                  strokeWidth="1.4"
                  opacity="0.55"
                />
              </svg>
            </span>
            <span className="pf-benefit-text">A new 5-minute plan, just for you, every day.</span>
          </div>

          <div className="pf-benefit">
            <span className="pf-icon" style={{ backgroundColor: SYSTEM_PINK }} aria-hidden>
              {/* play rectangle (filled-ish) */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4.5 6.8c0-1 .8-1.8 1.8-1.8h11.4c1 0 1.8.8 1.8 1.8v8.4c0 1-.8 1.8-1.8 1.8H6.3c-1 0-1.8-.8-1.8-1.8V6.8Z"
                  fill="white"
                />
                <path
                  d="M11 9.2v4.6c0 .6.7 1 1.2.6l3.5-2.3c.4-.3.4-.9 0-1.2l-3.5-2.3c-.5-.4-1.2 0-1.2.6Z"
                  fill={SYSTEM_PINK}
                />
              </svg>
            </span>
            <span className="pf-benefit-text">300+ physio-approved videos for total wellness.</span>
          </div>

          <div className="pf-benefit">
            <span className="pf-icon" style={{ backgroundColor: SYSTEM_PINK }} aria-hidden>
              {/* chat bubbles (filled-ish) */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6.3 7.2c0-1.2 1-2.2 2.2-2.2h8.7c1.2 0 2.2 1 2.2 2.2v5.5c0 1.2-1 2.2-2.2 2.2H12l-3.2 2.3c-.5.4-1.2 0-1.2-.6v-1.7H8.5c-1.2 0-2.2-1-2.2-2.2V7.2Z"
                  fill="white"
                />
                <path
                  d="M4.5 10.2c0-.8.6-1.4 1.4-1.4h.6v4c0 1.6 1.3 2.9 2.9 2.9h5.2v.3c0 .8-.6 1.4-1.4 1.4H9.7l-2.7 2c-.5.4-1.2 0-1.2-.6v-1.4h-.0c-.8 0-1.4-.6-1.4-1.4v-6.8Z"
                  fill="white"
                  opacity="0.85"
                />
              </svg>
            </span>
            <span className="pf-benefit-text">Chat with your AI Coach, Mia™, 24/7.</span>
          </div>
        </div>
      </div>

      {/* Bottom anchored stack (40px sides, social bottom = safe + 20) */}
      <div className="pf-bottom" aria-label="Actions">
        {/* Review ticker: NO card/background (matches iOS) */}
        <div className={`pf-review ${rise(0.68)}`} aria-live="polite">
          <div className={`pf-review-line ${sliding ? "pf-review-out" : ""}`}>
            <span className="pf-review-quote">“{currentReview.text}”</span>{" "}
            <span className="pf-review-author">– {currentReview.author}</span>
          </div>

          <div className={`pf-review-line pf-review-next ${sliding ? "pf-review-in" : ""}`}>
            <span className="pf-review-quote">“{nextReview.text}”</span>{" "}
            <span className="pf-review-author">– {nextReview.author}</span>
          </div>
        </div>

        <button
          onClick={nextStep}
          className={`pf-cta ${rise(0.92)} ${prefersReducedMotion ? "" : "pf-breathe"}`}
          style={{ backgroundColor: SYSTEM_PINK }}
        >
          Start My 5-Min Journey
        </button>

        <p className={`pf-social ${rise(0.80)}`}>
          Join {socialCount.toLocaleString()}+ members finding confidence.
        </p>
      </div>
    </div>
  );
}
