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
            type: Math.random() > 0.5 ? 'fly-left' : ''
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
        // Main Container: Locked to screen, Apple font stack
        <div className="relative h-screen w-full flex flex-col items-center overflow-hidden font-sans">
            
            {/* --- BUTTERFLY LAYER --- */}
            <div className="butterfly-container">
                {butterflies.map((b) => (
                    <div 
                        key={b.id} 
                        className="butterfly"
                        style={{ 
                            left: b.left,
                            animationDuration: b.duration, 
                            animationDelay: b.delay,
                            transform: `scale(${b.scale})`,
                            animationName: b.type === 'fly-left' ? 'fly-left' : 'fly-up'
                        }}
                    />
                ))}
            </div>

            {/* --- TOP SECTION (Logo, Headline, Benefits) --- */}
            {/* UPDATED: Added 'pt-20' (80px) to push content below the Dynamic Island */}
            {/* This keeps the spacing BETWEEN elements the same, but moves the whole block down */}
            <div className="flex-1 flex flex-col items-center justify-start w-full max-w-lg px-8 pt-20 pb-10 z-10">
                
                {/* Logo */}
                <div className="relative w-20 h-20 mb-6 shadow-xl rounded-2xl overflow-hidden animate-slide-up shrink-0">
                    <Image src="/icon.png" alt="Logo" fill className="object-cover" priority />
                </div>
                
                {/* Headline */}
                <h1 className="text-[32px] leading-tight font-bold text-appTextPrimary text-center mb-3 animate-slide-up tracking-tight shrink-0">
                    Strength & Confidence<br />
                    From Your Core Outward.
                </h1>
                
                {/* Subheadline */}
                <p className="text-[17px] text-appTextSecondary text-center leading-relaxed mb-10 animate-slide-up px-2 shrink-0">
                    Your personal AI physio-coach for leaks, pain, and confidence.
                </p>

                {/* Benefits Stack */}
                <div className="w-full space-y-5 animate-slide-up pl-4 shrink-0">
                    <BenefitRow 
                        icon={<Activity className="w-6 h-6 text-[#E65473]" strokeWidth={2.5} />}
                        text="A new 5-minute plan, just for you, every day."
                    />
                    <BenefitRow 
                        icon={<Play className="w-6 h-6 text-[#E65473]" strokeWidth={2.5} fill="currentColor" />}
                        text="300+ physio-approved videos for total wellness."
                    />
                    <BenefitRow 
                        icon={<MessageCircle className="w-6 h-6 text-[#E65473]" strokeWidth={2.5} />}
                        text="Chat with your AI Coach, Mia™, 24/7."
                    />
                </div>
            </div>

            {/* --- BOTTOM SECTION (Reviews & CTA) --- */}
            {/* Added a subtle gradient background behind the bottom area to ensure readability */}
            <div className="z-10 w-full max-w-md px-6 pb-12 pt-4 bg-gradient-to-t from-white via-white/90 to-transparent">
                
                {/* Review Ticker */}
                <div className="h-14 flex items-center justify-center relative mb-5">
                    <div key={reviewIndex} className="absolute w-full text-center transition-all duration-500 animate-fade-in">
                        <p className="text-[15px] italic text-appTextPrimary/90 leading-snug">
                            “{reviews[reviewIndex].text}”
                        </p>
                        <p className="text-[15px] font-bold text-appTextSecondary mt-1">
                            – {reviews[reviewIndex].author}
                        </p>
                    </div>
                </div>

                {/* CTA Button */}
                <button 
                    onClick={nextStep} 
                    className="w-full h-[56px] bg-[#E65473] text-white text-[18px] font-bold rounded-[28px] shadow-lg shadow-pink-500/25 breathing-button active:scale-95 transition-transform flex items-center justify-center"
                >
                    Start My 5-Min Journey
                </button>

                {/* Social Proof */}
                <p className="text-center text-appTextSecondary text-[15px] mt-4 font-medium">
                    Join {socialCount.toLocaleString()}+ members finding confidence.
                </p>
            </div>
        </div>
    );
}

function BenefitRow({ icon, text }: { icon: React.ReactNode, text: string }) {
    return (
        <div className="flex items-start space-x-4">
            <div className="w-7 flex-shrink-0 flex justify-center pt-0.5">
                {icon}
            </div>
            <p className="text-appTextPrimary text-[16px] font-medium leading-snug">
                {text}
            </p>
        </div>
    );
}
