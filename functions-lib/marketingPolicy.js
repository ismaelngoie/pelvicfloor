// A deliberately narrow automatic-measurement rollout, not a determination of
// every jurisdiction's requirements. Only Cloudflare's incoming request
// metadata is trusted; browser-supplied country/region headers are ignored.
// Unknown locations and consumer-health consent jurisdictions stay off.
const AUTOMATIC_US_REGIONS = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "DE", "DC", "FL", "GA", "HI",
  "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI",
  "MN", "MS", "MO", "MT", "NE", "NH", "NJ", "NM", "NY", "NC", "ND",
  "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT",
  "VA", "WV", "WI", "WY",
]);

export function automaticMeasurementEligible(request) {
  try {
    if (!["https://pelvi.health", "https://www.pelvi.health"].includes(new URL(request?.url).origin)) return false;
  } catch { return false; }
  if (request?.headers?.get("Sec-GPC") === "1" || request?.headers?.get("DNT") === "1") return false;
  return request?.cf?.country === "US" && AUTOMATIC_US_REGIONS.has(request?.cf?.regionCode);
}

export function automaticMeasurementPolicy(request) {
  return { eligible: automaticMeasurementEligible(request), basis: "automatic" };
}
