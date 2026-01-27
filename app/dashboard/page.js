"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUserData } from '@/context/UserDataContext';
import { Lock, Star, Check, ChevronDown, Activity, Play, Brain, Timer } from 'lucide-react';

// --- ASSETS: Exact mapping from your Swift code ---
const REVIEW_IMAGES = [
  "/review9.png", 
  "/review1.png", 
  "/review5.png", 
  "/review4.png", 
  "/review2.png"
];

// --- LOGIC: Exact Swift Port of Reviews ---
const getReviewsForGoal = (goalTitle) => {
  const goal = (goalTitle || "").toLowerCase();
  
  // Helper to package data exactly like Swift
  const pack = (names, texts) => {
    return names.map((name, i) => ({
      name,
      text: texts[i],
      image: REVIEW_IMAGES[i % REVIEW_IMAGES.length] // Cycles through your specific pngs
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
  if (goal.includes("stability") || goal.includes("posture")) {
    return pack(
      ["Camille D.", "Erin S.", "Mina J.", "Paige R.", "Ruth N."],
      ["Shoulders dropped I grew taller", "Neck stayed easy all day", "Stairs felt steady and safe", "Desk hours no longer punish", "Week 1 standing feels organized"]
    );
  }
  
  // Default Fallback
  return pack(
    ["Olivia G.", "Emily D.", "Sarah W.", "Emily J.", "Dana A."],
    ["This finally felt made for me", "Small wins in days I smiled", "Five minutes gave real change", "Pain eased and I breathed", "Confidence returned I feel in control"]
  );
};

const FEATURES = [
  { icon: <Brain size={28} className="text-white" />, text: "AI coach that adapts daily" },
  { icon: <Timer size={28} className="text-white" />, text: "5-minute personalized routines" },
  { icon: <Play size={28} className="text-white" fill="white" />, text: "300+ physio-approved videos" },
  { icon: <Activity size={28} className="text-white" />, text: "Trackable progress & streaks" }
];

export default function PaywallScreen() {
  const router = useRouter();
  const { userDetails, saveUserData } = useUserData();
  
  // --- STATE ---
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [userCount, setUserCount] = useState(9800);
  const [showContent, setShowContent] = useState(false);
  const [dateString, setDateString] = useState(""); // Hydration fix

  // --- DERIVED DATA ---
  const goalTitle = userDetails?.selectedTarget?.title || "Build Core Strength";
  const userName = userDetails?.name || "Ready";
  const reviews = useMemo(() => getReviewsForGoal(goalTitle), [goalTitle]);

  // --- EFFECTS ---

  // 1. Initialize Client Data (Fixes Hydration Error)
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

  // --- ACTIONS ---
  const handleUnlock = () => {
    // 1. Save state
    saveUserData('isPremium', true);
    saveUserData('joinDate', new Date().toISOString());
    
    // 2. Navigate to Dashboard
    router.push('/dashboard');
  };

  // --- HELPER: CTA Text Logic ---
  const getCtaSubtext = () => {
    if (!dateString) return ""; 
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
          className="w-full h-full object-cover"
        >
          <source src="/paywall_video.mp4" type="video/mp4" />
        </video>
        {/* Lighter Overlay for better video visibility */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* 2. Scrollable Content */}
      <div className={`z-10 flex-1 flex flex-col overflow-y-auto no-scrollbar pt-12 pb-36 px-6 transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        
        {/* Headline */}
        <h1 className="text-[28px] font-extrabold text-white text-center mb-8 leading-tight drop-shadow-xl">
          <span className="text-white">{userName === "Ready" ? "Ready to" : `${userName}, ready to`}</span><br/>
          <span className="capitalize text-[#E65473]">{goalTitle.replace('Stop ', '').replace('Build ', '')}</span>?
          <span className="block text-[28px] text-white mt-1">100% Money-Back Guarantee.</span>
        </h1>

        {/* Feature Showcase Card (Animated) */}
        <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-[24px] overflow-hidden mb-6 flex flex-col items-center shadow-2xl">
          
          <div className="pt-5 pb-2">
            <h3 className="text-[17px] font-bold text-white text-center drop-shadow-md">Your Personalized Plan Includes:</h3>
          </div>

          {/* Animated Features Area */}
          <div className="relative w-full h-[140px] flex items-center justify-center">
            {FEATURES.map((feature, index) => {
              const isActive = index === activeFeatureIndex;
              return (
                <div 
                  key={index}
                  className={`absolute w-full flex flex-col items-center gap-3 transition-all duration-500 ease-out px-4 text-center ${isActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}
                >
                  <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#E65473] to-[#C23A5B] flex items-center justify-center shadow-lg shadow-rose-500/30">
                    {feature.icon}
                  </div>
                  <span className="text-[17px] font-semibold text-white leading-tight drop-shadow-md">{feature.text}</span>
                </div>
              );
            })}
          </div>

          {/* Progress Bars */}
          <div className="w-full px-6 pb-6 flex gap-1.5 h-1.5">
            {FEATURES.map((_, i) => (
              <div key={i} className="h-full flex-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-white rounded-full transition-all ease-linear ${i === activeFeatureIndex ? 'duration-[4000ms] w-full' : i < activeFeatureIndex ? 'w-full' : 'w-0'}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Social Proof */}
        <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-[24px] p-5 flex flex-col items-center gap-3 mb-6 shadow-xl">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[22px] font-bold text-white">4.9</span>
            <div className="flex text-yellow-400 gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} size={18} fill="currentColor" className="drop-shadow-sm" />)}
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
                    <img 
                      src={review.image} 
                      className="w-10 h-10 rounded-full border-2 border-white/50 object-cover shadow-sm" 
                      alt={review.name} 
                    />
                    <p className="text-[15px] italic text-white/90 text-center font-medium">"{review.text}"</p>
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

      {/* 3. Sticky Footer CTA - More Transparent Gradient */}
      <div className={`absolute bottom-0 left-0 w-full z-30 px-6 pb-8 pt-6 bg-gradient-to-t from-black/90 via-black/70 to-transparent transition-all duration-700 delay-300 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <button 
          onClick={handleUnlock}
          className="w-full h-[58px] rounded-full shadow-[0_0_25px_rgba(225,29,72,0.5)] flex items-center justify-center gap-2 animate-breathe active:scale-95 transition-transform relative overflow-hidden group"
        >
          {/* Gradient Layer */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF3B61] to-[#D959E8] transition-all group-hover:scale-105" />
          
          {/* Content Layer */}
          <div className="relative flex items-center gap-2 z-10">
             <Lock size={20} className="text-white" /> 
             <span className="text-[18px] font-bold text-white">Start My {goalTitle.split(' ').slice(-2).join(' ')} Plan</span>
          </div>
        </button>

        <p className="text-center text-white/60 text-[12px] font-medium mt-3 leading-snug px-4 drop-shadow-sm">
          {getCtaSubtext()}
        </p>
      </div>

    </div>
  );
}
