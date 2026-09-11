import React, { useState, useEffect } from 'react';
import { Star, CheckCircle2, Sparkles, AlertCircle, Send } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface MealFeedbackSectionProps {
  isDark: boolean;
  todayMeals?: {
    breakfast?: string[];
    lunch?: string[];
    dinner?: string[];
  };
}

interface SubmittedFeedback {
  id: string;
  mealType: string;
  rating: number;
  tags?: string;
  comment?: string;
  date: string;
  createdAt: string;
}

const QUICK_TAGS = [
  { label: '🍲 Delicious Taste', type: 'positive' },
  { label: '✨ Clean & Hygienic', type: 'positive' },
  { label: '📏 Good Portion', type: 'positive' },
  { label: '🌡️ Served Hot & Fresh', type: 'positive' },
  { label: '🥗 Good Variety', type: 'positive' },
  { label: '❄️ Served Cold', type: 'constructive' },
  { label: '🧂 Salty / Bland', type: 'constructive' },
  { label: '🌶️ Too Spicy', type: 'constructive' },
  { label: '⏳ Long Queue', type: 'constructive' },
  { label: '🍚 Roti / Rice Quality', type: 'constructive' },
];

const RATING_MOODS: Record<number, { text: string; emoji: string; color: string }> = {
  1: { text: 'Needs Improvement', emoji: '😠', color: 'text-red-500' },
  2: { text: 'Below Average', emoji: '😕', color: 'text-amber-500' },
  3: { text: 'Decent & Acceptable', emoji: '😐', color: 'text-yellow-500' },
  4: { text: 'Tasty & Good', emoji: '😋', color: 'text-emerald-500' },
  5: { text: 'Outstanding!', emoji: '🤩', color: 'text-primary' },
};

export const MealFeedbackSection: React.FC<MealFeedbackSectionProps> = ({ isDark, todayMeals }) => {
  const [selectedMeal, setSelectedMeal] = useState<'BREAKFAST' | 'LUNCH' | 'SNACKS' | 'DINNER'>('LUNCH');
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [submittedFeedbacks, setSubmittedFeedbacks] = useState<Record<string, SubmittedFeedback>>({});

  // Auto-select current meal on mount based on hour
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 11) setSelectedMeal('BREAKFAST');
    else if (hour < 16) setSelectedMeal('LUNCH');
    else if (hour < 19) setSelectedMeal('SNACKS');
    else setSelectedMeal('DINNER');
  }, []);

  // Fetch student's submitted feedbacks for today
  const fetchMyFeedbacks = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/feedback/my-today`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const map: Record<string, SubmittedFeedback> = {};
        if (Array.isArray(data.feedbacks)) {
          data.feedbacks.forEach((fb: SubmittedFeedback) => {
            map[fb.mealType] = fb;
          });
        }
        setSubmittedFeedbacks(map);
      }
    } catch (err) {
      console.warn('Failed to load student feedback:', err);
    }
  };

  useEffect(() => {
    fetchMyFeedbacks();
  }, []);

  // When selected meal changes, populate form if already submitted
  useEffect(() => {
    const existing = submittedFeedbacks[selectedMeal];
    if (existing) {
      setRating(existing.rating);
      setComment(existing.comment || '');
      setSelectedTags(existing.tags ? existing.tags.split(',').filter(Boolean) : []);
    } else {
      setRating(0);
      setComment('');
      setSelectedTags([]);
    }
    setSuccessMessage('');
    setErrorMessage('');
  }, [selectedMeal, submittedFeedbacks]);

  const toggleTag = (tagLabel: string) => {
    if (selectedTags.includes(tagLabel)) {
      setSelectedTags(selectedTags.filter((t) => t !== tagLabel));
    } else {
      setSelectedTags([...selectedTags, tagLabel]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setErrorMessage('Please select a star rating (1 to 5) before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');
      setSuccessMessage('');

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/feedback/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mealType: selectedMeal,
          rating,
          tags: selectedTags,
          comment,
          date: new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setSuccessMessage(`Thank you! Your ${selectedMeal.toLowerCase()} feedback has been recorded.`);
      
      // Update local state map
      setSubmittedFeedbacks((prev) => ({
        ...prev,
        [selectedMeal]: data.feedback,
      }));

      // Clear success banner after 4 seconds
      setTimeout(() => setSuccessMessage(''), 4500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error submitting feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getMealItems = (type: string) => {
    if (type === 'BREAKFAST') return todayMeals?.breakfast || ['Idli', 'Sambar', 'Poha', 'Boiled Egg / Banana'];
    if (type === 'LUNCH') return todayMeals?.lunch || ['Rice', 'Dal', 'Paneer Curry / Chicken Curry', 'Salad'];
    if (type === 'SNACKS') return ['Tea / Coffee', 'Samosa / Biscuits', 'Evening Snack'];
    return todayMeals?.dinner || ['Roti', 'Jeera Rice', 'Dal Tadka', 'Seasonal Veg / Egg Curry'];
  };

  const currentDisplayRating = hoverRating || rating;
  const isMealRated = Boolean(submittedFeedbacks[selectedMeal]);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header Banner */}
      <div
        className={`p-5 sm:p-7 rounded-3xl relative overflow-hidden border ${
          isDark
            ? 'bg-gradient-to-br from-orange-600/15 via-slate-900 to-slate-900 border-white/10'
            : 'bg-gradient-to-br from-orange-50/80 via-white to-orange-50/30 border-orange-200/80 shadow-xs'
        }`}
      >
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Live Student Voice
              </span>
              <span className="text-xs font-bold text-gray-400">• Today's Feedback</span>
            </div>
            <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Meal & Dining <span className="text-primary">Feedback</span>
            </h2>
            <p className={`text-xs sm:text-sm mt-1 max-w-2xl ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              Rate each meal right after dining! Your direct ratings and suggestions reach the hostel mess manager and warden in real time to improve taste and hygiene.
            </p>
          </div>
        </div>
      </div>

      {/* Meal Selection Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'] as const).map((meal) => {
          const isSelected = selectedMeal === meal;
          const fb = submittedFeedbacks[meal];
          const hasFeedback = Boolean(fb);

          return (
            <button
              key={meal}
              type="button"
              onClick={() => setSelectedMeal(meal)}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                isSelected
                  ? isDark
                    ? 'bg-orange-500/15 border-orange-500 text-white shadow-lg shadow-orange-500/10 scale-[1.02]'
                    : 'bg-orange-50/80 border-orange-500 text-orange-950 shadow-md shadow-orange-500/10 scale-[1.02]'
                  : isDark
                  ? 'bg-slate-900/80 border-white/5 text-gray-300 hover:border-white/20'
                  : 'bg-white border-gray-200/80 text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">
                  {meal === 'BREAKFAST' ? '🌅' : meal === 'LUNCH' ? '☀️' : meal === 'SNACKS' ? '☕' : '🌙'}
                </span>
                {hasFeedback ? (
                  <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    {fb.rating}/5
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400">
                    Pending
                  </span>
                )}
              </div>
              <h4 className="font-black text-sm tracking-tight capitalize">{meal.toLowerCase()}</h4>
              <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                {getMealItems(meal).slice(0, 2).join(', ')}...
              </p>
            </button>
          );
        })}
      </div>

      {/* Feedback Form Card */}
      <div
        className={`p-5 sm:p-8 rounded-3xl border transition-all ${
          isDark ? 'bg-slate-900/90 border-white/10 shadow-xl' : 'bg-white border-gray-200/80 shadow-sm'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-gray-100 dark:border-white/5 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {selectedMeal === 'BREAKFAST' ? '🌅' : selectedMeal === 'LUNCH' ? '☀️' : selectedMeal === 'SNACKS' ? '☕' : '🌙'}
              </span>
              <h3 className={`text-xl font-bold tracking-tight capitalize ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {selectedMeal.toLowerCase()} Dining Review
              </h3>
              {isMealRated && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Submitted
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Menu Served: <strong className="text-gray-700 dark:text-gray-300">{getMealItems(selectedMeal).join(' • ')}</strong>
            </p>
          </div>
        </div>

        {/* Success / Error Banners */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Star Rating Selector */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
              1. Rate this meal (Required)
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= currentDisplayRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1.5 sm:p-2 rounded-xl transition-all hover:scale-125 active:scale-95 cursor-pointer focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
                          isFilled
                            ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_2px_8px_rgba(251,191,36,0.5)]'
                            : 'text-gray-300 dark:text-gray-700'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {currentDisplayRating > 0 && RATING_MOODS[currentDisplayRating] && (
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 animate-fade-in">
                  <span className="text-2xl">{RATING_MOODS[currentDisplayRating].emoji}</span>
                  <span className={`text-sm font-extrabold ${RATING_MOODS[currentDisplayRating].color}`}>
                    {RATING_MOODS[currentDisplayRating].text} ({currentDisplayRating}/5)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Quick Tags Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
              2. What did you notice? (Quick Tags)
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {QUICK_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag.label);
                return (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => toggleTag(tag.label)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? tag.type === 'positive'
                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/25'
                          : 'bg-amber-600 text-white border-amber-700 shadow-sm shadow-amber-600/25'
                        : isDark
                        ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                        : 'bg-gray-50 border-gray-200/80 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Suggestions / Comments */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
              3. Suggestions or Compliments (Optional)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g., Dal Tadka had authentic aroma today! / Please serve chapati a little warmer..."
              className={`w-full p-4 rounded-2xl border text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white placeholder-gray-500'
                  : 'bg-gray-50/70 border-gray-200 text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-gray-400">
              {isMealRated ? '⚡ Updating will modify your review.' : '🔒 Submissions are verified by your student pass.'}
            </p>

            <button
              type="submit"
              disabled={submitting || rating === 0}
              className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                rating === 0
                  ? 'bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-orange-600 text-white shadow-primary/20 active:scale-95'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : isMealRated ? 'Update Feedback' : 'Submit Feedback'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MealFeedbackSection;
