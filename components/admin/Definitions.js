"use client";

// Definitions — every metric, in plain English, straight from the metadata
// RevenueCat and the endpoints already attach to each number. This is where
// the paragraphs that used to live on every card now live.

import { useMemo } from "react";
import { Card, CardHead, PageHead } from "./ui";

const LABELS = {
  grossRevenue: "Revenue (range)", lifetimeGrossRevenue: "Lifetime gross revenue", lifetimeTransactions: "Lifetime transactions",
  mrr: "MRR", arr: "ARR", activeSubscriptions: "Active subscriptions", activeTrials: "Active trials", activePremium: "Active access", paidSetToRenew: "Paid and renewing", trialsSetToRenew: "Trials renewing",
  trialsStarted: "Trials started", trialsCanceled: "Trials set to cancel", trialsConvertedToPaid: "Converted to paid", cohortTrialConversions: "Cohort conversions",
  pendingTrialOutcomes: "Pending trial outcomes", trialExpirations: "Trial expirations", trialConversionRate: "Trial → paid rate", activeCancellations: "Set to cancel",
  refundedTransactions: "Refunded transactions", refundedRevenue: "Refunded revenue", firstPaidCustomers: "First paid", newCustomers: "New customers", activeCustomers: "Active customers", appleAttributedTrialsStarted: "Apple-attributed trials", appleAttributedFirstPaidCustomers: "Apple-attributed first paid",
};

const EXTRA = [
  { id: "cpa", label: "CPA (Apple Ads)", body: "Apple Ads spend in the range divided by first payments RevenueCat explicitly attributes to Apple Search Ads in the same range. Only shown when Apple and RevenueCat report the same currency and dates.", source: "Apple Ads Campaign Management API 5 · RevenueCat Charts API v2" },
  { id: "cpt", label: "Cost per trial", body: "Apple Ads spend divided by trial starts RevenueCat explicitly attributes to Apple Search Ads.", source: "Apple Ads · RevenueCat attribution" },
  { id: "cpi", label: "Cost per install", body: "Apple Ads spend divided by Apple-reported installs (new downloads plus re-downloads).", source: "Apple Ads" },
  { id: "seen", label: "Seen today / 7 days", body: "Active premium profiles whose latest iPhone app launch stored in Firebase falls in the window. Membership itself is verified by RevenueCat.", source: "Firestore profiles" },
  { id: "journey", label: "The 90-day journey", body: "Program day stored on each active profile: started (day 1+), past the first week (day 8+), finished (day 90).", source: "Firestore profiles" },
  { id: "cohorts", label: "Cohorts by join week", body: "Profiles grouped by creation week; each column is the share of that cohort that is premium now, reached day 2 or day 8, or opened the app in the last 7 days. Current state, not a historical replay.", source: "Firestore profiles joined to RevenueCat" },
  { id: "growth", label: "Active subscriptions (daily)", body: "An exact RevenueCat Overview snapshot taken each UTC day the dashboard refreshes. Missed days and earlier history are never invented.", source: "RevenueCat Overview metrics, stored by this dashboard" },
];

export default function Definitions({ ownerMetrics }) {
  const rows = useMemo(() => {
    const metrics = ownerMetrics?.metrics || {};
    return Object.entries(metrics).filter(([, m]) => m && typeof m === "object" && m.definition).map(([key, m]) => ({ id: key, label: LABELS[key] || key, body: m.definition, source: m.source, unavailable: m.available === false ? m.reason : null }));
  }, [ownerMetrics]);
  return (
    <div className="pv-rise" style={{ display: "grid", gap: 12 }}>
      <PageHead title="Definitions" description="What every number on this dashboard means and where it comes from. Nothing here is estimated; if a source does not report a figure, the dashboard shows it as unavailable." />
      <Card>
        <CardHead label="RevenueCat metrics" right={<span className="pv-faint" style={{ fontSize: 12 }}>{rows.length ? `${rows.length} defined` : "Load the dashboard once to populate"}</span>} />
        <div className="pv-card-pad" style={{ display: "grid", gap: 0 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16, padding: "10px 0", borderTop: "1px solid var(--pv-border)" }}>
              <div className="pv-ink" style={{ fontWeight: 600, fontSize: 13 }}>{r.label}</div>
              <div><p className="pv-muted" style={{ margin: 0, fontSize: 13, maxWidth: "80ch" }}>{r.body}</p>{r.source ? <div className="pv-faint pv-mono" style={{ fontSize: 10.5, marginTop: 4 }}>{r.source}</div> : null}{r.unavailable ? <div style={{ fontSize: 12, marginTop: 4, color: "var(--pv-warn)" }}>{r.unavailable}</div> : null}</div>
            </div>
          ))}
          {!rows.length ? <p className="pv-faint" style={{ margin: 0, fontSize: 13 }}>Definitions arrive with the first RevenueCat report.</p> : null}
        </div>
      </Card>
      <Card>
        <CardHead label="Derived on this dashboard" />
        <div className="pv-card-pad">
          {EXTRA.map((r) => (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16, padding: "10px 0", borderTop: "1px solid var(--pv-border)" }}>
              <div className="pv-ink" style={{ fontWeight: 600, fontSize: 13 }}>{r.label}</div>
              <div><p className="pv-muted" style={{ margin: 0, fontSize: 13, maxWidth: "80ch" }}>{r.body}</p><div className="pv-faint pv-mono" style={{ fontSize: 10.5, marginTop: 4 }}>{r.source}</div></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
