"use client";
import React, { useState, useEffect } from 'react';
import { useUserData } from '@/context/UserDataContext';
import { 
  Check, HeartHandshake, Baby, Droplets, User, 
  Activity, Sparkles, Lock, CheckCircle2, Circle
} from 'lucide-react';

// --- THEME & ASSETS ---
const THEME = {
  // Unselected: Clean white, grey border, black text
  unselected: "bg-white border-gray-200 text-slate-900",
  iconUnselected: "text-rose-400", // Rose colored icon even when unselected
  
  // Selected: Pop effect, rose border, rose shadow
  selected: "bg-white border-rose-500 text-rose-600 shadow-xl shadow-rose-200 scale-[1.02] z-20",
  iconSelected: "text-rose-500 scale-110",
  
  // Helper Text Color
  helper: "text-emerald-500", // The Green you asked for
  
  // Brand Gradients
  brandGradient: "from-rose-500 to-rose-600",
};

// --- DATA ---
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

// --- COPY LOGIC (Ported from Swift) ---
const getHealthCopy = (goal) => {
  const map = {
    "Stop Bladder Leaks": { headline: "Any health notes before we target leaks?", subtitle: "This helps me map safe, effective bladder-control sessions.", cta: "Build My Leak-Free Plan" },
    "Ease Pelvic Pain": { headline: "Any health notes before we ease pain?", subtitle: "I’ll protect sensitive ranges and focus on release first.", cta: "Build My Pain-Relief Plan" },
    "Improve Intimacy": { headline: "Any health notes before we boost intimacy?", subtitle: "I’ll tailor for comfort, arousal, and pelvic tone.", cta: "Build My Intimacy Plan" },
    "Recover Postpartum": { headline: "Any health notes before we rebuild gently?", subtitle: "I’ll keep everything postpartum-safe and progressive.", cta: "Build My Postpartum Plan" },
    "Prepare for Pregnancy": { headline: "Any health notes before we prep for pregnancy?", subtitle: "I’ll prioritize circulation, breath, and core support.", cta: "Build My Prep Plan" },
    "Build Core Strength": { headline: "Any health notes before we strengthen your core?", subtitle: "This ensures smart progressions and safe loading.", cta: "Build My Core Plan" },
    "Support My Fitness": { headline: "Any health notes before we support your training?", subtitle: "I’ll sync to your routine and recovery needs.", cta: "Build My Fitness Plan" },
    "Boost Stability": { headline: "Any health notes before we boost stability?", subtitle: "I’ll align mobility + deep core for posture wins.", cta: "Build My Stability Plan" },
    "default": { headline: "Last step! Any health notes?", subtitle: "This ensures every exercise is safe and perfectly tailored to you.", cta: "Build My Custom Plan" }
  };
  return map[goal] || map["default"];
};

const getHelperCopy = (selected, goal) => {
  if (selected) {
    if (goal.includes("Leak")) return "✓ Got it. I’ll train urge delay and sneeze-proof reflexes.";
    if (goal.includes("Pain")) return "✓ Noted. We’ll protect sensitive ranges and release tension first.";
    if (goal.includes("Intimacy")) return "✓ Noted. I’ll focus on comfort, arousal flow, and pelvic tone.";
    if (goal.includes("Postpartum")) return "✓ Noted. We’ll keep it postpartum-safe with gentle progressions.";
    if (goal.includes("Pregnancy")) return "✓ Noted. I’ll prioritize breath, circulation, and foundation.";
    if (goal.includes("Core")) return "✓ Noted. Smart progressions, no risky strain.";
    if (goal.includes("Fitness")) return "✓ Noted. I’ll match your training load and recovery.";
    if (goal.includes("Stability")) return "✓ Noted. Deep core + alignment for steady posture wins.";
    return "✓ Understood. I'll tailor your plan accordingly.";
  } else {
    if (goal.includes("Leak")) return "✓ Great. We’ll start with core reflexes for leak control.";
    if (goal.includes("Pain")) return "✓ Great. Gentle release + support from day one.";
    if (goal.includes("Intimacy")) return "✓ Great. Comfort, sensation, and confidence from the start.";
    if (goal.includes("Postpartum")) return "✓ Great. Foundation work, safe and steady.";
    if (goal.includes("Pregnancy")) return "✓ Great. Building a strong, calm base for you.";
    if (goal.includes("Core")) return "✓ Great. Clean technique and deep core activation.";
    if (goal.includes("Fitness")) return "✓ Great. We’ll slot in perfectly with your routine.";
    if (goal.includes("Stability")) return "✓ Great. Alignment + deep core integration ahead.";
    return "✓ Great! We'll start with a foundational plan.";
  }
};

const getPersonalizingCopy = (goal, name) => {
  const safeName = name || "there";
  const map = {
    "Improve Intimacy": { title: `Designing your intimacy plan`, subtitle: "Comfort, sensation, confidence—gently built for your body.", connecting: "Checking your profile for arousal flow and comfort…", calibrating: "Balancing relax/contract patterns for stronger orgasms…", checklist: ["Comfort-first warmups", "Relax/contract patterns", "Tone for stronger orgasms", "Partner-friendly positions"] },
    "Stop Bladder Leaks": { title: "Personalizing your leak-control plan", subtitle: "Train reflexes so sneezes and laughs don’t own your day.", connecting: "Mapping urge delays and quick-contract sets…", calibrating: "Dialing breath and pressure control for real-life moments…", checklist: ["Urge-delay reflex training", "Fast-twitch squeezes", "Breath + pressure control", "Run/jump confidence drills"] },
    "Ease Pelvic Pain": { title: "Personalizing your pain-relief plan", subtitle: "Release tension, add support, and keep comfort front and center.", connecting: "Identifying tight patterns and sensitive ranges…", calibrating: "Layering gentle strength for lasting relief…", checklist: ["Down-train tight muscles", "Nerve-calming breath", "Gentle glute + core support", "Daily posture resets"] },
    "Recover Postpartum": { title: "Personalizing your postpartum plan", subtitle: "Kind, steady rebuilding for your core, hips, and back.", connecting: "Checking diastasis-safe progressions…", calibrating: "Tuning lifts and carries so daily life feels stable…", checklist: ["Core connection breath", "Diastasis-safe moves", "Hip + back relief", "Lift-and-carry practice"] },
    "Prepare for Pregnancy": { title: "Personalizing your prep plan", subtitle: "Circulation, breath, and a supportive core.", connecting: "Syncing breath-led endurance…", calibrating: "Setting hip mobility and pelvic coordination…", checklist: ["Circulation + breath", "Pelvic floor coordination", "Hip mobility", "Labor-prep positions"] },
    "Build Core Strength": { title: "Personalizing your core plan", subtitle: "Deep, steady strength without guesswork.", connecting: "Targeting activation and timing…", calibrating: "Building anti-rotation and hinge patterns…", checklist: ["Deep core activation", "Anti-rotation work", "Hinge + squat mechanics", "Back-friendly progressions"] },
    "Support My Fitness": { title: "Personalizing your training support", subtitle: "Make every workout you do feel more solid.", connecting: "Priming brace and breath for lifts/cardio…", calibrating: "Matching intensity to recovery…", checklist: ["Pre-workout core priming", "Brace + breathe", "Recovery mobilization", "Force transfer training"] },
    "Boost Stability": { title: "Personalizing your stability plan", subtitle: "Tall, steady, and organized all day.", connecting: "Stacking rib-to-pelvis alignment…", calibrating: "Endurance for postural muscles…", checklist: ["Stack-and-breathe", "Midline endurance", "Glute med activation", "Desk reset routine"] },
    "default": { title: `Personalizing your plan`, subtitle: "Tall, steady, and organized all day.", connecting: "Stacking rib-to-pelvis alignment…", calibrating: "Endurance for postural muscles…", checklist: ["Stack-and-breathe", "Midline endurance", "Glute med activation", "Desk reset routine"] }
  };
  return map[goal] || map["default"];
};

const getTimelineCopy = (goal) => {
  const map = {
    "Prepare for Pregnancy": { subtitle: "Feel ready to carry and move with ease by **{date}**.", insights: ["Built for your body (BMI **{bmi}**) so joints and pelvic floor stay happy.", "Because you’re **{activity}**, sessions are short, steady, and stick.", "At **{age}**, we train calm breath and deep core for a growing belly.", "Safe for **{condition}** with low-pressure positions."], cta: "Unlock My Pregnancy Prep" },
    "Recover Postpartum": { subtitle: "Feel steady holding your baby again by **{date}**.", insights: ["Calibrated for your body (BMI **{bmi}**) to protect healing tissue.", "Matched to **{activity}**—works on low-sleep days.", "At **{age}**, we rebuild core connection so feeds, lifts, and stroller walks feel easier.", "Adjusted for **{condition}** including scar or tender areas."], cta: "Unlock My Postpartum Plan" },
    "Build Core Strength": { subtitle: "Feel solid through your middle by **{date}**.", insights: ["Built for your body (BMI **{bmi}**)—strong, not stressful.", "Because you’re **{activity}**, sessions slot right into your day.", "At **{age}**, we focus on clean form and deep bracing you can feel.", "Respects **{condition}** with safe ranges."], cta: "Unlock My Core Plan" },
    "Stop Bladder Leaks": { subtitle: "Confident coughs, laughs, and workouts by **{date}**.", insights: ["Tuned to your body (BMI **{bmi}**) to manage pressure.", "With **{activity}**, we train quick squeezes and urge delay you can use anywhere.", "At **{age}**, we blend long holds with fast pulses for real control.", "Plan respects **{condition}** while we rebuild trust."], cta: "Unlock My Leak-Free Plan" },
    "Ease Pelvic Pain": { subtitle: "Less ache sitting, standing, and at bedtime by **{date}**.", insights: ["Built for your body (BMI **{bmi}**) to lower strain.", "**{activity}** friendly—start quiet, calm the system first.", "At **{age}**, we pair soft release with light strength that lasts.", "Guided by **{condition}** so every range feels safe."], cta: "Unlock My Pain Relief Plan" },
    "Improve Intimacy": { subtitle: "More arousal, easy comfort, and reliable orgasm by **{date}**.", insights: ["Paced for your body (BMI **{bmi}**) to boost blood flow without pressure.", "With **{activity}**, we build relaxed release *and* strong tone for better sensation.", "At **{age}**, we tune reflexes so arousal starts sooner and orgasm lands stronger.", "Positions and pacing adjusted for **{condition}** so comfort stays high."], cta: "Unlock My Intimacy Plan" },
    "Support My Fitness": { subtitle: "More power in lifts, runs, and classes by **{date}**.", insights: ["Calibrated for your body (BMI **{bmi}**) so intensity helps, not hurts.", "Synced to **{activity}**—easy to stack with training.", "At **{age}**, we pair stability with power you feel next workout.", "Safeguards in place for **{condition}**."], cta: "Unlock My Fitness Plan" },
    "Boost Stability": { subtitle: "Feel taller and steady from desk to steps by **{date}**.", insights: ["Built for your body (BMI **{bmi}**)—steady holds you can keep all day.", "Because you’re **{activity}**, we target sitting time, walks, and carrying.", "At **{age}**, we train deep timing so standing and stairs feel smooth.", "Aligned with **{condition}**—easy on back, hips, and neck."], cta: "Unlock My Stability Plan" },
    "default": { subtitle: "Your personalized plan is set. Expect to feel a real difference by **{date}**.", insights: ["Your plan is calibrated for a BMI of **{bmi}**, ensuring perfect intensity.", "Because you have a **{activity}** activity level, we'll build your foundation safely.", "At **{age} years old**, your plan focuses on neuro-muscular connection.", "We've modified your plan to be safe and effective for your **{condition}**."], cta: "Unlock My Personal Plan" }
  };
  return map[goal] || map["default"];
};

// --- ANIMATION COMPONENTS ---

// 1. Breathing AI Core
const AICore = () => (
  <div className="relative w-36 h-36 flex items-center justify-center my-6">
    <div className="absolute inset-0 border-[3px] border-rose-500/40 rounded-full animate-[spin_8s_linear_infinite] border-t-transparent" />
    <div className="absolute inset-3 border-[2px] border-white/30 rounded-full animate-[spin_12s_linear_infinite_reverse] border-b-transparent" />
    <div className="absolute w-14 h-14 bg-rose-500 rounded-full blur-xl animate-pulse" />
    <div className="relative w-10 h-10 bg-white rounded-full shadow-[0_0_25px_rgba(244,63,94,0.8)]" />
  </div>
);

// 2. Holographic Graph with Moving Rider
const HolographicGraph = () => {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(true), []);
  
  return (
    <div className="w-full h-40 relative my-2">
      <svg className="w-full h-full overflow-visible drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#E65473" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#E65473" stopOpacity="1" />
          </linearGradient>
        </defs>
        
        {/* The Curve */}
        <path d="M 0,130 C 60,125 140,80 320,20" fill="none" stroke="url(#lineGrad)" strokeWidth="4" strokeLinecap="round"
              className={`transition-all duration-[2s] ease-out ${show ? 'stroke-dasharray-[400] stroke-dashoffset-0' : 'stroke-dasharray-[400] stroke-dashoffset-[400]'}`} />
        
        {/* The Rider (Moving Dot) */}
        <circle r="6" fill="white" className="animate-ride-line shadow-lg">
           <animateMotion dur="2s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1">
              <mpath href="#graphPath" />
           </animateMotion>
        </circle>
        
        {/* Invisible path for motion definition */}
        <path id="graphPath" d="M 0,130 C 60,125 140,80 320,20" fill="none" />

        {/* Milestones */}
        <g className={`transition-opacity duration-1000 delay-1000 ${show ? 'opacity-100' : 'opacity-0'}`}>
           <circle cx="0" cy="130" r="4" fill="white" />
           <text x="10" y="150" fill="white" fontSize="10" opacity="0.7">Today</text>
           
           <circle cx="320" cy="20" r="6" fill="#E65473" stroke="white" strokeWidth="2" />
           <text x="290" y="15" fill="#E65473" fontSize="12" fontWeight="bold">Goal</text>
        </g>
      </svg>
    </div>
  );
};

// --- MAIN SCREEN ---
export default function PlanRevealScreen({ onNext }) {
  const { userDetails, saveUserData } = useUserData();
  const [phase, setPhase] = useState('health'); // health -> analyzing -> timeline
  
  // Phase 1
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [isNone, setIsNone] = useState(false);
  const [activity, setActivity] = useState(null);
  const [helperText, setHelperText] = useState("");
  const [activityHelper, setActivityHelper] = useState("");
  
  // Phase 2
  const [progress, setProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState("Connecting...");
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

  const startAnalysis = () => {
    setPhase('analyzing');
    const DURATION = 7000;
    const interval = 50;
    let step = 0;
    const maxSteps = DURATION / interval;

    const timer = setInterval(() => {
      step++;
      const pct = Math.min(100, Math.round((step / maxSteps) * 100));
      setProgress(pct);

      if (pct === 20) setAnalysisStatus("Syncing goals...");
      if (pct === 50) setAnalysisStatus("Calibrating plan...");

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
      
      {/* ================= PHASE 1: HEALTH INTAKE (Fit on Screen) ================= */}
      {phase === 'health' && (
        <div className="flex flex-col h-full w-full px-5 pt-6 pb-4 animate-fade-in relative z-10 bg-app-background">
          
          {/* Compact Header */}
          <div className="text-center mb-2 shrink-0">
            <h1 className="text-2xl font-extrabold text-app-textPrimary mb-1 leading-tight">{healthCopy.headline}</h1>
            <p className="text-app-textSecondary text-sm">{healthCopy.subtitle}</p>
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto no-scrollbar pb-2">
            
            {/* Conditions Grid */}
            <div className="grid grid-cols-2 gap-2 mb-2 shrink-0">
              {CONDITIONS.map((c) => {
                const active = selectedConditions.includes(c.id);
                return (
                  <button key={c.id} onClick={() => toggleCondition(c.id)}
                    className={`relative flex flex-col items-center justify-center p-2 rounded-[20px] border-[2px] transition-all duration-200 active:scale-95 h-24 outline-none
                      ${active ? THEME.selected : THEME.unselected}`}
                  >
                    <div className={`mb-1 transition-transform duration-200 ${active ? 'scale-110' : ''} ${active ? 'text-rose-500' : THEME.iconUnselected}`}>
                      {c.icon}
                    </div>
                    <span className={`text-xs font-bold text-center leading-tight ${active ? 'text-rose-600' : 'text-slate-900'}`}>
                      {c.title}
                    </span>
                    {active ? (
                      <div className="absolute top-2 right-2"><CheckCircle2 size={18} className="fill-rose-500 text-white" /></div>
                    ) : (
                      <div className="absolute top-2 right-2"><Circle size={18} className="text-gray-200" strokeWidth={1.5} /></div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Helper Text 1: GREEN */}
            <div className={`h-4 text-center text-xs font-bold ${THEME.helper} transition-opacity duration-300 ${helperText ? 'opacity-100' : 'opacity-0'}`}>
              {helperText}
            </div>

            {/* None Button */}
            <button onClick={toggleNone}
              className={`w-full py-3 rounded-[20px] border-[2px] font-semibold text-sm mb-3 mt-1 transition-all outline-none shrink-0 active:scale-95
                ${isNone ? THEME.selected : THEME.unselected}`}
            >
              None of the above
            </button>

            {/* Activity Section */}
            <h3 className="text-sm font-bold text-center mb-2 text-app-textPrimary shrink-0">Your activity level</h3>
            <div className="flex flex-col gap-2">
              {ACTIVITIES.map((a) => {
                const active = activity === a.id;
                return (
                  <button key={a.id} onClick={() => selectActivity(a.id)}
                    className={`w-full py-3 px-4 rounded-[18px] border-[2px] text-left flex items-center justify-between transition-all duration-200 active:scale-95 outline-none shrink-0
                      ${active ? THEME.selected : THEME.unselected}`}
                  >
                    <span className={`font-bold text-sm ${active ? 'text-rose-600' : 'text-slate-900'}`}>
                      {a.title} <span className="font-normal opacity-60 text-xs ml-1">{a.sub}</span>
                    </span>
                    {active ? <CheckCircle2 size={20} className="fill-rose-500 text-white" /> : <Circle size={20} className="text-gray-200" strokeWidth={1.5} />}
                  </button>
                );
              })}
            </div>

            {/* Helper Text 2: GREEN */}
            <div className={`h-4 text-center text-xs font-bold ${THEME.helper} transition-opacity duration-300 mt-2 ${activityHelper ? 'opacity-100' : 'opacity-0'}`}>
              {activityHelper}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-2 shrink-0 pt-2 z-50">
            <button onClick={handleHealthContinue} disabled={(!isNone && selectedConditions.length === 0) || !activity}
              className={`w-full h-12 font-bold text-lg rounded-full transition-all duration-300 shadow-lg
                ${((isNone || selectedConditions.length > 0) && activity) ? 'bg-rose-500 text-white animate-breathe shadow-rose-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
            >
              {healthCopy.cta}
            </button>
          </div>
        </div>
      )}

      {/* ================= PHASE 2: ANALYSIS (7s) ================= */}
      {phase === 'analyzing' && (
        <div className="flex flex-col items-center justify-center h-full px-8 text-white relative bg-slate-950">
          <AICore />
          <h2 className="text-2xl font-bold text-center mt-4 mb-2 animate-slide-up bg-clip-text text-transparent bg-gradient-to-r from-white to-rose-200">
            Designing your plan...
          </h2>
          
          <div className="w-full max-w-xs space-y-4 mb-10 min-h-[180px]">
            {personalizingCopy.checklist.map((item, idx) => (
              <div key={idx} className={`flex items-center gap-3 transition-all duration-500 ${idx < checklistVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
                <div className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center shrink-0">
                  <Check size={14} strokeWidth={3} className="text-white" />
                </div>
                <span className="text-sm font-medium text-white/90">{item}</span>
              </div>
            ))}
          </div>

          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs text-white/60 mb-2">
              <span>{analysisStatus}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* ================= PHASE 3: TIMELINE (Paywall Transition) ================= */}
      {phase === 'timeline' && (
        <div className={`flex flex-col h-full bg-slate-950 relative transition-opacity duration-1000 ${showTimeline ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex-1 flex flex-col items-center px-6 pt-10 pb-6 z-10">
            <h1 className="text-2xl font-extrabold text-white text-center mb-2 leading-tight">
              <span className="text-rose-500">{userDetails?.name || "Your"}</span> path to<br/>{goalTitle} is ready.
            </h1>
            <p className="text-center text-white/70 text-sm mb-4">{timelineCopy.subtitle.replace("{date}", dateString)}</p>
            
            <HolographicGraph />

            <div className="w-full space-y-3 mt-6">
              <h3 className="text-white font-bold text-sm mb-2">Your Personal Insights</h3>
              {formattedInsights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm animate-slide-up" style={{ animationDelay: `${0.5 + (index*0.2)}s` }}>
                  <div className="bg-rose-500/20 p-1.5 rounded-full text-rose-500 shrink-0"><Sparkles size={16}/></div>
                  <span className="text-xs text-white/90 font-medium leading-relaxed">{insight}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 pb-8 pt-4 bg-slate-950 z-20 shrink-0">
            {/* The Critical onNext Call */}
            <button onClick={onNext} className="w-full h-12 bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold text-lg rounded-full shadow-lg shadow-rose-900/50 flex items-center justify-center gap-2 animate-breathe active:scale-95">
              <Lock size={18} /> {timelineCopy.cta}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
