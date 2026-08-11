"use client";

// How You're Feeling.
//
// The browser's copy of "Pelvic Floor/Scene/Main/Hub/DailyCheckIn/DailySymptomView.swift"
// (ProgressDashboardView). Same screen, same title, same five trends in the same
// order, the same colour per trend and the same y-axis labels — a member who
// checked in on her phone and opens this on a laptop sees the identical picture.
//
// The data is her own users/{id}/checkins/{yyyy-MM-dd} documents, the exact
// records the phone writes and this web app writes (see lib/memberData.js). The
// value mapping for the two categorical trends — leaks and mood — is the phone's
// own, line for line:
//
//   leak   "A Few" → 1, "Several" → 2, else 0      (ProgressDashboardViewModel)
//   mood   "😊" → 2, "😐" → 1, else 0
//
// The other three (discomfort 0–10, energy 1–5, goal feeling 1–5) are the raw
// numbers she chose, plotted as-is, exactly as the phone plots them.

import { useMemo } from "react";
import { Droplet, HeartPulse, Smile, Zap, Target, FileText, ChevronRight } from "lucide-react";
import { Sheet } from "./ui";
import { goalFeelingTitle } from "@/lib/goalCopy";

// UIKit system colours, the same ones the phone's charts use.
const COLOR = {
  leak: "#007AFF", // .blue
  pain: "#FF2D55", // .pink
  mood: "#AF52DE", // .purple
  energy: "#FF9500", // .orange
  feeling: "#30B0C7", // .teal
};

const LEAK_VALUE = { "A Few": 1, Several: 2 };
const MOOD_VALUE = { "😊": 2, "😐": 1 };

/**
 * The "How You're Feeling" screen, as a sheet — like every other tool on the
 * You tab's progress card. `onOpenReport` hands off to the doctor's report,
 * which is the phone's providerReportLink at the bottom of the same screen.
 */
export default function FeelingTrendsSheet({ open, onClose, checkIns, goalId, onOpenReport }) {
  const series = useMemo(() => buildSeries(checkIns), [checkIns]);
  const hasAnyData =
    series.leak.length || series.pain.length || series.mood.length ||
    series.energy.length || series.feeling.length;

  return (
    <Sheet open={open} onClose={onClose} title="How You're Feeling">
      <p className="-mt-1 text-[13px] text-app-textSecondary">
        Your answers over time, in one place.
      </p>

      <div className="mt-4 space-y-4 pb-2">
        {!hasAnyData ? (
          <EmptyState />
        ) : (
          <>
            {series.leak.length > 0 && (
              <TrendChart
                title="Leaks"
                icon={Droplet}
                color={COLOR.leak}
                data={series.leak}
                yLabels={["None", "A Few", "Several"]}
              />
            )}
            {series.pain.length > 0 && (
              <TrendChart
                title="Discomfort"
                icon={HeartPulse}
                color={COLOR.pain}
                data={series.pain}
                yMax={10}
              />
            )}
            {series.mood.length > 0 && (
              <TrendChart
                title="Mood"
                icon={Smile}
                color={COLOR.mood}
                data={series.mood}
                yLabels={["Sad", "Neutral", "Happy"]}
              />
            )}
            {series.energy.length > 0 && (
              <TrendChart
                title="Energy"
                icon={Zap}
                color={COLOR.energy}
                data={series.energy}
                yMax={5}
              />
            )}
            {series.feeling.length > 0 && (
              <TrendChart
                title={goalFeelingTitle(goalId)}
                icon={Target}
                color={COLOR.feeling}
                data={series.feeling}
                yMax={5}
              />
            )}
          </>
        )}

        {onOpenReport && (
          <button
            type="button"
            onClick={onOpenReport}
            className="flex w-full items-center gap-3.5 rounded-[20px] border border-black/[0.06] bg-white p-4 text-left shadow-[0_5px_14px_rgba(0,0,0,0.04)]"
          >
            <span
              className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px]"
              style={{ backgroundImage: "linear-gradient(180deg, #F0708C 0%, #E65473 100%)" }}
            >
              <FileText className="h-[19px] w-[19px] text-white" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-app-textPrimary">
                Report for My Doctor
              </span>
              <span className="mt-0.5 block text-[12px] leading-snug text-app-textSecondary">
                Turn this into a PDF for your doctor or therapist.
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-app-textSecondary/50" aria-hidden="true" />
          </button>
        )}
      </div>
    </Sheet>
  );
}

// --- The chart -------------------------------------------------------------

// One trend, drawn the way the phone draws it: a smoothed line with a soft
// gradient fill under it, a dot on every check-in, categorical or numeric
// y-labels down the left, and dates along the bottom. A one-line read of the
// trend sits above it, matching the phone's trendDescription copy exactly.
function TrendChart({ title, icon: Icon, color, data, yLabels, yMax }) {
  const max = yMax != null ? yMax : (yLabels ? yLabels.length - 1 : 1);

  // The plot box, in viewBox units. Fixed geometry that scales to the container
  // width, so text stays crisp at 320px and grows on a desktop panel.
  const W = 340;
  const H = 200;
  const L = yLabels ? 58 : 30; // room for "Several" / "Neutral" on the left
  const R = 12;
  const T = 12;
  const B = 28; // room for the date row
  const plotW = W - L - R;
  const plotH = H - T - B;

  const times = data.map((d) => d.date.getTime());
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const spanT = maxT - minT;

  const xFor = (d) =>
    data.length === 1 || spanT === 0 ? L + plotW / 2 : L + ((d.date.getTime() - minT) / spanT) * plotW;
  const yFor = (v) => T + (1 - Math.min(Math.max(v, 0), max) / max) * plotH;

  const points = data.map((d) => ({ x: xFor(d), y: yFor(d.value), raw: d }));
  const linePath = smoothPath(points);
  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)},${(T + plotH).toFixed(1)} L ${points[0].x.toFixed(1)},${(T + plotH).toFixed(1)} Z`
      : "";

  // Horizontal gridlines: one per y-label, or a light 0/mid/max for numeric.
  const gridValues = yLabels ? yLabels.map((_, i) => i) : [0, max / 2, max];
  const gradientId = `feel-grad-${title.replace(/[^a-z0-9]+/gi, "")}`;

  // Date labels: first, last, and the middle one if there is room — enough to
  // orient the trend without crowding a 320px width.
  const dateTicks =
    points.length <= 1
      ? points
      : points.length === 2
        ? [points[0], points[points.length - 1]]
        : [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]];

  return (
    <section className="rounded-[20px] border border-black/[0.06] bg-white p-4 shadow-[0_5px_14px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2">
        <Icon className="h-[18px] w-[18px]" style={{ color }} aria-hidden="true" />
        <h3 className="text-[15px] font-bold" style={{ color }}>{title}</h3>
      </div>
      <p className="mt-1 text-[12.5px] text-app-textSecondary">{trendDescription(data)}</p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`${title} over time`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gridlines and y-axis labels */}
        {gridValues.map((v, i) => {
          const y = yFor(v);
          return (
            <g key={i}>
              <line x1={L} y1={y} x2={W - R} y2={y} stroke="#EBEBF0" strokeWidth="1" />
              <text
                x={L - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#737380"
              >
                {yLabels ? yLabels[i] : String(Math.round(v))}
              </text>
            </g>
          );
        })}

        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
        {points.length > 1 && (
          <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke={color} strokeWidth="2" />
        ))}

        {/* Date row */}
        {dateTicks.map((p, i) => (
          <text
            key={i}
            x={Math.min(Math.max(p.x, L + 2), W - R - 2)}
            y={H - 8}
            textAnchor={i === 0 ? "start" : i === dateTicks.length - 1 ? "end" : "middle"}
            fontSize="11"
            fill="#737380"
          >
            {dateLabel(p.raw.date)}
          </text>
        ))}
      </svg>

      {/* The same numbers, for a screen reader or a printout. */}
      <table className="sr-only">
        <caption>{title} by day</caption>
        <thead>
          <tr><th scope="col">Date</th><th scope="col">Value</th></tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <td>{dateLabel(d.date)}</td>
              <td>{yLabels ? yLabels[d.value] : d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[20px] border border-black/[0.06] bg-white p-10 text-center shadow-[0_5px_14px_rgba(0,0,0,0.04)]">
      <Target className="mx-auto h-11 w-11 text-app-primary" aria-hidden="true" />
      <p className="mt-3 text-[16px] font-bold text-app-textPrimary">No Charts Yet</p>
      <p className="mt-1.5 text-[14px] text-app-textSecondary">
        Do your first check-in and your charts start here.
      </p>
    </div>
  );
}

// --- Maths -----------------------------------------------------------------

/**
 * Turn her check-in documents into the five plotted series, oldest first.
 *
 * The day comes from the document id (the yyyy-MM-dd date key), parsed as a
 * LOCAL date so a check-in never jumps a day near midnight in a western
 * timezone; the `date` timestamp is the fallback for any legacy record without
 * a well-formed id.
 */
function buildSeries(checkIns) {
  const rows = (checkIns || [])
    .map((c) => ({ ...c, day: dayFromKey(c.id) || toDate(c.date) }))
    .filter((c) => c.day)
    .sort((a, b) => a.day - b.day);

  const leak = [];
  const pain = [];
  const mood = [];
  const energy = [];
  const feeling = [];

  for (const r of rows) {
    if (r.leakLevel != null) {
      leak.push({ date: r.day, value: LEAK_VALUE[r.leakLevel] ?? 0 });
    }
    if (typeof r.painLevel === "number") {
      pain.push({ date: r.day, value: r.painLevel });
    }
    if (r.mood) {
      mood.push({ date: r.day, value: MOOD_VALUE[r.mood] ?? 0 });
    }
    if (typeof r.energyLevel === "number") {
      energy.push({ date: r.day, value: r.energyLevel });
    }
    if (typeof r.goalFeeling === "number") {
      feeling.push({ date: r.day, value: r.goalFeeling });
    }
  }

  return { leak, pain, mood, energy, feeling };
}

/**
 * The phone's trendDescription, ported verbatim so the copy under each chart is
 * the same sentence on both devices.
 */
function trendDescription(data) {
  if (data.length < 2) return "Log another day to see your trend.";
  const first = data[0].value;
  const last = data[data.length - 1].value;
  if (last < first) {
    if (first <= 0) return "Holding steady. Keep up the great work!";
    const pct = ((first - last) / first) * 100;
    return `Down ${Math.round(pct)}% this period. Great work!`;
  }
  if (last > first) return "Trending up slightly. Stay consistent!";
  return "Holding steady. Keep up the great work!";
}

/** A yyyy-MM-dd key as a local Date, or null if it is not one. */
function dayFromKey(key) {
  if (typeof key !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === "function") return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateLabel(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * A Catmull-Rom spline through the points, emitted as cubic Béziers — the same
 * smooth curve the phone gets from `.interpolationMethod(.catmullRom)`.
 */
function smoothPath(points) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}
