// Clarity's consentv2 grant-to-deny path schedules its own restart. Stop first:
// the SDK then queues consentv2 instead of restarting a recorder we just stopped.
// See microsoft/clarity src/data/metadata.ts and src/queue.ts.
export function stopClarityRecording(scope, doc) {
  try {
    const pending = scope.clarity?.q;
    if (Array.isArray(pending)) {
      // A delayed CDN response must not replay an earlier permission update
      // before processing this stop.
      for (let index = pending.length - 1; index >= 0; index -= 1) {
        if (pending[index]?.[0] === "consentv2" || pending[index]?.[0] === "consent") pending.splice(index, 1);
      }
    }
  } catch { /* An optional tag cannot interrupt the page. */ }
  try { scope.clarity?.("stop"); } catch { /* Try the denied signal independently. */ }
  try { scope.clarity?.("consentv2", { analytics_Storage: "denied", ad_Storage: "denied" }); } catch { /* Keep stopped. */ }

  // A stopped SDK does not process the queued denial, so remove its two known
  // first-party cookies ourselves. No other site's or product's cookies change.
  try {
    const hostname = new URL(scope.location.href).hostname;
    const labels = hostname.split(".");
    const domains = ["", ...labels.slice(0, -1).map((_, index) => labels.slice(index).join("."))];
    for (const name of ["_clck", "_clsk"]) {
      for (const domain of domains) {
        try { doc.cookie = `${name}=;Path=/;Max-Age=0;Expires=Thu, 01 Jan 1970 00:00:00 GMT;SameSite=Lax${domain ? `;Domain=${domain}` : ""}${scope.location.href.startsWith("https:") ? ";Secure" : ""}`; }
        catch { /* Cookie access may be blocked while the recorder still stops. */ }
      }
    }
  } catch { /* Cookie cleanup is best effort, including unusual document URLs. */ }
}
