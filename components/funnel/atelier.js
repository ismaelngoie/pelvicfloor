"use client";

// The Atelier kit: the handful of parts every 3.1.x onboarding screen is built
// from, drawn the way the phone draws them. Paper #F6F1EA, ink #1C1820, rose
// #E65473, Instrument Serif for the display line, Figtree for everything else.
//
// Every screen is the same three bands: a header that cannot shrink, a body
// that is the only thing allowed to scroll, and a footer that cannot shrink.

import React from "react";
import { ChevronLeft } from "lucide-react";
import SFIcon from "./icons";
import { ScrollMoreHint, useHasMoreBelow } from "./ui";

export function Screen({ children, className = "", tone = "paper" }) {
  const bg = tone === "dark" ? "bg-black text-white" : "bg-atelier-paper text-atelier-ink";
  return (
    <div className={`relative flex h-full min-h-0 w-full flex-col overflow-hidden font-figtree ${bg} ${className}`}>
      {children}
    </div>
  );
}

/**
 * The funnel's own progress rail: four segments, the current one filling as
 * she answers. Same shape and size as the phone's OnboardingProgressView.
 */
export function Rail({ step, fraction = 0, tone = "paper" }) {
  const segments = [1, 2, 3, 4];
  const track = tone === "dark" ? "bg-white/15" : "bg-atelier-rose/[0.14]";
  const fill = tone === "dark" ? "bg-white" : "bg-atelier-rose";
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
          <div key={n} className={`h-1 flex-1 overflow-hidden rounded-[2px] ${track}`}>
            <div
              className={`h-full rounded-[2px] transition-[width,opacity] ease-out motion-reduce:transition-none ${fill}`}
              style={{ width: `${width}%`, opacity, transitionDuration: "450ms" }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function BackButton({ onClick, tone = "paper", label = "Go back" }) {
  const skin =
    tone === "dark"
      ? "border-white/15 bg-white/10 text-white"
      : "border-atelier-line bg-atelier-card text-atelier-rosewood";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-transform active:scale-95 ${skin}`}
    >
      <ChevronLeft aria-hidden="true" size={22} strokeWidth={2.4} />
    </button>
  );
}

export function Header({ onBack, railStep, railFraction = 0, tone = "paper", right = null }) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-4 pt-[max(env(safe-area-inset-top),8px)]">
      <div className="flex w-10 shrink-0 items-center">
        {onBack ? <BackButton onClick={onBack} tone={tone} /> : null}
      </div>
      <div className="flex flex-1 justify-center">
        {railStep ? <Rail step={railStep} fraction={railFraction} tone={tone} /> : null}
      </div>
      <div className="flex w-10 shrink-0 items-center justify-end">{right}</div>
    </div>
  );
}

/** The scroll band, with the soft fade and chevron while there is more below. */
export function Body({ children, className = "", tone = "paper", padded = true }) {
  const { ref, hasMore, onScroll } = useHasMoreBelow();
  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={ref}
        onScroll={onScroll}
        className={`h-full overflow-y-auto overscroll-contain no-scrollbar ${padded ? "px-5" : ""} ${className}`}
      >
        {children}
      </div>
      <ScrollMoreHint visible={hasMore} tone={tone === "dark" ? "dark" : "paper"} />
    </div>
  );
}

export function Footer({ children, className = "", tone = "paper" }) {
  const bg = tone === "dark" ? "bg-black" : "bg-atelier-paper";
  return (
    <div
      className={`relative z-20 shrink-0 space-y-3 px-5 pb-[max(env(safe-area-inset-bottom),14px)] pt-2 ${bg} ${className}`}
    >
      {children}
    </div>
  );
}

export function Title({ children, className = "", as: Tag = "h1", size = 31, center = false }) {
  return (
    <Tag
      className={`font-serif font-normal leading-[1.08] tracking-[-0.01em] text-atelier-ink ${center ? "text-center" : ""} ${className}`}
      style={{ fontSize: size }}
    >
      {children}
    </Tag>
  );
}

export function Subtitle({ children, className = "", center = false }) {
  return (
    <p className={`text-[15px] leading-[1.4] text-atelier-ink2 ${center ? "text-center" : ""} ${className}`}>
      {children}
    </p>
  );
}

export function Eyebrow({ children, className = "", tone = "rose" }) {
  const color = tone === "rose" ? "text-atelier-rose" : tone === "dark" ? "text-white/60" : "text-atelier-ink3";
  return (
    <p className={`text-[11.5px] font-semibold uppercase tracking-[0.14em] ${color} ${className}`}>
      {children}
    </p>
  );
}

/**
 * The one button shape: 56 tall, fully rounded. Ink on paper screens, rose
 * where the phone uses rose, ghost for the quiet secondary action.
 */
export function Button({
  children,
  onClick,
  disabled = false,
  variant = "ink",
  breathe = false,
  className = "",
  type = "button",
  id,
}) {
  const skins = {
    ink: "bg-atelier-ink text-white shadow-[0_10px_24px_rgba(28,24,32,0.22)]",
    rose: "bg-atelier-rose text-white shadow-[0_10px_24px_rgba(230,84,115,0.32)]",
    roseBright: "bg-atelier-roseBright text-white shadow-[0_10px_24px_rgba(249,79,112,0.35)]",
    ghost: "border border-atelier-line bg-atelier-card text-atelier-ink shadow-none",
    quiet: "bg-transparent text-atelier-ink2 shadow-none",
  };
  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-14 w-full items-center justify-center rounded-[28px] px-4 text-center text-[17px] font-bold leading-tight transition-transform duration-150 active:scale-[0.98] motion-reduce:active:scale-100 ${
        disabled ? "cursor-not-allowed bg-atelier-ink/10 text-atelier-ink3 shadow-none" : skins[variant] || skins.ink
      } ${!disabled && breathe ? "funnel-breathe" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "", emphasized = false, tone = "paper" }) {
  const skin =
    tone === "dark"
      ? emphasized
        ? "border-white/15 bg-white/[0.08]"
        : "border-white/10 bg-white/[0.05]"
      : emphasized
        ? "border-atelier-rose/25 bg-atelier-rose/[0.06]"
        : "border-atelier-line bg-atelier-card";
  return <div className={`rounded-[20px] border p-4 ${skin} ${className}`}>{children}</div>;
}

/** A calibration answer: title left, a ring on the right, rose when chosen. */
export function ChoiceRow({ title, selected, onClick, id, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      data-option={id}
      className={`flex w-full items-center gap-3.5 rounded-[18px] border px-[18px] py-[18px] text-left transition-colors ${
        selected
          ? "border-atelier-rose/75 bg-atelier-rose/10 shadow-[0_4px_10px_rgba(230,84,115,0.10)]"
          : "border-atelier-line bg-atelier-card"
      }`}
      style={selected ? { borderWidth: 1.6 } : undefined}
    >
      <span className="flex-1 text-[16px] font-semibold leading-snug text-atelier-ink">{title}</span>
      <span
        aria-hidden="true"
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${
          selected ? "border-atelier-rose bg-atelier-rose text-white" : "border-atelier-ink3/45"
        }`}
      >
        {selected ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.5l2.3 2.3L9.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
    </button>
  );
}

/** A pathway or focus card: symbol in a rose tint, title, one-line detail. */
export function OptionCard({ symbol, title, detail, selected, onClick, id }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      data-option={id}
      className={`flex w-full items-center gap-3.5 rounded-[20px] border p-4 text-left transition-colors ${
        selected ? "border-atelier-rose bg-atelier-rose/[0.08]" : "border-atelier-line bg-atelier-card"
      }`}
      style={selected ? { borderWidth: 1.6 } : undefined}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          selected ? "bg-atelier-rose text-white" : "bg-atelier-rose/[0.12] text-atelier-rose"
        }`}
      >
        <SFIcon name={symbol} size={22} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold leading-snug text-atelier-ink">{title}</span>
        {detail ? <span className="mt-0.5 block text-[13.5px] leading-snug text-atelier-ink2">{detail}</span> : null}
      </span>
      <span
        aria-hidden="true"
        className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px] ${
          selected ? "border-atelier-rose bg-atelier-rose text-white" : "border-atelier-ink3/45"
        }`}
      >
        {selected ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.5l2.3 2.3L9.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
    </button>
  );
}

/** A member portrait with the initial underneath for the moment before it loads. */
export function Face({ src, name, size = 44, className = "" }) {
  const initial = String(name || "?").trim().charAt(0).toUpperCase();
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-atelier-rose/[0.12] text-atelier-rose ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42, fontWeight: 700 }}
    >
      <span aria-hidden="true">{initial}</span>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
    </span>
  );
}

/** The italic acknowledgment strip the phone shows after a "tried" answer. */
export function Acknowledgment({ children }) {
  return (
    <p className="rounded-[16px] bg-atelier-rose/[0.08] p-4 font-serif text-[18px] italic leading-snug text-atelier-rosewood">
      {children}
    </p>
  );
}
