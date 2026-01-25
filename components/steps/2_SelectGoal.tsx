"use client";
import React from 'react';
import { useOnboarding } from '@/app/context/OnboardingContext';
import { Icons } from '@/components/Icons';

const goals = [
    { id: "Prepare for Pregnancy", icon: "🤰" },
    { id: "Recover Postpartum", icon: "👶" },
    { id: "Build Core Strength", icon: "💪" },
    { id: "Stop Bladder Leaks", icon: "💧" },
    { id: "Ease Pelvic Pain", icon: "❤️‍🩹" },
    { id: "Improve Intimacy", icon: "❤️" },
    { id: "Support My Fitness", icon: "🏃‍♀️" },
    { id: "Boost Stability & Posture", icon: "🧘‍♀️" },
];

export default function SelectGoalStep() {
    const { userData, updateFields, nextStep } = useOnboarding();

    const handleSelect = (goal: string) => {
        updateFields({ goal });
        // Slight delay for visual feedback before moving on
        setTimeout(() => nextStep(), 300);
    };

    return (
        <div className="flex flex-col h-full p-6 max-w-md mx-auto pt-10">
            <h2 className="text-2xl font-bold text-appTextPrimary text-center mb-2 animate-slide-up">
                Let's set your primary goal.
            </h2>
            <p className="text-appTextSecondary text-center mb-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
                This choice shapes every workout from Coach Mia™.
            </p>

            <div className="grid grid-cols-2 gap-4 overflow-y-auto pb-20 no-scrollbar animate-slide-up" style={{animationDelay: '0.2s'}}>
                {goals.map((item) => {
                    const isSelected = userData.goal === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleSelect(item.id)}
                            className={`
                                relative p-4 rounded-3xl border-2 flex flex-col items-center justify-center text-center space-y-3 h-40 transition-all duration-200
                                ${isSelected 
                                    ? 'border-appPrimaryAccent bg-white shadow-xl scale-105 z-10' 
                                    : 'border-appBorderIdle bg-white hover:border-pink-200'
                                }
                            `}
                        >
                            {isSelected && (
                                <div className="absolute top-3 right-3 text-appPrimaryAccent">
                                    <Icons.Check className="w-6 h-6" />
                                </div>
                            )}
                            <span className="text-4xl">{item.icon}</span>
                            <span className={`font-semibold text-sm ${isSelected ? 'text-appPrimaryAccent' : 'text-appTextPrimary'}`}>
                                {item.id}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
