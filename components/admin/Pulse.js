"use client";

import { useMemo } from "react";
import { Card, CardHead, KpiTile, LineChart, RankedBars, Unavailable, Icons, money, count, ratio, shortDate } from "./ui";
import { ANNOTATIONS } from "@/lib/adminAnnotations";
import { paymentCampaignSpendCoverage } from "@/lib/adminAcquisitionAccuracy";
import { fillDaily, rangeLabel } from "@/lib/adminRange";
import { displayName, startOfDay } from "@/lib/adminMetrics";

export function metric(report, key) {
  const entry = report?.metrics?.[key];
  const value = Number(entry?.value);
  return entry?.available === true && Number.isFinite(value) ? value : null;
}

export function metricInfo(report, key) {
  const entry = report?.metrics?.[key];
  if (!entry?.definition) return null;
  return { body: entry.definition, source: entry.source };
}

function growthAt(points, daysAgo, field) {
  if (!Array.isArray(points) || !points.length) return null;
  const target = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
  let best = null;
  for (const point of points) if (point.date <= target && Number.isFinite(point[field])) best = point;
  return best ? best[field] : null;
}

export function buildAttention({ membership, telemetry, appleError, ownerMetrics }) {
  const items = [];
  const revenueCatCanceled = metric(ownerMetrics, "activeCancellations");
  const canceled = Number.isFinite(revenueCatCanceled)
    ? revenueCatCanceled
    : Number(membership?.totals?.canceledPaidWithAccess) || 0;
  if (canceled) items.push({ tone: "warn", text: <><b>{canceled} paid member{canceled === 1 ? "" : "s"}</b> still {canceled === 1 ? "has" : "have"} access but switched renewal off.</>, page: "members" });
  const refunds = metric(ownerMetrics, "refundedTransactions");
  if (refunds > 0) items.push({ tone: "bad", text: <><b>{refunds} refund{refunds === 1 ? "" : "s"}</b> in this range.</>, page: "revenue" });
  if (appleError) items.push({ tone: "warn", text: <><b>Apple Ads reporting unavailable</b> · {appleError}</>, page: "acquisition" });
  const pending = (telemetry?.commands || []).filter((command) => command.status === "pending").length;
  const rejected = (telemetry?.commands || []).filter((command) => command.status === "rejected").length;
  if (rejected) items.push({ tone: "bad", text: <><b>{rejected} command{rejected === 1 ? "" : "s"}</b> rejected by a phone.</>, page: "members" });
  if (pending) items.push({ tone: "warn", text: <><b>{pending} command{pending === 1 ? "" : "s"}</b> waiting for a phone.</>, page: "members" });
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const failures = (telemetry?.events || []).filter((event) => event.date && event.date >= weekAgo && (/fail|error/i.test(event.type) || Boolean(event.error))).length;
  if (failures) items.push({ tone: "warn", text: <><b>{failures} playback failure{failures === 1 ? "" : "s"}</b> in the last 7 days.</>, page: "members" });
  if (!items.length) items.push({ tone: "good", text: <>Nothing needs you right now.</> });
  return items;
}

function writeBrief({ revenue, revenuePrev, cpa, activeSubscriptions, activeDelta, payments, range, currency }) {
  const parts = [];
  if (Number.isFinite(revenue) && Number.isFinite(revenuePrev) && revenuePrev > 0) {
    const change = ((revenue - revenuePrev) / revenuePrev) * 100;
    parts.push(`Revenue is ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(0)}% on the previous ${range.days === 1 ? "day" : `${range.days} days`}`);
  } else if (Number.isFinite(revenue)) parts.push(`${money(revenue, currency)} of revenue in the range`);
  if (Number.isFinite(payments)) parts.push(`${count(payments)} first payment${payments === 1 ? "" : "s"}`);
  if (Number.isFinite(cpa)) parts.push(`CPA is ${money(cpa, currency, { exact: true })}`);
  if (Number.isFinite(activeSubscriptions)) parts.push(`${count(activeSubscriptions)} active paid subscriptions${Number.isFinite(activeDelta) && activeDelta !== 0 ? ` (${activeDelta > 0 ? "+" : ""}${activeDelta})` : ""}`);
  if (!parts.length) return "Waiting on the first numbers.";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
  return `${greeting} ${parts.join(", ")}.`;
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
  const payments = metric(ownerMetrics, "firstPayments");
  const paymentsPrev = metric(ownerPrevious, "firstPayments");
  const attributedPayments = metric(ownerMetrics, "appleAttributedPayments");
  const spend = Number.isFinite(Number(appleReport?.totals?.spend)) ? Number(appleReport.totals.spend) : null;
  const installs = Number.isFinite(Number(appleReport?.totals?.totalInstalls)) ? Number(appleReport.totals.totalInstalls) : null;
  const taps = Number.isFinite(Number(appleReport?.totals?.taps)) ? Number(appleReport.totals.taps) : null;
  const appleCurrency = appleReport?.currency || appleReport?.totals?.currency || null;
  const appleMoneyCurrency = appleCurrency || currency;
  const appScopeVerified = appleReport?.app?.filterApplied !== false;
  const selectedAcquisition = ownerMetrics?.acquisition?.selected || null;
  const selectedAttributed = Number.isFinite(Number(selectedAcquisition?.totals?.attributedPayments))
    ? Number(selectedAcquisition.totals.attributedPayments)
    : null;
  const selectedScopeMatches = selectedAcquisition?.scope?.startDate === range.startDate
    && selectedAcquisition?.scope?.endDate === range.endDate;
  const campaignSpendCoverage = paymentCampaignSpendCoverage(appleReport?.campaigns, selectedAcquisition?.campaigns);
  const costReady = spend !== null && appScopeVerified && appleCurrency === currency
    && selectedAcquisition?.available === true && selectedScopeMatches
    && selectedAttributed === attributedPayments && campaignSpendCoverage.complete;
  const cpa = costReady && attributedPayments > 0 ? spend / attributedPayments : null;
  const cpi = costReady && installs > 0 ? spend / installs : null;
  const installToPaid = costReady && installs > 0 ? attributedPayments / installs : null;
  const costCoverageReason = !campaignSpendCoverage.complete
    ? `${count(campaignSpendCoverage.unmatchedPayments)} attributed payment${campaignSpendCoverage.unmatchedPayments === 1 ? "" : "s"} lack Apple campaign history`
    : "Source coverage does not align";

  const revenueSeries = useMemo(() => fillDaily(ownerMetrics?.series?.grossRevenueDaily, range), [ownerMetrics, range]);
  const prevSeries = useMemo(() => (compare && ownerPrevious ? fillDaily(ownerPrevious?.series?.grossRevenueDaily, { startDate: ownerPrevious.scope.startDate, endDate: ownerPrevious.scope.endDate, days: range.days }) : []), [compare, ownerPrevious, range.days]);
  const sparkRevenue = revenueSeries.map((point) => point.value);
  const sparkPayments = useMemo(() => fillDaily(ownerMetrics?.series?.firstPaymentsDaily, range).map((point) => point.value), [ownerMetrics, range]);
  const sparkActive = growth.slice(-Math.max(2, Math.min(growth.length, range.days))).map((point) => point.paid);
  const sparkMrr = growth.slice(-Math.max(2, Math.min(growth.length, range.days))).map((point) => point.mrr).filter(Number.isFinite);
  const attention = useMemo(() => buildAttention({ membership, telemetry, appleError, ownerMetrics }), [membership, telemetry, appleError, ownerMetrics]);

  const goals = useMemo(() => {
    const map = new Map();
    for (const member of members) map.set(member.goalTitle, (map.get(member.goalTitle) || 0) + 1);
    return [...map.entries()]
      .map(([label, value]) => ({ key: label, label, value, sub: ratio(value, members.length) ? `${ratio(value, members.length)} of paid members` : "" }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);
  }, [members]);

  const brief = writeBrief({
    revenue,
    revenuePrev,
    cpa,
    activeSubscriptions: active,
    activeDelta: Number.isFinite(active) && Number.isFinite(activePrev) ? active - activePrev : null,
    payments,
    range,
    currency,
  });
  const growthSeries = growth.map((point) => ({ date: point.date, value: point.paid }));
  const baseline = ownerMetrics?.acquisition?.presets?.sinceRelaunch?.totals || {};
  const baselinePayments = Number.isFinite(Number(baseline.payments)) ? Number(baseline.payments) : null;
  const baselineAttributed = Number.isFinite(Number(baseline.attributedPayments)) ? Number(baseline.attributedPayments) : null;
  const baselineUnattributed = Number.isFinite(Number(baseline.unattributedPayments)) ? Number(baseline.unattributedPayments) : null;

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
        <KpiTile label="Active paid subscriptions" value={count(active)} current={active} previous={compare ? activePrev : null} compareLabel={`vs ${range.days}d ago`} spark={sparkActive.length > 1 ? sparkActive : null} stripe="var(--pv-good)" info={metricInfo(ownerMetrics, "activeSubscriptions")} onClick={() => onGo("members")} />
        <KpiTile label="First payments" value={count(payments)} current={payments} previous={compare ? paymentsPrev : null} compareLabel="vs previous" spark={sparkPayments.length > 1 ? sparkPayments : null} stripe="var(--pv-good)" info={metricInfo(ownerMetrics, "firstPayments")} onClick={() => onGo("acquisition")} />
        <KpiTile label="Install to payment" value={installToPaid !== null ? ratio(attributedPayments, installs, 1) : null} sub={installs === null ? "Apple unavailable" : !costReady ? costCoverageReason : `${count(attributedPayments)} attributed payments ÷ ${count(installs)} installs`} stripe="var(--pv-teal)" onClick={() => onGo("acquisition")} />
        <KpiTile label="CPA · Apple Ads" value={cpa !== null ? money(cpa, currency, { exact: true }) : null} sub={spend === null ? (appleError ? "Apple unavailable" : "No spend reported") : !costReady ? costCoverageReason : attributedPayments > 0 ? `${money(spend, currency)} spend · ${count(attributedPayments)} attributed payments` : `${money(spend, currency)} spent · no attributed payment yet`} stripe="var(--pv-amber)" info="Apple Ads spend divided only by first payments RevenueCat explicitly attributes to Apple Ads in the same UTC range. It is hidden when a paid RevenueCat campaign has no matching Apple spend row." onClick={() => onGo("acquisition")} />
      </div>

      <div className="pv-bento">
        <Card className="pv-span-8">
          <CardHead label={<>Revenue · daily {compare && prevSeries.length ? <span className="pv-legend" style={{ marginLeft: 10 }}><span><i style={{ background: "var(--pv-accent)" }} />this range</span><span><i data-dash style={{ color: "var(--pv-violet)" }} />previous</span></span> : null}</>} info={metricInfo(ownerMetrics, "grossRevenue")} right={<button type="button" className="pv-chip" onClick={() => onGo("revenue")}>Open revenue <Icons.arrow style={{ width: 12, height: 12 }} /></button>} />
          <div className="pv-card-pad"><LineChart series={revenueSeries} compare={prevSeries} annotations={ANNOTATIONS} height={232} format={(value) => money(value, currency, { compact: true })} ariaLabel="Daily gross revenue" /></div>
        </Card>

        <div className="pv-span-4" style={{ display: "grid", gap: 12, gridTemplateRows: "auto 1fr" }}>
          <Card>
            <CardHead label="Paid acquisition · this range" info="Installs come from Apple Ads. First payments come from RevenueCat. The conversion rate uses only payments RevenueCat attributes to Apple Ads." />
            <div className="pv-card-pad" style={{ display: "grid", gap: 10 }}>
              <Stage label="Apple Ads installs" value={installs} max={installs} color="var(--pv-violet)" opacity={.55} note={installs === null ? (appleError ? "Apple unavailable" : "—") : cpi !== null ? `${money(cpi, appleMoneyCurrency, { exact: true })} each` : null} />
              <Stage label="Attributed payments" value={attributedPayments} max={installs ?? attributedPayments} color="var(--pv-good)" opacity={1} note={!costReady && installs !== null ? costCoverageReason : ratio(attributedPayments, installs, 1) ? `${ratio(attributedPayments, installs, 1)} of installs` : null} />
              <div className="pv-faint" style={{ fontSize: 12, borderTop: "1px solid var(--pv-border)", paddingTop: 8 }}>Store-wide first payments: <b className="pv-ink pv-mono">{count(payments) ?? "—"}</b>. Campaign attribution: <b className="pv-ink pv-mono">{count(attributedPayments) ?? "—"}</b>.</div>
            </div>
          </Card>
          <Card>
            <CardHead label="Active paid subscriptions · daily" info="An exact RevenueCat Overview snapshot taken each UTC day this dashboard refreshes. Earlier missing days are never invented." />
            <div className="pv-card-pad">{growthSeries.length > 1 ? <LineChart series={growthSeries} height={120} yTicks={2} ariaLabel="Active paid subscriptions per day" color="var(--pv-good)" /> : <Unavailable reason={ownerMetrics?.growth?.reason || "Growth tracking starts with the first snapshot."} />}</div>
          </Card>
        </div>

        <Card className="pv-span-4 pv-half">
          <CardHead label="Goals · paid members" info="Paid members grouped by the goal selected in the app." right={<button type="button" className="pv-chip" onClick={() => onGo("members")}>Members</button>} />
          <div className="pv-card-pad">{goals.length ? <RankedBars rows={goals} /> : <Unavailable reason="No paid members synced yet." />}</div>
        </Card>

        <Card className="pv-span-4 pv-half">
          <CardHead label="Needs attention" />
          <div className="pv-card-pad" style={{ paddingTop: 4, paddingBottom: 4 }}>
            {attention.map((item, index) => (
              <div className="pv-alert" key={index} role={item.page ? "button" : undefined} tabIndex={item.page ? 0 : undefined} onClick={item.page ? () => onGo(item.page) : undefined} onKeyDown={item.page ? (event) => { if (event.key === "Enter") onGo(item.page); } : undefined} style={{ cursor: item.page ? "pointer" : "default" }}>
                <span className="pv-dot" style={{ background: item.tone === "good" ? "var(--pv-good)" : item.tone === "bad" ? "var(--pv-bad)" : "var(--pv-warn)" }} />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="pv-span-4 pv-half">
          <CardHead label="Acquisition · this range" right={<button type="button" className="pv-chip" onClick={() => onGo("acquisition")}>Open</button>} />
          <div className="pv-card-pad" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <MiniStat label="Spend" value={spend !== null ? money(spend, appleMoneyCurrency) : null} note={spend === null ? (appleError ? "Apple unavailable" : "—") : `${count(installs)} installs`} />
            <MiniStat label="Cost / install" value={cpi !== null ? money(cpi, appleMoneyCurrency, { exact: true }) : null} note={!costReady && installs !== null ? costCoverageReason : ratio(installs, taps) ? `${ratio(installs, taps)} of taps` : "—"} />
            <MiniStat label="Attributed payments" value={count(attributedPayments)} note={!costReady && installs !== null ? "rate hidden until source coverage aligns" : ratio(attributedPayments, installs, 1) ? `${ratio(attributedPayments, installs, 1)} of installs` : "RevenueCat"} />
            <MiniStat label="Cost / payment" value={cpa !== null ? money(cpa, currency, { exact: true }) : null} note={`${count(payments) ?? "—"} store-wide payments`} />
          </div>
        </Card>

        <Card className="pv-span-12">
          <CardHead label="Most recent paid members" right={<button type="button" className="pv-chip" onClick={() => onGo("members")}>All members <Icons.arrow style={{ width: 12, height: 12 }} /></button>} />
          <div className="pv-table-wrap">
            <table className="pv-table" data-density="compact">
              <thead><tr><th>Member</th><th>Payment</th><th>Goal</th><th className="num">Day</th><th className="num">Streak</th><th>Last open</th><th>Renews</th></tr></thead>
              <tbody>
                {[...members].sort((left, right) => (right.joinedAt?.getTime() || 0) - (left.joinedAt?.getTime() || 0)).slice(0, 6).map((member) => (
                  <tr key={member.id} onClick={() => onOpenMember(member)}>
                    <td className="ink"><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span className="pv-avatar">{(member.name || member.email || "?").slice(0, 2).toUpperCase()}</span>{displayName(member)}</span></td>
                    <td><span className="pv-pill" data-tone="good">Paid</span></td>
                    <td>{member.goalTitle}</td>
                    <td className="num">{Number.isFinite(member.programDay) ? member.programDay : "—"}</td>
                    <td className="num">{member.streak || 0}</td>
                    <td>{member.lastSeenAt ? relDay(member.lastSeenAt, now) : "Never"}</td>
                    <td className="pv-mono">{member.revenueCat?.subscription?.currentPeriodEndsAt ? shortDate(member.revenueCat.subscription.currentPeriodEndsAt.slice(0, 10)) : "—"}</td>
                  </tr>
                ))}
                {members.length === 0 ? <tr><td colSpan="7" style={{ textAlign: "center", color: "var(--pv-ink-3)" }}>No paid members synced yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card>
        <CardHead label="Payment total since Aug 15" info={{ body: "RevenueCat counts every subscription at its first successful charge. Apple-attributed is the confirmed campaign subset. The remainder stays separate instead of being guessed into an ad campaign.", source: "RevenueCat New Paid Subscriptions chart" }} right={<button type="button" className="pv-chip" onClick={() => onGo("acquisition")}>Open full history</button>} />
        <div className="pv-card-pad" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <MiniStat label="First payments" value={count(baselinePayments)} note="Store-wide" />
          <MiniStat label="Apple-attributed" value={count(baselineAttributed)} note="Confirmed by RevenueCat" />
          <MiniStat label="Other or unavailable" value={count(baselineUnattributed)} note="Never assigned by guess" />
          <MiniStat label="Attribution coverage" value={ratio(baselineAttributed, baselinePayments, 1)} note="Attributed ÷ total payments" />
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
  const width = Number.isFinite(value) && Number.isFinite(max) && max > 0 ? Math.max(value > 0 ? 3 : 0, (value / max) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
        <span className="pv-ink" style={{ fontWeight: 500 }}>{label}</span>
        <span className="pv-mono pv-ink">{Number.isFinite(value) ? count(value) : <span className="pv-faint">{note || "—"}</span>}</span>
      </div>
      <div className="pv-bar" style={{ height: 10 }}><i style={{ width: `${width}%`, background: color, opacity }} /></div>
      {note && Number.isFinite(value) ? <div className="pv-faint" style={{ fontSize: 11, marginTop: 3 }}>{note}</div> : null}
    </div>
  );
}

export function relDay(date, now) {
  const day = startOfDay(date);
  const today = startOfDay(now);
  const difference = Math.round((today - day) / 86400000);
  if (difference <= 0) return "Today";
  if (difference === 1) return "Yesterday";
  if (difference < 30) return `${difference} days ago`;
  return shortDate(date.toISOString().slice(0, 10));
}
