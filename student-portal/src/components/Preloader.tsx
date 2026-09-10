import React, { useState, useEffect } from 'react';

interface PreloaderProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

const FULL_TEXT = 'FOOD-DO';

export const Preloader: React.FC<PreloaderProps> = ({ onComplete, minDurationMs = 1800 }) => {
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);

  // Typewriter effect for "FOOD-DO"
  useEffect(() => {
    let currentLength = 0;
    const typeInterval = setInterval(() => {
      currentLength += 1;
      if (currentLength <= FULL_TEXT.length) {
        setTypedText(FULL_TEXT.substring(0, currentLength));
      } else {
        setIsTypingDone(true);
        clearInterval(typeInterval);
      }
    }, 130); // 130ms per character

    return () => clearInterval(typeInterval);
  }, []);

  // Progress Bar & Fade-out logic
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min(Math.floor((elapsed / minDurationMs) * 100), 100);
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 400);
        }, 200);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [minDurationMs, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between py-12 px-6 bg-slate-950 text-white transition-opacity duration-400 ease-out select-none overflow-hidden ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 100% Full Background Mess Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 filter brightness-90 contrast-110 pointer-events-none scale-105"
        style={{ backgroundImage: "url('/images/hostel_mess_image.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/80 pointer-events-none" />

      {/* AMBIENT RADIAL LIGHTING */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-orange-500/20 rounded-full blur-[160px] pointer-events-none animate-pulse" />

      {/* TOP SPACER */}
      <div className="relative z-10 pt-4" />

      {/* CENTRAL PURE TYPOGRAPHY DISPLAY WITH TYPEWRITER */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-4xl mx-auto my-auto py-6 select-none">
        
        {/* TEAM BYLINE TYPOGRAPHY */}
        <span className="text-xs sm:text-sm md:text-base font-semibold tracking-[0.6em] uppercase text-orange-400/90 mb-3 drop-shadow-[0_2px_12px_rgba(249,115,22,0.6)]">
          R.N.D.I. PRESENTS
        </span>

        {/* GRAND TYPOGRAPHIC FOOD-DO BRAND TITLE WITH LIVE TYPEWRITER */}
        <div className="flex items-center justify-center min-h-[120px] sm:min-h-[140px] md:min-h-[160px] mb-4">
          <h1 className="text-7xl sm:text-8xl md:text-9xl font-semibold tracking-tighter leading-none inline-flex items-center">
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_10px_40px_rgba(249,115,22,0.8)]">
              {typedText}
            </span>
            {/* Animated Typing Cursor */}
            <span
              className={`w-2.5 sm:w-3.5 md:w-4.5 h-12 sm:h-16 md:h-20 bg-orange-400 inline-block ml-1.5 sm:ml-2 rounded-sm shadow-[0_0_20px_rgba(249,115,22,0.9)] ${
                isTypingDone ? 'animate-pulse opacity-70' : 'animate-pulse'
              }`}
            />
          </h1>
        </div>

        {/* SUB-HEADER TYPOGRAPHY */}
        <p className="text-xs sm:text-sm md:text-lg font-semibold uppercase tracking-[0.35em] text-amber-300/90 drop-shadow-md">
          Smart Mess & Dining Automation
        </p>

        {/* CAMPUS TAGLINE */}
        <span className="text-[10px] sm:text-xs font-bold tracking-[0.4em] uppercase text-slate-400 mt-4 block">
          GITA CAMPUS • HOSTEL DINING ECOSYSTEM
        </span>
      </div>

      {/* BOTTOM CENTERED SLEEK PROGRESS BAR */}
      <div className="relative z-10 w-full max-w-md flex flex-col items-center pb-4">
        
        {/* CLEAN PROGRESS BAR */}
        <div className="w-full bg-black/60 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 shadow-2xl relative overflow-hidden">
          <div
            className="h-3 rounded-xl bg-gradient-to-r from-orange-600 via-amber-500 to-orange-400 transition-all duration-75 shadow-[0_0_25px_rgba(249,115,22,0.9)] relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>

    </div>
  );
};

export default Preloader;
