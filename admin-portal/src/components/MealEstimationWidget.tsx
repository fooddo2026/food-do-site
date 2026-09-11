import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

import { API_BASE_URL } from '../config';

interface PollSummary {
  VEG: number;
  NON_VEG: number;
  SKIPPING: number;
}

/** Reads all poll answers that student portal stored in localStorage and aggregates them */
const readLocalPollAnswers = (mealType: string, dateStr: string): PollSummary => {
  const result: PollSummary = { VEG: 0, NON_VEG: 0, SKIPPING: 0 };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Key format: food_do_poll_answered_{studentId}_{MEALTYPE}_{date}
      if (key && key.startsWith('food_do_poll_answered_') && key.includes(`_${mealType}_${dateStr}`)) {
        const val = localStorage.getItem(key);
        if (val === 'VEG') result.VEG++;
        else if (val === 'NON_VEG') result.NON_VEG++;
        else if (val === 'SKIPPING') result.SKIPPING++;
      }
    }
  } catch (_) {}
  return result;
};

const getLocalYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Determine the upcoming/active meal window */
const getActiveMealInfo = (): { type: string; date: Date; dateStr: string; label: string } => {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const todayStr = getLocalYMD(now);

  const tomorrow = new Date(now.getTime() + 86400000);
  const tomorrowStr = getLocalYMD(tomorrow);

  if (mins >= 1320) return { type: 'BREAKFAST', date: tomorrow, dateStr: tomorrowStr, label: "Tomorrow's Breakfast" };
  if (mins < 450)   return { type: 'BREAKFAST', date: now,      dateStr: todayStr,    label: "Today's Breakfast" };
  if (mins < 840)   return { type: 'LUNCH',     date: now,      dateStr: todayStr,    label: "Today's Lunch" };
  if (mins < 1260)  return { type: 'DINNER',    date: now,      dateStr: todayStr,    label: "Tonight's Dinner" };
  return { type: 'BREAKFAST', date: tomorrow, dateStr: tomorrowStr, label: "Tomorrow's Breakfast" };
};

export const MealEstimationWidget: React.FC = () => {
  const [summary, setSummary] = useState<PollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMeal, setActiveMeal] = useState(getActiveMealInfo());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [source, setSource] = useState<'live' | 'local' | null>(null);

  const fetchSummary = useCallback(async () => {
    const meal = getActiveMealInfo();
    setActiveMeal(meal);

    // 1. Try live backend first
    try {
      const token = localStorage.getItem('token');
      const dateStr = meal.date.toISOString();
      const res = await fetch(
        `${API_BASE_URL}/api/polls/summary?date=${encodeURIComponent(dateStr)}&mealType=${meal.type}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const data: PollSummary = await res.json();
        
        setSummary(data);
        setSource('live');
        setLastUpdated(new Date());
        setLoading(false);
        return;
      }
    } catch (_) {
      // Backend down — fall through to local
    }

    // 2. Fallback: aggregate from student portal's localStorage poll keys
    const local = readLocalPollAnswers(meal.type, meal.dateStr);
    setSummary(local);
    setSource('local');
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSummary();

    // Listen for instant real-time student poll votes via Socket.IO
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      query: { role: 'ADMIN' },
    });

    socket.on('meal_poll_updated', () => {
      fetchSummary();
    });

    // Refresh every 10 seconds for live kitchen staff view
    const interval = setInterval(fetchSummary, 10000);
    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [fetchSummary]);

  const totalResponses = summary ? summary.VEG + summary.NON_VEG + summary.SKIPPING : 0;
  const pct = (n: number) => totalResponses > 0 ? Math.round((n / totalResponses) * 100) : 0;

  const mealEmoji = activeMeal.type === 'BREAKFAST' ? '🌅' : activeMeal.type === 'LUNCH' ? '☀️' : '🌙';

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">Live Kitchen Estimations</h3>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Live Sync" />
          </div>
          <p className="text-gray-400 text-xs mt-0.5">
            Student poll responses for{' '}
            <span className="font-bold text-gray-600">{mealEmoji} {activeMeal.label}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold border border-orange-100 uppercase tracking-wide">
            {activeMeal.type}
          </span>
          <button
            onClick={fetchSummary}
            title="Refresh"
            className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-400 font-semibold text-sm animate-pulse">
          Loading poll data...
        </div>
      ) : (
        <>
          {/* Stat cards */}
          {activeMeal.type === 'BREAKFAST' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 relative overflow-hidden">
                <span className="absolute top-2 right-3 text-3xl opacity-20">☀️</span>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Eating Breakfast</span>
                <span className="text-3xl font-extrabold text-blue-700">{(summary?.VEG || 0) + (summary?.NON_VEG || 0)}</span>
                <div className="mt-2 w-full bg-blue-100 rounded-full h-1">
                  <div className="bg-blue-500 h-1 rounded-full transition-all" style={{ width: `${pct((summary?.VEG || 0) + (summary?.NON_VEG || 0))}%` }} />
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 relative overflow-hidden">
                <span className="absolute top-2 right-3 text-3xl opacity-20">🚫</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Skipping</span>
                <span className="text-3xl font-extrabold text-gray-700">{summary?.SKIPPING || 0}</span>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                  <div className="bg-gray-500 h-1 rounded-full transition-all" style={{ width: `${pct(summary?.SKIPPING || 0)}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 rounded-xl p-4 border border-green-100 relative overflow-hidden">
                <span className="absolute top-2 right-3 text-3xl opacity-20">🥗</span>
                <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider block mb-1">Veg</span>
                <span className="text-3xl font-extrabold text-green-700">{summary?.VEG || 0}</span>
                <div className="mt-2 w-full bg-green-100 rounded-full h-1">
                  <div className="bg-green-500 h-1 rounded-full transition-all" style={{ width: `${pct(summary?.VEG || 0)}%` }} />
                </div>
              </div>
              <div className="bg-red-50 rounded-xl p-4 border border-red-100 relative overflow-hidden">
                <span className="absolute top-2 right-3 text-3xl opacity-20">🍗</span>
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block mb-1">Non-Veg</span>
                <span className="text-3xl font-extrabold text-red-700">{summary?.NON_VEG || 0}</span>
                <div className="mt-2 w-full bg-red-100 rounded-full h-1">
                  <div className="bg-red-500 h-1 rounded-full transition-all" style={{ width: `${pct(summary?.NON_VEG || 0)}%` }} />
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 relative overflow-hidden">
                <span className="absolute top-2 right-3 text-3xl opacity-20">🚫</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Skipping</span>
                <span className="text-3xl font-extrabold text-gray-700">{summary?.SKIPPING || 0}</span>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                  <div className="bg-gray-500 h-1 rounded-full transition-all" style={{ width: `${pct(summary?.SKIPPING || 0)}%` }} />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-medium">Total Responses:</span>
          <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">{totalResponses}</span>
          {source && (
            <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wide text-[9px] ${
              source === 'live'
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                : 'bg-amber-50 text-amber-600 border border-amber-100'
            }`}>
              {source === 'live' ? '● Live DB' : '◌ Local Cache'}
            </span>
          )}
        </div>
        {lastUpdated && (
          <span className="text-gray-400 font-medium">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
};
