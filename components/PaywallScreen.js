"use client";

// The adapter between the funnel's hand-off and the paywall.
//
// One paywall, one price, one place. The real screen is
// components/funnel/Paywall.jsx. All this does is hand the funnel's profile to
// the paywall, remember the plan for the post-purchase screen, and tidy up
// after a successful payment so a member who comes back is not dropped onto a
// paywall she has already bought past.

import { useCallback, useEffect } from "react";

import Paywall from "@/components/funnel/Paywall";
import { clearFunnelState } from "@/components/funnel/funnelState";
import { rememberPlan } from "@/lib/postPurchase";

export default function PaywallScreen({ profile, onBack }) {
  // Her goal and her first name, kept somewhere the clean-up below does not
  // reach: the screen after payment names both. On arrival rather than on
  // success, because a 3-D Secure redirect leaves this document entirely.
  const goalId = profile?.goalId || null;
  const focusId = profile?.focusId || null;
  const name = profile?.name || "";
  useEffect(() => {
    rememberPlan({ goalId, focusId, name });
  }, [goalId, focusId, name]);

  const handlePaid = useCallback(() => {
    clearFunnelState();
  }, []);

  return <Paywall profile={profile} onPaid={handlePaid} onBack={onBack} />;
}
