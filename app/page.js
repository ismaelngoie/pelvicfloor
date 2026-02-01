"use client";
import React from "react";
import Onboarding from "./onboarding/onboarding";

export default function Home() {
  return (
    <div className="w-full h-full min-h-0 bg-app-background flex flex-col overflow-hidden">
      <Onboarding />
    </div>
  );
}
