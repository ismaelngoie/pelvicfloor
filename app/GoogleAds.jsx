"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { isTrackedPath } from "@/lib/analytics";
import { MARKETING_CONSENT_EVENT, marketingPersistenceBlocked, readMarketingConsent, syncMarketingConsent } from "@/lib/marketingConsent";
import { deferMarketingReload, markMarketingNavigationStarted } from "@/lib/marketingNavigation";

const GOOGLE_ADS_ID = "AW-18382744409";
let injected = false;
let reloading = false;

function injectGoogleAds() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
  const choice = readMarketingConsent();
  window.gtag("consent", "default", {
    ad_storage: "granted", analytics_storage: choice.analytics ? "granted" : "denied",
    ad_user_data: choice.matching ? "granted" : "denied", ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ADS_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
  script.onerror = () => {};
  document.head.appendChild(script);
}

export default function GoogleAds() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyChoice = () => {
      const choice = readMarketingConsent();
      const publicDocument = isTrackedPath(pathname || window.location.pathname, window.location.search);
      const allowed = publicDocument && choice.advertising;
      if (allowed) {
        if (!injected) {
          injected = true;
          injectGoogleAds();
        } else window.gtag?.("consent", "update", { ad_storage: "granted", analytics_storage: choice.analytics ? "granted" : "denied", ad_user_data: choice.matching ? "granted" : "denied", ad_personalization: "denied" });
        return;
      }
      if (!injected || (reloading && publicDocument)) return;
      window.gtag?.("consent", "update", { ad_storage: "denied", analytics_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      if (marketingPersistenceBlocked()) return;
      reloading = true;
      const safe = () => !marketingPersistenceBlocked();
      if (publicDocument && !choice.advertising) void syncMarketingConsent(choice).finally(() => {
        deferMarketingReload({ canReload: safe });
      });
      else {
        markMarketingNavigationStarted();
        if (safe()) window.location.replace(window.location.href);
      }
    };
    applyChoice();
    window.addEventListener(MARKETING_CONSENT_EVENT, applyChoice);
    window.addEventListener("storage", applyChoice);
    return () => { window.removeEventListener(MARKETING_CONSENT_EVENT, applyChoice); window.removeEventListener("storage", applyChoice); };
  }, [pathname]);

  return null;
}
