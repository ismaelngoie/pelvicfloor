"use client";

// /admin — the shell.
//
// Access is a Google sign-in and one allowed address. That check runs in the
// browser, which makes it a courtesy and not a lock: the real gate is the
// Firestore rules in firestore.rules and the server-side owner check in every
// functions/api endpoint. Publish those, or this page is the only thing
// standing in the way.
//
// Layout: icon rail | top bar + page | docked inspector. The top bar holds the
// controls that are global by nature — which app, which dates, compare, ⌘K,
// sync state — so no page has to reinvent them.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { ADMIN_EMAIL, auth, isAdminEmail, isFirebaseConfigured } from "@/lib/firebase";
import { fetchAllMembers, fetchRevenueCatMembers, fetchRevenueCatOwnerMetrics } from "@/lib/adminData";
import { fetchAppTelemetry, fetchAppleAdsReport } from "@/lib/adminAppData";
import { normalizeMember } from "@/lib/adminMetrics";
import { FIXTURES_ON } from "@/lib/devFixtures";
import { acquisitionRange } from "./Acquisition";
import { RANGE_PRESETS, customRange, previousRange, rangeForPreset, rangeLabel } from "@/lib/adminRange";
import Pulse from "./Pulse";
import Revenue from "./Revenue";
import Acquisition from "./Acquisition";
import Members from "./Members";
import Retention from "./Retention";
import Programs from "./Programs";
import Definitions from "./Definitions";
import MemberInspector from "./MemberInspector";
import CommandPalette from "./CommandPalette";
import { Button, Card, Chip, ErrorState, IconButton, Icons, Segmented, relativeTime, useOutsideClick } from "./ui";

export const PAGES = [
  { id: "pulse", label: "Pulse", hint: "Is everything okay?", key: "p", icon: Icons.pulse },
  { id: "revenue", label: "Revenue", hint: "Money, renewals, refunds", key: "r", icon: Icons.revenue },
  { id: "acquisition", label: "Acquisition", hint: "Apple Ads → members", key: "a", icon: Icons.acquisition },
  { id: "members", label: "Members", hint: "Every person, live", key: "m", icon: Icons.members },
  { id: "retention", label: "Retention", hint: "Who stays, who drifts", key: "t", icon: Icons.retention },
  { id: "programs", label: "Programs", hint: "Edit the app's content", key: "g", icon: Icons.programs },
];
const UTILITY_PAGES = [{ id: "definitions", label: "Definitions", hint: "What every number means", icon: Icons.book }];

const THEME_KEY = "pelvi_admin_theme";
const RAIL_KEY = "pelvi_admin_rail";
const RANGE_KEY = "pelvi_admin_range";

/* -------------------------------------------------------------------------
   Chrome pieces
   ------------------------------------------------------------------------- */

function Wordmark({ compact = false }) {
  return (
    <div className="pv-rail-brand">
      <span className="pv-rail-mark" aria-hidden="true">P</span>
      {!compact ? <span className="pv-rail-name">Pelvi<small>OPS</small></span> : null}
    </div>
  );
}

function Gate({ title, description, children, footnote }) {
  return (
    <div className="pv-gate">
      <Card className="pv-gate-card pv-rise">
        <div style={{ display: "flex", justifyContent: "center" }}><Wordmark /></div>
        <h1>{title}</h1>
        <p>{description}</p>
        {children ? <div style={{ marginTop: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>{children}</div> : null}
        {footnote ? <p className="foot">{footnote}</p> : null}
      </Card>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 34.8 44 29.8 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function Rail({ page, onPage, open, onToggle }) {
  return (
    <nav className="pv-rail" aria-label="Sections">
      <Wordmark compact={!open} />
      <div className="pv-nav">
        {PAGES.map((p) => {
          const Icon = p.icon;
          return (
            <button key={p.id} type="button" className="pv-nav-item" aria-current={page === p.id ? "page" : undefined} onClick={() => onPage(p.id)} title={open ? undefined : p.label}>
              <Icon />
              <span className="pv-nav-label">{p.label}</span>
              <span className="pv-nav-key">G{p.key.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
      <div className="pv-rail-foot">
        {UTILITY_PAGES.map((p) => {
          const Icon = p.icon;
          return (
            <button key={p.id} type="button" className="pv-nav-item" aria-current={page === p.id ? "page" : undefined} onClick={() => onPage(p.id)} title={open ? undefined : p.label}>
              <Icon /><span className="pv-nav-label">{p.label}</span>
            </button>
          );
        })}
        <button type="button" className="pv-nav-item" onClick={onToggle} title={open ? "Collapse" : "Expand"} aria-label={open ? "Collapse navigation" : "Expand navigation"}>
          <Icons.sidebar /><span className="pv-nav-label">Collapse</span>
        </button>
      </div>
    </nav>
  );
}

function AppSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClick(ref, () => setOpen(false), open);
  const apps = [
    { id: "pelvic-floor", name: "Pelvic Floor", connected: true },
    { id: "diastafix", name: "DiastaFix", connected: false },
    { id: "cora", name: "Cora", connected: false },
    { id: "pelvifix", name: "PelviFix", connected: false },
    { id: "cesafix", name: "CesaFix", connected: false },
    { id: "pelvicpain", name: "PelvicPain", connected: false },
  ];
  return (
    <div style={{ position: "relative" }} ref={ref}>
      <Chip on={open} onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        <span className="pv-rail-mark" style={{ width: 16, height: 16, borderRadius: 4, fontSize: 9 }}>P</span>
        <span style={{ color: "var(--pv-ink)", fontWeight: 600 }}>Pelvic Floor</span>
        <Icons.chevron style={{ width: 12, height: 12 }} />
      </Chip>
      {open ? (
        <div className="pv-menu" role="menu" style={{ top: "calc(100% + 6px)", left: 0 }}>
          <div className="pv-menu-head">Apps</div>
          {apps.map((a) => (
            <button key={a.id} type="button" role="menuitem" className="pv-menu-item" aria-current={a.connected ? "true" : undefined} disabled={!a.connected} onClick={() => setOpen(false)} title={a.connected ? undefined : "Connect RevenueCat and Apple Ads for this app to switch to it."}>
              <span className="pv-avatar" style={{ width: 20, height: 20, fontSize: 9 }}>{a.name[0]}</span>
              {a.name}
              <span className="hint">{a.connected ? "Connected" : "Not connected"}</span>
            </button>
          ))}
          <div className="pv-menu-sep" />
          <button type="button" role="menuitem" className="pv-menu-item" disabled title="Connecting another app needs its RevenueCat key and Apple Ads access. Coming with the multi-app release.">
            <Icons.plus /> Add an app <span className="hint">Soon</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function RangePicker({ range, onPreset, onCustom, compare, onCompare }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(range.startDate);
  const [end, setEnd] = useState(range.endDate);
  const ref = useRef(null);
  useOutsideClick(ref, () => setOpen(false), open);
  useEffect(() => { setStart(range.startDate); setEnd(range.endDate); }, [range.startDate, range.endDate]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }} ref={ref}>
      <Segmented label="Date range" value={range.preset} onChange={onPreset} options={[...RANGE_PRESETS.map((p) => ({ value: p.id, label: p.label })), { value: "custom", label: range.preset === "custom" ? rangeLabel(range) : "Custom" }]} />
      {range.preset === "custom" || open ? null : null}
      <div style={{ position: "relative" }}>
        <Chip on={open} onClick={() => setOpen((v) => !v)} aria-label="Custom dates" title="Custom dates"><Icons.revenue style={{ width: 13, height: 13 }} /></Chip>
        {open ? (
          <div className="pv-menu" style={{ top: "calc(100% + 6px)", right: 0, width: 280, padding: 12 }}>
            <div className="pv-menu-head" style={{ padding: "0 0 8px" }}>Custom range (UTC)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input className="pv-input" type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)} aria-label="Start date" />
              <input className="pv-input" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} aria-label="End date" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={() => { if (onCustom(start, end)) setOpen(false); }}>Apply</Button>
            </div>
          </div>
        ) : null}
      </div>
      <Chip on={compare} onClick={() => onCompare(!compare)} aria-pressed={compare} title="Compare with the previous period" className="pv-hide-sm">⇄ compare</Chip>
    </div>
  );
}

function LiveDot({ state, at, onRefresh }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, []);
  const stale = at && Date.now() - at.getTime() > 15 * 60000;
  return (
    <button type="button" className="pv-live pv-hide-sm" data-state={state === "loading" || state === "refreshing" ? "busy" : stale ? "stale" : "ok"} onClick={onRefresh} title="Refresh now">
      <i />
      {state === "loading" ? "Syncing…" : state === "refreshing" ? "Refreshing…" : at ? `Synced ${relativeTime(at)}` : "Not synced"}
    </button>
  );
}

function AvatarMenu({ email, theme, onTheme, onSignOut, onDefinitions }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClick(ref, () => setOpen(false), open);
  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button type="button" className="pv-avatar" style={{ width: 30, height: 30 }} onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu">{(email || "?").slice(0, 1).toUpperCase()}</button>
      {open ? (
        <div className="pv-menu" role="menu" style={{ top: "calc(100% + 6px)", right: 0 }}>
          <div className="pv-menu-head" style={{ textTransform: "none", letterSpacing: 0, fontFamily: "var(--font-sans)", fontSize: 12 }}>{email}</div>
          <button type="button" role="menuitem" className="pv-menu-item" onClick={() => { setOpen(false); onDefinitions(); }}><Icons.book /> Definitions</button>
          <button type="button" role="menuitem" className="pv-menu-item" onClick={() => { setOpen(false); onTheme(); }}>{theme === "dark" ? <Icons.sun /> : <Icons.moon />} {theme === "dark" ? "Light theme" : "Dark theme"}</button>
          <div className="pv-menu-sep" />
          <button type="button" role="menuitem" className="pv-menu-item" onClick={() => { setOpen(false); onSignOut(); }}><Icons.logout /> Sign out</button>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Fixtures (local QA only; dead code in production)
   ------------------------------------------------------------------------- */

function fixtureSeries(range, base, jitter, seed = 1) {
  const out = [];
  const s = Date.parse(`${range.startDate}T00:00:00Z`);
  let v = base;
  for (let i = 0; i < range.days; i += 1) {
    // A slow weekly wave plus a gentle upward drift — readable, not noisy.
    const x = Math.sin((i + seed) / 2.3) * jitter * 0.5 + Math.sin((i + seed) / 9) * jitter * 0.4 + (i / Math.max(1, range.days)) * jitter * 0.8;
    v = Math.max(0, base + x);
    out.push({ date: new Date(s + i * 86400000).toISOString().slice(0, 10), value: Math.round(v * 100) / 100 });
  }
  return out;
}

async function fixtureOwnerMetrics(range, factor = 1) {
  const rev = fixtureSeries(range, 16 * factor, 14, 3);
  const total = rev.reduce((s, p) => s + p.value, 0);
  return {
    source: "RevenueCat API v2 fixture",
    fetchedAt: new Date().toISOString(),
    scope: { ...range, currency: "USD", timezone: "UTC" },
    metrics: {
      grossRevenue: { available: true, value: Math.round(total * 100) / 100, definition: "Gross revenue charged to customers in the selected UTC date range, before estimated taxes and Apple commission, minus refunds tied to transactions from that range.", source: "RevenueCat Revenue chart (API v2)" },
      lifetimeGrossRevenue: { available: true, value: 16222.59, definition: "Gross production App Store revenue since January 1, 2020.", source: "RevenueCat Revenue chart" },
      lifetimeTransactions: { available: true, value: 658 },
      paidSetToRenew: { available: true, value: Math.round(20 * factor), definition: "Current production App Store paid subscriptions that are active and set to renew.", source: "RevenueCat Subscription Status chart" },
      trialsSetToRenew: { available: true, value: Math.round(6 * factor), definition: "Current production App Store trials that are active and set to renew." },
      activePremium: { available: true, value: Math.round(26 * factor) },
      trialsStarted: { available: true, value: Math.round(8 * factor), definition: "Trials whose trial start date falls inside the selected UTC date range." },
      trialsCanceled: { available: true, value: 2 },
      trialsConvertedToPaid: { available: true, value: Math.round(3 * factor) },
      cohortTrialConversions: { available: true, value: 3, cohortStarts: 8 },
      pendingTrialOutcomes: { available: true, value: 3 },
      trialExpirations: { available: true, value: 2 },
      trialConversionRate: { available: true, value: 37.5 * factor, definition: "Converted trials divided by trial starts in RevenueCat's matched conversion cohort." },
      firstPaidCustomers: { available: true, value: Math.round(5 * factor), direct: 2, trialConversions: 3, definition: "Subscriptions whose first successful payment occurred inside the selected UTC date range." },
      activeCancellations: { available: true, value: 4, paid: 2, trials: 2, definition: "Active subscriptions and trials that still provide access but are set to cancel." },
      refundedTransactions: { available: true, value: 0, paidTransactions: 16, refundRate: 0, definition: "Paid transactions from the selected range that have since been refunded." },
      mrr: { available: true, value: 783.67 * factor, definition: "Current gross monthly recurring revenue before taxes and store commission." },
      arr: { available: true, value: 9404.1 * factor, definition: "Current gross annual recurring revenue before taxes and store commission." },
      appleAttributedTrialsStarted: { available: true, value: Math.round(5 * factor) },
      appleAttributedFirstPaidCustomers: { available: true, value: Math.round(4 * factor) },
    },
    series: {
      grossRevenueDaily: rev,
      trialsStartedDaily: fixtureSeries(range, 0.4 * factor, 0.6, 5).map((p) => ({ ...p, value: Math.round(p.value) })),
      firstPaidCustomersDaily: fixtureSeries(range, 0.2 * factor, 0.4, 7).map((p) => ({ ...p, value: Math.round(p.value) })),
    },
    geography: { available: true, countries: [
      { code: "US", name: "United States", paid: 18, trials: 4, activePremium: 22 },
      { code: "AE", name: "United Arab Emirates", paid: 1, trials: 0, activePremium: 1 },
      { code: "AL", name: "Albania", paid: 1, trials: 0, activePremium: 1 },
      { code: "AU", name: "Australia", paid: 0, trials: 2, activePremium: 2 },
    ] },
    growth: { available: true, points: Array.from({ length: 14 }, (_, i) => ({ date: new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10), activePremium: 13 + i, paid: 10 + Math.round(i * 0.7), trials: 3 + Math.round(i * 0.3), mrr: 600 + i * 14, arr: 7200 + i * 168 })) },
    acquisition: { available: true, historyRange: { startDate: "2024-08-15", endDate: range.endDate }, presets: Object.fromEntries(["today", "sinceRelaunch", "allTime"].map((preset) => {
      const r = acquisitionRange(preset, "2024-08-15");
      const k = preset === "today" ? 0.15 : preset === "allTime" ? 6 : 1;
      const mk = (ts, fp) => ({ trialStarts: Math.round(ts * k), firstPaid: Math.round(fp * k), directFirstPaid: Math.round(fp * k * 0.4), trialConversions: Math.round(fp * k * 0.6), introductoryFirstPaid: 0, cohortStarts: Math.round(ts * k), cohortConversions: Math.round(fp * k * 0.6), pendingTrialOutcomes: Math.round(ts * k * 0.3), trialToPaidRate: null });
      return [preset, { available: true, scope: { startDate: r.startDate, endDate: r.endDate }, totals: mk(38, 14), campaigns: [
        { campaignId: "1", campaignName: "US | Competitor | Exact", ...mk(24, 10) },
        { campaignId: "2", campaignName: "US | Category | Exact", ...mk(10, 3) },
        { campaignId: "3", campaignName: "US | Discovery | Search Match", ...mk(4, 1) },
      ] }];
    })) },
  };
}

/* -------------------------------------------------------------------------
   The dashboard
   ------------------------------------------------------------------------- */

export default function AdminDashboard() {
  const configured = isFirebaseConfigured();
  const [theme, setTheme] = useState("dark");
  const [railOpen, setRailOpen] = useState(true);
  const [authState, setAuthState] = useState(configured ? "loading" : "unconfigured");
  const [authError, setAuthError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [user, setUser] = useState(null);

  const [range, setRange] = useState(() => rangeForPreset("28d"));
  const [compare, setCompare] = useState(true);
  const [members, setMembers] = useState([]);
  const [telemetry, setTelemetry] = useState({ completions: [], events: [], checkins: [], commands: [], lifecycle: [], lifecycleAvailable: false });
  const [membership, setMembership] = useState(null);
  const [membershipError, setMembershipError] = useState("");
  const [ownerMetrics, setOwnerMetrics] = useState(null);
  const [ownerPrevious, setOwnerPrevious] = useState(null);
  const [ownerMetricsError, setOwnerMetricsError] = useState("");
  const [appleReport, setAppleReport] = useState(null);
  const [appleError, setAppleError] = useState("");
  const [dataState, setDataState] = useState("idle");
  const [dataError, setDataError] = useState("");
  const [countedAt, setCountedAt] = useState(null);
  const [page, setPage] = useState("pulse");
  const [inspected, setInspected] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const pendingKey = useRef("");

  const isAdmin = Boolean(user && isAdminEmail(user.email));

  /* --- Preferences ---------------------------------------------------- */
  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(THEME_KEY);
      if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
      const savedRail = window.localStorage.getItem(RAIL_KEY);
      if (savedRail === "closed") setRailOpen(false);
      const savedRange = window.localStorage.getItem(RANGE_KEY);
      if (savedRange && RANGE_PRESETS.some((p) => p.id === savedRange)) setRange(rangeForPreset(savedRange));
    } catch { /* storage off */ }
  }, []);
  const toggleTheme = useCallback(() => setTheme((c) => { const n = c === "dark" ? "light" : "dark"; try { window.localStorage.setItem(THEME_KEY, n); } catch {} return n; }), []);
  const toggleRail = () => setRailOpen((c) => { try { window.localStorage.setItem(RAIL_KEY, c ? "closed" : "open"); } catch {} return !c; });
  const choosePreset = useCallback((id) => { if (id === "custom") return; setRange(rangeForPreset(id)); try { window.localStorage.setItem(RANGE_KEY, id); } catch {} }, []);
  const chooseCustom = (s, e) => { const next = customRange(s, e); if (!next) return false; setRange(next); return true; };

  /* --- Auth ------------------------------------------------------------ */
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && FIXTURES_ON) {
      let mounted = true;
      import("@/lib/devFixtureData").then((f) => { if (!mounted) return; setUser(f.fixtureUser); setAuthState("signedIn"); });
      return () => { mounted = false; };
    }
    if (!configured) return undefined;
    let unsubscribe = () => {};
    try {
      const instance = auth();
      getRedirectResult(instance).catch((error) => { if (error?.code !== "auth/no-auth-event") setAuthError(describeAuthError(error)); });
      unsubscribe = onAuthStateChanged(instance, (next) => { setUser(next); setAuthState(next ? "signedIn" : "signedOut"); }, (error) => { setAuthError(describeAuthError(error)); setAuthState("signedOut"); });
    } catch (error) {
      setAuthError(describeAuthError(error));
      setAuthState("signedOut");
    }
    return () => unsubscribe();
  }, [configured]);

  const startSignIn = async () => {
    setSigningIn(true); setAuthError("");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try { await signInWithPopup(auth(), provider); } catch (error) {
      const code = error?.code || "";
      const popupFailed = code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment" || code === "auth/popup-closed-by-user";
      if (popupFailed) { try { await signInWithRedirect(auth(), provider); return; } catch (redirectError) { setAuthError(describeAuthError(redirectError)); } }
      else if (code !== "auth/cancelled-popup-request") setAuthError(describeAuthError(error));
    } finally { setSigningIn(false); }
  };

  const endSession = async () => {
    try { await signOut(auth()); } catch (error) { setAuthError(describeAuthError(error)); }
    setMembers([]); setMembership(null); setMembershipError(""); setOwnerMetrics(null); setOwnerPrevious(null); setOwnerMetricsError(""); setAppleReport(null); setDataState("idle"); setCountedAt(null); setInspected(null);
  };

  /* --- Data ------------------------------------------------------------ */
  const load = useCallback(async () => {
    setDataState((current) => (current === "ready" ? "refreshing" : "loading"));
    setDataError(""); setMembershipError(""); setOwnerMetricsError(""); setAppleError("");
    const prev = previousRange(range);
    try {
      let next; let nextTelemetry; let nextMembership; let nextOwner; let nextPrev = null; let nextApple = null;
      if (process.env.NODE_ENV !== "production" && FIXTURES_ON) {
        const f = await import("@/lib/devFixtureData");
        next = f.fixtureMembers().map((row) => normalizeMember(row));
        nextTelemetry = { completions: f.fixtureCompletions ? f.fixtureCompletions() : [], events: [], checkins: [], commands: [], lifecycle: [], lifecycleAvailable: false };
        const fixtureActive = next.slice(0, 26).map((member, index) => ({
          id: member.id, identityIds: [member.id], email: member.email, displayName: member.name,
          lastSeenAt: member.lastSeenAt?.toISOString() || null, isActivePremium: true,
          phase: index < 20 ? "paid" : "trial", state: index < 20 ? "paid" : "trial",
          subscription: { autoRenewalStatus: "will_renew", status: index < 20 ? "active" : "trialing", productId: "product.PelvicFloor.Yearly", currentPeriodEndsAt: new Date(Date.now() + (index * 11 + 3) * 86400000).toISOString() },
        }));
        nextMembership = { source: "fixture", fetchedAt: Date.now(), customers: fixtureActive, totals: { activePremium: 26, paid: 20, trials: 6, syncedActivePremium: 26, syncedPaid: 20, syncedTrials: 6, canceledWithAccess: 1, openedToday: 3, opened7Days: 10 } };
        nextOwner = await fixtureOwnerMetrics(range, 1);
        nextPrev = compare ? await fixtureOwnerMetrics(prev, 0.88) : null;
        nextApple = f.fixtureAppleReport(range);
      } else {
        const [memberRows, appTelemetry, ownerResult, prevResult, appleResult] = await Promise.all([
          fetchAllMembers(),
          fetchAppTelemetry(),
          fetchRevenueCatOwnerMetrics(user, range.startDate, range.endDate).then((value) => ({ value, error: "" })).catch((error) => ({ value: null, error: error?.message || "RevenueCat business metrics did not load." })),
          compare ? fetchRevenueCatOwnerMetrics(user, prev.startDate, prev.endDate).then((value) => ({ value, error: "" })).catch(() => ({ value: null, error: "" })) : Promise.resolve({ value: null, error: "" }),
          fetchAppleAdsReport(user, range.startDate, range.endDate).then((value) => ({ value, error: "" })).catch((error) => ({ value: null, error: error?.message || "Apple Ads reporting did not load." })),
        ]);
        const membershipResult = await fetchRevenueCatMembers(user, memberRows.map((m) => m.id)).then((value) => ({ value, error: "" })).catch((error) => ({ value: null, error: error?.message || "RevenueCat memberships did not load." }));
        next = memberRows; nextTelemetry = appTelemetry; nextMembership = membershipResult.value; nextOwner = ownerResult.value; nextPrev = prevResult.value; nextApple = appleResult.value;
        setMembershipError(membershipResult.error); setOwnerMetricsError(ownerResult.error); setAppleError(appleResult.error);
      }
      setMembers(next); setTelemetry(nextTelemetry); setMembership(nextMembership); setOwnerMetrics(nextOwner); setOwnerPrevious(nextPrev); setAppleReport(nextApple);
      setCountedAt(new Date()); setDataState("ready"); setReloadToken((n) => n + 1);
    } catch (error) {
      setDataError(describeDataError(error)); setDataState("error");
    }
  }, [user, range, compare]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const patchMember = useCallback((id, patch) => {
    setMembers((current) => current.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    setInspected((current) => (current && current.id === id ? { ...current, ...patch } : current));
  }, []);

  const now = useMemo(() => countedAt || new Date(), [countedAt]);
  const appMembers = useMemo(() => members.filter((m) => m.platform === "ios"), [members]);
  const memberViews = useMemo(() => joinMembership(appMembers, membership), [appMembers, membership]);

  /* --- Keyboard ------------------------------------------------------- */
  useEffect(() => {
    if (!(authState === "signedIn" && isAdmin)) return undefined;
    const onKey = (e) => {
      const target = e.target;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((v) => !v); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") { e.preventDefault(); setPaletteOpen(true); return; }
      if (e.key === "Escape") { setInspected(null); return; }
      if (e.key === "g") { pendingKey.current = "g"; setTimeout(() => { pendingKey.current = ""; }, 900); return; }
      if (pendingKey.current === "g") {
        const hit = PAGES.find((p) => p.key === e.key.toLowerCase());
        if (hit) { setPage(hit.id); pendingKey.current = ""; }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authState, isAdmin]);

  const openMember = useCallback((member) => { setInspected(member); }, []);
  const goTo = useCallback((id) => { setPage(id); }, []);

  /* --- Gates ----------------------------------------------------------- */
  let body;
  if (authState === "unconfigured") {
    body = <Gate title="This deployment has no Firebase keys" description="The dashboard reads members straight from Firestore, so it needs the project keys before it can show anything. Add them to the Cloudflare Pages build environment and deploy again." footnote="The names are NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_APP_ID. They are not secrets. What keeps member data safe is firestore.rules." />;
  } else if (authState === "loading") {
    body = <Gate title="Checking your sign-in" description="One moment."><div className="pv-skeleton" style={{ height: 36, width: 180 }} /></Gate>;
  } else if (authState === "signedOut") {
    body = (
      <Gate title="Sign in to Pelvi Ops" description="This is the owner's dashboard. Sign in with the Google account that owns the business." footnote={authError || "Only one address gets in. Everybody else is turned away here, and again by the database itself."}>
        <Button variant="primary" onClick={startSignIn} disabled={signingIn}><GoogleMark />{signingIn ? "Opening Google" : "Continue with Google"}</Button>
      </Gate>
    );
  } else if (!isAdmin) {
    body = <Gate title="This account does not have access" description={`You are signed in as ${user?.email || "an account"}, which is not the owner account.`} footnote={`Only ${ADMIN_EMAIL} can open this dashboard.`}><Button variant="ghost" onClick={endSession}>Sign out</Button></Gate>;
  } else {
    const shared = { range, compare, ownerMetrics, ownerPrevious, ownerMetricsError, appleReport, appleError, membership, membershipError, telemetry, now, user, reloadToken, members: memberViews.activeMembers, allPeople: memberViews.allPeople, onOpenMember: openMember, onGo: goTo, onRetry: load, dataState };
    let content;
    if (dataState === "error") content = <Card pad><ErrorState title="The member list did not load" description={dataError} onRetry={load} /></Card>;
    else if (page === "pulse") content = <Pulse {...shared} />;
    else if (page === "revenue") content = <Revenue {...shared} />;
    else if (page === "acquisition") content = <Acquisition {...shared} />;
    else if (page === "members") content = <Members {...shared} activeTotal={membership?.totals?.activePremium} onPatched={patchMember} inspectedId={inspected?.id} />;
    else if (page === "retention") content = <Retention {...shared} />;
    else if (page === "programs") content = <Programs />;
    else if (page === "definitions") content = <Definitions ownerMetrics={ownerMetrics} />;

    body = (
      <div className="pv-shell" data-rail={railOpen ? "open" : "closed"}>
        <Rail page={page} onPage={goTo} open={railOpen} onToggle={toggleRail} />
        <div className="pv-main">
          <header className="pv-topbar">
            <AppSwitcher />
            <div className="pv-hide-sm" style={{ width: 1, height: 20, background: "var(--pv-border)" }} />
            <RangePicker range={range} onPreset={choosePreset} onCustom={chooseCustom} compare={compare} onCompare={setCompare} />
            <div className="grow" />
            <Chip onClick={() => setPaletteOpen(true)} aria-label="Open command palette" className="pv-hide-sm" style={{ flex: "0 1 280px", minWidth: 0, overflow: "hidden", justifyContent: "flex-start", color: "var(--pv-ink-3)" }}>
              <Icons.search style={{ width: 13, height: 13 }} /> Search members, jump, ask…<span className="pv-kbd" style={{ marginLeft: "auto" }}>⌘K</span>
            </Chip>
            <IconButton label="Search" onClick={() => setPaletteOpen(true)} className="pv-show-sm"><Icons.search /></IconButton>
            <LiveDot state={dataState} at={countedAt} onRefresh={load} />
            <IconButton label={theme === "dark" ? "Switch to the light theme" : "Switch to the dark theme"} onClick={toggleTheme}>{theme === "dark" ? <Icons.sun /> : <Icons.moon />}</IconButton>
            <AvatarMenu email={user?.email} theme={theme} onTheme={toggleTheme} onSignOut={endSession} onDefinitions={() => goTo("definitions")} />
          </header>
          <div className="pv-body" data-inspector={inspected ? "open" : "closed"}>
            <div className="pv-scroll">
              <main className="pv-page" style={{ opacity: dataState === "refreshing" ? 0.7 : 1, transition: "opacity 160ms ease" }}>
                {content}
              </main>
            </div>
            {inspected ? (
              <>
                <div className="pv-inspector-backdrop" onClick={() => setInspected(null)} aria-hidden="true" />
                <MemberInspector member={inspected} onClose={() => setInspected(null)} onPatched={(patch) => patchMember(inspected.id, patch)} />
              </>
            ) : null}
          </div>
          <nav className="pv-tabbar" aria-label="Sections">
            {PAGES.slice(0, 5).map((p) => { const Icon = p.icon; return <button key={p.id} type="button" aria-current={page === p.id ? "page" : undefined} onClick={() => goTo(p.id)}><Icon />{p.label}</button>; })}
          </nav>
        </div>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} pages={[...PAGES, ...UTILITY_PAGES]} onPage={goTo} members={memberViews.allPeople} onMember={(m) => { setPage("members"); openMember(m); }} ranges={RANGE_PRESETS} onRange={choosePreset} onTheme={toggleTheme} theme={theme} />
      </div>
    );
  }

  return (
    <div className="pv-admin" data-admin-theme={theme} data-clarity-mask="true">
      {body}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Joining the app profile to the RevenueCat customer (unchanged logic)
   ------------------------------------------------------------------------- */

function joinMembership(appMembers, report) {
  const customers = Array.isArray(report?.customers) ? report.customers : [];
  const byIdentity = new Map();
  const byEmail = new Map();
  for (const customer of customers) {
    const ids = Array.isArray(customer.identityIds) ? customer.identityIds : [customer.id];
    for (const id of ids) if (id) byIdentity.set(id, customer);
    if (customer.email) byEmail.set(customer.email.trim().toLowerCase(), customer);
  }
  const profileById = new Map(appMembers.map((member) => [member.id, member]));
  const profileByEmail = new Map(appMembers.filter((member) => member.email).map((member) => [member.email.toLowerCase(), member]));
  const customerFor = (member) => byIdentity.get(member.id) || (member.email ? byEmail.get(member.email.toLowerCase()) : null) || null;
  const profileFor = (customer) => {
    const ids = Array.isArray(customer.identityIds) ? customer.identityIds : [customer.id];
    for (const id of ids) if (profileById.has(id)) return profileById.get(id);
    return customer.email ? profileByEmail.get(customer.email.toLowerCase()) || null : null;
  };
  const merge = (profile, customer) => {
    const rcSeen = customer?.lastSeenAt ? new Date(customer.lastSeenAt) : null;
    const rcSeenValid = rcSeen && !Number.isNaN(rcSeen.getTime()) ? rcSeen : null;
    const lastSeenAt = profile.lastSeenAt && rcSeenValid ? (profile.lastSeenAt > rcSeenValid ? profile.lastSeenAt : rcSeenValid) : profile.lastSeenAt || rcSeenValid;
    return {
      ...profile,
      name: profile.name || customer?.displayName || "",
      email: profile.email || customer?.email || "",
      lastSeenAt,
      appVersion: profile.appVersion || customer?.appVersion || "",
      revenueCat: customer,
      premiumState: customer?.state || "inactive",
      premiumPhase: customer?.phase || "inactive",
      isActivePremium: customer?.isActivePremium === true,
    };
  };
  const allPeople = appMembers.map((member) => merge(member, customerFor(member)));
  const activeMembers = customers.filter((customer) => customer.isActivePremium === true).map((customer) => {
    const profile = profileFor(customer);
    if (profile) return merge(profile, customer);
    const synthetic = normalizeMember({ id: customer.id, name: customer.displayName, email: customer.email, platform: "ios", lastActiveAt: customer.lastSeenAt, appVersion: customer.appVersion });
    return { ...merge(synthetic, customer), isRevenueCatOnly: true };
  });
  return { activeMembers, allPeople };
}

function describeAuthError(error) {
  const code = error?.code || "";
  if (code === "auth/unauthorized-domain") return "Google sign-in is not allowed on this web address yet. In Firebase, open Authentication → Settings → Authorized domains, and add this address.";
  if (code === "auth/operation-not-allowed") return "Google sign-in is switched off for this Firebase project. Turn it on under Authentication → Sign-in method.";
  if (code === "auth/network-request-failed") return "Your connection dropped while signing in. Check the network and try again.";
  if (code === "auth/popup-blocked") return "Your browser blocked the Google window. Allow pop-ups for this site, or try again and it will use a full-page sign-in.";
  if (code === "auth/invalid-api-key" || code === "auth/api-key-not-valid") return "The Firebase key this site was built with is not valid.";
  return error?.message || "Sign-in did not work. Try again.";
}

function describeDataError(error) {
  const code = error?.code || "";
  if (code === "permission-denied") return "Firestore refused to hand over the member list. Publish firestore.rules from the root of this repo with the owner email in it.";
  if (code === "unavailable" || code === "failed-precondition") return "Firestore could not be reached. Check the connection and refresh.";
  if (code === "unauthenticated") return "Your sign-in expired while the page was open. Sign out and back in.";
  return error?.message || "Something went wrong reading the member list.";
}
