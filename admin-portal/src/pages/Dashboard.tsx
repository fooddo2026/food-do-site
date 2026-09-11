import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';
import { MealEstimationWidget } from '../components/MealEstimationWidget';

import { API_BASE_URL } from '../config';

interface DashboardStats {
  totalStudents: number;
  totalDayScholars: number;
  mealsServedToday: number;
  activeLeaves: number;
  foodWastageEstimate: string;
  totalPenalties: number;
}

interface ActivityLog {
  id: string;
  studentRoll: string;
  mealType: string;
  time: string;
  status: 'CONSUMED' | 'SKIPPED';
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [feedbackStats, setFeedbackStats] = useState<{ overallAverage: number; totalReviews: number; topMeal: string } | null>(null);
  const [liveAlert, setLiveAlert] = useState<{ text: string; type: 'poll' | 'feedback' | 'scan' } | null>(null);

  // Manual Override State
  const [overrideRoll, setOverrideRoll] = useState('');
  const [overrideGate, setOverrideGate] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideMessage, setOverrideMessage] = useState<{text: string, type: 'success'|'error'} | null>(null);

  // Load cached stats from localStorage immediately (prevents blank cards on load)
  const getCachedStats = (): DashboardStats | null => {
    try {
      const cached = localStorage.getItem('food_do_dashboard_stats_cache');
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return null;
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/dashboard/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      setStats(data);
      setIsOffline(false);
      // Cache for offline use
      localStorage.setItem('food_do_dashboard_stats_cache', JSON.stringify(data));
    } catch (err: any) {
      console.warn('Dashboard stats API unavailable, using cached data:', err.message);
      // Try cached data first
      const cached = getCachedStats();
      if (cached) {
        setStats(cached);
      } else {
        setStats({ totalStudents: 0, totalDayScholars: 0, mealsServedToday: 0, activeLeaves: 0, foodWastageEstimate: '—', totalPenalties: 0 });
      }
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  const handleManualOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideRoll) return;
    
    setOverrideLoading(true);
    setOverrideMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/meals/manual-override`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ rollNumber: overrideRoll, gateType: overrideGate })
      });
      const data = await res.json();
      
      if (res.ok) {
        setOverrideMessage({ text: data.message, type: 'success' });
        setOverrideRoll('');
        fetchStats(); // Refresh stats
      } else {
        setOverrideMessage({ text: data.error || 'Failed to override', type: 'error' });
      }
    } catch (err) {
      setOverrideMessage({ text: 'Network error connecting to server.', type: 'error' });
    } finally {
      setOverrideLoading(false);
      setTimeout(() => setOverrideMessage(null), 5000);
    }
  };

  useEffect(() => {
    // Show cached data immediately while fetching live data
    const cached = getCachedStats();
    if (cached) {
      setStats(cached);
      setLoading(false);
    }

    fetchStats();

    // Refresh stats every 30 seconds
    const statsRefreshInterval = setInterval(fetchStats, 30000);

    // Extract user role from localStorage for socket authentication
    let userRole = 'ADMIN';
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role) userRole = user.role;
      }
    } catch (e) {}

    // Listen to real-time scanning events via Socket.io
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      query: { role: userRole }
    });

    const handleNewScanEvent = (eventData: any) => {
      const newLog: ActivityLog = {
        id: Math.random().toString(),
        studentRoll: eventData.rollNumber || eventData.studentName || 'Unknown',
        mealType: eventData.mealType || 'LUNCH',
        time: eventData.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'CONSUMED',
      };
      setActivities((prev) => [newLog, ...prev.slice(0, 7)]);
      setStats((prev) => prev ? { ...prev, mealsServedToday: prev.mealsServedToday + 1 } : null);
      setLiveAlert({
        text: `🎟️ Live Scan: ${eventData.rollNumber || eventData.studentName} checked in for ${eventData.mealType || 'Meal'}`,
        type: 'scan'
      });
      setTimeout(() => setLiveAlert(null), 4000);
    };

    socket.on('meal_scanned', handleNewScanEvent);

    socket.on('meal_poll_updated', (eventData: any) => {
      setLiveAlert({
        text: `📢 Student Poll Update: ${eventData.studentName || eventData.rollNumber || 'Student'} voted "${eventData.preference}" for ${eventData.mealType}!`,
        type: 'poll'
      });
      setTimeout(() => setLiveAlert(null), 5000);
    });

    const fetchFeedbackSummary = async () => {
      try {
        const token = localStorage.getItem('token');
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`${API_BASE_URL}/api/feedback/summary?date=${today}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const d = await res.json();
          let topMeal = 'N/A';
          let topAvg = 0;
          const statsMap = d.summary?.mealStats || {};
          Object.keys(statsMap).forEach(k => {
            if (statsMap[k].avg > topAvg) {
              topAvg = statsMap[k].avg;
              topMeal = k;
            }
          });
          setFeedbackStats({
            overallAverage: d.summary?.overallAverage || 0,
            totalReviews: d.summary?.totalReviews || 0,
            topMeal: topMeal !== 'N/A' ? topMeal : 'Pending'
          });
        }
      } catch (_) {}
    };

    fetchFeedbackSummary();
    socket.on('new_meal_feedback', (eventData: any) => {
      fetchFeedbackSummary();
      setLiveAlert({
        text: `⭐ Live Meal Review: ${eventData.rating}★ for ${eventData.mealType} from ${eventData.studentName || 'Student'}!`,
        type: 'feedback'
      });
      setTimeout(() => setLiveAlert(null), 5000);
    });

    // Sync scan events across browser tabs via localStorage
    let lastScanTs = 0;
    const storageChecker = setInterval(() => {
      const stored = localStorage.getItem('last_scanned_meal_event');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.timestamp && parsed.timestamp > lastScanTs) {
            lastScanTs = parsed.timestamp;
            handleNewScanEvent({
              rollNumber: parsed.studentName,
              mealType: 'LUNCH',
              time: new Date(parsed.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
          }
        } catch (e) {}
      }
    }, 1000);

    return () => {
      socket.disconnect();
      clearInterval(storageChecker);
      clearInterval(statsRefreshInterval);
    };
  }, []);

  return (
    <div className="p-8 bg-gray-50/50 min-h-screen">
      
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Mess Overview</h2>
          <p className="text-gray-500 mt-1 text-sm">Real-time indicators and occupancy analytics.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {isOffline ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Backend Offline · Cached Data
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Live DB Synced
            </span>
          )}
          <button
            onClick={fetchStats}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer shadow-sm"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Real-time Push Alert Banner */}
      {liveAlert && (
        <div className="mb-6 p-4 rounded-2xl bg-primary text-white font-extrabold text-xs sm:text-sm flex items-center justify-between shadow-lg shadow-orange-500/25 animate-bounce">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>{liveAlert.text}</span>
          </div>
          <span className="text-[10px] uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">
            REAL-TIME
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-32 text-gray-500">
          <svg className="animate-spin h-8 w-8 text-primary mr-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading analytics dashboard...
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            
            {/* Card 1: Total Students */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Hostelers</span>
                  <span className="p-1.5 rounded-xl bg-orange-50 text-primary">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </span>
                </div>
              <p className="text-2xl font-extrabold text-gray-900">
                {stats?.totalStudents !== undefined ? stats.totalStudents.toLocaleString() : '—'}
              </p>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 flex flex-col gap-0.5 text-[10px] text-gray-400 font-semibold">
                <span>Day Scholars</span>
                <span className="text-orange-500 font-bold">{stats?.totalDayScholars !== undefined ? stats.totalDayScholars : 0} registered</span>
              </div>
            </div>

            {/* Card 2: Meals Served */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Served Today</span>
                  <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-gray-900">
                  {stats?.mealsServedToday !== undefined ? stats.mealsServedToday.toLocaleString() : '—'}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center h-full">
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '72%' }} />
                </div>
              </div>
            </div>

            {/* Card 3: Active Leaves */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Excused Leaves</span>
                  <span className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-gray-900">
                  {stats?.activeLeaves !== undefined ? stats.activeLeaves : '—'}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 flex flex-col gap-0.5 text-[10px] text-gray-400 font-semibold">
                <span>Total skips tracked</span>
                <span className="text-indigo-600 font-bold">-{stats?.activeLeaves} meals</span>
              </div>
            </div>

            {/* Card 4: Wastage Saved */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Wastage Saved</span>
                  <span className="p-1.5 rounded-xl bg-rose-50 text-rose-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-rose-600">
                  {stats?.foodWastageEstimate !== undefined ? `-${stats.foodWastageEstimate}` : '—'}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 flex flex-col gap-0.5 text-[10px] text-gray-400 font-semibold">
                <span>Daily goal progress</span>
                <span className="text-rose-500 font-bold">Optimal</span>
              </div>
            </div>

            {/* Card 5: Total Penalties */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-tight w-2/3">Total Fine Collected</span>
                  <span className="p-1.5 rounded-xl bg-red-50 text-red-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </div>
                <p className="text-2xl font-extrabold text-red-600">
                  ₹{stats?.totalPenalties !== undefined ? stats.totalPenalties.toLocaleString() : '0'}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 flex flex-col gap-0.5 text-[10px] text-gray-400 font-semibold">
                <span>From Poll Defaulters</span>
                <span className="text-red-500 font-bold">Active</span>
              </div>
            </div>

          </div>

          {/* Live Meal Feedback Banner */}
          <div className="bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-white p-5 rounded-2xl border border-orange-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-black text-xl shadow-md shadow-orange-500/20">
                ⭐
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-gray-900">Student Meal Dining Feedback</h4>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-100 text-orange-700">
                    Live
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Today's Score: <strong className="text-gray-900">{feedbackStats?.overallAverage ? `${feedbackStats.overallAverage.toFixed(1)} / 5.0` : 'No ratings yet'}</strong> ({feedbackStats?.totalReviews || 0} reviews today) • Top: <span className="capitalize font-bold text-primary">{feedbackStats?.topMeal?.toLowerCase()}</span>
                </p>
              </div>
            </div>

            <Link
              to="/feedback"
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-orange-50 border border-orange-200 text-primary font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0"
            >
              <span>View All Reviews & Analytics</span>
              <span>➔</span>
            </Link>
          </div>
          
          {/* Manual Scanner Override Widget */}
          <div className="bg-white p-6 rounded-2xl border border-orange-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.071 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                  </svg>
                  Manual Scanner Override
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Use this fallback if a student's phone battery is dead and they cannot scan their QR code.
                </p>
              </div>
              
              <form onSubmit={handleManualOverride} className="flex-1 flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Enter Roll Number (e.g. 22CS01)"
                  value={overrideRoll}
                  onChange={(e) => setOverrideRoll(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-500 font-bold uppercase"
                  required
                />
                <select
                  value={overrideGate}
                  onChange={(e) => setOverrideGate(e.target.value as 'ENTRY' | 'EXIT')}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold bg-white focus:outline-none focus:border-orange-500"
                >
                  <option value="ENTRY">Entry</option>
                  <option value="EXIT">Exit</option>
                </select>
                <button
                  type="submit"
                  disabled={overrideLoading}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-sm transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {overrideLoading ? 'Logging...' : 'Log Scan'}
                </button>
              </form>
            </div>
            
            {overrideMessage && (
              <div className={`mt-4 p-3 rounded-xl text-xs font-bold border ${overrideMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                {overrideMessage.type === 'success' ? '✅ ' : '❌ '}
                {overrideMessage.text}
              </div>
            )}
          </div>
          
          {/* Real-time Kitchen Poll Widget */}
          <MealEstimationWidget />

          {/* Charts & Activity Feed Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left/Middle: Live Chart */}
            <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Attendance Hourly Load</h3>
                  <p className="text-gray-400 text-xs mt-1">Detailed metric analysis for current meal serve hours.</p>
                </div>
                <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-lg text-xs font-bold border border-gray-100">
                  LUNCH SESSION
                </span>
              </div>

              {/* Real SVG Chart */}
              <div className="w-full h-64 relative mt-8">
                <svg viewBox="0 0 500 200" className="w-full h-full">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(249, 115, 22, 0.25)" />
                      <stop offset="100%" stopColor="rgba(249, 115, 22, 0)" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="180" x2="500" y2="180" stroke="#f3f4f6" strokeWidth="1.5" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#f3f4f6" strokeWidth="1.5" strokeDasharray="4" />
                  <line x1="0" y1="60" x2="500" y2="60" stroke="#f3f4f6" strokeWidth="1.5" strokeDasharray="4" />
                  
                  {/* Area path */}
                  <path
                    d="M 0 180 Q 80 150 150 110 T 300 70 T 450 130 T 500 180 L 500 180 L 0 180 Z"
                    fill="url(#chartGradient)"
                  />
                  
                  {/* Line path */}
                  <path
                    d="M 0 180 Q 80 150 150 110 T 300 70 T 450 130 T 500 180"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Highlights */}
                  <circle cx="300" cy="70" r="5" fill="#f97316" stroke="white" strokeWidth="2" />
                  <text x="310" y="65" fill="#1f2937" fontSize="10" fontWeight="bold">Peak load (78%)</text>
                </svg>
              </div>

              {/* Time Indicators */}
              <div className="flex justify-between text-xs text-gray-400 font-bold px-2 mt-4 uppercase tracking-wider">
                <span>12:30 PM</span>
                <span>01:00 PM</span>
                <span>01:30 PM</span>
                <span>02:00 PM</span>
                <span>02:30 PM</span>
              </div>
            </div>

            {/* Right Side: Live Log Feed */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Live Entry Feed</h3>
                    <p className="text-[11px] text-gray-400 font-medium">Real-time gate scanner stream</p>
                  </div>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                  </span>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {activities.length > 0 ? (
                    activities.map((act) => (
                      <div key={act.id} className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-100 rounded-2xl hover:scale-[1.01] transition-transform animate-fadeIn">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 border border-orange-500/20 flex items-center justify-center font-extrabold text-xs font-mono">
                            {act.studentRoll.slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900">Roll: {act.studentRoll}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{act.mealType} • Gate Entry</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block text-xs font-bold text-gray-800 font-mono">{act.time}</span>
                          <span className="inline-block text-[9px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 mt-1 uppercase tracking-wider">
                            {act.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-gray-400 space-y-3 bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 animate-bounce">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-700">Listening to Live Scanners...</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Scan student QR pass at mess gate to view live entry stream here.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 text-center mt-6 flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-wider">
                <span>GATE SENSORS: ONLINE</span>
                <span className="text-emerald-600 font-extrabold font-mono">{activities.length} SCANS RECEIVED</span>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default Dashboard;
