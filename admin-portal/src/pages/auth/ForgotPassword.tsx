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
    <div className="min-h-screen flex items-center justify-center bg-radial from-gray-900 via-gray-950 to-black relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl relative z-10 mx-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white mb-6 group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Login
        </button>

        <h2 className="text-2xl font-black text-white tracking-tight mb-2">Forgot Password?</h2>
        <p className="text-xs text-gray-400 mb-6 leading-relaxed">
          No worries. Enter your email address, and we will send you a 6-digit OTP code to reset your pass.
        </p>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 text-sm"
                placeholder="enter your email i'd"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
