"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { isTrackedPath } from "@/lib/analytics";

const GOOGLE_ADS_ID = "AW-18382744409";
let injected = false;
let reloading = false;

function injectGoogleAds() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
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
    const allowed = isTrackedPath(pathname || window.location.pathname, window.location.search);
    if (allowed) {
      if (!injected) {
        injected = true;
        injectGoogleAds();
      }
      return;
    }

    if (!injected || reloading) return;
    reloading = true;
    window.location.replace(window.location.href);
  }, [pathname]);

  return null;
}
