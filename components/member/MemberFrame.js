"use client";

// The client half of the member app's layout: the two providers and the gate.
// It lives in a layout, so it is created once and survives every tab change.
// Switching tabs must never refetch 812 KB of program JSON.

import { MemberProvider } from "./MemberProvider";
import { PlayerProvider } from "./PlayerProvider";
import MemberShell from "./MemberShell";

export default function MemberFrame({ children }) {
  return (
    <MemberProvider>
      <PlayerProvider>
        <MemberShell>{children}</MemberShell>
      </PlayerProvider>
    </MemberProvider>
  );
}
