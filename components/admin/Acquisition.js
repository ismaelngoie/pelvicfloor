"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAppleAdsReport } from "@/lib/adminAppData";
import { formatCount, formatMoneyExact, formatPercent } from "@/lib/adminMetrics";
import { Card, ErrorState, SectionHeader } from "./ui";

function iso(date) {
  return date.toISOString().slice(0, 10);
}

function FunnelStep({ label, value, displayValue, denominator, detail, accent }) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--pv-ink-3)" }}>{label}</p>
      <p className="pv-figure mt-2 text-[40px] font-semibold leading-none" style={{ color: "var(--pv-ink)" }}>{displayValue ?? formatCount(value)}</p>
      <p className="mt-3 text-[13px]" style={{ color: "var(--pv-ink-2)" }}>{denominator ? formatPercent(value, denominator) : detail}</p>
      {denominator && detail ? <p className="mt-1 text-[12px]" style={{ color: "var(--pv-ink-3)" }}>{detail}</p> : null}
    </Card>
  );
}

export default function Acquisition({ user, telemetry, reloadToken }) {
  const [state, setState] = useState("loading");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  const range = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 27 * 86400000);
    return { start, end, startDate: iso(start), endDate: iso(end) };
  }, [reloadToken]);

  useEffect(() => {
    let active = true;
    setState("loading");
    setError("");
    fetchAppleAdsReport(user, range.startDate, range.endDate)
      .then((value) => {
        if (!active) return;
        setReport(value);
        setState("ready");
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason?.message || "Apple Ads did not load.");
        setState("error");
      });
    return () => { active = false; };
  }, [user, range.startDate, range.endDate, reloadToken]);

  const lifecycle = useMemo(() => telemetry.lifecycle.filter((event) => {
    if (event.environment && event.environment !== "PRODUCTION") return false;
    const attributedToAppleAds = event.mediaSource === "apple_search_ads" || Boolean(event.campaignId);
    return attributedToAppleAds && event.occurredAt && event.occurredAt >= range.start && event.occurredAt <= new Date(range.end.getTime() + 86400000);
  }), [telemetry.lifecycle, range]);

  const trialStarts = lifecycle.filter((event) => event.type === "INITIAL_PURCHASE" && event.periodType === "TRIAL");
  const directPurchases = lifecycle.filter((event) => event.type === "INITIAL_PURCHASE" && event.periodType !== "TRIAL");
  const trialPaid = lifecycle.filter((event) => event.type === "RENEWAL" && event.trialConversion);
  const paid = trialPaid.length + directPurchases.length;
  const appleTotals = report?.totals || {};
  const installs = Number(appleTotals.totalInstalls) || 0;
  const spend = Number(appleTotals.spend) || 0;

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader eyebrow="Apple Ads · last 28 days" title="Installs to paid members" description="Apple supplies spend, taps, and installs. RevenueCat supplies trial starts and first paid renewals. The dashboard joins them by the campaign attribution already sent by the iPhone app." />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FunnelStep label="Apple Ads installs" value={installs} detail={state === "ready" ? `${formatMoneyExact(spend)} spent` : "Loading from Apple"} accent="var(--pv-rose)" />
          <FunnelStep label="Trials started" value={trialStarts.length} denominator={installs} detail="of attributed installs" accent="var(--pv-violet)" />
          <FunnelStep label="Became paid" value={paid} denominator={trialStarts.length + directPurchases.length} detail="trial conversions plus direct purchases" accent="var(--pv-good)" />
          <FunnelStep label="Cost per paid" value={paid} displayValue={paid > 0 ? formatMoneyExact(spend / paid) : "—"} detail={paid > 0 ? "Apple Ads spend divided by matched paid members" : "Waiting for the first matched paid conversion"} accent="linear-gradient(90deg,var(--pv-rose),var(--pv-good))" />
        </div>
      </section>

      {!telemetry.lifecycleAvailable || telemetry.lifecycle.length === 0 ? (
        <Card className="p-5" style={{ borderColor: "color-mix(in srgb, var(--pv-warn) 55%, var(--pv-border))" }}>
          <p className="text-[14px] font-semibold" style={{ color: "var(--pv-ink)" }}>No RevenueCat lifecycle events have reached this dashboard yet</p>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>Trial and paid counts begin when RevenueCat sends its production App Store webhooks to Pelvi. That server connection does not change the iPhone app and does not need App Review.</p>
        </Card>
      ) : null}

      {state === "error" ? (
        <Card className="p-4"><ErrorState title="Apple Ads reporting is not connected yet" description={error} /></Card>
      ) : state === "loading" ? (
        <div className="pv-skeleton h-72 w-full" />
      ) : (
        <CampaignTable campaigns={report?.campaigns || []} lifecycle={lifecycle} />
      )}
    </div>
  );
}

function CampaignTable({ campaigns, lifecycle }) {
  const rows = campaigns.map((campaign) => {
    const id = String(campaign.id || campaign.campaignId || "");
    const name = campaign.name || campaign.campaignName || "Unnamed campaign";
    const events = lifecycle.filter((event) => event.campaignId === id || (!event.campaignId && event.campaignName === name));
    const trials = events.filter((event) => event.type === "INITIAL_PURCHASE" && event.periodType === "TRIAL").length;
    const paid = events.filter((event) => (event.type === "RENEWAL" && event.trialConversion) || (event.type === "INITIAL_PURCHASE" && event.periodType !== "TRIAL")).length;
    return { ...campaign, id, name, trials, paid };
  });

  return (
    <section>
      <SectionHeader eyebrow="Campaign truth" title="Every campaign in one table" description="Spend and installs come from Apple. Trials and paid conversions come from RevenueCat, never from an estimate." />
      <Card flat className="overflow-hidden" style={{ background: "var(--pv-surface-solid)" }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[13px]">
            <thead><tr style={{ borderBottom: "1px solid var(--pv-border)" }}>
              {['Campaign','Spend','Taps','Installs','Trials','Paid','Cost / paid'].map((label) => <th key={label} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--pv-ink-3)" }}>{label}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((row) => {
                const spend = Number(row.spend) || 0;
                return <tr key={row.id || row.name} style={{ borderBottom: "1px solid var(--pv-border)" }}>
                  <td className="px-4 py-4"><p className="font-semibold" style={{ color: "var(--pv-ink)" }}>{row.name}</p><p className="mt-1 text-[11px]" style={{ color: "var(--pv-ink-3)" }}>{row.status || ""}</p></td>
                  <td className="pv-tabular px-4 py-4">{formatMoneyExact(spend)}</td>
                  <td className="pv-tabular px-4 py-4">{formatCount(Number(row.taps) || 0)}</td>
                  <td className="pv-tabular px-4 py-4">{formatCount(Number(row.installs) || 0)}</td>
                  <td className="pv-tabular px-4 py-4">{formatCount(row.trials)}</td>
                  <td className="pv-tabular px-4 py-4 font-semibold">{formatCount(row.paid)}</td>
                  <td className="pv-tabular px-4 py-4">{row.paid ? formatMoneyExact(spend / row.paid) : "—"}</td>
                </tr>;
              })}
              {!rows.length ? <tr><td colSpan="7" className="px-5 py-12 text-center" style={{ color: "var(--pv-ink-2)" }}>No Apple Ads campaign rows were returned for this period.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  );
}
