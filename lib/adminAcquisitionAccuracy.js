function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizedName(value) {
  return clean(value)
    .toLocaleLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function nonNegative(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : null;
}

function isoDate(value) {
  const text = clean(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

/**
 * Sum an authoritative RevenueCat daily series only when the report actually
 * covers the requested dates. `notBefore` is useful when a metric did not
 * exist before a known product launch.
 */
export function sumCoveredDailySeries(series, scope, range, { notBefore = "" } = {}) {
  if (!Array.isArray(series)) return null;
  const requestedStart = isoDate(range?.startDate);
  const requestedEnd = isoDate(range?.endDate);
  const coverageStart = isoDate(scope?.startDate);
  const coverageEnd = isoDate(scope?.endDate);
  const floor = isoDate(notBefore);
  if (!requestedStart || !requestedEnd || !coverageStart || !coverageEnd) return null;
  const effectiveStart = floor && floor > requestedStart ? floor : requestedStart;
  if (coverageStart > effectiveStart || coverageEnd < requestedEnd) return null;
  return series.reduce((total, point) => {
    const date = isoDate(point?.date);
    const value = Number(point?.value);
    return date >= effectiveStart && date <= requestedEnd && Number.isFinite(value)
      ? total + Math.max(0, value)
      : total;
  }, 0);
}

/**
 * Keep store-wide outcomes separate from the subset Apple Search Ads can
 * claim. Cost math must always use the attributed subset; conversion totals
 * must show every observed RevenueCat receipt.
 */
export function acquisitionPaymentCounts({ totalPayments, attributedPayments }) {
  const observed = nonNegative(totalPayments);
  const attributed = nonNegative(attributedPayments);
  // The store-wide count cannot be below its attributed subset. This protects
  // the dashboard during a RevenueCat backfill without inventing an extra
  // unattributed payment.
  const total = observed !== null && attributed !== null
    ? Math.max(observed, attributed)
    : observed;
  return {
    totalPayments: total,
    attributedPayments: attributed,
    unattributedPayments: total !== null && attributed !== null
      ? Math.max(0, total - attributed)
      : null,
  };
}

/** Exact Apple attribution terms carried by first-payment webhook records. */
export function buildPaymentKeywordGroups(payments = []) {
  const groups = new Map();
  for (const event of payments) {
    const campaignId = clean(event?.campaignId);
    const campaignName = clean(event?.campaignName);
    const key = campaignId ? `id:${campaignId}` : campaignName ? `name:${normalizedName(campaignName)}` : "unidentified";
    if (!groups.has(key)) {
      groups.set(key, {
        campaignId,
        campaignName,
        normalizedCampaignName: normalizedName(campaignName),
        keywordCounts: new Map(),
        unreported: 0,
      });
    }
    const group = groups.get(key);
    const keyword = clean(event?.keyword);
    if (keyword) group.keywordCounts.set(keyword, (group.keywordCounts.get(keyword) || 0) + 1);
    else group.unreported += 1;
  }
  return [...groups.values()].map((group) => ({
    campaignId: group.campaignId,
    campaignName: group.campaignName,
    normalizedCampaignName: group.normalizedCampaignName,
    keywords: [...group.keywordCounts.entries()]
      .map(([keyword, payments]) => ({ keyword, payments }))
      .sort((left, right) => right.payments - left.payments || left.keyword.localeCompare(right.keyword)),
    unreported: group.unreported,
  }));
}

export function keywordsForCampaign(groups = [], campaign = {}) {
  const id = clean(String(campaign?.id || campaign?.campaignId || ""));
  const name = normalizedName(campaign?.name || campaign?.campaignName);
  const exactId = id ? groups.filter((group) => group.campaignId === id) : [];
  if (exactId.length === 1) return exactId[0];
  const exactName = name ? groups.filter((group) => group.normalizedCampaignName === name) : [];
  return exactName.length === 1 ? exactName[0] : null;
}

/**
 * A blended Apple cost is only defensible when every RevenueCat campaign with
 * an attributed first payment also has a campaign row in Apple's report.
 * Deleted or otherwise unavailable Apple campaigns are common in long ranges;
 * their receipts must remain visible, but their missing spend must never make
 * historical CPA or CPI look artificially cheap.
 */
export function paymentCampaignSpendCoverage(appleCampaigns = [], paymentCampaigns = []) {
  const appleIds = new Set();
  const appleNameCounts = new Map();
  for (const campaign of Array.isArray(appleCampaigns) ? appleCampaigns : []) {
    const id = clean(String(campaign?.id || campaign?.campaignId || ""));
    const name = normalizedName(campaign?.name || campaign?.campaignName);
    if (id) appleIds.add(id);
    if (name) appleNameCounts.set(name, (appleNameCounts.get(name) || 0) + 1);
  }

  let matchedPayments = 0;
  let unmatchedPayments = 0;
  const unmatchedCampaigns = [];
  for (const campaign of Array.isArray(paymentCampaigns) ? paymentCampaigns : []) {
    const payments = nonNegative(campaign?.payments);
    if (payments === null || payments <= 0) continue;
    const id = clean(String(campaign?.campaignId || campaign?.id || ""));
    const name = normalizedName(campaign?.campaignName || campaign?.name);
    const matched = campaign?.unidentified !== true
      && ((id && appleIds.has(id)) || (name && appleNameCounts.get(name) === 1));
    if (matched) {
      matchedPayments += payments;
    } else {
      unmatchedPayments += payments;
      unmatchedCampaigns.push({
        campaignId: id,
        campaignName: clean(campaign?.campaignName || campaign?.name) || "Campaign not identified",
        payments,
      });
    }
  }

  return {
    complete: unmatchedPayments === 0,
    matchedPayments,
    unmatchedPayments,
    unmatchedCampaigns,
  };
}
