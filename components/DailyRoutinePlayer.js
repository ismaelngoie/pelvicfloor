"use client";
import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Pause, SkipForward, SkipBack, CheckCircle2 } from 'lucide-react';
import { useUserData } from '@/context/UserDataContext';

export default function DailyRoutinePlayer({ playlist, onClose }) {
  const { saveUserData } = useUserData();
  const videoRef = useRef(null);
  
  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showUpNext, setShowUpNext] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isComplete, setIsComplete] = useState(false);
  
  // Ensure playlist exists
  const currentVideo = playlist && playlist[currentIndex];
  const nextVideo = playlist && playlist[currentIndex + 1];

  // --- 5-Second Rule Logic ---
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideo) return;

    // Reset marked status for new video
    video.hasMarkedProgress = false;

    const handleTimeUpdate = () => {
      const pct = (video.currentTime / video.duration) * 100;
      setProgress(pct);

      if (video.currentTime > 5 && !video.hasMarkedProgress) {
        console.log("✅ Progress Saved (5s rule)");
        // In production: saveUserData('lastWorkoutDate', new Date().toISOString());
        video.hasMarkedProgress = true; 
      }
    };

    const handleEnded = () => {
      if (nextVideo) {
        triggerUpNext();
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
  }, [currentIndex, nextVideo]);

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

  const toggleControls = () => setShowControls(prev => !prev);
  const togglePlay = () => {
    if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
    else { videoRef.current.pause(); setIsPlaying(false); }
  };
  const skip = (direction) => {
    if (direction === 'next' && nextVideo) setCurrentIndex(p => p + 1);
    if (direction === 'prev' && currentIndex > 0) setCurrentIndex(p => p - 1);
  };

  if (!currentVideo) return null; // Safety check

  if (isComplete) return (
    <div className="fixed inset-0 z-50 bg-[#E65473] flex flex-col items-center justify-center p-8 animate-pop-in">
      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl animate-breathe">
        <CheckCircle2 size={48} className="text-[#E65473]" />
      </div>
      <h2 className="text-3xl font-extrabold text-white text-center mb-2">Session Complete!</h2>
      <p className="text-white/90 text-center mb-10 text-lg">Your streak is on fire. 🔥</p>
      <button onClick={onClose} className="w-full h-14 bg-white text-[#E65473] font-bold text-lg rounded-full shadow-lg active:scale-95 transition-transform">
        Continue
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
      {/* Video Layer */}
      <div className="relative flex-1 bg-gray-900" onClick={toggleControls}>
        <video
          ref={videoRef}
          src={currentVideo.url}
          className="w-full h-full object-contain"
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

      {/* Controls Overlay */}
      <div className={`absolute inset-0 pointer-events-none flex flex-col justify-between transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="p-6 pt-12 pointer-events-auto bg-gradient-to-b from-black/60 to-transparent flex justify-between items-start">
           <div>
             <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Exercise {currentIndex + 1} of {playlist.length}</p>
             <h2 className="text-white text-lg font-bold mt-1">{currentVideo.title}</h2>
           </div>
           <button onClick={onClose} className="p-2 bg-white/10 rounded-full backdrop-blur-md"><X className="text-white" size={24} /></button>
        </div>

        <div className="p-8 pb-12 pointer-events-auto bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <div className="w-full h-1.5 bg-white/20 rounded-full mb-8 overflow-hidden">
            <div className="h-full bg-[#E65473] transition-all duration-300 ease-linear" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between px-4">
            <button onClick={() => skip('prev')} disabled={currentIndex === 0} className="text-white/80 disabled:opacity-30"><SkipBack size={32} /></button>
            <button onClick={togglePlay} className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-transform">
              {isPlaying ? <Pause size={32} className="text-[#E65473] fill-[#E65473]" /> : <Play size={32} className="text-[#E65473] fill-[#E65473] ml-1" />}
            </button>
            <button onClick={() => skip('next')} disabled={!nextVideo} className="text-white/80 disabled:opacity-30"><SkipForward size={32} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
