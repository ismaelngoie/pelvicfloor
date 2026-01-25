"use client";
import React, { useState } from 'react';
import WelcomeScreen from '@/components/WelcomeScreen';
import SelectGoalScreen from '@/components/SelectGoalScreen';
import HowItHelpsScreen from '@/components/HowItHelpsScreen';
import PersonalIntakeScreen from '@/components/PersonalIntakeScreen';
import PlanRevealScreen from '@/components/PlanRevealScreen';
import PaywallScreen from '@/components/PaywallScreen'; // <--- NEW IMPORT

export default function Home() {
  const [currentStep, setCurrentStep] = useState('welcome');

  const handleNext = (nextStep) => {
    setCurrentStep(nextStep);
  };

  return (
    // h-[100dvh] is crucial for mobile browsers to handle address bars correctly
    <main className="w-full h-[100dvh] overflow-hidden bg-app-background flex flex-col">
      
      {currentStep === 'welcome' && (
        <WelcomeScreen onNext={() => handleNext('select_goal')} />
      )}

      {currentStep === 'select_goal' && (
        <SelectGoalScreen onNext={() => handleNext('how_it_helps')} />
      )}

      {currentStep === 'how_it_helps' && (
        <HowItHelpsScreen onNext={() => handleNext('intake')} />
      )}

      {currentStep === 'intake' && (
        <PersonalIntakeScreen onNext={() => handleNext('plan_reveal')} />
      )}

      {currentStep === 'plan_reveal' && (
        <PlanRevealScreen onNext={() => handleNext('paywall')} />
      )}

      {currentStep === 'paywall' && (
        <PaywallScreen />
      )}

    </main>
  );
}
