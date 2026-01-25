"use client";
import React, { useEffect, useState } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { 
  Leaf, Zap, Activity, Shield, Droplets, Heart, 
  Dumbbell, PersonStanding, CheckCircle2, Sparkles, Move
} from 'lucide-react';

// --- 1. DATA MAPPING (Matches Swift "generatePersonalizedContent") ---
const benefitsData = {
  "Prepare for Pregnancy": {
    subtitle: "Your plan will build a strong, supportive foundation for a healthy pregnancy and smoother recovery.",
    icon: <BabyIcon size={40} />,
    benefits: [
      { icon: <Leaf size={20}/>, text: "Gentle prep for birth" },
      { icon: <Heart size={20}/>, text: "Pelvic floor ready" },
      { icon: <Dumbbell size={20}/>, text: "Core strong for birth" },
      { icon: <PersonStanding size={20}/>, text: "Support your bump" },
      { icon: <Move size={20}/>, text: "Ease back and hips" },
      { icon: <Sparkles size={20}/>, text: "Calm body, calm mind" }
    ]
  },
  "Recover Postpartum": {
    subtitle: "Your plan is designed to safely rebuild your foundation and restore your core after pregnancy.",
    icon: <Heart size={40} />,
    benefits: [
      { icon: <Heart size={20}/>, text: "Pelvic floor restored" },
      { icon: <Activity size={20}/>, text: "Core reconnected" },
      { icon: <Shield size={20}/>, text: "Gentle, safe progress" },
      { icon: <PersonStanding size={20}/>, text: "Lift baby with ease" },
      { icon: <Move size={20}/>, text: "Back feels supported" },
      { icon: <Leaf size={20}/>, text: "C-section friendly" }
    ]
  },
  "Build Core Strength": {
    subtitle: "Your plan focuses on building deep, functional strength for better posture, power, and stability.",
    icon: <Zap size={40} />,
    benefits: [
      { icon: <Zap size={20}/>, text: "Stronger, deeper core" },
      { icon: <Dumbbell size={20}/>, text: "Confident lifts" },
      { icon: <Activity size={20}/>, text: "Run tall, run free" },
      { icon: <PersonStanding size={20}/>, text: "Posture that holds" },
      { icon: <Shield size={20}/>, text: "Injury risk reduced" },
      { icon: <Leaf size={20}/>, text: "Deeper core breath" }
    ]
  },
  "Stop Bladder Leaks": {
    subtitle: "Your plan focuses on building a reliable 'leakproof seal' for total confidence in your daily life.",
    icon: <Shield size={40} />,
    benefits: [
      { icon: <Droplets size={20}/>, text: "Sneeze without worry" },
      { icon: <Activity size={20}/>, text: "Run and jump freely" },
      { icon: <Leaf size={20}/>, text: "Drier nights" },
      { icon: <Zap size={20}/>, text: "Urgency under control" },
      { icon: <Dumbbell size={20}/>, text: "Confident workouts" },
      { icon: <CheckCircle2 size={20}/>, text: "Leave pads behind" }
    ]
  },
  "Ease Pelvic Pain": {
    subtitle: "Your plan focuses on gentle release and building supportive strength to bring you lasting relief.",
    icon: <Leaf size={40} />, // Bandage equivalent
    benefits: [
      { icon: <PersonStanding size={20}/>, text: "Pain-free sitting" },
      { icon: <Move size={20}/>, text: "Comfort in movement" },
      { icon: <Leaf size={20}/>, text: "Sleep through night" },
      { icon: <Sparkles size={20}/>, text: "Gentle daily relief" },
      { icon: <Heart size={20}/>, text: "Enjoy intimacy again" },
      { icon: <Zap size={20}/>, text: "Release deep tension" }
    ]
  },
  "Improve Intimacy": {
    subtitle: "Your plan focuses on enhancing sensation, comfort, and confidence for a more fulfilling intimate life.",
    icon: <Heart size={40} />,
    benefits: [
      { icon: <Heart size={20}/>, text: "More sensation" },
      { icon: <Sparkles size={20}/>, text: "Stronger orgasms" },
      { icon: <Leaf size={20}/>, text: "Comfort in intimacy" },
      { icon: <PersonStanding size={20}/>, text: "Confidence returns" },
      { icon: <Activity size={20}/>, text: "Feel close again" },
      { icon: <Zap size={20}/>, text: "Pelvic tone improved" }
    ]
  },
  "Support My Fitness": {
    subtitle: "Your plan will build the foundational core strength that powers all your other athletic goals.",
    icon: <Dumbbell size={40} />, // Trophy equivalent
    benefits: [
      { icon: <Move size={20}/>, text: "Stronger every day" },
      { icon: <Dumbbell size={20}/>, text: "Safe, guided workouts" },
      { icon: <Activity size={20}/>, text: "Cardio, core, control" },
      { icon: <Zap size={20}/>, text: "Progress you can feel" },
      { icon: <Leaf size={20}/>, text: "5-min plan, daily" },
      { icon: <PersonStanding size={20}/>, text: "Move with confidence" }
    ]
  },
  "Boost Stability": { // Shortened title from SelectGoalScreen
    subtitle: "Your plan focuses on creating a stable, balanced core for effortless posture and confident movement.",
    icon: <PersonStanding size={40} />,
    benefits: [
      { icon: <PersonStanding size={20}/>, text: "Balanced, stable core" },
      { icon: <Activity size={20}/>, text: "Steady on your feet" },
      { icon: <Move size={20}/>, text: "Walk tall, no wobble" },
      { icon: <Shield size={20}/>, text: "Back feels supported" },
      { icon: <Dumbbell size={20}/>, text: "Stronger hips, knees" },
      { icon: <Zap size={20}/>, text: "Stable side to side" }
    ]
  }
};

// Helper Icon for Baby since it was missing in standard map
function BabyIcon({ size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.5 1.5.5 2 0"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg>
}

export default function HowItHelpsScreen({ onNext }) {
  const { userDetails } = useUserData();
  const [animate, setAnimate] = useState(false);

  // Retrieve Content
  const goalTitle = userDetails.selectedTarget?.title || "Build Core Strength";
  // Handle case where title might slightly mismatch or default
  const data = benefitsData[goalTitle] || benefitsData["Build Core Strength"];

  useEffect(() => {
    setTimeout(() => setAnimate(true), 200);
  }, []);

  return (
    <div className="w-full h-full flex flex-col pt-12 px-4 pb-8 animate-fade-in relative bg-app-background overflow-hidden">
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-app-primary/5 rounded-full blur-3xl -z-10" />

      {/* Header */}
      <div className="z-10 text-center mb-4">
        <h1 className="text-3xl font-bold text-app-textPrimary mb-4 leading-tight animate-slide-up">
          Here's how we'll <br/><span className="text-app-primary">{goalTitle}</span>
        </h1>
        <p className="text-app-textSecondary text-[16px] leading-relaxed px-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {data.subtitle}
        </p>
      </div>

      {/* Constellation Animation */}
      <div className="flex-1 w-full relative flex items-center justify-center min-h-[350px]">
        
        {/* Center Hub */}
        <div className={`absolute z-20 bg-white p-6 rounded-full shadow-xl shadow-app-primary/15 text-app-primary border border-app-borderIdle transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) ${animate ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
           {data.icon}
        </div>

        {/* Satellites */}
        {data.benefits.map((benefit, index) => {
          const total = data.benefits.length;
          // Calculate position in a circle (Radius 135px fits well on mobile)
          const radius = 135;
          const angle = (index / total) * 2 * Math.PI - (Math.PI / 2); // Start from top
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <React.Fragment key={index}>
              {/* Connector Line (SVG) */}
              <svg 
                className="absolute top-1/2 left-1/2 pointer-events-none overflow-visible -z-10" 
                style={{ width: '0px', height: '0px' }}
              >
                <line 
                  x1="0" y1="0" 
                  x2={x} y2={y} 
                  stroke="#EBEBF0" 
                  strokeWidth="2" 
                  strokeDasharray="6 4"
                  className={`transition-all duration-1000 ease-out ${animate ? 'opacity-100' : 'opacity-0'}`}
                  style={{ transitionDelay: `${0.3 + (index * 0.1)}s` }}
                />
              </svg>

              {/* Benefit Node */}
              <div 
                className={`absolute flex flex-col items-center gap-1.5 transition-all duration-500`}
                style={{ 
                  transform: `translate(${x}px, ${y}px)`,
                  opacity: animate ? 1 : 0,
                  transitionDelay: `${0.5 + (index * 0.1)}s`,
                  width: '90px' // Limit width for text wrapping
                }}
              >
                {/* Node Icon */}
                <div className="bg-white p-2.5 rounded-2xl shadow-md border border-app-borderIdle text-app-primary">
                  {benefit.icon}
                </div>
                {/* Node Text */}
                <span className="text-[11px] font-bold text-center text-app-textPrimary leading-tight bg-app-background/80 backdrop-blur-sm px-1 rounded">
                  {benefit.text}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="z-20 pt-2 shrink-0">
        <button 
          onClick={onNext}
          className="w-full h-14 bg-gradient-to-r from-app-primary to-rose-500 text-white font-bold text-lg rounded-full shadow-lg shadow-app-primary/30 active:scale-95 transition-transform animate-fade-in"
          style={{ animationDelay: '1.2s' }}
        >
          Next: Personalize My Plan
        </button>
      </div>

    </div>
  );
}
