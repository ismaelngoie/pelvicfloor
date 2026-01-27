"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { Lock, Star, Check, ChevronDown } from 'lucide-react';

// --- HELPERS: Date Formatting ---
const getFormattedDate = (daysToAdd) => {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// --- DATA: Exact Swift Port of Reviews ---
// Maps the Swift "reviewsForCurrentGoal" logic
const getReviewsForGoal = (goalTitle) => {
  const goal = (goalTitle || "").toLowerCase();
  
  // Helper to package data exactly like Swift
  // Note: Using '/coachMiaAvatar.png' as the image placeholder since we don't have the specific asset files 'review1', etc.
  const pack = (names, texts) => {
    return names.map((name, i) => ({
      name,
      text: texts[i],
      image: "/coachMiaAvatar.png" // Replicating the asset slot
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

// --- DATA: Feature Showcase List ---
const FEATURES = [
  { icon: "brain", text: "AI coach that adapts daily" },
  { icon: "timer", text: "5-minute personalized routines" },
  { icon: "play", text: "300+ physio-approved videos" },
  { icon: "chart", text: "Trackable progress & streaks" }
];

export default function PaywallScreen() {
  const { userDetails } = useUserData();
  
  // --- STATE ---
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [userCount, setUserCount] = useState(9800); // Start slightly lower for count-up
  const [showContent, setShowContent] = useState(false); // For entrance animation

  // --- DERIVED DATA ---
  const goalTitle = userDetails.selectedTarget?.title || "Build Core Strength";
  const userName = userDetails.name || "Ready";
  const reviews = useMemo(() => getReviewsForGoal(goalTitle), [goalTitle]);
  const dateString = getFormattedDate(7); // "Aug 18" style

  // --- EFFECTS ---

  // 1. Entrance Animation
  useEffect(() => {
    setTimeout(() => setShowContent(true), 100);
  }, []);

  // 2. Feature Carousel (4 seconds, matching Swift)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeatureIndex((prev) => (prev + 1) % FEATURES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // 3. Review Rotation (5 seconds, matching Swift)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentReviewIndex((prev) => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [reviews]);

  // 4. Count Up Animation (to 10,200)
  useEffect(() => {
    if (!showContent) return;
    let start = 9800;
    const end = 10200;
    const duration = 1500;
    const increment = (end - start) / (duration / 16); // 60fps approx

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setUserCount(end);
        clearInterval(timer);
      } else {
        setUserCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [showContent]);

  // --- RENDER HELPERS ---

  // Generate CTA Subtext based on Goal (Swift port)
  const getCtaSubtext = () => {
    const g = goalTitle.toLowerCase();
    const priceText = "$24.99/mo"; // Hardcoded for display as in Swift Logic
    
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
        {/* Dimming Layer (Swift: color.black.withAlphaComponent(0.5)) */}
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* 2. Scrollable Content Container */}
      <div className={`z-10 flex-1 flex flex-col overflow-y-auto no-scrollbar pt-12 pb-32 px-6 transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        
        {/* Headline */}
        <h1 className="text-[34px] font-extrabold text-white text-center mb-8 leading-tight drop-shadow-lg">
          <span className="text-white">{userName.replace("Ready", "")}</span>{userName !== "Ready" ? ", ready to" : "Ready to"}<br/>
          <span className="capitalize">{goalTitle.replace('Stop ', '').replace('Build ', '')}</span>?
          <span className="block text-[34px] mt-1">100% Money-Back Guarantee.</span>
        </h1>

        {/* Feature Showcase Card */}
        <div className="w-full bg-white/5 border border-white/10 rounded-[20px] p-0 overflow-hidden mb-6 flex flex-col items-center">
          
          <div className="pt-4 pb-2">
            <h3 className="text-[17px] font-extrabold text-white/90 text-center">Your Personalized Plan Includes:</h3>
          </div>

          {/* Animated Feature Row Area (Height locked to 140px in Swift) */}
          <div className="relative w-full h-[140px] flex items-center justify-center">
            {FEATURES.map((feature, index) => (
              <div 
                key={index}
                className={`absolute w-full flex flex-col items-center gap-3 transition-all duration-500 ease-out px-4 text-center`}
                style={{
                  opacity: index === activeFeatureIndex ? 1 : 0,
                  transform: index === activeFeatureIndex ? 'translateY(0)' : 'translateY(20px)'
                }}
              >
                {/* Gradient Icon View */}
                <div className="w-[44px] h-[44px] relative">
                  {/* We simulate the gradient mask icon */}
                  <FeatureIcon type={feature.icon} /> 
                </div>
                <span className="text-[16px] font-semibold text-white">{feature.text}</span>
              </div>
            ))}
          </div>

          {/* Progress Indicator Bars */}
          <div className="w-full px-8 pb-4 flex gap-1.5 h-1.5">
            {FEATURES.map((_, i) => (
              <div key={i} className="h-full flex-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-white/80 rounded-full transition-all duration-[4000ms] ease-linear`}
                  style={{ width: i === activeFeatureIndex ? '100%' : '0%' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Social Proof View */}
        <div className="w-full bg-white/5 border border-white/10 rounded-[20px] p-4 flex flex-col items-center gap-4">
          
          {/* Rating Header */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[18px] font-bold text-white">4.9</span>
            <div className="flex text-yellow-400 gap-0.5">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
            </div>
            <span className="text-[11px] font-semibold text-white/80">App Store Rating</span>
          </div>

          {/* Review Card */}
          <div className="flex flex-col items-center text-center w-full transition-opacity duration-500 min-h-[80px] justify-center">
             <div key={currentReviewIndex} className="animate-fade-in flex flex-col items-center gap-2">
                <img 
                  src={reviews[currentReviewIndex].image} 
                  className="w-[30px] h-[30px] rounded-full object-cover" 
                  alt="Reviewer"
                />
                <p className="text-[15px] italic text-white/85">"{reviews[currentReviewIndex].text}"</p>
                <p className="text-[13px] font-bold text-white">{reviews[currentReviewIndex].name}</p>
             </div>
          </div>

          {/* User Count Label */}
          <p className="text-[15px] text-white/80 text-center">
            Join <span className="font-bold text-white">{userCount.toLocaleString()}+ women</span> feeling strong.
          </p>
        </div>

        {/* FAQ & Legal Stack */}
        <div className="mt-8 flex flex-col gap-4">
           {/* FAQ Item */}
           <div className="w-full bg-white/5 rounded-xl p-4">
              <div className="flex items-center justify-center gap-2 text-white/90">
                 <span className="text-[15px] font-semibold">How do I get my money back?</span>
                 <ChevronDown size={16} className="text-gray-400" />
              </div>
              <p className="text-[14px] text-white/70 text-center mt-2">
                Tap “Refund” in Settings → “Billing” → Done.
              </p>
           </div>
           
           {/* Legal Links */}
           <div className="flex justify-between px-4 text-[13px] font-medium text-white/60">
              <button>Restore Purchase</button>
              <button>Terms of Use</button>
              <button>Privacy Policy</button>
           </div>
        </div>

      </div>

      {/* 3. Sticky Footer (CTA) */}
      <div className={`absolute bottom-0 left-0 w-full z-20 px-6 pb-8 pt-4 bg-gradient-to-t from-black via-black/90 to-transparent transition-all duration-1000 delay-200 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
        <button 
          onClick={() => alert("Simulating Purchase - Redirecting...")}
          className="w-full h-[56px] rounded-full shadow-[0_0_15px_rgba(230,84,115,0.6)] flex items-center justify-center gap-2 animate-breathe active:scale-95 transition-transform overflow-hidden relative"
        >
          {/* Gradient Background Layer */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#FF3B61] to-[#D959E8]" />
          
          {/* Content */}
          <div className="relative flex items-center gap-2 z-10">
             <Lock size={18} className="text-white" /> 
             <span className="text-[18px] font-bold text-white">Start My {goalTitle.split(' ').slice(-2).join(' ')} Plan</span>
          </div>
        </button>

        <p className="text-center text-white/60 text-[12px] font-medium mt-3 leading-snug px-2">
          {getCtaSubtext()}
        </p>
      </div>

    </div>
  );
}

// --- SUBCOMPONENT: Custom Icons (Replicating the SF Symbols) ---
const FeatureIcon = ({ type }) => {
  // We use SVG masks to apply the specific gradient color to the icon, mimicking the Swift GradientIconView
  const IconMap = {
    brain: (
       <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-app-primary">
         <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Z" fill="url(#grad1)" opacity="0.2"/>
         <path d="M12 6a6 6 0 1 0 6 6 6 6 0 0 0-6-6Zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4Z" fill="url(#grad1)"/>
         <defs>
           <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
             <stop offset="0%" stopColor="#FF3B61" />
             <stop offset="100%" stopColor="#D959E8" />
           </linearGradient>
         </defs>
       </svg>
    ),
    timer: <Check size={44} className="text-[#FF3B61]" />, // Placeholder for complex timer icon
    play: <div className="w-full h-full rounded-full border-2 border-[#FF3B61] flex items-center justify-center"><div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-[#D959E8] border-b-[8px] border-b-transparent ml-1" /></div>,
    chart: <Activity size={44} className="text-[#D959E8]" />
  };

  // For simplicity in this demo, mapping standard Lucide icons with the gradient color text
  if (type === 'brain') return <div className="text-[#FF3B61]"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 0 7 4.5 2.5 2.5 0 0 0 9.5 7h.08a7 7 0 0 0 3.33 13.88c.64.04 1.28-.01 1.9-.15a.5.5 0 0 0 .15-.92l-2.02-1.35a1 1 0 0 1-.41-.75v-1.12a1 1 0 0 1 1-1h.23c.9 0 1.7-.58 1.95-1.42l.53-2.13a1 1 0 0 0-.58-1.18l-1.39-.55a2.5 2.5 0 0 0-3.32-3.32H9.5z"/></svg></div>;
  if (type === 'timer') return <div className="text-[#FF3B61]"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>;
  if (type === 'play') return <div className="text-[#FF3B61]"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><polygon points="10 8 16 12 10 16 10 8"/></svg></div>;
  
  return <div className="text-[#FF3B61]"><Activity size={44} /></div>;
};
