"use client";

// The small pieces every /admin panel is built from.
//
// There is one of each on purpose: one card, one empty state, one error state,
// one skeleton. When every panel uses the same three states, no panel can
// forget to have them.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/* -------------------------------------------------------------------------
   Hooks
   ------------------------------------------------------------------------- */

/** Measure a box so a chart can draw itself at its real pixel width. */
export function useElementWidth(fallback = 640) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const read = () => {
      const next = Math.round(node.getBoundingClientRect().width);
      if (next > 0) setWidth(next);
    };
    read();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", read);
      return () => window.removeEventListener("resize", read);
    }
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

/** True when the visitor has asked for less movement. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Escape closes whatever is on top. */
export function useEscape(handler, active = true) {
  const saved = useRef(handler);
  saved.current = handler;
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") saved.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
}

/** A message that shows for a few seconds after a save, then clears itself. */
export function useTransientMessage(timeout = 4000) {
  const [message, setMessage] = useState(null);
  const timer = useRef(null);

  const show = useCallback(
    (next) => {
      setMessage(next);
      if (timer.current) clearTimeout(timer.current);
      if (next) timer.current = setTimeout(() => setMessage(null), timeout);
    },
    [timeout]
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return [message, show];
}

/* -------------------------------------------------------------------------
   Layout
   ------------------------------------------------------------------------- */

export function Card({ as: Tag = "div", className = "", flat = false, children, ...rest }) {
  return (
    <Tag className={`pv-card ${flat ? "pv-card--flat" : ""} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function SectionHeader({ eyebrow, title, description, action, id }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p
            className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--pv-ink-3)" }}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2 id={id} className="text-lg font-semibold sm:text-xl" style={{ color: "var(--pv-ink)" }}>
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------
   States: loading, empty, error, unavailable
   ------------------------------------------------------------------------- */

export function Skeleton({ className = "", style }) {
  return <div className={`pv-skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function TileSkeleton() {
  return (
    <Card className="p-5">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-4 h-9 w-24" />
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-3/5" />
    </Card>
  );
}

export function ChartSkeleton({ height = 220 }) {
  return (
    <Card className="p-5">
      <Skeleton className="h-4 w-44" />
      <Skeleton className="mt-2 h-3 w-64" />
      <Skeleton className="mt-5 w-full" style={{ height }} />
    </Card>
  );
}

export function RowsSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

/** Says nothing is here yet, and what would put something here. */
export function EmptyState({ title, description, icon = "○" }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full text-xl"
        style={{ background: "var(--pv-surface-2)", color: "var(--pv-ink-3)" }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <p className="text-base font-semibold" style={{ color: "var(--pv-ink)" }}>
        {title}
      </p>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

/** Something broke. Says what, in words, and offers the one useful action. */
export function ErrorState({ title = "That did not load", description, onRetry, retryLabel = "Try again" }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full text-xl font-semibold"
        style={{ background: "rgba(224, 96, 96, 0.14)", color: "var(--pv-crit)" }}
        aria-hidden="true"
      >
        !
      </div>
      <p className="text-base font-semibold" style={{ color: "var(--pv-ink)" }}>
        {title}
      </p>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>
          {description}
        </p>
      ) : null}
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-5">
          <PrimaryLabel>{retryLabel}</PrimaryLabel>
        </button>
      ) : null}
    </div>
  );
}

/**
 * A number that genuinely cannot be worked out, with the reason.
 * Used instead of printing a zero that would read as a fact.
 */
export function Unavailable({ reason }) {
  return (
    <p className="text-sm leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>
      {reason}
    </p>
  );
}

/* -------------------------------------------------------------------------
   Controls
   ------------------------------------------------------------------------- */

function PrimaryLabel({ children }) {
  return (
    <span
      className="inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold"
      style={{
        background: "linear-gradient(90deg, var(--pv-rose), var(--pv-violet))",
        color: "var(--pv-accent-ink)",
      }}
    >
      {children}
    </span>
  );
}

export function Button({
  variant = "primary",
  className = "",
  children,
  disabled = false,
  ...rest
}) {
  const base =
    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-opacity";
  const styles =
    variant === "primary"
      ? {
          background: "linear-gradient(90deg, var(--pv-rose), var(--pv-violet))",
          color: "var(--pv-accent-ink)",
        }
      : variant === "ghost"
      ? { background: "var(--pv-surface-2)", color: "var(--pv-ink)", border: "1px solid var(--pv-border)" }
      : { background: "transparent", color: "var(--pv-ink-2)", border: "1px solid var(--pv-border)" };

  return (
    <button
      type="button"
      className={`${base} ${disabled ? "opacity-50" : "hover:opacity-90"} ${className}`}
      style={styles}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}

/** A segmented control. One row, real thumb targets, keyboard reachable. */
export function Segmented({ options, value, onChange, label }) {
  const optionRefs = useRef([]);

  const moveSelection = (currentIndex, nextIndex) => {
    const boundedIndex = (nextIndex + options.length) % options.length;
    const next = options[boundedIndex];
    if (!next) return;
    onChange(next.value);
    optionRefs.current[boundedIndex]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid w-full grid-cols-2 gap-1 rounded-[22px] p-1 sm:inline-flex sm:w-auto sm:flex-nowrap"
      style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)" }}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            ref={(node) => { optionRefs.current[index] = node; }}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (["ArrowRight", "ArrowDown"].includes(event.key)) {
                event.preventDefault();
                moveSelection(index, index + 1);
              } else if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
                event.preventDefault();
                moveSelection(index, index - 1);
              } else if (event.key === "Home") {
                event.preventDefault();
                moveSelection(index, 0);
              } else if (event.key === "End") {
                event.preventDefault();
                moveSelection(index, options.length - 1);
              }
            }}
            className="min-h-[44px] w-full rounded-full px-3.5 text-[13px] font-semibold transition-colors sm:w-auto"
            style={
              selected
                ? { background: "var(--pv-rose)", color: "var(--pv-accent-ink)" }
                : { background: "transparent", color: "var(--pv-ink-2)" }
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Pill({ tone = "neutral", children }) {
  const tones = {
    neutral: { background: "var(--pv-surface-2)", color: "var(--pv-ink-2)", border: "1px solid var(--pv-border)" },
    good: { background: "rgba(12, 163, 12, 0.14)", color: "var(--pv-good)", border: "1px solid rgba(12,163,12,0.3)" },
    warn: { background: "rgba(250, 178, 25, 0.14)", color: "var(--pv-warn)", border: "1px solid rgba(250,178,25,0.3)" },
    crit: { background: "rgba(224, 96, 96, 0.14)", color: "var(--pv-crit)", border: "1px solid rgba(224,96,96,0.3)" },
    accent: { background: "rgba(168, 119, 245, 0.16)", color: "var(--pv-violet)", border: "1px solid rgba(168,119,245,0.32)" },
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={tones[tone] || tones.neutral}
    >
      {children}
    </span>
  );
}

export function Field({ label, hint, htmlFor, children }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.1em]"
        style={{ color: "var(--pv-ink-3)" }}
      >
        {label}
      </label>
      {children}
      {hint ? (
        <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--pv-ink-3)" }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const controlStyle = {
  background: "var(--pv-surface-2)",
  border: "1px solid var(--pv-border)",
  color: "var(--pv-ink)",
};

export function Select({ className = "", children, ...rest }) {
  return (
    <select
      className={`min-h-[44px] w-full appearance-none rounded-xl px-3.5 text-sm font-medium ${className}`}
      style={controlStyle}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Input({ className = "", ...rest }) {
  return (
    <input
      className={`min-h-[44px] w-full rounded-xl px-3.5 text-sm font-medium ${className}`}
      style={controlStyle}
      {...rest}
    />
  );
}

export function Textarea({ className = "", ...rest }) {
  return (
    <textarea
      className={`w-full rounded-xl px-3.5 py-3 text-sm leading-relaxed ${className}`}
      style={controlStyle}
      {...rest}
    />
  );
}

/** A short, calm confirmation or failure line under a form. */
export function Feedback({ message }) {
  if (!message) return null;
  const tone = message.tone === "error" ? "var(--pv-crit)" : "var(--pv-good)";
  return (
    <p role="status" className="mt-2 text-xs font-semibold leading-relaxed" style={{ color: tone }}>
      {message.text}
    </p>
  );
}
