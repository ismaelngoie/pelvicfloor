"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAppleAdsReport } from "@/lib/adminAppData";
import { formatCount, formatMoneyExact, formatPercent } from "@/lib/adminMetrics";
import { Card, ErrorState, SectionHeader } from "./ui";

const DAY_MS = 86400000;
export const REVENUECAT_COVERAGE_START_MS = Date.UTC(2026, 7, 15);
const ATTRIBUTION_FIELDS = [
  "mediaSource",
  "campaignId",
  "campaignName",
  "adGroupId",
  "adGroupName",
  "keyword",
];

function iso(date) {
  return date.toISOString().slice(0, 10);
}

export function utcRange(days) {
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const endExclusive = new Date(todayUtc + DAY_MS);
  const start = new Date(endExclusive.getTime() - days * DAY_MS);
  return {
    start,
    endExclusive,
    startDate: iso(start),
    endDate: iso(new Date(endExclusive.getTime() - 1)),
  };
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function eventTime(event) {
  const value = event?.occurredAt instanceof Date
    ? event.occurredAt.getTime()
    : new Date(event?.occurredAt || 0).getTime();
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function buildIdentityResolver(events) {
  const parents = new Map();

  const add = (value) => {
    const id = text(value);
    if (id && !parents.has(id)) parents.set(id, id);
    return id;
  };

  const find = (value) => {
    const id = add(value);
    if (!id) return "";
    const parent = parents.get(id);
    if (parent === id) return id;
    const root = find(parent);
    parents.set(id, root);
    return root;
  };

  const union = (left, right) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (!leftRoot || !rightRoot || leftRoot === rightRoot) return;
    const [root, child] = [leftRoot, rightRoot].sort();
    parents.set(child, root);
  };

  for (const event of events) {
    const appUserId = add(event.appUserId);
    const originalAppUserId = add(event.originalAppUserId);
    if (appUserId && originalAppUserId) union(appUserId, originalAppUserId);
  }

  return (event) => {
    const userId = text(event.appUserId) || text(event.originalAppUserId);
    if (userId) return `user:${find(userId)}`;
    const originalTransactionId = text(event.originalTransactionId);
    if (originalTransactionId) return `original-transaction:${originalTransactionId}`;
    const transactionId = text(event.transactionId);
    if (transactionId) return `transaction:${transactionId}`;
    return `event:${text(event.id) || eventTime(event)}`;
  };
}

function dedupeKey(event) {
  const type = text(event.type);
  const periodType = text(event.periodType);
  const transactionId = text(event.transactionId);
  if (transactionId) return `${type}|${periodType}|transaction:${transactionId}`;
  const originalTransactionId = text(event.originalTransactionId);
  if (originalTransactionId) {
    return `${type}|${periodType}|original:${originalTransactionId}|time:${eventTime(event)}`;
  }
  const id = text(event.id);
  if (id) return `event:${id}`;
  return `${event._identity}|${type}|${periodType}|${eventTime(event)}`;
}

function mergeDuplicateEvent(current, incoming) {
  const merged = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    if (key === "occurredAt" && Number.isFinite(eventTime(current))) continue;
    if (key === "trialConversion") {
      merged[key] = current[key] === true || value === true;
      continue;
    }
    if (value instanceof Date) {
      if (Number.isFinite(value.getTime())) merged[key] = value;
      continue;
    }
    if (typeof value === "string") {
      if (value.trim()) merged[key] = value;
      continue;
    }
    if (value !== null && value !== undefined) merged[key] = value;
  }
  return merged;
}

export function prepareLifecycle(events, range) {
  const sorted = [...events].sort((left, right) => eventTime(left) - eventTime(right));
  const identityFor = buildIdentityResolver(sorted);
  const deduped = new Map();

  for (const event of sorted) {
    const identified = { ...event, _identity: identityFor(event) };
    const key = dedupeKey(identified);
    const current = deduped.get(key);
    deduped.set(key, current ? mergeDuplicateEvent(current, identified) : identified);
  }

  const chronological = [...deduped.values()].sort((left, right) => eventTime(left) - eventTime(right));
  const attributionByIdentity = new Map();
  for (const event of chronological) {
    const known = { ...(attributionByIdentity.get(event._identity) || {}) };
    for (const field of ATTRIBUTION_FIELDS) {
      const value = text(event[field]);
      if (value) known[field] = value;
    }
    attributionByIdentity.set(event._identity, known);
  }

  return chronological.map((event) => {
    const known = attributionByIdentity.get(event._identity) || {};
    const merged = { ...event };
    for (const field of ATTRIBUTION_FIELDS) {
      if (!text(merged[field]) && text(known[field])) merged[field] = known[field];
    }
    return merged;
  }).filter((event) => {
    if (event.environment && event.environment !== "PRODUCTION") return false;
    const source = text(event.mediaSource).toLowerCase().replace(/[\s-]+/g, "_");
    const attributedToAppleAds = source === "apple_search_ads" || source === "apple_ads"
      || Boolean(text(event.campaignId) || text(event.campaignName));
    const occurredAt = eventTime(event);
    return attributedToAppleAds
      && occurredAt >= range.start.getTime()
      && occurredAt < range.endExclusive.getTime();
  });
}

function uniqueBy(events, keyFor) {
  const unique = new Map();
  for (const event of events) {
    const key = keyFor(event);
    if (!unique.has(key)) unique.set(key, event);
  }
  return [...unique.values()];
}

function trialStartKey(event) {
  return text(event.originalTransactionId)
    || text(event.transactionId)
    || event._identity;
}

export function summarizeLifecycle(events) {
  const trialStarts = uniqueBy(
    events.filter((event) => event.type === "INITIAL_PURCHASE" && event.periodType === "TRIAL"),
    trialStartKey
  );
  const directPurchases = uniqueBy(
    events.filter((event) => event.type === "INITIAL_PURCHASE" && event.periodType !== "TRIAL"),
    (event) => text(event.transactionId) || text(event.originalTransactionId) || event._identity
  );

  const trialsByOriginalTransaction = new Map();
  const trialsByIdentity = new Map();
  for (const trial of trialStarts) {
    const originalTransactionId = text(trial.originalTransactionId);
    if (originalTransactionId && !trialsByOriginalTransaction.has(originalTransactionId)) {
      trialsByOriginalTransaction.set(originalTransactionId, trial);
    }
    if (!trialsByIdentity.has(trial._identity)) trialsByIdentity.set(trial._identity, trial);
  }

  const convertedCohorts = new Map();
  for (const event of events) {
    if (event.type !== "RENEWAL" || event.trialConversion !== true) continue;
    const originalTransactionId = text(event.originalTransactionId);
    const trial = (originalTransactionId && trialsByOriginalTransaction.get(originalTransactionId))
      || trialsByIdentity.get(event._identity);
    if (!trial || eventTime(event) < eventTime(trial)) continue;
    const cohortKey = trialStartKey(trial);
    if (!convertedCohorts.has(cohortKey)) convertedCohorts.set(cohortKey, event);
  }
  const trialConversions = [...convertedCohorts.values()];
  const paidMembers = uniqueBy(
    [...directPurchases, ...trialConversions].sort((left, right) => eventTime(left) - eventTime(right)),
    (event) => event._identity || text(event.originalTransactionId) || text(event.transactionId)
  );

  return { trialStarts, directPurchases, trialConversions, paidMembers };
}

function normalizedName(value) {
  return text(value).toLocaleLowerCase();
}

function campaignMatchesEvent(campaignId, campaignName, event) {
  const eventCampaignId = text(event.campaignId);
  if (eventCampaignId) return Boolean(campaignId) && eventCampaignId === campaignId;
  return Boolean(campaignName)
    && normalizedName(event.campaignName) === normalizedName(campaignName);
}

function FunnelStep({ label, value, displayValue, denominator, detail, accent }) {
  const hasDenominator = denominator !== null && denominator !== undefined;
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--pv-ink-3)" }}>{label}</p>
      <p className="pv-figure mt-2 text-[40px] font-semibold leading-none" style={{ color: "var(--pv-ink)" }}>{displayValue ?? formatCount(value)}</p>
      <p className="mt-3 text-[13px]" style={{ color: "var(--pv-ink-2)" }}>{hasDenominator ? formatPercent(value, denominator) : detail}</p>
      {hasDenominator && detail ? <p className="mt-1 text-[12px]" style={{ color: "var(--pv-ink-3)" }}>{detail}</p> : null}
    </Card>
  );
}

export default function Acquisition({ user, telemetry, reloadToken }) {
  const [state, setState] = useState("loading");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  const range = useMemo(() => {
    return utcRange(28);
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

  const lifecycle = useMemo(() => {
    const events = Array.isArray(telemetry?.lifecycle) ? telemetry.lifecycle : [];
    return prepareLifecycle(events, range);
  }, [telemetry?.lifecycle, range]);

  const lifecycleMetrics = useMemo(() => summarizeLifecycle(lifecycle), [lifecycle]);
  const { trialStarts, directPurchases, trialConversions, paidMembers } = lifecycleMetrics;
  const telemetryAvailable = telemetry?.lifecycleAvailable === true;
  const sourceLifecycle = Array.isArray(telemetry?.lifecycle) ? telemetry.lifecycle : [];
  const paid = paidMembers.length;
  const appleTotals = report?.totals || {};
  const installs = Number(appleTotals.totalInstalls) || 0;
  const spend = Number(appleTotals.spend) || 0;
  const appleAvailable = state === "ready";
  const revenueCatCoverageComplete = range.start.getTime() >= REVENUECAT_COVERAGE_START_MS;

  return (
    <div className="space-y-10">
      <section>
        <SectionHeader eyebrow="Apple Ads · last 28 days" title="Installs to paid members" description={revenueCatCoverageComplete ? "Apple supplies spend, taps, and installs. RevenueCat supplies trial starts and first paid renewals. The dashboard joins them by the campaign attribution already sent by the iPhone app." : "Apple Ads covers the full 28 days. RevenueCat webhook history begins Aug 15, 2026, so trial and paid counts only cover events observed since then. Mixed-source rates stay blank until RevenueCat covers the full window."} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FunnelStep label="Apple Ads installs" value={installs} displayValue={appleAvailable ? undefined : "—"} detail={appleAvailable ? `${formatMoneyExact(spend)} spent` : state === "loading" ? "Loading from Apple" : "Apple reporting unavailable"} accent="var(--pv-rose)" />
          <FunnelStep label="Trials started" value={trialStarts.length} displayValue={telemetryAvailable ? undefined : "—"} denominator={telemetryAvailable && appleAvailable && revenueCatCoverageComplete ? installs : undefined} detail={!telemetryAvailable ? "RevenueCat telemetry unavailable" : !revenueCatCoverageComplete ? "Observed since RevenueCat connected Aug 15" : appleAvailable ? "of attributed installs" : "matched Apple Ads trials"} accent="var(--pv-violet)" />
          <FunnelStep label="Trials became paid" value={trialConversions.length} displayValue={telemetryAvailable ? undefined : "—"} denominator={telemetryAvailable ? trialStarts.length : undefined} detail={!telemetryAvailable ? "RevenueCat telemetry unavailable" : `${formatCount(directPurchases.length)} direct purchases excluded; only observed trial cohorts`} accent="var(--pv-good)" />
          <FunnelStep label="Cost per paid" value={paid} displayValue={appleAvailable && telemetryAvailable && revenueCatCoverageComplete && paid > 0 ? formatMoneyExact(spend / paid) : "—"} detail={!appleAvailable ? "Apple reporting unavailable" : !telemetryAvailable ? "RevenueCat telemetry unavailable" : !revenueCatCoverageComplete ? "Waiting for 28 matching days of RevenueCat coverage" : paid > 0 ? "Spend divided by matched first paid members, including direct purchases" : "No matched paid members in this period"} accent="linear-gradient(90deg,var(--pv-rose),var(--pv-good))" />
        </div>
      </section>

      {!telemetryAvailable ? (
        <Card className="p-5" style={{ borderColor: "color-mix(in srgb, var(--pv-warn) 55%, var(--pv-border))" }}>
          <p className="text-[14px] font-semibold" style={{ color: "var(--pv-ink)" }}>RevenueCat lifecycle telemetry is unavailable</p>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>The dashboard could not read the lifecycle collection, so trial and paid values are shown as unavailable rather than as zero.</p>
        </Card>
      ) : sourceLifecycle.length === 0 ? (
        <Card className="p-5">
          <p className="text-[14px] font-semibold" style={{ color: "var(--pv-ink)" }}>RevenueCat is connected, with no lifecycle events yet</p>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>The lifecycle collection loaded successfully. No events have been observed since webhook coverage began Aug 15, 2026; earlier days in Apple’s 28-day window are not represented.</p>
        </Card>
      ) : lifecycle.length === 0 ? (
        <Card className="p-5">
          <p className="text-[14px] font-semibold" style={{ color: "var(--pv-ink)" }}>No matched Apple Ads lifecycle events in this period</p>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed" style={{ color: "var(--pv-ink-2)" }}>RevenueCat loaded successfully and no matched events were observed within its available coverage. Webhook history begins Aug 15, 2026, so this is not yet a complete 28-day conversion zero.</p>
        </Card>
      ) : null}

      {state === "error" ? (
        <Card className="p-4"><ErrorState title="Apple Ads reporting is not connected yet" description={error} /></Card>
      ) : state === "loading" ? (
        <div className="pv-skeleton h-72 w-full" />
      ) : (
        <CampaignTable campaigns={report?.campaigns || []} lifecycle={lifecycle} telemetryAvailable={telemetryAvailable} revenueCatCoverageComplete={revenueCatCoverageComplete} />
      )}
    </div>
  );
}

function CampaignTable({ campaigns, lifecycle, telemetryAvailable, revenueCatCoverageComplete }) {
  const rows = campaigns.map((campaign) => {
    const id = text(String(campaign.id || campaign.campaignId || ""));
    const name = campaign.name || campaign.campaignName || "Unnamed campaign";
    const events = lifecycle.filter((event) => campaignMatchesEvent(id, name, event));
    const metrics = summarizeLifecycle(events);
    return {
      ...campaign,
      id,
      name,
      trials: metrics.trialStarts.length,
      paid: metrics.paidMembers.length,
    };
  });

  return (
    <section>
      <SectionHeader eyebrow="Campaign truth" title="Every campaign in one table" description={!telemetryAvailable ? "Spend and installs come from Apple. Trial and paid cells show unavailable because RevenueCat telemetry could not be read." : revenueCatCoverageComplete ? "Spend and installs come from Apple. Trials and paid conversions come from RevenueCat, never from an estimate." : "Apple spend and installs cover 28 days. RevenueCat trial and paid counts begin Aug 15, 2026, so cost per paid stays blank until both sources cover the same window."} />
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
                  <td className="pv-tabular px-4 py-4">{telemetryAvailable ? formatCount(row.trials) : "—"}</td>
                  <td className="pv-tabular px-4 py-4 font-semibold">{telemetryAvailable ? formatCount(row.paid) : "—"}</td>
                  <td className="pv-tabular px-4 py-4">{telemetryAvailable && revenueCatCoverageComplete && row.paid ? formatMoneyExact(spend / row.paid) : "—"}</td>
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
