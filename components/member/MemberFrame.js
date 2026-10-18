"use client";

// The client half of the member app's layout: the providers and the gate.
// It lives in a layout, so it is created once and survives every tab change.
// Switching tabs must never refetch 812 KB of program JSON.

import { MemberProvider, useMember } from "./MemberProvider";
import { PlayerProvider } from "./PlayerProvider";
import { WebAppInstallProvider } from "./WebAppInstallProvider";
import MemberShell from "./MemberShell";
import { PathwayPicker } from "./MemberTools";

export default function MemberFrame({ children }) {
  return (
    <MemberProvider>
      <WebAppInstallProvider>
        <PlayerProvider>
          <MemberShell><MemberExperienceGate>{children}</MemberExperienceGate></MemberShell>
        </PlayerProvider>
      </WebAppInstallProvider>
    </MemberProvider>
  );
}

// Like BodyPathwaySelectionGate on iOS, an older member chooses their body
// pathway before receiving goal-dependent exercises or clinical guidance.
function MemberExperienceGate({ children }) {
  const { member } = useMember();
  const selected = ["womensPelvicHealth", "mensPelvicHealth"].includes(member?.pathway);
  return selected ? children : <PathwayPicker required open onClose={() => {}} />;
}
