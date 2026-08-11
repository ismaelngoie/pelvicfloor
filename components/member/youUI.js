"use client";

// The You tab's row vocabulary.
//
// The phone builds every row in this screen from one function — rowContent in
// ProfileView.swift — and it is what makes a settings list read as part of the
// app rather than as a form: a 32pt rounded square filled with a colour
// gradient, a white glyph inside it, the label in primary text with a quiet
// caption under it, and a chevron. These are the same shapes, the same 32px
// tile, the same 8px corner, and the same colour per row as
// ProfileView.colorForLabel.

import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * The tints, by the phone's own name for each row. `from`/`to` stand in for
 * SwiftUI's `.gradient`, which lightens the top of a filled shape.
 */
export const TINTS = {
  gray: "linear-gradient(180deg, #9A9AA5 0%, #6E6E78 100%)",
  green: "linear-gradient(180deg, #4BD07E 0%, #24A85A 100%)",
  teal: "linear-gradient(180deg, #45BEB9 0%, #2E9E9A 100%)",
  mint: "linear-gradient(180deg, #63D9C0 0%, #34B79C 100%)",
  accent: "linear-gradient(180deg, #F0708C 0%, #E65473 100%)",
  pink: "linear-gradient(180deg, #FF6B85 0%, #FF2D55 100%)",
  cyan: "linear-gradient(180deg, #4FC7EC 0%, #22A7D0 100%)",
  blue: "linear-gradient(180deg, #4E9BE6 0%, #2A72C4 100%)",
  orange: "linear-gradient(180deg, #FFA24E 0%, #E8843A 100%)",
  indigo: "linear-gradient(180deg, #7A78E8 0%, #5856D6 100%)",
  purple: "linear-gradient(180deg, #C377EE 0%, #AF52DE 100%)",
  slate: "linear-gradient(180deg, #8E93A6 0%, #5F6478 100%)",
};

/** The coloured square with a white glyph, exactly as the phone draws it. */
export function IconTile({ icon: Icon, tint = "gray", className = "" }) {
  return (
    <span
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${className}`}
      style={{ backgroundImage: TINTS[tint] || TINTS.gray }}
    >
      <Icon className="h-[17px] w-[17px] text-white" strokeWidth={2.2} aria-hidden="true" />
    </span>
  );
}

/**
 * One row. A button when it does something, a link when it goes somewhere, and
 * a plain line when it is only telling her a value.
 *
 * `badge` is the phone's "Ready" pill on the progress check row.
 */
export function Row({
  icon, tint, label, value, hint, badge, onClick, href, external, disabled,
}) {
  const inner = (
    <>
      <IconTile icon={icon} tint={tint} />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium leading-snug text-app-textPrimary">
          {label}
        </span>
        {value ? (
          <span className="block truncate text-[12.5px] text-app-textSecondary">{value}</span>
        ) : null}
        {hint ? (
          <span className="mt-0.5 block text-[11.5px] leading-snug text-app-textSecondary">
            {hint}
          </span>
        ) : null}
      </span>
      {badge ? (
        <span className="shrink-0 rounded-full bg-app-primary px-2 py-[3px] text-[10.5px] font-bold text-white">
          {badge}
        </span>
      ) : null}
      {(onClick || href) && (
        <ChevronRight className="h-4 w-4 shrink-0 text-app-textSecondary/60" aria-hidden="true" />
      )}
    </>
  );

  const className =
    "flex w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-60";

  // A row that points at another tab of the member app is a <Link>, not an
  // <a>: a plain anchor to /app/insights reloads the whole document and
  // re-fetches the program JSON the provider is holding, which is the thing
  // MemberProvider exists to avoid. Everything else — the marketing pages, the
  // App Store — is a real navigation and stays an anchor.
  const isAppRoute = href?.startsWith("/app");

  return (
    <li>
      {href ? (
        isAppRoute ? (
          <Link href={href} className={className}>{inner}</Link>
        ) : (
        <a
          href={href}
          className={className}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {inner}
        </a>
        )
      ) : onClick ? (
        <button type="button" onClick={onClick} disabled={disabled} className={className}>
          {inner}
        </button>
      ) : (
        <div className={className}>{inner}</div>
      )}
    </li>
  );
}

/**
 * A card of rows with a quiet uppercase title, which is what a SwiftUI grouped
 * section header looks like once it has been through this product's type scale.
 */
export function GroupCard({ title, children, className = "" }) {
  return (
    <section
      className={`rounded-[20px] border border-black/[0.06] bg-white shadow-[0_5px_14px_rgba(0,0,0,0.04)] ${className}`}
    >
      {title ? (
        <h2 className="px-4 pt-4 text-[13px] font-bold uppercase tracking-wider text-app-textSecondary">
          {title}
        </h2>
      ) : null}
      <ul className={`${title ? "mt-1" : "py-1"} divide-y divide-black/[0.06]`}>{children}</ul>
    </section>
  );
}

/** The segmented control the report's range picker and the diary editor use. */
export function Segmented({ options, value, onChange, label }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex w-full gap-1 rounded-full bg-black/[0.05] p-1"
    >
      {options.map((option) => {
        const on = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={on}
            // 12.5px and one pixel of padding, so "30 days" still reads as
            // "30 days" and not "30 da…" in a 320px viewport.
            className={`min-w-0 flex-1 truncate rounded-full px-1 py-2 text-[12.5px] font-semibold xs:px-2 xs:text-[13px] ${
              on ? "bg-white text-app-textPrimary shadow-sm" : "text-app-textSecondary"
            }`}
          >
            {option.title}
          </button>
        );
      })}
    </div>
  );
}

/**
 * One answer in the progress check. The phone's AnswerButton: a full width
 * card, tinted and ringed when it is the chosen one.
 */
export function AnswerButton({ title, selected, onClick, checkmark }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      // White on the sheet's off-white, not the other way round: the sheet is
      // already #FAF9FA, so a card filled with app-background is invisible and
      // twenty-four questions become twenty-four lines of loose text.
      className={`flex w-full items-center gap-3 rounded-[14px] border-2 px-4 py-3.5 text-left text-[15px] leading-snug ${
        selected
          ? "border-app-primary/70 bg-app-primary/10 text-app-textPrimary"
          : "border-app-borderIdle bg-white text-app-textPrimary"
      }`}
    >
      <span className="min-w-0 flex-1">{title}</span>
      <span
        aria-hidden="true"
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
          selected ? "border-app-primary bg-app-primary" : "border-app-borderIdle"
        }`}
      >
        {selected && (
          <span
            className={checkmark ? "text-[11px] font-black leading-none text-white" : "block h-2 w-2 rounded-full bg-white"}
          >
            {checkmark ? "✓" : null}
          </span>
        )}
      </span>
    </button>
  );
}
