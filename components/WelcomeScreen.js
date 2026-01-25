"use client";
import React, { useEffect, useState } from 'react';
import Image from 'next/image';

// Mapped from your Swift 'userReviews'
const reviews = [
  { text: "Zero leaks by week 2. I cried happy tears.", author: "Emily, 39" },
  { text: "Sneezed today. No panic. I’m free.", author: "Dana, 46" },
  { text: "More sensation, less worry, more us.", author: "Jess, 35" },
  { text: "Pain-free sitting. Sleep through the night.", author: "Olivia, 41" },
  { text: "From wobbly to steady, lifting my baby feels safe.", author: "Mia, 33" },
];

const Butterfly = ({ isBehind, delay }) => {
  const startX = Math.random() * 90; // Random X position
  const duration = 10 + Math.random() * 5; 
  
  return (
    <div 
      className={`absolute pointer-events-none ${isBehind ? 'z-0 opacity-40' : 'z-20 opacity-80'}`}
      style={{
        left: `${startX}%`,
        bottom: '-60px',
        animation: `float ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`
      }}
    >
      {/* Use your actual butterfly image here */}
      <img src="/butterfly_template.png" width={40} height={40} alt="" className="text-app-primary" />
    </div>
  );
};

export default function WelcomeScreen({ onNext }) {
  const [socialProofCount, setSocialProofCount] = useState(9800);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => { setTimeout(() => setShowContent(true), 100); }, []);

  // Social Proof Counter
  useEffect(() => {
    if (!showContent) return;
    const finalValue = 10200;
    const duration = 2000; 
    const steps = 60;
    const increment = (finalValue - 9800) / steps;
    let current = 9800;
    const timer = setInterval(() => {
      current += increment;
      if (current >= finalValue) {
        setSocialProofCount(finalValue);
        clearInterval(timer);
      } else {
        setSocialProofCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [showContent]);

  // Review Ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentReviewIndex((prev) => (prev + 1) % reviews.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between pb-8">
      {/* Butterflies */}
      <Butterfly isBehind={true} delay={0} />
      <Butterfly isBehind={true} delay={2} />
      <Butterfly isBehind={false} delay={1} />
      <Butterfly isBehind={false} delay={4} />

      {/* Main Content */}
      <div className={`z-10 flex flex-col items-center px-6 pt-20 w-full transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* Logo */}
        <div className="mb-8">
           <img src="/logo.png" width={80} height={80} alt="Logo" className="object-contain" />
        </div>

        <h1 className="text-3xl font-bold text-app-textPrimary text-center mb-4 leading-tight">
          Strength & Confidence<br/>From Your Core Outward.
        </h1>

        <p className="text-app-textSecondary text-center mb-10 text-[16px] max-w-xs">
          Your personal AI physio-coach for leaks, pain, and confidence.
        </p>

        {/* Benefits List */}
        <div className="flex flex-col gap-5 w-full max-w-xs items-start">
          <BenefitRow icon="figure.run" text="A new 5-minute plan, just for you, every day." />
          <BenefitRow icon="play.rectangle" text="300+ physio-approved videos for total wellness." />
          <BenefitRow icon="bubble.left" text="Chat with your AI Coach, Mia™, 24/7." />
        </div>
      </div>

      {/* Bottom Stack */}
      <div className={`w-full px-8 flex flex-col gap-4 items-center z-20 transition-all duration-1000 delay-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* Review Ticker */}
        <div className="h-12 overflow-hidden w-full relative">
          {reviews.map((review, index) => (
            <div 
              key={index}
              className={`absolute w-full text-center transition-all duration-500 ease-out flex flex-col items-center justify-center h-full`}
              style={{
                transform: `translateY(${(index - currentReviewIndex) * 100}%)`,
                opacity: index === currentReviewIndex ? 1 : 0.5
              }}
            >
              <p className="text-[14px] text-app-textPrimary/80 italic">
                “{review.text}” <span className="font-bold not-italic">– {review.author}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Button */}
        <button 
          onClick={onNext}
          className="w-full h-14 bg-app-primary text-white font-bold text-lg rounded-full shadow-lg shadow-app-primary/30 animate-breathe active:scale-95 transition-transform"
        >
          Start My 5-Min Journey
        </button>

        <p className="text-app-textSecondary text-[13px]">
          Join {socialProofCount.toLocaleString()}+ members finding confidence.
        </p>
      </div>
    </div>
  );
}

// Simple Helper for Benefit Rows
function BenefitRow({ icon, text }) {
  // Using SF Symbol equivalents in SVG for web compatibility
  return (
    <div className="flex items-start gap-3">
      {/* Placeholder Icon - You can replace these SVGs with actual icons later */}
      <div className="text-app-primary mt-1 shrink-0">
        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
      </div>
      <span className="text-app-textPrimary font-medium text-[15px] leading-snug">{text}</span>
    </div>
  );
}
