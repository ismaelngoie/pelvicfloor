import { isTrackedPath, normalisePath } from "../public/clarity-gate.js";
import { clarityConsentPolicy, readMarketingConsent } from "./marketingConsent.js";

// Public marketing interactions only. Callers cannot attach an email, account,
// payment status/error, health answer, media URL, or any other user value.
export const DIASTASIS_CLARITY_EVENTS = Object.freeze({
  landing_view: "dr_landing_view",
  checkout_open: "dr_checkout_open",
  checkout_close: "dr_checkout_close",
  checkout_ready: "dr_checkout_ready",
  payment_completed: "dr_payment_completed",
  payment_failed: "dr_payment_failed",
  video_play: "dr_video_play",
  video_error: "dr_video_error",
  gallery_view: "dr_gallery_view",
  faq_open: "dr_faq_open",
  guarantee_open: "dr_guarantee_open",
});

const ONCE_PER_DOCUMENT = new Set(["landing_view", "video_play", "video_error"]);
const ONCE_EVENT_NAMES = new Set([...ONCE_PER_DOCUMENT].map((key) => DIASTASIS_CLARITY_EVENTS[key]));
const MAX_QUEUED_EVENTS = 32;
const READY_RETRY_MS = 100;
const MAX_READY_RETRIES = 50;

// The landing's React effect can run before app/Clarity installs its queueing
// stub. Wait briefly for that existing loader; never install a second tag or
// create a Clarity function here. Blocked analytics must not affect checkout.
export function createDiastasisTelemetry({
  getWindow = () => typeof window === "undefined" ? null : window,
  getConsent = readMarketingConsent,
  getPolicy = clarityConsentPolicy,
  schedule = (callback, delay) => setTimeout(callback, delay),
  cancel = (timer) => clearTimeout(timer),
} = {}) {
  const pending = [];
  const seen = new Set();
  let timer = null;
  let retries = 0;
  let tagged = false;
  let disposed = false;

  function publicWindow() {
    try {
      if (!getPolicy(getConsent()).enabled) return null;
      const scope = getWindow();
      const location = scope?.location;
      if (!location || normalisePath(location.pathname) !== "/diastasis-recti") return null;
      return isTrackedPath(location.pathname, location.search) ? scope : null;
    } catch { return null; }
  }

  function clearPending() {
    pending.length = 0;
    if (timer !== null) { cancel(timer); timer = null; }
  }

  function flush() {
    if (disposed) return false;
    const scope = publicWindow();
    if (!scope) { clearPending(); return false; }
    if (typeof scope.clarity !== "function") return false;
    if (!pending.length) return true;
    try {
      if (!tagged) {
        scope.clarity("set", "landing_page", "diastasis_recti");
        tagged = true;
      }
      while (pending.length) {
        // Remove before calling external code so a throwing tag cannot leave
        // an unbounded retry loop or duplicate an already delivered event.
        const name = pending.shift();
        scope.clarity("event", name);
        if (ONCE_EVENT_NAMES.has(name)) seen.add(name);
      }
      if (timer !== null) { cancel(timer); timer = null; }
      return true;
    } catch {
      clearPending();
      return false;
    }
  }

  function waitForLoader() {
    if (timer !== null || retries >= MAX_READY_RETRIES || !pending.length || disposed) return;
    timer = schedule(() => {
      timer = null;
      retries += 1;
      if (!flush()) waitForLoader();
    }, READY_RETRY_MS);
  }

  function track(key) {
    const scope = publicWindow();
    if (disposed || typeof key !== "string" || !Object.hasOwn(DIASTASIS_CLARITY_EVENTS, key) || !scope) {
      if (!scope) clearPending();
      return false;
    }
    const name = DIASTASIS_CLARITY_EVENTS[key];
    if (ONCE_PER_DOCUMENT.has(key) && (seen.has(name) || pending.includes(name))) return false;
    if (pending.length >= MAX_QUEUED_EVENTS) return false;
    pending.push(name);
    retries = 0;
    if (!flush()) waitForLoader();
    return true;
  }

  return {
    track,
    flush,
    dispose() { disposed = true; clearPending(); },
  };
}

let telemetry;
export function trackDiastasisEvent(key) {
  try {
    if (!telemetry) telemetry = createDiastasisTelemetry();
    return telemetry.track(key);
  } catch { return false; }
}
