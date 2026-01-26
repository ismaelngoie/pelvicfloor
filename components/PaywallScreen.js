"use client";
import React, { useState, useEffect } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { Lock, Star, Check, ShieldCheck } from 'lucide-react';

// --- 1. CONFIGURATION: GOAL-SPECIFIC COPY ---
// This ensures every screen feels "Made just for them"
const PAYWALL_COPY = {
  "Improve Intimacy": {
    headline: "Transform Your Intimacy",
    subhead: "Unlock confidence, comfort, and sensation.",
    features: [
      "Pelvic floor relaxation techniques",
      "Blood flow boosting routines",
      "Control & endurance training",
      "Confidence-building meditations",
      "Daily 5-min intimate health plan"
    ],
    cta: "Start My Intimacy Plan"
  },
  "Stop Bladder Leaks": {
    headline: "Live Leak-Free",
    subhead: "Stop worrying about sneezes, laughs, or runs.",
    features: [
      "Urge-suppression techniques",
      "Fast-twitch reflex training",
      "Sphincter strengthening control",
      "Safe core exercises",
      "Daily 5-min dry-day routines"
    ],
    cta: "Start My Leak-Free Plan"
  },
  "Prepare for Pregnancy": {
    headline: "Prepare Your Body",
    subhead: "Build a strong foundation for you and baby.",
    features: [
      "Deep core stability for bump support",
      "Pelvic floor relaxation for labor",
      "Back pain prevention routines",
      "Breathing for stress reduction",
      "Daily 5-min pregnancy-safe plan"
    ],
    cta: "Start My Pregnancy Plan"
  },
  "Recover Postpartum": {
    headline: "Heal Your Core",
    subhead: "Reconnect with your body safely and effectively.",
    features: [
      "Diastasis recti safe healing",
      "Gentle pelvic floor restoration",
      "C-section scar mobility",
      "Posture correction for nursing",
      "Daily 5-min recovery routines"
    ],
    cta: "Start My Recovery Plan"
  },
  "Build Core Strength": {
    headline: "Sculpt & Strengthen",
    subhead: "Build a deep, functional core that looks and feels great.",
    features: [
      "Deep transverse ab activation",
      "Waist-cinching vacuum breath",
      "Lower back protection",
      "Posture-improving stability",
      "Daily 5-min power routines"
    ],
    cta: "Start My Strength Plan"
  },
  "Ease Pelvic Pain": {
    headline: "Relieve Pelvic Pain",
    subhead: "Gentle movement to soothe tension and restore comfort.",
    features: [
      "Trigger point release techniques",
      "Nervous system down-regulation",
      "Hip opening mobility flows",
      "Strengthening for support",
      "Daily 5-min pain-relief plan"
    ],
    cta: "Start My Relief Plan"
  },
  "Support My Fitness": {
    headline: "Power Your Performance",
    subhead: "The stability foundation every athlete needs.",
    features: [
      "Core bracing for heavy lifts",
      "Stability for running efficiency",
      "Injury prevention protocols",
      "Active recovery flows",
      "Daily 5-min athletic core plan"
    ],
    cta: "Start My Fitness Plan"
  },
  "Boost Stability": {
    headline: "Stand Tall & Steady",
    subhead: "Effortless posture and balance for daily life.",
    features: [
      "Deep stabilizer activation",
      "Balance challenges",
      "Alignment correction",
      "Fall prevention techniques",
      "Daily 5-min stability plan"
    ],
    cta: "Start My Stability Plan"
  },
  // Fallback
  "default": {
    headline: "Unlock Your Potential",
    subhead: "Your personal path to a stronger, healthier you.",
    features: [
      "AI coach that adapts daily",
      "Personalized 5-min routines",
      "300+ physio-approved videos",
      "Progress tracking & insights",
      "Daily motivation & support"
    ],
    cta: "Start My Personal Plan"
  }
};

// --- DATA: Reviews ---
const reviews = [
  { name: "Emily D.", text: "Week 1 I laughed and stayed dry.", stars: 5 },
  { name: "Dana A.", text: "Pads live in a drawer now.", stars: 5 },
  { name: "Hannah L.", text: "I jogged today and felt totally safe.", stars: 5 },
  { name: "Sarah M.", text: "Finally pain-free after 3 years.", stars: 5 },
];

export default function PaywallScreen({ onBack }) {
  const { userDetails } = useUserData();
  const [currentReview, setCurrentReview] = useState(0);

  // Get Custom Copy based on Goal
  const goalKey = userDetails?.selectedTarget?.title || "default";
  const content = PAYWALL_COPY[goalKey] || PAYWALL_COPY["default"];

  // Rotate Reviews
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentReview((prev) => (prev + 1) % reviews.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-[100dvh] flex flex-col overflow-hidden bg-black">
      
      {/* 1. Video Background */}
      <div className="absolute inset-0 z-0">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-cover opacity-80"
        >
          {/* Ensure this file exists in your public folder */}
          <source src="/paywall_video.mp4" type="video/mp4" />
        </video>
        {/* Gradients for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90" />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* 2. Main Content - Optimized for One Screen (Vertical Flex) */}
      <div 
        className="z-10 flex-1 flex flex-col justify-between px-6 w-full max-w-md mx-auto"
        style={{ 
          paddingTop: 'calc(env(safe-area-inset-top) + 20px)', 
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' 
        }}
      >
        
        {/* A. Header Section */}
        <div className="text-center mt-2">
          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 mb-3 animate-fade-in">
            <ShieldCheck size={14} className="text-[#E65473]" />
            <span className="text-[11px] font-bold text-white uppercase tracking-wide">Physio Approved</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white leading-tight drop-shadow-lg mb-2">
            {content.headline}
          </h1>
          <p className="text-white/80 text-[15px] font-medium leading-snug px-2">
            {content.subhead}
          </p>
        </div>

        {/* B. Features List (Centered) */}
        <div className="my-auto w-full">
          <div className="bg-white/10 backdrop-blur-xl rounded-[24px] border border-white/10 p-5 shadow-2xl">
            <div className="space-y-3.5">
              {content.features.map((feature, idx) => (
                <FeatureRow key={idx} text={feature} delay={idx * 100} />
              ))}
            </div>
          </div>
        </div>

        {/* C. Social Proof (Compact) */}
        <div className="mb-4">
          <div className="flex flex-col items-center">
            {/* Stars */}
            <div className="flex text-[#FFD700] gap-0.5 mb-2">
              {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
            </div>
            
            {/* Review Slider */}
            <div className="h-10 w-full relative overflow-hidden">
               {reviews.map((review, idx) => (
                 <div 
                   key={idx}
                   className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-in-out"
                   style={{ 
                     opacity: idx === currentReview ? 1 : 0,
                     transform: `translateY(${idx === currentReview ? 0 : 20}px)`
                   }}
                 >
                   <p className="text-white/95 text-[14px] font-medium text-center italic leading-tight">
                     "{review.text}"
                   </p>
                   <p className="text-white/60 text-[11px] font-bold mt-0.5">{review.name}</p>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* D. Sticky Footer (CTA) */}
        <div className="mb-2">
          <button 
            className="w-full h-14 bg-gradient-to-r from-[#E65473] to-[#C23A5B] text-white font-bold text-[17px] rounded-full shadow-[0_0_30px_rgba(230,84,115,0.4)] flex items-center justify-center gap-2 animate-breathe active:scale-95 transition-transform"
            onClick={() => {
              // This is where you would trigger IAP
              alert("Integrating StoreKit / Stripe...");
            }}
          >
            <Lock size={18} /> {content.cta}
          </button>
          
          <div className="flex justify-center gap-4 mt-3 text-[10px] text-white/40 font-medium tracking-wide">
            <button className="hover:text-white transition-colors">Restore</button>
            <span>•</span>
            <button className="hover:text-white transition-colors">Terms</button>
            <span>•</span>
            <button className="hover:text-white transition-colors">Privacy</button>
          </div>
          <p className="text-center text-white/30 text-[9px] mt-1.5">
            Secured with Apple. Cancel anytime.
          </p>
        </div>

      </div>
    </div>
  );
}

// Helper Component for Feature Rows
const FeatureRow = ({ text, delay }) => (
  <div 
    className="flex items-start gap-3 animate-in slide-in-from-bottom-2 fade-in duration-700"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="bg-[#E65473] p-[3px] rounded-full mt-0.5 shrink-0 shadow-lg shadow-pink-500/20">
      <Check size={10} strokeWidth={4} className="text-white" />
    </div>
    <span className="text-white/95 text-[15px] font-medium leading-snug shadow-black/10 drop-shadow-sm">{text}</span>
  </div>
);
