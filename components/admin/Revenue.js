"use client";

import { useMemo } from "react";
import { Card, CardHead, KpiTile, LineChart, PageHead, Unavailable, money, count, percent, shortDate } from "./ui";
import { ANNOTATIONS } from "@/lib/adminAnnotations";
import { fillDaily, rangeLabel } from "@/lib/adminRange";
import { displayName } from "@/lib/adminMetrics";
import { REPORTING_START_LABEL } from "@/lib/adminReporting";
import { metric, metricInfo } from "./Pulse";

export default function Revenue({ range, compare, ownerMetrics, ownerPrevious, ownerMetricsError, members, now, onRetry, onOpenMember }) {
  const currency = ownerMetrics?.scope?.currency || "USD";
  const revenue = metric(ownerMetrics, "grossRevenue");
  const revenuePrev = metric(ownerPrevious, "grossRevenue");
  const mrr = metric(ownerMetrics, "mrr");
  const arr = metric(ownerMetrics, "arr");
  const renewing = metric(ownerMetrics, "paidSetToRenew");
  const cancels = metric(ownerMetrics, "activeCancellations");
  const refunds = metric(ownerMetrics, "refundedTransactions");
  const refundDetail = ownerMetrics?.metrics?.refundedTransactions || {};
  const mrrDetail = ownerMetrics?.metrics?.mrr || {};
  const firstPayments = metric(ownerMetrics, "firstPayments");
  const firstPaymentsPrev = metric(ownerPrevious, "firstPayments");
  const growth = Array.isArray(ownerMetrics?.growth?.points) ? ownerMetrics.growth.points : [];

  const series = useMemo(() => fillDaily(ownerMetrics?.series?.grossRevenueDaily, range), [ownerMetrics, range]);
  const previousSeries = useMemo(() => (compare && ownerPrevious ? fillDaily(ownerPrevious?.series?.grossRevenueDaily, { startDate: ownerPrevious.scope.startDate, endDate: ownerPrevious.scope.endDate, days: range.days }) : []), [compare, ownerPrevious, range.days]);
  const paymentSeries = useMemo(() => fillDaily(ownerMetrics?.series?.firstPaymentsDaily, range), [ownerMetrics, range]);
  const mrrSeries = growth.filter((point) => Number.isFinite(point.mrr)).map((point) => ({ date: point.date, value: point.mrr }));

  const renewals = useMemo(() => {
    const horizon = now.getTime() + 30 * 86400000;
    const rows = members
      .map((member) => ({ member, at: member.revenueCat?.subscription?.currentPeriodEndsAt ? new Date(member.revenueCat.subscription.currentPeriodEndsAt) : null }))
      .filter((row) => row.member.premiumPhase === "paid" && row.member.revenueCat?.isRenewing === true && row.at && row.at.getTime() >= now.getTime() - 86400000 && row.at.getTime() <= horizon)
      .sort((left, right) => left.at - right.at);
    const weeks = [0, 1, 2, 3].map((week) => ({ key: week, label: week === 0 ? "This week" : `Week +${week}`, value: 0 }));
    for (const row of rows) {
      const week = Math.min(3, Math.max(0, Math.floor((row.at.getTime() - now.getTime()) / (7 * 86400000))));
      weeks[week].value += 1;
    }
    return { rows, weeks };
  }, [members, now]);
  const renewalMax = Math.max(1, ...renewals.weeks.map((week) => week.value));

  return (
    <div className="pv-rise" style={{ display: "grid", gap: 12 }}>
      <PageHead title="Revenue" description={`Direct-pay reporting from ${REPORTING_START_LABEL} · ${rangeLabel(range)} · UTC`} />
      {ownerMetricsError ? <Unavailable reason={`RevenueCat business metrics: ${ownerMetricsError}`} onRetry={onRetry} /> : null}

      <div className="pv-kpis">
        <KpiTile label="Revenue · range" value={money(revenue, currency, { compact: true })} current={revenue} previous={compare ? revenuePrev : null} compareLabel={`vs prev ${range.days}d`} spark={series.map((point) => point.value)} stripe="var(--pv-accent)" info={metricInfo(ownerMetrics, "grossRevenue")} size="lg" />
        <KpiTile label="First payments" value={count(firstPayments)} current={firstPayments} previous={compare ? firstPaymentsPrev : null} compareLabel="vs previous" spark={paymentSeries.map((point) => point.value)} stripe="var(--pv-good)" info={metricInfo(ownerMetrics, "firstPayments")} />
        <KpiTile label="MRR" value={money(mrr, currency)} sub={Number.isFinite(mrrDetail.setToCancel) ? `${money(mrrDetail.setToCancel, currency)} set to cancel` : "current run rate"} spark={mrrSeries.length > 1 ? mrrSeries.map((point) => point.value) : null} stripe="var(--pv-accent)" info={metricInfo(ownerMetrics, "mrr")} />
        <KpiTile label="Paid and renewing" value={count(renewing)} sub="active subscriptions with renewal on" stripe="var(--pv-good)" info={metricInfo(ownerMetrics, "paidSetToRenew")} />
        <KpiTile label="Set to cancel" value={count(cancels)} sub="paid access remains until period end" stripe={cancels > 0 ? "var(--pv-warn)" : "var(--pv-border-strong)"} info={metricInfo(ownerMetrics, "activeCancellations")} />
        <KpiTile label="Refunds · range" value={count(refunds)} sub={Number.isFinite(refundDetail.refundRate) ? `${percent(refundDetail.refundRate)} of ${count(refundDetail.paidTransactions)} transactions` : "transactions refunded"} stripe={refunds > 0 ? "var(--pv-bad)" : "var(--pv-good)"} info={metricInfo(ownerMetrics, "refundedTransactions")} />
        <KpiTile label="ARR" value={money(arr, currency, { compact: true })} sub="run rate, not cash collected" info={metricInfo(ownerMetrics, "arr")} />
      </div>

      <div className="pv-bento">
        <Card className="pv-span-8">
          <CardHead label={<>Daily revenue {compare && previousSeries.length ? <span className="pv-legend" style={{ marginLeft: 10 }}><span><i style={{ background: "var(--pv-accent)" }} />this range</span><span><i data-dash style={{ color: "var(--pv-violet)" }} />previous</span></span> : null}</>} info={metricInfo(ownerMetrics, "grossRevenue")} />
          <div className="pv-card-pad"><LineChart series={series} compare={previousSeries} annotations={ANNOTATIONS} height={260} format={(value) => money(value, currency, { compact: true })} ariaLabel="Daily gross revenue" /></div>
        </Card>

        <Card className="pv-span-4">
          <CardHead label="First payments · daily" info={metricInfo(ownerMetrics, "firstPayments")} />
          <div className="pv-card-pad">
            <div className="pv-kpi-value" style={{ marginTop: 0 }}>{count(firstPayments) ?? "—"}</div>
            <div className="pv-faint" style={{ fontSize: 12, marginTop: 4 }}>Every subscription is counted on its first successful charge.</div>
            <div style={{ marginTop: 16 }}><LineChart series={paymentSeries} height={145} yTicks={3} ariaLabel="First payments per day" color="var(--pv-good)" /></div>
          </div>
        </Card>

        <Card className="pv-span-6 pv-half">
          <CardHead label="Upcoming paid renewals · 30 days" info="Paid members whose current RevenueCat period ends in the next 30 days and whose renewal remains on. No future revenue amount is estimated." />
          <div className="pv-card-pad">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {renewals.weeks.map((week) => (
                <div key={week.key} className="pv-inset" style={{ padding: 10 }}>
                  <div className="pv-label" style={{ fontSize: 10 }}>{week.label}</div>
                  <div className="pv-num pv-ink" style={{ fontSize: 22, marginTop: 4 }}>{week.value}</div>
                  <div className="pv-bar" style={{ marginTop: 6 }}><i style={{ width: `${(week.value / renewalMax) * 100}%`, background: "var(--pv-accent)" }} /></div>
                  <div className="pv-faint" style={{ fontSize: 11, marginTop: 6 }}>paid renewals</div>
                </div>
              ))}
            </div>
            <div className="pv-rows" style={{ marginTop: 8 }}>
              {renewals.rows.slice(0, 6).map(({ member, at }) => (
                <div className="pv-row" key={member.id} role="button" tabIndex={0} onClick={() => onOpenMember(member)} onKeyDown={(event) => { if (event.key === "Enter") onOpenMember(member); }} style={{ cursor: "pointer" }}>
                  <span className="pv-avatar">{(member.name || member.email || "?").slice(0, 2).toUpperCase()}</span>
                  <div style={{ minWidth: 0 }}><div className="t">{displayName(member)}</div><div className="d">Renews {shortDate(at.toISOString().slice(0, 10))}</div></div>
                  <span className="v"><span className="pv-pill" data-tone="good">Paid</span></span>
                </div>
              ))}
              {!renewals.rows.length ? <div className="pv-faint" style={{ fontSize: 12.5, padding: "8px 0" }}>No paid renewals fall inside the next 30 days.</div> : null}
            </div>
          </div>
        </Card>

        <Card className="pv-span-6 pv-half">
          <CardHead label="MRR · daily snapshots" info="Gross MRR as RevenueCat reported it on each day this dashboard refreshed." />
          <div className="pv-card-pad">
            {mrrSeries.length > 1 ? <LineChart series={mrrSeries} height={180} yTicks={3} format={(value) => money(value, currency, { compact: true })} color="var(--pv-accent)" ariaLabel="MRR snapshots" /> : <Unavailable reason={ownerMetrics?.growth?.reason || "MRR tracking starts with the first snapshot."} />}
            <div className="pv-legend" style={{ marginTop: 10, gap: 18 }}>
              <span>Renewing <b className="pv-ink pv-mono">{money(mrrDetail.setToRenew, currency) ?? "—"}</b></span>
              <span>Set to cancel <b className="pv-ink pv-mono">{money(mrrDetail.setToCancel, currency) ?? "—"}</b></span>
              <span>Billing issue <b className="pv-ink pv-mono">{money(mrrDetail.billingIssue, currency) ?? "—"}</b></span>
            </div>
          </div>
        </Card>

      </div>
      <div className="pv-faint" style={{ fontSize: 12 }}>Revenue, first payments and refunds begin {REPORTING_START_LABEL}. MRR, ARR and renewal cards are current subscription snapshots. Future charges are never estimated.</div>
    </div>
  );
}
