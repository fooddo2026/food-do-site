import React from 'react';
import { ArrowRight, LogIn } from 'lucide-react';

interface WelcomeProps {
  onNavigate: (page: 'login' | 'signup') => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 relative overflow-hidden font-sans">
      {/* Clear Background Image with Soft Vignette Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90 transition-all duration-700"
        style={{ backgroundImage: "url('/images/hostel_mess_image.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40 pointer-events-none" />

      {/* Decorative Subtle Glow */}
      <div className="absolute top-[-30%] left-[-30%] w-[80%] h-[80%] bg-orange-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container - Ultra-Transparent Floating Deck */}
      <div className="w-full max-w-lg p-10 rounded-3xl bg-black/10 backdrop-blur-sm border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.3)] relative z-10 mx-4 text-center">
        {/* Logo Icon */}
        <div className="inline-flex p-4 rounded-2xl bg-orange-500/20 border border-orange-500/30 mb-6 backdrop-blur-sm animate-pulse shadow-lg">
          <span className="text-4xl font-black text-orange-400 tracking-tighter drop-shadow-md">FD</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2 drop-shadow-lg">
          FOOD-DO <span className="text-orange-500 bg-clip-text">Admin</span>
        </h1>
        <p className="text-gray-200 text-sm max-w-sm mx-auto mb-10 font-medium drop-shadow-md">
          Management & Dining Console. Monitor student attendance, schedules, menus, and real-time gate pass updates.
        </p>

        {/* Actions Deck */}
        <div className="space-y-4">
          <button
            onClick={() => onNavigate('login')}
            className="w-full py-4 px-6 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-2xl font-bold shadow-lg shadow-orange-600/30 flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap text-sm sm:text-base tracking-wide"
          >
            <LogIn className="w-5 h-5 shrink-0" />
            <span>Sign In to Admin Console</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>

        {/* Bottom footer note */}
        <div className="mt-12 text-xs text-gray-500 font-medium">
          Authorized personnel only. All access attempts are logged.
        </div>
      </div>
    </div>
  );
};

export default Welcome;
