"use client";

// Pulse — the home screen. One rule: the top of the page answers "is
// everything okay?" without scrolling. Six KPI tiles, then a bento where
// tile size encodes importance. Everything here is derived from the same
// numbers the other pages show; the morning brief is written from them, so
// it can never disagree with the tiles.

import { useMemo } from "react";
import { Card, CardHead, KpiTile, LineChart, RankedBars, Unavailable, Icons, money, count, percent, ratio, shortDate } from "./ui";
import { ANNOTATIONS } from "@/lib/adminAnnotations";
import { fillDaily, rangeLabel, sumSeries } from "@/lib/adminRange";
import { displayName, startOfDay } from "@/lib/adminMetrics";

export function metric(report, key) {
  const m = report?.metrics?.[key];
  const v = Number(m?.value);
  return m?.available === true && Number.isFinite(v) ? v : null;
}
export function metricInfo(report, key) {
  const m = report?.metrics?.[key];
  if (!m?.definition) return null;
  return { body: m.definition, source: m.source };
}

/** Snapshot value from the growth series nearest to `daysAgo`. */
function growthAt(points, daysAgo, field) {
  if (!Array.isArray(points) || !points.length) return null;
  const target = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
  let best = null;
  for (const p of points) if (p.date <= target && Number.isFinite(p[field])) best = p;
  return best ? best[field] : null;
}

export function buildAttention({ members, membership, telemetry, appleError, ownerMetrics, now }) {
  const items = [];
  const soon = new Date(now.getTime() + 3 * 86400000);
  const ending = members.filter((m) => m.premiumPhase === "trial" && m.revenueCat?.subscription?.currentPeriodEndsAt && new Date(m.revenueCat.subscription.currentPeriodEndsAt) <= soon);
  if (ending.length) {
    const silent = ending.filter((m) => !m.lastSeenAt || now - m.lastSeenAt > 3 * 86400000).length;
    items.push({ tone: "warn", text: <><b>{ending.length} trial{ending.length === 1 ? "" : "s"} end within 3 days</b>{silent ? ` — ${silent} ${silent === 1 ? "has" : "have"} not opened the app in 3 days` : ""}.</>, page: "members" });
  }
  const revenueCatCanceled = metric(ownerMetrics, "activeCancellations");
  const canceled = Number.isFinite(revenueCatCanceled)
    ? revenueCatCanceled
    : Number(membership?.totals?.canceledWithAccess) || 0;
  if (canceled) items.push({ tone: "warn", text: <><b>{canceled} member{canceled === 1 ? "" : "s"}</b> still {canceled === 1 ? "has" : "have"} access but switched renewal off.</>, page: "members" });
  const refunds = metric(ownerMetrics, "refundedTransactions");
  if (refunds > 0) items.push({ tone: "bad", text: <><b>{refunds} refund{refunds === 1 ? "" : "s"}</b> in this range.</>, page: "revenue" });
  if (appleError) items.push({ tone: "warn", text: <><b>Apple Ads reporting unavailable</b> — {appleError}</>, page: "acquisition" });
  const pending = (telemetry?.commands || []).filter((c) => c.status === "pending").length;
  const rejected = (telemetry?.commands || []).filter((c) => c.status === "rejected").length;
  if (rejected) items.push({ tone: "bad", text: <><b>{rejected} command{rejected === 1 ? "" : "s"}</b> rejected by a phone.</>, page: "members" });
  if (pending) items.push({ tone: "warn", text: <><b>{pending} command{pending === 1 ? "" : "s"}</b> waiting for a phone.</>, page: "members" });
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const failures = (telemetry?.events || []).filter((e) => e.date && e.date >= weekAgo && (/fail|error/i.test(e.type) || Boolean(e.error))).length;
  if (failures) items.push({ tone: "warn", text: <><b>{failures} playback failure{failures === 1 ? "" : "s"}</b> in the last 7 days.</>, page: "members" });
  if (!items.length) items.push({ tone: "good", text: <>Nothing needs you right now.</> });
  return items;
}

function writeBrief({ revenue, revenuePrev, cpa, cpaPrev, trialsEnding, activeSubscriptions, activeDelta, conversion, range }) {
  const parts = [];
  if (Number.isFinite(revenue) && Number.isFinite(revenuePrev) && revenuePrev > 0) {
    const pct = ((revenue - revenuePrev) / revenuePrev) * 100;
    parts.push(`Revenue is ${pct >= 0 ? "up" : "down"} ${Math.abs(pct).toFixed(0)}% on the previous ${range.days === 1 ? "day" : `${range.days} days`}`);
  } else if (Number.isFinite(revenue)) parts.push(`${money(revenue)} of revenue in the range`);
  if (Number.isFinite(cpa)) parts.push(Number.isFinite(cpaPrev) ? `CPA ${cpa <= cpaPrev ? "fell" : "rose"} to ${money(cpa, "USD", { exact: true })}` : `CPA is ${money(cpa, "USD", { exact: true })}`);
  if (Number.isFinite(activeSubscriptions)) parts.push(`${count(activeSubscriptions)} active subscriptions${Number.isFinite(activeDelta) && activeDelta !== 0 ? ` (${activeDelta > 0 ? "+" : ""}${activeDelta})` : ""}`);
  if (trialsEnding) parts.push(`${trialsEnding} trial${trialsEnding === 1 ? "" : "s"} end${trialsEnding === 1 ? "s" : ""} within 3 days`);
  if (!parts.length) return "Waiting on the first numbers.";
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
  return `${greet} ${parts.join(", ")}.`;
}

export default function Pulse({ range, compare, ownerMetrics, ownerPrevious, ownerMetricsError, appleReport, appleError, membership, members, telemetry, now, onGo, onRetry, onOpenMember }) {
  const currency = ownerMetrics?.scope?.currency || "USD";
  const revenue = metric(ownerMetrics, "grossRevenue");
  const revenuePrev = metric(ownerPrevious, "grossRevenue");
  const mrr = metric(ownerMetrics, "mrr");
  const growth = Array.isArray(ownerMetrics?.growth?.points) ? ownerMetrics.growth.points : [];
  const mrrPrev = growthAt(growth, range.days, "mrr");
  const active = metric(ownerMetrics, "activeSubscriptions") ?? (Number.isFinite(membership?.totals?.paid) ? membership.totals.paid : null);
  const activePrev = growthAt(growth, range.days, "paid");
  const trials = metric(ownerMetrics, "activeTrials") ?? (Number.isFinite(membership?.totals?.trials) ? membership.totals.trials : null);
  const trialsRenewing = metric(ownerMetrics, "trialsSetToRenew");
  const trialsCanceled = Number.isFinite(trials) && Number.isFinite(trialsRenewing)
    ? Math.max(0, trials - trialsRenewing)
    : Number.isFinite(ownerMetrics?.metrics?.activeCancellations?.trials)
      ? Number(ownerMetrics.metrics.activeCancellations.trials)
      : null;
  const trialsPrev = growthAt(growth, range.days, "trials");
  const conversion = metric(ownerMetrics, "trialConversionRate");
  const conversionPrev = metric(ownerPrevious, "trialConversionRate");
  const firstPaid = metric(ownerMetrics, "firstPaidCustomers");
  const appleFirstPaid = metric(ownerMetrics, "appleAttributedFirstPaidCustomers");
  const trialsStarted = metric(ownerMetrics, "trialsStarted");
  const trialsSinceRelaunch = metric(ownerMetrics, "trialsSinceRelaunch");
  const spend = Number.isFinite(Number(appleReport?.totals?.spend)) ? Number(appleReport.totals.spend) : null;
  const installs = Number.isFinite(Number(appleReport?.totals?.totalInstalls)) ? Number(appleReport.totals.totalInstalls) : null;
  const appleCurrency = appleReport?.currency || appleReport?.totals?.currency || null;
  const costReady = spend !== null && appleCurrency === currency;
  const cpa = costReady && appleFirstPaid > 0 ? spend / appleFirstPaid : null;

  const revenueSeries = useMemo(() => fillDaily(ownerMetrics?.series?.grossRevenueDaily, range), [ownerMetrics, range]);
  const prevSeries = useMemo(() => (compare && ownerPrevious ? fillDaily(ownerPrevious?.series?.grossRevenueDaily, { startDate: ownerPrevious.scope.startDate, endDate: ownerPrevious.scope.endDate, days: range.days }) : []), [compare, ownerPrevious, range.days]);
  const sparkRevenue = revenueSeries.map((p) => p.value);
  const sparkTrials = growth.slice(-Math.max(2, Math.min(growth.length, range.days))).map((p) => p.trials);
  const sparkPaid = useMemo(() => fillDaily(ownerMetrics?.series?.firstPaidCustomersDaily, range).map((p) => p.value), [ownerMetrics, range]);
  const sparkActive = growth.slice(-Math.max(2, Math.min(growth.length, range.days))).map((p) => p.paid);
  const sparkMrr = growth.slice(-Math.max(2, Math.min(growth.length, range.days))).map((p) => p.mrr).filter(Number.isFinite);

  const attention = useMemo(() => buildAttention({ members, membership, telemetry, appleError, ownerMetrics, now }), [members, membership, telemetry, appleError, ownerMetrics, now]);
  const trialsEnding = useMemo(() => members.filter((m) => m.premiumPhase === "trial" && m.revenueCat?.subscription?.currentPeriodEndsAt && new Date(m.revenueCat.subscription.currentPeriodEndsAt) <= new Date(now.getTime() + 3 * 86400000)).length, [members, now]);

  const goals = useMemo(() => {
    const map = new Map();
    for (const m of members) map.set(m.goalTitle, (map.get(m.goalTitle) || 0) + 1);
    return [...map.entries()].map(([label, value]) => ({ key: label, label, value, sub: ratio(value, members.length) ? `${ratio(value, members.length)} of active` : "" })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [members]);

  const brief = writeBrief({ revenue, revenuePrev, cpa, cpaPrev: null, trialsEnding, activeSubscriptions: active, activeDelta: Number.isFinite(active) && Number.isFinite(activePrev) ? active - activePrev : null, conversion, range });
  const growthSeries = growth.map((p) => ({ date: p.date, value: p.paid }));

  return (
    <div className="pv-rise" style={{ display: "grid", gap: 12 }}>
      <Card className="pv-brief">
        <span className="mark"><Icons.spark /></span>
        <div style={{ minWidth: 0 }}>
          <h2>{brief}</h2>
          <div className="pv-faint" style={{ fontSize: 11, marginTop: 4, fontFamily: "var(--font-mono)" }}>{rangeLabel(range)} · UTC · RevenueCat {ownerMetrics?.fetchedAt ? `synced ${shortDate(ownerMetrics.fetchedAt.slice(0, 10))}` : ""}{ownerMetricsError ? " · business metrics unavailable" : ""}</div>
        </div>
      </Card>

      {ownerMetricsError ? <Unavailable reason={`RevenueCat business metrics: ${ownerMetricsError}`} onRetry={onRetry} /> : null}

      <div className="pv-kpis">
        <KpiTile label={`Revenue · ${range.preset === "custom" ? "range" : range.preset}`} value={money(revenue, currency, { compact: true, rounded: true })} current={revenue} previous={compare ? revenuePrev : null} compareLabel={`vs prev ${range.days}d`} spark={sparkRevenue} stripe="var(--pv-accent)" info={metricInfo(ownerMetrics, "grossRevenue")} onClick={() => onGo("revenue")} />
        <KpiTile label="MRR" value={money(mrr, currency, { compact: true, rounded: true })} current={mrr} previous={compare ? mrrPrev : null} compareLabel={`vs ${range.days}d ago`} spark={sparkMrr.length > 1 ? sparkMrr : null} stripe="var(--pv-accent)" info={metricInfo(ownerMetrics, "mrr")} onClick={() => onGo("revenue")} />
        <KpiTile label="Active subscriptions" value={count(active)} current={active} previous={compare ? activePrev : null} compareLabel={`vs ${range.days}d ago`} spark={sparkActive.length > 1 ? sparkActive : null} stripe="var(--pv-good)" info={metricInfo(ownerMetrics, "activeSubscriptions")} onClick={() => onGo("members")} />
        <KpiTile
          label="Trials renewing / active"
          value={Number.isFinite(trialsRenewing) && Number.isFinite(trials) ? `${count(trialsRenewing)} / ${count(trials)}` : count(trials)}
          sub={Number.isFinite(trialsRenewing) && Number.isFinite(trialsCanceled) ? `${count(trialsRenewing)} set to renew · ${count(trialsCanceled)} canceled with access` : "RevenueCat active trials"}
          spark={sparkTrials.length > 1 ? sparkTrials : null}
          stripe="var(--pv-violet)"
          info={{ body: "The first number is active trials still set to renew. The second is every unexpired active trial, including people who canceled but keep access until the trial ends.", source: "RevenueCat Overview + Subscription Status" }}
          onClick={() => onGo("retention")}
        />
        <KpiTile label="Trial → paid" value={percent(conversion)} current={conversion} previous={compare ? conversionPrev : null} compareLabel="vs prev" spark={sparkPaid.length > 1 ? sparkPaid : null} stripe="var(--pv-teal)" info={metricInfo(ownerMetrics, "trialConversionRate")} onClick={() => onGo("retention")} />
        <KpiTile label="CPA · Apple Ads" value={cpa !== null ? money(cpa, currency, { exact: true }) : null} sub={spend === null ? (appleError ? "Apple unavailable" : "No spend reported") : !costReady ? "Currency mismatch" : appleFirstPaid > 0 ? `${money(spend, currency)} spend · ${count(appleFirstPaid)} attributed first paid` : `${money(spend, currency)} spent · no attributed first paid yet`} stripe="var(--pv-amber)" info="Apple Ads spend in the range divided by first payments RevenueCat explicitly attributes to Apple Search Ads in the same range. Shown only when both services report the same currency." onClick={() => onGo("acquisition")} />
      </div>

      <div className="pv-bento">
        <Card className="pv-span-8">
          <CardHead label={<>Revenue · daily {compare && prevSeries.length ? <span className="pv-legend" style={{ marginLeft: 10 }}><span><i style={{ background: "var(--pv-accent)" }} />this range</span><span><i data-dash style={{ color: "var(--pv-violet)" }} />previous</span></span> : null}</>} info={metricInfo(ownerMetrics, "grossRevenue")} right={<button type="button" className="pv-chip" onClick={() => onGo("revenue")}>Open revenue <Icons.arrow style={{ width: 12, height: 12 }} /></button>} />
          <div className="pv-card-pad">
            <LineChart series={revenueSeries} compare={prevSeries} annotations={ANNOTATIONS} height={232} format={(v) => money(v, currency, { compact: true })} ariaLabel="Daily gross revenue" />
          </div>
        </Card>

        <div className="pv-span-4" style={{ display: "grid", gap: 12, gridTemplateRows: "auto 1fr" }}>
          <Card>
            <CardHead label="Funnel · this range" info="Apple Ads installs, then all App Store trial starts and first successful payments from RevenueCat in the same UTC range. Trials and payments are store-wide, not only ad-attributed." />
            <div className="pv-card-pad" style={{ display: "grid", gap: 10 }}>
              <Stage label="Installs" value={installs} max={installs} color="var(--pv-violet)" opacity={.45} note={installs === null ? (appleError ? "Apple unavailable" : "—") : null} />
              <Stage label="Trials" value={trialsStarted} max={installs ?? trialsStarted} color="var(--pv-violet)" opacity={.7} note={ratio(trialsStarted, installs) ? `${ratio(trialsStarted, installs)} of installs` : null} />
              <Stage label="Paid" value={firstPaid} max={installs ?? trialsStarted ?? firstPaid} color="var(--pv-violet)" opacity={1} note={ratio(firstPaid, trialsStarted) ? `${ratio(firstPaid, trialsStarted)} of trials` : null} />
              <div className="pv-faint" style={{ fontSize: 12, borderTop: "1px solid var(--pv-border)", paddingTop: 8 }}>
                {spend !== null && Number.isFinite(revenue) ? <>Spend {money(spend, currency)} → Revenue {money(revenue, currency)} · <b className="pv-ink pv-mono">{spend > 0 ? `${(revenue / spend).toFixed(2)}×` : "—"}</b></> : "Return shows when Apple spend and revenue are both available."}
              </div>
            </div>
          </Card>
          <Card>
            <CardHead label="Active subscriptions · daily" info="An exact RevenueCat Overview snapshot taken each UTC day this dashboard refreshes. Tracking starts with this corrected metric; earlier history is never invented." />
            <div className="pv-card-pad">
              {growthSeries.length > 1 ? <LineChart series={growthSeries} height={120} yTicks={2} ariaLabel="Active subscriptions per day" color="var(--pv-good)" /> : <Unavailable reason={ownerMetrics?.growth?.reason || "Growth tracking starts with the first snapshot."} />}
            </div>
          </Card>
        </div>

        <Card className="pv-span-4 pv-half">
          <CardHead label="Goals · active members" info="Active premium members grouped by the goal selected in the app." right={<button type="button" className="pv-chip" onClick={() => onGo("members")}>Members</button>} />
          <div className="pv-card-pad">{goals.length ? <RankedBars rows={goals} /> : <Unavailable reason="No active members synced yet." />}</div>
        </Card>

        <Card className="pv-span-4 pv-half">
          <CardHead label="Needs attention" />
          <div className="pv-card-pad" style={{ paddingTop: 4, paddingBottom: 4 }}>
            {attention.map((a, i) => (
              <div className="pv-alert" key={i} role={a.page ? "button" : undefined} tabIndex={a.page ? 0 : undefined} onClick={a.page ? () => onGo(a.page) : undefined} onKeyDown={a.page ? (e) => { if (e.key === "Enter") onGo(a.page); } : undefined} style={{ cursor: a.page ? "pointer" : "default" }}>
                <span className="pv-dot" style={{ background: a.tone === "good" ? "var(--pv-good)" : a.tone === "bad" ? "var(--pv-bad)" : "var(--pv-warn)" }} />
                <span>{a.text}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="pv-span-4 pv-half">
          <CardHead label="Acquisition · this range" right={<button type="button" className="pv-chip" onClick={() => onGo("acquisition")}>Open</button>} />
          <div className="pv-card-pad" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <MiniStat label="Spend" value={spend !== null ? money(spend, currency) : null} note={spend === null ? (appleError ? "Apple unavailable" : "—") : `${count(installs)} installs`} />
            <MiniStat label="Cost / install" value={spend !== null && installs > 0 ? money(spend / installs, currency, { exact: true }) : null} note={ratio(installs, Number(appleReport?.totals?.taps)) ? `${ratio(installs, Number(appleReport?.totals?.taps))} of taps` : "—"} />
            <MiniStat label="Trials" value={count(trialsStarted)} note={ratio(trialsStarted, installs) ? `${ratio(trialsStarted, installs)} of installs` : "all App Store"} />
            <MiniStat label="First paid" value={count(firstPaid)} note={cpa !== null ? `${money(cpa, currency, { exact: true })} each` : ratio(firstPaid, trialsStarted) ? `${ratio(firstPaid, trialsStarted)} of trials` : "—"} />
          </div>
        </Card>

        <Card className="pv-span-12">
          <CardHead label="Most recent members" right={<button type="button" className="pv-chip" onClick={() => onGo("members")}>All members <Icons.arrow style={{ width: 12, height: 12 }} /></button>} />
          <div className="pv-table-wrap">
            <table className="pv-table" data-density="compact">
              <thead><tr><th>Member</th><th>Access</th><th>Goal</th><th className="num">Day</th><th className="num">Streak</th><th>Last open</th><th>Renews</th></tr></thead>
              <tbody>
                {[...members].sort((a, b) => (b.joinedAt?.getTime() || 0) - (a.joinedAt?.getTime() || 0)).slice(0, 6).map((m) => (
                  <tr key={m.id} onClick={() => onOpenMember(m)}>
                    <td className="ink"><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className="pv-avatar">{(m.name || m.email || "?").slice(0, 2).toUpperCase()}</span>{displayName(m)}</span></td>
                    <td><span className="pv-pill" data-tone={m.premiumPhase === "paid" ? "good" : "accent"}>{m.premiumPhase === "paid" ? "Paid" : "Trial"}</span></td>
                    <td>{m.goalTitle}</td>
                    <td className="num">{Number.isFinite(m.programDay) ? m.programDay : "—"}</td>
                    <td className="num">{m.streak || 0}</td>
                    <td>{m.lastSeenAt ? relDay(m.lastSeenAt, now) : "Never"}</td>
                    <td className="pv-mono">{m.revenueCat?.subscription?.currentPeriodEndsAt ? shortDate(m.revenueCat.subscription.currentPeriodEndsAt.slice(0, 10)) : "—"}</td>
                  </tr>
                ))}
                {members.length === 0 ? <tr><td colSpan="7" style={{ textAlign: "center", color: "var(--pv-ink-3)" }}>No active members synced yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card>
        <CardHead
          label="Trial launch total"
          info={{ body: "The cumulative trial starts never comes from raw webhook rows. RevenueCat's New Trials chart counts the authoritative production App Store starts from launch day through today. The other three values are today's current trial state.", source: "RevenueCat New Trials + Overview + Subscription Status" }}
          right={<span className="pv-pill" data-tone="accent">Since Aug 15, 2026</span>}
        />
        <div className="pv-card-pad" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <MiniStat label="Total trial starts" value={count(trialsSinceRelaunch)} note="Cumulative since launch" />
          <MiniStat label="Still set to renew" value={count(trialsRenewing)} note="Auto-renew remains on" />
          <MiniStat label="Canceled renewal" value={count(trialsCanceled)} note="Access remains until expiry" />
          <MiniStat label="Trial access active" value={count(trials)} note="All unexpired trials today" />
        </div>
      </Card>
    </div>
  );
}

function MiniStat({ label, value, note }) {
  return (
    <div className="pv-inset" style={{ padding: "10px 12px", minWidth: 0 }}>
      <div className="pv-label" style={{ fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
      <div className="pv-num pv-ink" style={{ fontSize: 20, marginTop: 4, color: value === null || value === undefined ? "var(--pv-ink-3)" : undefined }}>{value ?? "—"}</div>
      <div className="pv-faint" style={{ fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note}</div>
    </div>
  );
}

function Stage({ label, value, max, color, opacity = 1, note }) {
  const pct = Number.isFinite(value) && Number.isFinite(max) && max > 0 ? Math.max(value > 0 ? 3 : 0, (value / max) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
        <span className="pv-ink" style={{ fontWeight: 500 }}>{label}</span>
        <span className="pv-mono pv-ink">{Number.isFinite(value) ? count(value) : <span className="pv-faint">{note || "—"}</span>}</span>
      </div>
      <div className="pv-bar" style={{ height: 10 }}><i style={{ width: `${pct}%`, background: color, opacity }} /></div>
      {note && Number.isFinite(value) ? <div className="pv-faint" style={{ fontSize: 11, marginTop: 3 }}>{note}</div> : null}
    </div>
  );
}

export function relDay(date, now) {
  const d = startOfDay(date); const t = startOfDay(now);
  const diff = Math.round((t - d) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 30) return `${diff} days ago`;
  return shortDate(date.toISOString().slice(0, 10));
}
