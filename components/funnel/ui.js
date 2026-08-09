"use client";

// The handful of parts every funnel screen is built from.
//
// Every screen here is the same three bands: a header that cannot shrink, a
// body that is the only thing allowed to scroll, and a footer that cannot
// shrink either. That last word is load bearing. The old welcome screen was the
// only one in the funnel missing `shrink-0` on its footer, and on anything
// shorter than an iPhone 13 the footer compressed until the testimonial ticker
// painted straight through the benefit list above it.

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";

/**
 * useLayoutEffect on the client, useEffect during the static export.
 *
 * Worth the two lines: the funnel restores its saved step in one of these, and
 * a layout effect runs after hydration commits but before the browser paints,
 * so a returning member never sees a frame of the welcome screen she already
 * moved past. Plain useEffect would flash it.
 */
export const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** True when the member has asked her system to calm animation down. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/** False during prerender and the first client render, true after. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/**
 * Paint the browser chrome to match the screen behind it. The plan-building and
 * plan-reveal screens go black edge to edge on iOS, and a pink status bar above
 * a black screen looks like a rendering fault.
 */
export function useThemeColor(color) {
  useEffect(() => {
    if (!color) return undefined;
    const tag = document.querySelector('meta[name="theme-color"]');
    if (!tag) return undefined;
    const previous = tag.getAttribute("content");
    tag.setAttribute("content", color);
    return () => tag.setAttribute("content", previous || "#E65473");
  }, [color]);
}

/**
 * The four-segment rail. Completed segments are full width and dimmed, the
 * current one fills as she answers, and future ones are a stub at 14% so the
 * rail keeps its shape instead of appearing to grow.
 */
export function ProgressRail({ step, fraction = 0 }) {
  const segments = [1, 2, 3, 4];
  return (
    <div
      className="flex w-[148px] gap-[6px]"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={4}
      aria-valuenow={step}
      aria-label={`Step ${step} of 4`}
    >
      {segments.map((n) => {
        const done = n < step;
        const current = n === step;
        const width = done ? 100 : current ? Math.max(14, fraction * 100) : 14;
        const opacity = done ? 0.42 : current ? 1 : 0;
        return (
          <div key={n} className="h-1 flex-1 overflow-hidden rounded-[2px] bg-ios-pink/[0.14]">
            <div
              className="h-full rounded-[2px] bg-ios-pink transition-[width,opacity] ease-out motion-reduce:transition-none"
              style={{ width: `${width}%`, opacity, transitionDuration: "450ms" }}
            />
          </div>
        );
      })}
    </div>
  );
}

/** 44px of real thumb, whatever the chevron looks like. */
export function BackButton({ onClick, tone = "light", label = "Go back" }) {
  const skin =
    tone === "dark"
      ? "text-white/70 hover:text-white active:bg-white/10"
      : "text-app-textSecondary hover:text-app-textPrimary active:bg-black/5";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${skin}`}
    >
      <ChevronLeft aria-hidden="true" size={26} strokeWidth={2.2} />
    </button>
  );
}

/** Back on the left, rail centred, and an equal-width spacer so it stays centred. */
export function ScreenHeader({ onBack, railStep, railFraction, tone = "light", right = null }) {
  return (
    <div className="flex h-11 items-center justify-between gap-2">
      <div className="flex w-11 shrink-0 items-center">
        {onBack ? <BackButton onClick={onBack} tone={tone} /> : null}
      </div>
      <div className="flex flex-1 justify-center">
        {railStep ? <ProgressRail step={railStep} fraction={railFraction} /> : null}
      </div>
      <div className="flex w-11 shrink-0 items-center justify-end">{right}</div>
    </div>
  );
}

/**
 * The one button shape in the funnel: 56 tall, fully rounded, gradient pink
 * when live and flat grey when not. Disabled is a real `disabled`, not an
 * opacity trick, so it is skipped by the keyboard and announced by a reader.
 */
export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  variant = "pink",
  breathe = false,
  className = "",
  type = "button",
}) {
  const skins = {
    pink: "bg-gradient-to-b from-ios-pink to-ios-pink/80 text-white shadow-[0_6px_18px_rgba(255,45,85,0.28)]",
    solid: "bg-ios-pink text-white shadow-[0_4px_10px_rgba(0,0,0,0.25)]",
    rose: "bg-app-primary text-white shadow-[0_6px_18px_rgba(230,84,115,0.3)]",
    reveal:
      "bg-gradient-to-r from-ios-pink to-ios-purple/80 text-white shadow-[0_6px_22px_rgba(255,45,85,0.45)]",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-14 w-full items-center justify-center rounded-[28px] px-4 text-center text-[17px] font-bold leading-tight transition-transform duration-150 active:scale-[0.98] motion-reduce:active:scale-100 sm:text-[18px] ${
        disabled
          ? "cursor-not-allowed bg-app-borderIdle text-app-textSecondary shadow-none"
          : skins[variant] || skins.pink
      } ${!disabled && breathe ? "funnel-breathe" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * `**bold**` to real elements. The copy tables carry their emphasis inline
 * because the same string is shown on iOS, where it is parsed the same way.
 */
export function RichText({ text, boldClassName = "font-semibold text-white" }) {
  const parts = String(text || "").split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
          <span key={i} className={boldClassName}>
            {part.slice(2, -2)}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

/**
 * Types a sentence out one character at a time without ever reflowing: the full
 * string is always laid out, and the untyped tail is simply transparent. Screen
 * readers and anyone on reduced motion get the whole sentence at once, because
 * a sentence that arrives in pieces is not an effect, it is an obstacle.
 */
export function Typewriter({
  text,
  className = "",
  tailClassName = "text-transparent",
  centered = false,
  onDone,
}) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(reduced ? text.length : 0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (reduced) {
      setCount(text.length);
      doneRef.current?.();
      return undefined;
    }
    setCount(0);
    const perChar = Math.min(24, Math.max(8, (1700 / Math.max(text.length, 1)) | 0));
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setCount(index);
      if (index >= text.length) {
        clearInterval(timer);
        doneRef.current?.();
      }
    }, perChar);
    return () => clearInterval(timer);
  }, [text, reduced]);

  // Centred text needs the typed part laid out separately from the reserved
  // box. Left in one flow, a half-typed centred sentence sits at the start of a
  // full-width line and reads as left aligned until the last character lands.
  if (centered) {
    return (
      <span className={`relative inline-block w-full ${className}`}>
        <span aria-hidden="true" className="invisible block">
          {text}
        </span>
        <span aria-hidden="true" className="absolute inset-0 block">
          {text.slice(0, count)}
        </span>
        <span className="sr-only">{text}</span>
      </span>
    );
  }

  return (
    <span className={className}>
      <span aria-hidden="true">
        {text.slice(0, count)}
        <span className={tailClassName}>{text.slice(count)}</span>
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

/**
 * Softens the bottom edge of a scroll area and floats a small chevron while
 * there is more below.
 *
 * A chevron rather than a caption: on the goal grid the hint sits over cards
 * that are meant to be read, and a pill of text there covers a goal title. The
 * fade does the telling, the chevron confirms it, and neither hides a word.
 * Decorative to a screen reader, which already has the whole list.
 */
export function ScrollMoreHint({ visible, tone = "light" }) {
  const from = tone === "dark" ? "from-black" : "from-app-background";
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 bottom-0 flex h-14 items-end justify-center bg-gradient-to-t ${from} via-transparent to-transparent transition-opacity duration-300 motion-reduce:transition-none ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <span
        className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full ${
          tone === "dark"
            ? "bg-white/15 text-white/80"
            : "bg-white text-app-textSecondary shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
        }`}
      >
        <ChevronDown size={16} strokeWidth={2.4} />
      </span>
    </div>
  );
}

/**
 * How many pixels the on-screen keyboard is covering.
 *
 * The funnel is a `position: fixed` app shell, so on iOS Safari the keyboard
 * slides over the bottom of it and swallows the button she is meant to press
 * next. visualViewport is the only thing that reports this honestly. Returns 0
 * where it is unsupported, which is the pre-existing behaviour.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const sync = () => {
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setInset(overlap > 80 ? Math.round(overlap) : 0);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);
  return inset;
}

/** Reports whether a scroll container still has content below the fold. */
export function useHasMoreBelow() {
  const ref = useRef(null);
  const [hasMore, setHasMore] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setHasMore(el.scrollHeight - el.scrollTop - el.clientHeight > 12);
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [measure]);

  return { ref, hasMore, onScroll: measure };
}
