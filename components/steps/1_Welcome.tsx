"use client";
import React, { useEffect, useState } from 'react';
import { useOnboarding } from '@/app/context/OnboardingContext';
import { Icons } from '@/components/Icons'; // Using our SVG icon map
import Image from 'next/image';
import { Play, MessageCircle, Activity } from 'lucide-react'; // Mapping SF Symbols

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
    
    // We generate butterflies only on the client to avoid hydration mismatch
    const [butterflies, setButterflies] = useState<any[]>([]);

    useEffect(() => {
        // Create 15 butterflies with random flight paths
        const b = Array.from({ length: 15 }).map((_, i) => ({
            id: i,
            xStart: `${Math.random() * 100}vw`,
            xEnd: `${Math.random() * 100}vw`,
            rEnd: `${-20 + Math.random() * 40}deg`,
            duration: `${15 + Math.random() * 15}s`,
            delay: `${Math.random() * -20}s`,
            scale: 0.5 + Math.random() * 0.5
        }));
        setButterflies(b);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setSocialCount(prev => (prev >= 10200 ? 10200 : prev + 17));
        }, 30);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setReviewIndex(prev => (prev + 1) % reviews.length);
        }, 4000); // 4 seconds per review
        return () => clearInterval(interval);
    }, []);

    return (
        // MAIN CONTAINER: 100vh height, flex column, no scroll
        <div className="relative h-screen w-full flex flex-col justify-between overflow-hidden font-sans">
            
            {/* --- REALISTIC BUTTERFLY LAYER --- */}
            <div className="butterfly-container">
                {butterflies.map((b) => (
                    <div 
                        key={b.id} 
                        className="butterfly"
                        style={{ 
                            // @ts-ignore
                            '--x-start': b.xStart, 
                            '--x-end': b.xEnd, 
                            '--r-end': b.rEnd,
                            animationDuration: b.duration, 
                            animationDelay: b.delay,
                            animationName: 'float'
                        }}
                    />
                ))}
            </div>

            {/* --- TOP SECTION (Centered) --- */}
            {/* Flex-grow takes available space to center vertically */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 z-10 w-full max-w-lg mx-auto">
                
                {/* Logo - Matches iOS 70pt height constraint */}
                <div className="relative w-20 h-20 mb-6 shadow-xl rounded-2xl overflow-hidden animate-slide-up">
                    <Image src="/icon.png" alt="Logo" fill className="object-cover" priority />
                </div>
                
                {/* Headline - Matches iOS "Strength & Confidence" */}
                <h1 className="text-3xl md:text-4xl font-bold text-appTextPrimary text-center leading-tight mb-2 animate-slide-up">
                    Strength & Confidence<br />
                    From Your Core Outward.
                </h1>
                
                {/* Subheadline - Matches iOS 17pt font */}
                <p className="text-appTextSecondary text-center text-[17px] leading-relaxed mb-10 animate-slide-up px-4">
                    Your personal AI physio-coach for leaks, pain, and confidence.
                </p>

                {/* Benefits Stack - Matches iOS UIStackView spacing */}
                <div className="w-full space-y-5 animate-slide-up pl-2">
                    <BenefitRow 
                        icon={<Activity className="w-6 h-6 text-[#E65473] fill-current/10" />}
                        text="A new 5-minute plan, just for you, every day."
                    />
                    <BenefitRow 
                        icon={<Play className="w-6 h-6 text-[#E65473] fill-current/10" />}
                        text="300+ physio-approved videos for total wellness."
                    />
                    <BenefitRow 
                        icon={<MessageCircle className="w-6 h-6 text-[#E65473] fill-current/10" />}
                        text="Chat with your AI Coach, Mia™, 24/7."
                    />
                </div>
            </div>

            {/* --- BOTTOM SECTION (Fixed at bottom) --- */}
            <div className="z-10 w-full max-w-lg mx-auto px-8 pb-10 pt-4 bg-gradient-to-t from-white via-white/80 to-transparent">
                
                {/* Review Ticker (Floating text style from Swift) */}
                <div className="h-16 flex items-center justify-center relative mb-4">
                    <div key={reviewIndex} className="absolute w-full text-center transition-all duration-700 animate-slide-up">
                        <p className="text-[15px] italic text-appTextPrimary/80 leading-snug">
                            “{reviews[reviewIndex].text}”
                        </p>
                        <p className="text-[15px] font-semibold text-appTextPrimary mt-1">
                            – {reviews[reviewIndex].author}
                        </p>
                    </div>
                </div>

                {/* CTA Button - Matches iOS 56pt height, 28pt corner radius */}
                <button 
                    onClick={nextStep} 
                    className="w-full h-[56px] bg-[#E65473] text-white text-[18px] font-bold rounded-[28px] shadow-lg shadow-black/25 breathing-button active:scale-95 transition-transform flex items-center justify-center"
                >
                    Start My 5-Min Journey
                </button>

                {/* Social Proof Label - Matches iOS 15pt font */}
                <p className="text-center text-appTextSecondary text-[15px] mt-5">
                    Join {socialCount.toLocaleString()}+ members finding confidence.
                </p>
            </div>
        </div>
    );
}

// Helper Component for the Benefits List to ensure perfect alignment
function BenefitRow({ icon, text }: { icon: React.ReactNode, text: string }) {
    return (
        <div className="flex items-start space-x-4">
            {/* Fixed width container for icon to align text perfectly */}
            <div className="w-8 flex-shrink-0 flex justify-center pt-0.5">
                {icon}
            </div>
            <p className="text-appTextPrimary text-[16px] font-medium leading-snug">
                {text}
            </p>
        </div>
    );
}
