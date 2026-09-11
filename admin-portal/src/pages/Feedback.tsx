import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  Star,
  MessageSquare,
  TrendingUp,
  Filter,
  Calendar,
  Sparkles,
  Utensils,
  Award,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { API_BASE_URL } from '../config';

interface MealStat {
  total: number;
  sum: number;
  avg: number;
}

interface FeedbackSummary {
  totalReviews: number;
  overallAverage: number;
  mealStats: Record<string, MealStat>;
  ratingDistribution: Record<number, number>;
  tagCounts: Record<string, number>;
}

interface RecentFeedback {
  id: string;
  mealType: string;
  rating: number;
  tags: string[];
  comment?: string;
  createdAt: string;
  studentName: string;
  rollNumber: string;
  hostelName: string;
  roomNumber: string;
}

const Feedback: React.FC = () => {
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [recentFeedbacks, setRecentFeedbacks] = useState<RecentFeedback[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterMeal, setFilterMeal] = useState<string>('ALL');
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [realtimeNotification, setRealtimeNotification] = useState<string | null>(null);

  const fetchFeedbackData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/feedback/summary?date=${filterDate}&mealType=${filterMeal}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setRecentFeedbacks(data.recentFeedbacks || []);
      }
    } catch (err) {
      console.warn('Failed to load feedback summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbackData();
  }, [filterMeal, filterDate]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      query: { role: 'ADMIN' },
    });

    socket.on('new_meal_feedback', (newFb: any) => {
      setRealtimeNotification(
        `New ${newFb.rating}★ feedback received for ${newFb.mealType} from ${newFb.studentName}!`
      );
      setTimeout(() => setRealtimeNotification(null), 5000);

      // Prepend to recent list
      setRecentFeedbacks((prev) => [
        {
          id: newFb.id,
          mealType: newFb.mealType,
          rating: newFb.rating,
          tags: newFb.tags ? newFb.tags.split(',') : [],
          comment: newFb.comment,
          createdAt: newFb.createdAt || new Date().toISOString(),
          studentName: newFb.studentName,
          rollNumber: newFb.rollNumber,
          hostelName: newFb.hostelName,
          roomNumber: newFb.roomNumber,
        },
        ...prev.slice(0, 29),
      ]);

      // Refresh aggregations
      fetchFeedbackData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const getRatingColor = (avg: number) => {
    if (avg >= 4.0) return 'text-emerald-500';
    if (avg >= 3.0) return 'text-amber-500';
    return 'text-red-500';
  };

  const getRatingBg = (avg: number) => {
    if (avg >= 4.0) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (avg >= 3.0) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Real-time Toast Banner */}
      {realtimeNotification && (
        <div className="p-3.5 bg-primary/10 border border-primary/20 text-primary rounded-2xl flex items-center justify-between text-xs font-bold animate-bounce shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>{realtimeNotification}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider bg-primary text-white px-2 py-0.5 rounded-full font-black">
            LIVE
          </span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1">
              <Award className="w-3 h-3" />
              Quality & Satisfaction
            </span>
            <span className="text-xs font-bold text-gray-400">• Real-Time Dining Analytics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Meal <span className="text-primary">Feedback & Ratings</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor student dining satisfaction, per-meal star ratings, and direct suggestions in real-time.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold shadow-xs">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold shadow-xs">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterMeal}
              onChange={(e) => setFilterMeal(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Meals</option>
              <option value="BREAKFAST">Breakfast</option>
              <option value="LUNCH">Lunch</option>
              <option value="SNACKS">Snacks</option>
              <option value="DINNER">Dinner</option>
            </select>
          </div>

          <button
            onClick={fetchFeedbackData}
            className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-gray-600 transition-all cursor-pointer active:scale-95 shadow-xs"
            title="Refresh Feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Score */}
        <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Overall Mess Score
            </span>
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <Star className="w-5 h-5 fill-current text-amber-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className={`text-3xl font-black ${getRatingColor(summary?.overallAverage || 0)}`}>
              {summary?.overallAverage ? summary.overallAverage.toFixed(1) : '0.0'}
            </h3>
            <span className="text-xs font-bold text-gray-400">/ 5.0</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            Based on student ratings today
          </p>
        </div>

        {/* Total Reviews */}
        <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Total Responses
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <h3 className="text-3xl font-black text-gray-900">
            {summary?.totalReviews || 0}
          </h3>
          <p className="text-[11px] text-gray-500 mt-2">
            Reviews submitted today
          </p>
        </div>

        {/* Highest Rated Meal */}
        <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Top Rated Meal
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Utensils className="w-5 h-5" />
            </div>
          </div>
          {(() => {
            const stats = summary?.mealStats || {};
            let topMeal = 'N/A';
            let topAvg = 0;
            Object.keys(stats).forEach((k) => {
              if (stats[k].avg > topAvg) {
                topAvg = stats[k].avg;
                topMeal = k;
              }
            });
            return (
              <>
                <h3 className="text-2xl font-black text-gray-900 capitalize">
                  {topMeal.toLowerCase()}
                </h3>
                <p className="text-[11px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
                  ⭐ {topAvg > 0 ? `${topAvg.toFixed(1)} / 5.0 rating` : 'No ratings yet'}
                </p>
              </>
            );
          })()}
        </div>

        {/* Top Tag / Sentiment */}
        <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Top Student Tag
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          {(() => {
            const tags = summary?.tagCounts || {};
            let topTag = 'None yet';
            let topCount = 0;
            Object.keys(tags).forEach((t) => {
              if (tags[t] > topCount) {
                topCount = tags[t];
                topTag = t;
              }
            });
            return (
              <>
                <h3 className="text-lg font-black text-gray-900 truncate" title={topTag}>
                  {topTag}
                </h3>
                <p className="text-[11px] text-purple-600 font-bold mt-2">
                  {topCount > 0 ? `${topCount} students noted this` : 'Awaiting feedback'}
                </p>
              </>
            );
          })()}
        </div>
      </div>

      {/* Per-Meal Breakdown Cards */}
      <div>
        <h2 className="text-base font-extrabold text-gray-900 mb-4 tracking-tight">
          Per-Meal Ratings Breakdown
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'] as const).map((meal) => {
            const stat = summary?.mealStats?.[meal] || { total: 0, sum: 0, avg: 0 };
            const icon =
              meal === 'BREAKFAST'
                ? '🌅'
                : meal === 'LUNCH'
                ? '☀️'
                : meal === 'SNACKS'
                ? '☕'
                : '🌙';

            return (
              <div
                key={meal}
                className="p-5 bg-white border border-gray-200/80 rounded-3xl shadow-xs hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{icon}</span>
                  <span
                    className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${getRatingBg(
                      stat.avg
                    )}`}
                  >
                    ⭐ {stat.avg > 0 ? stat.avg.toFixed(1) : '—'}
                  </span>
                </div>
                <h4 className="font-extrabold text-gray-900 text-sm capitalize">
                  {meal.toLowerCase()}
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  {stat.total} student review{stat.total === 1 ? '' : 's'}
                </p>

                {/* Progress Mini Bar */}
                <div className="w-full bg-gray-100 rounded-full h-2 mt-3 overflow-hidden">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(stat.avg / 5) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rating Distribution & Top Tags Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Star Rating Breakdown */}
        <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm space-y-3">
          <h3 className="text-sm font-extrabold text-gray-900">Rating Distribution</h3>
          <div className="space-y-2 pt-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary?.ratingDistribution?.[star] || 0;
              const total = summary?.totalReviews || 1;
              const pct = Math.round((count / total) * 100);

              return (
                <div key={star} className="flex items-center gap-3 text-xs font-bold text-gray-600">
                  <span className="w-10 flex items-center gap-1 shrink-0">
                    {star} <Star className="w-3.5 h-3.5 fill-current text-amber-400 inline" />
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        star >= 4
                          ? 'bg-emerald-500'
                          : star === 3
                          ? 'bg-amber-400'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-[11px] text-gray-400 shrink-0">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Most Frequent Tags */}
        <div className="lg:col-span-2 p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
          <h3 className="text-sm font-extrabold text-gray-900 mb-3">
            Top Student Observations & Comments
          </h3>
          <div className="flex flex-wrap gap-2 pt-1">
            {summary?.tagCounts && Object.keys(summary.tagCounts).length > 0 ? (
              Object.entries(summary.tagCounts).map(([tag, count]) => (
                <span
                  key={tag}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gray-50 border border-gray-200 text-gray-700 flex items-center gap-1.5"
                >
                  <span>{tag}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-gray-200 text-gray-800 text-[10px]">
                    {count}
                  </span>
                </span>
              ))
            ) : (
              <p className="text-xs text-gray-400 italic py-6">
                No observations tagged yet for this date.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Live Recent Feedbacks Table / Feed */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-gray-900">
              Student Reviews & Feedback Feed
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Live chronological feed of all ratings, tags, and suggestions.
            </p>
          </div>
          <span className="px-3 py-1 bg-gray-100 rounded-xl text-xs font-bold text-gray-600">
            {recentFeedbacks.length} reviews
          </span>
        </div>

        {recentFeedbacks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-primary mx-auto flex items-center justify-center mb-3">
              <Star className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-gray-700">No feedback submitted yet</h4>
            <p className="text-xs text-gray-400 mt-1">
              Feedback submitted by students from the Student Portal will appear here live!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentFeedbacks.map((fb) => (
              <div key={fb.id} className="p-5 sm:p-6 hover:bg-gray-50/70 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    {/* Student Avatar */}
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      {fb.studentName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{fb.studentName}</h4>
                      <p className="text-[10px] text-gray-400">
                        {fb.rollNumber} • {fb.hostelName} Room {fb.roomNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Meal badge */}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-700">
                      {fb.mealType}
                    </span>

                    {/* Star rating */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= fb.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </div>

                    <span className="text-[10px] text-gray-400 flex items-center gap-1 ml-2">
                      <Clock className="w-3 h-3" />
                      {new Date(fb.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                {fb.tags && fb.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {fb.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-orange-50 text-orange-800 border border-orange-200/60"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Comment Text */}
                {fb.comment && (
                  <div className="mt-2.5 p-3 rounded-xl bg-gray-50 text-xs font-medium text-gray-800 border border-gray-100">
                    💬 "{fb.comment}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Feedback;
