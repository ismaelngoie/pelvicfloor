"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAppleAdsReport } from "@/lib/adminAppData";
import { FIXTURES_ON } from "@/lib/devFixtures";
import { acquisitionPaymentCounts, buildPaymentKeywordGroups, keywordsForCampaign, paymentCampaignSpendCoverage, sumCoveredDailySeries } from "@/lib/adminAcquisitionAccuracy";
import { REPORTING_START_DATE, REPORTING_START_LABEL } from "@/lib/adminReporting";
import { Card, CardHead, KpiTile, PageHead, Ribbon, RowsSkeleton, Segmented, Unavailable, money, count, ratio } from "./ui";

const DAY_MS = 86400000;
export const ACQUISITION_BASELINE_DATE = REPORTING_START_DATE;
const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "sinceRelaunch", label: `Since ${REPORTING_START_LABEL}` },
];
const ATTRIBUTION_FIELDS = [
  "mediaSource", "campaignId", "campaignName", "adGroupId", "adGroupName", "keyword",
];

function iso(date) {
  return date.toISOString().slice(0, 10);
}

function utcToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function acquisitionRange(preset, todayValue = utcToday()) {
  const today = new Date(todayValue);
  const baseline = new Date(`${ACQUISITION_BASELINE_DATE}T00:00:00Z`);
  if (today < baseline) {
    return {
      start: baseline,
      endExclusive: new Date(baseline.getTime() + DAY_MS),
      startDate: ACQUISITION_BASELINE_DATE,
      endDate: ACQUISITION_BASELINE_DATE,
      pending: true,
    };
  }
  const endExclusive = new Date(today.getTime() + DAY_MS);
  const startDate = preset === "today"
    ? iso(today)
    : ACQUISITION_BASELINE_DATE;
  return {
    start: new Date(`${startDate}T00:00:00Z`),
    endExclusive,
    startDate,
    endDate: iso(new Date(endExclusive.getTime() - 1)),
  };
}

export function utcRange(days = 28) {
  const today = utcToday();
  const amount = Math.max(1, Math.round(Number(days) || 1));
  const start = new Date(today.getTime() - (amount - 1) * DAY_MS);
  const endExclusive = new Date(today.getTime() + DAY_MS);
  return {
    start,
    endExclusive,
    startDate: iso(start),
    endDate: iso(new Date(endExclusive.getTime() - 1)),
  };
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizedName(value) {
  return text(value)
    .toLocaleLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
  if (originalTransactionId) return `${type}|${periodType}|original:${originalTransactionId}|time:${eventTime(event)}`;
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

function attributionKey(event) {
  const originalTransactionId = text(event.originalTransactionId);
  return originalTransactionId ? `subscription:${originalTransactionId}` : event._identity;
}

export function prepareLifecycle(events, range, { attributedOnly = true } = {}) {
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
  const attributionBySubscription = new Map();
  for (const event of chronological) {
    const key = attributionKey(event);
    const known = { ...(attributionBySubscription.get(key) || {}) };
    for (const field of ATTRIBUTION_FIELDS) {
      const value = text(event[field]);
      if (value) known[field] = value;
    }
    attributionBySubscription.set(key, known);
  }
  return chronological.map((event) => {
    const known = attributionBySubscription.get(attributionKey(event)) || {};
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
    return (!attributedOnly || attributedToAppleAds)
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

function isFirstPayment(event) {
  return (event.type === "INITIAL_PURCHASE" && event.periodType !== "TRIAL")
    || (event.type === "RENEWAL" && event.trialConversion === true);
}

export function summarizePayments(events) {
  const payments = uniqueBy(
    events.filter(isFirstPayment).sort((left, right) => eventTime(left) - eventTime(right)),
    (event) => text(event.transactionId) || text(event.originalTransactionId) || event._identity
  );
  const paidMembers = uniqueBy(
    payments,
    (event) => event._identity || text(event.originalTransactionId) || text(event.transactionId)
  );
  return { payments, paidMembers };
}

function selectedCampaignOutcomes(ownerMetrics, preset) {
  const value = ownerMetrics?.acquisition?.presets?.[preset];
  return value && typeof value === "object" ? value : null;
}

export default function Acquisition({ user, telemetry, reloadToken, ownerMetrics, ownerMetricsError }) {
  const [preset, setPreset] = useState("sinceRelaunch");
  const [state, setState] = useState("loading");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const range = useMemo(() => acquisitionRange(preset), [preset]);

  useEffect(() => {
    let active = true;
    setState("loading");
    setError("");
    if (range.pending) {
      setReport({
        source: "Apple Ads Campaign Management API 5",
        fetchedAt: Date.now(),
        range: { startDate: range.startDate, endDate: range.endDate },
        app: { filterApplied: true, campaignFilterApplied: true, campaignScope: "running_or_active_in_range" },
        currency: "USD",
        totals: { impressions: 0, taps: 0, totalInstalls: 0, newDownloads: 0, redownloads: 0, spend: 0, currency: "USD" },
        campaigns: [],
      });
      setState("ready");
      return () => { active = false; };
    }
    const request = process.env.NODE_ENV !== "production" && FIXTURES_ON
      ? import("@/lib/devFixtureData").then((f) => f.fixtureAppleReport({ startDate: range.startDate, endDate: range.endDate, days: 1 }))
      : fetchAppleAdsReport(user, range.startDate, range.endDate);
    request
      .then((value) => { if (!active) return; setReport(value); setState("ready"); })
      .catch((reason) => { if (!active) return; setReport(null); setError(reason?.message || "Apple Ads did not load."); setState("error"); });
    return () => { active = false; };
  }, [user, range.startDate, range.endDate, reloadToken]);

  const lifecycleEvents = useMemo(() => (Array.isArray(telemetry?.lifecycle) ? telemetry.lifecycle : []), [telemetry?.lifecycle]);
  const attributedLifecycle = useMemo(() => prepareLifecycle(lifecycleEvents, range), [lifecycleEvents, range]);
  const allLifecycle = useMemo(() => prepareLifecycle(lifecycleEvents, range, { attributedOnly: false }), [lifecycleEvents, range]);
  const attributedFallback = useMemo(() => summarizePayments(attributedLifecycle), [attributedLifecycle]);
  const storeWideFallback = useMemo(() => summarizePayments(allLifecycle), [allLifecycle]);
  const selectedOutcomes = selectedCampaignOutcomes(ownerMetrics, preset);
  const historicalCampaignsAvailable = selectedOutcomes?.available === true;
  const outcomeScopeMatches = selectedOutcomes?.scope?.startDate === range.startDate && selectedOutcomes?.scope?.endDate === range.endDate;
  const telemetryAvailable = telemetry?.lifecycleAvailable === true;
  const appleTotals = report?.totals || {};
  const installs = finiteNumber(appleTotals.totalInstalls) || 0;
  const newDownloads = finiteNumber(appleTotals.newDownloads);
  const redownloads = finiteNumber(appleTotals.redownloads);
  const spend = finiteNumber(appleTotals.spend) || 0;
  const taps = finiteNumber(appleTotals.taps) || 0;
  const impressions = finiteNumber(appleTotals.impressions) || 0;
  const appleAvailable = state === "ready";
  const appleAppScopeVerified = report?.app?.filterApplied !== false;
  const outcomeTotals = selectedOutcomes?.totals || {};
  const attributedPayments = historicalCampaignsAvailable
    ? finiteNumber(outcomeTotals.attributedPayments)
    : telemetryAvailable ? attributedFallback.payments.length : null;
  const coveredStoreWide = sumCoveredDailySeries(ownerMetrics?.series?.firstPaymentsDaily, ownerMetrics?.scope, range);
  const observedPayments = historicalCampaignsAvailable
    ? finiteNumber(outcomeTotals.payments)
    : coveredStoreWide ?? (telemetryAvailable ? storeWideFallback.payments.length : null);
  const paymentCounts = acquisitionPaymentCounts({ totalPayments: observedPayments, attributedPayments });
  const totalPayments = paymentCounts.totalPayments;
  const ownerCurrency = ownerMetrics?.scope?.currency || null;
  const appleCurrency = report?.currency || report?.totals?.currency || null;
  const campaignSpendCoverage = paymentCampaignSpendCoverage(report?.campaigns, selectedOutcomes?.campaigns);
  const baseCostCoverageAligned = appleAvailable && appleAppScopeVerified && historicalCampaignsAvailable
    && outcomeScopeMatches && Boolean(ownerCurrency) && ownerCurrency === appleCurrency
    && attributedPayments !== null;
  const costCoverageAligned = baseCostCoverageAligned && campaignSpendCoverage.complete;
  const periodLabel = `${range.startDate} to ${range.endDate} UTC`;
  const isToday = preset === "today";
  // Every spend-only value belongs to Apple's reporting currency. CPA is
  // exposed only when RevenueCat uses that same currency, so this label stays
  // correct even if the owner changes the RevenueCat display currency later.
  const currency = appleCurrency || ownerCurrency || "USD";
  const cpa = costCoverageAligned && attributedPayments > 0 ? spend / attributedPayments : null;
  const cpi = costCoverageAligned && installs > 0 ? spend / installs : null;
  const paidRate = costCoverageAligned && installs > 0 ? attributedPayments / installs : null;
  const sourceDetail = historicalCampaignsAvailable
    ? "RevenueCat first-payment receipts segmented by Apple Ads campaign"
    : telemetryAvailable
      ? "Recent RevenueCat webhook fallback"
      : "RevenueCat payment outcomes unavailable";
  const attributionCaption = Number.isFinite(totalPayments) && Number.isFinite(attributedPayments)
    ? `${count(attributedPayments)} Apple-attributed, ${count(paymentCounts.unattributedPayments)} organic or unavailable`
    : "RevenueCat payment total unavailable";
  const coverageNote = baseCostCoverageAligned && !campaignSpendCoverage.complete
    ? `Historical payments remain visible, but cost and install rates are hidden because Apple did not return campaign rows for ${count(campaignSpendCoverage.unmatchedPayments)} RevenueCat-attributed payment${campaignSpendCoverage.unmatchedPayments === 1 ? "" : "s"}. Missing spend is never treated as zero.`
    : costCoverageAligned
    ? `Apple spend and RevenueCat payment outcomes cover the same dates and currency. ${isToday ? "Today is still in progress and both services can revise recent numbers." : "No payment is assigned to a campaign unless RevenueCat reports it."}`
    : ownerMetricsError || selectedOutcomes?.reason || "CPA is hidden until Apple and RevenueCat return matching dates, currency, and app scope.";
  const coverageBadge = costCoverageAligned
    ? "Dates and currency aligned"
    : baseCostCoverageAligned && !campaignSpendCoverage.complete
      ? "Partial Apple history"
      : "CPA hidden";

  return (
    <div className="pv-rise" style={{ display: "grid", gap: 12 }}>
      <PageHead
        title="Acquisition"
        description={`Apple Ads installs turning into first payments · ${periodLabel}`}
        right={<Segmented options={RANGE_OPTIONS} value={preset} onChange={setPreset} label="Apple Ads reporting period" />}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span className="pv-pill" data-tone={historicalCampaignsAvailable ? "good" : "warn"} title={sourceDetail}>{historicalCampaignsAvailable ? "Payments: RevenueCat" : telemetryAvailable ? "Fallback: webhook events" : "Payments unavailable"}</span>
        {isToday ? <span className="pv-pill" data-tone="warn">Today is provisional</span> : null}
        {state === "error" ? <Unavailable reason={`Apple reporting unavailable · ${error}`} retryLabel="" /> : null}
        {appleAvailable && !appleAppScopeVerified ? <Unavailable reason="Apple did not verify the Pelvic Floor app scope, so cost metrics are hidden." /> : null}
        {!historicalCampaignsAvailable && appleAvailable ? <Unavailable reason={selectedOutcomes?.reason || ownerMetricsError || "RevenueCat campaign payments are unavailable for this period."} /> : null}
      </div>

      <Card>
        <CardHead label="Spend to payment" info={{ body: "Apple Ads supplies spend, taps and installs. RevenueCat supplies every first successful subscription charge and the smaller subset explicitly attributed to Apple Ads. CPA is shown only when Apple returns campaign rows for every attributed payment.", source: "Apple Ads Campaign Management API · RevenueCat Charts API v2" }} right={<span className="pv-pill" data-tone={costCoverageAligned ? "good" : "warn"}>{coverageBadge}</span>} />
        <Ribbon stages={[
          { key: "spend", label: "Spend", value: appleAvailable ? money(spend, currency, { exact: true }) : null, flow: appleAvailable ? spend : null, color: "var(--pv-amber)", caption: appleAvailable ? `${count(impressions)} impressions` : state === "loading" ? "Loading from Apple" : "Apple unavailable", edge: appleAvailable && impressions > 0 ? `${ratio(taps, impressions, 1)} TTR` : null },
          { key: "taps", label: "Taps", value: appleAvailable ? count(taps) : null, flow: appleAvailable ? taps : null, color: "var(--pv-violet)", edge: appleAvailable ? ratio(installs, taps) : null },
          { key: "installs", label: "Installs", value: appleAvailable ? count(installs) : null, flow: appleAvailable ? installs : null, color: "var(--pv-violet)", caption: appleAvailable && newDownloads !== null ? `${count(newDownloads)} new · ${count(redownloads || 0)} re-downloads${cpi !== null ? ` · ${money(cpi, currency, { exact: true })} CPI` : ""}` : null, edge: Number.isFinite(attributedPayments) ? `${count(attributedPayments)} paid` : null },
          { key: "payments", label: "First payments", value: count(totalPayments), flow: totalPayments, color: "var(--pv-good)", caption: attributionCaption },
        ]} />
        <div className="pv-faint" style={{ padding: "10px 16px", fontSize: 12, borderTop: "1px solid var(--pv-border)" }}>{coverageNote}</div>
      </Card>

      <div className="pv-kpis">
        <KpiTile label="Cost per install" value={cpi !== null ? money(cpi, currency, { exact: true }) : null} sub={!appleAvailable ? "Apple unavailable" : !campaignSpendCoverage.complete ? "hidden because Apple campaign history is partial" : installs > 0 ? `${money(spend, currency)} spend ÷ ${count(installs)} installs` : "No installs reported"} stripe="var(--pv-violet)" />
        <KpiTile label="Cost per payment" value={cpa !== null ? money(cpa, currency, { exact: true }) : null} sub={cpa === null ? !campaignSpendCoverage.complete ? `${count(campaignSpendCoverage.unmatchedPayments)} payments lack Apple campaign spend` : costCoverageAligned ? "No Apple-attributed payment yet" : "needs matching source coverage" : `${count(attributedPayments)} attributed of ${count(totalPayments)} total`} stripe="var(--pv-good)" />
        <KpiTile label="Install to payment" value={paidRate !== null ? ratio(attributedPayments, installs, 1) : null} sub="Apple-attributed payments ÷ Apple installs" stripe="var(--pv-teal)" />
        <KpiTile label="All first payments" value={count(totalPayments)} sub="RevenueCat, store-wide" stripe="var(--pv-accent)" />
        <KpiTile label="Apple-attributed" value={Number.isFinite(attributedPayments) && Number.isFinite(totalPayments) ? `${count(attributedPayments)} / ${count(totalPayments)}` : null} sub="confirmed campaign attribution" stripe="var(--pv-violet)" />
        <KpiTile label="New downloads" value={newDownloads !== null ? count(newDownloads) : null} sub={redownloads !== null ? `${count(redownloads)} re-downloads` : "Apple Ads"} />
      </div>

      {state === "loading" ? <Card pad><RowsSkeleton rows={5} /></Card> : (
        <CampaignTable
          campaigns={report?.campaigns || []}
          campaignOutcomes={selectedOutcomes?.campaigns || []}
          historicalCampaignsAvailable={historicalCampaignsAvailable}
          lifecycle={attributedLifecycle}
          telemetryAvailable={telemetryAvailable}
          totalPayments={totalPayments}
          attributedPayments={attributedPayments}
          unattributedPayments={paymentCounts.unattributedPayments}
          reportTotals={appleTotals}
          campaignCostAligned={baseCostCoverageAligned}
          blendedCostAligned={costCoverageAligned}
          spendCoverageComplete={campaignSpendCoverage.complete}
          currency={currency}
          periodLabel={periodLabel}
        />
      )}
    </div>
  );
}

function campaignRowsFromApple(campaigns) {
  return campaigns.map((campaign, index) => {
    const id = text(String(campaign.id || campaign.campaignId || ""));
    const name = text(campaign.name || campaign.campaignName) || "Unnamed campaign";
    return {
      ...campaign,
      id,
      name,
      normalizedName: normalizedName(name),
      rowKey: `apple:${id || normalizedName(name) || index}:${index}`,
      appleMetricsAvailable: true,
    };
  });
}

function authoritativeRows(campaigns, outcomes) {
  const appleRows = campaignRowsFromApple(campaigns);
  const used = new Set();
  const findOutcome = (campaign) => {
    let match = outcomes.findIndex((outcome, index) => !used.has(index)
      && campaign.id && text(String(outcome.campaignId || "")) === campaign.id);
    if (match < 0 && campaign.normalizedName) {
      const candidates = outcomes
        .map((outcome, index) => ({ outcome, index }))
        .filter(({ outcome, index }) => !used.has(index)
          && normalizedName(outcome.campaignName) === campaign.normalizedName);
      if (candidates.length === 1) match = candidates[0].index;
    }
    if (match >= 0) used.add(match);
    return match >= 0 ? outcomes[match] : null;
  };
  const rows = appleRows.map((campaign) => ({
    ...campaign,
    payments: 0,
    ...(findOutcome(campaign) || {}),
    name: campaign.name,
    id: campaign.id,
    normalizedName: campaign.normalizedName,
    rowKey: campaign.rowKey,
    appleMetricsAvailable: true,
  }));
  outcomes.forEach((outcome, index) => {
    if (used.has(index)) return;
    const outcomePayments = finiteNumber(outcome?.payments);
    // Keep historical RevenueCat-only campaigns when they actually converted
    // in this period. Empty legacy campaign rows only add noise to current
    // reporting and can make the table look like it contains missing data.
    if (outcomePayments === null || outcomePayments <= 0) return;
    const id = text(String(outcome.campaignId || ""));
    const name = outcome.unidentified
      ? "Campaign not identified"
      : text(outcome.campaignName) || (id ? `Campaign ${id}` : "Campaign not identified");
    rows.push({
      payments: outcomePayments,
      ...outcome,
      id,
      name,
      normalizedName: normalizedName(name),
      rowKey: `revenuecat:${id || normalizedName(name) || index}:${index}`,
      status: outcome.unidentified ? "Campaign not reported" : "RevenueCat attributed payment",
      appleMetricsAvailable: false,
      spend: null,
      taps: null,
      installs: null,
    });
  });
  return rows;
}

function fallbackRows(campaigns, lifecycle, telemetryAvailable) {
  const rows = campaignRowsFromApple(campaigns);
  const eventsByCampaign = rows.map(() => []);
  const unmatched = [];
  const indexById = new Map();
  const indexesByName = new Map();
  rows.forEach((row, index) => {
    if (row.id && !indexById.has(row.id)) indexById.set(row.id, index);
    if (!row.normalizedName) return;
    const indexes = indexesByName.get(row.normalizedName) || [];
    indexes.push(index);
    indexesByName.set(row.normalizedName, indexes);
  });
  summarizePayments(lifecycle).payments.forEach((event) => {
    const campaignId = text(event.campaignId);
    let index = campaignId ? indexById.get(campaignId) : undefined;
    if (index === undefined && !campaignId) {
      const matches = indexesByName.get(normalizedName(event.campaignName)) || [];
      if (matches.length === 1) index = matches[0];
    }
    if (index === undefined) unmatched.push(event);
    else eventsByCampaign[index].push(event);
  });
  const mapped = rows.map((row, index) => ({
    ...row,
    payments: telemetryAvailable ? eventsByCampaign[index].length : null,
  }));
  if (telemetryAvailable && unmatched.length) {
    mapped.push({
      id: "",
      name: "Campaign not identified",
      normalizedName: "campaign not identified",
      rowKey: "webhook:unidentified",
      status: "Campaign not reported",
      unidentified: true,
      appleMetricsAvailable: false,
      spend: null,
      taps: null,
      installs: null,
      payments: unmatched.length,
    });
  }
  return mapped;
}

function CampaignTable({ campaigns, campaignOutcomes, historicalCampaignsAvailable, lifecycle, telemetryAvailable, totalPayments, attributedPayments, unattributedPayments, reportTotals, campaignCostAligned, blendedCostAligned, spendCoverageComplete, currency, periodLabel }) {
  const [sort, setSort] = useState({ key: "spend", dir: "desc" });
  const paymentEvents = useMemo(() => summarizePayments(lifecycle).payments, [lifecycle]);
  const keywordGroups = useMemo(() => buildPaymentKeywordGroups(paymentEvents), [paymentEvents]);
  const rows = useMemo(() => {
    const attributedRows = historicalCampaignsAvailable
      ? authoritativeRows(campaigns, campaignOutcomes)
      : fallbackRows(campaigns, lifecycle, telemetryAvailable);
    const built = attributedRows.map((row) => ({ ...row, keywordGroup: keywordsForCampaign(keywordGroups, row) }));
    if (Number.isFinite(unattributedPayments) && unattributedPayments > 0) {
      built.push({
        id: "",
        name: "Not Apple-attributed",
        normalizedName: "not apple attributed",
        rowKey: "store-wide:unattributed",
        status: "Organic or attribution unavailable",
        sourceKind: "store-wide",
        appleMetricsAvailable: false,
        spend: null,
        taps: null,
        installs: null,
        payments: unattributedPayments,
        keywordGroup: null,
      });
    }
    const val = (row) => {
      const value = row[sort.key];
      return finiteNumber(value) ?? (sort.key === "name" ? row.name : -Infinity);
    };
    return [...built].sort((left, right) => {
      const leftValue = val(left);
      const rightValue = val(right);
      if (typeof leftValue === "string" || typeof rightValue === "string") {
        return sort.dir === "asc" ? String(leftValue).localeCompare(String(rightValue)) : String(rightValue).localeCompare(String(leftValue));
      }
      return sort.dir === "asc" ? leftValue - rightValue : rightValue - leftValue;
    });
  }, [campaigns, campaignOutcomes, historicalCampaignsAvailable, lifecycle, telemetryAvailable, keywordGroups, unattributedPayments, sort]);
  const spendTotal = finiteNumber(reportTotals.spend) || 0;
  const tapsTotal = finiteNumber(reportTotals.taps) || 0;
  const installsTotal = finiteNumber(reportTotals.totalInstalls) || 0;
  const maxSpend = Math.max(1, ...rows.map((row) => finiteNumber(row.spend) || 0));
  const th = (key, label, cls = "") => (
    <th className={cls} aria-sort={sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
      <button type="button" onClick={() => setSort((current) => ({ key, dir: current.key === key && current.dir === "desc" ? "asc" : "desc" }))}>{label}{sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}</button>
    </th>
  );
  const cell = (value, format = count) => (finiteNumber(value) !== null ? format(value) : <span className="pv-faint">—</span>);
  return (
    <Card>
      <CardHead label="Campaign payment performance" info={{ body: "Apple supplies campaign spend, taps and installs. RevenueCat supplies first payments. The final unassigned row reconciles the campaign subset to the store-wide payment total without guessing attribution. A keyword appears only when the payment receipt history carries the exact Apple term.", source: periodLabel }} right={<span className="pv-faint" style={{ fontSize: 12 }}>{spendCoverageComplete ? "" : "Partial Apple history · "}{rows.length} row{rows.length === 1 ? "" : "s"}</span>} />
      <div className="pv-table-wrap">
        <table className="pv-table">
          <thead>
            <tr>{th("name", "Campaign")}<th>Keyword that led to payment</th><th>Status</th>{th("spend", "Spend", "num")}{th("taps", "Taps", "num")}{th("installs", "Installs", "num")}{th("payments", "Payments", "num")}<th className="num">CPA</th><th className="num">Install to paid</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan="9" style={{ textAlign: "center", color: "var(--pv-ink-3)", height: 80 }}>No Apple Ads campaigns or RevenueCat payments were returned for this period.</td></tr> : null}
            {rows.map((row) => {
              const spendValue = finiteNumber(row.spend);
              const installsValue = finiteNumber(row.installs);
              const paymentsValue = finiteNumber(row.payments);
              const cpa = campaignCostAligned && row.appleMetricsAvailable && spendValue !== null && paymentsValue > 0 ? spendValue / paymentsValue : null;
              return (
                <tr key={row.rowKey} style={{ cursor: "default" }}>
                  <td className="ink" style={{ maxWidth: 260 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.name}>{row.name}</div>
                      {row.status && !row.appleMetricsAvailable ? <div className="pv-faint" style={{ fontSize: 11 }}>{row.status}</div> : null}
                    </div>
                    {spendValue !== null ? <div className="pv-bar" style={{ height: 3, marginTop: 4, maxWidth: 160 }}><i style={{ width: `${(spendValue / maxSpend) * 100}%`, background: "var(--pv-amber)" }} /></div> : null}
                  </td>
                  <td style={{ minWidth: 180 }}><KeywordCell group={row.keywordGroup} hasPayments={paymentsValue > 0} /></td>
                  <td>{row.appleMetricsAvailable ? <span className="pv-pill" data-tone={/ENABLED|RUNNING/i.test(row.status || "") ? "good" : "neutral"}>{(row.status || "—").toLowerCase()}</span> : row.sourceKind === "store-wide" ? <span className="pv-pill" data-tone="neutral">Store-wide</span> : <span className="pv-pill" data-tone="violet">RevenueCat</span>}</td>
                  <td className="num">{cell(spendValue, (value) => money(value, currency, { exact: true }))}</td>
                  <td className="num">{cell(row.taps)}</td>
                  <td className="num">{cell(installsValue)}</td>
                  <td className="num ink">{cell(paymentsValue)}</td>
                  <td className="num">{cpa !== null ? money(cpa, currency, { exact: true }) : <span className="pv-faint">—</span>}</td>
                  <td className="num">{ratio(paymentsValue, installsValue, 1) ?? <span className="pv-faint">—</span>}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>{spendCoverageComplete ? "Total" : "Apple returned"}</td><td /><td />
              <td className="num">{money(spendTotal, currency, { exact: true })}</td>
              <td className="num">{count(tapsTotal)}</td>
              <td className="num">{count(installsTotal)}</td>
              <td className="num">{cell(totalPayments)}</td>
              <td className="num">{blendedCostAligned && attributedPayments > 0 ? money(spendTotal / attributedPayments, currency, { exact: true }) : "—"}</td>
              <td className="num">{blendedCostAligned ? ratio(attributedPayments, installsTotal, 1) ?? "—" : "—"}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

function KeywordCell({ group, hasPayments }) {
  if (!hasPayments) return <span className="pv-faint">—</span>;
  if (!group) return <span className="pv-faint" title="Organic, Search Match, attribution delayed, or unavailable">Not reported</span>;
  const pieces = group.keywords.map(({ keyword, payments }) => ({ key: keyword, text: payments > 1 ? `${keyword} · ${payments}` : keyword }));
  if (group.unreported > 0) pieces.push({ key: "unreported", text: group.unreported > 1 ? `Not reported · ${group.unreported}` : "Not reported" });
  if (!pieces.length) return <span className="pv-faint">Not reported</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {pieces.map((piece) => <span key={piece.key} className="pv-pill" data-tone={piece.key === "unreported" ? "neutral" : "accent"}>{piece.text}</span>)}
    </div>
  );
}
