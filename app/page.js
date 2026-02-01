"use client";
import React from "react";
import Onboarding from "./onboarding/onboarding";

export default function Home() {
  return (
    <div className="w-full min-h-full bg-app-background flex flex-col">
      <Onboarding />
    </div>
  );
}
