"use client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Play, Pause, SkipForward, SkipBack, CheckCircle2, 
  RotateCcw, RotateCw, Info, ChevronUp, ChevronDown 
} from 'lucide-react';
import { useUserData } from '@/context/UserDataContext';

// --- COACHING CONTENT ---
const GOAL_BRIEFS = {
  "intimacy": {
    title: "Unlock Sensation",
    text: "For intimacy, relaxation is just as important as strength. Focus on fully 'letting go' of the pelvic floor during the inhale. This increases blood flow and sensitivity."
  },
  "leak": {
    title: "Build The Seal",
    text: "Consistency creates the 'seal' that stops leaks. Focus on the lift *before* you exhale. Small, precise movements are better than big, messy ones."
  },
  "postpartum": {
    title: "Reconnect Gently",
    text: "You are rebuilding your foundation. If you see your belly 'doming' or 'coning', pause and reset. Gentle engagement is powerful."
  },
  "default": {
    title: "Your Daily 5-Min",
    text: "Consistency is your superpower. Most users see a measurable difference in control within 7 days of daily practice. Let's do this."
  }
};

// --- SUB-COMPONENTS ---

const CoachingPopup = ({ goal, onStart }) => {
  const brief = (() => {
    const g = (goal || "").toLowerCase();
    if (g.includes("intimacy") || g.includes("sex")) return GOAL_BRIEFS.intimacy;
    if (g.includes("leak") || g.includes("bladder")) return GOAL_BRIEFS.leak;
    if (g.includes("postpartum")) return GOAL_BRIEFS.postpartum;
    return GOAL_BRIEFS.default;
  })();

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-scale-up text-center">
        <div className="w-16 h-16 bg-[#E65473]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Info size={32} className="text-[#E65473]" />
        </div>
        <h2 className="text-2xl font-extrabold text-[#1A1A26] mb-3">{brief.title}</h2>
        <p className="text-[#737380] text-sm leading-relaxed mb-8">
          {brief.text}
        </p>
        <button 
          onClick={onStart}
          className="w-full h-14 bg-[#E65473] text-white font-bold text-lg rounded-xl shadow-lg shadow-pink-500/30 active:scale-95 transition-transform"
        >
          I'm Ready
        </button>
      </div>
    </div>
  );
};

const UpNextTray = ({ nextVideo, isExpanded, onToggle }) => {
  if (!nextVideo) return null;
  
  return (
    <div 
      onClick={onToggle}
      className={`absolute bottom-28 left-4 right-4 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 transition-all duration-300 overflow-hidden cursor-pointer ${isExpanded ? 'h-32' : 'h-16'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center text-white/50 text-xs font-bold">
            Next
          </div>
          <div>
            <p className="text-white text-sm font-bold truncate max-w-[200px]">{nextVideo.title}</p>
            <p className="text-white/50 text-xs">{nextVideo.duration || "1:00"}</p>
          </div>
        </div>
        {isExpanded ? <ChevronDown className="text-white/50" /> : <ChevronUp className="text-white/50" />}
      </div>
      
      {/* Expanded Details */}
      <div className={`mt-4 text-white/70 text-xs leading-relaxed transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
        <p>Prepare to transition. Keep your core engaged and breath steady.</p>
      </div>
    </div>
  );
};

export default function DailyRoutinePlayer({ playlist, onClose, onProgressMarked }) {
  const videoRef = useRef(null);
  const { userDetails } = useUserData();
  
  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false); // Start paused for popup
  const [showPopup, setShowPopup] = useState(true); // Show popup first
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0); // Current video progress %
  
  // Interstitial State
  const [showUpNextOverlay, setShowUpNextOverlay] = useState(false);
  const [countdown, setCountdown] = useState(3);
  
  // Session State
  const [isComplete, setIsComplete] = useState(false);
  const [hasMarkedForSession, setHasMarkedForSession] = useState(false);
  const [showTrayDetails, setShowTrayDetails] = useState(false);

  const currentVideo = playlist && playlist[currentIndex];
  const nextVideo = playlist && playlist[currentIndex + 1];

  // --- STARTUP LOGIC ---
  const handleStartSession = () => {
    setShowPopup(false);
    setIsPlaying(true);
    if (videoRef.current) videoRef.current.play();
  };

  // --- VIDEO LOGIC ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideo) return;

    const handleTimeUpdate = () => {
      const pct = (video.currentTime / video.duration) * 100;
      setProgress(pct);

      // Streak Logic (5-second rule)
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

  // --- TRANSITION LOGIC ---
  const triggerTransition = () => {
    setShowUpNextOverlay(true);
    setCountdown(3);
    let count = 3;
    const timer = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        setShowUpNextOverlay(false);
        setCurrentIndex(p => p + 1);
        setProgress(0);
        setIsPlaying(true); // Auto-play next
      }
    }, 1000);
  };

  // --- CONTROLS ---
  const togglePlay = () => {
    if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
    else { videoRef.current.pause(); setIsPlaying(false); }
  };

  const skip = (direction) => {
    if (direction === 'next' && nextVideo) setCurrentIndex(p => p + 1);
    if (direction === 'prev' && currentIndex > 0) setCurrentIndex(p => p - 1);
  };

  const seek = (seconds) => {
    if (videoRef.current) videoRef.current.currentTime += seconds;
  };

  // --- RENDER ---
  if (!currentVideo) return null;

  // 1. COMPLETION SCREEN
  if (isComplete) return (
    <div className="fixed inset-0 z-[100] bg-[#E65473] flex flex-col items-center justify-center p-8 animate-pop-in">
      <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-2xl animate-breathe">
        <CheckCircle2 size={64} className="text-[#E65473]" />
      </div>
      <h2 className="text-4xl font-extrabold text-white text-center mb-4">You Did It!</h2>
      <p className="text-white/90 text-center mb-12 text-lg font-medium max-w-xs">
        Daily session complete. Your consistency is building real strength.
      </p>
      <button 
        onClick={onClose} 
        className="w-full h-14 bg-white text-[#E65473] font-bold text-lg rounded-2xl shadow-lg active:scale-95 transition-transform"
      >
        Finish & Save
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
      
      {/* 2. COACHING POPUP (Overlay) */}
      {showPopup && (
        <CoachingPopup 
          goal={userDetails?.selectedTarget?.title} 
          onStart={handleStartSession} 
        />
      )}

      {/* 3. VIDEO LAYER */}
      <div className="relative flex-1 bg-gray-900 flex items-center justify-center overflow-hidden" onClick={() => setShowControls(p => !p)}>
        <video
          ref={videoRef}
          src={currentVideo.url}
          className="w-full h-full object-cover"
          playsInline
          // Video auto-plays only if popup is gone
          autoPlay={!showPopup} 
        />
        
        {/* TRANSITION OVERLAY */}
        {showUpNextOverlay && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-30 animate-fade-in">
            <p className="text-white/60 text-sm font-bold uppercase tracking-widest mb-4">Up Next</p>
            <h3 className="text-white text-3xl font-bold mb-8 text-center px-6">{nextVideo?.title}</h3>
            <div className="w-24 h-24 rounded-full border-4 border-[#E65473] flex items-center justify-center">
               <span className="text-5xl font-bold text-white animate-pulse">{countdown}</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. CONTROLS UI (Top & Bottom Bars) */}
      <div className={`absolute inset-0 pointer-events-none flex flex-col justify-between transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* TOP BAR: Segmented Progress */}
        <div className="p-6 pt-12 pointer-events-auto bg-gradient-to-b from-black/80 to-transparent">
           <div className="flex gap-1 mb-4">
             {playlist.map((_, idx) => (
               <div key={idx} className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
                 <div 
                   className={`h-full bg-white transition-all duration-300 ${idx < currentIndex ? 'w-full' : idx === currentIndex ? 'w-full origin-left scale-x-[var(--prog)]' : 'w-0'}`} 
                   style={idx === currentIndex ? { '--prog': progress / 100, transform: `scaleX(${progress/100})` } : {}}
                 />
               </div>
             ))}
           </div>
           
           <div className="flex justify-between items-start">
              <div>
                <h2 className="text-white text-xl font-bold leading-tight">{currentVideo.title}</h2>
                <p className="text-white/60 text-xs font-medium mt-1">
                  Exercise {currentIndex + 1} of {playlist.length}
                </p>
              </div>
              <button onClick={onClose} className="p-2 bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors">
                <X className="text-white" size={24} />
              </button>
           </div>
        </div>

        {/* BOTTOM BAR: Controls & Queue */}
        <div className="p-6 pb-10 pointer-events-auto bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          
          {/* Up Next Tray */}
          {nextVideo && !showUpNextOverlay && (
            <UpNextTray 
              nextVideo={nextVideo} 
              isExpanded={showTrayDetails} 
              onToggle={(e) => { e.stopPropagation(); setShowTrayDetails(p => !p); }} 
            />
          )}

          {/* Main Controls */}
          <div className="flex items-center justify-between px-2 mt-20"> {/* Margin top pushes it down if tray is missing */}
            
            {/* Rewind 10s */}
            <button onClick={(e) => { e.stopPropagation(); seek(-10); }} className="text-white/80 hover:text-white p-2">
              <RotateCcw size={28} />
            </button>

            {/* Prev */}
            <button onClick={(e) => { e.stopPropagation(); skip('prev'); }} disabled={currentIndex === 0} className="text-white/80 disabled:opacity-30 p-2">
              <SkipBack size={32} />
            </button>

            {/* Play/Pause (Big) */}
            <button 
              onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-95 transition-transform"
            >
              {isPlaying ? (
                <Pause size={36} className="text-[#1A1A26] fill-[#1A1A26]" />
              ) : (
                <Play size={36} className="text-[#1A1A26] fill-[#1A1A26] ml-1" />
              )}
            </button>

            {/* Next */}
            <button onClick={(e) => { e.stopPropagation(); skip('next'); }} disabled={!nextVideo} className="text-white/80 disabled:opacity-30 p-2">
              <SkipForward size={32} />
            </button>

            {/* Forward 10s */}
            <button onClick={(e) => { e.stopPropagation(); seek(10); }} className="text-white/80 hover:text-white p-2">
              <RotateCw size={28} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
