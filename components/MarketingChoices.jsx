"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { MARKETING_CONSENT_EVENT, MARKETING_CONSENT_KEY, clarityConsentPolicy, readMarketingConsent, syncMarketingConsent, writeMarketingConsent } from "@/lib/marketingConsent";
import { isTrackedPath } from "@/lib/analytics";
import styles from "./MarketingChoices.module.css";

export const OPEN_PRIVACY_CHOICES = "pelvi:open-privacy-choices";

// Preserve only currently effective settings. A stale open panel cannot
// restore measurement withdrawn in another tab or by a browser privacy signal.
export function privacyOptOutChoice(current, target) {
  const analytics = current?.analytics === true;
  const advertising = current?.advertising === true;
  const matching = advertising && current?.matching === true;
  if (target === "analytics") return { analytics: false, advertising, matching };
  if (target === "advertising") return { analytics, advertising: false, matching: false };
  if (target === "matching") return { analytics, advertising, matching: false };
  return { analytics: false, advertising: false, matching: false };
}

export function privacySettingsText(choice, analytics) {
  const automatic = choice?.basis === "automatic";
  return {
    analytics: !analytics.enabled ? "Off. Your saved choice or browser privacy signal is respected."
      : analytics.analyticsStorage !== "granted" ? "On without analytics cookies. Automatic cookie and ad measurement is not enabled for this visit."
        : automatic ? "On automatically for an eligible visit, with analytics cookies. You can turn it off here."
          : "On with your previously saved permission for analytics cookies.",
    advertising: !choice?.advertising ? "Off for this visit. Saved opt-outs and browser privacy signals are respected."
      : automatic ? "On automatically for an eligible visit. You can turn it off here."
        : "On under your previously saved advertising permission.",
    matching: choice?.matching ? "On under your previously saved matching permission, where the integration is eligible."
      : "Off. Your receipt email is not used for matching by default.",
  };
}

export function PrivacyChoicesButton() {
  return <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_PRIVACY_CHOICES))} style={{ color: "#A33752", textDecoration: "underline", textUnderlineOffset: "3px", minHeight: "44px" }}>Privacy settings</button>;
}

export default function MarketingChoices() {
  const path = usePathname();
  const [visible, setVisible] = useState(false);
  const [choice, setChoice] = useState(null);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const allowed = isTrackedPath(path, typeof window === "undefined" ? "" : window.location.search);

  useEffect(() => {
    setVisible(false);
    if (!allowed) return;
    const populate = () => setChoice(readMarketingConsent());
    const open = () => { populate(); setVisible(true); };
    const storageChanged = (event) => { if (event.key === MARKETING_CONSENT_KEY || event.key === null) populate(); };
    // This panel only reads on visit/open. Eligibility and automatic settings
    // belong to the shared measurement lifecycle, never to the panel.
    window.addEventListener(OPEN_PRIVACY_CHOICES, open);
    window.addEventListener(MARKETING_CONSENT_EVENT, populate);
    window.addEventListener("storage", storageChanged);
    return () => {
      window.removeEventListener(OPEN_PRIVACY_CHOICES, open);
      window.removeEventListener(MARKETING_CONSENT_EVENT, populate);
      window.removeEventListener("storage", storageChanged);
    };
  }, [allowed, path]);

  useEffect(() => {
    if (!visible || !allowed) return;
    const dialog = dialogRef.current;
    const returnFocus = document.activeElement;
    dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
    };
  }, [visible, allowed]);

  const turnOff = (target) => {
    const current = readMarketingConsent();
    const applied = writeMarketingConsent(privacyOptOutChoice(current, target));
    void syncMarketingConsent(applied);
    setVisible(false);
  };
  if (!visible || !allowed || !choice || typeof document === "undefined") return null;
  const analytics = clarityConsentPolicy(choice);
  const text = privacySettingsText(choice, analytics);
  return createPortal(<dialog ref={dialogRef} className={styles.card} aria-labelledby="privacy-choice-title" aria-describedby="privacy-choice-description" data-clarity-mask="true" onCancel={(event) => { event.preventDefault(); setVisible(false); }}>
    <header className={styles.header}>
      <h2 id="privacy-choice-title">Privacy settings</h2>
      <button ref={closeRef} type="button" className={styles.close} aria-label="Close privacy settings" onClick={() => setVisible(false)}>Close</button>
    </header>
    <p id="privacy-choice-description">Website analytics and ad measurement can start automatically for eligible visits after a country check. An automatic setting does not mean you opted in. You can turn measurement off here. Your account and payments work with it turned off.</p>
    <div className={styles.options}>
      <section>
        <h3>Website analytics</h3>
        <p>{text.analytics}</p>
        <button type="button" disabled={!analytics.enabled} onClick={() => turnOff("analytics")}>Turn off website analytics</button>
      </section>
      <section>
        <h3>Ad measurement</h3>
        <p>{text.advertising}</p>
        <button type="button" disabled={!choice.advertising} onClick={() => turnOff("advertising")}>Turn off ad measurement</button>
      </section>
      <section>
        <h3>Purchase matching</h3>
        <p>{text.matching}</p>
        <button type="button" disabled={!choice.matching} onClick={() => turnOff("matching")}>Turn off purchase matching</button>
      </section>
    </div>
    <p><a href="/privacy-policy#recording" target="_blank" rel="noopener noreferrer">Read the privacy policy</a></p>
    <div className={styles.actions}><button type="button" onClick={() => turnOff("all")}>Turn off all measurement</button></div>
  </dialog>, document.body);
}
