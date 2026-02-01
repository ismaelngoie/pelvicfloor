"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUserData } from '@/context/UserDataContext';
import { 
  Baby, Activity, Zap, Droplets, HeartHandshake, Heart, Dumbbell, 
  CheckCircle2, Circle, Leaf, Shield, PersonStanding, Sparkles, Move,
  Check, User, Brain, Timer, Play, Loader2, Mail, X, ChevronDown, ChevronUp 
} from 'lucide-react'; 

import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  LinkAuthenticationElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// ==========================================
// SHARED COMPONENTS & UTILS
// ==========================================

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

// --- REVIEWS DATA ---
const reviews = [
  { text: "Zero leaks by week 2. I cried happy tears.", author: "Emily, 39" },
  { text: "Sneezed today. No panic. I’m free.", author: "Dana, 46" },
  { text: "More sensation, less worry, more us.", author: "Jess, 35" },
  { text: "Pain-free sitting. Sleep through the night.", author: "Olivia, 41" },
  { text: "From wobbly to steady, lifting my baby feels safe.", author: "Mia, 33" },
];

const ButterflyBackground = () => {
  const [butterflies, setButterflies] = useState([]);

  useEffect(() => {
    const count = 25;
    const items = Array.from({ length: count }).map((_, i) => {
      const duration = 15 + Math.random() * 15; 
      return {
        id: i,
        left: Math.random() * 100, 
        size: 20 + Math.random() * 30, 
        duration: duration,
        delay: -(Math.random() * duration), 
        rotation: (Math.random() - 0.5) * 60, 
        isBehind: Math.random() > 0.6 
      };
    });
    setButterflies(items);
  }, []);

  const brandPinkFilter = 'brightness(0) saturate(100%) invert(48%) sepia(91%) saturate(343%) hue-rotate(304deg) brightness(91%) contrast(96%)';

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
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

// ==========================================
// SCREEN 1: WELCOME SCREEN (SPLIT LAYOUT ON DESKTOP)
// ==========================================
function WelcomeScreen({ onNext }) {
  const router = useRouter();
  const { userDetails } = useUserData();
  const [socialProofCount, setSocialProofCount] = useState(9800);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedData = localStorage.getItem('pelvic_user_data');
        if (storedData) {
          const parsed = JSON.parse(storedData);
          if (parsed.isPremium === true) {
            router.replace('/dashboard');
            return; 
          }
        }
      } catch (e) {}
    }

    if (userDetails && userDetails.isPremium) {
      router.replace('/dashboard');
    } else {
      const timer = setTimeout(() => setShowContent(true), 50); 
      return () => clearTimeout(timer);
    }
  }, [userDetails, router]);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentReviewIndex((prev) => (prev + 1) % reviews.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  if (!showContent && (userDetails?.isPremium)) return null;

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-pink-50/50 to-white overflow-hidden flex flex-col md:flex-row">
      <ButterflyBackground />

      {/* --- LEFT SIDE (DESKTOP) / TOP (MOBILE) --- */}
      <div className={`
        flex-1 w-full z-10 flex flex-col items-center justify-center px-6 pt-8 pb-4 transition-all duration-1000 
        md:items-start md:pl-20 md:pr-12 md:text-left
        ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}
      `}>
        {/* Logo */}
        <div className="mb-6 shrink-0 mt-8 md:mt-0">
           <img src="/logo.png" width={80} height={80} alt="Logo" className="object-contain" />
        </div>

        <h1 className="text-[28px] md:text-[42px] font-extrabold text-app-textPrimary text-center md:text-left mb-3 leading-tight">
          Pelvic Floor Strengthening<br/>
          <span className="text-[24px] md:text-[32px] text-app-primary">5-Minute Daily Home Plan</span>
        </h1>

        <p className="text-app-textSecondary text-center md:text-left mb-8 text-[16px] md:text-[18px] max-w-xs md:max-w-md leading-relaxed">
          Stop bladder leaks, heal prolapse, and improve intimacy with our scientifically backed program.
        </p>
      </div>

      {/* --- RIGHT SIDE (DESKTOP) / BOTTOM (MOBILE) --- */}
      <div className={`
        w-full md:w-1/2 md:h-full z-30 px-8 pb-8 pt-4 bg-gradient-to-t from-white via-white/90 to-transparent 
        md:bg-none md:flex md:flex-col md:justify-center md:items-start md:border-l md:border-pink-100 md:bg-white/40
        transition-all duration-1000 delay-300 
        ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}
      `}>
        
        <div className="flex flex-col gap-6 items-center md:items-start w-full max-w-md mx-auto">
          
           {/* Benefits List */}
          <div className="flex flex-col gap-6 w-full items-start pl-2 bg-white/60 backdrop-blur-sm p-6 rounded-3xl border border-white/50 shadow-lg">
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

          {/* Review Ticker */}
          <div className="h-14 overflow-hidden w-full relative">
            {reviews.map((review, index) => (
              <div 
                key={index}
                className={`absolute w-full text-center md:text-left transition-all duration-500 ease-out flex flex-col items-center md:items-start justify-center h-full`}
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
            className="w-full h-14 bg-app-primary text-white font-bold text-lg rounded-full shadow-xl shadow-app-primary/30 animate-breathe hover:scale-105 active:scale-95 transition-transform relative z-40"
          >
            Start Strengthening Now
          </button>

          <p className="text-app-textSecondary text-[13px] font-medium text-center md:text-left w-full">
            Join {socialProofCount.toLocaleString()}+ women strengthening their pelvic floor.
          </p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SCREEN 2: SELECT GOAL SCREEN (EXPANDED GRID ON DESKTOP)
// ==========================================
const THEME_GOAL = {
  unselected: "bg-white border-gray-200",
  textUnselected: "text-slate-900",
  selected: "bg-white border-rose-500 shadow-xl shadow-rose-200 scale-[1.05] z-50",
  textSelected: "text-rose-600",
  iconUnselected: "text-rose-500",
  iconSelected: "text-rose-600 scale-110 drop-shadow-sm",
};

const goals = [
  { id: 'intimacy', title: "Improve Intimacy", icon: <Heart size={28} strokeWidth={2} /> },
  { id: 'leaks', title: "Stop Bladder Leaks", icon: <Droplets size={28} strokeWidth={2} /> },
  { id: 'pregnancy', title: "Prepare for Pregnancy", icon: <Baby size={28} strokeWidth={2} /> },
  { id: 'postpartum', title: "Recover Postpartum", icon: <Activity size={28} strokeWidth={2} /> },
  { id: 'core', title: "Build Core Strength", icon: <Zap size={28} strokeWidth={2} /> },
  { id: 'pain', title: "Ease Pelvic Pain", icon: <HeartHandshake size={28} strokeWidth={2} /> },
  { id: 'fitness', title: "Support My Fitness", icon: <Dumbbell size={28} strokeWidth={2} /> },
  { id: 'stability', title: "Boost Stability", icon: <Activity size={28} strokeWidth={2} /> },
];

function SelectGoalScreen({ onNext }) {
  const { saveUserData, userDetails } = useUserData();
  const [selectedId, setSelectedId] = useState(userDetails.selectedTarget?.id || null);

  const handleSelect = (goal) => {
    setSelectedId(goal.id);
    saveUserData('selectedTarget', goal);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white/50 animate-fade-in relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute top-[-10%] right-[-10%] w-[250px] h-[250px] bg-rose-200 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[250px] h-[250px] bg-rose-100 rounded-full blur-[80px]" />
      </div>

      {/* Header */}
      <div className="z-10 pt-8 pb-2 px-5 shrink-0 text-center">
        <h1 className="text-[26px] md:text-[32px] font-extrabold text-app-textPrimary mb-2 leading-tight">
          Let's set your primary goal.
        </h1>
        <p className="text-app-textSecondary text-[14px] md:text-[16px] leading-snug px-4 font-medium">
          This shapes your custom pelvic strengthening plan.
        </p>
      </div>

      {/* Grid Container - 2 cols Mobile, 4 cols Desktop */}
      <div className="z-10 flex-1 overflow-y-auto no-scrollbar px-5 pb-4 flex flex-col justify-center"> 
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-2 max-w-4xl mx-auto w-full">
          {goals.map((goal) => {
            const isSelected = selectedId === goal.id;
            return (
              <button
                key={goal.id}
                onClick={() => handleSelect(goal)}
                className={`
                  relative flex flex-col items-center justify-center p-3 rounded-[24px] border-[2px] 
                  transition-all duration-300 ease-out h-[100px] md:h-[140px] w-full outline-none active:scale-95
                  ${isSelected ? THEME_GOAL.selected : `${THEME_GOAL.unselected} hover:bg-gray-50 z-10`}
                `}
              >
                <div className={`absolute top-2 right-2 transition-all duration-300 ${isSelected ? 'opacity-100 scale-100' : 'opacity-100 scale-100'}`}>
                  {isSelected ? (
                    <CheckCircle2 size={20} className="fill-rose-500 text-white" />
                  ) : (
                    <Circle size={20} className="text-gray-200" strokeWidth={1.5} />
                  )}
                </div>
                <div className={`mb-2 transition-all duration-300 ${isSelected ? THEME_GOAL.iconSelected : THEME_GOAL.iconUnselected}`}>
                   {goal.icon}
                </div>
                <span className={`text-[13px] md:text-[15px] font-bold text-center leading-tight transition-colors duration-300 ${isSelected ? THEME_GOAL.textSelected : THEME_GOAL.textUnselected}`}>
                  {goal.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="z-20 p-5 shrink-0 bg-gradient-to-t from-white via-white/90 to-transparent">
        <button 
          onClick={onNext}
          disabled={!selectedId}
          className={`w-full max-w-md mx-auto block h-14 font-bold text-[18px] rounded-full transition-all duration-300 shadow-xl
            ${selectedId 
              ? 'bg-app-primary text-white shadow-app-primary/30 animate-breathe active:scale-95 transform' 
              : 'bg-app-borderIdle text-app-textSecondary/50 cursor-not-allowed shadow-none'}
          `}
        >
          Set My Goal
        </button>
      </div>
    </div>
  );
}

// ==========================================
// SCREEN 3: HOW IT HELPS (WIDER ON DESKTOP)
// ==========================================
function BabyIcon({ size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.5 1.5.5 2 0"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg>
}

const benefitsData = {
  "Prepare for Pregnancy": { subtitle: "Your plan will build a strong, supportive foundation for a healthy pregnancy.", icon: <BabyIcon size={40} />, benefits: [{ icon: <Leaf size={20}/>, text: "Gentle prep for birth" }, { icon: <Heart size={20}/>, text: "Pelvic floor ready" }, { icon: <Dumbbell size={20}/>, text: "Core strong for birth" }, { icon: <PersonStanding size={20}/>, text: "Support your bump" }, { icon: <Move size={20}/>, text: "Ease back and hips" }, { icon: <Sparkles size={20}/>, text: "Calm body, calm mind" }] },
  "Recover Postpartum": { subtitle: "Your plan is designed to safely rebuild your foundation and restore your core.", icon: <Heart size={40} />, benefits: [{ icon: <Heart size={20}/>, text: "Pelvic floor restored" }, { icon: <Activity size={20}/>, text: "Core reconnected" }, { icon: <Shield size={20}/>, text: "Gentle, safe progress" }, { icon: <PersonStanding size={20}/>, text: "Lift baby with ease" }, { icon: <Move size={20}/>, text: "Back feels supported" }, { icon: <Leaf size={20}/>, text: "C-section friendly" }] },
  "Build Core Strength": { subtitle: "Your plan focuses on building deep, functional strength for better posture.", icon: <Zap size={40} />, benefits: [{ icon: <Zap size={20}/>, text: "Stronger, deeper core" }, { icon: <Dumbbell size={20}/>, text: "Confident lifts" }, { icon: <Activity size={20}/>, text: "Run tall, run free" }, { icon: <PersonStanding size={20}/>, text: "Posture that holds" }, { icon: <Shield size={20}/>, text: "Injury risk reduced" }, { icon: <Leaf size={20}/>, text: "Deeper core breath" }] },
  "Stop Bladder Leaks": { subtitle: "Your plan focuses on building a reliable 'leakproof seal' for confidence.", icon: <Shield size={40} />, benefits: [{ icon: <Droplets size={20}/>, text: "Sneeze without worry" }, { icon: <Activity size={20}/>, text: "Run and jump freely" }, { icon: <Leaf size={20}/>, text: "Drier nights" }, { icon: <Zap size={20}/>, text: "Urgency under control" }, { icon: <Dumbbell size={20}/>, text: "Confident workouts" }, { icon: <CheckCircle2 size={20}/>, text: "Leave pads behind" }] },
  "Ease Pelvic Pain": { subtitle: "Your plan focuses on gentle release and building supportive strength.", icon: <Leaf size={40} />, benefits: [{ icon: <PersonStanding size={20}/>, text: "Pain-free sitting" }, { icon: <Move size={20}/>, text: "Comfort in movement" }, { icon: <Leaf size={20}/>, text: "Sleep through night" }, { icon: <Sparkles size={20}/>, text: "Gentle daily relief" }, { icon: <Heart size={20}/>, text: "Enjoy intimacy again" }, { icon: <Zap size={20}/>, text: "Release deep tension" }] },
  "Improve Intimacy": { subtitle: "Your plan focuses on enhancing sensation, comfort, and confidence.", icon: <Heart size={40} />, benefits: [{ icon: <Heart size={20}/>, text: "More sensation" }, { icon: <Sparkles size={20}/>, text: "Stronger orgasms" }, { icon: <Leaf size={20}/>, text: "Comfort in intimacy" }, { icon: <PersonStanding size={20}/>, text: "Confidence returns" }, { icon: <Activity size={20}/>, text: "Feel close again" }, { icon: <Zap size={20}/>, text: "Pelvic tone improved" }] },
  "Support My Fitness": { subtitle: "Your plan will build the foundational core strength that powers your goals.", icon: <Dumbbell size={40} />, benefits: [{ icon: <Move size={20}/>, text: "Stronger every day" }, { icon: <Dumbbell size={20}/>, text: "Safe, guided workouts" }, { icon: <Activity size={20}/>, text: "Cardio, core, control" }, { icon: <Zap size={20}/>, text: "Progress you can feel" }, { icon: <Leaf size={20}/>, text: "5-min plan, daily" }, { icon: <PersonStanding size={20}/>, text: "Move with confidence" }] },
  "Boost Stability": { subtitle: "Your plan focuses on creating a stable, balanced core for effortless posture.", icon: <PersonStanding size={40} />, benefits: [{ icon: <PersonStanding size={20}/>, text: "Balanced, stable core" }, { icon: <Activity size={20}/>, text: "Steady on your feet" }, { icon: <Move size={20}/>, text: "Walk tall, no wobble" }, { icon: <Shield size={20}/>, text: "Back feels supported" }, { icon: <Dumbbell size={20}/>, text: "Stronger hips, knees" }, { icon: <Zap size={20}/>, text: "Stable side to side" }] }
};

function HowItHelpsScreen({ onNext }) {
  const { userDetails } = useUserData();
  const [animate, setAnimate] = useState(false);
  const goalTitle = userDetails.selectedTarget?.title || "Build Core Strength";
  const data = benefitsData[goalTitle] || benefitsData["Build Core Strength"];

  useEffect(() => { setTimeout(() => setAnimate(true), 200); }, []);

  return (
    <div className="w-full h-full flex flex-col pt-12 px-4 pb-8 animate-fade-in relative bg-app-background overflow-hidden items-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-app-primary/5 rounded-full blur-3xl -z-10" />

      <div className="flex-1 w-full max-w-2xl overflow-y-auto no-scrollbar flex flex-col">
        <div className="z-10 text-center mb-4 shrink-0">
          <h1 className="text-3xl font-bold text-app-textPrimary mb-4 leading-tight animate-slide-up">
            Here's how we'll <br/><span className="text-app-primary">{goalTitle}</span>
          </h1>
          <p className="text-app-textSecondary text-[16px] leading-relaxed px-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {data.subtitle}
          </p>
        </div>

        <div className="flex-1 min-h-[350px] relative flex items-center justify-center shrink-0">
          <div className={`absolute z-20 bg-white p-6 rounded-full shadow-xl shadow-app-primary/15 text-app-primary border border-app-borderIdle transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) ${animate ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
             {data.icon}
          </div>
          {data.benefits.map((benefit, index) => {
            const total = data.benefits.length;
            const radius = 135; // Kept consistent for visual stability
            const angle = (index / total) * 2 * Math.PI - (Math.PI / 2); 
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            return (
              <React.Fragment key={index}>
                <svg className="absolute top-1/2 left-1/2 pointer-events-none overflow-visible -z-10" style={{ width: '0px', height: '0px' }}>
                  <line x1="0" y1="0" x2={x} y2={y} stroke="#EBEBF0" strokeWidth="2" strokeDasharray="6 4" className={`transition-all duration-1000 ease-out ${animate ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: `${0.3 + (index * 0.1)}s` }} />
                </svg>
                <div className={`absolute flex flex-col items-center gap-1.5 transition-all duration-500`} style={{ transform: `translate(${x}px, ${y}px)`, opacity: animate ? 1 : 0, transitionDelay: `${0.5 + (index * 0.1)}s`, width: '90px' }}>
                  <div className="bg-white p-2.5 rounded-2xl shadow-md border border-app-borderIdle text-app-primary">{benefit.icon}</div>
                  <span className="text-[11px] font-bold text-center text-app-textPrimary leading-tight bg-app-background/80 backdrop-blur-sm px-1 rounded">{benefit.text}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="z-20 pt-2 shrink-0 bg-app-background/90 backdrop-blur-sm w-full max-w-md">
        <button onClick={onNext} className="w-full h-14 bg-gradient-to-r from-app-primary to-rose-500 text-white font-bold text-lg rounded-full shadow-lg shadow-app-primary/30 active:scale-95 transition-transform animate-fade-in" style={{ animationDelay: '1.2s' }}>
          Next: Personalize My Plan
        </button>
      </div>
    </div>
  );
}

// ==========================================
// SCREEN 4: PERSONAL INTAKE (CENTERED CHAT ON DESKTOP)
// ==========================================
const MIA_COPY = { "default": { ack: "Excellent choice, {name}. We will stack you tall and steady.", age: "At {age}, we train deep core timing for all-day support.", weight: "Thank you. I will set progressions that protect your back.", height: "Noted. Your height guides stance so alignment clicks quickly." }, "Prepare for Pregnancy": { ack: "Beautiful choice, {name}. We will gently prepare your pelvic floor and core.", age: "At {age}, we focus on calm breath and steady endurance.", weight: "Thanks. I will set positions that feel doable today.", height: "Got it. Your height helps me cue stance and reach." }, "Recover Postpartum": { ack: "I have you, {name}. We will rebuild your foundation with kindness.", age: "At {age}, I pace recovery for connection over intensity.", weight: "Thank you. I will scale loads so lifting baby feels safe.", height: "Noted. Your height lets me fine tune carry and lift." }, "Build Core Strength": { ack: "Love it, {name}. We will build a deep, steady core.", age: "At {age}, we sharpen activation so strength grows without strain.", weight: "Thanks. I will use this to set starting loads.", height: "Great. Your height helps me dial plank angles." }, "Stop Bladder Leaks": { ack: "On it, {name}. We will train control so leaks stop owning your day.", age: "At {age}, we blend endurance with quick contractions.", weight: "Thank you. I will scale impact so you stay dry.", height: "Noted. Your height guides setup for alignment." }, "Ease Pelvic Pain": { ack: "I am with you, {name}. We will release what is tight gently.", age: "At {age}, we favor calming patterns and gradual load.", weight: "Thanks. I will choose positions that lower strain.", height: "Got it. Your height helps me fine tune angles." }, "Improve Intimacy": { ack: "Let’s make this feel good again, {name}.", age: "At {age}, I balance relaxation and activation to support arousal.", weight: "Thank you. I will set intensities that build tone.", height: "Noted. I will cue supportive positions for comfort." }, "Support My Fitness": { ack: "Nice, {name}. We will turn your core into a quiet engine.", age: "At {age}, we pair stability with power for your workouts.", weight: "Thanks. I will set loads that build performance.", height: "Great. Your height lets me tune stance for clean reps." }, "Boost Stability": { ack: "Excellent, {name}. We will stack you tall and steady.", age: "At {age}, we train deep core timing for all day support.", weight: "Thank you. I will set progressions that protect your back.", height: "Noted. Your height guides stance so alignment clicks." } };

const TypingIndicator = () => (<div className="flex space-x-1.5 p-1"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div></div>);

const ChatBubble = ({ text, isTyping, isUser }) => (
  <div className={`flex w-full mb-6 animate-fade-in-up ${isUser ? 'justify-end' : 'justify-start'}`}>
    {!isUser && (<div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 mr-3 mt-auto"><img src="/coachMiaAvatar.png" alt="Mia" className="w-full h-full object-cover" /></div>)}
    <div className={`px-5 py-3.5 shadow-sm max-w-[85%] text-[16px] leading-relaxed font-medium ${isUser ? 'bg-app-primary text-white rounded-2xl rounded-br-none' : 'bg-white border border-app-borderIdle text-app-textPrimary rounded-2xl rounded-bl-none'}`}>{isTyping ? <TypingIndicator /> : text}</div>
  </div>
);

const WheelPicker = ({ range, value, onChange, unit, formatLabel }) => {
  const scrollerRef = useRef(null);
  const ITEM_HEIGHT = 54; 
  const handleScroll = () => { if (!scrollerRef.current) return; const scrollY = scrollerRef.current.scrollTop; const centerIndex = Math.round(scrollY / ITEM_HEIGHT); const newValue = range[centerIndex]; if (newValue !== undefined && newValue !== value) { onChange(newValue); } };
  useEffect(() => { if (scrollerRef.current) { const index = range.indexOf(value); if (index !== -1) { scrollerRef.current.scrollTo({ top: index * ITEM_HEIGHT, behavior: 'auto' }); } } }, []);
  return (
    <div className="relative h-[220px] w-full max-w-[320px] mx-auto overflow-hidden mt-2">
      <div className="absolute top-1/2 left-0 w-full h-[54px] -translate-y-1/2 border-t-2 border-b-2 border-app-primary/10 bg-app-primary/5 pointer-events-none z-10" />
      <div className="absolute top-0 left-0 w-full h-[80px] bg-gradient-to-b from-white via-white/90 to-transparent z-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-[80px] bg-gradient-to-t from-white via-white/90 to-transparent z-20 pointer-events-none" />
      <div ref={scrollerRef} onScroll={handleScroll} className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar py-[83px]">
        {range.map((num) => (<div key={num} className={`h-[54px] flex items-center justify-center snap-center transition-all duration-200 ${num === value ? 'scale-110 font-bold text-app-primary text-2xl' : 'scale-90 text-app-textSecondary/40 text-xl'}`}>{formatLabel ? formatLabel(num) : num}{unit && <span className="text-sm ml-1.5 mt-1 font-medium text-app-textSecondary/60">{unit}</span>}</div>))}
      </div>
    </div>
  );
};

function PersonalIntakeScreen({ onNext }) {
  const { userDetails, saveUserData } = useUserData();
  const [step, setStep] = useState('name'); 
  const [isTyping, setIsTyping] = useState(false);
  const [history, setHistory] = useState([]); 
  const chatBottomRef = useRef(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState(30);
  const [weight, setWeight] = useState(140);
  const [height, setHeight] = useState(65); 
  const goalTitle = userDetails.selectedTarget?.title || "Build Core Strength";
  const copy = MIA_COPY[goalTitle] || MIA_COPY["default"];
  const scrollToBottom = () => { setTimeout(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, 100); };
  const addMessage = (text, sender, delay = 0) => { if (sender === 'mia') setIsTyping(true); setTimeout(() => { if (sender === 'mia') setIsTyping(false); setHistory(prev => [...prev, { text, sender }]); scrollToBottom(); }, delay); };

  useEffect(() => { addMessage("Hi there! I'm Coach Mia, your personal physio-coach. What should I call you?", 'mia', 600); }, []);

  const handleNext = () => {
    if (isTyping) return; 
    if (step === 'name') { if (name.length < 2) return; saveUserData('name', name); addMessage(name, 'user'); const nextText = copy.ack.replace("{name}", name) + " To start, what's your age?"; addMessage(nextText, 'mia', 1000); setStep('age'); } 
    else if (step === 'age') { saveUserData('age', age); addMessage(`${age}`, 'user'); const nextText = copy.age.replace("{age}", age) + " Now, what's your current weight?"; addMessage(nextText, 'mia', 1000); setStep('weight'); } 
    else if (step === 'weight') { saveUserData('weight', weight); addMessage(`${weight} lbs`, 'user'); const nextText = copy.weight + " And what's your height?"; addMessage(nextText, 'mia', 1200); setStep('height'); } 
    else if (step === 'height') { saveUserData('height', height); const feet = Math.floor(height / 12); const inches = height % 12; addMessage(`${feet}'${inches}"`, 'user'); setTimeout(() => { onNext(); }, 800); }
  };

  const renderInput = () => {
    if (isTyping) return <div className="h-[220px] flex items-center justify-center text-app-textSecondary/50 text-sm animate-pulse">Mia is thinking...</div>;
    switch (step) {
      case 'name': return (<div className="w-full animate-slide-up py-10"><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Type your name..." className="w-full text-center text-3xl font-bold bg-transparent border-b-2 border-app-borderIdle focus:border-app-primary outline-none py-3 text-app-textPrimary placeholder:text-app-textSecondary/30" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleNext()} /></div>);
      case 'age': return <WheelPicker range={Array.from({length: 80}, (_, i) => i + 16)} value={age} onChange={setAge} unit="years old" />;
      case 'weight': return <WheelPicker range={Array.from({length: 300}, (_, i) => i + 80)} value={weight} onChange={setWeight} unit="lbs" />;
      case 'height': return (<WheelPicker range={Array.from({length: 40}, (_, i) => i + 48)} value={height} onChange={setHeight} formatLabel={(val) => `${Math.floor(val / 12)}'${val % 12}"`} />);
      default: return null;
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-app-background relative overflow-hidden items-center">
      <div className="flex-1 w-full max-w-2xl overflow-y-auto no-scrollbar px-6 pt-8 pb-4 flex flex-col">
        {history.map((msg, index) => (<ChatBubble key={index} text={msg.text} isTyping={false} isUser={msg.sender === 'user'} />))}
        {isTyping && <ChatBubble isTyping={true} isUser={false} />}
        <div ref={chatBottomRef} className="h-4" />
      </div>
      <div className="w-full max-w-2xl shrink-0 bg-white md:rounded-[35px] rounded-t-[35px] shadow-[0_-10px_40px_rgba(0,0,0,0.08)] p-6 pb-10 z-20">
        <div className="mb-6">{renderInput()}</div>
        <button onClick={handleNext} disabled={isTyping || (step === 'name' && name.length < 2)} className={`w-full h-14 font-bold text-lg rounded-full shadow-xl transition-all duration-300 ${isTyping || (step === 'name' && name.length < 2) ? 'bg-app-borderIdle text-app-textSecondary cursor-not-allowed opacity-50 shadow-none' : 'bg-app-primary text-white shadow-app-primary/30 active:scale-95 animate-breathe'}`}>{step === 'height' ? 'Continue' : 'Next'}</button>
      </div>
    </div>
  );
}

// ==========================================
// SCREEN 5: PLAN REVEAL
// ==========================================
const THEME_REVEAL = { textPrimary: "text-slate-900", textSecondary: "text-slate-500", unselected: "bg-white border-gray-200 shadow-sm", selected: "bg-white border-[#E65473] shadow-xl shadow-pink-200/50 scale-[1.02] z-20", textUnselected: "text-slate-900", textSelected: "text-[#E65473]", iconUnselected: "text-[#E65473] opacity-80", iconSelected: "text-[#E65473] scale-110", helper: "text-[#33B373]", brandGradient: "from-[#E65473] to-[#C23A5B]" };
const CONDITIONS = [{ id: 'pain', title: 'Pelvic Pain', icon: <HeartHandshake size={26} /> }, { id: 'postpartum', title: 'Postpartum', icon: <Baby size={26} /> }, { id: 'leaks', title: 'Incontinence', icon: <Droplets size={26} /> }, { id: 'prostate', title: 'Prostate', icon: <User size={26} /> }];
const ACTIVITIES = [{ id: 'sedentary', title: 'Sedentary', sub: '(mostly sitting)' }, { id: 'moderate', title: 'Lightly Active', sub: '(daily walks)' }, { id: 'active', title: 'Very Active', sub: '(regular workouts)' }];
const PersonalizingConstants = { totalDuration: 7000, phase1Scale: 0.25, phase2Scale: 0.20 };
const AICoreView = () => (<div className="relative w-40 h-40 flex items-center justify-center"><div className="absolute w-[80px] h-[80px] border-[3px] border-[#E65473]/80 rounded-full animate-spin [animation-duration:8s] border-t-transparent border-l-transparent" /><div className="absolute w-[110px] h-[110px] border-[2px] border-[#E65473]/60 rounded-full animate-spin [animation-duration:12s] [animation-direction:reverse] border-b-transparent border-r-transparent" /><div className="absolute w-[140px] h-[140px] border-[1px] border-[#E65473]/40 rounded-full animate-spin [animation-duration:15s] border-t-transparent" /><div className="absolute w-10 h-10 bg-[#E65473]/50 rounded-full blur-md animate-pulse" /><div className="absolute w-6 h-6 bg-[#E65473] rounded-full shadow-[0_0_15px_rgba(230,84,115,0.8)]" /></div>);
const TypewriterText = ({ text }) => { const [displayed, setDisplayed] = useState(""); const timerRef = useRef(null); useEffect(() => { if (timerRef.current) clearInterval(timerRef.current); setDisplayed(""); let i = 0; timerRef.current = setInterval(() => { i += 1; setDisplayed(text.slice(0, i)); if (i >= text.length) clearInterval(timerRef.current); }, 40); return () => clearInterval(timerRef.current); }, [text]); return (<span>{displayed}<span className="animate-pulse text-[#E65473]">|</span></span>); };
const HolographicTimeline = () => { const [show, setShow] = useState(false); useEffect(() => { const t = setTimeout(() => setShow(true), 500); return () => clearTimeout(t); }, []); return (<div className="w-full h-36 relative my-2"><svg className="absolute inset-0 w-full h-full overflow-visible"><defs><linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="rgba(230, 84, 115, 0.2)" /><stop offset="100%" stopColor="rgba(230, 84, 115, 1)" /></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="4" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter></defs><path d="M 10,100 C 80,110 200,10 320,20" fill="none" stroke="url(#lineGradient)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" className={`transition-all duration-[2000ms] ease-out ${show ? 'stroke-dasharray-[400] stroke-dashoffset-0' : 'stroke-dasharray-[400] stroke-dashoffset-[400]'}`} /><g className={`transition-opacity duration-1000 delay-1000 ${show ? 'opacity-100' : 'opacity-0'}`}><circle cx="10" cy="100" r="4" fill="white" /><text x="10" y="125" textAnchor="middle" fill="white" fontSize="10" opacity="0.7">Today</text><circle cx="320" cy="20" r="6" fill="#E65473" stroke="white" strokeWidth="2" /><text x="310" y="10" textAnchor="end" fill="#E65473" fontSize="12" fontWeight="bold">Goal</text></g></svg></div>); };

function PlanRevealScreen({ onNext }) {
  const { userDetails, saveUserData } = useUserData();
  const [phase, setPhase] = useState('askingHealthInfo'); 
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [noneSelected, setNoneSelected] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [personalizingStatus, setPersonalizingStatus] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [showChecklist, setShowChecklist] = useState(false);
  const goalTitle = userDetails?.selectedTarget?.title || "Build Core Strength";
  
  // Helpers
  const toggleCondition = (id) => { setNoneSelected(false); setSelectedConditions(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]); };
  const toggleNone = () => { setNoneSelected(!noneSelected); if (!noneSelected) setSelectedConditions([]); };
  const canContinue = (selectedConditions.length > 0 || noneSelected) && selectedActivity;
  const handlePhase1Continue = () => { saveUserData('healthConditions', selectedConditions); saveUserData('activityLevel', selectedActivity); setPhase('personalizing'); };

  useEffect(() => { if (phase === 'personalizing') { let startTime = Date.now(); setPersonalizingStatus("Connecting..."); const progressInterval = setInterval(() => { const elapsed = Date.now() - startTime; setProgressPercent(Math.min(99, Math.floor((elapsed / 7000) * 100))); }, 50); setTimeout(() => { setPersonalizingStatus(""); setShowChecklist(true); }, 2000); return () => clearInterval(progressInterval); } }, [phase]);
  const onChecklistComplete = () => { setProgressPercent(100); setPersonalizingStatus("Plan Locked."); setTimeout(() => setPhase('showingTimeline'), 1200); };
  
  const calculateBMI = () => "22.5"; // simplified for brevity
  const formatRichText = (text) => text ? text.split(/(\*\*.*?\*\*)/g).map((part, i) => part.startsWith('**') ? <span key={i} className="text-white font-extrabold">{part.slice(2, -2)}</span> : <span key={i}>{part}</span>) : null;
  const timelineCopy = getTimelineCopy(goalTitle);

  return (
    <div className={`absolute inset-0 w-full h-full flex flex-col transition-colors duration-700 overflow-hidden ${phase === 'askingHealthInfo' ? THEME_REVEAL.bg : 'bg-black'}`}>
      
      {phase === 'askingHealthInfo' && (
        <div className="flex flex-col h-full w-full animate-in fade-in duration-700 px-5 items-center justify-center pt-8">
            <div className="mb-2 shrink-0 text-center">
              <h1 className={`text-[26px] font-extrabold ${THEME_REVEAL.text} mb-1`}>Any health notes?</h1>
              <p className="text-center text-sm text-gray-500">This helps me map safe sessions.</p>
            </div>
            <div className="flex-1 w-full max-w-xl overflow-y-auto no-scrollbar py-4">
               <div className="grid grid-cols-2 gap-3 mb-4">
                  {CONDITIONS.map((item) => (
                    <button key={item.id} onClick={() => toggleCondition(item.id)} className={`flex flex-col items-center justify-center p-2 rounded-[24px] border-[2px] h-[100px] transition-all ${selectedConditions.includes(item.id) ? THEME_REVEAL.selected : THEME_REVEAL.unselected}`}>
                      <div className="mb-2 text-[#E65473]">{item.icon}</div>
                      <span className="text-[13px] font-bold">{item.title}</span>
                    </button>
                  ))}
               </div>
               <button onClick={toggleNone} className={`w-full py-3.5 mb-6 rounded-full border-[1.5px] font-semibold text-[15px] ${noneSelected ? 'bg-white border-[#E65473] text-[#E65473]' : 'bg-white border-gray-200 text-slate-400'}`}>✓ None of the Above</button>
               
               <h3 className="text-[15px] font-bold text-center mb-2">Activity Level</h3>
               <div className="flex flex-col gap-2.5">
                  {ACTIVITIES.map((act) => (
                    <button key={act.id} onClick={() => setSelectedActivity(act.id)} className={`w-full py-3.5 px-5 rounded-[22px] border-[2px] flex justify-between ${selectedActivity === act.id ? THEME_REVEAL.selected : THEME_REVEAL.unselected}`}>
                      <span className="font-bold text-[15px]">{act.title}</span>
                      {selectedActivity === act.id && <CheckCircle2 size={22} className="fill-[#E65473] text-white" />}
                    </button>
                  ))}
               </div>
            </div>
            <div className="mt-2 shrink-0 w-full max-w-md pb-8">
              <button onClick={handlePhase1Continue} disabled={!canContinue} className={`w-full h-14 rounded-full font-bold text-lg text-white shadow-xl ${canContinue ? `bg-gradient-to-b ${THEME_REVEAL.brandGradient}` : 'bg-slate-300'}`}>Build My Plan</button>
            </div>
        </div>
      )}

      {phase === 'personalizing' && (
        <div className="flex flex-col items-center justify-center h-full px-8">
          <AICoreView />
          {!showChecklist && <div className="mt-12 text-center h-20"><h2 className="text-4xl font-extrabold text-[#E65473] animate-pulse"><TypewriterText text={personalizingStatus} /></h2></div>}
          {showChecklist && <div className="w-full max-w-sm flex flex-col animate-in slide-in-from-bottom-8"><h2 className="text-2xl font-bold text-white text-center mb-6">Personalizing...</h2><div className="space-y-3">{["Analyzing Profile...", "Selecting Exercises...", "Optimizing Schedule..."].map((item, idx) => <ChecklistItem key={idx} text={item} delay={idx * 800} onComplete={idx === 2 ? onChecklistComplete : undefined} />)}</div></div>}
          <div className="absolute bottom-8 w-full max-w-md px-8"><div className="h-1.5 bg-white/10 rounded-full"><div className="h-full bg-[#E65473] transition-all duration-100 ease-linear" style={{ width: `${progressPercent}%` }} /></div></div>
        </div>
      )}

      {phase === 'showingTimeline' && (
        <div className="flex flex-col h-full animate-in fade-in duration-1000 bg-black items-center justify-center px-6 pt-12 pb-8">
            <h1 className="text-2xl font-extrabold text-center text-white mb-2"><span className="text-[#E65473]">{goalTitle}</span> Plan Ready</h1>
            <p className="text-center text-white/80 text-sm mb-4 max-w-md">{formatRichText(timelineCopy.subtitle)}</p>
            <div className="w-full max-w-md"><HolographicTimeline /></div>
            <div className="mt-8 pb-8 w-full max-w-md">
               <button onClick={onNext} className={`w-full h-14 rounded-full bg-gradient-to-r ${THEME_REVEAL.brandGradient} text-white font-bold text-lg shadow-[0_0_25px_rgba(230,84,115,0.5)] active:scale-95 transition-all`}>Unlock My Plan</button>
            </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SCREEN 6: PAYWALL SCREEN (SPLIT LAYOUT ON DESKTOP)
// ==========================================

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
const REVIEW_IMAGES = ["/review9.png", "/review1.png", "/review5.png", "/review4.png", "/review2.png"];

function PaywallScreen() {
  const router = useRouter();
  const { userDetails, saveUserData } = useUserData();
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [userCount, setUserCount] = useState(9800);
  const [showContent, setShowContent] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [dateString, setDateString] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState(false);

  const goalTitle = userDetails?.selectedTarget?.title || "Build Core Strength";
  const userName = userDetails?.name || "Ready";
  const reviews = useMemo(() => getReviewsForGoal(goalTitle), [goalTitle]);
  const buttonText = getButtonText(goalTitle);

  useEffect(() => {
    const date = new Date(); date.setDate(date.getDate() + 7);
    setDateString(date.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    setShowContent(true);
  }, []);

  useEffect(() => {
    const featureTimer = setInterval(() => setActiveFeatureIndex((p) => (p + 1) % FEATURES.length), 4000);
    const reviewTimer = setInterval(() => setCurrentReviewIndex((p) => (p + 1) % reviews.length), 5000);
    return () => { clearInterval(featureTimer); clearInterval(reviewTimer); };
  }, [reviews]);

  useEffect(() => {
    if (!showContent) return;
    let start = 9800;
    const timer = setInterval(() => { start += 5; if (start >= 10200) { setUserCount(10200); clearInterval(timer); } else setUserCount(start); }, 20);
    return () => clearInterval(timer);
  }, [showContent]);

  const handleStartPlan = async () => {
    setIsButtonLoading(true);
    if (!clientSecret) {
      try {
        const res = await fetch("/api/create-payment-intent", { method: "POST", headers: { "Content-Type": "application/json" } });
        if (!res.ok) throw new Error("Server Error");
        const data = await res.json();
        setClientSecret(data.clientSecret);
      } catch (err) {
        alert("Payment initialization failed. Please try again.");
        setIsButtonLoading(false);
        return;
      }
    }
    setIsButtonLoading(false);
    setShowCheckoutModal(true);
  };

  const getCtaSubtext = () => `Feel real progress by ${dateString}. If not, one tap full $24.99 refund.`;

  return (
    <div className="relative w-full h-full bg-[#0A0A10] overflow-hidden flex flex-col md:flex-row">
      
      {/* --- LEFT SIDE: VIDEO & SOCIAL PROOF (DESKTOP) --- */}
      <div className="fixed md:relative inset-0 md:inset-auto md:w-1/2 md:h-full z-0 pointer-events-none md:pointer-events-auto overflow-hidden">
        <video autoPlay loop muted playsInline className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? "opacity-100" : "opacity-0"}`}><source src="/paywall_video.mp4" type="video/mp4" /></video>
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute top-0 inset-x-0 h-[64px] bg-gradient-to-b from-[#0A0A10]/85 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-[64px] bg-gradient-to-t from-[#0A0A10]/95 to-transparent" />
        
        {/* Desktop Only: Overlay Text on Video */}
        <div className="hidden md:flex absolute bottom-10 left-10 flex-col gap-4 max-w-sm">
           <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <div className="flex text-yellow-400 gap-1 mb-2">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <p className="text-white font-medium italic">"I finally feel like myself again. Best decision I made this year."</p>
              <p className="text-white/70 text-sm mt-2 font-bold">- Sarah J., 34</p>
           </div>
        </div>
      </div>

      {/* --- RIGHT SIDE: CONTENT & CHECKOUT (DESKTOP) --- */}
      <div className={`
        z-10 flex-1 flex flex-col overflow-y-auto no-scrollbar px-6 pt-24 pb-32 transition-all duration-700
        md:w-1/2 md:bg-[#0A0A10] md:pt-12 md:pb-12 md:px-12 md:items-center md:justify-center
        ${showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
      `}>
        <div className="w-full max-w-md">
            <h1 className="text-[34px] md:text-[40px] font-extrabold text-white text-center mb-8 leading-tight drop-shadow-xl md:drop-shadow-none">
            <span className="text-white">{userName === "Ready" ? "Ready to" : `${userName}, ready to`}</span><br />
            <span className="capitalize text-[#E65473]">{goalTitle.replace("Stop ", "").replace("Build ", "")}</span>?
            <span className="block text-[28px] md:text-[24px] text-white mt-1">100% Money-Back Guarantee.</span>
            </h1>

            {/* Features Carousel */}
            <div className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-[24px] overflow-hidden mb-6 flex flex-col items-center shadow-2xl">
            <div className="pt-5 pb-2"><h3 className="text-[17px] font-bold text-white text-center">Your Personalized Plan Includes:</h3></div>
            <div className="relative w-full h-[140px] flex items-center justify-center">
                {FEATURES.map((feature, index) => (
                <div key={index} className={`absolute w-full flex flex-col items-center gap-3 transition-all duration-500 ease-out px-4 text-center ${index === activeFeatureIndex ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-95"}`}>
                    <div className="w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#E65473] to-[#C23A5B] flex items-center justify-center shadow-lg shadow-rose-500/30">{feature.icon}</div>
                    <span className="text-[17px] font-semibold text-white leading-tight">{feature.text}</span>
                </div>
                ))}
            </div>
            <div className="w-full px-6 pb-6 flex gap-1.5 h-1.5">{FEATURES.map((_, i) => (<div key={i} className="h-full flex-1 bg-white/20 rounded-full overflow-hidden"><div className={`h-full bg-white rounded-full transition-all ease-linear ${i === activeFeatureIndex ? "duration-[4000ms] w-full" : i < activeFeatureIndex ? "w-full" : "w-0"}`} /></div>))}</div>
            </div>

            {/* Sticky CTA (Mobile Fixed, Desktop Static) */}
            <div className={`
            fixed md:relative bottom-0 left-0 w-full z-30 px-6 pt-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] md:p-0
            bg-gradient-to-t from-[#0A0A10]/90 via-[#0A0A10]/30 to-transparent md:bg-none
            transition-all duration-700 delay-200
            ${showContent ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}
            `}>
                <button onClick={handleStartPlan} disabled={isButtonLoading} className="w-full h-[58px] rounded-full shadow-[0_0_25px_rgba(225,29,72,0.5)] flex items-center justify-center gap-2 animate-breathe hover:scale-105 active:scale-95 transition-transform relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#FF3B61] to-[#D959E8] transition-all group-hover:scale-105" />
                    <div className="relative flex items-center gap-2 z-10">{isButtonLoading && <Loader2 className="animate-spin text-white" size={24} />}<span className="text-[18px] font-bold text-white">{buttonText}</span></div>
                </button>
                <p className="text-center text-white/90 text-[12px] font-medium mt-3 leading-snug px-4 drop-shadow-md">{getCtaSubtext()}</p>
                
                {/* Footer Links */}
                <div className="flex justify-center items-center gap-3 text-[11px] font-medium text-white/50 mt-4">
                    <button onClick={() => setShowRestoreModal(true)} className="underline decoration-white/30 hover:text-white transition-colors">Restore Purchase</button>
                    <span>•</span><span>Doctor Approved</span>
                </div>
            </div>
        </div>
      </div>

      {showCheckoutModal && clientSecret && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm overflow-y-auto" onClick={() => setShowCheckoutModal(false)}>
          <div className="min-h-full flex items-center justify-center p-4">
            <Elements options={{ clientSecret, appearance: { theme: "night", variables: { colorPrimary: "#E65473", colorBackground: "#1A1A26" } } }} stripe={stripePromise}>
              <CheckoutForm onClose={() => setShowCheckoutModal(false)} />
            </Elements>
          </div>
        </div>
      )}
      {showRestoreModal && <RestoreModal onClose={() => setShowRestoreModal(false)} />}
    </div>
  );
}

// ==========================================
// HELPERS & EXPORTS
// ==========================================

const Star = ({ size, fill }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>);

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState('welcome');
  const handleNext = (nextStep) => setCurrentStep(nextStep);

  return (
    // WRAPPER: Handles the "Desktop Card" vs "Mobile Full" logic
    <div className="w-full h-full flex items-center justify-center bg-gray-50 md:py-10">
      <div className="
        w-full h-full 
        md:w-full md:max-w-5xl md:h-[800px] md:max-h-[90vh]
        bg-white md:rounded-[30px] md:shadow-2xl md:overflow-hidden relative
      ">
        {currentStep === 'welcome' && <WelcomeScreen onNext={() => handleNext('select_goal')} />}
        {currentStep === 'select_goal' && <SelectGoalScreen onNext={() => handleNext('how_it_helps')} />}
        {currentStep === 'how_it_helps' && <HowItHelpsScreen onNext={() => handleNext('intake')} />}
        {currentStep === 'intake' && <PersonalIntakeScreen onNext={() => handleNext('plan_reveal')} />}
        {currentStep === 'plan_reveal' && <PlanRevealScreen onNext={() => handleNext('paywall')} />}
        {currentStep === 'paywall' && <PaywallScreen />}
      </div>
    </div>
  );
}
