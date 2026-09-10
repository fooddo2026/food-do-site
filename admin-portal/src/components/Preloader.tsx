import React, { useState, useEffect } from 'react';
import { Flame, Utensils, ChefHat, Sparkles, Coffee, Pizza } from 'lucide-react';

interface PreloaderProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

const LOADING_STEPS = [
  { icon: Utensils, text: 'Preparing Mess Engine & Daily Menus...' },
  { icon: ChefHat, text: 'Syncing Dietary & Kitchen Schedules...' },
  { icon: Coffee, text: 'Verifying Hosteller Digital Identity Passes...' },
  { icon: Sparkles, text: 'FOOD-DO Ecosystem Ready!' },
];

export const Preloader: React.FC<PreloaderProps> = ({ onComplete, minDurationMs = 1800 }) => {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentProgress = Math.min(Math.floor((elapsed / minDurationMs) * 100), 100);
      setProgress(currentProgress);

      const nextStep = Math.min(Math.floor((currentProgress / 100) * LOADING_STEPS.length), LOADING_STEPS.length - 1);
      setStepIndex(nextStep);

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

  const CurrentStepIcon = LOADING_STEPS[stepIndex].icon;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0c0a09] text-white transition-opacity duration-400 ease-out select-none overflow-hidden ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* RICH WARM FOOD-THEME BACKGROUND TEXTURE & GLOWS */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-950/40 via-[#0c0a09] to-[#050404] pointer-events-none" />

      {/* FLOATING CULINARY AMBIENT PARTICLES / ICONS */}
      <div className="absolute top-1/4 left-1/5 text-orange-500/10 animate-bounce [animation-duration:4s] pointer-events-none">
        <Utensils className="w-16 h-16" />
      </div>
      <div className="absolute bottom-1/4 right-1/5 text-amber-500/10 animate-bounce [animation-duration:5s] pointer-events-none">
        <ChefHat className="w-20 h-20" />
      </div>
      <div className="absolute top-1/3 right-1/4 text-orange-400/10 animate-pulse [animation-duration:3s] pointer-events-none">
        <Pizza className="w-14 h-14" />
      </div>
      <div className="absolute bottom-1/3 left-1/4 text-amber-600/10 animate-pulse [animation-duration:4s] pointer-events-none">
        <Coffee className="w-12 h-12" />
      </div>

      {/* AMBIENT RADIAL LIGHTING */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* CENTER CONTENT */}
      <div className="relative z-10 flex flex-col items-center max-w-sm w-full px-6 text-center">
        
        {/* ANIMATED STEAM FLAME & UTENSIL BADGE */}
        <div className="relative mb-6">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-1">
            <Flame className="w-4 h-4 text-orange-500 animate-bounce [animation-duration:1.2s]" />
            <Flame className="w-5 h-5 text-amber-400 animate-bounce [animation-duration:1.5s]" />
            <Flame className="w-4 h-4 text-orange-500 animate-bounce [animation-duration:1.8s]" />
          </div>

          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-400 p-0.5 shadow-2xl shadow-orange-500/40 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full bg-[#120e0c] rounded-[22px] flex items-center justify-center border border-orange-500/20 shadow-inner">
              <Utensils className="w-9 h-9 text-orange-500 animate-pulse" />
            </div>
          </div>
        </div>

        {/* BOLD ANIMATED FOOD-DO TYPOGRAPHY */}
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 flex items-center justify-center gap-2">
          <span className="bg-gradient-to-r from-orange-500 via-amber-400 to-orange-600 bg-clip-text text-transparent drop-shadow-[0_4px_20px_rgba(249,115,22,0.4)]">
            FOOD-DO
          </span>
        </h1>
        <p className="text-xs font-extrabold uppercase tracking-widest text-amber-500/80 mb-8">
          Smart Mess & Dining Automation
        </p>

        {/* SLEEK AMBER/ORANGE PROGRESS BAR */}
        <div className="w-full bg-neutral-900/90 p-1.5 rounded-2xl border border-neutral-800 shadow-2xl mb-4 relative overflow-hidden">
          <div
            className="h-2.5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-500 to-orange-400 transition-all duration-75 shadow-[0_0_15px_rgba(249,115,22,0.6)] relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
          </div>
        </div>

        {/* STATUS STEP & PERCENTAGE */}
        <div className="flex items-center justify-between w-full text-xs font-extrabold text-neutral-400 px-1">
          <div className="flex items-center gap-2 text-amber-400 truncate pr-2">
            <CurrentStepIcon className="w-4 h-4 animate-spin [animation-duration:3s] text-orange-500 shrink-0" />
            <span className="font-semibold text-neutral-300 truncate">{LOADING_STEPS[stepIndex].text}</span>
          </div>
          <span className="font-mono font-black text-orange-400 text-sm tracking-wider shrink-0">
            {progress}%
          </span>
        </div>
      </div>

      {/* FOOTER BADGE */}
      <div className="absolute bottom-6 text-[12px] font-extrabold text-neutral-400 tracking-widest uppercase flex items-center gap-2">
        <Flame className="w-4 h-4 text-orange-500 animate-pulse shrink-0" />
        <span>
          <span className="text-orange-500 font-black">FOOD-DO</span>{' '}
          <span className="text-amber-400 font-black">@R.N.D.I.</span>{' '}
          <span className="text-neutral-300 font-bold">@GITA CAMPUS</span>
        </span>
      </div>


    </div>
  );
};

export default Preloader;
