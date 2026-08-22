"use client";

// The admin's primitive kit. Every screen is built from these, and only these
// reach for design tokens directly — pages compose, they do not style.

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";

/* -------------------------------------------------------------------------
   Hooks
   ------------------------------------------------------------------------- */

export function useElementWidth(fallback = 640) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const next = Math.round(entry.contentRect.width);
        if (next > 0) setWidth(next);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function useEscape(handler, active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (event) => { if (event.key === "Escape") handler(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handler, active]);
}

export function useOutsideClick(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const onDown = (event) => { if (ref.current && !ref.current.contains(event.target)) handler(); };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);
    return () => { window.removeEventListener("mousedown", onDown); window.removeEventListener("touchstart", onDown); };
  }, [ref, handler, active]);
}

export function useTransientMessage(timeout = 4000) {
  const [message, setMessage] = useState(null);
  const timer = useRef(null);
  const show = useCallback((next) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    if (next) timer.current = setTimeout(() => setMessage(null), timeout);
  }, [timeout]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return [message, show];
}

/* -------------------------------------------------------------------------
   Formatting (thin wrappers so every page formats identically)
   ------------------------------------------------------------------------- */

export function money(value, currency = "USD", { compact = false, exact = false, rounded = false } = {}) {
  if (!Number.isFinite(value)) return null;
  if (compact && Math.abs(value) >= 10000) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  const digits = rounded ? 0 : exact || Math.abs(value) < 1000 ? 2 : 0;
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}
export function count(value) {
  if (!Number.isFinite(value)) return null;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}
export function percent(value, digits = 1) {
  if (!Number.isFinite(value)) return null;
  return `${value.toFixed(digits)}%`;
}
export function ratio(part, whole, digits = 0) {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return null;
  return `${((part / whole) * 100).toFixed(digits)}%`;
}
export function shortDate(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
export function relativeTime(value, now = Date.now()) {
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

/* -------------------------------------------------------------------------
   Icons — a tiny, consistent set (16/18px, 1.6 stroke)
   ------------------------------------------------------------------------- */

const I = ({ children, ...rest }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>{children}</svg>
);
export const Icons = {
  pulse: (p) => <I {...p}><path d="M3 12h4l3-8 4 16 3-8h4"/></I>,
  revenue: (p) => <I {...p}><path d="M4 19V5M4 19h16M8 15l4-5 3 3 5-7"/></I>,
  acquisition: (p) => <I {...p}><path d="M4 6h16l-6 7v5l-4 2v-7z"/></I>,
  coach: (p) => <I {...p}><path d="M4 5.5h16v11H9l-5 4z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></I>,
  members: (p) => <I {...p}><circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16 4.5a3.2 3.2 0 0 1 0 6.4M21 19c0-2.6-1.6-4.4-4-5"/></I>,
  retention: (p) => <I {...p}><path d="M4 4v16h16"/><path d="M8 14l3-3 3 2 5-6"/></I>,
  programs: (p) => <I {...p}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></I>,
  book: (p) => <I {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/></I>,
  search: (p) => <I {...p}><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></I>,
  sun: (p) => <I {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></I>,
  moon: (p) => <I {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></I>,
  chevron: (p) => <I {...p}><path d="M6 9l6 6 6-6"/></I>,
  close: (p) => <I {...p}><path d="M6 6l12 12M18 6L6 18"/></I>,
  check: (p) => <I {...p}><path d="M5 12l5 5L20 7"/></I>,
  alert: (p) => <I {...p}><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/></I>,
  spark: (p) => <I {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></I>,
  refresh: (p) => <I {...p}><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/></I>,
  arrow: (p) => <I {...p}><path d="M5 12h14M13 6l6 6-6 6"/></I>,
  external: (p) => <I {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></I>,
  send: (p) => <I {...p}><path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/></I>,
  logout: (p) => <I {...p}><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h9"/></I>,
  plus: (p) => <I {...p}><path d="M12 5v14M5 12h14"/></I>,
  minus: (p) => <I {...p}><path d="M5 12h14"/></I>,
  sidebar: (p) => <I {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></I>,
  app: (p) => <I {...p}><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9h6v6H9z"/></I>,
  grip: (p) => <I {...p}><circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/></I>,
  up: (p) => <I {...p}><path d="M12 19V5M6 11l6-6 6 6"/></I>,
  down: (p) => <I {...p}><path d="M12 5v14M6 13l6 6 6-6"/></I>,
  dots: (p) => <I {...p}><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></I>,
};

/* -------------------------------------------------------------------------
   Surfaces
   ------------------------------------------------------------------------- */

export function Card({ as: Tag = "section", className = "", pad = false, hover = false, children, style, ...rest }) {
  return (
    <Tag className={`pv-card ${pad ? "pv-card-pad" : ""} ${className}`} data-hover={hover ? "" : undefined} style={style} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHead({ label, info, right, children }) {
  return (
    <div className="pv-card-head">
      <span className="pv-label">
        {label}
        {info ? <InfoTip {...(typeof info === "string" ? { body: info } : info)} /> : null}
      </span>
      {right ? <div className="flex items-center gap-2">{right}</div> : children}
    </div>
  );
}

export function PageHead({ title, description, right }) {
  return (
    <div className="pv-page-head">
      <div>
        <h1 className="pv-h1">{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {right ? <div className="flex items-center gap-2 flex-wrap">{right}</div> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Controls
   ------------------------------------------------------------------------- */

export function Button({ variant = "default", size, className = "", children, ...rest }) {
  const cls = ["pv-btn", variant === "primary" ? "pv-btn-primary" : variant === "ghost" ? "pv-btn-ghost" : "", size === "sm" ? "pv-btn-sm" : "", className].join(" ");
  return <button type="button" className={cls} {...rest}>{children}</button>;
}

export function IconButton({ label, children, className = "", ...rest }) {
  return <button type="button" className={`pv-icon-btn ${className}`} aria-label={label} title={label} {...rest}>{children}</button>;
}

export function Chip({ on = false, children, className = "", ...rest }) {
  return <button type="button" className={`pv-chip ${className}`} data-on={on ? "true" : undefined} {...rest}>{children}</button>;
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="pv-seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button type="button" key={option.value} aria-pressed={option.value === value} onClick={() => onChange(option.value)} disabled={option.disabled}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Pill({ tone = "neutral", dot = false, children }) {
  return <span className="pv-pill" data-tone={tone}>{dot ? <i /> : null}{children}</span>;
}

export function Field({ label, hint, htmlFor, children }) {
  return (
    <div>
      {label ? <label className="pv-field-label" htmlFor={htmlFor}>{label}</label> : null}
      {children}
      {hint ? <p className="pv-field-hint">{hint}</p> : null}
    </div>
  );
}
export function Input({ className = "", ...rest }) { return <input className={`pv-input ${className}`} {...rest} />; }
export function Select({ className = "", children, ...rest }) { return <select className={`pv-select ${className}`} {...rest}>{children}</select>; }
export function Textarea({ className = "", ...rest }) { return <textarea className={`pv-textarea ${className}`} {...rest} />; }

/** ⓘ — the definition lives here, not on the card. */
export function InfoTip({ title, body, source }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClick(ref, () => setOpen(false), open);
  useEscape(() => setOpen(false), open);
  if (!body) return null;
  return (
    <span className="pv-info" ref={ref}>
      <button type="button" aria-label="What this means" aria-expanded={open} onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>i</button>
      {open ? (
        <span className="pv-info-pop" role="tooltip">
          {title ? <b>{title}<br /></b> : null}
          {body}
          {source ? <small>{source}</small> : null}
        </span>
      ) : null}
    </span>
  );
}

export function Unavailable({ reason = "Unavailable", onRetry, retryLabel = "Retry" }) {
  return (
    <span className="pv-unavail"><i />{reason}{onRetry ? <button type="button" onClick={onRetry}>{retryLabel}</button> : null}</span>
  );
}

/* -------------------------------------------------------------------------
   States
   ------------------------------------------------------------------------- */

export function Skeleton({ className = "", style }) { return <div className={`pv-skeleton ${className}`} style={style} aria-hidden="true" />; }
export function TileSkeleton() { return <div className="pv-card pv-kpi"><Skeleton style={{ height: 10, width: 90 }} /><Skeleton style={{ height: 28, width: 120, marginTop: 10 }} /><Skeleton style={{ height: 10, width: 70, marginTop: 10 }} /></div>; }
export function ChartSkeleton({ height = 220 }) { return <Skeleton style={{ height, width: "100%" }} />; }
export function RowsSkeleton({ rows = 6 }) { return <div className="flex flex-col gap-2">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} style={{ height: 36 }} />)}</div>; }

export function EmptyState({ title, description, icon = "○", action }) {
  return (
    <div className="pv-empty">
      <span className="i" aria-hidden="true">{icon}</span>
      <p className="t">{title}</p>
      {description ? <p className="d">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title = "That did not load", description, onRetry, retryLabel = "Try again" }) {
  return (
    <div className="pv-empty" role="alert">
      <span className="i" style={{ color: "var(--pv-bad)", borderColor: "color-mix(in srgb, var(--pv-bad) 50%, transparent)" }}>!</span>
      <p className="t">{title}</p>
      {description ? <p className="d">{description}</p> : null}
      {onRetry ? <div className="mt-2"><Button size="sm" onClick={onRetry}>{retryLabel}</Button></div> : null}
    </div>
  );
}

export function Feedback({ message }) {
  if (!message) return null;
  return <div className="pv-toast pv-rise" role="status" data-tone={message.tone === "error" || message.tone === "crit" ? "error" : "ok"}><i />{message.text}</div>;
}

/* -------------------------------------------------------------------------
   Numbers with motion
   ------------------------------------------------------------------------- */

export function DeltaChip({ current, previous, invert = false, suffix = "", absolute = false, label }) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  const diff = current - previous;
  const dir = Math.abs(diff) < 1e-9 ? "flat" : diff > 0 ? "up" : "down";
  let text;
  if (absolute || previous === 0) text = dir === "flat" ? "flat" : `${diff > 0 ? "+" : "−"}${count(Math.abs(diff))}${suffix}`;
  else text = dir === "flat" ? "flat" : `${diff > 0 ? "▲" : "▼"} ${Math.abs((diff / previous) * 100).toFixed(1)}%`;
  return <span className="pv-delta" data-dir={dir} data-invert={invert ? "true" : "false"} title={label}>{text}</span>;
}

export function KpiTile({ label, value, unit, previous, current, invert, compareLabel = "vs previous", spark, stripe, info, onClick, size, empty = "—", sub }) {
  const hasValue = value !== null && value !== undefined && value !== "";
  // A div with button semantics, not a <button>: the ⓘ inside is itself a
  // button and HTML forbids nesting them.
  return (
    <div className="pv-card pv-kpi" data-clickable={onClick ? "" : undefined} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined} style={{ "--kpi-stripe": stripe || "var(--pv-border-strong)", cursor: onClick ? "pointer" : "default" }}>
      <div className="pv-kpi-top">
        <span className="pv-label">{label}</span>
        {info ? <InfoTip {...(typeof info === "string" ? { body: info } : info)} /> : null}
      </div>
      <div className="pv-kpi-value" data-size={size} data-empty={hasValue ? undefined : ""}>{hasValue ? value : empty}{hasValue && unit ? <span style={{ fontSize: ".5em", color: "var(--pv-ink-3)", marginLeft: 4 }}>{unit}</span> : null}</div>
      <div className="pv-kpi-sub">
        {Number.isFinite(previous) && Number.isFinite(current) ? <><DeltaChip current={current} previous={previous} invert={invert} /><span>{compareLabel}</span></> : sub ? <span>{sub}</span> : null}
      </div>
      {spark && spark.length > 1 ? <Sparkline className="pv-kpi-spark" values={spark} /> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Charts — all SVG, all token-coloured, all responsive to their container.
   ------------------------------------------------------------------------- */

function scale(values, h, pad = 2) {
  const finite = values.filter(Number.isFinite);
  const max = Math.max(...finite, 0);
  const min = Math.min(...finite, 0);
  const span = max - min || 1;
  return (v) => h - pad - ((v - min) / span) * (h - pad * 2);
}

export function Sparkline({ values, className = "", color = "var(--pv-accent)", height = 28 }) {
  const [ref, width] = useElementWidth(120);
  const pts = useMemo(() => {
    if (!values || values.length < 2) return "";
    const y = scale(values, height);
    const step = width / (values.length - 1);
    return values.map((v, i) => `${(i * step).toFixed(1)},${y(Number.isFinite(v) ? v : 0).toFixed(1)}`).join(" ");
  }, [values, width, height]);
  const last = values?.[values.length - 1];
  const y = scale(values || [0], height);
  return (
    <div ref={ref} className={className} style={{ height }}>
      {pts ? (
        <svg className="pv-chart" width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <polyline points={pts} fill="none" stroke={color} strokeWidth="1.25" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <circle cx={width} cy={y(Number.isFinite(last) ? last : 0)} r="2.5" fill={color} />
        </svg>
      ) : null}
    </div>
  );
}

/**
 * Area/line chart with a faint grid, optional ghost series (previous period),
 * vertical annotations and a crosshair tooltip.
 * series: [{ date, value }] ; compare: same shape aligned by index ; annotations: [{ date, label }]
 */
export function LineChart({ series = [], compare = [], annotations = [], height = 220, format = (v) => count(v), color = "var(--pv-accent)", compareColor = "var(--pv-violet)", ariaLabel, yTicks = 4, emptyText = "No data in this range" }) {
  const [ref, width] = useElementWidth(640);
  const [hover, setHover] = useState(null);
  const reduced = useReducedMotion();
  const pad = { l: 44, r: 12, t: 14, b: 24 };
  const w = Math.max(160, width);
  const iw = w - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const values = series.map((p) => (Number.isFinite(p.value) ? p.value : 0));
  const cmp = compare.map((p) => (Number.isFinite(p.value) ? p.value : 0));
  const maxV = Math.max(1e-9, ...values, ...cmp);
  const minV = Math.min(0, ...values, ...cmp);
  const span = maxV - minV || 1;
  const n = series.length;
  const x = (i) => pad.l + (n > 1 ? (i / (n - 1)) * iw : iw / 2);
  const y = (v) => pad.t + ih - ((v - minV) / span) * ih;
  const path = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = n ? `${path} L${x(n - 1).toFixed(1)},${y(minV).toFixed(1)} L${x(0).toFixed(1)},${y(minV).toFixed(1)} Z` : "";
  const cmpPath = cmp.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => minV + (span * i) / yTicks);
  const gid = useId().replace(/:/g, "");
  const onMove = (event) => {
    if (!n) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const i = Math.max(0, Math.min(n - 1, Math.round(((px - pad.l) / iw) * (n - 1))));
    setHover({ i, px: x(i), py: y(values[i]) });
  };
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 72))));
  return (
    <div ref={ref} style={{ position: "relative", height }}>
      {n === 0 ? <div className="pv-empty" style={{ height }}><p className="d">{emptyText}</p></div> : (
        <svg className="pv-chart" width={w} height={height} viewBox={`0 0 ${w} ${height}`} role="img" aria-label={ariaLabel} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".22" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient>
          </defs>
          {ticks.map((t, i) => (
            <g key={i}>
              <line className="grid" x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} />
              <text x={pad.l - 8} y={y(t) + 3} textAnchor="end">{format(t)}</text>
            </g>
          ))}
          {series.map((p, i) => {
            const lastLabelled = Math.floor((n - 1) / labelEvery) * labelEvery;
            const show = i % labelEvery === 0 || (i === n - 1 && (n - 1) - lastLabelled >= Math.max(2, labelEvery / 2));
            return show ? <text key={p.date} x={x(i)} y={height - 6} textAnchor={i === n - 1 ? "end" : i === 0 ? "start" : "middle"}>{shortDate(p.date)}</text> : null;
          })}
          {annotations.map((a, k) => {
            const i = series.findIndex((p) => p.date === a.date);
            if (i < 0) return null;
            const right = x(i) > pad.l + iw * 0.72;
            return <g key={a.date + a.label}><line x1={x(i)} x2={x(i)} y1={pad.t} y2={pad.t + ih} stroke="var(--pv-ink-3)" strokeDasharray="2 3" /><text x={x(i) + (right ? -4 : 4)} y={pad.t + 8 + (k % 2) * 11} textAnchor={right ? "end" : "start"} style={{ fill: "var(--pv-ink-2)" }}>{a.label}</text></g>;
          })}
          {cmp.length > 1 ? <path d={cmpPath} fill="none" stroke={compareColor} strokeWidth="1.5" strokeDasharray="3 3" opacity=".9" /> : null}
          {n > 1 ? <path d={area} fill={`url(#g${gid})`} /> : null}
          <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" className={reduced ? "" : "pv-draw"} />
          <circle cx={x(n - 1)} cy={y(values[n - 1])} r="3.5" fill={color} />
          {hover ? <g><line x1={hover.px} x2={hover.px} y1={pad.t} y2={pad.t + ih} stroke="var(--pv-axis)" /><circle cx={hover.px} cy={hover.py} r="4" fill="var(--pv-surface)" stroke={color} strokeWidth="2" /></g> : null}
        </svg>
      )}
      {hover && n ? (
        <div className="pv-tip" style={{ left: Math.min(w - 150, Math.max(0, hover.px - 60)), top: 0 }}>
          <small>{shortDate(series[hover.i].date)}</small>
          <b>{format(values[hover.i])}</b>
          {cmp.length > hover.i ? <span style={{ marginLeft: 8 }}>prev <b style={{ color: "var(--pv-ink-2)" }}>{format(cmp[hover.i])}</b></span> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Small vertical bars with a value on top and a label underneath. */
export function Bars({ items = [], height = 120, color = "var(--pv-violet)", format = (v) => count(v), ariaLabel }) {
  const max = Math.max(1, ...items.map((b) => b.value || 0));
  return (
    <div role="img" aria-label={ariaLabel} style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))`, gap: 6, alignItems: "end", height }}>
      {items.map((b) => (
        <div key={b.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", minWidth: 0 }}>
          <span className="pv-mono" style={{ fontSize: 10, color: b.value ? "var(--pv-ink-2)" : "transparent", marginBottom: 4 }}>{format(b.value)}</span>
          <div style={{ width: "100%", height: `${Math.max(b.value ? 6 : 2, (b.value / max) * 70)}%`, background: b.value ? color : "var(--pv-raised)", borderRadius: 3, opacity: b.emph ? 1 : .8 }} />
          <span className="pv-mono" style={{ fontSize: 9.5, color: "var(--pv-ink-3)", marginTop: 6, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{b.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Ranked rows with a proportional bar. rows: [{ key, label, sub, value, display }] */
export function RankedBars({ rows = [], max, color = "var(--pv-violet)" }) {
  const top = Math.max(1, max ?? Math.max(...rows.map((r) => r.value || 0)));
  return (
    <div className="pv-rows">
      {rows.map((r) => (
        <div className="pv-row" key={r.key}>
          <div style={{ minWidth: 0, width: "50%" }}>
            <div className="t">{r.label}</div>
            {r.sub ? <div className="d">{r.sub}</div> : null}
          </div>
          <div className="pv-bar"><i style={{ width: `${Math.min(100, ((r.value || 0) / top) * 100)}%`, background: r.color || color }} /></div>
          <div className="v" style={{ width: 48, textAlign: "right" }}>{r.display ?? count(r.value)}</div>
        </div>
      ))}
    </div>
  );
}

/** Cohort heatmap. rows: [{ label, cells: [{ value (0..1 or null), display }] }], columns: ["D1","D3",...] */
export function Heatmap({ rows = [], columns = [], color = "var(--pv-violet)" }) {
  return (
    <div className="pv-heat" style={{ gridTemplateColumns: `90px repeat(${columns.length}, minmax(0,1fr))` }}>
      <span />
      {columns.map((c) => <span key={c} className="pv-label" style={{ textAlign: "center", fontSize: 10 }}>{c}</span>)}
      {rows.map((r) => (
        <FragmentRow key={r.label} row={r} color={color} />
      ))}
    </div>
  );
}
function FragmentRow({ row, color }) {
  return (
    <>
      <span className="pv-mono" style={{ fontSize: 11, color: "var(--pv-ink-3)", alignSelf: "center" }}>{row.label}</span>
      {row.cells.map((c, i) => (
        <span key={i} className="pv-heat-cell" style={{ background: Number.isFinite(c.value) ? `color-mix(in srgb, ${color} ${Math.round(12 + c.value * 78)}%, var(--pv-raised))` : "var(--pv-raised)", color: Number.isFinite(c.value) && c.value > .55 ? "#fff" : "var(--pv-ink)" }} title={c.title}>{c.display ?? (Number.isFinite(c.value) ? `${Math.round(c.value * 100)}%` : "·")}</span>
      ))}
    </>
  );
}

/** The money ribbon: stages with a value, a caption, and conversion on the edges. */
export function Ribbon({ stages = [] }) {
  const max = Math.max(1, ...stages.map((s) => (Number.isFinite(s.flow) ? s.flow : 0)));
  return (
    <div className="pv-ribbon">
      {stages.map((s, i) => (
        <div className="pv-ribbon-stage" key={s.key || i}>
          <span className="pv-label">{s.label}</span>
          <div className="pv-ribbon-value" data-empty={s.value === null || s.value === undefined ? "" : undefined}>{s.value ?? "—"}</div>
          {s.caption ? <div className="pv-faint" style={{ fontSize: 12, marginTop: 2 }}>{s.caption}</div> : null}
          <div className="pv-ribbon-flow"><i style={{ width: `${Number.isFinite(s.flow) ? Math.max(s.flow > 0 ? 4 : 0, (s.flow / max) * 100) : 0}%`, background: s.color || "var(--pv-accent)" }} /></div>
          {s.edge ? <span className="pv-ribbon-edge">{s.edge}</span> : null}
        </div>
      ))}
    </div>
  );
}
