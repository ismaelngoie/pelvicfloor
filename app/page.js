"use client";
import React, { useState } from 'react';
import WelcomeScreen from '@/components/WelcomeScreen';
// import SelectGoalScreen from '@/components/SelectGoalScreen'; // We will build this next
// import HowItWorksScreen from '@/components/HowItWorksScreen';
// import PersonalIntakeScreen from '@/components/PersonalIntakeScreen';

export default function Home() {
  const [currentStep, setCurrentStep] = useState('welcome');

  // Simple state machine to manage navigation
  const nextStep = (step) => {
    setCurrentStep(step);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-app-background">
      {/* Mobile container constraint for desktop viewing */}
      <div className="w-full max-w-md h-screen relative bg-app-background shadow-2xl overflow-hidden">
        
        {currentStep === 'welcome' && (
          <WelcomeScreen onNext={() => nextStep('select_goal')} />
        )}

        {currentStep === 'select_goal' && (
          // Placeholder for the next component
          <div className="flex items-center justify-center h-full text-app-textPrimary">
            Select Goal Screen (Coming Next)
          </div>
        )}

      </div>
    </main>
  );
}
