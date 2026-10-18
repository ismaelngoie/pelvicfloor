"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { captureWelcomePaymentProof, createMetaPixelController, reportVerifiedMetaPurchase } from "../lib/metaPixel.js";
import { MARKETING_CONSENT_KEY, readMarketingConsent } from "../lib/marketingConsent.js";
import { readPaidIntent } from "../lib/identity.js";

export default function MetaPixel() {
  const pathname = usePathname();
  const controller = useRef(null);
  const proof = useRef("");
  const receiptTask = useRef(null);
  // Capture during render before Welcome's effects scrub the URL and redeem
  // its one-shot proof. The proof is never read on any other route, persisted
  // here, rendered, logged, or passed to Meta. Only our receipt endpoint sees it.
  if (typeof window !== "undefined" && pathname === "/welcome") {
    const available = captureWelcomePaymentProof(pathname, { readSaved: readPaidIntent });
    if (available) proof.current = available;
  } else { proof.current = ""; receiptTask.current = null; }
  useEffect(() => {
    const active = createMetaPixelController({ getConsent: readMarketingConsent });
    controller.current = active;
    void active.start();
    return () => { active.dispose(); if (controller.current === active) controller.current = null; };
  }, []);
  useEffect(() => { void controller.current?.refresh(); }, [pathname]);
  useEffect(() => {
    if (pathname !== "/welcome") return undefined;
    const report = () => {
      if (window.location.pathname !== "/welcome" || !proof.current || readMarketingConsent().advertising !== true) return;
      // Reuse the in-flight call across Strict Mode effects. A failed/denied
      // attempt remains retryable on opt-in; the helper bounds registry +
      // receipt work together to two seconds, independently of Pixel gates.
      if (receiptTask.current?.proof === proof.current && (receiptTask.current.pending || receiptTask.current.done)) return;
      const task = { proof: proof.current, pending: true, done: false };
      receiptTask.current = task;
      void reportVerifiedMetaPurchase(task.proof).then(done => { task.pending = false; task.done = done; });
    };
    const storage = event => { if (event.key == null || event.key === MARKETING_CONSENT_KEY) report(); };
    report();
    window.addEventListener("pelvi:privacy-choice", report);
    window.addEventListener("storage", storage);
    return () => { window.removeEventListener("pelvi:privacy-choice", report); window.removeEventListener("storage", storage); };
  }, [pathname]);
  return null;
}
