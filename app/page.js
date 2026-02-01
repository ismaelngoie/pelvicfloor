"use client";
import React from 'react';
// The import path changes to point to your new location
import Onboarding from './onboarding/onboarding'; 

export default function Home() {
  return (
    // h-[100dvh] is crucial for mobile browsers to handle address bars correctly
    <main className="w-full h-[100dvh] overflow-hidden bg-app-background flex flex-col">
      <Onboarding />
    </main>
  );
}
