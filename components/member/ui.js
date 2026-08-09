"use client";

// The small shared pieces every tab uses: cards, section headers, the exercise
// thumbnail, and the sheet.

import { useEffect, useRef, useState } from "react";
import { Check, Heart, Play, X } from "lucide-react";
import { coachLabel, durationLabel, itemDescription, tagLabel } from "@/lib/library";

export function Card({ className = "", as: Tag = "section", ...rest }) {
  return (
    <Tag
      className={`rounded-[20px] border border-black/[0.06] bg-white p-4 shadow-[0_5px_14px_rgba(0,0,0,0.04)] ${className}`}
      {...rest}
    />
  );
}

export function SectionHeader({ title, subtitle, action, id }) {
  return (
    <div className="flex items-end justify-between gap-3 px-1">
      <div className="min-w-0">
        <h2 id={id} className="text-[19px] font-bold leading-tight text-app-textPrimary">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-app-textSecondary">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * A stable, deterministic tint per exercise so a shelf looks like a shelf
 * before a single byte of video is fetched.
 */
function tintFor(id) {
  let hash = 0;
  for (let i = 0; i < (id || "").length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 360;
  return `linear-gradient(150deg, hsl(${hash} 62% 88%) 0%, hsl(${(hash + 38) % 360} 58% 79%) 100%)`;
}

/**
 * The exercise thumbnail.
 *
 * There are no thumbnail images: the iOS app grabs a frame from the video
 * itself. The web does the same, except it only mounts the <video> once the
 * card is actually near the viewport, so opening a 533 item library does not
 * start 533 downloads. `preload="metadata"` plus a media fragment asks the
 * browser for one frame, not the file.
 */
export function ExerciseThumb({ item, className = "", eager = false }) {
  const holderRef = useRef(null);
  const [visible, setVisible] = useState(eager);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (visible || typeof IntersectionObserver === "undefined") {
      if (typeof IntersectionObserver === "undefined") setVisible(true);
      return undefined;
    }
    const node = holderRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={holderRef}
      className={`relative overflow-hidden bg-app-borderIdle ${className}`}
      style={{ backgroundImage: tintFor(item?.id) }}
    >
      {visible && item?.url && (
        <video
          src={`${item.url}#t=0.6`}
          className={`h-full w-full object-cover transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          aria-hidden="true"
          onLoadedData={() => setReady(true)}
        />
      )}
    </div>
  );
}

/** One exercise, as a tappable card. Used by every shelf and every result list. */
export function ExerciseCard({
  item, onPlay, onToggleSaved, saved, watched, layout = "tile",
}) {
  const isRow = layout === "row";
  return (
    <div className={`relative ${isRow ? "flex items-center gap-3" : "w-[164px] shrink-0"}`}>
      <button
        type="button"
        onClick={() => onPlay(item)}
        aria-label={`Play ${itemDescription(item)}`}
        className={isRow ? "flex flex-1 items-center gap-3 text-left" : "block w-full text-left"}
      >
        <span className={`relative block ${isRow ? "w-[104px] shrink-0" : ""}`}>
          <ExerciseThumb
            item={item}
            className={isRow ? "aspect-video rounded-xl" : "aspect-video w-full rounded-[14px]"}
          />
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-black/45 backdrop-blur-[2px]">
              <Play className="h-4 w-4 translate-x-[1px] fill-white text-white" aria-hidden="true" />
            </span>
          </span>
          {item.durationSeconds > 0 && (
            <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white">
              {durationLabel(item.durationSeconds)}
            </span>
          )}
          {watched && (
            <span className="pointer-events-none absolute left-1.5 top-1.5 flex items-center gap-1 rounded-md bg-app-positive px-1.5 py-0.5 text-[10px] font-semibold text-white">
              <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
              Done
            </span>
          )}
        </span>
        <span className={`block ${isRow ? "min-w-0 flex-1 pr-1" : "pt-2 pr-9"}`}>
          <span className={`block font-semibold leading-snug text-app-textPrimary ${isRow ? "text-[14px]" : "line-clamp-2 text-[13px]"}`}>
            {item.title}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-app-textSecondary">
            {[coachLabel(item.coach), item.tags?.[0] ? tagLabel(item.tags[0]) : null]
              .filter(Boolean)
              .join(" · ") || "Exercise"}
          </span>
        </span>
      </button>

      {onToggleSaved && (
        <button
          type="button"
          onClick={() => onToggleSaved(item.id)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${item.title} from saved` : `Save ${item.title}`}
          className={`grid h-11 w-11 place-items-center rounded-full ${
            isRow ? "shrink-0" : "absolute bottom-0 right-0"
          }`}
        >
          <Heart
            className={`h-[18px] w-[18px] ${saved ? "fill-ios-pink text-ios-pink" : "text-app-textSecondary"}`}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}

/** A horizontally scrolling row of exercises. */
export function ExerciseShelf({ title, subtitle, items, onPlay, onToggleSaved, savedSet, watchedSet, onSeeAll }) {
  if (!items?.length) return null;
  const headingId = `shelf-${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  return (
    <section aria-labelledby={headingId}>
      <SectionHeader
        id={headingId}
        title={title}
        subtitle={subtitle}
        action={
          onSeeAll && (
            <button
              type="button"
              onClick={onSeeAll}
              className="shrink-0 text-[13px] font-semibold text-ios-pink"
            >
              See all
            </button>
          )
        }
      />
      <ul className="mt-3 flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar">
        {items.map((item) => (
          <li key={item.id}>
            <ExerciseCard
              item={item}
              onPlay={() => onPlay(item, items)}
              onToggleSaved={onToggleSaved}
              saved={savedSet?.has(item.id)}
              watched={watchedSet?.has(item.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A bottom sheet. Used for filters, the check-in and the goal change. */
export function Sheet({ open, onClose, title, children, labelledBy }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const headingId = labelledBy || "sheet-title";

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative max-h-[86vh] overflow-y-auto rounded-t-[28px] bg-app-background pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-black/[0.06] bg-app-background/95 px-5 py-4 backdrop-blur">
          <h2 id={headingId} className="text-[17px] font-bold text-app-textPrimary">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full bg-black/5"
          >
            <X className="h-4 w-4 text-app-textPrimary" aria-hidden="true" />
          </button>
        </div>
        <div className="px-5 pt-4">{children}</div>
      </div>
    </div>
  );
}

/** A filter chip with its live count. */
export function FilterChip({ label, count, on, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={ariaLabel || (count != null ? `${label}, ${count} exercises` : label)}
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium ${
        on
          ? "border-ios-pink bg-ios-pink text-white"
          : "border-app-borderIdle bg-white text-app-textPrimary"
      }`}
    >
      <span>{label}</span>
      {count != null && (
        <span className={on ? "text-white/75" : "text-app-textSecondary"}>{count}</span>
      )}
    </button>
  );
}

export function PrimaryButton({ className = "", ...rest }) {
  return (
    <button
      type="button"
      className={`flex h-14 w-full items-center justify-center rounded-full bg-ios-pink text-[17px] font-bold text-white disabled:bg-app-borderIdle disabled:text-app-textSecondary ${className}`}
      {...rest}
    />
  );
}
