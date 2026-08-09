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

import { useCallback } from "react";

import Paywall from "@/components/funnel/Paywall";
import { clearFunnelState } from "@/components/funnel/funnelState";

export default function PaywallScreen({ profile, onBack }) {
  const handlePaid = useCallback(() => {
    // The funnel's resume state points at STEP.paywall. Leaving it there sends
    // a paying member back to the money screen on her next visit.
    clearFunnelState();
  }, []);

  return (
    <Paywall
      goalId={profile?.goalId || "coreStrength"}
      name={profile?.name || ""}
      email={profile?.email || ""}
      onPaid={handlePaid}
      onBack={onBack}
    />
  );
}
