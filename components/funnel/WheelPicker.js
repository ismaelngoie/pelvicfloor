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
const VISIBLE_ROWS = 3;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const PAD = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;

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

  // Re-centre when the value moved for a reason that was not this wheel.
  useEffect(() => {
    if (value === emittedRef.current) return;
    emittedRef.current = value;
    scrollToValue(value, glide);
  }, [value, glide, scrollToValue]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-app-background via-app-background/85 to-transparent"
        style={{ height: PAD }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-app-background via-app-background/85 to-transparent"
        style={{ height: PAD }}
      />

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        onPointerDown={() => setDragging(true)}
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
  );
}

/** Inclusive integer range. Built once per unit and kept stable by the caller. */
export function buildRange(min, max) {
  const out = [];
  for (let n = min; n <= max; n += 1) out.push(n);
  return out;
}
