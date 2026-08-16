"use client";

import { useId, useMemo } from "react";
import { Card, EmptyState, Pill, SectionHeader } from "./ui";

const WIDTH = 760;
const HEIGHT = 286;
const PLOT = { left: 42, right: 18, top: 18, bottom: 42 };

function finite(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dayValue(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  const text = typeof value === "string" ? value : "";
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00Z` : value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function dayLabel(value, compact = false) {
  const date = dayValue(value);
  if (!date) return String(value || "Unknown day");
  return date.toLocaleDateString("en-US", compact
    ? { month: "short", day: "numeric", timeZone: "UTC" }
    : { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function normalizedPoints(points, valueKey) {
  if (!Array.isArray(points)) return [];
  const sorted = points
    .map((point) => ({
      ...point,
      _date: dayValue(point?.date),
      _value: finite(point?.[valueKey]),
    }))
    .filter((point) => point._date && point._value !== null)
    .sort((left, right) => left._date - right._date);
  const latestByUtcDay = new Map();
  for (const point of sorted) latestByUtcDay.set(point._date.toISOString().slice(0, 10), point);
  return [...latestByUtcDay.values()].slice(-365);
}

function displayCount(value) {
  const number = finite(value);
  return number === null ? "—" : Math.round(number).toLocaleString("en-US");
}

/**
 * Daily snapshot chart. One point should be written per UTC day; do not
 * backfill missing days with invented values before passing them here.
 */
export default function OwnerGrowth({
  points = [],
  valueKey = "activePremium",
  title = "Active premium growth",
  description = "One verified RevenueCat snapshot per day. Tracking begins when the first snapshot is stored; earlier history is not reconstructed.",
  unitLabel = "active premium members",
  unavailableReason = "No daily premium snapshot has been recorded yet. The first real point will appear after today’s count is stored.",
  sourceLabel = "Daily snapshots",
}) {
  const data = useMemo(() => normalizedPoints(points, valueKey), [points, valueKey]);
  const rawId = useId();
  const gradientId = `pv-growth-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const chart = useMemo(() => {
    if (!data.length) return null;
    const values = data.map((point) => point._value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const padding = Math.max(1, Math.ceil((rawMax - rawMin) * 0.18));
    const min = Math.max(0, rawMin - padding);
    const max = Math.max(min + 1, rawMax + padding);
    const plotWidth = WIDTH - PLOT.left - PLOT.right;
    const plotHeight = HEIGHT - PLOT.top - PLOT.bottom;
    const coords = data.map((point, index) => ({
      ...point,
      x: PLOT.left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth),
      y: PLOT.top + ((max - point._value) / (max - min)) * plotHeight,
    }));
    const line = coords.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    const bottom = HEIGHT - PLOT.bottom;
    const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},${bottom} L${coords[0].x.toFixed(1)},${bottom} Z`;
    const ticks = Array.from({ length: 5 }, (_, index) => {
      const ratio = index / 4;
      return {
        y: PLOT.top + ratio * plotHeight,
        value: Math.round(max - ratio * (max - min)),
      };
    });
    return { coords, line, area, ticks, min, max };
  }, [data]);

  const first = data[0];
  const last = data[data.length - 1];
  const change = first && last ? last._value - first._value : null;
  const changePercent = first && last && first._value > 0 ? (change / first._value) * 100 : null;
  const changeTone = change === null || change === 0 ? "neutral" : change > 0 ? "good" : "crit";
  const trendLabel = change === null
    ? null
    : `${change > 0 ? "+" : ""}${displayCount(change)}${changePercent === null ? "" : ` · ${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%`}`;
  const accessiblePoints = data.slice(-90);

  return (
    <section aria-labelledby="owner-growth-heading">
      <SectionHeader
        id="owner-growth-heading"
        eyebrow="Daily growth"
        title={title}
        description={description}
        action={<Pill tone={changeTone}>{trendLabel || sourceLabel}</Pill>}
      />
      <Card className="overflow-hidden p-5 sm:p-6">
        {!chart ? (
          <EmptyState title="Growth tracking starts with the first snapshot" description={unavailableReason} icon="↗" />
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--pv-ink-3)" }}>Current verified total</p>
                <p className="pv-figure mt-2 text-[38px] font-semibold leading-none" style={{ color: "var(--pv-ink)" }}>{displayCount(last._value)}</p>
                <p className="mt-2 text-[12px]" style={{ color: "var(--pv-ink-2)" }}>{unitLabel} · {dayLabel(last.date)}</p>
              </div>
              <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--pv-ink-3)" }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--pv-rose)" }} aria-hidden="true" />
                Verified daily total
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl" style={{ background: "var(--pv-surface-2)", border: "1px solid var(--pv-border)" }}>
              <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="block h-auto w-full"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--pv-rose)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--pv-violet)" stopOpacity="0.015" />
                  </linearGradient>
                  <linearGradient id={`${gradientId}-line`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--pv-violet)" />
                    <stop offset="100%" stopColor="var(--pv-rose)" />
                  </linearGradient>
                </defs>

                {chart.ticks.map((tick) => (
                  <g key={`${tick.y}-${tick.value}`}>
                    <line x1={PLOT.left} x2={WIDTH - PLOT.right} y1={tick.y} y2={tick.y} stroke="var(--pv-grid)" strokeWidth="1" />
                    <text x={PLOT.left - 8} y={tick.y + 4} textAnchor="end" fontSize="10" fill="var(--pv-ink-3)">{tick.value}</text>
                  </g>
                ))}

                <path d={chart.area} fill={`url(#${gradientId})`} />
                <path d={chart.line} fill="none" stroke={`url(#${gradientId}-line)`} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

                {chart.coords.map((point, index) => (
                  <g key={`${point._date.toISOString()}-${index}`}>
                    <circle cx={point.x} cy={point.y} r="7" fill="var(--pv-surface-solid)" stroke="var(--pv-rose)" strokeWidth="2" vectorEffect="non-scaling-stroke">
                      <title>{dayLabel(point.date)}: {displayCount(point._value)} {unitLabel}</title>
                    </circle>
                  </g>
                ))}

                {[0, Math.floor((data.length - 1) / 2), data.length - 1].filter((value, index, list) => list.indexOf(value) === index).map((index) => {
                  const point = chart.coords[index];
                  const anchor = index === 0 ? "start" : index === data.length - 1 ? "end" : "middle";
                  return <text key={index} x={point.x} y={HEIGHT - 16} textAnchor={anchor} fontSize="10" fill="var(--pv-ink-3)">{dayLabel(point.date, true)}</text>;
                })}
              </svg>
            </div>

            {data.length === 1 ? (
              <p className="mt-4 text-[11px] leading-relaxed" style={{ color: "var(--pv-ink-3)" }}>Tracking started today. A trend line needs at least two real daily snapshots; no earlier days were invented.</p>
            ) : null}

            <ol className="sr-only">
              {accessiblePoints.map((point) => <li key={point._date.toISOString()}>{dayLabel(point.date)}: {displayCount(point._value)} {unitLabel}</li>)}
            </ol>
          </>
        )}
      </Card>
    </section>
  );
}

export { dayLabel, normalizedPoints };
