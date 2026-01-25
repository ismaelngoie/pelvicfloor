"use client";
import React, { useEffect, useState } from 'react';
import { useOnboarding } from '@/app/context/OnboardingContext';
import Image from 'next/image';

const reviews = [
    { text: "Zero leaks by week 2. I cried happy tears.", author: "Emily, 39" },
    { text: "Sneezed today. No panic. I’m free.", author: "Dana, 46" },
    { text: "More sensation, less worry, more us.", author: "Jess, 35" },
    { text: "Pain-free sitting. Sleep through the night.", author: "Olivia, 41" },
];

export default function WelcomeStep() {
    const { nextStep } = useOnboarding();
    const [socialCount, setSocialCount] = useState(9800);
    const [reviewIndex, setReviewIndex] = useState(0);
    const [butterflies, setButterflies] = useState<Array<{id: number, left: string, duration: string, delay: string, size: number, type: string}>>([]);

    useEffect(() => {
        const newButterflies = Array.from({ length: 12 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            duration: `${15 + Math.random() * 15}s`,
            delay: `${Math.random() * -20}s`,
            size: 24 + Math.random() * 24, // Optimized size
            type: Math.random() > 0.5 ? 'fly-left' : ''
        }));
        setButterflies(newButterflies);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setSocialCount(p => (p >= 10200 ? 10200 : p + 17)), 30);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setReviewIndex(p => (p + 1) % reviews.length), 3500);
        return () => clearInterval(interval);
    }, []);

    return (
        // MAIN CONTAINER: Locked to screen height, absolutely no scroll
        <div className="relative h-screen w-full flex flex-col justify-between overflow-hidden bg-gradient-to-b from-pink-50/50 to-white">
            
            {/* --- BUTTERFLY LAYER --- */}
            <div className="butterfly-container">
                {butterflies.map((b) => (
                    <div 
                        key={b.id} 
                        className={`butterfly ${b.type}`}
                        style={{ 
                            left: b.left, 
                            animationDuration: b.duration, 
                            animationDelay: b.delay,
                            width: b.size,
                            height: b.size
                        }}
                    />
                ))}
            </div>

            {/* --- TOP SECTION (Logo & Title) --- */}
            {/* Uses flex-1 to take available space but centers content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 z-10 pt-4 min-h-0">
                
                {/* Logo: Adjusted size to prevent taking too much vertical space */}
                <div className="relative w-20 h-20 md:w-24 md:h-24 shadow-2xl rounded-2xl overflow-hidden mb-4 md:mb-6 animate-slide-up shrink-0">
                    <Image 
                        src="/icon.png" 
                        alt="Logo" 
                        fill 
                        className="object-cover"
                        priority
                    />
                </div>
                
                {/* Compact Headline */}
                <h1 className="text-3xl md:text-5xl font-black text-appTextPrimary text-center leading-tight mb-2 animate-slide-up shrink-0">
                    Strength &<br />Confidence
                </h1>
                
                <p className="text-appTextSecondary text-center text-base md:text-lg mb-4 md:mb-8 animate-slide-up shrink-0">
                    Your personal AI physio-coach.
                </p>

                {/* Benefits: Compact layout for small screens */}
                <div className="w-full max-w-sm space-y-2 md:space-y-3 animate-slide-up overflow-y-auto no-scrollbar">
                    {[
                        "5-min daily plan, just for you.",
                        "300+ physio-approved videos.",
                        "24/7 AI Coach Chat."
                    ].map((text, i) => (
                        <div key={i} className="flex items-center space-x-3 bg-white/70 backdrop-blur-sm p-2.5 rounded-xl border border-white/60 shadow-sm">
                            <div className="w-6 h-6 rounded-full bg-pink-100 flex-shrink-0 flex items-center justify-center text-appPrimaryAccent font-bold text-xs">✓</div>
                            <span className="text-appTextPrimary font-medium text-sm md:text-base">{text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- BOTTOM SECTION (Actions) --- */}
            {/* Fixed at bottom, padding ensures it's safe on iPhone X+ */}
            <div className="z-10 w-full max-w-md mx-auto px-6 pb-8 pt-2 shrink-0">
                
                {/* Review Ticker: Fixed height container */}
                <div className="h-12 flex items-center justify-center relative bg-white/50 backdrop-blur-md rounded-xl border border-white/40 shadow-sm mb-4">
                    <p className="text-center text-appTextPrimary w-full px-2 text-xs md:text-sm animate-fade-in truncate" key={reviewIndex}>
                        <span className="italic">“{reviews[reviewIndex].text}”</span>
                        <span className="font-bold text-appPrimaryAccent ml-2">– {reviews[reviewIndex].author}</span>
                    </p>
                </div>

                {/* Main CTA */}
                <button 
                    onClick={nextStep} 
                    className="w-full h-14 bg-appPrimaryAccent text-white text-lg font-bold rounded-full shadow-lg shadow-pink-500/20 breathing-button active:scale-95 transition-transform"
                >
                    Start My 5-Min Journey
                </button>

                {/* Social Proof */}
                <p className="text-center text-appTextSecondary text-xs mt-3 font-medium">
                    Join <span className="font-bold text-appTextPrimary">{socialCount.toLocaleString()}+</span> members.
                </p>
            </div>
        </div>
    );
}
