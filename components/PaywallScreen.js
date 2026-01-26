"use client";
import React, { useState } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { Lock, Star, Check } from 'lucide-react';

// --- DATA: Reviews & Copy ---
const reviews = [
  { name: "Emily D.", text: "Week 1 I laughed and stayed dry", image: "/coachMiaAvatar.png" }, // Using avatar as placeholder
  { name: "Dana A.", text: "Pads live in a drawer now", image: "/coachMiaAvatar.png" },
  { name: "Hannah L.", text: "I jogged today and stayed dry", image: "/coachMiaAvatar.png" },
];

export default function PaywallScreen({ onBack }) {
  const { userDetails } = useUserData();
  const [currentReview, setCurrentReview] = useState(0);

  // Rotate Reviews
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentReview((prev) => (prev + 1) % reviews.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const goal = userDetails.selectedTarget?.title || "Core Strength";

  return (
    <div className="relative w-full h-full flex flex-col">
      
      {/* 1. Video Background */}
      <div className="absolute inset-0 z-0">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-cover"
        >
          <source src="/paywall_video.mp4" type="video/mp4" />
        </video>
        {/* Dark Overlay for readability */}
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* 2. Main Content */}
      <div className="z-10 flex-1 flex flex-col px-6 pt-12 pb-8 overflow-y-auto no-scrollbar">
        
        {/* Dynamic Headline */}
        <h1 className="text-3xl font-extrabold text-white text-center mb-6 leading-tight drop-shadow-md">
          <span className="text-app-primary">{userDetails.name || "Ready"}</span>, ready to<br/>
          <span className="capitalize">{goal.replace('Stop ', '').replace('Build ', '')}</span>?
        </h1>

        {/* Features List (Glassmorphism) */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5 mb-6">
          <h3 className="text-white font-bold text-center mb-4 text-[17px]">Your Personalized Plan Includes:</h3>
          <div className="space-y-4">
            <FeatureRow text="AI coach that adapts daily" />
            <FeatureRow text="5-minute personalized routines" />
            <FeatureRow text="300+ physio-approved videos" />
            <FeatureRow text="Trackable progress & streaks" />
          </div>
        </div>

        {/* Social Proof Widget */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-white font-bold text-xl">4.9</span>
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
            </div>
            <span className="text-white/70 text-xs font-medium">App Store Rating</span>
          </div>
          
          {/* Rotating Review */}
          <div className="flex flex-col items-center text-center transition-all duration-500">
             {/* Avatar Placeholder */}
             <div className="w-8 h-8 rounded-full overflow-hidden border border-white mb-2">
               <img src={reviews[currentReview].image} alt="User" className="w-full h-full object-cover" />
             </div>
             <p className="text-white/90 italic text-sm mb-1">"{reviews[currentReview].text}"</p>
             <p className="text-white font-bold text-xs">{reviews[currentReview].name}</p>
          </div>
          
          <p className="text-white/60 text-xs text-center mt-3">Join 10,200+ women feeling strong.</p>
        </div>

        {/* Spacer to push content up on scroll if needed */}
        <div className="flex-1" />

      </div>

      {/* 3. Sticky Footer (CTA) */}
      <div className="z-20 w-full px-6 pb-8 pt-4 bg-gradient-to-t from-black via-black/80 to-transparent">
        <button 
          className="w-full h-14 bg-gradient-to-r from-app-primary to-rose-600 text-white font-bold text-lg rounded-full shadow-lg shadow-app-primary/40 flex items-center justify-center gap-2 animate-breathe active:scale-95 transition-transform"
          onClick={() => alert("Redirect to Stripe/Apple Pay")}
        >
          <Lock size={18} /> Start My {goal.split(' ').slice(-2).join(' ')} Plan
        </button>
        
        <p className="text-center text-white/50 text-xs mt-3 font-medium px-4 leading-relaxed">
          Feel real progress in 7 days. If not, one tap full refund. <br/>
          <span className="underline cursor-pointer">Restore Purchase</span> • <span className="underline cursor-pointer">Terms</span>
        </p>
      </div>

    </div>
  );
}

// Helper Component
const FeatureRow = ({ text }) => (
  <div className="flex items-center gap-3">
    <div className="bg-app-primary/20 p-1 rounded-full text-app-primary">
      <Check size={14} strokeWidth={3} />
    </div>
    <span className="text-white text-[15px] font-medium">{text}</span>
  </div>
);
