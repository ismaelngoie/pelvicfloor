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
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : null;
}

/**
 * Keep store-wide outcomes separate from the subset Apple Search Ads can
 * claim. Cost math must always use the attributed subset; conversion totals
 * must show every observed RevenueCat receipt.
 */
export function acquisitionOutcomeCounts({
  totalTrialStarts,
  attributedTrialStarts,
  totalFirstPaid,
  attributedFirstPaid,
}) {
  const observedTrials = nonNegative(totalTrialStarts);
  const attributedTrials = nonNegative(attributedTrialStarts);
  const observedPaid = nonNegative(totalFirstPaid);
  const attributedPaid = nonNegative(attributedFirstPaid);
  // A store-wide count cannot be below its attributed subset. This protects
  // the dashboard during webhook backfill or local fixture gaps without ever
  // inventing an extra unattributed outcome.
  const totalTrials = observedTrials !== null && attributedTrials !== null
    ? Math.max(observedTrials, attributedTrials)
    : observedTrials;
  const totalPaid = observedPaid !== null && attributedPaid !== null
    ? Math.max(observedPaid, attributedPaid)
    : observedPaid;
  return {
    totalTrialStarts: totalTrials,
    attributedTrialStarts: attributedTrials,
    unattributedTrialStarts: totalTrials !== null && attributedTrials !== null
      ? Math.max(0, totalTrials - attributedTrials)
      : null,
    totalFirstPaid: totalPaid,
    attributedFirstPaid: attributedPaid,
    unattributedFirstPaid: totalPaid !== null && attributedPaid !== null
      ? Math.max(0, totalPaid - attributedPaid)
      : null,
  };
}

/** Trial-start keywords reported on RevenueCat's Apple attribution payload. */
export function buildTrialKeywordGroups(trialStarts = []) {
  const groups = new Map();
  for (const event of trialStarts) {
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
      .map(([keyword, trials]) => ({ keyword, trials }))
      .sort((left, right) => right.trials - left.trials || left.keyword.localeCompare(right.keyword)),
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
