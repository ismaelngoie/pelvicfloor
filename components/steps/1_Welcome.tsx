"use client";
import React, { useEffect, useState } from 'react';
import { useOnboarding } from '@/app/context/OnboardingContext';
import { Icons } from '@/components/Icons';
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

    // 1. Generate Random Butterflies on Mount
    useEffect(() => {
        const newButterflies = Array.from({ length: 15 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`, // Random horizontal position
            duration: `${15 + Math.random() * 20}s`, // Random speed (15s to 35s)
            delay: `${Math.random() * -20}s`, // Start at different times (negative starts them mid-flight)
            size: 20 + Math.random() * 40, // Random size (20px to 60px)
            type: Math.random() > 0.5 ? 'fly-left' : '' // Random direction
        }));
        setButterflies(newButterflies);
    }, []);

    // 2. Social Proof Counter
    useEffect(() => {
        const interval = setInterval(() => {
            setSocialCount(prev => (prev >= 10200 ? 10200 : prev + 17));
        }, 30);
        return () => clearInterval(interval);
    }, []);

    // 3. Review Ticker
    useEffect(() => {
        const interval = setInterval(() => {
            setReviewIndex(prev => (prev + 1) % reviews.length);
        }, 3500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative min-h-screen w-full flex flex-col items-center justify-between overflow-hidden">
            
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
                    >
                        <Icons.Butterfly />
                    </div>
                ))}
            </div>

            {/* --- MAIN CONTENT LAYER --- */}
            {/* This container centers everything nicely on desktop but gives space on mobile */}
            <div className="z-10 flex flex-col items-center justify-center flex-grow w-full max-w-2xl px-6 pt-12 md:pt-0">
                
                {/* Logo */}
                <div className="mb-8 relative w-24 h-24 md:w-32 md:h-32 shadow-2xl rounded-3xl overflow-hidden animate-slide-up">
                    <Image 
                        src="/icon.png" 
                        alt="Pelvic Floor Coach Logo" 
                        fill 
                        className="object-cover"
                        priority
                    />
                </div>
                
                {/* Headline */}
                <h1 className="text-4xl md:text-6xl font-black text-appTextPrimary text-center leading-tight tracking-tight mb-4 animate-slide-up">
                    Strength & Confidence<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-600">
                        From Your Core.
                    </span>
                </h1>
                
                {/* Subheadline */}
                <p className="text-appTextSecondary text-center text-lg md:text-xl max-w-lg mb-10 animate-slide-up" style={{animationDelay: '0.1s'}}>
                    Your personal AI physio-coach for leaks, pain, and total confidence.
                </p>

                {/* Benefits List */}
                <div className="space-y-5 w-full max-w-md animate-slide-up" style={{animationDelay: '0.2s'}}>
                    {[
                        "A new 5-minute plan, just for you, every day.",
                        "300+ physio-approved videos for wellness.",
                        "Chat with your AI Coach, Mia™, 24/7."
                    ].map((text, i) => (
                        <div key={i} className="flex items-center space-x-4 bg-white/60 backdrop-blur-sm p-3 rounded-2xl border border-white/50 shadow-sm">
                            <div className="w-8 h-8 rounded-full bg-pink-100 flex-shrink-0 flex items-center justify-center text-appPrimaryAccent font-bold">✓</div>
                            <span className="text-appTextPrimary font-medium text-base md:text-lg">{text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- BOTTOM CTA LAYER --- */}
            <div className="z-10 w-full max-w-md px-6 pb-10 mt-8 space-y-6">
                
                {/* Review Ticker */}
                <div className="h-16 flex items-center justify-center relative bg-white/40 backdrop-blur-md rounded-2xl border border-white/30 shadow-sm">
                    <p className="text-center text-appTextPrimary w-full px-4 animate-fade-in transition-all duration-500" key={reviewIndex}>
                        <span className="italic font-medium text-gray-800">“{reviews[reviewIndex].text}”</span>
                        <br />
                        <span className="font-bold text-xs text-appPrimaryAccent uppercase tracking-wider mt-1 block">– {reviews[reviewIndex].author}</span>
                    </p>
                </div>

                {/* Big Button */}
                <button 
                    onClick={nextStep} 
                    className="w-full h-16 bg-appPrimaryAccent text-white text-xl font-bold rounded-full shadow-xl shadow-pink-500/30 breathing-button active:scale-95 transition-transform flex items-center justify-center"
                >
                    Start My 5-Min Journey
                </button>

                {/* Social Proof Text */}
                <p className="text-center text-appTextSecondary text-sm font-medium">
                    Join <span className="font-bold text-appTextPrimary">{socialCount.toLocaleString()}+</span> members finding confidence.
                </p>
            </div>
        </div>
    );
}
