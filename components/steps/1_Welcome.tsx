"use client";
import React, { useEffect, useState, useRef } from 'react';
import { useOnboarding } from '@/app/context/OnboardingContext';
import Image from 'next/image';

// Exact copy of userReviews from WelcomeViewController.swift
const reviews = [
    { text: "Zero leaks by week 2. I cried happy tears.", author: "Emily, 39" },
    { text: "Sneezed today. No panic. I’m free.", author: "Dana, 46" },
    { text: "More sensation, less worry, more us.", author: "Jess, 35" },
    { text: "Pain-free sitting. Sleep through the night. Life feels possible again.", author: "Olivia, 41" },
    { text: "From wobbly to steady, lifting my baby feels safe again.", author: "Mia, 33" },
    { text: "Bathroom maps? Deleted. I go where I want.", author: "Priya, 37" },
    { text: "Post-prostate rehab that finally clicked.", author: "James, 62" },
    { text: "Five minutes I actually do, and it changes everything.", author: "Paige, 28" },
    { text: "Jumped on the trampoline with my kids, first time in years.", author: "Priya, 37" }
];

// SF Symbols approximations
const Icons = {
    run: (
        <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-2h2v2h-2zm2.5-3.5l-3.5-3.5 1.5-1.5 2 2 4-4 1.5 1.5-5.5 5.5z" opacity="0" /> 
            {/* Custom Path to mimic SF Symbol figure.run.circle.fill roughly or generic circle run */}
            <circle cx="12" cy="12" r="10" fillOpacity="0.1" />
            <path d="M13.5 9c.83 0 1.5-.67 1.5-1.5S14.33 6 13.5 6 12 6.67 12 7.5 12.67 9 13.5 9zM6 13.5l3.5 3.5 1.5-1.5-2.1-2.1c-.2-.2-.51-.2-.71 0l-1.4 1.4-.79-1.3z" />
            <path d="M15.5 13c-.15 0-.29.03-.42.08l-2.6 1.05-1.29-2.22c-.22-.38-.63-.61-1.07-.61-.16 0-.31.03-.46.09L7.5 12.3v1.5l1.6-.6 1.4 2.4-3.5 1.7v1.5l5.05-2.45L13.5 17v3h1.5v-3.8c0-.45-.21-.87-.56-1.15l-1.33-1.04 1.14-.46c.15-.06.31-.09.47-.09.68 0 1.25.48 1.42 1.13l.36 1.37 1.45-.39-.42-1.57H15.5z"/>
        </svg>
    ),
    videos: (
        <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 6h16v12H4z" opacity="0.1"/>
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z"/>
        </svg>
    ),
    chat: (
        <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
    )
}

export default function WelcomeStep() {
    const { nextStep } = useOnboarding();
    const [socialCount, setSocialCount] = useState(9800);
    const [reviewIndex, setReviewIndex] = useState(0);
    const [isAnimatingReview, setIsAnimatingReview] = useState(false);
    
    // Butterfly state separation
    const [butterfliesBehind, setButterfliesBehind] = useState<any[]>([]);
    const [butterfliesFront, setButterfliesFront] = useState<any[]>([]);

    // --- BUTTERFLY LOGIC (Matching Swift: random pos, rotation, color) ---
    const createButterfly = (id: number) => {
        const isPink = Math.random() > 0.3; // Mostly pink
        const isWhite = !isPink && Math.random() > 0.5;
        const color = isWhite ? '#FFFFFF' : '#E65473';
        const opacity = isWhite ? 0.4 : (Math.random() > 0.5 ? 0.6 : 1.0);
        
        return {
            id,
            left: `${Math.random() * 100}%`,
            duration: `${8 + Math.random() * 7}s`, // Swift: 8...15
            delay: `${Math.random() * -10}s`,
            size: 25 + Math.random() * 25, // Swift: 25...50
            rotation: `${Math.random() * 40 - 20}deg`, // Random start rotation
            color,
            opacity
        };
    };

    useEffect(() => {
        setButterfliesBehind(Array.from({ length: 3 }).map((_, i) => createButterfly(i)));
        setButterfliesFront(Array.from({ length: 12 }).map((_, i) => createButterfly(i + 100)));
    }, []);

    // --- SOCIAL PROOF COUNTER (Matching Swift logic) ---
    useEffect(() => {
        const finalValue = 10200;
        const interval = setInterval(() => {
            setSocialCount(prev => {
                if (prev >= finalValue) {
                    clearInterval(interval);
                    return finalValue;
                }
                const increment = (finalValue - prev) > 100 ? 27 : 17;
                return Math.min(prev + increment, finalValue);
            });
        }, 30); // Swift: 0.03s = 30ms
        return () => clearInterval(interval);
    }, []);

    // --- REVIEW TICKER ANIMATION (Matching Swift slide-up) ---
    useEffect(() => {
        const interval = setInterval(() => {
            setIsAnimatingReview(true);
            
            // Wait for animation to finish (0.6s) then swap text and reset
            setTimeout(() => {
                setReviewIndex(prev => (prev + 1) % reviews.length);
                setIsAnimatingReview(false);
            }, 600); // Matches CSS animation duration
            
        }, 3000); // Swift: 3.0s
        return () => clearInterval(interval);
    }, []);

    // Helper for formatting review text
    const getFormattedReview = (index: number) => {
        const r = reviews[index];
        return (
            <span className="text-center w-full block px-4 truncate">
                <span className="italic text-[15px] font-normal text-appTextPrimary/80">“{r.text}”</span>
                <span className="text-[15px] font-bold text-appTextPrimary/80 ml-2">– {r.author}</span>
            </span>
        );
    };

    return (
        <div className="relative h-screen w-full flex flex-col items-center overflow-hidden">
            
            {/* --- BUTTERFLIES BEHIND (Layer 0) --- */}
            <div className="butterfly-container butterfly-layer-behind">
                {butterfliesBehind.map((b) => (
                    <div key={b.id} className="butterfly"
                        style={{ 
                            left: b.left, animationName: 'float-path', animationDuration: b.duration, animationDelay: b.delay,
                            width: b.size, height: b.size, color: b.color, '--bf-opacity': 0.2 // Swift: behind alpha 0.2
                        } as React.CSSProperties} />
                ))}
            </div>

            {/* --- MAIN CONTENT STACK (Layer 1) --- */}
            {/* Swift: centerY - 60, centered horizontally */}
            <div className="z-10 flex flex-col items-center w-full px-8 mt-[10vh] md:mt-[15vh]">
                
                {/* Logo */}
                <div className="relative w-[70px] h-[70px] mb-6 shadow-xl rounded-2xl overflow-hidden">
                     <Image src="/icon.png" alt="Logo" fill className="object-cover" />
                </div>

                {/* Headline */}
                <h1 className="text-[32px] leading-tight font-bold text-appTextPrimary text-center mb-3">
                    Strength & Confidence<br/>From Your Core Outward.
                </h1>

                {/* Subheadline */}
                <p className="text-[17px] text-appTextSecondary text-center mb-10 max-w-xs">
                    Your personal AI physio-coach for leaks, pain, and confidence.
                </p>

                {/* Benefits StackView */}
                <div className="flex flex-col items-start space-y-[18px] w-full max-w-[340px]">
                    {[
                        { icon: Icons.run, text: "A new 5-minute plan, just for you, every day." },
                        { icon: Icons.videos, text: "300+ physio-approved videos for total wellness." },
                        { icon: Icons.chat, text: "Chat with your AI Coach, Mia™, 24/7." }
                    ].map((item, i) => (
                        <div key={i} className="flex flex-row items-center space-x-[14px]">
                            {/* Icon container fixed width 28px */}
                            <div className="w-[28px] flex-shrink-0 text-appPrimaryAccent">
                                {item.icon}
                            </div>
                            <span className="text-[16px] font-medium text-appTextPrimary leading-snug">
                                {item.text}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- BUTTERFLIES FRONT (Layer 2 - Below CTA) --- */}
            <div className="butterfly-container butterfly-layer-front pointer-events-none">
                {butterfliesFront.map((b) => (
                    <div key={b.id} className="butterfly"
                        style={{ 
                            left: b.left, animationName: 'float-path', animationDuration: b.duration, animationDelay: b.delay,
                            width: b.size, height: b.size, color: b.color, '--bf-opacity': b.opacity
                        } as React.CSSProperties} />
                ))}
            </div>

            {/* --- BOTTOM SECTION --- */}
            <div className="absolute bottom-0 w-full px-10 pb-5 z-30 flex flex-col items-center">
                
                {/* Review Ticker Container */}
                {/* Swift: 40px height, above CTA */}
                <div className="h-[40px] w-full overflow-hidden relative mb-10">
                    <div className={`absolute w-full h-full flex flex-col ${isAnimatingReview ? 'ticker-slide-up' : ''}`}>
                        {/* Current Review */}
                        <div className="h-[40px] flex items-center justify-center">
                            {getFormattedReview(reviewIndex)}
                        </div>
                        {/* Next Review */}
                        <div className="h-[40px] flex items-center justify-center">
                            {getFormattedReview((reviewIndex + 1) % reviews.length)}
                        </div>
                    </div>
                </div>

                {/* CTA Button */}
                <button 
                    onClick={nextStep}
                    className="w-full h-[56px] bg-appPrimaryAccent text-white text-[18px] font-bold rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.25)] breathing-button active:scale-95 transition-transform mb-4"
                >
                    Start My 5-Min Journey
                </button>

                {/* Social Proof Label */}
                <p className="text-[15px] text-appTextSecondary text-center">
                    Join {socialCount.toLocaleString()}+ members finding confidence.
                </p>
            </div>

        </div>
    );
}
