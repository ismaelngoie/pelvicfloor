// Public feature switches only. Access tokens and credentials never enter this
// response or a NEXT_PUBLIC build variable. Email matching is available when
// measurement is configured; the purchase path still requires visitor permission.
import { automaticMeasurementPolicy } from "../../functions-lib/marketingPolicy.js";

export function onRequestGet({ env = {}, request } = {}) {
  const datasetId = typeof env.META_DATASET_ID === "string" && /^[1-9]\d{4,31}$/.test(env.META_DATASET_ID) ? env.META_DATASET_ID : "";
  const enabled = env.META_TRACKING_ENABLED === "true" && Boolean(datasetId);
  return new Response(JSON.stringify({ enabled, datasetId: enabled ? datasetId : "", emailMatchingEnabled: enabled, automaticMeasurement: automaticMeasurementPolicy(request) }), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
