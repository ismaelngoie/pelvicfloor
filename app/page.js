"use client";

import React from "react";
import Onboarding from "./onboarding/onboarding";

export default function Home() {
  return (
    <div className="w-full h-[100dvh] min-h-[100dvh] bg-app-background flex flex-col overflow-hidden">
      <Onboarding />
    </div>
  );
}
