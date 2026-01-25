"use client";
import React, { useState, useEffect } from 'react';
import { useOnboarding } from '@/app/context/OnboardingContext';
import { Icons } from '@/components/Icons';

export default function PlanRevealStep() {
    const { userData, nextStep } = useOnboarding();
    const [phase, setPhase] = useState<"checklist" | "processing" | "timeline">("checklist");
    const [progress, setProgress] = useState(0);

    // Phase 1: Processing Animation
    useEffect(() => {
        if (phase === "checklist") {
            const timer = setTimeout(() => setPhase("processing"), 1500); // Quick check
            return () => clearTimeout(timer);
        }
        if (phase === "processing") {
            const interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setPhase("timeline");
                        return 100;
                    }
                    return prev + 2; // Speed of loader
                });
            }, 50);
            return () => clearInterval(interval);
        }
    }, [phase]);

    if (phase === "checklist" || phase === "processing") {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-black text-white p-6 relative overflow-hidden">
                {/* AI Core Animation */}
                <div className="relative w-40 h-40 mb-10">
                    <div className="absolute inset-0 border-4 border-pink-500 rounded-full opacity-30 animate-spin-slow"></div>
                    <div className="absolute inset-2 border-4 border-pink-400 rounded-full opacity-40 animate-spin-reverse"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 bg-pink-600 rounded-full blur-xl animate-pulse-slow"></div>
                    </div>
                </div>

                <h2 className="text-2xl font-bold mb-2">PERSONALIZING PLAN</h2>
                <p className="text-gray-400 mb-8 text-center max-w-xs">
                    Crafting your custom routine to {userData.goal.toLowerCase()}.
                </p>

                {/* Checklist */}
                <div className="space-y-4 w-full max-w-xs">
                    {[
                        "Analyzing biometrics...",
                        "Adjusting for comfort...",
                        "Selecting exercises...",
                        "Building timeline..."
                    ].map((item, i) => (
                        <div key={i} className="flex items-center space-x-3 transition-opacity duration-500" style={{ opacity: progress > (i * 25) ? 1 : 0.4 }}>
                            <div className={`w-2 h-2 rounded-full ${progress > (i * 25) ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' : 'bg-gray-600'}`}></div>
                            <span className="font-mono text-sm">{item}</span>
                        </div>
                    ))}
                </div>

                <div className="absolute bottom-10 w-full max-w-md px-6">
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                        <span>PROGRESS</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-pink-500 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </div>
        );
    }

    // Phase 3: Timeline Reveal
    return (
        <div className="flex flex-col h-full bg-black text-white p-6 pt-12 relative overflow-hidden">
            {/* Particles background CSS would go here */}
            
            <h1 className="text-3xl font-bold text-center mb-2 animate-slide-up">
                {userData.name}, your path to<br />
                <span className="text-pink-500">{userData.goal}</span> is ready.
            </h1>
            
            <p className="text-center text-gray-400 mb-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
                Feel a difference by next week.
            </p>

            {/* Holographic Timeline Visual (Simplified) */}
            <div className="relative py-8 pl-8 border-l-2 border-pink-500/30 ml-4 space-y-12 animate-slide-up" style={{animationDelay: '0.3s'}}>
                {[
                    { week: "Week 1", desc: "Foundation & Release" },
                    { week: "Week 2", desc: "Activation & Control" },
                    { week: "Week 4", desc: "Strength & Confidence" },
                    { week: "Week 6", desc: "Total Transformation" }
                ].map((item, i) => (
                    <div key={i} className="relative">
                        <div className="absolute -left-[41px] top-1 w-6 h-6 bg-black border-2 border-pink-500 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                        <h3 className="font-bold text-lg">{item.week}</h3>
                        <p className="text-gray-400 text-sm">{item.desc}</p>
                    </div>
                ))}
            </div>

            <button 
                onClick={nextStep}
                className="w-full h-14 bg-gradient-to-r from-pink-600 to-purple-600 text-white text-lg font-bold rounded-full shadow-[0_0_20px_rgba(236,72,153,0.5)] mt-auto mb-8 breathing-button"
            >
                Unlock My Plan
            </button>
        </div>
    );
}
