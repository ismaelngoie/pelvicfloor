"use client";
import React, { useEffect, useState } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { CheckCircle2, Lock, Sparkles } from 'lucide-react';

// --- DATA: Timeline Logic (Mapped from Swift) ---
const timelineData = {
  "Prepare for Pregnancy": {
    subtitle: "Feel ready to carry and move with ease by {date}.",
    insights: ["Built for your BMI to protect joints.", "Short, steady sessions for your busy schedule.", "Deep core focus for a growing belly.", "Safe low-pressure positions."]
  },
  "Recover Postpartum": {
    subtitle: "Feel steady holding your baby again by {date}.",
    insights: ["Calibrated to protect healing tissue.", "Works on low-sleep days.", "Rebuilds core connection for lifting.", "Scar-tissue friendly progressions."]
  },
  "Stop Bladder Leaks": {
    subtitle: "Confident coughs, laughs, and workouts by {date}.",
    insights: ["Tuned to manage pelvic pressure.", "Quick squeeze training for urge delay.", "Fast-twitch pulses for real control.", "Rebuilds trust in your body."]
  },
  "default": {
    subtitle: "Your personalized plan is set. Feel the difference by {date}.",
    insights: ["Calibrated for your specific body type.", "Builds foundation safely to prevent injury.", "Neuro-muscular connection focus.", "Modified for your specific needs."]
  }
};

// --- COMPONENT: Holographic Graph (The "Curve") ---
const HolographicGraph = () => (
  <div className="relative w-full h-48 my-6 flex items-center justify-center">
    {/* SVG Curve */}
    <svg width="100%" height="100%" viewBox="0 0 300 150" className="overflow-visible">
      <defs>
        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E65473" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#E65473" stopOpacity="1" />
          <stop offset="100%" stopColor="#E65473" stopOpacity="1" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* The Animated Line */}
      <path 
        d="M 0,140 C 100,130 120,80 300,20" 
        fill="none" 
        stroke="url(#lineGradient)" 
        strokeWidth="4"
        filter="url(#glow)"
        className="animate-draw-line"
        strokeDasharray="400"
        strokeDashoffset="400"
      />
      
      {/* Floating Milestones */}
      <circle cx="50" cy="130" r="4" fill="white" className="animate-fade-in delay-300" />
      <circle cx="150" cy="80" r="4" fill="white" className="animate-fade-in delay-700" />
      <circle cx="280" cy="25" r="6" fill="white" stroke="#E65473" strokeWidth="3" className="animate-fade-in delay-1000" />
    </svg>

    {/* Labels */}
    <div className="absolute top-4 right-0 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-white text-xs font-bold animate-fade-in delay-1000">
      Goal Reached 🏆
    </div>
  </div>
);

// --- COMPONENT: Particle Background ---
const ParticleBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute bg-white/20 rounded-full animate-float"
          style={{
            width: Math.random() * 4 + 2 + 'px',
            height: Math.random() * 4 + 2 + 'px',
            top: Math.random() * 100 + '%',
            left: Math.random() * 100 + '%',
            animationDuration: Math.random() * 10 + 10 + 's',
            animationDelay: Math.random() * 5 + 's',
          }}
        />
      ))}
    </div>
  );
};

// --- MAIN SCREEN ---
export default function PlanRevealScreen({ onNext }) {
  const { userDetails } = useUserData();
  const [showContent, setShowContent] = useState(false);

  // Get Date 7 days from now
  const date = new Date();
  date.setDate(date.getDate() + 7);
  const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Get Text
  const goalTitle = userDetails.selectedTarget?.title || "default";
  const content = timelineData[goalTitle] || timelineData["default"];
  const subtitle = content.subtitle.replace("{date}", dateString);

  useEffect(() => {
    setTimeout(() => setShowContent(true), 200);
  }, []);

  return (
    <div className="relative w-full h-[100dvh] bg-slate-900 text-white overflow-hidden flex flex-col">
      {/* Dark Background for Holographic Effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-app-primary/20 z-0" />
      <ParticleBackground />

      <div className={`z-10 flex-1 flex flex-col items-center px-6 pt-12 pb-8 overflow-y-auto no-scrollbar transition-opacity duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Headline */}
        <h1 className="text-3xl font-bold text-center mb-2 leading-tight">
          <span className="text-app-primary">{userDetails.name || "Your"}</span> path to<br/>{goalTitle} is ready.
        </h1>
        <p className="text-center text-white/80 text-[15px] mb-4">
          {subtitle}
        </p>

        {/* The Graph */}
        <HolographicGraph />

        {/* Insights List */}
        <div className="w-full flex flex-col gap-4 mt-4">
          <h3 className="text-lg font-semibold text-center mb-2">Your Personal Insights</h3>
          {content.insights.map((insight, index) => (
            <div 
              key={index}
              className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm animate-slide-up"
              style={{ animationDelay: `${index * 0.15 + 0.5}s` }}
            >
              <div className="bg-app-primary/20 p-2 rounded-full shrink-0 text-app-primary">
                <Sparkles size={18} />
              </div>
              <p className="text-sm text-white/90 leading-relaxed font-medium">
                {insight}
              </p>
            </div>
          ))}
        </div>
        
        {/* Spacer */}
        <div className="h-24"></div>
      </div>

      {/* Sticky Bottom CTA */}
      <div className="absolute bottom-0 w-full px-6 pb-8 pt-6 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent z-20">
        <button 
          onClick={onNext}
          className="w-full h-14 bg-gradient-to-r from-app-primary to-rose-500 text-white font-bold text-lg rounded-full shadow-lg shadow-app-primary/40 flex items-center justify-center gap-2 animate-breathe active:scale-95 transition-transform"
        >
          <Lock size={18} /> Unlock My Plan
        </button>
        <p className="text-center text-xs text-white/40 mt-3 font-medium">
          Secure checkout • 100% Money-back guarantee
        </p>
      </div>

    </div>
  );
}
