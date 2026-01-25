"use client";
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Play, MessageSquare, Activity } from 'lucide-react'; // Icons to match SF Symbols
import { useOnboarding } from '@/app/context/OnboardingContext';

// --- DATA ---
const reviews = [
    { text: "Zero leaks by week 2. I cried happy tears.", author: "Emily, 39" },
    { text: "Sneezed today. No panic. I’m free.", author: "Dana, 46" },
    { text: "More sensation, less worry, more us.", author: "Jess, 35" },
    { text: "Pain-free sitting. Sleep through the night. Life feels possible again.", author: "Olivia, 41" },
    { text: "From wobbly to steady, lifting my baby feels safe again.", author: "Mia, 33" },
    { text: "Bathroom maps? Deleted. I go where I want.", author: "Priya, 37" },
];

const benefits = [
    { icon: Activity, text: "A new 5-minute plan, just for you, every day." },
    { icon: Play, text: "300+ physio-approved videos for total wellness." },
    { icon: MessageSquare, text: "Chat with your AI Coach, Mia™, 24/7." }
];

export default function WelcomeStep() {
    const { nextStep } = useOnboarding();
    
    // State
    const [socialCount, setSocialCount] = useState(9800);
    const [reviewIndex, setReviewIndex] = useState(0);
    const [butterflies, setButterflies] = useState<any[]>([]);
    const [isPressed, setIsPressed] = useState(false); // For button shadow animation

    // 1. Social Proof Counter (Matches Timer logic)
    useEffect(() => {
        const interval = setInterval(() => {
            setSocialCount(prev => {
                if (prev >= 10200) {
                    clearInterval(interval);
                    return 10200;
                }
                // Swift logic: increment by 27 if far away, else 17
                const increment = (10200 - prev) > 100 ? 27 : 17;
                return prev + increment;
            });
        }, 30); // 0.03s from Swift code
        return () => clearInterval(interval);
    }, []);

    // 2. Review Ticker (Matches Timer logic)
    useEffect(() => {
        const interval = setInterval(() => {
            setReviewIndex(prev => (prev + 1) % reviews.length);
        }, 3000); // 3.0s from Swift code
        return () => clearInterval(interval);
    }, []);

    // 3. Butterflies
    useEffect(() => {
        const newButterflies = Array.from({ length: 15 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            duration: `${8 + Math.random() * 7}s`, // 8-15s from Swift code
            delay: `${Math.random() * -10}s`,
            size: 25 + Math.random() * 25, // 25-50 size from Swift code
        }));
        setButterflies(newButterflies);
    }, []);

    return (
        <div className="relative h-screen w-full flex flex-col items-center justify-between overflow-hidden bg-appBackground text-appTextPrimary font-sans">
            
            {/* --- BACKGROUND GRADIENT LAYER --- */}
            {/* Swift: SystemPink alpha 0.1 to White, locations 0.0 to 0.5 */}
            <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-[#E65473]/10 to-transparent pointer-events-none z-0" />

            {/* --- BUTTERFLIES --- */}
            <div className="butterfly-container z-0">
                {butterflies.map((b) => (
                    <div 
                        key={b.id} 
                        className="butterfly"
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

            {/* --- MAIN CONTENT STACK --- */}
            {/* Swift: CenterY - 60, Leading/Trailing 32 */}
            <div className="flex-1 flex flex-col items-center justify-center w-full px-[32px] -mt-[60px] z-10">
                
                {/* Logo */}
                {/* Swift: Height 70, Spacing After 24 */}
                <div className="relative w-auto h-[70px] mb-[24px] animate-enter-up" style={{ animationDelay: '0.2s' }}>
                   {/* Replace with your actual logo path */}
                    <Image 
                        src="/logo.png" 
                        alt="Pelvic Floor Coach logo" 
                        width={200} 
                        height={70} 
                        className="h-full w-auto object-contain"
                        priority
                    />
                </div>

                {/* Headline */}
                {/* Swift: Size 32, Bold, Center, Spacing After 12 */}
                <h1 className="text-[32px] font-bold text-center leading-tight text-appTextPrimary mb-[12px] animate-enter-up" style={{ animationDelay: '0.32s' }}>
                    Strength & Confidence<br />From Your Core Outward.
                </h1>

                {/* Subheadline */}
                {/* Swift: Size 17, Regular, Color Secondary, Spacing After 40 */}
                <p className="text-[17px] text-appTextSecondary text-center leading-normal mb-[40px] animate-enter-up" style={{ animationDelay: '0.44s' }}>
                    Your personal AI physio-coach for leaks, pain, and confidence.
                </p>

                {/* Benefits Stack */}
                {/* Swift: Spacing 18, Alignment Leading */}
                <div className="flex flex-col space-y-[18px] w-full items-center animate-enter-up" style={{ animationDelay: '0.56s' }}>
                    {benefits.map((b, i) => (
                        <div key={i} className="flex flex-row items-center space-x-[14px]">
                            {/* Icon: Size 22pt config, Width constrained to 28 */}
                            <div className="w-[28px] flex justify-center text-appPrimaryAccent">
                                <b.icon size={22} strokeWidth={2.5} />
                            </div>
                            {/* Text: Medium, Size 16 */}
                            <span className="text-[16px] font-medium text-appTextPrimary text-left">
                                {b.text}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- BOTTOM STACK --- */}
            {/* ReviewTicker -> CTA -> SocialProof */}
            <div className="w-full px-[40px] pb-[20px] flex flex-col items-center z-10">
                
                {/* Review Ticker */}
                {/* Swift: Spacing to CTA -40, Height 40 */}
                <div className="h-[40px] w-full relative overflow-hidden mb-[40px] animate-enter-up" style={{ animationDelay: '0.68s' }}>
                    <div key={reviewIndex} className="absolute w-full text-center animate-slide-up-ticker">
                        <p className="text-[15px] text-appTextPrimary/80 leading-tight">
                            <span className="italic">“{reviews[reviewIndex].text}”</span>
                            <span className="font-semibold ml-1">– {reviews[reviewIndex].author}</span>
                        </p>
                    </div>
                </div>

                {/* CTA Button */}
                {/* Swift: Height 56, Corner Radius 28, Breathing animation */}
                <button 
                    onClick={nextStep}
                    onMouseDown={() => setIsPressed(true)}
                    onMouseUp={() => setIsPressed(false)}
                    onTouchStart={() => setIsPressed(true)}
                    onTouchEnd={() => setIsPressed(false)}
                    className={`
                        w-full h-[56px] rounded-[28px] bg-appPrimaryAccent text-white 
                        text-[18px] font-bold 
                        transition-all duration-200 animate-breathe animate-enter-up
                        ${isPressed ? 'shadow-cta-pressed scale-[0.98]' : 'shadow-cta'}
                    `}
                    style={{ animationDelay: '0.8s' }}
                >
                    Start My 5-Min Journey
                </button>

                {/* Social Proof Label */}
                {/* Swift: Size 15, Color Secondary, Spacing from bottom 20 */}
                <p className="text-[15px] text-appTextSecondary text-center mt-[16px] animate-enter-up" style={{ animationDelay: '0.92s' }}>
                    Join {socialCount.toLocaleString()}+ members finding confidence.
                </p>
                
                {/* Safe Area Spacer (approximate for web) */}
                <div className="h-[20px] w-full" />
            </div>

            {/* Ticker Animation Style Injection */}
            <style jsx>{`
                @keyframes slideUpTicker {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up-ticker {
                    animation: slideUpTicker 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
            `}</style>
        </div>
    );
}
