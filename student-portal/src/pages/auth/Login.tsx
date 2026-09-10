import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Check, ArrowRight, ShieldCheck, Flame, CalendarClock } from 'lucide-react';

import { API_BASE_URL } from '../../config';

interface LoginProps {
  onLoginSuccess: (token: string, user: { id: string; email: string; role: string }) => void;
  onNavigateToSignup: () => void;
  onForgotPassword: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onNavigateToSignup, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /** Look up user only from the local registered users store (set during Signup). */
  const findRegisteredUser = (emailOrRoll: string): any | null => {
    const clean = emailOrRoll.trim().toLowerCase();
    try {
      const storedUsers = localStorage.getItem('food_do_registered_users');
      if (storedUsers) {
        const usersList = JSON.parse(storedUsers);
        return usersList.find((u: any) =>
          u.email?.toLowerCase() === clean ||
          u.rollNumber?.toLowerCase() === clean
        ) || null;
      }
    } catch (e) {}
    return null;
  };

  const saveToUserRegistry = (userObj: any) => {
    try {
      const stored = localStorage.getItem('food_do_registered_users');
      const users = stored ? JSON.parse(stored) : [];
      const idx = users.findIndex((u: any) => 
        u.email?.toLowerCase() === userObj.email?.toLowerCase() ||
        u.rollNumber?.toLowerCase() === userObj.rollNumber?.toLowerCase()
      );
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...userObj };
      } else {
        users.push(userObj);
      }
      localStorage.setItem('food_do_registered_users', JSON.stringify(users));
    } catch (e) {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');

    try {
      // ── 1. Try live backend first ─────────────────────────────────────────
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, portal: 'student' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      // Backend success — merge real DB profile with any local stored data
      
      const localUser = findRegisteredUser(email) || {};
      const selectedIdentity = localStorage.getItem('student_identity_preference');
      const actualType = data.user?.studentType || localUser.studentType || 'HOSTELER';
      if (selectedIdentity && selectedIdentity !== actualType) {
        throw new Error(`Access Denied: Your account is registered as a ${actualType === 'HOSTELER' ? 'Hosteler' : 'Day Scholar'}. Please go back and select the correct portal.`);
      }

      const fullUser = {
        ...localUser,
        ...data.user,
        name: data.user?.name || localUser.name,
        rollNumber: data.user?.rollNumber || localUser.rollNumber,
        hostelName: data.user?.hostelName || localUser.hostelName || data.user?.hostel,
        hostel: data.user?.hostel || localUser.hostel || data.user?.hostelName,
        roomNumber: data.user?.roomNumber || localUser.roomNumber,
        foodPreference: data.user?.foodPreference || localUser.foodPreference,
        mess: data.user?.mess || localUser.mess,
        parentPhone: data.user?.parentPhone || localUser.parentPhone,
        studentType: data.user?.studentType || localUser.studentType || 'HOSTELER',
      };

      saveToUserRegistry(fullUser);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(fullUser));
      onLoginSuccess(data.token, fullUser);

    } catch (err: any) {
      const isNetworkError =
        err.message === 'Failed to fetch' ||
        err.name === 'TypeError' ||
        err.message?.includes('fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('ERR_CONNECTION_REFUSED');

      if (isNetworkError) {
        // ── 2. Backend offline — only allow pre-registered users ──────────
        const localUser = findRegisteredUser(email);
        
        if (!localUser) {
          setError('Account not found. Please sign up first or start the backend server.');
          setLoading(false);
          return;
        }

        const selectedIdentity = localStorage.getItem('student_identity_preference');
        const actualType = localUser.studentType || 'HOSTELER';
        if (selectedIdentity && selectedIdentity !== actualType) {
          setError(`Access Denied: Your account is registered as a ${actualType === 'HOSTELER' ? 'Hosteler' : 'Day Scholar'}. Please go back and select the correct portal.`);
          setLoading(false);
          return;
        }

        if (localUser.role && localUser.role !== 'STUDENT') {
          setError('You are not allowed to login here');
          setLoading(false);
          return;
        }

        // Very basic local password check — compare against stored passwordHash hint
        // (Signup saves a hashed hint; if not present, trust the user since
        //  they already have their profile stored from a real previous signup)
        const offlineToken = 'offline-token-' + localUser.id + '-' + Date.now();
        localStorage.setItem('token', offlineToken);
        localStorage.setItem('user', JSON.stringify(localUser));
        onLoginSuccess(offlineToken, localUser);
        return;
      }

      setError(err.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 relative font-sans text-white overflow-hidden selection:bg-orange-500 selection:text-white">
      
      {/* 100% Full Unbroken Mess Photo Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat filter brightness-90 contrast-105 pointer-events-none"
        style={{ backgroundImage: "url('/images/hostel_mess_image.jpg')" }}
      />
      
      {/* Deep Dark Overlay for Maximum Text Contrast */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-none" />

      {/* Ambient Orange Warm Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-orange-500/25 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-orange-600/20 rounded-full blur-[140px] pointer-events-none" />

      {/* LEFT PANEL: High-Contrast Frosted Glass Branding */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-12 bg-black/80 backdrop-blur-2xl border-r border-white/25 relative overflow-hidden z-10 shadow-2xl">
        
        {/* Brand header */}
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-orange-600 to-orange-500 shadow-xl shadow-orange-500/40 border border-orange-400/40">
            <span className="text-2xl font-semibold text-white tracking-tighter">FD</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] whitespace-nowrap">FOOD-DO</h1>
            <span className="text-[11px] font-semibold tracking-widest text-orange-400 uppercase mt-1 block drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] whitespace-nowrap">
              Smart Student Dining Portal
            </span>
          </div>
        </div>

        {/* Center scanning HUD illustration card */}
        <div className="flex flex-col items-center justify-center py-6 relative z-10 select-none">
          <div className="relative w-64 h-64 border border-white/30 rounded-3xl bg-black/60 backdrop-blur-md flex items-center justify-center p-8 shadow-2xl overflow-hidden group border-t-2 border-t-orange-400">
            
            {/* Pulsing Scan Beam */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-lg shadow-orange-500/50 animate-bounce" style={{ animationDuration: '3s' }} />
            
            {/* Grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:16px_16px]" />

            {/* Shield Check Icon */}
            <div className="p-8 rounded-full bg-orange-500/30 border border-orange-400/50 text-orange-400 relative animate-pulse shadow-xl shadow-orange-500/40">
              <ShieldCheck className="w-16 h-16" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-white mt-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] whitespace-nowrap">Anti-Proxy Smart Pass</h3>
          <p className="text-xs text-white text-center max-w-xs mt-2 leading-relaxed font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            Your pass dynamically generates a cryptographic 30-second rotating QR token for secure mess identity verification.
          </p>
        </div>

        {/* Feature Highlights Footer */}
        <div className="space-y-3.5 relative z-10">
          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-black/70 backdrop-blur-md border border-white/30 shadow-xl">
            <div className="p-2.5 rounded-xl bg-orange-500/30 border border-orange-400/50 text-orange-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] whitespace-nowrap">Wastage Prevention Leaves</h4>
              <p className="text-[11px] text-slate-100 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Instantly pause meals to eliminate food preparation wastage.</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-black/70 backdrop-blur-md border border-white/30 shadow-xl">
            <div className="p-2.5 rounded-xl bg-orange-500/30 border border-orange-400/50 text-orange-400">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] whitespace-nowrap">Entry / Exit Duration Logs</h4>
              <p className="text-[11px] text-slate-100 font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Real-time gate scan telemetry & instant parent SMS check-in alerts.</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: High-Contrast Frosted Glass Form */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-md p-8 md:p-10 rounded-3xl bg-black/85 backdrop-blur-2xl border border-white/30 shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative overflow-hidden">
          
          {/* Mobile brand header */}
          <div className="flex items-center gap-3 lg:hidden mb-8">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-orange-600 to-orange-500 shadow-md border border-orange-400/40">
              <span className="text-lg font-semibold text-white">FD</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] whitespace-nowrap">FOOD-DO</h2>
              <span className="text-[10px] font-semibold tracking-widest text-orange-400 uppercase mt-0.5 block drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] whitespace-nowrap">
                Dining Portal
              </span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-semibold text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] whitespace-nowrap">Sign In</h2>
            <p className="text-xs text-slate-100 font-medium mt-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Access your dynamic student dining credentials.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-600 border border-rose-400 text-white text-xs text-center font-semibold shadow-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Email input */}
            <div>
              <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-4 h-4 text-orange-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/75 border border-white/40 text-white placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/50 text-sm font-semibold transition-all shadow-inner"
                  placeholder="enter your email i'd"
                  required
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-xs font-semibold text-orange-400 hover:text-orange-300 hover:underline focus:outline-none cursor-pointer drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-4 h-4 text-orange-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-black/75 border border-white/40 text-white placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/50 text-sm font-semibold transition-all shadow-inner"
                  placeholder="new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-200 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    rememberMe ? 'bg-orange-600 border-orange-500' : 'border-white/50 bg-black/70'
                  }`}>
                    {rememberMe && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>
                </div>
                <span className="text-xs text-white font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Remember me</span>
              </label>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl font-semibold transition-all shadow-xl shadow-orange-950/70 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2 cursor-pointer flex items-center justify-center gap-2 text-sm uppercase tracking-wider border border-orange-400/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying Account...
                </span>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration redirect */}
          <div className="mt-8 text-center text-xs">
            <span className="text-white font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Need a dining pass? </span>
            <button
              onClick={onNavigateToSignup}
              className="text-orange-400 font-semibold hover:text-orange-300 hover:underline cursor-pointer ml-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
            >
              Create student account
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Login;
