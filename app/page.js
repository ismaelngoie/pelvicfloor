"use client";
import React, { useState } from 'react';
import WelcomeScreen from '@/components/WelcomeScreen';
import SelectGoalScreen from '@/components/SelectGoalScreen';
import HowItHelpsScreen from '@/components/HowItHelpsScreen';

export default function Home() {
  const [currentStep, setCurrentStep] = useState('welcome');

  const handleNext = (nextStep) => {
    setCurrentStep(nextStep);
  };

  return (
    <main className="w-full h-full">
      
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
        <div className="w-full h-full flex items-center justify-center text-app-textPrimary font-bold">
          Intake Flow (Coming Next)
        </div>
      )}

    </main>
  );
}
