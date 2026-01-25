"use client";
import React, { useEffect, useState } from 'react';
import { useOnboarding } from '@/app/context/OnboardingContext';

// Hardcoded logic from Swift file
const getBenefits = (goal: string) => {
    // Simplified mapping for brevity, extend as needed based on Swift code
    if (goal.includes("Pregnancy")) return { icon: "🤰", items: ["Gentle prep", "Pelvic ready", "Core strong", "Support bump", "Ease back", "Calm mind"] };
    if (goal.includes("Postpartum")) return { icon: "👶", items: ["Floor restored", "Core linked", "Gentle safe", "Lift ease", "Back support", "C-section safe"] };
    if (goal.includes("Leaks")) return { icon: "💧", items: ["Sneeze safe", "Run free", "Dry nights", "Urgency control", "Confident gym", "No pads"] };
    return { icon: "✨", items: ["Stronger core", "Confident lifts", "Run tall", "Posture hold", "Injury risk down", "Deep breath"] };
};

export default function HowItHelpsStep() {
    const { userData, nextStep } = useOnboarding();
    const { icon, items } = getBenefits(userData.goal);
    const [animateNodes, setAnimateNodes] = useState(false);

    useEffect(() => {
        setTimeout(() => setAnimateNodes(true), 100);
    }, []);

    return (
        <div className="flex flex-col h-full p-6 max-w-md mx-auto pt-10">
            <h2 className="text-2xl font-bold text-appTextPrimary text-center mb-4">
                Here's how we'll <span className="text-appPrimaryAccent">{userData.goal}</span>
            </h2>

            {/* Constellation Animation Container */}
            <div className="flex-1 relative flex items-center justify-center my-8">
                {/* Center Hub */}
                <div className="w-24 h-24 bg-white rounded-full shadow-lg z-20 flex items-center justify-center text-4xl border-4 border-pink-50">
                    {icon}
                </div>

                {/* Nodes */}
                {items.map((text, i) => {
                    const angle = (i * (360 / items.length)) * (Math.PI / 180);
                    const radius = 130; // Distance from center
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;

                    return (
                        <div 
                            key={i}
                            className={`absolute transition-all duration-1000 ease-out flex flex-col items-center justify-center w-24`}
                            style={{
                                transform: animateNodes ? `translate(${x}px, ${y}px)` : `translate(0px, 0px)`,
                                opacity: animateNodes ? 1 : 0
                            }}
                        >
                            {/* Connector Line (simulated with pseudo-element or separate div if needed, skipping for simple web) */}
                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 text-center">
                                <span className="text-xs font-bold text-appTextPrimary leading-tight block">{text}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button 
                onClick={nextStep}
                className="w-full h-14 bg-appPrimaryAccent text-white text-lg font-bold rounded-full shadow-lg mt-auto mb-8 active:scale-95 transition-transform"
            >
                Next: Personalize My Plan
            </button>
        </div>
    );
}
