// Triggers HMR
import { useState, useEffect } from 'react';
import axios from 'axios';

import { API_BASE_URL } from '../config';

interface ActivePoll {
  mealType: string;
  date: string;
}

export const MealPollModal = () => {
  const [activePoll, setActivePoll] = useState<ActivePoll | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchActivePoll = async () => {
    try {
      const token = localStorage.getItem('student_token') || localStorage.getItem('token');
      if (!token) return;

      const res = await axios.get(`${API_BASE_URL}/api/polls/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.activePoll) {
        setActivePoll(res.data.activePoll);
      }
    } catch (err) {
      console.error('Error fetching active poll:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivePoll();
    // Check every 5 minutes if a poll becomes active
    const interval = setInterval(fetchActivePoll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleResponse = async (preference: 'VEG' | 'NON_VEG' | 'SKIPPING') => {
    if (!activePoll) return;
    
    setSubmitting(true);
    setError('');
    
    try {
      const token = localStorage.getItem('student_token') || localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/api/polls/respond`, {
        mealType: activePoll.mealType,
        date: activePoll.date,
        preference
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Close the modal
      setActivePoll(null);
    } catch (err) {
      console.warn('Backend unavailable, recording poll preference locally:', err);
      // Offline fallback: store response in localStorage and close modal
      try {
        localStorage.setItem(`poll_pref_${activePoll.date}_${activePoll.mealType}`, preference);
      } catch (e) {}
      setActivePoll(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;
  if (!activePoll) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 transition-opacity duration-300 animate-fadeIn">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl relative overflow-hidden transform transition-all duration-300 scale-100">
        {/* Decorative background elements */}
        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-green-500/10 via-transparent to-orange-500/10 pointer-events-none rounded-full blur-3xl opacity-50"></div>
        
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
            Upcoming {activePoll.mealType.charAt(0) + activePoll.mealType.slice(1).toLowerCase()} Preference
          </h2>
          <p className="text-gray-400 mb-8 text-sm">
            Please help us reduce food wastage by confirming your meal preference for the upcoming meal.
          </p>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}
          
          <div className="flex flex-col gap-3">
            {activePoll.mealType === 'BREAKFAST' ? (
              <>
                <button 
                  onClick={() => handleResponse('VEG')}
                  disabled={submitting}
                  className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/30 rounded-xl p-4 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ mixBlendMode: 'overlay' }}></div>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xl">☀️</span>
                    <span className="font-semibold text-blue-400 group-hover:text-blue-300">Yes, I will have Breakfast</span>
                  </div>
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => handleResponse('VEG')}
                  disabled={submitting}
                  className="w-full relative group overflow-hidden bg-gradient-to-r from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/30 rounded-xl p-4 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ mixBlendMode: 'overlay' }}></div>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xl">🥗</span>
                    <span className="font-semibold text-green-400 group-hover:text-green-300">Veg Meal</span>
                  </div>
                </button>
                
                <button 
                  onClick={() => handleResponse('NON_VEG')}
                  disabled={submitting}
                  className="w-full relative group overflow-hidden bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 border border-red-500/30 rounded-xl p-4 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ mixBlendMode: 'overlay' }}></div>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-xl">🍗</span>
                    <span className="font-semibold text-red-400 group-hover:text-red-300">Non-Veg Meal</span>
                  </div>
                </button>
              </>
            )}
            
            <button 
              onClick={() => handleResponse('SKIPPING')}
              disabled={submitting}
              className="w-full mt-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-xl p-3 transition-all duration-300 text-sm font-medium"
            >
              {activePoll.mealType === 'BREAKFAST' ? "No, I'm skipping" : "I'm skipping this meal"}
            </button>
          </div>
          
          {submitting && (
            <div className="absolute inset-0 bg-[#1a1a1a]/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-2xl">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
