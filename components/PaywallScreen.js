"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { Lock, Star, Check, ChevronDown, Activity, Play, Brain, Timer } from 'lucide-react';

// --- DATA: Exact Swift Port of Reviews ---
const getReviewsForGoal = (goalTitle) => {
  const goal = (goalTitle || "").toLowerCase();
  
  const pack = (names, texts) => {
    return names.map((name, i) => ({
      name,
      text: texts[i],
      image: "/coachMiaAvatar.png" // Placeholder as requested
    }));
  };

  if (goal.includes("leaks") || goal.includes("bladder")) {
    return pack(
      ["Emily D.", "Dana A.", "Hannah L.", "Priya S.", "Zoe M."],
      ["Week 1 I laughed and stayed dry", "Pads live in a drawer now", "I jogged today and stayed dry", "Bathroom maps deleted I feel free", "My bladder finally listens to me"]
    );
  }
  if (goal.includes("pain") || goal.includes("discomfort")) {
    return pack(
      ["Laura P.", "Ana R.", "Katie B.", "Mia K.", "Jen C."],
      ["Meetings passed without that deep ache", "I enjoyed intimacy without flinching", "Gentle moves gave real relief", "I woke up calm not burning", "I lifted my toddler without bracing"]
    );
  }
  if (goal.includes("postpartum") || goal.includes("recover")) {
    return pack(
      ["Sarah W.", "Michelle T.", "Chloe N.", "Olivia G.", "Jess P."],
      ["Week 2 stronger steadier with baby", "My core feels connected again", "From leaks to laughter with my baby", "Recovery finally makes sense", "Five minutes I actually keep"]
    );
  }
  if (goal.includes("pregnancy") || goal.includes("prepare")) {
    return pack(
      ["Kara D.", "Ivy S.", "Bella R.", "Nora P.", "June K."],
      ["Breath is calm belly supported", "Hips opened and sleep returned", "Week 2 my core feels ready", "Movements finally feel safe", "I feel ready for our baby"]
    );
  }
  if (goal.includes("intimacy") || goal.includes("sexual")) {
    return pack(
      ["Maya S.", "Dani R.", "Lina H.", "Brooke E.", "Kim W."],
      ["More sensation and less worry", "Bedroom confidence is back", "Stronger connection with my partner", "I actually look forward to intimacy", "Orgasms came without fear"]
    );
  }
  if (goal.includes("strength") || goal.includes("fitness")) {
    return pack(
      ["Sam P.", "Helena R.", "Jules M.", "Tess K.", "Ana L."],
      ["Runs feel springy and sure", "Deadlifts steady no pinch", "Balance finally clicked in yoga", "Core fired my pace improved", "Recovery better workouts stick"]
    );
  }
  
  // Default Fallback
  return pack(
    ["Olivia G.", "Emily D.", "Sarah W.", "Emily J.", "Dana A."],
    ["This finally felt made for me", "Small wins in days I smiled", "Five minutes gave real change", "Pain eased and I breathed", "Confidence returned I feel in control"]
  );
};

const FEATURES = [
  { icon: <Brain size={32} className="text-rose-500" />, text: "AI coach that adapts daily" },
  { icon: <Timer size={32} className="text-rose-500" />, text: "5-minute personalized routines" },
  { icon: <Play size={32} className="text-rose-500" />, text: "300+ physio-approved videos" },
  { icon: <Activity size={32} className="text-rose-500" />, text: "Trackable progress & streaks" }
];

export default function PaywallScreen({ onBack }) {
  const { userDetails } = useUserData();
  
  // --- STATE ---
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [userCount, setUserCount] = useState(9800);
  const [showContent, setShowContent] = useState(false);
  
  // --- HYDRATION FIX: Initialize date only on client ---
  const [dateString, setDateString] = useState(""); 

  // --- DERIVED DATA ---
  const goalTitle = userDetails?.selectedTarget?.title || "Build Core Strength";
  const userName = userDetails?.name || "Ready";
  const reviews = useMemo(() => getReviewsForGoal(goalTitle), [goalTitle]);

  // --- EFFECTS ---

  // 1. Client-side Date Calculation (Fixes the Application Error)
  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    setDateString(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    
    // Trigger entrance animation
    setTimeout(() => setShowContent(true), 100);
  }, []);

  // 2. Feature Carousel Timer (4 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeatureIndex((prev) => (prev + 1) % FEATURES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // 3. Review Rotation Timer (5 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentReviewIndex((prev) => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [reviews]);

  // 4. User Count Animation
  useEffect(() => {
    if (!showContent) return;
    let start = 9800;
    const end = 10200;
    const timer = setInterval(() => {
      start += 5;
      if (start >= end) {
        setUserCount(end);
        clearInterval(timer);
      } else {
        setUserCount(start);
      }
    }, 20);
    return () => clearInterval(timer);
  }, [showContent]);

  // --- HELPER: CTA Text Logic ---
  const getCtaSubtext = () => {
    if (!dateString) return ""; // Prevent flash of unformatted text
    const g = goalTitle.toLowerCase();
    const priceText = "$24.99/mo";
    
    if (g.includes("intimacy")) return `Feel more sensation and easier orgasms by ${dateString}. If not, one tap full ${priceText} refund.`;
    if (g.includes("leak")) return `Fewer leaks when you cough laugh or run by ${dateString}. If not, one tap full ${priceText} refund.`;
    if (g.includes("pain")) return `Less pelvic tension and easier sitting by ${dateString}. If not, one tap full ${priceText} refund.`;
    if (g.includes("postpartum")) return `A steadier core and easier carries by ${dateString}. If not, one tap full ${priceText} refund.`;
    if (g.includes("pregnancy")) return `Calmer breath and better pelvic control by ${dateString}. If not, one tap full ${priceText} refund.`;
    if (g.includes("fitness")) return `More stable lifts and less strain by ${dateString}. If not, one tap full ${priceText} refund.`;
    
    return `Feel real progress by ${dateString}. If not, one tap full ${priceText} refund.`;
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-black overflow-hidden">
      
      {/* 1. Video Background */}
      <div className="absolute inset-0 z-0">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-cover opacity-60"
        >
          <source src="/paywall_video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* 2. Scrollable Content */}
      <div className={`z-10 flex-1 flex flex-col overflow-y-auto no-scrollbar pt-12 pb-32 px-6 transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        
        {/* Headline */}
        <h1 className="text-[32px] font-extrabold text-white text-center mb-6 leading-tight drop-shadow-lg">
          <span className="text-white">{userName === "Ready" ? "Ready to" : `${userName}, ready to`}</span><br/>
          <span className="capitalize text-rose-500">{goalTitle.replace('Stop ', '').replace('Build ', '')}</span>?
          <span className="block text-[32px] text-white mt-1">100% Money-Back Guarantee.</span>
        </h1>

        {/* Feature Showcase Card (Animated) */}
        <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-[24px] overflow-hidden mb-6 flex flex-col items-center">
          
          <div className="pt-4 pb-1">
            <h3 className="text-[16px] font-bold text-white text-center">Your Personalized Plan Includes:</h3>
          </div>

          {/* Animated Features */}
          <div className="relative w-full h-[120px] flex items-center justify-center">
            {FEATURES.map((feature, index) => {
              const isActive = index === activeFeatureIndex;
              return (
                <div 
                  key={index}
                  className={`absolute w-full flex flex-col items-center gap-3 transition-all duration-500 ease-out px-4 text-center ${isActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}
                >
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                    {feature.icon}
                  </div>
                  <span className="text-[16px] font-semibold text-white leading-tight">{feature.text}</span>
                </div>
              );
            })}
          </div>

          {/* Progress Bars */}
          <div className="w-full px-6 pb-5 flex gap-1.5 h-1.5">
            {FEATURES.map((_, i) => (
              <div key={i} className="h-full flex-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-white rounded-full transition-all ease-linear ${i === activeFeatureIndex ? 'duration-[4000ms] w-full' : 'duration-300 w-0'}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Social Proof */}
        <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-[24px] p-5 flex flex-col items-center gap-3 mb-6">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[20px] font-bold text-white">4.9</span>
            <div className="flex text-yellow-400 gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
            </div>
            <span className="text-[11px] font-medium text-white/70 uppercase tracking-wide">App Store Rating</span>
          </div>

          <div className="w-full min-h-[70px] flex items-center justify-center relative">
             {reviews.map((review, idx) => (
               <div 
                 key={idx} 
                 className={`absolute w-full flex flex-col items-center transition-all duration-500 ${idx === currentReviewIndex ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}
               >
                 <div className="flex flex-col items-center gap-2">
                    <img src={review.image} className="w-8 h-8 rounded-full border border-white/50" alt="" />
                    <p className="text-[14px] italic text-white/90 text-center">"{review.text}"</p>
                    <p className="text-[12px] font-bold text-white">{review.name}</p>
                 </div>
               </div>
             ))}
          </div>

          <p className="text-[13px] text-white/60 text-center mt-2">
            Join <span className="font-bold text-white">{userCount.toLocaleString()}+ women</span> feeling strong.
          </p>
        </div>

        {/* FAQ & Legal */}
        <div className="flex flex-col gap-4 mb-8">
           <div className="w-full bg-white/5 rounded-xl p-4 border border-white/5">
              <div className="flex items-center justify-center gap-2 text-white/90">
                 <span className="text-[14px] font-semibold">How do I get my money back?</span>
                 <ChevronDown size={14} className="text-white/60" />
              </div>
              <p className="text-[13px] text-white/60 text-center mt-2 leading-relaxed">
                Tap “Refund” in Settings → “Billing” → Done.
              </p>
           </div>
           
           <div className="flex justify-between px-6 text-[11px] font-medium text-white/40">
              <button>Restore Purchase</button>
              <button>Terms of Use</button>
              <button>Privacy Policy</button>
           </div>
        </div>
      </div>

      {/* 3. Sticky Footer CTA */}
      <div className={`absolute bottom-0 left-0 w-full z-20 px-6 pb-8 pt-6 bg-gradient-to-t from-black via-black/95 to-transparent transition-all duration-700 delay-300 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <button 
          onClick={() => alert("Redirect to Stripe")}
          className="w-full h-[58px] rounded-full shadow-[0_0_20px_rgba(225,29,72,0.4)] flex items-center justify-center gap-2 animate-breathe active:scale-95 transition-transform relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-rose-500 to-purple-600 transition-all group-hover:scale-105" />
          <div className="relative flex items-center gap-2">
             <Lock size={20} className="text-white" /> 
             <span className="text-[18px] font-bold text-white">Start My {goalTitle.split(' ').slice(-2).join(' ')} Plan</span>
          </div>
        </button>

        <p className="text-center text-white/50 text-[12px] font-medium mt-3 leading-snug px-4">
          {getCtaSubtext()}
        </p>
      </div>

    </div>
  );
}
