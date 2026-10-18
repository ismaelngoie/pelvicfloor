"use client";

// The Microsoft Clarity tag, and the gate that decides whether it is allowed to
// exist on this document at all.
//
// It used to be an unconditional <Script> in app/layout.js, which meant it also
// ran on /app and /admin: member names, email addresses, billing state, symptom
// check-ins and Coach Mia transcripts, all of it into session replay. Pelvic
// health is data concerning health and therefore special category data under
// GDPR Article 9. The full reasoning is in the header of lib/analytics.js.
//
// THREE LAYERS, AND WHY THERE ARE THREE
//
//   1. The tag is injected from JavaScript, after a deny-by-default check of
//      the path AND the query string. Nothing is added to the document on a
//      private route, so there is nothing to disable. A route that nobody has
//      added to the allowlist in public/clarity-gate.js is private.
//
//      This component is one of two callers of that gate. The other is
//      public/clarity-static.js, which the 53 hand-written articles and
//      public/contact.html load with a single <script> line, because the app
//      router never runs on them. Same rules, same file, no second allowlist.
//
//   2. Crossing from public to private is a full page load, not a client-side
//      route change. There is exactly one such crossing in the product, the
//      "Continue on the web" button on /welcome, and it is a plain <a> rather
//      than a next/link for this reason. See the comment there.
//
//   3. If a soft navigation into a private route ever happens anyway, because
//      somebody adds a <Link href="/app"> in six months, the effect below stops
//      the recorder and then reloads the document, which throws away the tag
//      and everything it had buffered. This is a backstop, not the mechanism.
//      It has to be, because by the time a React effect runs, the new route's
//      DOM is already committed: layer 2 is what keeps that DOM from ever being
//      built in a document the recorder is living in.
//
// Written as a manual injection rather than a conditional next/script because
// next/script only chooses whether to ADD a tag. Once clarity.ms is in the
// document it stays and it keeps recording, so a conditional <Script> would
// have looked like a gate while being none.

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { CLARITY_PROJECT_ID, isTrackedPath } from "@/lib/analytics";
import { MARKETING_CONSENT_EVENT, MARKETING_CONSENT_KEY, clarityConsentPolicy,
  bootstrapMarketingConsent, marketingPersistenceBlocked, readMarketingConsent, syncMarketingConsent } from "@/lib/marketingConsent";
import { deferMarketingReload, markMarketingNavigationStarted } from "@/lib/marketingNavigation";
import { stopClarityRecording } from "../public/clarity-stop.js";

export function createClarityController({ scope = window, doc = document,
  getConsent = readMarketingConsent, getPolicy = clarityConsentPolicy,
  syncConsent = syncMarketingConsent, persistenceBlocked = marketingPersistenceBlocked,
  bootstrapConsent = bootstrapMarketingConsent,
  tracked = isTrackedPath, deferReload = deferMarketingReload,
  markNavigation = markMarketingNavigationStarted,
} = {}) {
  let injected = false;
  let stopped = false;
  let storageMode = null;
  let transition = 0;
  let currentPath = scope.location.pathname;
  const call = (...args) => { try { scope.clarity?.(...args); } catch { /* Analytics never blocks the page. */ } };
  const publicDocument = () => tracked(currentPath, scope.location.search);
  const snapshot = (choice) => [choice.decided, choice.consentId, choice.decidedAt, choice.analytics, choice.advertising, choice.matching, choice.basis];

  function inject(policy) {
    scope.clarity = scope.clarity || function clarityQueue() {
      (scope.clarity.q = scope.clarity.q || []).push(arguments);
    };
    // Unverified/undecided visits use no cookie storage. First-party automatic
    // policy or an explicit saved setting can enable analytics storage.
    // Microsoft Ads sharing stays denied.
    call("consentv2", { analytics_Storage: policy.analyticsStorage, ad_Storage: "denied" });
    storageMode = policy.analyticsStorage;
    const script = doc.createElement("script");
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
    script.onerror = () => {};
    doc.head.appendChild(script);
    injected = true;
  }

  function scheduleFreshDocument(choice, wasPublic) {
    const generation = ++transition;
    const expected = snapshot(choice);
    const enabled = getPolicy(choice).enabled;
    const safe = () => !persistenceBlocked() && generation === transition && publicDocument() === wasPublic
      && snapshot(getConsent()).every((value, index) => value === expected[index])
      && getPolicy(getConsent()).enabled === enabled;
    const reload = () => {
      if (wasPublic) deferReload({ document: doc, window: scope, canReload: safe });
      else if (safe()) { markNavigation(doc); scope.location.replace(scope.location.href); }
    };
    if (!wasPublic) { reload(); return; }
    try { Promise.resolve(syncConsent(choice)).catch(() => {}).finally(reload).catch(() => {}); }
    catch { /* Keep the recorder stopped if optional sync cannot run. */ }
  }

  return {
    applyChoice(pathname, event) {
      if (event?.type === "storage" && event.key !== null && event.key !== MARKETING_CONSENT_KEY) return;
      currentPath = pathname || scope.location.pathname;
      try {
        const choice = getConsent();
        const policy = getPolicy(choice);
        const isPublic = publicDocument();
        if (isPublic) {
          try { void Promise.resolve(bootstrapConsent({ allowed: () => publicDocument() && tracked(scope.location.pathname, scope.location.search) })).catch(() => {}); }
          catch { /* Keep cookieless analytics if the first-party policy cannot load. */ }
        }
        if (isPublic && policy.enabled && !stopped) {
          if (!injected) inject(policy);
          else if (storageMode !== policy.analyticsStorage) {
            call("consentv2", { analytics_Storage: policy.analyticsStorage, ad_Storage: "denied" });
            storageMode = policy.analyticsStorage;
          }
          return;
        }
        if (!injected) return;
        if (!stopped) {
          stopClarityRecording(scope, doc); stopped = true;
        }
        scheduleFreshDocument(choice, isPublic);
      } catch {
        stopClarityRecording(scope, doc); stopped = true;
      }
    },
  };
}

// One lifecycle per document, including React development remounts.
let lifecycle;

export default function Clarity() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!lifecycle) lifecycle = createClarityController();
    const applyChoice = (event) => lifecycle.applyChoice(pathname || window.location.pathname, event);
    applyChoice();
    window.addEventListener(MARKETING_CONSENT_EVENT, applyChoice);
    window.addEventListener("storage", applyChoice);
    return () => { window.removeEventListener(MARKETING_CONSENT_EVENT, applyChoice); window.removeEventListener("storage", applyChoice); };
  }, [pathname]);

  return null;
}
