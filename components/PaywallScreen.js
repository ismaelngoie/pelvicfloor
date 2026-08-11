"use client";

// The adapter between the funnel's hand-off and the paywall.
//
// This file used to be a 698 line second copy of the paywall that nothing
// rendered, and it had drifted: it said $24.99 where the live screen said
// $14.99, and the conversion pixel fired a third number again. One paywall,
// one price, one place. The real screen is components/funnel/Paywall.jsx.
//
// All this does is turn the funnel's profile into the props the paywall takes,
// and tidy up after a successful payment so a member who comes back is not
// dropped onto a paywall she has already bought past.

import { useCallback, useEffect } from "react";

import Paywall from "@/components/funnel/Paywall";
import { clearFunnelState } from "@/components/funnel/funnelState";
import { rememberPlan } from "@/lib/postPurchase";

export default function PaywallScreen({ profile, onBack }) {
  // Two facts, kept somewhere the clean-up below does not reach: her goal and
  // her first name. The screen after payment is the 90-day guarantee with both
  // of them in it, and clearFunnelState runs before the push to /welcome, so
  // without this that screen has no idea who it is talking to and shows a
  // stranger's goal or none at all. See lib/postPurchase.js.
  //
  // On arrival at the paywall rather than on success, because Stripe can take a
  // card through a 3-D Secure redirect: on that path the browser leaves this
  // document and comes back to /welcome as a fresh one, and nothing queued for
  // "after the payment resolves" ever runs.
  const goalId = profile?.goalId || null;
  const name = profile?.name || "";
  useEffect(() => {
    rememberPlan({ goalId, name });
  }, [goalId, name]);

  const handlePaid = useCallback(() => {
    // The funnel's resume state points at STEP.paywall. Leaving it there sends
    // a paying member back to the money screen on her next visit.
    clearFunnelState();
  }, []);

  return (
    // No email prop. The funnel no longer collects one; the checkout sheet asks
    // for the address itself, which is also where an already-subscribed member
    // is recognised. See components/funnel/CheckoutSheet.jsx.
    <Paywall
      goalId={profile?.goalId || "coreStrength"}
      name={profile?.name || ""}
      onPaid={handlePaid}
      onBack={onBack}
    />
  );
}
