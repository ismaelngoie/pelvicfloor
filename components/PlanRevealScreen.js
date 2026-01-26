"use client";
import React, { useState, useEffect } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { 
  Check, HeartHandshake, Baby, Droplets, User, 
  Activity, Sparkles, Lock, CheckCircle2, Circle
} from 'lucide-react';

// --- THEME & ASSETS ---
const THEME = {
  // Unselected: Clean, modern, slight grey border
  unselected: "bg-white border-gray-200 text-slate-900",
  iconUnselected: "text-app-primary opacity-80", 
  
  // Selected: High contrast, brand color, shadow pop
  selected: "bg-white border-app-primary text-app-primary shadow-xl shadow-pink-200/50 scale-[1.02] z-10",
  iconSelected: "text-app-primary scale-110",
  
  // Helper Text Color
  helper: "text-emerald-500", // Green as requested
};

const CONDITIONS = [
  { id: 'pain', title: 'Pelvic Pain', icon: <HeartHandshake size={26} /> },
  { id: 'postpartum', title: 'Postpartum', icon: <Baby size={26} /> },
  { id: 'leaks', title: 'Incontinence', icon: <Droplets size={26} /> },
  { id: 'prostate', title: 'Prostate', icon: <User size={26} /> },
];

const ACTIVITIES = [
  { id: 'sedentary', title: 'Sedentary', sub: '(mostly sitting)' },
  { id: 'moderate', title: 'Lightly Active', sub: '(daily walks)' },
  { id: 'active', title: 'Very Active', sub: '(regular workouts)' },
];

// --- 1. HEALTH COPY (Phase 1) ---
const getHealthCopy = (goal) => {
  const map = {
    "Improve Intimacy": { headline: "Any health notes before we boost intimacy?", subtitle: "I’ll tailor for comfort, arousal, and pelvic tone.", cta: "Build My Intimacy Plan" },
    "Stop Bladder Leaks": { headline: "Any health notes before we target leaks?", subtitle: "This helps me map safe, effective bladder-control sessions.", cta: "Build My Leak-Free Plan" },
    "Prepare for Pregnancy": { headline: "Any health notes before we prep for pregnancy?", subtitle: "I’ll prioritize circulation, breath, and core support.", cta: "Build My Prep Plan" },
    "Recover Postpartum": { headline: "Any health notes before we rebuild gently?", subtitle: "I’ll keep everything postpartum-safe and progressive.", cta: "Build My Postpartum Plan" },
    "Build Core Strength": { headline: "Any health notes before we strengthen your core?", subtitle: "This ensures smart progressions and safe loading.", cta: "Build My Core Plan" },
    "Ease Pelvic Pain": { headline: "Any health notes before we ease pain?", subtitle: "I’ll protect sensitive ranges and focus on release first.", cta: "Build My Pain-Relief Plan" },
    "Support My Fitness": { headline: "Any health notes before we support your training?", subtitle: "I’ll sync to your routine and recovery needs.", cta: "Build My Fitness Plan" },
    "Boost Stability": { headline: "Any health notes before we boost stability?", subtitle: "I’ll align mobility + deep core for posture wins.", cta: "Build My Stability Plan" },
    "default": { headline: "Any health notes?", subtitle: "Ensures every move is safe & tailored.", cta: "Build My Custom Plan" }
  };
  return map[goal] || map["default"];
};

// --- 2. PERSONALIZING COPY (Phase 2) ---
const getPersonalizingCopy = (goal, name) => {
  const safeName = name || "there";
  const map = {
    "Improve Intimacy": { title: `Designing your intimacy plan, ${safeName}`, subtitle: "Maximizing comfort & sensation.", connecting: "Mapping arousal flows...", calibrating: "Tuning pelvic tone...", checklist: ["Comfort-first warmups", "Relax/contract patterns", "Tone for sensation", "Partner positions"] },
    "Stop Bladder Leaks": { title: "Personalizing your leak-control plan", subtitle: "Reflex training for dry days.", connecting: "Analyzing trigger points...", calibrating: "Building reflex loops...", checklist: ["Urge-delay reflexes", "Fast-twitch squeezes", "Breath control", "Run/jump confidence"] },
    "Prepare for Pregnancy": { title: "Personalizing your prep plan", subtitle: "Circulation, breath, and support.", connecting: "Checking core safety...", calibrating: "Adjusting for trimester...", checklist: ["Circulation boosters", "Deep core layering", "Hip mobility", "Labor-prep positions"] },
    "Recover Postpartum": { title: "Personalizing your recovery", subtitle: "Gentle rebuilding for core & floor.", connecting: "Scanning recovery zones...", calibrating: "Setting gentle pace...", checklist: ["Diastasis-safe core", "Scar tissue release", "Posture realignment", "Lift-and-carry safety"] },
    "Build Core Strength": { title: "Personalizing your core plan", subtitle: "Deep, steady strength.", connecting: "Measuring base strength...", calibrating: "Loading progressions...", checklist: ["Deep activation", "Anti-rotation", "Hinge mechanics", "Back-safe loading"] },
    "Ease Pelvic Pain": { title: "Personalizing your relief plan", subtitle: "Release tension, add support.", connecting: "Identifying tension...", calibrating: "Soothing nerves...", checklist: ["Nerve flossing", "Trigger point release", "Gentle strengthening", "Daily resets"] },
    "Support My Fitness": { title: "Personalizing for performance", subtitle: "Powering your workouts.", connecting: "Syncing training load...", calibrating: "Optimizing recovery...", checklist: ["Pre-workout priming", "Intra-set breathing", "Post-workout release", "Stability drills"] },
    "Boost Stability": { title: "Personalizing your stability", subtitle: "Balance and posture wins.", connecting: "Analyzing posture...", calibrating: "Fixing imbalances...", checklist: ["Single-leg balance", "Deep stabilizer work", "Posture correction", "Gait mechanics"] },
    "default": { title: `Personalizing your plan, ${safeName}`, subtitle: "Crafting your custom routine.", connecting: "Analyzing profile...", calibrating: "Building routine...", checklist: ["Custom exercises", "Deep insights", "Expert tips", "Community support"] }
  };
  return map[goal] || map["default"];
};

// --- 3. TIMELINE COPY (Phase 3) ---
const getTimelineCopy = (goal) => {
  const map = {
    "Improve Intimacy": { subtitle: "More comfort & sensation by {date}.", insights: ["Paced for your BMI to boost blood flow.", "Relaxed release + strong tone.", "Reflex tuning for better arousal.", "Positions adapted for your needs."], cta: "Unlock My Intimacy Plan" },
    "Stop Bladder Leaks": { subtitle: "Confident coughs & laughs by {date}.", insights: ["Tuned to your BMI to manage pressure.", "Quick squeeze training for urge delay.", "Fast-twitch pulses for real control.", "Rebuilds trust in your body."], cta: "Unlock My Leak-Free Plan" },
    "Prepare for Pregnancy": { subtitle: "Feel supported & ready by {date}.", insights: ["Safe core engagement for bump support.", "Pelvic floor relaxation for labor.", "Breathwork for stress reduction.", "Post-birth recovery prep."], cta: "Unlock My Pregnancy Prep" },
    "Recover Postpartum": { subtitle: "Feel like yourself again by {date}.", insights: ["Gradual core reconnection.", "Safe for diastasis recti.", "Posture support for breastfeeding.", "Energy-boosting gentle movement."], cta: "Unlock My Postpartum Plan" },
    "Build Core Strength": { subtitle: "Visible definition & power by {date}.", insights: ["Progressive overload for your body type.", "Targeting deep transverse abs.", "Improving functional movement.", "Protecting lower back."], cta: "Unlock My Core Plan" },
    "Ease Pelvic Pain": { subtitle: "Move without pain by {date}.", insights: ["Gentle release techniques.", "Strengthening supporting muscles.", "Nervous system down-regulation.", "Daily pain-management tools."], cta: "Unlock My Pain Relief Plan" },
    "Support My Fitness": { subtitle: "Hit new PRs safely by {date}.", insights: ["Core stability for heavy lifts.", "Injury prevention protocols.", "Active recovery sessions.", "Performance-focused breathing."], cta: "Unlock My Fitness Plan" },
    "Boost Stability": { subtitle: "Effortless posture & balance by {date}.", insights: ["Deep stabilizer activation.", "Balance challenges for daily life.", "Alignment correction.", "Fall prevention techniques."], cta: "Unlock My Stability Plan" },
    "default": { subtitle: "Feel the difference by {date}.", insights: ["Calibrated for your body type.", "Builds foundation safely.", "Neuro-muscular connection focus.", "Modified for your specific needs."], cta: "Unlock My Personal Plan" }
  };
  return map[goal] || map["default"];
};

// --- HELPER LOGIC ---
const getHelperCopy = (selected, goal) => {
  const g = goal || "";
  if (selected) {
    if (g.includes("Leak")) return "✓ Got it. I’ll train urge delay and sneeze-proof reflexes.";
    if (g.includes("Pain")) return "✓ Noted. We’ll protect sensitive ranges.";
    if (g.includes("Intimacy")) return "✓ Noted. I’ll focus on comfort & tone.";
    if (g.includes("Pregnancy")) return "✓ Noted. Safety first for you and baby.";
    if (g.includes("Postpartum")) return "✓ Noted. Gentle rebuilding is key.";
    if (g.includes("Fitness")) return "✓ Noted. I'll match your intensity.";
    return "✓ Understood. I'll tailor your plan accordingly.";
  } else {
    return "✓ Great! We'll start with a foundational plan.";
  }
};

// --- SUB-COMPONENTS ---

// 1. AI Core Animation (Breathing & Rotating)
const AICore = () => (
  <div className="relative w-32 h-32 flex items-center justify-center">
    <div className="absolute inset-0 border-[3px] border-app-primary/40 rounded-full animate-[spin_8s_linear_infinite] border-t-transparent" />
    <div className="absolute inset-2 border-[2px] border-white/30 rounded-full animate-[spin_12s_linear_infinite_reverse] border-b-transparent" />
    <div className="absolute w-12 h-12 bg-app-primary rounded-full blur-xl animate-pulse" />
    <div className="relative w-8 h-8 bg-white rounded-full shadow-[0_0_20px_rgba(230,84,115,0.8)]" />
  </div>
);

// 2. Typewriter Effect Component
const TypewriterText = ({ text }) => {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    setDisplayedText(""); // Reset on text change
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 40); // Speed of typing
    return () => clearInterval(timer);
  }, [text]);

  return <span>{displayedText}<span className="animate-pulse">|</span></span>;
};

// 3. Holographic Graph
const HolographicGraph = () => {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(true), []);
  
  return (
    <div className="w-full h-40 relative my-4">
      <svg className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#E65473" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#E65473" stopOpacity="1" />
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        {/* Line */}
        <path d="M 0,120 C 80,110 150,60 320,20" fill="none" stroke="url(#lineGrad)" strokeWidth="4" strokeLinecap="round" filter="url(#glow)"
              className={`transition-all duration-[2s] ease-out ${show ? 'stroke-dasharray-[400] stroke-dashoffset-0' : 'stroke-dasharray-[400] stroke-dashoffset-[400]'}`} />
        
        {/* Animated Rider Dot */}
        <circle r="6" fill="white" className="animate-ride-line">
           <animateMotion dur="2s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1">
              <mpath href="#graphPath" />
           </animateMotion>
        </circle>
        <path id="graphPath" d="M 0,120 C 80,110 150,60 320,20" fill="none" />

        {/* Milestones */}
        <g className={`transition-opacity duration-1000 delay-1000 ${show ? 'opacity-100' : 'opacity-0'}`}>
           <circle cx="0" cy="120" r="4" fill="white" />
           <text x="10" y="140" fill="white" fontSize="10" opacity="0.7">Today</text>
           <circle cx="320" cy="20" r="6" fill="#E65473" stroke="white" strokeWidth="2" />
           <text x="290" y="15" fill="#E65473" fontSize="12" fontWeight="bold">Goal</text>
        </g>
      </svg>
    </div>
  );
};

export default function PlanRevealScreen({ onNext }) {
  const { userDetails, saveUserData } = useUserData();
  const [phase, setPhase] = useState('health'); 
  
  // Phase 1
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [isNone, setIsNone] = useState(false);
  const [activity, setActivity] = useState(null);
  const [helperText, setHelperText] = useState("");
  const [activityHelper, setActivityHelper] = useState("");
  
  // Phase 2
  const [progress, setProgress] = useState(0);
  const [analysisText, setAnalysisText] = useState("Connecting...");
  const [checklistVisible, setChecklistVisible] = useState(0);
  
  // Phase 3
  const [showTimeline, setShowTimeline] = useState(false);

  // Safe Data Access
  const goalTitle = userDetails?.selectedTarget?.title || "Build Core Strength";
  const healthCopy = getHealthCopy(goalTitle);
  const personalizingCopy = getPersonalizingCopy(goalTitle, userDetails?.name);
  const timelineCopy = getTimelineCopy(goalTitle);

  // --- ACTIONS ---
  const toggleCondition = (id) => {
    setIsNone(false);
    setSelectedConditions(prev => {
      const newSet = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
      updateHelpers(newSet.length > 0, activity);
      return newSet;
    });
  };
  
  const toggleNone = () => {
    const newVal = !isNone;
    setIsNone(newVal);
    if (newVal) setSelectedConditions([]);
    updateHelpers(newVal, activity);
  };

  const selectActivity = (act) => {
    setActivity(act);
    updateHelpers(selectedConditions.length > 0 || isNone, act);
    setActivityHelper("✓ Perfect, I'll match your pace & recovery.");
  };

  const updateHelpers = (hasCond, hasAct) => {
    if (hasCond) setHelperText(getHelperCopy(true, goalTitle));
    else setHelperText("");
  };

  const handleHealthContinue = () => {
    saveUserData('healthConditions', selectedConditions);
    saveUserData('activityLevel', activity);
    startAnalysis();
  };

  // --- ANALYSIS ANIMATION ENGINE ---
  const startAnalysis = () => {
    setPhase('analyzing');
    const DURATION = 7000;
    const interval = 50;
    let step = 0;
    const maxSteps = DURATION / interval;

    // Start with "Connecting" text
    setAnalysisText(personalizingCopy.connecting);

    const timer = setInterval(() => {
      step++;
      const pct = Math.min(100, Math.round((step / maxSteps) * 100));
      setProgress(pct);

      // Text updates at specific percentages
      if (pct === 30) setAnalysisText(personalizingCopy.calibrating);
      if (pct === 60) setAnalysisText("Finalizing custom plan...");

      // Checklist Reveal
      if (pct > 20 && pct < 30) setChecklistVisible(1);
      if (pct > 40 && pct < 50) setChecklistVisible(2);
      if (pct > 60 && pct < 70) setChecklistVisible(3);
      if (pct > 80 && pct < 90) setChecklistVisible(4);

      if (step >= maxSteps) {
        clearInterval(timer);
        setPhase('timeline');
        setTimeout(() => setShowTimeline(true), 100);
      }
    }, interval);
  };

  // Timeline Data
  const date = new Date(); date.setDate(date.getDate() + 7);
  const dateString = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  const formattedInsights = timelineCopy.insights.slice(0, 3).map(t => {
    return t.replace("{bmi}", "22.4")
            .replace("{activity}", activity ? ACTIVITIES.find(a => a.id === activity)?.title.toLowerCase() : "active")
            .replace("{age}", userDetails?.age || "30")
            .replace("{condition}", selectedConditions.length > 0 ? "needs" : "body");
  });

  return (
    <div className={`relative w-full h-full flex flex-col transition-colors duration-700 ease-in-out overflow-hidden
      ${phase === 'health' ? 'bg-app-background' : 'bg-slate-950'}`}>
      
      {/* ================= PHASE 1: HEALTH INTAKE (One Screen) ================= */}
      {phase === 'health' && (
        <div className="flex flex-col h-full w-full px-5 pt-4 pb-4 animate-fade-in relative z-10 bg-app-background">
          
          <div className="text-center mb-2 shrink-0">
            <h1 className="text-2xl font-extrabold text-app-textPrimary mb-1 leading-tight">{healthCopy.headline}</h1>
            <p className="text-app-textSecondary text-sm">{healthCopy.subtitle}</p>
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto no-scrollbar pb-2">
            {/* Grid */}
            <div className="grid grid-cols-2 gap-2 mb-2 shrink-0">
              {CONDITIONS.map((c) => {
                const active = selectedConditions.includes(c.id);
                return (
                  <button key={c.id} onClick={() => toggleCondition(c.id)}
                    className={`relative flex flex-col items-center justify-center p-2 rounded-[24px] border-[2px] transition-all duration-300 active:scale-95 h-24 outline-none
                      ${active ? THEME.selected : THEME.unselected}`}
                  >
                    <div className={`mb-1 ${active ? THEME.iconSelected : THEME.iconUnselected}`}>{c.icon}</div>
                    <span className="text-xs font-bold text-center leading-tight">{c.title}</span>
                    {active ? (
                      <div className="absolute top-2 right-2"><CheckCircle2 size={18} className="fill-app-primary text-white" /></div>
                    ) : (
                      <div className="absolute top-2 right-2"><Circle size={18} className="text-gray-300" /></div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Helper 1 */}
            <div className={`h-4 text-center text-xs font-bold ${THEME.helper} transition-opacity duration-300 ${helperText ? 'opacity-100' : 'opacity-0'}`}>
              {helperText}
            </div>

            {/* None Button */}
            <button onClick={toggleNone}
              className={`w-full py-3.5 rounded-[20px] border-[2px] font-semibold text-sm mb-3 mt-1 transition-all outline-none shrink-0 active:scale-95 flex items-center justify-center gap-2
                ${isNone ? THEME.selected : THEME.unselected}`}
            >
              {isNone && <Check size={16} strokeWidth={3} />} None of the above
            </button>

            {/* Activity */}
            <h3 className="text-sm font-bold text-center mb-2 text-app-textPrimary shrink-0">Your activity level</h3>
            <div className="flex flex-col gap-2">
              {ACTIVITIES.map((a) => {
                const active = activity === a.id;
                return (
                  <button key={a.id} onClick={() => setActivity(a.id)}
                    className={`w-full py-3.5 px-4 rounded-[20px] border-[2px] text-left flex items-center justify-between transition-all duration-300 active:scale-95 outline-none shrink-0
                      ${active ? THEME.selected : THEME.unselected}`}
                  >
                    <span className="font-bold text-sm">
                      {a.title} <span className="font-normal opacity-60 text-xs ml-1">{a.sub}</span>
                    </span>
                    {active ? <CheckCircle2 size={20} className="fill-app-primary text-white" /> : <Circle size={20} className="text-gray-300" />}
                  </button>
                );
              })}
            </div>

            {/* Helper 2 */}
            <div className={`h-4 text-center text-xs font-bold ${THEME.helper} transition-opacity duration-300 mt-2 ${activityHelper ? 'opacity-100' : 'opacity-0'}`}>
              {activityHelper}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-2 shrink-0 pt-2 z-50">
            <button onClick={handleHealthContinue} disabled={(!isNone && selectedConditions.length === 0) || !activity}
              className={`w-full h-12 font-bold text-lg rounded-full transition-all duration-300 shadow-lg
                ${((isNone || selectedConditions.length > 0) && activity) ? 'bg-app-primary text-white animate-breathe shadow-pink-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              {healthCopy.cta}
            </button>
          </div>
        </div>
      )}

      {/* ================= PHASE 2: ANALYSIS (7s Animation) ================= */}
      {phase === 'analyzing' && (
        <div className="flex flex-col items-center justify-center h-full px-8 text-white relative bg-slate-950">
          <AICore />
          
          <div className="h-20 flex flex-col justify-center items-center mt-6 mb-4">
             <h2 className="text-2xl font-bold text-center animate-slide-up bg-clip-text text-transparent bg-gradient-to-r from-white to-pink-200">
               {personalizingCopy.title}
             </h2>
             <div className="text-sm font-mono text-app-primary mt-2">
                <TypewriterText text={analysisText} />
             </div>
          </div>
          
          <div className="w-full max-w-xs space-y-4 mb-10 min-h-[180px]">
            {personalizingCopy.checklist.map((item, idx) => (
              <div key={idx} className={`flex items-center gap-3 transition-all duration-500 ${idx < checklistVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                <div className="w-6 h-6 rounded-full bg-app-primary flex items-center justify-center shrink-0">
                  <Check size={14} strokeWidth={3} className="text-white" />
                </div>
                <span className="text-sm font-medium text-white/90">{item}</span>
              </div>
            ))}
          </div>

          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs text-white/60 mb-2">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-app-primary transition-all duration-75 ease-linear" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* ================= PHASE 3: TIMELINE (Paywall Transition) ================= */}
      {phase === 'timeline' && (
        <div className={`flex flex-col h-full bg-slate-950 relative transition-opacity duration-1000 ${showTimeline ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex-1 flex flex-col items-center px-6 pt-10 pb-6 z-10">
            <h1 className="text-2xl font-extrabold text-white text-center mb-2 leading-tight">
              <span className="text-app-primary">{userDetails?.name || "Your"}</span> path to<br/>{goalTitle} is ready.
            </h1>
            <p className="text-center text-white/70 text-sm mb-4">{timelineCopy.subtitle.replace("{date}", dateString)}</p>
            
            <HolographicGraph />

            <div className="w-full space-y-3 mt-6">
              <h3 className="text-white font-bold text-sm mb-2">Your Personal Insights</h3>
              {formattedInsights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm animate-slide-up" style={{ animationDelay: `${0.5 + (index*0.2)}s` }}>
                  <div className="bg-app-primary/20 p-1.5 rounded-full text-app-primary shrink-0"><Sparkles size={16}/></div>
                  <span className="text-xs text-white/90 font-medium leading-relaxed">{insight}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 pb-8 pt-4 bg-slate-950 z-20 shrink-0">
            <button onClick={onNext} className="w-full h-12 bg-gradient-to-r from-app-primary to-rose-600 text-white font-bold text-lg rounded-full shadow-lg shadow-pink-900/50 flex items-center justify-center gap-2 animate-breathe active:scale-95">
              <Lock size={18} /> {timelineCopy.cta}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
