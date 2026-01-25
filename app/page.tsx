"use client";
import React from 'react';
import { OnboardingProvider, useOnboarding } from '@/app/context/OnboardingContext';
import WelcomeStep from '@/components/steps/1_Welcome';
import SelectGoalStep from '@/components/steps/2_SelectGoal';
import HowItHelpsStep from '@/components/steps/3_HowItHelps';
import PersonalIntakeStep from '@/components/steps/4_PersonalIntake';
import PlanRevealStep from '@/components/steps/5_PlanReveal';
import SubscriptionStep from '@/components/steps/6_Subscription';

function OnboardingFlow() {
    const { step } = useOnboarding();

    switch (step) {
        case 1: return <WelcomeStep />;
        case 2: return <SelectGoalStep />;
        case 3: return <HowItHelpsStep />;
        case 4: return <PersonalIntakeStep />;
        case 5: return <PlanRevealStep />;
        case 6: return <SubscriptionStep />;
        default: return <WelcomeStep />;
    }
}

export default function Home() {
    return (
        <main className="min-h-screen bg-appBackground text-appTextPrimary font-sans">
            <OnboardingProvider>
                <OnboardingFlow />
            </OnboardingProvider>
        </main>
    );
}
