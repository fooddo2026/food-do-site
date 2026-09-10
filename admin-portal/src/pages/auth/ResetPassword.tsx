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
      <div className="min-h-screen flex items-center justify-center bg-radial from-gray-900 via-gray-950 to-black relative overflow-hidden font-sans">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="w-full max-w-md p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl relative z-10 mx-4 text-center">
          <div className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6 text-emerald-500">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">Password Reset Successful!</h2>
          <p className="text-xs text-gray-400">
            Your credentials have been successfully updated. Redirecting you to sign in...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-gray-900 via-gray-950 to-black relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl relative z-10 mx-4">
        <h2 className="text-2xl font-black text-white tracking-tight mb-2">Reset Password</h2>
        <p className="text-xs text-gray-400 mb-6 leading-relaxed">
          Create a new password. Make sure it is secure and easy to remember.
        </p>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 text-sm"
                placeholder="new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-gray-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 text-sm"
                placeholder="confirm passwords"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 cursor-pointer text-sm"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
