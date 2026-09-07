"use client";

// The Atelier kit for the member area, mirroring Core/DesignSystem/Atelier.swift:
// paper behind everything, cards on #FFFCF8 with a hairline and a plum shadow,
// Instrument Serif for display lines, a small tracked mono voice for eyebrows,
// Figtree for reading text. Radii: 22 for cards, 16 for rows.

import { ChevronRight } from "lucide-react";

export const ATELIER = {
  paper: "#F6F1EA",
  card: "#FFFCF8",
  ink: "#1C1820",
  ink2: "#6B6470",
  ink3: "#A29BA6",
  rose: "#E65473",
  rosewood: "#C43E63",
  sage: "#6F8F7A",
  amber: "#C58A2A",
  plum: "#3A2F44",
  night: "#15121A",
  nightInk: "#F4EEF1",
  line: "rgba(28, 24, 32, 0.08)",
};

/** Mono eyebrow: uppercase, tracked, tertiary ink. */
export function Eyebrow({ children, className = "", tone = "ink3" }) {
  const color = { ink3: "text-atelier-ink3", ink2: "text-atelier-ink2", rose: "text-atelier-rose", nightInk: "text-atelier-nightInk/85" }[tone] || "text-atelier-ink3";
  return (
    <p className={`font-mono text-[10.5px] font-medium uppercase tracking-[0.13em] ${color} ${className}`}>{children}</p>
  );
}

/** A display line in Instrument Serif. */
export function Serif({ children, size = 22, className = "", as: Tag = "p", italic = false }) {
  return (
    <Tag className={`font-serif leading-[1.08] text-atelier-ink ${italic ? "italic" : ""} ${className}`} style={{ fontSize: size }}>
      {children}
    </Tag>
  );
}

/** Atelier card: #FFFCF8, hairline, 22px corners, plum shadow. */
export function ACard({ children, className = "", as: Tag = "section", shadow = true, style, ...rest }) {
  return (
    <Tag
      className={`rounded-[22px] border border-atelier-line bg-atelier-card ${shadow ? "shadow-[0_14px_20px_-6px_rgba(58,47,68,0.16)]" : ""} ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** A row-shaped card, 16px corners, no shadow. */
export function ARow({ children, className = "", as: Tag = "div", ...rest }) {
  return (
    <Tag className={`rounded-[16px] border border-atelier-line bg-atelier-card ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function Chevron({ className = "" }) {
  return <ChevronRight className={`h-4 w-4 shrink-0 text-atelier-ink3 ${className}`} strokeWidth={2.4} aria-hidden="true" />;
}

/** The rose capsule action the trackers use ("Log period", "Log today's symptoms"). */
export function RoseAction({ children, onClick, tone = "rose", className = "", ...rest }) {
  const bg = { rose: "bg-atelier-rose", rosewood: "bg-atelier-rosewood", plum: "bg-atelier-plum", sage: "bg-atelier-sage" }[tone] || "bg-atelier-rose";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[46px] w-full items-center justify-center gap-2 rounded-[15px] ${bg} px-4 text-[14.5px] font-semibold text-white ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Reveal-on-mount, the phone's onAppearAnimation. */
export function Rise({ children, delay = 0, className = "" }) {
  return (
    <div className={`funnel-rise ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
