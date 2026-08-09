"use client";

// Every chart on /admin, drawn by hand as inline SVG. No charting library.
//
// The rules these follow, so they read as one set:
//
//   * One series per chart. Nothing here needs colour to tell two things
//     apart, so nothing here spends colour on that.
//   * Marks are thin. Columns cap at 24px, lines are 2px, dots are 8px with a
//     ring in the surface colour so they stay legible where they cross.
//   * Gridlines and axes are solid hairlines one step off the surface. Never
//     dashed.
//   * Values are labelled selectively: the newest point and the biggest one.
//     The axis, the tooltip and the numbers table carry the rest.
//   * Every chart has a title, a plain-English subtitle, a sentence for screen
//     readers, and a "Show the numbers" table. The tooltip is a bonus, never
//     the only way to read a value.
//   * Hover, tap and the arrow keys all move the same highlight.

import { useMemo, useState, useId } from "react";
import { Card, EmptyState, useElementWidth, useReducedMotion } from "./ui";

/* -------------------------------------------------------------------------
   Geometry helpers
   ------------------------------------------------------------------------- */

/** Round an axis top to something a person would say out loud. */
function niceMax(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  const scaled = value / base;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
  return step * base;
}

/** A column: square where it meets the baseline, 4px rounded at the data end. */
function columnPath(x, y, width, height, radius = 4) {
  const r = Math.max(0, Math.min(radius, width / 2, height));
  if (height <= 0.5) return "";
  return [
    `M${x},${y + height}`,
    `L${x},${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `L${x + width - r},${y}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `L${x + width},${y + height}`,
    "Z",
  ].join(" ");
}

/** A horizontal bar: square at the baseline, 4px rounded at the data end. */
function barPath(x, y, width, height, radius = 4) {
  const r = Math.max(0, Math.min(radius, height / 2, width));
  if (width <= 0.5) return "";
  return [
    `M${x},${y}`,
    `L${x + width - r},${y}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `L${x + width},${y + height - r}`,
    `Q${x + width},${y + height} ${x + width - r},${y + height}`,
    `L${x},${y + height}`,
    "Z",
  ].join(" ");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/* -------------------------------------------------------------------------
   The shell every chart sits in
   ------------------------------------------------------------------------- */

function ChartCard({ title, subtitle, summary, note, tableHead, tableRows, children, delay = 0, className = "" }) {
  const [showTable, setShowTable] = useState(false);
  const tableId = useId();

  return (
    <Card className={`pv-rise p-5 ${className}`} style={{ animationDelay: `${delay}ms` }}>
      <h3 className="text-[15px] font-semibold" style={{ color: "var(--pv-ink)" }}>
        {title}
      </h3>
      <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>
        {subtitle}
      </p>

      <p className="pv-sr">{summary}</p>

      <div className="mt-4">{children}</div>

      {note ? (
        <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--pv-ink-3)" }}>
          {note}
        </p>
      ) : null}

      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          aria-controls={tableId}
          className="min-h-[36px] text-[12px] font-semibold underline underline-offset-4"
          style={{ color: "var(--pv-ink-3)" }}
        >
          {showTable ? "Hide the numbers" : "Show the numbers"}
        </button>

        <div id={tableId} hidden={!showTable}>
          <div className="mt-3 max-h-64 overflow-auto rounded-xl" style={{ border: "1px solid var(--pv-border)" }}>
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr>
                  {tableHead.map((head, i) => (
                    <th
                      key={head}
                      scope="col"
                      className={`sticky top-0 px-3 py-2 font-semibold ${i > 0 ? "text-right" : ""}`}
                      style={{ background: "var(--pv-surface-solid)", color: "var(--pv-ink-3)" }}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row[0]} style={{ borderTop: "1px solid var(--pv-border)" }}>
                    {row.map((cell, i) => (
                      <td
                        key={i}
                        className={`px-3 py-2 ${i > 0 ? "pv-tabular text-right" : ""}`}
                        style={{ color: i > 0 ? "var(--pv-ink)" : "var(--pv-ink-2)" }}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------
   Time series: columns or a line with a wash under it
   ------------------------------------------------------------------------- */

// The top pad is deliberately roomy: a bar at the top of the scale still needs
// somewhere to put its value label that is not on top of the bar.
const PAD = { left: 42, right: 14, top: 24, bottom: 26 };

/**
 * How much room the y-axis labels need.
 * "$2,000" is wider than "20", and a fixed gutter clips the dollar sign off
 * the front of it. Measure the longest label instead of guessing.
 */
function axisGutter(labels) {
  const longest = labels.reduce((n, label) => Math.max(n, String(label).length), 1);
  return clamp(14 + longest * 7, 34, 78);
}

export function TimeSeriesChart({
  title,
  subtitle,
  note,
  buckets,
  values,
  mode = "column",
  color = "var(--pv-series-1)",
  formatValue = (n) => Math.round(n).toLocaleString("en-US"),
  formatAxis,
  valueNoun = "members",
  emptyTitle = "Nothing to plot yet",
  emptyDescription,
  delay = 0,
}) {
  const [wrapRef, width] = useElementWidth(560);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(null);
  const gradientId = `pv-area-${useId().replace(/:/g, "")}`;

  const plotHeight = width < 520 ? 168 : 210;
  const height = plotHeight + PAD.top + PAD.bottom;
  const count = buckets.length;

  const model = useMemo(() => {
    if (count === 0) return null;
    const axisFormatter = formatAxis || ((n) => Math.round(n).toLocaleString("en-US"));
    const safe = values.map((v) => (Number.isFinite(v) ? v : 0));
    const max = niceMax(Math.max(...safe, 0));
    // Drop a midpoint that reads the same as one of its neighbours. On a chart
    // whose top is 1 the axis was labelled "$0 / $1 / $1", because 0.5 rounds
    // up into the same string. Two gridlines with the same number on them make
    // the scale unreadable, and this is exactly the shape an all-zero series
    // produces, which is the one a demo is most likely to be looking at.
    const midLabel = axisFormatter(max / 2);
    const keepMid = midLabel !== axisFormatter(0) && midLabel !== axisFormatter(max);
    const gridValues = keepMid ? [0, max / 2, max] : [0, max];
    const left = axisGutter(gridValues.map(axisFormatter));
    const innerWidth = Math.max(40, width - left - PAD.right);
    const band = innerWidth / count;
    const yFor = (v) => PAD.top + plotHeight - (clamp(v, 0, max) / max) * plotHeight;
    const points = buckets.map((bucket, i) => ({
      bucket,
      value: safe[i] ?? 0,
      cx: left + band * (i + 0.5),
      y: yFor(safe[i] ?? 0),
    }));
    return { max, gridValues, left, innerWidth, band, yFor, points, axisFormatter };
  }, [buckets, values, count, width, plotHeight, formatAxis]);

  const stats = useMemo(() => {
    if (count === 0) return null;
    let total = 0;
    let maxIndex = 0;
    for (let i = 0; i < values.length; i += 1) {
      const v = Number.isFinite(values[i]) ? values[i] : 0;
      total += v;
      if (v > (Number.isFinite(values[maxIndex]) ? values[maxIndex] : 0)) maxIndex = i;
    }
    return { total, maxIndex, lastIndex: count - 1 };
  }, [values, count]);

  const summary = useMemo(() => {
    if (!stats || count === 0) return "There is nothing to plot yet.";
    const last = values[stats.lastIndex] || 0;
    const peak = values[stats.maxIndex] || 0;
    const totalLine =
      mode === "column"
        ? `Across the whole period that is ${formatValue(stats.total)} ${valueNoun} in total. `
        : "";
    return (
      `${title}. ${subtitle} ` +
      `${count} periods are plotted, from ${buckets[0].longLabel} to ${buckets[count - 1].longLabel}. ` +
      totalLine +
      `The highest was ${formatValue(peak)} in ${buckets[stats.maxIndex].longLabel}. ` +
      `The most recent, ${buckets[stats.lastIndex].longLabel}, was ${formatValue(last)}.`
    );
  }, [stats, count, values, buckets, title, subtitle, mode, formatValue, valueNoun]);

  const tableRows = useMemo(
    () => buckets.map((b, i) => [b.longLabel, formatValue(Number.isFinite(values[i]) ? values[i] : 0)]),
    [buckets, values, formatValue]
  );

  if (count === 0) {
    return (
      <ChartCard
        title={title}
        subtitle={subtitle}
        summary={summary}
        note={note}
        tableHead={["Period", "Value"]}
        tableRows={[]}
        delay={delay}
      >
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </ChartCard>
    );
  }

  const { gridValues, left: padLeft, band, points, axisFormatter } = model;
  const labelStride = Math.max(1, Math.ceil(count / (width < 520 ? 4 : 7)));
  const barWidth = Math.max(3, Math.min(24, band - (band > 12 ? 6 : 2)));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.cx.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1].cx.toFixed(2)},${(PAD.top + plotHeight).toFixed(2)} ` +
        `L${points[0].cx.toFixed(2)},${(PAD.top + plotHeight).toFixed(2)} Z`
      : "";

  // The dash used to draw the line on has to be at least as long as the line,
  // or the tail never arrives. Measure it rather than guessing.
  let lineLength = 0;
  for (let i = 1; i < points.length; i += 1) {
    lineLength += Math.hypot(points[i].cx - points[i - 1].cx, points[i].y - points[i - 1].y);
  }
  lineLength = Math.ceil(lineLength) + 8;

  const activePoint = active !== null ? points[active] : null;
  const labelledIndexes = new Set([stats.lastIndex, stats.maxIndex]);

  const pickFromClientX = (clientX, target) => {
    const rect = target.getBoundingClientRect();
    const x = clientX - rect.left - padLeft;
    const index = clamp(Math.floor(x / band), 0, count - 1);
    setActive(index);
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => clamp((i === null ? count - 1 : i) + 1, 0, count - 1));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => clamp((i === null ? count - 1 : i) - 1, 0, count - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(count - 1);
    } else if (event.key === "Escape") {
      setActive(null);
    }
  };

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      summary={summary}
      note={note}
      tableHead={["Period", "Value"]}
      tableRows={tableRows}
      delay={delay}
    >
      <div ref={wrapRef} className="relative w-full">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={summary}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          onPointerMove={(e) => pickFromClientX(e.clientX, e.currentTarget)}
          onPointerDown={(e) => pickFromClientX(e.clientX, e.currentTarget)}
          onPointerLeave={() => setActive(null)}
          style={{ display: "block", touchAction: "pan-y" }}
        >
          {/* Gridlines: solid hairlines, one step off the surface. */}
          {gridValues.map((v) => {
            const y = model.yFor(v);
            return (
              <g key={v}>
                <line
                  x1={padLeft}
                  x2={width - PAD.right}
                  y1={y}
                  y2={y}
                  stroke={v === 0 ? "var(--pv-axis)" : "var(--pv-grid)"}
                  strokeWidth="1"
                  shapeRendering="crispEdges"
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="pv-tabular"
                  fontSize="11"
                  fill="var(--pv-ink-3)"
                >
                  {axisFormatter(v)}
                </text>
              </g>
            );
          })}

          {/* The marks */}
          {mode === "column"
            ? points.map((p, i) => {
                const y = p.y;
                const barHeight = PAD.top + plotHeight - y;
                const d = columnPath(p.cx - barWidth / 2, y, barWidth, barHeight);
                if (!d) return null;
                return (
                  <path
                    key={p.bucket.key}
                    d={d}
                    fill={color}
                    opacity={active === null || active === i ? 1 : 0.45}
                    className={reduced ? undefined : "pv-grow-y"}
                    style={
                      reduced
                        ? undefined
                        : { animationDelay: `${Math.min(i * 18, 420)}ms`, transformBox: "fill-box" }
                    }
                  />
                );
              })
            : (
              <>
                {/* A wash, not a block: strongest just under the line and gone
                    by the baseline, so the line stays the loudest thing. */}
                <defs>
                  <linearGradient id={`${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.01" />
                  </linearGradient>
                </defs>
                <path
                  d={areaPath}
                  fill={`url(#${gradientId})`}
                  className={reduced ? undefined : "pv-fade"}
                />
                <path
                  d={linePath}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={reduced ? undefined : "pv-draw"}
                  style={
                    reduced
                      ? undefined
                      : {
                          strokeDasharray: `${lineLength}`,
                          "--pv-draw-length": `${lineLength}`,
                        }
                  }
                />
                {/* End marker, 8px with a 2px ring in the surface colour. */}
                <circle
                  cx={points[points.length - 1].cx}
                  cy={points[points.length - 1].y}
                  r="4"
                  fill={color}
                  stroke="var(--pv-surface-solid)"
                  strokeWidth="2"
                  className={reduced ? undefined : "pv-fade"}
                  style={reduced ? undefined : { animationDelay: "700ms" }}
                />
              </>
            )}

          {/* Selective direct labels: the newest point and the biggest one.
              They stand down while a point is being inspected. */}
          {(active === null ? [...labelledIndexes] : []).map((i) => {
            const p = points[i];
            if (!p || p.value <= 0) return null;
            const anchor = p.cx < padLeft + 26 ? "start" : p.cx > width - PAD.right - 26 ? "end" : "middle";
            return (
              <text
                key={`label-${p.bucket.key}`}
                x={p.cx}
                y={Math.max(12, p.y - 8)}
                textAnchor={anchor}
                fontSize="11"
                fontWeight="600"
                fill="var(--pv-ink-2)"
                className={reduced ? undefined : "pv-fade"}
                style={reduced ? undefined : { animationDelay: "620ms" }}
              >
                {formatValue(p.value)}
              </text>
            );
          })}

          {/* Crosshair for whichever point is active. */}
          {activePoint ? (
            <g pointerEvents="none">
              <line
                x1={activePoint.cx}
                x2={activePoint.cx}
                y1={PAD.top}
                y2={PAD.top + plotHeight}
                stroke="var(--pv-axis)"
                strokeWidth="1"
              />
              <circle
                cx={activePoint.cx}
                cy={activePoint.y}
                r="4.5"
                fill={color}
                stroke="var(--pv-surface-solid)"
                strokeWidth="2"
              />
            </g>
          ) : null}

          {/* X labels, thinned out so they never collide. */}
          {points.map((p, i) => {
            if (i % labelStride !== 0 && i !== count - 1) return null;
            if (i !== count - 1 && count - 1 - i < labelStride * 0.6) return null;
            const anchor = i === 0 ? "start" : i === count - 1 ? "end" : "middle";
            const x = i === 0 ? padLeft : i === count - 1 ? width - PAD.right : p.cx;
            return (
              <text
                key={`x-${p.bucket.key}`}
                x={x}
                y={height - 8}
                textAnchor={anchor}
                fontSize="11"
                fill="var(--pv-ink-3)"
              >
                {p.bucket.label}
              </text>
            );
          })}
        </svg>

        {activePoint ? (
          <div
            role="status"
            className="pointer-events-none absolute z-10 rounded-xl px-3 py-2 text-[12px] font-semibold shadow-lg"
            style={{
              background: "var(--pv-surface-solid)",
              border: "1px solid var(--pv-border-strong)",
              color: "var(--pv-ink)",
              left: clamp(activePoint.cx - 70, 4, Math.max(4, width - 144)),
              top: 4,
              width: 140,
            }}
          >
            <span className="block font-semibold" style={{ color: "var(--pv-ink-3)" }}>
              {activePoint.bucket.longLabel}
            </span>
            <span className="pv-tabular block text-base" style={{ color: "var(--pv-ink)" }}>
              {formatValue(activePoint.value)}
            </span>
          </div>
        ) : null}
      </div>
    </ChartCard>
  );
}

/* -------------------------------------------------------------------------
   Horizontal bars, for a breakdown
   ------------------------------------------------------------------------- */

const ROW_HEIGHT = 46;
const BAR_HEIGHT = 10;

/**
 * `colors` takes either one colour (a plain breakdown, where the categories
 * have no order) or one colour per row (a scale, where they do, such as how
 * far through the 90 days someone is).
 */
export function BarListChart({
  title,
  subtitle,
  note,
  rows,
  colors = "var(--pv-series-1)",
  total,
  unitNoun = "members",
  emptyTitle = "Nothing to break down yet",
  emptyDescription,
  delay = 0,
  className = "",
}) {
  const [wrapRef, width] = useElementWidth(560);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(null);

  const count = rows.length;
  const sum = Number.isFinite(total) ? total : rows.reduce((acc, r) => acc + (r.value || 0), 0);
  const max = Math.max(1, ...rows.map((r) => r.value || 0));
  const height = Math.max(ROW_HEIGHT, count * ROW_HEIGHT);
  const barArea = Math.max(40, width - 4);

  const summary = useMemo(() => {
    if (count === 0) return "There is nothing to break down yet.";
    const parts = rows.map((r) => {
      const share = sum > 0 ? Math.round((r.value / sum) * 100) : 0;
      return `${r.label}, ${r.value.toLocaleString("en-US")} ${unitNoun}, ${share} percent`;
    });
    return `${title}. ${subtitle} ${parts.join(". ")}.`;
  }, [rows, sum, count, title, subtitle, unitNoun]);

  const tableRows = useMemo(
    () =>
      rows.map((r) => [
        r.label,
        (r.value || 0).toLocaleString("en-US"),
        sum > 0 ? `${Math.round((r.value / sum) * 100)}%` : "0%",
      ]),
    [rows, sum]
  );

  if (count === 0) {
    return (
      <ChartCard
        title={title}
        subtitle={subtitle}
        summary={summary}
        note={note}
        tableHead={["Group", unitNoun === "members" ? "Members" : "Value", "Share"]}
        tableRows={[]}
        delay={delay}
        className={className}
      >
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </ChartCard>
    );
  }

  const colorFor = (index) => (Array.isArray(colors) ? colors[index % colors.length] : colors);

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      summary={summary}
      note={note}
      tableHead={["Group", unitNoun === "members" ? "Members" : "Value", "Share"]}
      tableRows={tableRows}
      delay={delay}
      className={className}
    >
      <div ref={wrapRef} className="relative w-full">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={summary}
          style={{ display: "block" }}
        >
          {rows.map((row, i) => {
            const y = i * ROW_HEIGHT;
            const value = Number.isFinite(row.value) ? row.value : 0;
            const barWidth = (value / max) * barArea;
            const share = sum > 0 ? Math.round((value / sum) * 100) : 0;
            const dimmed = active !== null && active !== i;
            return (
              <g
                key={row.id}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
              >
                <rect x="0" y={y} width={Math.max(1, width)} height={ROW_HEIGHT} fill="transparent" />
                <text x="0" y={y + 14} fontSize="12.5" fontWeight="600" fill="var(--pv-ink)">
                  {row.label}
                </text>
                <text
                  x={width}
                  y={y + 14}
                  textAnchor="end"
                  fontSize="12.5"
                  fontWeight="600"
                  className="pv-tabular"
                  fill="var(--pv-ink-2)"
                >
                  {value.toLocaleString("en-US")}
                  <tspan fill="var(--pv-ink-3)" fontWeight="500">{` · ${share}%`}</tspan>
                </text>
                <rect
                  x="0"
                  y={y + 22}
                  width={barArea}
                  height={BAR_HEIGHT}
                  rx={BAR_HEIGHT / 2}
                  fill="var(--pv-track)"
                />
                <path
                  d={barPath(0, y + 22, barWidth, BAR_HEIGHT)}
                  fill={colorFor(i)}
                  opacity={dimmed ? 0.5 : 1}
                  className={reduced ? undefined : "pv-grow-x"}
                  style={
                    reduced
                      ? undefined
                      : { animationDelay: `${Math.min(i * 60, 400)}ms`, transformBox: "fill-box" }
                  }
                />
              </g>
            );
          })}
        </svg>
      </div>
    </ChartCard>
  );
}

/** Shown in place of a chart when the data behind it genuinely does not exist. */
export function UnavailableChart({ title, subtitle, reason, delay = 0 }) {
  return (
    <Card className="pv-rise p-5" style={{ animationDelay: `${delay}ms` }}>
      <h3 className="text-[15px] font-semibold" style={{ color: "var(--pv-ink)" }}>
        {title}
      </h3>
      <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>
        {subtitle}
      </p>
      <EmptyState title="No numbers for this yet" description={reason} icon="○" />
    </Card>
  );
}
