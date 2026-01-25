"use client";
import React, { useEffect, useState } from 'react';
import { useOnboarding } from '@/app/context/OnboardingContext';
import { Icons } from '@/components/Icons';

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

    // Social Proof Counter
    useEffect(() => {
        const interval = setInterval(() => {
            setSocialCount(prev => {
                if (prev >= 10200) {
                    clearInterval(interval);
                    return 10200;
                }
                return prev + 17;
            });
        }, 30);
        return () => clearInterval(interval);
    }, []);

    // Review Ticker
    useEffect(() => {
        const interval = setInterval(() => {
            setReviewIndex(prev => (prev + 1) % reviews.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col h-full relative overflow-hidden p-6 max-w-md mx-auto">
            {/* Ambient Butterflies (CSS only) */}
            <div className="butterfly left-10 top-20" style={{ animationDelay: '0s' }}><Icons.Butterfly /></div>
            <div className="butterfly right-10 top-40" style={{ animationDelay: '2s' }}><Icons.Butterfly /></div>
            <div className="butterfly left-1/2 top-60" style={{ animationDelay: '5s' }}><Icons.Butterfly /></div>

            <div className="flex-1 flex flex-col items-center justify-center space-y-8 z-10 pt-20">
                <Icons.Logo />
                
                <h1 className="text-3xl font-bold text-appTextPrimary text-center leading-tight animate-slide-up">
                    Strength & Confidence<br />From Your Core Outward.
                </h1>
                
                <p className="text-appTextSecondary text-center text-lg animate-slide-up" style={{animationDelay: '0.1s'}}>
                    Your personal AI physio-coach for leaks, pain, and confidence.
                </p>

                {/* Benefits List */}
                <div className="space-y-4 w-full pl-4 animate-slide-up" style={{animationDelay: '0.2s'}}>
                    {[
                        "A new 5-minute plan, just for you, every day.",
                        "300+ physio-approved videos for wellness.",
                        "Chat with your AI Coach, Mia™, 24/7."
                    ].map((text, i) => (
                        <div key={i} className="flex items-center space-x-4">
                            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-appPrimaryAccent">✓</div>
                            <span className="text-appTextPrimary font-medium">{text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Section */}
            <div className="mt-auto space-y-6 pb-8 z-10">
                {/* Ticker */}
                <div className="h-16 flex items-center justify-center overflow-hidden relative">
                    <p className="text-center text-appTextPrimary transition-all duration-500 transform absolute w-full px-4">
                        <span className="italic">“{reviews[reviewIndex].text}”</span>
                        <br />
                        <span className="font-bold text-sm text-appTextSecondary">– {reviews[reviewIndex].author}</span>
                    </p>
                </div>

                <button 
                    onClick={nextStep}
                    className="w-full h-14 bg-appPrimaryAccent text-white text-lg font-bold rounded-full shadow-lg breathing-button active:scale-95 transition-transform"
                >
                    Start My 5-Min Journey
                </button>

                <p className="text-center text-appTextSecondary text-sm">
                    Join {socialCount.toLocaleString()}+ members finding confidence.
                </p>
            </div>
        </div>
    );
}
