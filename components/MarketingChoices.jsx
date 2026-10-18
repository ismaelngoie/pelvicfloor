"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { MARKETING_CONSENT_EVENT, readMarketingConsent, syncMarketingConsent, writeMarketingConsent } from "@/lib/marketingConsent";
import { isTrackedPath } from "@/lib/analytics";
import styles from "./MarketingChoices.module.css";

export const OPEN_PRIVACY_CHOICES = "pelvi:open-privacy-choices";

export function PrivacyChoicesButton() {
  return <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_PRIVACY_CHOICES))} style={{ color: "#A33752", textDecoration: "underline", textUnderlineOffset: "3px", minHeight: "44px" }}>Change privacy choices</button>;
}

export default function MarketingChoices() {
  const path = usePathname();
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matchingAvailable, setMatchingAvailable] = useState(false);
  const [optOut, setOptOut] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const allowed = isTrackedPath(path, typeof window === "undefined" ? "" : window.location.search);

  useEffect(() => {
    if (!allowed) { setVisible(false); return; }
    const populate = () => {
      const choice = readMarketingConsent();
      setAnalytics(choice.analytics); setAdvertising(choice.advertising); setMatching(choice.matching);
      setOptOut(navigator.globalPrivacyControl === true || navigator.doNotTrack === "1");
      return choice;
    };
    const current = populate();
    setVisible(!current.decided);
    if (current.decided) void syncMarketingConsent(current);
    const open = () => { populate(); setVisible(true); };
    const sync = () => { const choice = readMarketingConsent(); if (choice.decided) { setVisible(false); void syncMarketingConsent(choice); } };
    window.addEventListener(OPEN_PRIVACY_CHOICES, open);
    window.addEventListener(MARKETING_CONSENT_EVENT, sync);
    window.addEventListener("storage", sync);
    let active = true;
    fetch("/api/marketing-config", { credentials: "same-origin", cache: "no-store" })
      .then(r => r.ok ? r.json() : null).then(config => { if (active) setMatchingAvailable(config?.enabled === true && config?.emailMatchingEnabled === true); }).catch(() => {});
    return () => { active = false; window.removeEventListener(OPEN_PRIVACY_CHOICES, open); window.removeEventListener(MARKETING_CONSENT_EVENT, sync); window.removeEventListener("storage", sync); };
  }, [allowed]);

  const save = (choices) => { const choice = writeMarketingConsent(choices); void syncMarketingConsent(choice); setVisible(false); };
  if (!visible || !allowed || typeof document === "undefined") return null;
  return createPortal(<aside className={styles.card} aria-labelledby="privacy-choice-title" data-clarity-mask="true">
    <h2 id="privacy-choice-title">Your privacy choices</h2>
    <p>Allow Clarity analytics and Meta/Google ad measurement? Personal text and payment fields stay hidden. Ad measurement excludes health answers. <a href="/privacy-policy#advertising" target="_blank" rel="noopener noreferrer">Privacy policy</a></p>
    <button type="button" className={styles.customize} aria-expanded={customizing} onClick={() => setCustomizing(v => !v)}>Choose what to allow</button>
    {customizing && <div className={styles.options}>
      <label><input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} /><span><strong>Website analytics</strong><small>Clarity replays with personal and payment fields hidden.</small></span></label>
      <label><input type="checkbox" checked={advertising} disabled={optOut} onChange={e => { setAdvertising(e.target.checked); if (!e.target.checked) setMatching(false); }} /><span><strong>Ad measurement</strong><small>Share permitted visit and purchase signals with Meta and Google. No health answers.</small></span></label>
      {matchingAvailable && <label><input type="checkbox" checked={matching} disabled={!advertising || optOut} onChange={e => setMatching(e.target.checked)} /><span><strong>Purchase matching</strong><small>Use a hashed receipt email to help Meta match your purchase to an ad.</small></span></label>}
    </div>}
    {optOut && <p className={styles.optOut}>Your browser’s privacy signal keeps ad tracking off.</p>}
    <div className={styles.actions}>
      <button type="button" onClick={() => save({ analytics: false, advertising: false, matching: false })}>Essential only</button>
      <button type="button" onClick={() => save(customizing ? { analytics, advertising, matching: matchingAvailable && matching } : { analytics: true, advertising: !optOut, matching: false })}>{customizing ? "Save choices" : "Allow measurement"}</button>
    </div>
  </aside>, document.body);
}
