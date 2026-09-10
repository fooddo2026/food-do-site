import React, { useState } from 'react';
import { ArrowLeft, Mail, ChevronRight } from 'lucide-react';

interface ForgotPasswordProps {
  onBack: () => void;
  onSuccess: (email: string) => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');

    // Simulate OTP generation
    setTimeout(() => {
      setLoading(false);
      onSuccess(email);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative font-sans text-slate-100 overflow-hidden selection:bg-orange-500 selection:text-white">
      {/* 100% Full Unbroken Mess Photo Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat filter brightness-90 contrast-105 pointer-events-none"
        style={{ backgroundImage: "url('/images/hostel_mess_image.jpg')" }}
      />
      
      {/* Uniform Ultra-Soft Dark Tint */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {/* Seamless Radial Orange Warm Glow */}
      <div className="absolute w-[450px] h-[450px] bg-orange-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      <div className="w-full max-w-md p-8 md:p-10 rounded-3xl bg-black/40 backdrop-blur-md border border-white/25 border-t-2 border-t-orange-500/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 mx-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-orange-400 mb-6 group cursor-pointer transition-colors drop-shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-orange-400 group-hover:-translate-x-0.5 transition-transform" />
          Back to Login
        </button>

        <h2 className="text-2xl font-semibold text-white tracking-tight mb-2 drop-shadow-md">Forgot Password?</h2>
        <p className="text-xs text-slate-100 mb-6 leading-relaxed font-bold drop-shadow-sm">
          No worries. Enter your registered email address, and we will send you a 6-digit verification code.
        </p>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-600/80 border border-rose-400 text-white text-xs text-center font-semibold shadow-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2 drop-shadow-sm">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-4 h-4 text-orange-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/50 border border-white/30 text-white placeholder-slate-300 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/40 text-sm font-bold transition-all shadow-md"
                placeholder="enter your email i'd"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-xl shadow-orange-950/60 active:scale-[0.98] disabled:opacity-50 cursor-pointer text-sm uppercase tracking-wider mt-2"
          >
            {loading ? 'Sending OTP...' : 'Send Verification OTP'}
            {!loading && <ChevronRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
