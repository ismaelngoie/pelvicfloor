"use client";

// The landing route's client half. It does two things: run the onboarding
// funnel, and hand over to the paywall when the funnel is finished.
//
// THE HAND-OFF CONTRACT. The funnel is finished the moment it calls
// onReachPaywall(profile). `profile` carries everything she answered:
//
//   goalId, name, age, weightLbs, heightInches, weightUnit, heightUnit,
//   conditions[], noConditions, activity, email, emailAsked, planBuilt,
//   startedAt, reachedPaywallAt
//
// `email` matters beyond the receipt: the Stripe customer has to be created
// with it, or Restore Purchase and Manage Subscription can never find her
// again. It may be an empty string, because skipping the email screen is
// deliberately free.
//
// The paywall is owned separately. This file only decides when it is shown and
// how to get back out of it.

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Funnel, { FunnelFrame } from "@/components/funnel/Funnel";
import FunnelAside from "@/components/funnel/FunnelAside";
import {
  STEP, isProfileComplete, readFunnelState, writeFunnelStep,
} from "@/components/funnel/funnelState";
import { trackPaywallReached } from "@/lib/analytics";

// The paywall is eight taps away, and it is the only thing on this route that
// pulls in Stripe. Importing it statically cost every landing view the Stripe
// npm packages AND a 251 KB download of js.stripe.com, because
// `@stripe/stripe-js` injects that script on a microtask the moment the module
// is evaluated, whether or not loadStripe() is ever called. Loading it here
// means the ad click pays for the funnel and nothing else, and the sheet still
// has its code long before a thumb reaches the button.
const PaywallScreen = dynamic(() => import("@/components/PaywallScreen"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#0A0A10]" />,
});

export default function HomeClient() {
  const [paywallProfile, setPaywallProfile] = useState(null);
  const paywallRef = useRef(null);
  const arrivedFromFunnel = useRef(false);

  // A member who reached the paywall and then reloaded should land back on the
  // paywall, not at the top of a funnel she already completed.
  useEffect(() => {
    const saved = readFunnelState();
    if (saved?.step === STEP.paywall && isProfileComplete(saved.profile)) {
      setPaywallProfile(saved.profile);
      // She is on the money screen, however she got here, so the session is
      // worth keeping. trackPaywallReached is guarded to fire once per
      // document, so this cannot double count against the funnel's own call.
      trackPaywallReached(saved.profile);
    }
  }, []);

  const handleReachPaywall = useCallback((profile) => {
    arrivedFromFunnel.current = true;
    setPaywallProfile(profile);
  }, []);

  // The funnel unmounts when the paywall takes over, so focus falls back to
  // <body> exactly as it does between funnel screens. Same fix, and it matters
  // more here: this is the screen with the price on it.
  //
  // Only when she walked here. A member who reloads straight onto the paywall
  // is a fresh page load, and moving focus on load is not ours to do.
  useEffect(() => {
    if (!paywallProfile || !arrivedFromFunnel.current) return;
    arrivedFromFunnel.current = false;
    paywallRef.current?.focus({ preventScroll: true });
  }, [paywallProfile]);

  const leavePaywall = useCallback(() => {
    writeFunnelStep(STEP.planReveal);
    setPaywallProfile(null);
  }, []);

  // The arrow in the paywall's top left, routed through history for the same
  // reason the funnel's chevron is: so that it and Android's Back are one
  // action that happens once, rather than two that can leave a spare entry
  // behind and make the next press of Back do nothing.
  const handleLeavePaywall = useCallback(() => {
    if (typeof window !== "undefined" && window.history.state?.pelviFunnelStep) {
      window.history.back(); // -> popstate -> leavePaywall()
      return;
    }
    leavePaywall();
  }, [leavePaywall]);

  // Android's Back, on the one screen the funnel does not own.
  //
  // Funnel.js parks a spare history entry for every step it renders, but the
  // moment the paywall takes over the funnel unmounts and takes its listener
  // with it. Without the same trap here, Back on the money screen is the one
  // press that still throws her off the site, after she has answered eight
  // questions. It sends her back to her plan, which is exactly where the
  // on-screen arrow in the top left already goes.
  useEffect(() => {
    if (!paywallProfile || typeof window === "undefined") return undefined;

    if (!window.history.state?.pelviFunnelStep) {
      try {
        window.history.pushState({ pelviFunnelStep: true }, "");
      } catch {
        return undefined;
      }
    }

    const onPopState = () => leavePaywall();
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [paywallProfile, leavePaywall]);

  // The paywall goes in the same frame the funnel uses. It was rendered bare,
  // so on a desktop the last tap of a 400px column threw her into a full-bleed
  // page with a 1,400px wide gradient button. The paywall's own backdrop
  // already says this was the intent: it is `fixed inset-0 tab:absolute`, and
  // the absolute half is only meaningful inside a positioned card.
  if (paywallProfile) {
    return (
      // tone="dark" because the paywall is #0A0A10 edge to edge, and a black
      // card on a pink page reads as a rendering fault. The pane beside it
      // carries quotes and nothing else: everything else it could say, the
      // paywall is already saying two inches to the right.
      <FunnelFrame
        tone="dark"
        aside={<FunnelAside variant="proof" profile={paywallProfile} tone="dark" />}
      >
        <div ref={paywallRef} tabIndex={-1} className="h-full w-full">
          <PaywallScreen profile={paywallProfile} onBack={handleLeavePaywall} />
        </div>
      </FunnelFrame>
    );
  }

  return <Funnel onReachPaywall={handleReachPaywall} />;
}
