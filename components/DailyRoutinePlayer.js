"use client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Play, Pause, SkipForward, SkipBack, CheckCircle2, 
  RotateCcw, RotateCw, Info, ChevronUp, ChevronDown, Sparkles, Volume2, VolumeX, List
} from 'lucide-react';
import { useUserData } from '@/context/UserDataContext';

// --- 1. EXTENSIVE COACHING CONTENT ---
// Expanded to cover every possible user goal with medical-grade clarity.
const GOAL_BRIEFS = {
  "intimacy": {
    title: "Unlock Sensation",
    text: "For better intimacy, we focus on the 'Release'. A tight pelvic floor actually reduces sensation. Focus on fully letting go during the inhale.",
    instruction: "Follow the instructor's breathing pace. Do not squeeze 100% hard; 50% effort is enough."
  },
  "leak": {
    title: "The Dryness Seal",
    text: "We are building the 'Knack'—the reflexive squeeze before a cough. Consistency creates a seal that stops leaks before they happen.",
    instruction: "Focus on the lift *before* you exhale. Small, precise movements are better than big, messy ones."
  },
  "postpartum": {
    title: "Safe Reconnection",
    text: "Your body is healing. We avoid traditional crunches to protect your abs (Diastasis Recti). We focus on deep inner core connection.",
    instruction: "If you see your belly 'coning' or 'doming', stop immediately and reset. Gentle is powerful."
  },
  "prolapse": {
    title: "Lift & Support",
    text: "Gravity is the enemy here. These moves are designed to work against gravity, pulling organs back into a supported position.",
    instruction: "Do not hold your breath. Exhale on the exertion (the lift). Breath holding pushes organs down."
  },
  "menopause": {
    title: "Revitalize & Strengthen",
    text: "Decreased estrogen thins pelvic tissues. Movement brings blood flow, collagen, and elasticity back to the area.",
    instruction: "Movement might feel subtle. That is okay. Visualize the muscles lifting like an elevator."
  },
  "core": {
    title: "Deep Core Armor",
    text: "A strong pelvic floor is the foundation of a flat, functional core. We work from the inside out.",
    instruction: "Keep your spine neutral. Don't tuck your tailbone. Imagine zipping up a tight pair of jeans."
  },
  "default": {
    title: "Daily Foundation",
    text: "Consistency is your superpower. Most users see a measurable difference in control within 7 days of daily practice.",
    instruction: "Follow the video exactly. One set per day is all you need. Quality over quantity."
  }
};

// --- SUB-COMPONENTS ---

// A. The "Pre-Flight" Coaching Modal
const CoachingPopup = ({ goal, onStart }) => {
  const brief = (() => {
    const g = (goal || "").toLowerCase();
    if (g.includes("intimacy") || g.includes("sex")) return GOAL_BRIEFS.intimacy;
    if (g.includes("leak") || g.includes("bladder")) return GOAL_BRIEFS.leak;
    if (g.includes("postpartum") || g.includes("baby")) return GOAL_BRIEFS.postpartum;
    if (g.includes("prolapse") || g.includes("heavy")) return GOAL_BRIEFS.prolapse;
    if (g.includes("menopause")) return GOAL_BRIEFS.menopause;
    if (g.includes("core") || g.includes("strength")) return GOAL_BRIEFS.core;
    return GOAL_BRIEFS.default;
  })();

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-scale-up text-center relative overflow-hidden">
        {/* Decorative Background Blob */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#E65473]/10 to-transparent pointer-events-none" />
        
        <div className="w-20 h-20 bg-[#E65473]/10 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
          <Sparkles size={40} className="text-[#E65473]" />
        </div>
        
        <h2 className="text-3xl font-extrabold text-[#1A1A26] mb-2 leading-tight">{brief.title}</h2>
        <p className="text-[#E65473] font-bold text-xs uppercase tracking-widest mb-6">Session Focus</p>
        
        <div className="text-left bg-gray-50 rounded-2xl p-5 mb-8">
          <p className="text-[#737380] text-sm leading-relaxed mb-4">
            {brief.text}
          </p>
          <div className="flex gap-3 items-start">
            <Info size={18} className="text-[#E65473] shrink-0 mt-0.5" />
            <p className="text-[#1A1A26] text-sm font-semibold italic">
              "{brief.instruction}"
            </p>
          </div>
        </div>

        <button 
          onClick={onStart}
          className="w-full h-14 bg-[#E65473] text-white font-bold text-lg rounded-2xl shadow-lg shadow-pink-500/30 active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <Play size={20} fill="currentColor" /> Start Session
        </button>
      </div>
    </div>
  );
};

// B. Instructions Drawer (Slide Up)
const InstructionsDrawer = ({ isOpen, onClose, currentVideo }) => {
  return (
    <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] transition-transform duration-500 ease-in-out z-30 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="p-6 pb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-[#1A1A26]">How to Follow</h3>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
            <ChevronDown size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-2xl border border-purple-100">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">1x</div>
            <div>
              <p className="font-bold text-[#1A1A26]">Follow Along</p>
              <p className="text-xs text-gray-500">Do exactly what the instructor does. No need to count reps.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">1 Set</div>
            <div>
              <p className="font-bold text-[#1A1A26]">One Round Only</p>
              <p className="text-xs text-gray-500">This 5-minute session is your complete workout for today.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">Tip</div>
            <div>
              <p className="font-bold text-[#1A1A26]">Quality {'>'} Quantity</p>
              <p className="text-xs text-gray-500">If you get tired, pause. Sloppy reps don't build strength.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PLAYER COMPONENT ---
export default function DailyRoutinePlayer({ playlist, onClose, onProgressMarked }) {
  const videoRef = useRef(null);
  const { userDetails } = useUserData();
  
  // Player State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPopup, setShowPopup] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  
  // Transition State
  const [showTransition, setShowTransition] = useState(false);
  const [countdown, setCountdown] = useState(3);
  
  // Completion State
  const [isComplete, setIsComplete] = useState(false);
  const [hasMarkedForSession, setHasMarkedForSession] = useState(false);

  const currentVideo = playlist && playlist[currentIndex];
  const nextVideo = playlist && playlist[currentIndex + 1];

  // --- LOGIC ---

  const handleStartSession = () => {
    setShowPopup(false);
    setIsPlaying(true);
    // Slight delay to ensure video DOM is ready
    setTimeout(() => {
      if (videoRef.current) videoRef.current.play();
    }, 100);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideo) return;

    const handleTimeUpdate = () => {
      const pct = (video.currentTime / video.duration) * 100;
      setProgress(pct);

      if (video.currentTime > 5 && !hasMarkedForSession) {
        setHasMarkedForSession(true);
        if (onProgressMarked) onProgressMarked();
      }
    };

    const handleEnded = () => {
      if (nextVideo) {
        triggerTransition();
      } else {
        setIsComplete(true);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentIndex, nextVideo, hasMarkedForSession]);

  const triggerTransition = () => {
    setShowTransition(true);
    setCountdown(3);
    let count = 3;
    const timer = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        setShowTransition(false);
        setCurrentIndex(p => p + 1);
        setProgress(0);
        setIsPlaying(true);
      }
    }, 1000);
  };

  const togglePlay = () => {
    if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
    else { videoRef.current.pause(); setIsPlaying(false); }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const seek = (val) => { if (videoRef.current) videoRef.current.currentTime += val; };
  const skip = (direction) => {
    if (direction === 'next' && nextVideo) setCurrentIndex(p => p + 1);
    if (direction === 'prev' && currentIndex > 0) setCurrentIndex(p => p - 1);
  };

  if (!currentVideo) return null;

  // 1. COMPLETION SCREEN (Celebration)
  if (isComplete) return (
    <div className="fixed inset-0 z-[100] bg-[#E65473] flex flex-col items-center justify-center p-8 animate-pop-in">
      <div className="absolute inset-0 bg-[url('/confetti.png')] opacity-20 animate-pulse"></div>
      <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl animate-breathe z-10">
        <CheckCircle2 size={64} className="text-[#E65473]" />
      </div>
      <h2 className="text-4xl font-extrabold text-white text-center mb-4 z-10">Streak Saved!</h2>
      <p className="text-white/90 text-center mb-12 text-lg font-medium max-w-xs z-10">
        Daily session complete. Your consistency is building real strength.
      </p>
      <button 
        onClick={onClose} 
        className="w-full h-14 bg-white text-[#E65473] font-bold text-lg rounded-2xl shadow-lg active:scale-95 transition-transform z-10"
      >
        Finish & Return Home
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col h-full overflow-hidden">
      
      {/* 2. POPUP */}
      {showPopup && (
        <CoachingPopup 
          goal={userDetails?.selectedTarget?.title} 
          onStart={handleStartSession} 
        />
      )}

      {/* 3. VIDEO AREA (Top 70-75%) */}
      <div className="relative h-[70vh] w-full bg-gray-900 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          src={currentVideo.url}
          className="w-full h-full object-contain"
          playsInline
          autoPlay={!showPopup} 
        />
        
        {/* Video Overlay Controls (Mute/Close) */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20">
           <button onClick={onClose} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors">
             <X size={20} />
           </button>
           <button onClick={toggleMute} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors">
             {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
           </button>
        </div>

        {/* Transition Overlay */}
        {showTransition && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-30 animate-fade-in">
            <p className="text-white/60 text-sm font-bold uppercase tracking-widest mb-4">Up Next</p>
            <h3 className="text-white text-3xl font-bold mb-8 text-center px-6">{nextVideo?.title}</h3>
            <div className="w-24 h-24 rounded-full border-4 border-[#E65473] flex items-center justify-center">
               <span className="text-5xl font-bold text-white animate-pulse">{countdown}</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. COMMAND CENTER (Bottom 30%) */}
      <div className="h-[30vh] bg-white rounded-t-[32px] -mt-6 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] flex flex-col">
        
        {/* Drag Handle */}
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {/* Info Area */}
        <div className="px-6 pt-2 pb-2 flex justify-between items-center">
          <div>
            <p className="text-[#E65473] text-xs font-bold uppercase tracking-wider mb-1">
              Step {currentIndex + 1} of {playlist.length}
            </p>
            <h2 className="text-[#1A1A26] text-xl font-extrabold truncate max-w-[250px]">{currentVideo.title}</h2>
          </div>
          <button 
            onClick={() => setShowInstructions(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-bold text-[#1A1A26] hover:bg-gray-200 transition-colors"
          >
            <List size={14} /> Instructions
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4">
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#E65473] transition-all duration-200 ease-linear" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
             <span className="text-[10px] font-bold text-gray-400">0:00</span>
             <span className="text-[10px] font-bold text-gray-400">1:00</span>
          </div>
        </div>

        {/* Main Controls (Big Buttons for Accessibility) */}
        <div className="flex-1 flex items-center justify-between px-8 pb-6">
           <button onClick={() => seek(-10)} className="p-3 text-gray-400 hover:text-[#1A1A26] transition-colors">
             <RotateCcw size={28} />
           </button>

           <div className="flex items-center gap-6">
             <button onClick={() => skip('prev')} disabled={currentIndex === 0} className="text-[#1A1A26] disabled:opacity-20 transition-opacity">
               <SkipBack size={32} />
             </button>

             <button 
               onClick={togglePlay} 
               className="w-20 h-20 bg-[#E65473] rounded-[28px] flex items-center justify-center shadow-xl shadow-pink-500/40 active:scale-95 transition-transform"
             >
               {isPlaying ? (
                 <Pause size={36} className="text-white fill-white" />
               ) : (
                 <Play size={36} className="text-white fill-white ml-1" />
               )}
             </button>

             <button onClick={() => skip('next')} disabled={!nextVideo} className="text-[#1A1A26] disabled:opacity-20 transition-opacity">
               <SkipForward size={32} />
             </button>
           </div>

           <button onClick={() => seek(10)} className="p-3 text-gray-400 hover:text-[#1A1A26] transition-colors">
             <RotateCw size={28} />
           </button>
        </div>
      </div>

      {/* Instructions Drawer Overlay */}
      <InstructionsDrawer 
        isOpen={showInstructions} 
        onClose={() => setShowInstructions(false)} 
        currentVideo={currentVideo} 
      />

    </div>
  );
}
