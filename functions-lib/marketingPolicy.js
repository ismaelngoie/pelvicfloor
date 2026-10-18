// Owner decision (Oct 2026, testing phase): measurement runs for every visitor
// to pelvi.health. No location, browser-signal or opt-out exceptions. Only the
// origin check remains, so other sites cannot mint measurement records here.
export function automaticMeasurementEligible(request) {
  try {
    return ["https://pelvi.health", "https://www.pelvi.health"].includes(new URL(request?.url).origin);
  } catch { return false; }
}

export function automaticMeasurementPolicy(request) {
  return { eligible: automaticMeasurementEligible(request), basis: "automatic" };
}
