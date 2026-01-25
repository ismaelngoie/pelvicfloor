"use client";
import React, { useEffect, useState } from 'react';
import { useOnboarding } from '@/app/context/OnboardingContext';
import Image from 'next/image';
import { Play, MessageCircle, Activity } from 'lucide-react';

const reviews = [
    { text: "Zero leaks by week 2. I cried happy tears.", author: "Emily, 39" },
    { text: "Sneezed today. No panic. I’m free.", author: "Dana, 46" },
    { text: "More sensation, less worry, more us.", author: "Jess, 35" },
    { text: "Pain-free sitting. Sleep through the night.", author: "Olivia, 41" },
    { text: "From wobbly to steady, lifting my baby feels safe.", author: "Mia, 33" },
];

export default function WelcomeStep() {
    const { nextStep } = useOnboarding();
    const [socialCount, setSocialCount] = useState(9800);
    const [reviewIndex, setReviewIndex] = useState(0);
    const [butterflies, setButterflies] = useState<any[]>([]);

    useEffect(() => {
        const b = Array.from({ length: 14 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            duration: `${12 + Math.random() * 18}s`,
            delay: `${Math.random() * -20}s`,
            scale: 0.6 + Math.random() * 0.4,
            type: Math.random() > 0.5 ? 'fly-left' : 'fly-up'
        }));
        setButterflies(b);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setSocialCount(p => (p >= 10200 ? 10200 : p + 17)), 30);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setReviewIndex(p => (p + 1) % reviews.length), 4000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative h-[100dvh] w-full flex flex-col font-sans overflow-hidden">
            
            {/* --- FIX: FIXED WALLPAPER BACKGROUND --- */}
            {/* This div sits behind everything and ignores scroll/keyboard */}
            <div className="bg-welcome-gradient" />

            {/* --- BUTTERFLY LAYER --- */}
            <div className="butterfly-container absolute inset-0 pointer-events-none z-0">
                {butterflies.map((b) => (
                    <div 
                        key={b.id} 
                        className="butterfly"
                        style={{ 
                            left: b.left, 
                            animationDuration: b.duration, 
                            animationDelay: b.delay,
                            transform: `scale(${b.scale})`,
                            animationName: b.type
                        }}
                    />
                ))}
            </div>

            {/* --- TOP CONTENT --- */}
            <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg mx-auto px-8 z-10">
                
                {/* Logo */}
                <div className="relative w-24 h-24 mb-8 shadow-2xl rounded-2xl overflow-hidden animate-slide-up shrink-0">
                    <Image src="/icon.png" alt="Logo" fill className="object-cover" priority />
                </div>
                
                {/* Headline */}
                <h1 className="text-[34px] leading-tight font-extrabold text-[#1A1A26] text-center mb-4 animate-slide-up tracking-tight shrink-0 drop-shadow-sm">
                    Strength & Confidence<br />
                    From Your Core Outward.
                </h1>
                
                {/* Subheadline */}
                <p className="text-[17px] text-[#737380] text-center leading-relaxed mb-12 animate-slide-up px-2 shrink-0">
                    Your personal AI physio-coach for leaks, pain, and confidence.
                </p>

                {/* Benefits Stack */}
                <div className="w-full space-y-6 animate-slide-up pl-2 shrink-0">
                    <BenefitRow 
                        icon={<div className="w-7 h-7 rounded-full bg-[#E65473] flex items-center justify-center"><Activity className="w-4 h-4 text-white" strokeWidth={3} /></div>}
                        text="A new 5-minute plan, just for you, every day."
                    />
                    <BenefitRow 
                        icon={<div className="w-7 h-7 rounded-full bg-[#E65473] flex items-center justify-center"><Play className="w-4 h-4 text-white fill-white" /></div>}
                        text="300+ physio-approved videos for total wellness."
                    />
                    <BenefitRow 
                        icon={<div className="w-7 h-7 rounded-full bg-[#E65473] flex items-center justify-center"><MessageCircle className="w-4 h-4 text-white" strokeWidth={3} /></div>}
                        text="Chat with your AI Coach, Mia™, 24/7."
                    />
                </div>
            </div>

            {/* --- BOTTOM CONTENT --- */}
            <div className="z-10 w-full max-w-md mx-auto px-8 pb-safe-bottom pt-4 mb-4">
                
                {/* Review Ticker */}
                <div className="h-14 flex items-center justify-center relative mb-5">
                    <div key={reviewIndex} className="absolute w-full text-center transition-all duration-700 animate-fade-in">
                        <p className="text-[15px] italic text-[#1A1A26] leading-snug font-medium">
                            “{reviews[reviewIndex].text}”
                        </p>
                        <p className="text-[14px] font-bold text-[#737380] mt-1">
                            – {reviews[reviewIndex].author}
                        </p>
                    </div>
                </div>

                {/* CTA Button */}
                {/* UPGRADED: Added active:scale-95 and active:bg-[#D64463] for real click feel */}
                <button 
                    onClick={nextStep} 
                    className="w-full h-[56px] bg-[#E65473] text-white text-[19px] font-bold rounded-[28px] 
                               shadow-xl shadow-pink-500/30 
                               breathing-button 
                               active:scale-95 active:bg-[#D64463] active:shadow-none
                               transition-all duration-100 ease-out
                               flex items-center justify-center
                               touch-manipulation"
                >
                    Start My 5-Min Journey
                </button>

                {/* Social Proof */}
                <p className="text-center text-[#737380] text-[14px] mt-4">
                    Join {socialCount.toLocaleString()}+ members finding confidence.
                </p>
            </div>
        </div>
    );
}

function BenefitRow({ icon, text }: { icon: React.ReactNode, text: string }) {
    return (
        <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 pt-0.5">
                {icon}
            </div>
            <p className="text-[#1A1A26] text-[16px] font-semibold leading-snug">
                {text}
            </p>
        </div>
    );
}
