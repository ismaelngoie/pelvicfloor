"use client";
import React, { useEffect, useState, useRef } from 'react';
import { PlayCircle, ShieldCheck, MessageCircle } from 'lucide-react'; // Placeholder icons matching SF Symbols

// Mapped from your Swift 'userReviews'
const reviews = [
  { text: "Zero leaks by week 2. I cried happy tears.", author: "Emily, 39" },
  { text: "Sneezed today. No panic. I’m free.", author: "Dana, 46" },
  { text: "More sensation, less worry, more us.", author: "Jess, 35" },
  { text: "Pain-free sitting. Sleep through the night.", author: "Olivia, 41" },
  { text: "From wobbly to steady, lifting my baby feels safe.", author: "Mia, 33" },
];

// Helper for the Butterfly Animation
const Butterfly = ({ isBehind, delay }) => {
  // Randomize starting position similar to Swift implementation
  const startX = Math.random() * 100; // percent
  const duration = 10 + Math.random() * 5; // seconds
  
  return (
    <div 
      className={`absolute pointer-events-none ${isBehind ? 'z-0 opacity-20' : 'z-20 opacity-60'}`}
      style={{
        left: `${startX}%`,
        bottom: '-50px',
        animation: `float ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`
      }}
    >
      {/* CSS Butterfly Shape Placeholder - replace with <img src="/butterfly.png" /> */}
      <div className="text-app-primary">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
           <path d="M12 2C12 2 10 4 8 4C6 4 2 2 2 6C2 10 6 12 8 12C6 12 3 14 3 18C3 22 8 20 12 18C16 20 21 22 21 18C21 14 18 12 16 12C18 12 22 10 22 6C22 2 18 4 16 4C14 4 12 2 12 2Z" />
        </svg>
      </div>
    </div>
  );
};

export default function WelcomeScreen({ onNext }) {
  const [socialProofCount, setSocialProofCount] = useState(9800);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showContent, setShowContent] = useState(false);

  // 1. Element Entry Animation
  useEffect(() => {
    setTimeout(() => setShowContent(true), 100);
  }, []);

  // 2. Social Proof Counter (matches startSocialProofAnimation)
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

  // 3. Review Ticker (matches startReviewTickerAnimation)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentReviewIndex((prev) => (prev + 1) % reviews.length);
    }, 3000); // 3 seconds per review
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-app-background flex flex-col items-center">
      {/* Background Gradient Layer */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-app-primary/10 to-white z-0" />

      {/* Butterflies */}
      <Butterfly isBehind={true} delay={0} />
      <Butterfly isBehind={true} delay={2} />
      <Butterfly isBehind={false} delay={1} />
      <Butterfly isBehind={false} delay={4} />

      {/* Main Content Stack */}
      <div className={`z-10 flex flex-col items-center px-8 pt-16 w-full max-w-md transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* Logo Placeholder */}
        <div className="w-20 h-20 bg-app-primary/20 rounded-full flex items-center justify-center mb-6">
           <span className="text-app-primary font-bold text-xs">LOGO</span>
        </div>

        {/* Headline */}
        <h1 className="text-3xl font-bold text-app-textPrimary text-center mb-3 leading-tight">
          Strength & Confidence<br/>From Your Core Outward.
        </h1>

        {/* Subheadline */}
        <p className="text-app-textSecondary text-center mb-10 text-[17px]">
          Your personal AI physio-coach for leaks, pain, and confidence.
        </p>

        {/* Benefits Stack */}
        <div className="flex flex-col gap-6 w-full items-start pl-4">
          <BenefitRow icon={<PlayCircle size={24}/>} text="A new 5-minute plan, just for you, every day." />
          <BenefitRow icon={<ShieldCheck size={24}/>} text="300+ physio-approved videos for total wellness." />
          <BenefitRow icon={<MessageCircle size={24}/>} text="Chat with your AI Coach, Mia™, 24/7." />
        </div>
      </div>

      {/* Bottom Section (Fixed) */}
      <div className={`absolute bottom-0 w-full px-10 pb-8 flex flex-col gap-4 items-center z-20 max-w-md transition-all duration-1000 delay-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* Review Container with Slide Up Animation */}
        <div className="h-12 overflow-hidden w-full relative mb-2">
          {reviews.map((review, index) => (
            <div 
              key={index}
              className={`absolute w-full text-center transition-all duration-500 ease-out flex flex-col items-center justify-center h-full`}
              style={{
                transform: `translateY(${(index - currentReviewIndex) * 100}%)`,
                opacity: index === currentReviewIndex ? 1 : 0
              }}
            >
              <p className="text-[15px] text-app-textPrimary italic">
                “{review.text}” <span className="font-bold not-italic">– {review.author}</span>
              </p>
            </div>
          ))}
        </div>

        {/* CTA Button with Breathing Animation */}
        <button 
          onClick={onNext}
          className="w-full h-14 bg-app-primary text-white font-bold text-lg rounded-full shadow-lg shadow-app-primary/25 animate-breathe active:scale-95 transition-transform"
        >
          Start My 5-Min Journey
        </button>

        {/* Social Proof */}
        <p className="text-app-textSecondary text-[15px]">
          Join {socialProofCount.toLocaleString()}+ members finding confidence.
        </p>
      </div>
    </div>
  );
}

// Helper Component for the Benefits List
function BenefitRow({ icon, text }) {
  return (
    <div className="flex items-start gap-4">
      <div className="text-app-primary shrink-0 pt-1">
        {icon}
      </div>
      <span className="text-app-textPrimary font-medium text-[16px] leading-snug">
        {text}
      </span>
    </div>
  );
}
