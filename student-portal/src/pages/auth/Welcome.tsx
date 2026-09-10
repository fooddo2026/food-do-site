import React, { useState } from 'react';
import { ArrowRight, LogIn, UserPlus } from 'lucide-react';

interface WelcomeProps {
  onNavigate: (page: 'login' | 'signup') => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onNavigate }) => {
  const [selectedRole, setSelectedRole] = useState<'HOSTELER' | 'DAY_SCHOLAR' | null>(() => {
    return localStorage.getItem('student_identity_preference') as 'HOSTELER' | 'DAY_SCHOLAR' | null;
  });

  const handleRoleSelection = (role: 'HOSTELER' | 'DAY_SCHOLAR') => {
    localStorage.setItem('student_identity_preference', role);
    setSelectedRole(role);
  };

  if (!selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans text-slate-100 selection:bg-orange-500 selection:text-white">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat filter brightness-95 contrast-105 pointer-events-none" style={{ backgroundImage: "url('/images/hostel_mess_image.jpg')" }} />
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        <div className="absolute w-[500px] h-[500px] bg-orange-500/20 rounded-full blur-[130px] pointer-events-none animate-pulse" />
        
        <div className="w-full max-w-2xl p-8 sm:p-10 rounded-3xl bg-black/40 backdrop-blur-xl border border-white/20 shadow-2xl relative z-10 mx-4 text-center">
          <h1 className="text-3xl font-semibold text-white tracking-tight mb-2 drop-shadow-lg">Select Your Identity</h1>
          <p className="text-slate-200 text-sm mb-10 font-medium">Please select whether you are a Hosteler or a Day Scholar to continue to your customized portal.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <button
              onClick={() => handleRoleSelection('HOSTELER')}
              className="p-8 rounded-3xl bg-black/50 border border-white/20 hover:border-orange-500 hover:bg-orange-500/10 transition-all cursor-pointer group flex flex-col items-center justify-center gap-4 shadow-xl"
            >
              <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                🏢
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-orange-400">Hosteler</h3>
                <p className="text-xs text-slate-300 mt-2 font-medium">I live in the college hostel and access the mess regularly.</p>
              </div>
            </button>
            
            <button
              onClick={() => handleRoleSelection('DAY_SCHOLAR')}
              className="p-8 rounded-3xl bg-black/50 border border-white/20 hover:border-emerald-500 hover:bg-emerald-500/10 transition-all cursor-pointer group flex flex-col items-center justify-center gap-4 shadow-xl"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                🎒
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-400">Day Scholar</h3>
                <p className="text-xs text-slate-300 mt-2 font-medium">I commute to college and want to access surplus food tokens.</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans text-slate-100 selection:bg-orange-500 selection:text-white">
      
      {/* 100% Full Unbroken Mess Photo Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat filter brightness-95 contrast-105 pointer-events-none"
        style={{ backgroundImage: "url('/images/hostel_mess_image.jpg')" }}
      />
      
      {/* Uniform Soft Tint */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      {/* Ambient Orange Glow */}
      <div className="absolute w-[500px] h-[500px] bg-orange-500/20 rounded-full blur-[130px] pointer-events-none animate-pulse" />

      {/* 100% Background-Synced Frosted Glass Panel */}
      <div className="w-full max-w-lg p-8 sm:p-10 rounded-3xl bg-black/25 backdrop-blur-xl border border-white/20 shadow-2xl relative z-10 mx-4 text-center">
        
        {/* Logo Icon */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => { localStorage.removeItem('student_identity_preference'); setSelectedRole(null); }} className="text-xs font-bold text-white/50 hover:text-white flex items-center gap-1 cursor-pointer transition-colors bg-black/20 px-3 py-1.5 rounded-full border border-white/10">
             ← Change Identity
          </button>
        </div>
        <div className="inline-flex p-4 rounded-2xl bg-gradient-to-tr from-orange-600 to-orange-500 shadow-xl shadow-orange-500/40 mb-6">
          <span className="text-4xl font-semibold text-white tracking-tighter">FD</span>
        </div>

        {/* Single-Line Heading */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white tracking-tight mb-2 drop-shadow-lg whitespace-nowrap">
          Welcome to <span className="text-orange-400">FOOD-DO</span><br/><span className="text-xl text-white/80">{selectedRole === 'HOSTELER' ? 'Hosteler Portal' : 'Day Scholar Portal'}</span>
        </h1>
        <p className="text-slate-100 text-xs sm:text-sm max-w-md mx-auto mb-8 font-bold leading-relaxed drop-shadow-md">
          Every Meal Accounted. Every Student Connected. Access your hostel dining pass and menu in one place.
        </p>

        {/* Actions Deck */}
        <div className="space-y-3.5">
          <button
            onClick={() => onNavigate('login')}
            className="w-full py-4 px-6 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-2xl font-semibold shadow-xl shadow-orange-950/50 flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap text-xs sm:text-sm tracking-wider uppercase"
          >
            <LogIn className="w-5 h-5 shrink-0" />
            <span>Sign In to Student Account</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>

          <button
            onClick={() => onNavigate('signup')}
            className="w-full py-3.5 px-6 bg-black/40 hover:bg-black/60 text-white border border-white/30 rounded-2xl font-semibold flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer text-xs sm:text-sm shadow-md"
          >
            <UserPlus className="w-5 h-5 text-orange-400" />
            Create Student Pass
          </button>
        </div>

        {/* Bottom footer note */}
        <div className="mt-8 text-[11px] text-slate-200 font-bold drop-shadow-sm">
          By signing in, you agree to hostel mess guidelines & gate scan protocols.
        </div>
      </div>
    </div>
  );
};

export default Welcome;
