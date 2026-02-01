"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserData } from '@/context/UserDataContext';

// --- CUSTOM ICONS ---
const RunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-app-primary">
    <path d="M13.5 2c-1.1 0-2 .9-2 2s.9 2 2 2c1.11 0 2-.89 2-2s-.89-2-2-2zM19 6c0-1.66-1.34-3-3-3-1.25 0-2.3.8-2.77 1.91l-1.92 4.47-2.6-1.29.62-3.09c-.93-.25-1.91.13-2.42.92l-2.09 3.27c-.49.77-.28 1.8.49 2.29.77.49 1.8.28 2.29-.49l1.1-1.72.33 1.57L5 12v6c0 1.1.9 2 2 2s2-.9 2-2v-4.18l2.12.91 2.38 5.95c.33.83 1.28 1.24 2.11.91.83-.33 1.24-1.28.91-2.11L14.77 13l1.86-.92c.76-.38 1.37-1.34 1.37-2.18V6h1z" />
  </svg>
);

const VideoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-app-primary">
    <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z" />
  </svg>
);

const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-app-primary">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
  </svg>
);

// --- DATA ---
const reviews = [
  { text: "Zero leaks by week 2. I cried happy tears.", author: "Emily, 39" },
  { text: "Sneezed today. No panic. I’m free.", author: "Dana, 46" },
  { text: "More sensation, less worry, more us.", author: "Jess, 35" },
  { text: "Pain-free sitting. Sleep through the night.", author: "Olivia, 41" },
  { text: "From wobbly to steady, lifting my baby feels safe.", author: "Mia, 33" },
];

// --- FULL SCREEN BUTTERFLY BACKGROUND ---
const ButterflyBackground = () => {
  const [butterflies, setButterflies] = useState([]);

  useEffect(() => {
    // Generate 25 butterflies with NEGATIVE delays so they are already flying
    const count = 25;
    const items = Array.from({ length: count }).map((_, i) => {
      const duration = 15 + Math.random() * 15; // Slow, graceful (15-30s)
      return {
        id: i,
        left: Math.random() * 100, // 0-100% screen width
        size: 20 + Math.random() * 30, // 20px - 50px
        duration: duration,
        // Negative delay = Start mid-animation
        delay: -(Math.random() * duration), 
        rotation: (Math.random() - 0.5) * 60, // Tilt
        isBehind: Math.random() > 0.6 // 40% are behind elements
      };
    });
    setButterflies(items);
  }, []);

  // Filter to force Brand Pink (#E65473)
  const brandPinkFilter = 'brightness(0) saturate(100%) invert(48%) sepia(91%) saturate(343%) hue-rotate(304deg) brightness(91%) contrast(96%)';

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <style jsx>{`
        @keyframes floatUp {
          0% { transform: translateY(110vh) translateX(0px) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-20vh) translateX(50px) rotate(20deg); opacity: 0; }
        }
      `}</style>
      
      {butterflies.map((b) => (
        <div
          key={b.id}
          className="absolute"
          style={{
            left: `${b.left}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            top: '0', 
            animation: `floatUp ${b.duration}s linear infinite`,
            animationDelay: `${b.delay}s`,
            opacity: b.isBehind ? 0.3 : 0.7, 
            filter: brandPinkFilter,
            transform: `rotate(${b.rotation}deg)`,
            zIndex: b.isBehind ? 0 : 50 
          }}
        >
          <img 
            src="/butterfly_template.png" 
            alt="" 
            className="w-full h-full object-contain" 
          />
        </div>
      ))}
    </div>
  );
};

export default function WelcomeScreen({ onNext }) {
  const router = useRouter();
  const { userDetails } = useUserData();
  
  const [socialProofCount, setSocialProofCount] = useState(9800);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showContent, setShowContent] = useState(false);

  // --- 1. INSTANT REDIRECT CHECK (SPEED OPTIMIZED) ---
  useEffect(() => {
    // A: Check LocalStorage DIRECTLY (Faster than waiting for Context)
    // We look for the raw JSON string saved by useUserData
    if (typeof window !== 'undefined') {
      try {
        const storedData = localStorage.getItem('pelvic_user_data');
        if (storedData) {
          const parsed = JSON.parse(storedData);
          // If 'isPremium' is true (whether from payment or restore), go to dashboard
          if (parsed.isPremium === true) {
            router.replace('/dashboard');
            return; // Stop execution so we don't show content
          }
        }
      } catch (e) {
        // Ignore parsing errors, fall through to normal flow
      }
    }

    // B: Fallback Context Check (in case localStorage check failed or is empty)
    if (userDetails && userDetails.isPremium) {
      router.replace('/dashboard');
    } else {
      // Only show content if we are certain they are NOT premium
      // Small delay ensures the redirect happens before fade-in if they are premium
      const timer = setTimeout(() => setShowContent(true), 50); 
      return () => clearTimeout(timer);
    }
  }, [userDetails, router]);

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

  // While checking status, render nothing (or a white screen) to prevent flash
  // We only render content once showContent is true
  if (!showContent && (userDetails?.isPremium)) return null;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between pb-8 bg-gradient-to-b from-pink-50/50 to-white overflow-hidden">
      
      {/* --- INSTANT FLYING BUTTERFLIES --- */}
      <ButterflyBackground />

      {/* Main Content (z-10 to stay above background but allow butterflies to fly over if z=50) */}
      <div className={`z-10 flex flex-col items-center px-6 pt-16 w-full transition-all duration-1000 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* Logo */}
        <div className="mb-6">
           <img src="/logo.png" width={80} height={80} alt="Logo" className="object-contain" />
        </div>

        <h1 className="text-[28px] font-extrabold text-app-textPrimary text-center mb-3 leading-tight">
  Pelvic Floor Strengthening<br/>
  <span className="text-[24px]">5-Minute Daily Home Plan</span>
</h1>

        <p className="text-app-textSecondary text-center mb-8 text-[16px] max-w-xs leading-relaxed">
  Stop bladder leaks, heal prolapse, and improve intimacy.
</p>

        {/* Benefits List */}
        <div className="flex flex-col gap-6 w-full max-w-xs items-start pl-2 bg-white/40 backdrop-blur-sm p-4 rounded-2xl border border-white/50 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="shrink-0 pt-1"><RunIcon /></div>
            <span className="text-app-textPrimary font-semibold text-[16px] leading-snug">A new 5-minute plan, just for you, every day.</span>
          </div>
          <div className="flex items-start gap-4">
            <div className="shrink-0 pt-1"><VideoIcon /></div>
            <span className="text-app-textPrimary font-semibold text-[16px] leading-snug">300+ physio-approved videos for total wellness.</span>
          </div>
          <div className="flex items-start gap-4">
            <div className="shrink-0 pt-1"><ChatIcon /></div>
            <span className="text-app-textPrimary font-semibold text-[16px] leading-snug">Chat with your AI Coach, Mia™, 24/7.</span>
          </div>
        </div>
      </div>

      {/* Bottom Stack */}
      <div className={`w-full px-8 flex flex-col gap-4 items-center z-30 transition-all duration-1000 delay-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        
        {/* Review Ticker */}
        <div className="h-14 overflow-hidden w-full relative">
          {reviews.map((review, index) => (
            <div 
              key={index}
              className={`absolute w-full text-center transition-all duration-500 ease-out flex flex-col items-center justify-center h-full`}
              style={{
                transform: `translateY(${(index - currentReviewIndex) * 100}%)`,
                opacity: index === currentReviewIndex ? 1 : 0
              }}
            >
              <p className="text-[15px] text-app-textPrimary/90 italic leading-snug">
                “{review.text}” <br/><span className="font-bold not-italic text-sm text-app-textPrimary">– {review.author}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Button */}
        <button 
          onClick={onNext}
          className="w-full h-14 bg-app-primary text-white font-bold text-lg rounded-full shadow-xl shadow-app-primary/30 animate-breathe active:scale-95 transition-transform relative z-40"
        >
          Start Strengthening My Pelvic Floor
        </button>

        <p className="text-app-textSecondary text-[13px] font-medium">
          Join {socialProofCount.toLocaleString()}+ women strengthening their pelvic floor.
        </p>
      </div>
    </div>
  );
}
