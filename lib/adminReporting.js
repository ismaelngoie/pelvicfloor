// The owner dashboard is an operational view of the direct-pay relaunch.
// Historical source records remain untouched in RevenueCat, Apple Ads, and
// Firestore, but business-event reporting never reaches before this UTC day.
export const REPORTING_START_DATE = "2026-08-24";
export const REPORTING_START_LABEL = "Aug 24";

export function reportingStartMs() {
  return Date.parse(`${REPORTING_START_DATE}T00:00:00Z`);
}

export function isCurrentAppleCampaign(campaign) {
  const status = String(campaign?.status || "").trim().toUpperCase();
  return status === "ENABLED" || status === "ACTIVE" || status === "RUNNING";
}

export function currentAppleCampaigns(campaigns) {
  return (Array.isArray(campaigns) ? campaigns : []).filter(isCurrentAppleCampaign);
}
