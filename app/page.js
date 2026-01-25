"use client";
import React, { useState } from 'react';
import WelcomeScreen from '@/components/WelcomeScreen';
import SelectGoalScreen from '@/components/SelectGoalScreen';
import HowItHelpsScreen from '@/components/HowItHelpsScreen';
import PersonalIntakeScreen from '@/components/PersonalIntakeScreen'; // <--- NEW IMPORT

export default function Home() {
  const [currentStep, setCurrentStep] = useState('welcome');

  const handleNext = (nextStep) => {
    setCurrentStep(nextStep);
  };

  return (
    // h-[100dvh] is CRITICAL for mobile browsers
    <main className="w-full h-[100dvh] overflow-hidden bg-app-background">
      
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
        <div className="w-full h-full flex items-center justify-center text-app-textPrimary font-bold animate-fade-in">
          Plan Reveal Screen (Coming Next)
        </div>
      )}

    </main>
  );
}
