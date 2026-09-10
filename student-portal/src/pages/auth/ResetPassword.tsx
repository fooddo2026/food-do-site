import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';

interface ResetPasswordProps {
  onSuccess: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    // Simulate reset password database success
    setTimeout(() => {
      setLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }, 1200);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center relative font-sans text-slate-100 overflow-hidden selection:bg-orange-500 selection:text-white">
        {/* 100% Full Unbroken Mess Photo Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat filter brightness-90 contrast-105 pointer-events-none"
          style={{ backgroundImage: "url('/images/hostel_mess_image.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/30 pointer-events-none" />

        <div className="w-full max-w-md p-8 md:p-10 rounded-3xl bg-black/40 backdrop-blur-md border border-white/25 border-t-2 border-t-emerald-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 mx-4 text-center">
          <div className="inline-flex p-4 rounded-full bg-emerald-500/25 border border-emerald-400/40 mb-6 text-emerald-400 shadow-md">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-semibold text-white tracking-tight mb-2 drop-shadow-md">Password Reset Successful!</h2>
          <p className="text-xs text-slate-100 font-bold leading-relaxed drop-shadow-sm">
            Your credentials have been successfully updated. Redirecting you to sign in...
          </p>
        </div>
      </div>
    );
  }

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
        <h2 className="text-2xl font-semibold text-white tracking-tight mb-2 drop-shadow-md">Reset Password</h2>
        <p className="text-xs text-slate-100 mb-6 leading-relaxed font-bold drop-shadow-sm">
          Create a new password. Make sure it is secure and easy to remember.
        </p>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-600/80 border border-rose-400 text-white text-xs text-center font-semibold shadow-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2 drop-shadow-sm">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-4 h-4 text-orange-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-black/50 border border-white/30 text-white placeholder-slate-300 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/40 text-sm font-bold transition-all shadow-md"
                placeholder="new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-slate-300 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2 drop-shadow-sm">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-4 h-4 text-orange-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-black/50 border border-white/30 text-white placeholder-slate-300 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/40 text-sm font-bold transition-all shadow-md"
                placeholder="confirm passwords"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl font-semibold transition-all shadow-xl shadow-orange-950/60 active:scale-[0.98] disabled:opacity-50 cursor-pointer text-sm uppercase tracking-wider mt-2"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
