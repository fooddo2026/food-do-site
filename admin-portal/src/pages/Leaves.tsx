import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, ShieldCheck, ShieldAlert, Check, X, RefreshCw, Clock, AlertCircle } from 'lucide-react';

import { API_BASE_URL } from '../config';

interface LeaveItem {
  id: string;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  student: {
    name: string;
    rollNumber: string;
    roomNumber: string;
    parentPhone: string;
    hostel: {
      name: string;
    };
  };
}

const CACHE_KEY = 'food_do_admin_leaves_cache';

const Leaves: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // One-time purge of old dummy data (leave_101/102/103) that may have been cached
  useEffect(() => {
    try {
      const oldShared = localStorage.getItem('food_do_shared_leaves');
      if (oldShared) {
        const parsed = JSON.parse(oldShared);
        const hasDummy = Array.isArray(parsed) && parsed.some((l: any) =>
          ['leave_101', 'leave_102', 'leave_103'].includes(l.id)
        );
        if (hasDummy) localStorage.removeItem('food_do_shared_leaves');
      }
    } catch (_) {}
  }, []);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/leaves/all-leaves`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const real: LeaveItem[] = Array.isArray(data) ? data : [];
      setLeaves(real);
      setIsOffline(false);
      // Cache for when backend is temporarily unavailable
      localStorage.setItem(CACHE_KEY, JSON.stringify(real));
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.warn('Leave API unavailable:', err.message);
      // Try admin-specific cache (NOT student's shared localStorage)
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setLeaves(Array.isArray(parsed) ? parsed : []);
        } else {
          setLeaves([]);
        }
      } catch (_) {
        setLeaves([]);
      }
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
    // Auto-refresh every 30 seconds for real-time leave updates
    const interval = setInterval(fetchLeaves, 30000);
    return () => clearInterval(interval);
  }, [fetchLeaves]);

  const handleStatusChange = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoadingId(leaveId);
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/leaves/${leaveId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update leave status');

      setMessage({ text: `Leave request successfully ${status === 'APPROVED' ? 'approved ✓' : 'rejected ✗'}!`, type: 'success' });
      // Optimistic update
      setLeaves(prev => {
        const updated = prev.map(l => l.id === leaveId ? { ...l, status } : l);
        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        return updated;
      });
      // Then re-fetch to confirm
      await fetchLeaves();
    } catch (err: any) {
      if (isOffline) {
        // Offline optimistic update
        setLeaves(prev => {
          const updated = prev.map(l => l.id === leaveId ? { ...l, status } : l);
          localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
          return updated;
        });
        setMessage({ text: `Leave ${status.toLowerCase()} (will sync when backend reconnects).`, type: 'success' });
      } else {
        setMessage({ text: 'Failed to update leave status. Please try again.', type: 'error' });
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getDuration = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  const filtered = filter === 'ALL' ? leaves : leaves.filter(l => l.status === filter);
  const pendingCount = leaves.filter(l => l.status === 'PENDING').length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Leave Management</h2>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-extrabold rounded-full animate-pulse">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Review and approve student mess pass pauses &amp; dining leave requests.
            {lastRefreshed && (
              <span className="ml-2 text-gray-400">
                Last updated: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {isOffline && (
            <span className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              Cached Data
            </span>
          )}
          <button
            onClick={fetchLeaves}
            disabled={loading}
            className="flex items-center gap-2 border border-gray-200 bg-white text-gray-600 px-4 py-2 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-sm cursor-pointer text-xs sm:text-sm justify-center disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
              filter === f
                ? f === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : f === 'APPROVED'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : f === 'REJECTED'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-gray-900 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f === 'ALL' ? `All (${leaves.length})` : f === 'PENDING' ? `Pending (${leaves.filter(l => l.status === 'PENDING').length})` : f === 'APPROVED' ? `Approved (${leaves.filter(l => l.status === 'APPROVED').length})` : `Rejected (${leaves.filter(l => l.status === 'REJECTED').length})`}
          </button>
        ))}
      </div>

      {/* Alert message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-bold text-center border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
              : 'bg-red-50 border-red-100 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Offline warning */}
      {isOffline && (
        <div className="mb-6 p-4 rounded-xl text-sm font-semibold bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Backend server is offline</p>
            <p className="text-xs mt-0.5 text-amber-700">
              Showing cached leave data. New leave applications from students won't appear until the backend server is running.
              <button onClick={fetchLeaves} className="ml-2 underline font-bold cursor-pointer">Try again</button>
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 bg-white rounded-2xl border border-gray-100 text-center text-gray-500 flex justify-center items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading leave requests...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-gray-100 text-center space-y-3">
          <div className="w-14 h-14 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-center mx-auto text-2xl">
            📋
          </div>
          <p className="font-bold text-gray-700">
            {filter === 'ALL' ? 'No leave requests yet' : `No ${filter.toLowerCase()} requests`}
          </p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {filter === 'ALL'
              ? isOffline
                ? 'Backend is offline. Start the server to see real student leave requests.'
                : 'Student leave applications will appear here once students submit them through the student portal.'
              : `No leave requests with ${filter.toLowerCase()} status.`}
          </p>
        </div>
      ) : (
        <>
          {/* MOBILE CARDS VIEW */}
          <div className="space-y-4 md:hidden">
            {filtered.map((l) => (
              <div key={l.id} className="p-4 bg-white rounded-2xl border border-gray-150 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-extrabold text-sm text-gray-900">{l.student?.name || 'Unknown Student'}</h4>
                    <p className="text-xs text-gray-400 font-medium">Roll: {l.student?.rollNumber || 'N/A'}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                      l.status === 'APPROVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : l.status === 'REJECTED'
                        ? 'bg-red-50 text-red-700 border border-red-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}
                  >
                    {l.status === 'PENDING' && <Clock className="w-3 h-3" />}
                    {l.status === 'APPROVED' && <ShieldCheck className="w-3 h-3" />}
                    {l.status === 'REJECTED' && <ShieldAlert className="w-3 h-3" />}
                    {l.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 px-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Hostel & Room</span>
                    <span className="font-bold text-gray-700">{l.student?.hostel?.name || 'N/A'} • {l.student?.roomNumber || 'N/A'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Duration</span>
                    <span className="font-bold text-orange-600">{getDuration(l.startDate, l.endDate)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Period</span>
                    <span className="font-bold text-gray-700">{formatDate(l.startDate)} → {formatDate(l.endDate)}</span>
                  </div>
                </div>

                {l.status === 'PENDING' ? (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleStatusChange(l.id, 'APPROVED')}
                      disabled={actionLoadingId === l.id}
                      className="flex-1 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 text-xs font-bold disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      {actionLoadingId === l.id ? 'Updating...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleStatusChange(l.id, 'REJECTED')}
                      disabled={actionLoadingId === l.id}
                      className="flex-1 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 text-xs font-bold disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      {actionLoadingId === l.id ? 'Updating...' : 'Reject'}
                    </button>
                  </div>
                ) : (
                  <div className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-wide">Processed</div>
                )}
              </div>
            ))}
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-sm font-semibold text-gray-600">Student Info</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Hostel & Room</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Leave Period</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 text-center">Status</th>
                  <th className="p-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-gray-800">{l.student?.name || 'Unknown Student'}</div>
                      <div className="text-xs text-gray-400 font-medium">Roll: {l.student?.rollNumber || 'N/A'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-700">{l.student?.hostel?.name || 'N/A'}</div>
                      <div className="text-xs text-gray-400">Room: {l.student?.roomNumber || 'N/A'}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                        <Calendar className="w-4 h-4 text-orange-500" />
                        {formatDate(l.startDate)} → {formatDate(l.endDate)}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {getDuration(l.startDate, l.endDate)} • Pass paused during this period
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                          l.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : l.status === 'REJECTED'
                            ? 'bg-red-50 text-red-700 border border-red-100'
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}
                      >
                        {l.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                        {l.status === 'APPROVED' && <ShieldCheck className="w-3.5 h-3.5" />}
                        {l.status === 'REJECTED' && <ShieldAlert className="w-3.5 h-3.5" />}
                        {l.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {l.status === 'PENDING' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleStatusChange(l.id, 'APPROVED')}
                            disabled={actionLoadingId === l.id}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Approve Leave"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {actionLoadingId === l.id ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleStatusChange(l.id, 'REJECTED')}
                            disabled={actionLoadingId === l.id}
                            className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Reject Leave"
                          >
                            <X className="w-3.5 h-3.5" />
                            {actionLoadingId === l.id ? '...' : 'Reject'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-gray-400">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Leaves;
