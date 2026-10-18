// Consent tags stop immediately. Their cleanup reload must not tear down an
// active payment/3DS dialog. This coordinator is shared by all browser tags.
const pending = new WeakMap();
const departing = new WeakSet();
const currentDocument = () => typeof document === "undefined" ? null : document;
const currentWindow = () => typeof window === "undefined" ? null : window;

export function markMarketingNavigationStarted(doc = currentDocument()) {
  if (!doc) return;
  departing.add(doc);
  pending.get(doc)?.stop();
}

export function deferMarketingReload({
  document: doc = currentDocument(),
  window: scope = currentWindow(),
  canReload = () => false,
  reload = () => scope?.location.replace(scope.location.href),
  Observer = typeof MutationObserver === "undefined" ? null : MutationObserver,
  schedulePoll = (callback) => setInterval(callback, 250),
  cancelPoll = (timer) => clearInterval(timer),
} = {}) {
  if (!doc || departing.has(doc)) return () => {};
  const request = { canReload, reload };
  let state = pending.get(doc);
  if (!state) {
    const requests = new Set();
    let observer = null, poll = null, stopped = false;
    const leave = () => markMarketingNavigationStarted(doc);
    const stop = () => {
      if (stopped) return;
      stopped = true;
      observer?.disconnect();
      if (poll !== null) cancelPoll(poll);
      doc.removeEventListener?.("close", check, true);
      scope?.removeEventListener?.("pagehide", leave);
      scope?.removeEventListener?.("beforeunload", leave);
      requests.clear(); pending.delete(doc);
    };
    const check = () => {
      if (stopped || departing.has(doc)) return;
      try {
        // No deadline while a native or ARIA modal remains open. A consent
        // reload is optional; keeping a live confirmation form is essential.
        if (typeof doc.querySelector !== "function" || doc.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) return;
      } catch { return; }
      for (const candidate of requests) {
        try {
          // Recheck at the last possible point, after modal close/removal.
          if (!candidate.canReload() || departing.has(doc)) continue;
          departing.add(doc); stop(); candidate.reload(); return;
        } catch { /* A stopped tag must never break the payment page. */ }
      }
      stop(); // Persistence was unsafe; remain stopped without a reload.
    };
    state = { requests, check, stop };
    pending.set(doc, state);
    doc.addEventListener?.("close", check, true);
    scope?.addEventListener?.("pagehide", leave);
    scope?.addEventListener?.("beforeunload", leave);
    try {
      if (Observer) {
        observer = new Observer(check);
        observer.observe(doc.documentElement || doc, { childList: true, subtree: true, attributes: true, attributeFilter: ["open", "role", "aria-modal"] });
      } else poll = schedulePoll(check);
    } catch { poll = schedulePoll(check); }
  }
  state.requests.add(request);
  state.check();
  return () => { state.requests.delete(request); if (!state.requests.size) state.stop(); };
}
