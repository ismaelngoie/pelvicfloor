"use client";
import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, SkipForward, SkipBack, Repeat, CheckCircle2 } from 'lucide-react';
import { useUserData } from '@/context/UserDataContext';

// --- DATA: Sample Playlist Generator (Matches Swift Logic) ---
const getPlaylist = (goal) => {
  // In a real app, these URLs would come from your Firebase/JSON data
  return [
    { id: 1, title: "Deep Core Activation", duration: 60, url: "/demo_video_1.mp4" },
    { id: 2, title: "Pelvic Tilt & Release", duration: 45, url: "/demo_video_2.mp4" },
    { id: 3, title: "Controlled Breathing", duration: 60, url: "/demo_video_3.mp4" },
  ];
};

export default function DailyRoutinePlayer({ onClose }) {
  const { userDetails, saveUserData } = useUserData();
  const videoRef = useRef(null);
  
  // State
  const [playlist] = useState(() => getPlaylist(userDetails.selectedTarget?.title));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0); // 0 to 100 for current video
  const [showControls, setShowControls] = useState(true);
  const [showUpNext, setShowUpNext] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isComplete, setIsComplete] = useState(false);

  const currentVideo = playlist[currentIndex];
  const nextVideo = playlist[currentIndex + 1];

  // --- LOGIC: The "5-Second Rule" & Progress ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const pct = (video.currentTime / video.duration) * 100;
      setProgress(pct);

      // Swift Logic Port: Mark progress after 5 seconds
      if (video.currentTime > 5 && !video.hasMarkedProgress) {
        console.log("✅ 5-Second Rule: Progress Saved");
        // In a real app, dispatch to UserDataContext here
        video.hasMarkedProgress = true; 
      }
    };

    const handleEnded = () => {
      if (nextVideo) {
        triggerUpNext();
      } else {
        finishRoutine();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentIndex, nextVideo]);

  // --- LOGIC: Up Next Countdown ---
  const triggerUpNext = () => {
    setShowUpNext(true);
    setCountdown(3);
    let count = 3;
    const timer = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        setShowUpNext(false);
        setCurrentIndex(prev => prev + 1);
        setIsPlaying(true);
      }
    }, 1000);
  };

  const finishRoutine = () => {
    setIsComplete(true);
    // Trigger confetti or logic here
  };

  // --- CONTROLS ---
  const togglePlay = () => {
    if (videoRef.current.paused) videoRef.current.play();
    else videoRef.current.pause();
    setIsPlaying(!videoRef.current.paused);
  };

  const skip = (direction) => {
    if (direction === 'next' && nextVideo) setCurrentIndex(prev => prev + 1);
    if (direction === 'prev' && currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  const toggleControls = () => {
    setShowControls(prev => !prev);
  };

  if (isComplete) return <CompletionScreen onClose={onClose} />;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
      
      {/* 1. Video Layer */}
      <div className="relative flex-1 bg-gray-900" onClick={toggleControls}>
        <video
          ref={videoRef}
          src={currentVideo.url} // Replace with actual URL
          className="w-full h-full object-cover"
          autoPlay
          playsInline
        />
        
        {/* Up Next Overlay */}
        {showUpNext && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20 animate-fade-in">
            <h3 className="text-white text-2xl font-bold mb-2">Up Next</h3>
            <p className="text-app-primary text-xl mb-8">{nextVideo?.title}</p>
            <div className="text-8xl font-extrabold text-white animate-breathe">{countdown}</div>
          </div>
        )}
      </div>

      {/* 2. Controls Overlay (Fades In/Out) */}
      <div className={`absolute inset-0 pointer-events-none flex flex-col justify-between transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Top Bar */}
        <div className="p-6 flex justify-between items-start pt-12 pointer-events-auto bg-gradient-to-b from-black/60 to-transparent">
          <div>
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider">
              Exercise {currentIndex + 1} of {playlist.length}
            </p>
            <h2 className="text-white text-lg font-bold mt-1">{currentVideo.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full backdrop-blur-md">
            <X className="text-white" size={24} />
          </button>
        </div>

        {/* Bottom Bar */}
        <div className="p-8 pb-12 pointer-events-auto bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          
          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-white/20 rounded-full mb-8 overflow-hidden">
            <div 
              className="h-full bg-app-primary transition-all duration-300 ease-linear"
              style={{ width: `${progress}%` }} 
            />
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-between px-4">
            <button onClick={() => skip('prev')} disabled={currentIndex === 0} className="text-white/80 disabled:opacity-30">
              <SkipBack size={32} />
            </button>

            <button 
              onClick={togglePlay}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-transform"
            >
              {isPlaying ? (
                <Pause size={32} className="text-app-primary fill-app-primary" />
              ) : (
                <Play size={32} className="text-app-primary fill-app-primary ml-1" />
              )}
            </button>

            <button onClick={() => skip('next')} disabled={!nextVideo} className="text-white/80 disabled:opacity-30">
              <SkipForward size={32} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUBCOMPONENT: Completion Screen ---
const CompletionScreen = ({ onClose }) => (
  <div className="fixed inset-0 z-50 bg-app-primary flex flex-col items-center justify-center p-8 animate-pop-in">
    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl animate-breathe">
      <CheckCircle2 size={48} className="text-app-primary" />
    </div>
    <h2 className="text-3xl font-extrabold text-white text-center mb-2">Session Complete!</h2>
    <p className="text-white/90 text-center mb-10 text-lg">Your streak is on fire. 🔥</p>
    <button 
      onClick={onClose}
      className="w-full h-14 bg-white text-app-primary font-bold text-lg rounded-full shadow-lg active:scale-95 transition-transform"
    >
      Continue
    </button>
  </div>
);
