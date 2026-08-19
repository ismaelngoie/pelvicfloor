"use client";

// Revenue — what the business has earned and what it is about to earn.
// Everything here is RevenueCat's own number: gross, before Apple's cut,
// exactly as the Charts API reports it. No net figure is invented.

import { useMemo } from "react";
import { Card, CardHead, KpiTile, LineChart, PageHead, RankedBars, Unavailable, money, count, percent, shortDate } from "./ui";
import { ANNOTATIONS } from "@/lib/adminAnnotations";
import { fillDaily, rangeLabel } from "@/lib/adminRange";
import { ANNUAL_PRICE_USD, displayName } from "@/lib/adminMetrics";
import { metric, metricInfo } from "./Pulse";

export default function Revenue({ range, compare, ownerMetrics, ownerPrevious, ownerMetricsError, members, now, onRetry, onOpenMember }) {
  const currency = ownerMetrics?.scope?.currency || "USD";
  const revenue = metric(ownerMetrics, "grossRevenue");
  const revenuePrev = metric(ownerPrevious, "grossRevenue");
  const lifetime = metric(ownerMetrics, "lifetimeGrossRevenue");
  const lifetimeTx = metric(ownerMetrics, "lifetimeTransactions");
  const mrr = metric(ownerMetrics, "mrr");
  const arr = metric(ownerMetrics, "arr");
  const paid = metric(ownerMetrics, "paidSetToRenew");
  const trials = metric(ownerMetrics, "trialsSetToRenew");
  const cancels = metric(ownerMetrics, "activeCancellations");
  const refunds = metric(ownerMetrics, "refundedTransactions");
  const refundDetail = ownerMetrics?.metrics?.refundedTransactions || {};
  const mrrDetail = ownerMetrics?.metrics?.mrr || {};
  const firstPaid = metric(ownerMetrics, "firstPaidCustomers");
  const firstPaidDetail = ownerMetrics?.metrics?.firstPaidCustomers || {};
  const growth = Array.isArray(ownerMetrics?.growth?.points) ? ownerMetrics.growth.points : [];

  const series = useMemo(() => fillDaily(ownerMetrics?.series?.grossRevenueDaily, range), [ownerMetrics, range]);
  const prevSeries = useMemo(() => (compare && ownerPrevious ? fillDaily(ownerPrevious?.series?.grossRevenueDaily, { startDate: ownerPrevious.scope.startDate, endDate: ownerPrevious.scope.endDate, days: range.days }) : []), [compare, ownerPrevious, range.days]);
  const monthly = useMemo(() => (Array.isArray(ownerMetrics?.series?.lifetimeGrossRevenueMonthly) ? ownerMetrics.series.lifetimeGrossRevenueMonthly.slice(-24) : []), [ownerMetrics]);
  const mrrSeries = growth.filter((p) => Number.isFinite(p.mrr)).map((p) => ({ date: p.date, value: p.mrr }));

  // Upcoming renewals: every active member whose current period ends in the next 30 days.
  const renewals = useMemo(() => {
    const horizon = now.getTime() + 30 * 86400000;
    const rows = members
      .map((m) => ({ m, at: m.revenueCat?.subscription?.currentPeriodEndsAt ? new Date(m.revenueCat.subscription.currentPeriodEndsAt) : null }))
      .filter((r) => r.at && r.at.getTime() >= now.getTime() - 86400000 && r.at.getTime() <= horizon)
      .sort((a, b) => a.at - b.at);
    const weeks = [0, 1, 2, 3].map((w) => ({ key: w, label: w === 0 ? "This week" : `Week +${w}`, paid: 0, trial: 0 }));
    for (const r of rows) {
      const w = Math.min(3, Math.floor((r.at.getTime() - now.getTime()) / (7 * 86400000)));
      if (r.m.premiumPhase === "trial") weeks[w].trial += 1; else weeks[w].paid += 1;
    }
    return { rows, weeks };
  }, [members, now]);
  const renewalMax = Math.max(1, ...renewals.weeks.map((w) => w.paid + w.trial));

  return (
    <div className="pv-rise" style={{ display: "grid", gap: 12 }}>
      <PageHead title="Revenue" description={`Gross customer revenue before Apple commission and taxes · ${rangeLabel(range)} · UTC`} />
      {ownerMetricsError ? <Unavailable reason={`RevenueCat business metrics: ${ownerMetricsError}`} onRetry={onRetry} /> : null}

      <div className="pv-kpis">
        <KpiTile label="Revenue · range" value={money(revenue, currency, { compact: true })} current={revenue} previous={compare ? revenuePrev : null} compareLabel={`vs prev ${range.days}d`} spark={series.map((p) => p.value)} stripe="var(--pv-accent)" info={metricInfo(ownerMetrics, "grossRevenue")} size="lg" />
        <KpiTile label="Lifetime gross" value={money(lifetime, currency, { compact: true })} sub={Number.isFinite(lifetimeTx) ? `${count(lifetimeTx)} transactions since 2020` : "since Jan 2020"} info={metricInfo(ownerMetrics, "lifetimeGrossRevenue")} />
        <KpiTile label="MRR" value={money(mrr, currency)} sub={Number.isFinite(mrrDetail.setToCancel) ? `${money(mrrDetail.setToCancel, currency)} set to cancel` : "current run rate"} spark={mrrSeries.length > 1 ? mrrSeries.map((p) => p.value) : null} stripe="var(--pv-accent)" info={metricInfo(ownerMetrics, "mrr")} />
        <KpiTile label="ARR" value={money(arr, currency, { compact: true })} sub="not cash collected" info={metricInfo(ownerMetrics, "arr")} />
        <KpiTile label="Set to cancel" value={count(cancels)} sub={Number.isFinite(ownerMetrics?.metrics?.activeCancellations?.paid) ? `${ownerMetrics.metrics.activeCancellations.paid} paid · ${ownerMetrics.metrics.activeCancellations.trials} trials` : "still have access"} stripe={cancels > 0 ? "var(--pv-warn)" : "var(--pv-border-strong)"} info={metricInfo(ownerMetrics, "activeCancellations")} />
        <KpiTile label="Refunds · range" value={count(refunds)} sub={Number.isFinite(refundDetail.refundRate) ? `${percent(refundDetail.refundRate)} of ${count(refundDetail.paidTransactions)} transactions` : "transactions refunded"} stripe={refunds > 0 ? "var(--pv-bad)" : "var(--pv-good)"} info={metricInfo(ownerMetrics, "refundedTransactions")} />
      </div>

      <div className="pv-bento">
        <Card className="pv-span-8">
          <CardHead label={<>Daily revenue {compare && prevSeries.length ? <span className="pv-legend" style={{ marginLeft: 10 }}><span><i style={{ background: "var(--pv-accent)" }} />this range</span><span><i data-dash style={{ color: "var(--pv-violet)" }} />previous</span></span> : null}</>} info={metricInfo(ownerMetrics, "grossRevenue")} />
          <div className="pv-card-pad"><LineChart series={series} compare={prevSeries} annotations={ANNOTATIONS} height={260} format={(v) => money(v, currency, { compact: true })} ariaLabel="Daily gross revenue" /></div>
        </Card>
        <Card className="pv-span-4">
          <CardHead label="New paid · range" info={metricInfo(ownerMetrics, "firstPaidCustomers")} />
          <div className="pv-card-pad">
            <div className="pv-kpi-value" style={{ marginTop: 0 }}>{count(firstPaid) ?? "—"}</div>
            <div style={{ marginTop: 12 }}>
              <RankedBars rows={[
                { key: "trial", label: "Converted after a trial", value: Number(firstPaidDetail.trialConversions) || 0 },
                { key: "direct", label: "Paid without a trial", value: Number(firstPaidDetail.direct) || 0 },
                { key: "intro", label: "Introductory offers", value: Number(firstPaidDetail.introductoryOffers) || 0 },
                { key: "resub", label: "Resubscriptions", value: Number(firstPaidDetail.resubscriptions) || 0 },
              ].filter((r) => Number.isFinite(firstPaid))} color="var(--pv-accent)" />
            </div>
            {!Number.isFinite(firstPaid) ? <Unavailable reason="RevenueCat did not return new paid subscriptions." /> : null}
          </div>
        </Card>

        <Card className="pv-span-6 pv-half">
          <CardHead label="Upcoming renewals · 30 days" info="Active members whose current period ends in the next 30 days, from the RevenueCat subscription attached to each profile. Amounts are an estimate at the current annual price; RevenueCat decides the real charge." />
          <div className="pv-card-pad">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {renewals.weeks.map((w) => (
                <div key={w.key} className="pv-inset" style={{ padding: 10 }}>
                  <div className="pv-label" style={{ fontSize: 10 }}>{w.label}</div>
                  <div className="pv-num pv-ink" style={{ fontSize: 22, marginTop: 4 }}>{w.paid + w.trial}</div>
                  <div className="pv-bar" style={{ marginTop: 6 }}><i style={{ width: `${((w.paid + w.trial) / renewalMax) * 100}%`, background: "var(--pv-accent)" }} /></div>
                  <div className="pv-faint" style={{ fontSize: 11, marginTop: 6 }}>{w.paid} paid · {w.trial} trial</div>
                </div>
              ))}
            </div>
            <div className="pv-faint" style={{ fontSize: 12, marginTop: 10 }}>≈ {money(renewals.rows.length * ANNUAL_PRICE_USD, currency)} if every renewal goes through at {money(ANNUAL_PRICE_USD, currency, { exact: true })}/yr.</div>
            <div className="pv-rows" style={{ marginTop: 6 }}>
              {renewals.rows.slice(0, 6).map(({ m, at }) => (
                <div className="pv-row" key={m.id} role="button" tabIndex={0} onClick={() => onOpenMember(m)} onKeyDown={(e) => { if (e.key === "Enter") onOpenMember(m); }} style={{ cursor: "pointer" }}>
                  <span className="pv-avatar">{(m.name || m.email || "?").slice(0, 2).toUpperCase()}</span>
                  <div style={{ minWidth: 0 }}><div className="t">{displayName(m)}</div><div className="d">{m.premiumPhase === "trial" ? "Trial ends" : "Renews"} {shortDate(at.toISOString().slice(0, 10))}</div></div>
                  <span className="v"><span className="pv-pill" data-tone={m.premiumPhase === "paid" ? "good" : "accent"}>{m.premiumPhase === "paid" ? "Paid" : "Trial"}</span></span>
                </div>
              ))}
              {!renewals.rows.length ? <div className="pv-faint" style={{ fontSize: 12.5, padding: "8px 0" }}>No renewals fall inside the next 30 days.</div> : null}
            </div>
          </div>
        </Card>

        <Card className="pv-span-6 pv-half">
          <CardHead label="MRR · daily snapshots" info="Gross MRR as RevenueCat reported it on each day this dashboard refreshed." />
          <div className="pv-card-pad">
            {mrrSeries.length > 1 ? <LineChart series={mrrSeries} height={180} yTicks={3} format={(v) => money(v, currency, { compact: true })} color="var(--pv-accent)" ariaLabel="MRR snapshots" /> : <Unavailable reason={ownerMetrics?.growth?.reason || "MRR tracking starts with the first snapshot."} />}
            <div className="pv-legend" style={{ marginTop: 10, gap: 18 }}>
              <span>Renewing <b className="pv-ink pv-mono">{money(mrrDetail.setToRenew, currency) ?? "—"}</b></span>
              <span>Set to cancel <b className="pv-ink pv-mono">{money(mrrDetail.setToCancel, currency) ?? "—"}</b></span>
              <span>Billing issue <b className="pv-ink pv-mono">{money(mrrDetail.billingIssue, currency) ?? "—"}</b></span>
            </div>
          </div>
        </Card>

        <Card className="pv-span-12">
          <CardHead label="Lifetime · monthly gross revenue" info={metricInfo(ownerMetrics, "lifetimeGrossRevenue")} />
          <div className="pv-card-pad">
            {monthly.length > 1 ? <LineChart series={monthly} height={200} yTicks={3} format={(v) => money(v, currency, { compact: true })} color="var(--pv-violet)" ariaLabel="Monthly gross revenue since 2020" /> : <Unavailable reason="RevenueCat did not return the monthly lifetime series." />}
          </div>
        </Card>
      </div>
      <div className="pv-faint" style={{ fontSize: 12 }}>Paid and renewing: <b className="pv-ink pv-mono">{count(paid) ?? "—"}</b> · Trials set to renew: <b className="pv-ink pv-mono">{count(trials) ?? "—"}</b> · All figures RevenueCat API v2, production App Store, UTC.</div>
    </div>
  );
}
