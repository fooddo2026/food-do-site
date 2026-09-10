import React, { useState } from 'react';

import { API_BASE_URL } from '../config';

interface LoginProps {
  onLoginSuccess: (token: string, user: { id: string; email: string; role: string }) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'STAFF' | 'STUDENT'>('ADMIN');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Server connection failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-gray-900 via-gray-950 to-black relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl relative z-10 mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-3">
            <span className="text-3xl font-medium text-orange-500 tracking-tight">FD</span>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">FOOD-DO</h2>
          <p className="text-gray-400 text-sm mt-1">Every Meal Accounted. Every Student Connected.</p>
        </div>

        {/* Role Tab Selector */}
        <div className="flex bg-white/5 p-1 rounded-xl mb-6 border border-white/5">
          <button
            type="button"
            onClick={() => setRole('ADMIN')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              role === 'ADMIN'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => setRole('STAFF')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              role === 'STAFF'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Staff
          </button>
          <button
            type="button"
            onClick={() => setRole('STUDENT')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              role === 'STUDENT'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Student
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
              placeholder="enter your email i'd"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
              placeholder="new password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/30 hover:bg-orange-600 focus:outline-none transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing In...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
