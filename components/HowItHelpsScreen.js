"use client";
import React, { useEffect, useState } from 'react';
import { useUserData } from '@/context/UserDataContext';

// Logic from Swift 'generatePersonalizedContent'
const contentMap = {
  "Prepare for Pregnancy": {
    subtitle: "Your plan will build a strong, supportive foundation for a healthy pregnancy.",
    benefits: ["Gentle prep for birth", "Pelvic floor ready", "Core strong for birth", "Support your bump", "Ease back and hips", "Calm body & mind"]
  },
  "Recover Postpartum": {
    subtitle: "Your plan is designed to safely rebuild your foundation and restore your core.",
    benefits: ["Pelvic floor restored", "Core reconnected", "Gentle, safe progress", "Lift baby with ease", "Back supported", "C-section friendly"]
  },
  "Build Core Strength": {
    subtitle: "Your plan focuses on building deep, functional strength for better posture.",
    benefits: ["Stronger, deeper core", "Confident lifts", "Run tall, run free", "Posture that holds", "Injury risk reduced", "Deeper core breath"]
  },
  // Default fallback
  "default": {
    subtitle: "Your plan focuses on creating a stable, balanced core for effortless posture.",
    benefits: ["Balanced, stable core", "Steady on your feet", "Walk tall", "Back feels supported", "Stronger hips", "Stable movement"]
  }
};

export default function HowItHelpsScreen({ onNext }) {
  const { userDetails } = useUserData();
  const [animate, setAnimate] = useState(false);

  // Get content based on selected target
  const goalTitle = userDetails.selectedTarget?.title || "Build Core Strength";
  const data = contentMap[goalTitle] || contentMap["default"];

  useEffect(() => {
    setTimeout(() => setAnimate(true), 200);
  }, []);

  return (
    <div className="w-full h-full flex flex-col pt-12 px-6 pb-8 bg-app-background">
      
      {/* Header */}
      <h1 className="text-2xl font-bold text-center text-app-textPrimary mb-3 animate-fade-in">
        Here's how we'll <span className="text-app-primary">{goalTitle}</span>
      </h1>
      <p className="text-center text-app-textSecondary text-[16px] mb-12 animate-fade-in delay-100">
        {data.subtitle}
      </p>

      {/* Constellation Animation */}
      <div className="relative flex-1 w-full flex items-center justify-center">
        {/* Center Node */}
        <div className={`absolute z-20 bg-white p-4 rounded-full shadow-xl shadow-app-primary/20 transition-all duration-700 ${animate ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
           <svg width="40" height="40" className="text-app-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z" /></svg>
        </div>

        {/* Satellite Nodes */}
        {data.benefits.map((text, index) => {
          const angle = (index * (360 / data.benefits.length)) * (Math.PI / 180);
          const radius = 130; // Distance from center
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <React.Fragment key={index}>
              {/* Dashed Line */}
              <svg className="absolute top-1/2 left-1/2 overflow-visible pointer-events-none" style={{ transform: 'translate(-50%, -50%)' }} width="300" height="300">
                <line 
                  x1="150" y1="150" 
                  x2={150 + x} y2={150 + y} 
                  stroke="#EBEBF0" 
                  strokeWidth="2" 
                  strokeDasharray="6 4"
                  className={animate ? "animate-draw-line" : "opacity-0"}
                  style={{ animationDelay: `${0.3 + (index * 0.1)}s` }}
                />
              </svg>

              {/* Node Card */}
              <div 
                className={`absolute bg-white px-3 py-2 rounded-xl shadow-md border border-app-borderIdle flex flex-col items-center gap-1 transition-all duration-500`}
                style={{ 
                  transform: `translate(${x}px, ${y}px)`,
                  opacity: animate ? 1 : 0,
                  transitionDelay: `${0.5 + (index * 0.1)}s`,
                  width: '100px'
                }}
              >
                <div className="text-app-primary">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>
                </div>
                <span className="text-[11px] font-semibold text-center text-app-textPrimary leading-tight">
                  {text}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Button */}
      <button 
        onClick={onNext}
        className="w-full h-14 bg-app-primary text-white font-bold text-lg rounded-full shadow-lg shadow-app-primary/30 active:scale-95 transition-transform animate-fade-in"
        style={{ animationDelay: '1.5s' }}
      >
        Next: Personalize My Plan
      </button>
    </div>
  );
}
