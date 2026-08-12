"use client";

// The iOS-style scroll wheel, kept because it is the best thing in the old
// funnel: a woman answers "how much do you weigh" with a flick instead of a
// keyboard, and no keyboard means no layout jump and no typo.
//
// Three things the old version got wrong, fixed here:
//   1. It re-centred only on mount, so switching lbs to kg left the wheel
//      sitting on a stale row showing the wrong number.
//   2. Its scroll handler fought its own re-centring effect, which on a slow
//      phone showed up as the wheel snapping backwards under your thumb.
//   3. It had no keyboard and no accessible name, so it did not exist for
//      anyone not using a thumb.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./ui";

const ITEM_HEIGHT = 54;
// Five rows, not three. With three, the fades swallowed the only two
// neighbouring values, so the "wheel" showed exactly one number and read as a
// display even to someone looking straight at it. Five gives the selected row
// two fully visible neighbours, and the outermost pair sits half-hidden under
// the fades: the next values are literally on screen, waiting, which is the
// clearest possible "there is more above and below".
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const PAD = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;
// The fade covers exactly the outermost row at each end. It must NOT reach the
// selected row's direct neighbours: those stay fully legible on purpose.
const FADE_HEIGHT = ITEM_HEIGHT;

// A highlighted band with faded numbers above and below reads as a display, not
// a control: a Clarity recording caught a woman on the age screen spending most
// of her visit trying to work out whether it moved. On paid traffic that is a
// lost sale to a "this looks broken" moment. These three cues, scoped to this
// component so all three wheels get them, say "you can scroll me" without a word
// of instruction: chevrons that bob, a one-time bounce the moment the wheel
// appears, and a caption that leaves as soon as she touches it. All decorative,
// all gone under prefers-reduced-motion, none of it changes the value.
const AFFORDANCE_CSS = `
@keyframes pelviWheelBob {
  0%, 100% { transform: translateY(0); opacity: 0.55; }
  50%      { transform: translateY(3px); opacity: 1; }
}
@keyframes pelviWheelBobUp {
  0%, 100% { transform: translateY(0); opacity: 0.55; }
  50%      { transform: translateY(-3px); opacity: 1; }
}
.pelvi-wheel-chevron { animation: pelviWheelBob 1.5s ease-in-out infinite; }
.pelvi-wheel-chevron-up { animation: pelviWheelBobUp 1.5s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .pelvi-wheel-chevron, .pelvi-wheel-chevron-up { animation: none; }
}
`;

export default function WheelPicker({
  range,
  value,
  onChange,
  unit,
  formatLabel,
  label,
  valueText,
}) {
  const reduced = useReducedMotion();
  const scrollerRef = useRef(null);
  const emittedRef = useRef(value);
  const frameRef = useRef(0);
  const [dragging, setDragging] = useState(false);
  // Once she has touched the wheel she knows it moves, so the cues retire and
  // never nag again on this screen.
  const [touched, setTouched] = useState(false);
  const markTouched = useCallback(() => setTouched(true), []);

  // A smooth programmatic scroll is still motion, and `behavior: "smooth"`
  // beats the CSS `scroll-behavior` rule, so reduced motion has to be honoured
  // here in JS or the wheel glides for someone who asked it not to.
  const glide = reduced ? "auto" : "smooth";

  const scrollToValue = useCallback(
    (next, behavior) => {
      const el = scrollerRef.current;
      if (!el) return;
      const index = range.indexOf(next);
      if (index === -1) return;
      el.scrollTo({ top: index * ITEM_HEIGHT, behavior });
    },
    [range]
  );

  // Re-centre whenever the list itself changes. A unit switch rebuilds the
  // range, and without this the wheel keeps the old row under the band.
  useEffect(() => {
    emittedRef.current = value;
    scrollToValue(value, "auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // THE ONE-TIME BOUNCE. The moment the wheel appears, nudge it a few pixels and
  // let it settle back, so the numbers physically move once before she has done
  // anything. Motion is the clearest possible "this is interactive". The nudge
  // is 18px, well under half a row (27px), so the rounded index never changes
  // and no value is emitted. Skipped for reduced motion and once she has
  // touched it herself.
  useEffect(() => {
    if (reduced || touched) return;
    const el = scrollerRef.current;
    if (!el) return;
    const start = window.setTimeout(() => {
      const base = el.scrollTop;
      el.scrollTo({ top: base + 18, behavior: "smooth" });
      window.setTimeout(() => {
        if (scrollerRef.current) scrollerRef.current.scrollTo({ top: base, behavior: "smooth" });
      }, 260);
    }, 420);
    return () => window.clearTimeout(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // Re-centre when the value moved for a reason that was not this wheel.
  useEffect(() => {
    if (value === emittedRef.current) return;
    emittedRef.current = value;
    scrollToValue(value, glide);
  }, [value, glide, scrollToValue]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  // NOTE: this deliberately does NOT mark the wheel as touched. Scroll events
  // cannot tell her thumb from our own code, and both the mount re-centre and
  // the one-time bounce scroll this element, so "any scroll = touched" retired
  // the chevrons and the caption within a second of the wheel appearing,
  // before she had done anything at all. Real interaction is caught where it
  // is unambiguous instead: pointerdown for a thumb or a mouse, onWheel for a
  // trackpad or a scroll wheel, keydown for a keyboard.
  const handleScroll = () => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      const el = scrollerRef.current;
      if (!el) return;
      const index = Math.round(el.scrollTop / ITEM_HEIGHT);
      const next = range[Math.min(Math.max(index, 0), range.length - 1)];
      if (next !== undefined && next !== emittedRef.current) {
        emittedRef.current = next;
        onChange(next);
      }
    });
  };

  const moveTo = (next) => {
    if (next === undefined || next === value) return;
    emittedRef.current = next;
    onChange(next);
    scrollToValue(next, glide);
  };

  const handleKeyDown = (event) => {
    const deltas = {
      ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1,
      PageUp: -10, PageDown: 10,
    };
    if (event.key in deltas) {
      event.preventDefault();
      const index = range.indexOf(value);
      if (index === -1) return;
      moveTo(range[Math.min(Math.max(index + deltas[event.key], 0), range.length - 1)]);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      moveTo(range[0]);
    }
    if (event.key === "End") {
      event.preventDefault();
      moveTo(range[range.length - 1]);
    }
  };

  return (
    <div>
    <style dangerouslySetInnerHTML={{ __html: AFFORDANCE_CSS }} />
    <div
      className="relative mx-auto w-full max-w-[320px] overflow-hidden"
      style={{ height: WHEEL_HEIGHT }}
    >
      {/* Selection band, then a soft fade top and bottom so the list reads as a
          wheel rather than a cropped list. All decorative. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 z-10 w-[88%] -translate-x-1/2 rounded-xl border-y-2 transition-colors duration-150 ${
          dragging ? "border-ios-pink/40 bg-ios-pink/[0.09]" : "border-ios-pink/20 bg-ios-pink/[0.06]"
        }`}
        style={{ top: PAD, height: ITEM_HEIGHT }}
      />

      {/* Chevrons at the outer edges: the universal "scroll here" language.
          They used to flank the selection band, but with five rows that spot
          belongs to the fully visible neighbouring values, so the chevrons now
          live in the faded end rows where they cover nothing that matters.
          They bob gently until she touches the wheel, then fade out for good. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 text-ios-pink transition-opacity duration-300 ${
          touched ? "opacity-0" : "opacity-100"
        }`}
        style={{ top: 10 }}
      >
        <svg className="pelvi-wheel-chevron-up" width="22" height="13" viewBox="0 0 22 13" fill="none">
          <path d="M2 11L11 2l9 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 z-30 -translate-x-1/2 text-ios-pink transition-opacity duration-300 ${
          touched ? "opacity-0" : "opacity-100"
        }`}
        style={{ bottom: 10 }}
      >
        <svg className="pelvi-wheel-chevron" width="22" height="13" viewBox="0 0 22 13" fill="none">
          <path d="M2 2l9 9 9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {/* via /75, not /85: the end rows should be dimmed enough to read as
          "further away" but still visibly BE numbers, because a half-seen
          value is what tells her the list continues. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-app-background via-app-background/75 to-transparent"
        style={{ height: FADE_HEIGHT }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-app-background via-app-background/75 to-transparent"
        style={{ height: FADE_HEIGHT }}
      />

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        onKeyDown={(e) => { markTouched(); handleKeyDown(e); }}
        onWheel={markTouched}
        onPointerDown={() => { markTouched(); setDragging(true); }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        tabIndex={0}
        role="spinbutton"
        aria-label={label}
        aria-valuemin={range[0]}
        aria-valuemax={range[range.length - 1]}
        aria-valuenow={value}
        aria-valuetext={valueText}
        className="funnel-wheel h-full w-full overflow-y-scroll rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ios-pink"
        style={{ paddingTop: PAD, paddingBottom: PAD }}
      >
        {range.map((n) => {
          const selected = n === value;
          return (
            <div
              key={n}
              className={`funnel-wheel-item flex items-center justify-center transition-all duration-200 motion-reduce:transition-none ${
                selected
                  ? "text-[26px] font-bold text-ios-pink"
                  : "text-[20px] font-medium text-app-textSecondary/45"
              }`}
              style={{ height: ITEM_HEIGHT }}
            >
              <span>{formatLabel ? formatLabel(n) : n}</span>
              {unit ? (
                <span
                  className={`ml-1.5 font-medium ${
                    selected
                      ? "text-[15px] text-ios-pink/70"
                      : "text-[13px] text-app-textSecondary/40"
                  }`}
                >
                  {unit}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>

    {/* Said in words as well, because the chevrons are silent for anyone who
        does not read motion, and because "Scroll" is the one word that removes
        all doubt. It leaves the moment she touches the wheel, so it never
        becomes clutter for the two screens that follow. */}
    <p
      aria-hidden="true"
      className={`mt-2 text-center text-[13px] font-medium text-app-textSecondary transition-opacity duration-300 ${
        touched ? "opacity-0" : "opacity-100"
      }`}
    >
      Scroll to choose
    </p>
    </div>
  );
}

/** Inclusive integer range. Built once per unit and kept stable by the caller. */
export function buildRange(min, max) {
  const out = [];
  for (let n = min; n <= max; n += 1) out.push(n);
  return out;
}
