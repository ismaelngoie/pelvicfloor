"use client";

// Screen 3. Six promises arranged around one idea.
//
// The constellation is measured, not guessed. Tile text is sized in rem so it
// grows with whatever base font size she has set, and the ring radius is then
// computed from the space that is actually left. When the ring will not fit,
// the layout falls back to a plain two-column grid rather than shrinking the
// words. Text that is smaller than her default is not a degraded layout, it is
// a layout she cannot read.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { goalById, goalSentencePhrase } from "@/lib/program";
import { HOW_IT_HELPS_CTA, howItHelps } from "./copy";
import SFIcon from "./icons";
import {
  PrimaryButton, ScreenHeader, ScrollMoreHint, useHasMoreBelow, useIsomorphicLayoutEffect,
} from "./ui";

// In rem, so every one of these grows with the member's base font size.
const TILE_W = 6.5;
const TILE_H = 5.75;
const HUB_R = 2.2;
const MIN_RING_R = 5.6;

function Tile({ tile, index, style }) {
  return (
    <div
      className="funnel-pop flex flex-col items-center justify-center gap-1.5 rounded-[18px] bg-white px-2 py-3 text-center shadow-[0_4px_10px_rgba(0,0,0,0.06)]"
      style={{ animationDelay: `${0.25 + index * 0.15}s`, ...style }}
    >
      <SFIcon name={tile.icon} size={26} className="text-app-primary" strokeWidth={1.9} />
      <span className="text-[0.8125rem] font-medium leading-[1.15] text-app-textPrimary">
        {tile.text}
      </span>
    </div>
  );
}

function Hub({ icon, className = "", style }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-white/70 ${className}`}
      style={style}
      aria-hidden="true"
    >
      <SFIcon name={icon} size={44} className="text-app-primary" strokeWidth={1.3} />
    </div>
  );
}

export default function HowPelviHelpsScreen({ goalId, onNext, onBack }) {
  const goal = goalById(goalId);
  const block = howItHelps(goal.id);
  const phrase = goalSentencePhrase(goal.id);

  const areaRef = useRef(null);
  const gridScroll = useHasMoreBelow();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [rem, setRem] = useState(16);

  const measure = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    const root = parseFloat(getComputedStyle(document.documentElement).fontSize);
    if (root > 0) setRem(root);
    const rect = el.getBoundingClientRect();
    setBox({ w: rect.width, h: rect.height });
  }, []);

  // Measured before the first paint, so the layout is decided once rather than
  // rendering as a grid and then jumping into a ring a frame later.
  useIsomorphicLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rotation, a keyboard opening, a font size change: re-measure and re-decide.
  // The root font size is re-read every time rather than cached from mount,
  // because the tiles are sized in rem: read it once and a member who changes
  // her browser text size gets a ring laid out for the size she used to have.
  useEffect(() => {
    const el = areaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tileW = TILE_W * rem;
  const tileH = TILE_H * rem;

  // Two radii, not one. A phone is much taller than it is wide, so a true
  // circle is capped by the width and leaves a band of nothing above and below
  // it. Letting the vertical radius stretch, up to a third again, fills the
  // space without the ring reading as squashed.
  const rx = (box.w - tileW) / 2 - 0.25 * rem;
  const ry = Math.min((box.h - tileH) / 2 - 0.25 * rem, rx * 1.35);
  const measured = box.w > 0 && box.h > 0;
  const asRing = measured && rx >= MIN_RING_R * rem && ry >= MIN_RING_R * rem;

  const cx = box.w / 2;
  const cy = box.h / 2;
  const points = block.tiles.map((_, i) => {
    const angle = ((-90 + i * 60) * Math.PI) / 180;
    return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-app-background">
      <div className="shrink-0 px-5 pt-[max(env(safe-area-inset-top),14px)] tab:pt-4">
        <ScreenHeader onBack={onBack} railStep={2} railFraction={1} />
        <h1 className="mt-8 text-center text-[26px] font-bold leading-[1.04] tracking-[-0.4px] text-app-textPrimary sm:text-[30px]">
          Here&apos;s how we&apos;ll <span className="font-extrabold">{phrase}</span>
        </h1>
        <p className="mx-auto mt-3 max-w-[21rem] text-center text-[14px] leading-[1.18] text-app-textSecondary sm:text-[16px]">
          {block.subtitle}
        </p>
      </div>

      <div ref={areaRef} className="relative min-h-0 flex-1 px-3 py-3">
        {asRing ? (
          <>
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              width={box.w}
              height={box.h}
              viewBox={`0 0 ${box.w} ${box.h}`}
            >
              {points.map((p, i) => {
                const dx = p.x - cx;
                const dy = p.y - cy;
                const len = Math.hypot(dx, dy) || 1;
                const ux = dx / len;
                const uy = dy / len;
                const start = HUB_R * rem + 4;
                const end = len - tileH / 2 - 2;
                return (
                  <line
                    key={i}
                    x1={cx + ux * start}
                    y1={cy + uy * start}
                    x2={cx + ux * end}
                    y2={cy + uy * end}
                    stroke="#EBEBF0"
                    strokeWidth={1.5}
                    strokeDasharray="3 5"
                    className="funnel-draw"
                    style={{
                      strokeDashoffset: 120,
                      animationDelay: `${0.15 + i * 0.12}s`,
                      "--funnel-draw-duration": "0.7s",
                    }}
                  />
                );
              })}
            </svg>

            <Hub
              icon={block.hub}
              className="funnel-fade absolute"
              style={{
                left: cx - HUB_R * rem,
                top: cy - HUB_R * rem,
                width: HUB_R * 2 * rem,
                height: HUB_R * 2 * rem,
              }}
            />

            {block.tiles.map((tile, i) => (
              <Tile
                key={tile.text}
                tile={tile}
                index={i}
                style={{
                  position: "absolute",
                  left: points[i].x - tileW / 2,
                  top: points[i].y - tileH / 2,
                  width: tileW,
                  minHeight: tileH,
                }}
              />
            ))}
          </>
        ) : (
          <>
            <div
              ref={gridScroll.ref}
              onScroll={gridScroll.onScroll}
              className="h-full overflow-y-auto overscroll-contain no-scrollbar px-2 pb-6"
            >
              <div className="flex justify-center pb-3">
                <Hub icon={block.hub} className="h-[3.5rem] w-[3.5rem]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {block.tiles.map((tile, i) => (
                  <Tile key={tile.text} tile={tile} index={i} style={{ minHeight: tileH }} />
                ))}
              </div>
            </div>
            <ScrollMoreHint visible={gridScroll.hasMore} />
          </>
        )}
      </div>

      <div className="shrink-0 px-8 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 tab:pb-5">
        <PrimaryButton onClick={onNext}>{HOW_IT_HELPS_CTA}</PrimaryButton>
      </div>
    </div>
  );
}
