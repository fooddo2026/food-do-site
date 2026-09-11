import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import SurplusTokens from '../components/SurplusTokens';
import MealFeedbackSection from '../components/MealFeedbackSection';
import { API_BASE_URL } from '../config';
import {
  LayoutDashboard, QrCode, History, Utensils, CalendarDays,
  CalendarRange, User, LogOut,
  Bell, Sun, Moon, Clock, Flame,
  CheckCircle2, RefreshCw, Star,
  ShieldAlert, Edit3, Save, X,
  Building2, Mail, PhoneCall, MapPin
} from 'lucide-react';

interface StudentPortalProps {
  onLogout: () => void;
}

interface HistoryLog {
  id: string;
  mealType: string;
  date: string;
  status: 'CONSUMED' | 'SKIPPED' | 'ABSENT';
  time: string;
}

export const WEEKLY_MEAL_CYCLE: Record<string, { breakfast: string[], lunch: string[], dinner: string[] }> = {
  Sunday: {
    breakfast: ['Chat', 'Sweet Halwa'],
    lunch: ['Rice', 'Dal', 'Egg Curry', 'Besan Curry (Veg Only)', 'Papad'],
    dinner: ['Chicken Biriyani', 'Veg Biriyani', 'Chicken Joos', 'Raita (Dal Fry for Veg Only)']
  },
  Monday: {
    breakfast: ['Chuda Poha', 'Ghuguni'],
    lunch: ['Rice', 'Dal', 'Besan Curry', 'Dahi Bundi'],
    dinner: ['Roti', 'Rice', 'Dal', 'Buta Dali Curry', 'Simei Kheer']
  },
  Tuesday: {
    breakfast: ['Bada', 'Ghuguni'],
    lunch: ['Rice', 'Dal', 'Aloo Potala Curry', 'Sagu Papad'],
    dinner: ['Roti', 'Rice', 'Dal', 'Soyabean Chilli', 'Rasogola']
  },
  Wednesday: {
    breakfast: ['Suji Halwa', 'Ghuguni'],
    lunch: ['Rice', 'Dal', 'Fish Masala', 'Pampad', 'Manchurian (Veg Only)'],
    dinner: ['Roti', 'Rice', 'Dal', 'Chilli Chicken', 'Mushroom Chilli (Veg Only)']
  },
  Thursday: {
    breakfast: ['Aloochop', 'Ghuguni'],
    lunch: ['Rice', 'Dalma', 'Aloo Kalara Chips', 'Amba Khata / Ambula Rai'],
    dinner: ['Fried Rice', 'Dal Fry', 'Paneer Butter Masala']
  },
  Friday: {
    breakfast: ['Dahibada', 'Aloo Dum', 'Seu'],
    lunch: ['Rice', 'Dal', 'Fish Masala', 'Mudhi Ghanta', 'Paneer Green Matar Masala', 'Papad (Veg Only)'],
    dinner: ['Roti', 'Rice', 'Dal', 'Chicken Butter Masala', 'Paneer Butter Masala']
  },
  Saturday: {
    breakfast: ['Idli', 'Ghuguni', 'Chatani'],
    lunch: ['Rice', 'Dalma', 'Aloo Bharata', 'Badichura / Mix Pickel'],
    dinner: ['Roti', 'Rice', 'Dal', 'Egg Tadka', 'Veg Tadka']
  }
};

export const getInitialTodayMeals = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = days[new Date().getDay()];
  const d = WEEKLY_MEAL_CYCLE[todayName] || WEEKLY_MEAL_CYCLE['Thursday'];
  return {
    breakfast: d.breakfast,
    lunch: d.lunch,
    dinner: d.dinner,
    breakfastReady: true,
    lunchReady: true,
    dinnerReady: false
  };
};

const StudentPortal: React.FC<StudentPortalProps> = ({ onLogout }) => {
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'qr' | 'history' | 'menu' | 'attendance' | 'leave' | 'feedback' | 'profile' | 'settings' | 'tokens'
  >('dashboard');

  // Dark mode local simulation state
  const [isDark, setIsDark] = useState<boolean>(false);

  // Sync dark class on document root
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Notification simulation
  const [showNotifications, setShowNotifications] = useState(false);


  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Helper to load real session user from local storage
  const getSessionUser = () => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) { }
    return null;
  };

  const initialUser = getSessionUser();

  // Student variables loaded dynamically from real local storage user session
  const [studentName, setStudentName] = useState<string>(
    initialUser?.name || initialUser?.student?.name || ''
  );
  const [studentId, setStudentId] = useState<string>(
    initialUser?.id || initialUser?.studentId || initialUser?.student?.id || ''
  );
  const [rollNumber, setRollNumber] = useState<string>(
    initialUser?.rollNumber || initialUser?.student?.rollNumber || ''
  );
  const [foodPreference, setFoodPreference] = useState<'Veg' | 'Non-Veg'>(
    initialUser?.foodPreference || initialUser?.student?.foodPreference || 'Veg'
  );
  const [studentEmail, setStudentEmail] = useState<string>(
    initialUser?.email || ''
  );
  const [hostelName, setHostelName] = useState<string>(
    initialUser?.hostel || initialUser?.student?.hostel || ''
  );
  const [roomNumber, setRoomNumber] = useState<string>(
    initialUser?.roomNumber || initialUser?.student?.roomNumber || ''
  );
  const [parentPhone, setParentPhone] = useState<string>(
    initialUser?.parentPhone || initialUser?.student?.parentPhone || ''
  );
  const [messAssociation, setMessAssociation] = useState<string>(
    initialUser?.mess || initialUser?.student?.mess || ''
  );
  const [studentType, setStudentType] = useState<'HOSTELER' | 'DAY_SCHOLAR'>(
    initialUser?.studentType || initialUser?.student?.studentType || 'HOSTELER'
  );

  // Real-time scan toast state
  const [scanAlert, setScanAlert] = useState<{
    show: boolean;
    studentName: string;
    smsAlert: string;
    timestamp: string;
    gateType: 'ENTRY' | 'EXIT';
    duration?: number;
  } | null>(null);

  // QR Static Pass Token
  const [qrSignature, setQrSignature] = useState('');
  void qrSignature;

  // Form states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveStatus, setLeaveStatus] = useState<string | null>(null);
  const [myLeaves, setMyLeaves] = useState<any[]>([]);
  const [attendanceMetrics, setAttendanceMetrics] = useState({
    monthlyRatio: 95.5,
    mealsConsumed: 0,
    streak: 0,
    missedAndAbsent: 0,
  });
  const [attendanceHeatmap, setAttendanceHeatmap] = useState<any[]>([]);

  const [rating, setRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);

  // Profile Editing State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(studentName);
  const [editRoomNumber, setEditRoomNumber] = useState(roomNumber);
  const [editFoodPref, setEditFoodPref] = useState<'Veg' | 'Non-Veg'>(foodPreference);
  const [editMess, setEditMess] = useState(messAssociation);
  const [editParentPhone, setEditParentPhone] = useState(parentPhone);
  const [profileSaveStatus, setProfileSaveStatus] = useState<string | null>(null);

  // ── Meal Poll (Broadcast Popup) State ──────────────────────────────────────
  const [mealPoll, setMealPoll] = useState<{
    mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER';
    date: string; // ISO date string for the meal
  } | null>(null);
  const [pollSubmitting, setPollSubmitting] = useState(false);
  const [pollDone, setPollDone] = useState(false); // shows brief ✔ confirmation before hiding
  
  // ── Reactive Meal Poll Preference for QR Pass ────────────────────
  const [todayPollPref, setTodayPollPref] = useState<'VEG' | 'NON-VEG' | null>(() => {
    try {
      const todayYMD = new Date().toISOString().split('T')[0];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('food_do_poll_answered_') && key.includes(todayYMD)) {
          const val = localStorage.getItem(key);
          if (val === 'NON_VEG') return 'NON-VEG';
          if (val === 'VEG') return 'VEG';
        }
      }
    } catch (_) {}
    return null;
  });

  // ── Food Ready Overlay State ──────────────────────────────────────
  const [foodReadyOverlay, setFoodReadyOverlay] = useState<string | null>(null);

  /**
   * Stable identifier for poll keys: prefer email over studentId
   * because studentId may be empty on first render.
   */
  const getPollUserId = () => studentEmail || studentId || 'guest';

  /**
   * Returns a localStorage key that uniquely identifies the poll slot
   * so we can mark it as "already answered" per student per meal.
   */
  const getPollLocalKey = (mealType: string, date: string) =>
    `food_do_poll_answered_${getPollUserId()}_${mealType}_${date}`;

  /** Clears stale 'anon' poll keys from previous sessions */
  const clearAnonPollKeys = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('food_do_poll_answered_anon_') || key.startsWith('food_do_poll_answered_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (_) {}
  };

  /** Fetch active poll from backend (or derive locally from time) */
  const checkActivePoll = async () => {
    const userId = getPollUserId();
    // Don't show poll until we know who the student is
    if (userId === 'guest') return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/polls/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.activePoll) {
          const { mealType, date } = data.activePoll;
          const dateStr = typeof date === 'string'
            ? date.split('T')[0]
            : new Date(date).toISOString().split('T')[0];
          const key = getPollLocalKey(mealType, dateStr);
          if (!localStorage.getItem(key)) {
            setMealPoll({ mealType, date: dateStr });
          }
        }
        return;
      }
    } catch (_) {
      // backend unavailable — fallback to local time-based logic
    }

    // Local fallback: derive active window from current time
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const getLocalYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    
    const todayStr = getLocalYMD(now);
    const tomorrowStr = getLocalYMD(new Date(now.getTime() + 86400000));

    let derivedMealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | null = null;
    let derivedDate = todayStr;

    // Breakfast window: 10:00 PM (1320) previous night to 7:30 AM (450)
    if (mins >= 1320) { derivedMealType = 'BREAKFAST'; derivedDate = tomorrowStr; }
    else if (mins < 450) { derivedMealType = 'BREAKFAST'; derivedDate = todayStr; }
    // Lunch window: 9:00 AM (540) to 2:00 PM (840)
    else if (mins >= 540 && mins < 840) { derivedMealType = 'LUNCH'; derivedDate = todayStr; }
    // Dinner window: 4:00 PM (960) to 9:00 PM (1260)
    else if (mins >= 960 && mins < 1260) { derivedMealType = 'DINNER'; derivedDate = todayStr; }

    if (derivedMealType) {
      const key = getPollLocalKey(derivedMealType, derivedDate);
      if (!localStorage.getItem(key)) {
        setMealPoll({ mealType: derivedMealType, date: derivedDate });
      }
    }
  };

  /** Submit the student's meal preference to backend */
  const [pollError, setPollError] = useState('');
  
  const submitMealPoll = async (preference: 'VEG' | 'NON_VEG' | 'SKIPPING') => {
    if (!mealPoll) return;
    setPollSubmitting(true);
    setPollError('');
    const { mealType, date } = mealPoll;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/polls/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mealType, date, preference }),
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          onLogout();
          return;
        }
        const errData = await res.json().catch(() => ({}));
        console.error('Failed to submit poll to server. Will not cache locally.', errData);
        setPollError(errData.error || `Server Error: ${res.status}`);
        setPollSubmitting(false);
        return;
      }
    } catch (err: any) {
      console.error('API Error submitting poll:', err);
      setPollError(err.message || 'Network Error');
      setPollSubmitting(false);
      return;
    }

    // Mark as answered in localStorage (admin widget reads this key pattern)
    const localKey = getPollLocalKey(mealType, date);
    localStorage.setItem(localKey, preference);
    if (preference === 'NON_VEG') setTodayPollPref('NON-VEG');
    else if (preference === 'VEG') setTodayPollPref('VEG');
    setPollSubmitting(false);
    setPollDone(true);
    setTimeout(() => {
      setMealPoll(null);
      setPollDone(false);
    }, 1800);
  };
  // ── End Meal Poll State ────────────────────────────────────────────────────

  // Sync edit form fields whenever profile data finishes loading
  useEffect(() => {
    setEditName(studentName);
    setEditRoomNumber(roomNumber);
    setEditFoodPref(foodPreference);
    setEditMess(messAssociation || 'Main 2nd Floor');
    setEditParentPhone(parentPhone);
  }, [studentName, roomNumber, foodPreference, messAssociation, parentPhone]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaveStatus('saving');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          roomNumber: editRoomNumber,
          foodPreference: editFoodPref,
          mess: editMess,
          parentPhone: editParentPhone,
        }),
      });

      if (response.ok) {
        setStudentName(editName);
        setRoomNumber(editRoomNumber);
        setFoodPreference(editFoodPref);
        setMessAssociation(editMess);
        setParentPhone(editParentPhone);

        try {
          const stored = localStorage.getItem('user');
          if (stored) {
            const userObj = JSON.parse(stored);
            userObj.name = editName;
            userObj.roomNumber = editRoomNumber;
            userObj.foodPreference = editFoodPref;
            userObj.mess = editMess;
            userObj.parentPhone = editParentPhone;
            localStorage.setItem('user', JSON.stringify(userObj));
          }
        } catch (err) { }

        setProfileSaveStatus('success');
        setIsEditingProfile(false);
        setTimeout(() => setProfileSaveStatus(null), 3000);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setStudentName(editName);
      setRoomNumber(editRoomNumber);
      setFoodPreference(editFoodPref);
      setMessAssociation(editMess);
      setParentPhone(editParentPhone);

      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const userObj = JSON.parse(stored);
          userObj.name = editName;
          userObj.roomNumber = editRoomNumber;
          userObj.foodPreference = editFoodPref;
          userObj.mess = editMess;
          userObj.parentPhone = editParentPhone;
          localStorage.setItem('user', JSON.stringify(userObj));
        }
      } catch (e) { }

      setProfileSaveStatus('success');
      setIsEditingProfile(false);
      setTimeout(() => setProfileSaveStatus(null), 3000);
    }
  };


  // Active Menu
  const [todayMeals, setTodayMeals] = useState<any>(getInitialTodayMeals);

  const [upcomingMeal, setUpcomingMeal] = useState<{ mealType: string; items: string[] }>(() => {
    const initMeals = getInitialTodayMeals();
    const now = new Date();
    const totalMins = now.getHours() * 60 + now.getMinutes();
    const isBf = totalMins < 600 || totalMins >= 1320;
    const isLunch = totalMins >= 600 && totalMins < 1000;
    const type = isBf ? 'BREAKFAST' : isLunch ? 'LUNCH' : 'DINNER';
    const items = type === 'BREAKFAST' ? initMeals.breakfast : type === 'LUNCH' ? initMeals.lunch : initMeals.dinner;
    return {
      mealType: type,
      items: items || []
    };
  });

  const [menuSubTab, setMenuSubTab] = useState<'today' | 'weekly'>('today');

  // Real-time Notification logs
  const [notifications, setNotifications] = useState<any[]>([]);

  // History logs
  const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);

  // Helper to calculate active/upcoming meal info based on exact system clock
  const getCurrentMealInfo = (now: Date = new Date()) => {
    const totalMins = now.getHours() * 60 + now.getMinutes();

    // Breakfast: 7:00 AM (420) - 8:30 AM (510) Mess | 8:30 AM (510) - 10:00 AM (600) Kitchen
    // Lunch: 2:00 PM (840) - 3:30 PM (930) Mess | 3:30 PM (930) - 4:00 PM (960) Kitchen
    // Dinner: 8:30 PM (1230) - 9:30 PM (1290) Mess | 9:30 PM (1290) - 10:00 PM (1320) Kitchen

    if (totalMins >= 420 && totalMins < 510) {
      return {
        mealType: 'BREAKFAST' as const,
        isServingNow: true,
        isKitchenServing: false,
        location: 'Mess Hall',
        timeSubtitle: 'Serving live now at Main Mess Hall (07:00 AM - 08:30 AM)',
        badgeText: 'LIVE SERVING • MESS HALL',
      };
    } else if (totalMins >= 510 && totalMins <= 600) {
      return {
        mealType: 'BREAKFAST' as const,
        isServingNow: true,
        isKitchenServing: true,
        location: 'Kitchen Counter',
        timeSubtitle: 'Main Mess Closed • Late Food Pickup active at Kitchen Counter (08:30 AM - 10:00 AM)',
        badgeText: 'LATE PICKUP • KITCHEN COUNTER',
      };
    } else if (totalMins >= 840 && totalMins < 930) {
      return {
        mealType: 'LUNCH' as const,
        isServingNow: true,
        isKitchenServing: false,
        location: 'Mess Hall',
        timeSubtitle: 'Serving live now at Main Mess Hall (02:00 PM - 03:30 PM)',
        badgeText: 'LIVE SERVING • MESS HALL',
      };
    } else if (totalMins >= 930 && totalMins <= 960) {
      return {
        mealType: 'LUNCH' as const,
        isServingNow: true,
        isKitchenServing: true,
        location: 'Kitchen Counter',
        timeSubtitle: 'Main Mess Closed • Late Food Pickup active at Kitchen Counter (03:30 PM - 04:00 PM)',
        badgeText: 'LATE PICKUP • KITCHEN COUNTER',
      };
    } else if (totalMins >= 1230 && totalMins < 1290) {
      return {
        mealType: 'DINNER' as const,
        isServingNow: true,
        isKitchenServing: false,
        location: 'Mess Hall',
        timeSubtitle: 'Serving live now at Main Mess Hall (08:30 PM - 09:30 PM)',
        badgeText: 'LIVE SERVING • MESS HALL',
      };
    } else if (totalMins >= 1290 && totalMins <= 1320) {
      return {
        mealType: 'DINNER' as const,
        isServingNow: true,
        isKitchenServing: true,
        location: 'Kitchen Counter',
        timeSubtitle: 'Main Mess Closed • Late Food Pickup active at Kitchen Counter (09:30 PM - 10:00 PM)',
        badgeText: 'LATE PICKUP • KITCHEN COUNTER',
      };
    } else {
      if (totalMins < 420 || totalMins > 1320) {
        return {
          mealType: 'BREAKFAST' as const,
          isServingNow: false,
          isKitchenServing: false,
          location: 'Mess Hall',
          timeSubtitle: 'Mess Closed • Next Serving starts at 07:00 AM (Mess Hall)',
          badgeText: 'UPCOMING • BREAKFAST (07:00 AM)',
        };
      } else if (totalMins < 840) {
        return {
          mealType: 'LUNCH' as const,
          isServingNow: false,
          isKitchenServing: false,
          location: 'Mess Hall',
          timeSubtitle: 'Mess Closed • Next Serving starts at 02:00 PM (Mess Hall)',
          badgeText: 'UPCOMING • LUNCH (02:00 PM)',
        };
      } else {
        return {
          mealType: 'DINNER' as const,
          isServingNow: false,
          isKitchenServing: false,
          location: 'Mess Hall',
          timeSubtitle: 'Mess Closed • Next Serving starts at 08:30 PM (Mess Hall)',
          badgeText: 'UPCOMING • DINNER (08:30 PM)',
        };
      }
    }
  };

  const currentMealInfo = getCurrentMealInfo(currentTime);

  // Clock Update Effect & Dynamic Meal Scheduler
  useEffect(() => {
    const syncActiveMeal = () => {
      const now = new Date();
      setCurrentTime(now);
      const info = getCurrentMealInfo(now);
      const fallback = getInitialTodayMeals();
      const items = info.mealType === 'BREAKFAST'
        ? (todayMeals.breakfast && todayMeals.breakfast.length > 0 ? todayMeals.breakfast : fallback.breakfast)
        : info.mealType === 'LUNCH'
          ? (todayMeals.lunch && todayMeals.lunch.length > 0 ? todayMeals.lunch : fallback.lunch)
          : (todayMeals.dinner && todayMeals.dinner.length > 0 ? todayMeals.dinner : fallback.dinner);

      setUpcomingMeal({
        mealType: info.mealType,
        items: items || []
      });
    };

    syncActiveMeal();
    const clockTimer = setInterval(syncActiveMeal, 10000);
    return () => clearInterval(clockTimer);
  }, [todayMeals]);

  // Sync token from local storage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u && u.name) {
          setStudentName(u.name);
        } else if (u && u.email) {
          setStudentName(u.email.split('@')[0].toUpperCase());
        }
        if (u && u.email) {
          setStudentEmail(u.email);
        }
        if (u && u.rollNumber) {
          setRollNumber(u.rollNumber);
        }
        if (u && u.foodPreference) {
          setFoodPreference(u.foodPreference);
        }
        if (u && u.hostel) {
          setHostelName(u.hostel);
        }
        if (u && u.roomNumber) {
          setRoomNumber(u.roomNumber);
        }
        if (u && u.parentPhone) {
          setParentPhone(u.parentPhone);
        }
        if (u && u.mess) {
          setMessAssociation(u.mess);
        }
        if (u && (u.studentType || u.student?.studentType)) {
          setStudentType(u.studentType || u.student.studentType);
        }
        if (u && u.id) {
          setStudentId(u.id);
        }
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }

    // Fetch initial profile
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.student) {
            if (data.student.name && data.student.name !== 'John Doe') {
              setStudentName(data.student.name);
            }
            if (data.student.rollNumber && !data.student.rollNumber.includes('1024')) {
              setRollNumber(data.student.rollNumber);
            }
            if (data.student.foodPreference) {
              setFoodPreference(data.student.foodPreference === 'NON_VEG' ? 'Non-Veg' : data.student.foodPreference === 'VEG' ? 'Veg' : data.student.foodPreference);
            }
            if (data.student.hostel) {
              setHostelName(typeof data.student.hostel === 'object' ? data.student.hostel.name : data.student.hostel);
            }
            if (data.student.roomNumber) {
              setRoomNumber(data.student.roomNumber);
            }
            if (data.email) {
              setStudentEmail(data.email);
            }
            if (data.student.parentPhone) {
              setParentPhone(data.student.parentPhone);
            }
            if (data.student.mess) {
              setMessAssociation(data.student.mess);
            }
            if (data.student.studentType) {
              setStudentType(data.student.studentType);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch live profile, using fallback');
      }
    };

    fetchProfile();
    fetchMenu();
    fetchQRToken();
    fetchLeaves();
    fetchAttendance();

    // Listen to real-time scanning events via Socket.io
    const socket = io(API_BASE_URL);

    socket.on('meal_scanned', (eventData) => {
      if (eventData && eventData.studentId === studentId) {
        fetchAttendance();
        setScanAlert({
          show: true,
          studentName: eventData.studentName || studentName,
          smsAlert: eventData.smsAlert || 'Parent alerted via SMS',
          timestamp: eventData.time,
          gateType: eventData.gateType || 'ENTRY',
          duration: eventData.duration,
        });

        // Insert/update logs
        setHistoryLogs((prev) => {
          if (eventData.gateType === 'EXIT') {
            return prev.map(log => {
              if (log.date === 'Today' && log.mealType === eventData.mealType) {
                return { ...log, time: `${log.time} - ${eventData.time} (${eventData.duration} mins)` };
              }
              return log;
            });
          } else {
            return [
              {
                id: Math.random().toString(),
                mealType: eventData.mealType,
                date: 'Today',
                status: 'CONSUMED',
                time: eventData.time
              },
              ...prev
            ];
          }
        });

        setTimeout(() => {
          setScanAlert(null);
        }, 8000);
      }
    });

    const triggerFoodReadyNotice = (eventData: any) => {
      const itemsStr = Array.isArray(eventData.items) ? eventData.items.join(', ') : '';
      const mealType = eventData.mealType || 'MEAL';
      const mess = eventData.mess || 'Ramanujan Mess Hall';

      const newNotification = {
        id: Date.now(),
        text: `📢 ${mealType} IS READY! Served at ${mess}. ${itemsStr ? `Items: ${itemsStr}` : ''}`,
        time: 'Just now',
        unread: true
      };

      setNotifications(prev => {
        if (prev.length > 0 && prev[0].text === newNotification.text) return prev;
        return [newNotification, ...prev];
      });

      setScanAlert({
        show: true,
        studentName: studentName,
        smsAlert: `📢 FOOD READY BROADCAST: ${mealType} is now being served at ${mess}!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        gateType: 'ENTRY',
      });
      
      setFoodReadyOverlay(mealType.toUpperCase());
      setTimeout(() => setFoodReadyOverlay(null), 3000);

      setTodayMeals((prev: any) => ({
        ...prev,
        [mealType.toLowerCase() + 'Ready']: true
      }));

      fetchMenu();

      setTimeout(() => {
        setScanAlert(null);
      }, 9000);
    };

    socket.on('food_ready', (eventData) => {
      triggerFoodReadyNotice(eventData);
    });

    const handleCustomEvent = (e: any) => {
      if (e.detail) {
        triggerFoodReadyNotice(e.detail);
      }
    };
    window.addEventListener('food_ready_event', handleCustomEvent);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'food_ready_broadcast' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          triggerFoodReadyNotice(parsed);
        } catch (err) { }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    let lastBroadcastId: any = null;
    const broadcastChecker = setInterval(() => {
      const stored = localStorage.getItem('food_ready_broadcast');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.id && parsed.id !== lastBroadcastId) {
            lastBroadcastId = parsed.id;
            triggerFoodReadyNotice(parsed);
          }
        } catch (e) { }
      }
    }, 1500);

    fetchQRToken();
    const qrInterval = setInterval(fetchQRToken, 30000); // Refresh TOTP every 30s

    return () => {
      clearInterval(qrInterval);
      clearInterval(broadcastChecker);
      window.removeEventListener('food_ready_event', handleCustomEvent);
      window.removeEventListener('storage', handleStorageChange);
      socket.disconnect();
    };
  }, [studentId]);

  // ── Meal Poll Checker: runs on mount, on user profile load, every 5 min ──────
  useEffect(() => {
    // Clear stale 'anon' keys from before user profile was loaded
    clearAnonPollKeys();

    // Only check once we know the user identity (email or studentId)
    const userId = getPollUserId();
    if (userId === 'guest') return;

    // Immediate check (no delay needed - user identity is confirmed)
    checkActivePoll();

    // Re-check every 5 minutes so transitions between meal windows are caught
    const pollInterval = setInterval(() => {
      checkActivePoll();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(pollInterval);
    };
  // Re-run whenever studentEmail or studentId loads (whichever comes first)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentEmail, studentId]);
  // ── End Meal Poll Checker ─────────────────────────────────────────────────

  const fetchQRToken = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/meals/qr`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setQrSignature(data.token);
      } else {
        throw new Error('Local signature fallback');
      }
    } catch (err) {
      // Fallback for offline mode testing
      const staticHash = 'static-offline-token-' + (studentId || 'guest');
      setQrSignature(staticHash);
    }
  };

  const fetchLeaves = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/leaves/my-leaves`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setMyLeaves(data);
          return;
        }
      }
    } catch (err) {
      console.warn('Could not fetch leaves from backend API, checking shared local store');
    }
    try {
      const shared = localStorage.getItem('food_do_shared_leaves');
      if (shared) {
        setMyLeaves(JSON.parse(shared));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isPassPaused = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return myLeaves.some((leave) => {
      if (leave.status !== 'APPROVED') return false;
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return today >= start && today <= end;
    });
  };

  const fetchAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/meals/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.metrics) {
          setAttendanceMetrics(data.metrics);
        }
        if (data.heatmap) {
          setAttendanceHeatmap(data.heatmap);
        }
        if (data.logs) {
          setHistoryLogs(data.logs);
        }
      }
    } catch (err) {
      console.warn('Could not fetch student attendance data');
    }
  };

  const fetchMenu = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/menus`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const fallback = getInitialTodayMeals();
      const mealData: any = {
        breakfast: fallback.breakfast,
        lunch: fallback.lunch,
        dinner: fallback.dinner,
        breakfastReady: fallback.breakfastReady,
        lunchReady: fallback.lunchReady,
        dinnerReady: fallback.dinnerReady
      };

      if (response.ok) {
        const data = await response.json();

        const getLocalYMD = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };
        const todayStr = getLocalYMD(new Date());
        const mealsToday = Array.isArray(data) ? data.filter((m: any) => {
          const mDate = getLocalYMD(new Date(m.serveDate));
          return mDate === todayStr;
        }) : [];

        if (mealsToday.length > 0) {
          mealsToday.forEach((m: any) => {
            const itemsList = Array.isArray(m.items)
              ? m.items
              : typeof m.items === 'string'
                ? JSON.parse(m.items)
                : [];
            if (itemsList && itemsList.length > 0) {
              if (m.mealType === 'BREAKFAST') {
                mealData.breakfast = itemsList;
                mealData.breakfastReady = m.isReady;
              } else if (m.mealType === 'LUNCH') {
                mealData.lunch = itemsList;
                mealData.lunchReady = m.isReady;
              } else if (m.mealType === 'DINNER') {
                mealData.dinner = itemsList;
                mealData.dinnerReady = m.isReady;
              }
            }
          });
        }
      }

      setTodayMeals((prev: any) => ({ ...prev, ...mealData }));

      const targetType = getCurrentMealInfo(new Date()).mealType;
      const activeItems = targetType === 'BREAKFAST'
        ? mealData.breakfast
        : targetType === 'LUNCH'
          ? mealData.lunch
          : mealData.dinner;

      setUpcomingMeal({
        mealType: targetType,
        items: (activeItems && activeItems.length > 0) ? activeItems : fallback.lunch
      });
    } catch (err) {
      console.warn('Could not fetch menu, using default weekly cycle');
      const fallback = getInitialTodayMeals();
      setTodayMeals((prev: any) => ({ ...fallback, ...prev }));
      const targetType = getCurrentMealInfo(new Date()).mealType;
      const activeItems = targetType === 'BREAKFAST'
        ? fallback.breakfast
        : targetType === 'LUNCH'
          ? fallback.lunch
          : fallback.dinner;
      setUpcomingMeal({
        mealType: targetType,
        items: activeItems
      });
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;

    setLeaveStatus('submitting');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/leaves/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ startDate, endDate }),
      });

      if (response.ok) {
        setLeaveStatus('success');
        setStartDate('');
        setEndDate('');
        await fetchLeaves();
        setTimeout(() => setLeaveStatus(null), 4000);
      } else {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to apply leave');
      }
    } catch (err: any) {
      console.warn('Backend unavailable, saving leave application locally:', err);
      const newLeave = {
        id: 'leave-' + Date.now(),
        startDate,
        endDate,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };
      const updated = [newLeave, ...myLeaves];
      setMyLeaves(updated);
      try {
        localStorage.setItem('food_do_shared_leaves', JSON.stringify(updated));
      } catch (e) {}
      setLeaveStatus('success');
      setStartDate('');
      setEndDate('');
      setTimeout(() => setLeaveStatus(null), 4000);
    }
  };

  const submitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    setFeedbackStatus('submitting');
    setTimeout(() => {
      setFeedbackStatus('success');
      setRating(0);
      setFeedbackText('');
      setTimeout(() => setFeedbackStatus(null), 4000);
    }, 600);
  };

  // Ultra-Lightweight Micro-Payload for Instant ESP32 Scanning with Minimal Dots
  const effectiveFoodPref = todayPollPref || (foodPreference.toUpperCase().includes('NON') ? 'NON-VEG' : 'VEG');
  const firstName = (studentName || initialUser?.name || 'Student').trim().split(/\s+/)[0].toUpperCase();
  const shortHostel = (hostelName || initialUser?.hostel || 'BH 02').replace(/\s+/g, ' ').trim().toUpperCase();
  const primaryId = (rollNumber || studentId || initialUser?.rollNumber || initialUser?.id || 'STUDENT').trim();
  const qrToken = `${primaryId}|${firstName}|${effectiveFoodPref}|${shortHostel}`;

  // Dynamic Meal Card Status Helper based on current time & student scanning log
  const getMealCardState = (mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER') => {
    const now = currentTime;
    const currentMins = now.getHours() * 60 + now.getMinutes();

    // Check if there is a log for today for this meal
    const todayLog = historyLogs.find(
      (log) => log.date === 'Today' && log.mealType.toUpperCase() === mealType
    );

    const schedules = {
      BREAKFAST: {
        title: 'Breakfast',
        startMins: 7 * 60,       // 07:00 AM
        endMins: 10 * 60,        // 10:00 AM
        defaultTimeLabel: '7:00 AM - 10:00 AM',
        entryCheckFallback: '7:00 AM Entry Check'
      },
      LUNCH: {
        title: 'Lunch',
        startMins: 14 * 60,      // 02:00 PM
        endMins: 15 * 60 + 30,   // 03:30 PM
        defaultTimeLabel: '2:00 PM - 3:30 PM',
        entryCheckFallback: '2:00 PM Entry Check'
      },
      DINNER: {
        title: 'Dinner',
        startMins: 20 * 60 + 30, // 08:30 PM
        endMins: 22 * 60,        // 10:00 PM
        defaultTimeLabel: '8:30 PM - 10:00 PM',
        entryCheckFallback: '8:30 PM Entry Check'
      }
    };

    const sched = schedules[mealType];

    // Case 1: Meal was consumed / scanned today
    if (todayLog && (todayLog.status === 'CONSUMED' || todayLog.time)) {
      let timeDisplay = todayLog.time;
      if (!timeDisplay.includes('Entry Check') && !timeDisplay.includes('Leave')) {
        const firstPart = timeDisplay.split(' - ')[0] || timeDisplay;
        timeDisplay = `${firstPart} Entry Check`;
      }
      if (todayLog.status === 'SKIPPED') {
        timeDisplay = 'Leave Pause Activated';
      }

      return {
        status: todayLog.status === 'SKIPPED' ? 'Skipped' : 'Served',
        statusColor: todayLog.status === 'SKIPPED' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400',
        badgeClass: todayLog.status === 'SKIPPED'
          ? (isDark ? 'bg-amber-950/80 text-amber-200 border-amber-700/60' : 'bg-amber-100 text-amber-950 border-amber-300')
          : (isDark ? 'bg-emerald-950/80 text-emerald-200 border-emerald-700/60' : 'bg-emerald-100 text-emerald-950 border-emerald-300'),
        clockIconColor: todayLog.status === 'SKIPPED' ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400',
        timeLabel: timeDisplay,
        isCompleted: true,
        isServingNow: false,
        isClosed: false,
        strokeColor: todayLog.status === 'SKIPPED' ? '#f59e0b' : '#10b981',
        strokeDashoffset: '0'
      };
    }

    // Case 2: Currently within serving window
    if (currentMins >= sched.startMins && currentMins <= sched.endMins) {
      return {
        status: 'Active Serving',
        statusColor: 'text-orange-600 dark:text-orange-400',
        badgeClass: isDark
          ? 'bg-orange-950/80 text-orange-200 border-orange-700/60 font-semibold animate-pulse'
          : 'bg-orange-100 text-orange-950 border-orange-300 font-semibold animate-pulse',
        clockIconColor: 'text-orange-700 dark:text-orange-400',
        timeLabel: sched.defaultTimeLabel,
        isCompleted: false,
        isServingNow: true,
        isClosed: false,
        strokeColor: '#f97316',
        strokeDashoffset: '50'
      };
    }

    // Case 3: Meal service window has ended for today (e.g. 10:35 PM for Dinner)
    if (currentMins > sched.endMins) {
      return {
        status: 'Closed',
        statusColor: 'text-slate-500 dark:text-slate-400',
        badgeClass: isDark
          ? 'bg-slate-800/80 text-slate-300 border-slate-700'
          : 'bg-slate-100 text-slate-700 border-slate-300',
        clockIconColor: 'text-slate-500 dark:text-slate-400',
        timeLabel: `${sched.defaultTimeLabel.split(' - ')[1]} Service Ended`,
        isCompleted: false,
        isServingNow: false,
        isClosed: true,
        strokeColor: '#64748b',
        strokeDashoffset: '145'
      };
    }

    // Case 4: Upcoming meal (before start time)
    return {
      status: 'Upcoming',
      statusColor: 'text-amber-600 dark:text-amber-400',
      badgeClass: isDark
        ? 'bg-amber-950/80 text-amber-200 border-amber-700/60'
        : 'bg-amber-100 text-amber-950 border-amber-300',
      clockIconColor: 'text-amber-700 dark:text-amber-400',
      timeLabel: sched.defaultTimeLabel,
      isCompleted: false,
      isServingNow: false,
      isClosed: false,
      strokeColor: '#f59e0b',
      strokeDashoffset: '145'
    };
  };

  // Formatting helper for live clock
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Nav Item Class Helper
  const navItemClass = (tab: typeof activeTab) => {
    const isActive = activeTab === tab;
    return `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all cursor-pointer ${isActive
        ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
        : isDark
          ? 'text-gray-400 hover:text-white hover:bg-white/5'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`;
  };

  // Helper to check if current meal actually serves non-veg
  const hasNonVegMenu = () => {
    if (!mealPoll) return false;
    if (mealPoll.mealType === 'BREAKFAST') return false; // Breakfast typically doesn't have non-veg
    const type = mealPoll.mealType.toLowerCase() as 'lunch' | 'dinner';
    const items = todayMeals[type] || [];
    const nonVegKeywords = ['chicken', 'egg', 'fish', 'mutton', 'non-veg', 'nonveg'];
    return items.some((item: string) => 
      nonVegKeywords.some(kw => item.toLowerCase().includes(kw))
    );
  };

  // Helper for appetizing dish emoji icons
  const getDishEmoji = (dish: string) => {
    const d = dish.toLowerCase();
    if (d.includes('paneer')) return '🍲';
    if (d.includes('dal') || d.includes('soup') || d.includes('sambar') || d.includes('tadka')) return '🥣';
    if (d.includes('rice') || d.includes('pulao') || d.includes('biryani') || d.includes('jeera')) return '🍚';
    if (d.includes('roti') || d.includes('chapati') || d.includes('paratha') || d.includes('puri') || d.includes('naan')) return '🫓';
    if (d.includes('chicken') || d.includes('mutton') || d.includes('meat')) return '🍗';
    if (d.includes('egg') || d.includes('omelette') || d.includes('bhurji')) return '🍳';
    if (d.includes('fish')) return '🐟';
    if (d.includes('sweet') || d.includes('halwa') || d.includes('kheer') || d.includes('gulab') || d.includes('ice cream')) return '🍨';
    if (d.includes('salad') || d.includes('raita')) return '🥗';
    if (d.includes('tea') || d.includes('coffee') || d.includes('milk')) return '☕';
    if (d.includes('chhole') || d.includes('chana') || d.includes('rajma') || d.includes('aloo') || d.includes('bhindi') || d.includes('mix veg')) return '🥘';
    return '🍽️';
  };

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-slate-950 text-slate-100 dark' : 'bg-slate-50 text-slate-800'} font-sans transition-colors duration-300`}>

      {/* Real-time scan toast notifications */}
      {scanAlert && (
        <div className={`fixed bottom-6 right-6 z-50 max-w-sm border text-white p-5 rounded-2xl shadow-2xl backdrop-blur-md animate-bounce bg-slate-900 border-white/10`}>
          <div className="flex items-start gap-3">
            <span className="p-1.5 bg-orange-500/10 text-orange-500 rounded-full text-lg">
              {scanAlert.gateType === 'ENTRY' ? '🎉' : '🚪'}
            </span>
            <div className="flex-1">
              <h4 className="font-bold text-sm">
                {scanAlert.gateType === 'ENTRY' ? 'Mess Entry Approved!' : 'Mess Exit Logged!'}
              </h4>
              <p className="text-xs text-slate-350 mt-1">
                {scanAlert.gateType === 'ENTRY'
                  ? `Your pass has been scanned successfully at ${scanAlert.timestamp}.`
                  : `You checked out of the mess at ${scanAlert.timestamp}. Duration: ${scanAlert.duration} mins.`}
              </p>
              <div className="mt-3 text-[10px] bg-black/40 p-2.5 rounded-xl border border-white/5 font-mono text-slate-300">
                <div className="font-bold text-orange-400 mb-0.5">📡 Parent Notification Sent:</div>
                {scanAlert.smsAlert}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOD READY OVERLAY (3 Seconds) ───────────────────────── */}
      {foodReadyOverlay && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center text-white animate-in zoom-in duration-300"
             style={{ background: 'rgba(234, 88, 12, 0.95)', backdropFilter: 'blur(8px)' }}>
          <div className="text-8xl mb-6 animate-bounce">🍲</div>
          <h2 className="text-5xl md:text-7xl font-black mb-3 tracking-tight text-center">{foodReadyOverlay} IS READY!</h2>
          <p className="text-xl md:text-2xl font-bold opacity-90 text-center">Food is now being served in the mess.</p>
        </div>
      )}

      {/* ── MEAL POLL BROADCAST POPUP (Non-dismissible) ─────────────────────── */}
      {mealPoll && studentType === 'HOSTELER' && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}
          // Backdrop click does NOTHING — student must select an option
        >
          <div
            className={`relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden
              ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white border border-orange-100'}`}
            style={{ animation: 'pollPopIn 0.35s cubic-bezier(.34,1.56,.64,1) both' }}
          >
            {/* Top gradient strip */}
            <div
              className="h-2 w-full"
              style={{ background: 'linear-gradient(90deg, #f97316, #fb923c, #fdba74)' }}
            />

            {pollDone ? (
              /* ✔ Confirmation state */
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-3xl"
                  style={{ background: 'linear-gradient(135deg,#10b981,#34d399)', boxShadow: '0 8px 24px rgba(16,185,129,0.35)' }}
                >
                  ✓
                </div>
                <p className="text-lg font-medium text-emerald-600">Response Recorded!</p>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Thank you for your meal preference.</p>
              </div>
            ) : (
              /* Poll options — NO close button, MUST respond */
              <div className="p-6">

                {/* "Response Required" badge — no X button */}
                <div className="flex justify-end mb-1">
                  <span
                    className="inline-flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-widest px-2.5 py-1 rounded-full animate-pulse"
                    style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                    Response Required
                  </span>
                </div>

                {/* Header */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">
                      {mealPoll.mealType === 'BREAKFAST' ? '🌅' : mealPoll.mealType === 'LUNCH' ? '☀️' : '🌙'}
                    </span>
                    <span
                      className="text-[10px] font-medium uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(249,115,22,0.12)', color: '#f97316' }}
                    >
                      📢 Mess Broadcast
                    </span>
                  </div>
                  <h3 className={`text-xl font-medium tracking-tight leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {mealPoll.mealType === 'BREAKFAST' ? 'Breakfast' : mealPoll.mealType === 'LUNCH' ? 'Lunch' : 'Dinner'} Preference
                  </h3>
                  <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Will you be joining for{' '}
                    <strong>{mealPoll.mealType === 'BREAKFAST' ? 'breakfast' : mealPoll.mealType === 'LUNCH' ? 'lunch' : 'dinner'}</strong>
                    {' '}today? Let the kitchen know.
                  </p>
                  {pollError && (
                    <div className="mt-3 p-2 rounded bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                      Error: {pollError}
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className={`grid ${hasNonVegMenu() ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
                  {/* VEG */}
                  <button
                    onClick={() => submitMealPoll('VEG')}
                    disabled={pollSubmitting}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer font-bold text-sm
                      ${isDark
                        ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300 hover:bg-emerald-900/80 hover:border-emerald-500 hover:scale-105'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400 hover:scale-105'}
                      disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span className="text-2xl">🥦</span>
                    Veg
                  </button>

                  {/* NON-VEG */}
                  {hasNonVegMenu() && (
                  <button
                    onClick={() => submitMealPoll('NON_VEG')}
                    disabled={pollSubmitting}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer font-bold text-sm
                      ${isDark
                        ? 'bg-red-950/60 border-red-700 text-red-300 hover:bg-red-900/80 hover:border-red-500 hover:scale-105'
                        : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:border-red-400 hover:scale-105'}
                      disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span className="text-2xl">🍗</span>
                    Non-Veg
                  </button>
                  )}

                  {/* SKIP */}
                  <button
                    onClick={() => submitMealPoll('SKIPPING')}
                    disabled={pollSubmitting}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer font-bold text-sm
                      ${isDark
                        ? 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700 hover:border-slate-500 hover:scale-105'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-400 hover:scale-105'}
                      disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span className="text-2xl">🚫</span>
                    Skip
                  </button>
                </div>

                <p className={`text-center text-[10px] mt-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  Please select one option to continue · Helps kitchen reduce food wastage 🌱
                </p>
              </div>
            )}
          </div>

          {/* Inline keyframe for pop-in animation */}
          <style>{`
            @keyframes pollPopIn {
              0%   { opacity:0; transform: scale(0.85) translateY(20px); }
              100% { opacity:1; transform: scale(1) translateY(0); }

            }
          `}</style>
        </div>
      )}
      {/* ── End Meal Poll Broadcast Popup ─────────────────────────────────────── */}



      {/* LEFT NAVIGATION SIDEBAR (Collapses on mobile, overlay via header/sidebar links) */}
      <aside className={`w-64 shrink-0 border-r ${isDark ? 'border-white/5 bg-slate-900' : 'border-gray-200/60 bg-white'} hidden md:flex flex-col justify-between p-6 z-10`}>
        <div className="space-y-6">
          {/* Logo Header */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <span className="text-xl font-semibold text-primary">FD</span>
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight leading-none">FOOD-DO</h2>
              <span className="text-[8px] font-semibold tracking-widest text-primary uppercase mt-0.5 block">
                Student Pass
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-4">
            <button onClick={() => setActiveTab('dashboard')} className={navItemClass('dashboard')}>
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
            {studentType === 'HOSTELER' && (
              <>
                <button onClick={() => setActiveTab('qr')} className={navItemClass('qr')}>
                  <QrCode className="w-5 h-5" />
                  My QR Pass
                </button>
                <button onClick={() => setActiveTab('history')} className={navItemClass('history')}>
                  <History className="w-5 h-5" />
                  Meal History
                </button>
                
                <button onClick={() => setActiveTab('attendance')} className={navItemClass('attendance')}>
                  <CalendarDays className="w-5 h-5" />
                  Attendance
                </button>
                <button onClick={() => setActiveTab('leave')} className={navItemClass('leave')}>
                  <CalendarRange className="w-5 h-5" />
                  Leave Registry
                </button>
              </>
            )}
            <button onClick={() => setActiveTab('menu')} className={navItemClass('menu')}>
              <Utensils className="w-5 h-5" />
              Today's Menu
            </button>
            <button onClick={() => setActiveTab('feedback')} className={navItemClass('feedback')}>
              <Star className="w-5 h-5" />
              Meal Feedback
            </button>
            
            <button onClick={() => setActiveTab('profile')} className={navItemClass('profile')}>
              <User className="w-5 h-5" />
              My Profile
            </button>
          </nav>
        </div>

        {/* Bottom Sign-out button */}
        <button
          onClick={onLogout}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-red-500 hover:bg-red-500/5 transition-all w-full text-left cursor-pointer`}
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </aside>

      {/* RIGHT MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* TOP NAVBAR CONTAINER */}
        <header className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${isDark ? 'border-white/5 bg-slate-900' : 'border-gray-200/60 bg-white'
          }`}>
          {/* Left Title / Branding */}
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium tracking-tight text-gray-500 uppercase">
              Student Dashboard
            </h3>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3 md:gap-5 shrink-0">

            {/* Server-time Clock Display */}
            <div className={`hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold ${isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-600'
              }`}>
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <span>{formatDate(currentTime)} • {formatTime(currentTime)}</span>
            </div>

            {/* Dark Mode toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${isDark ? 'bg-white/5 border-white/10 text-yellow-450 hover:bg-white/10' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications panel dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-xl border transition-all cursor-pointer relative ${isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                  }`}
              >
                <Bell className="w-4 h-4" />
                {notifications.some(n => n.unread) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-ping" />
                )}
              </button>

              {showNotifications && (
                <div className={`absolute right-0 mt-3 w-80 rounded-2xl border p-4 shadow-xl z-20 transition-all ${isDark ? 'bg-slate-900 border-white/10 text-white shadow-black/40' : 'bg-white border-gray-100 text-gray-800 shadow-gray-200/80'
                  }`}>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Notifications</h4>
                    <button
                      onClick={() => setNotifications(prev => prev.map(n => ({ ...n, unread: false })))}
                      className="text-[10px] font-bold text-gray-400 hover:underline cursor-pointer"
                    >
                      Clear Unread
                    </button>
                  </div>
                  <div className="space-y-3">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-gray-400">
                        🔔 No new notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-2.5 rounded-xl border transition-all text-xs ${n.unread
                            ? isDark ? 'bg-primary/10 border-primary/20' : 'bg-primary/5 border-primary/20 text-primary-dark'
                            : isDark ? 'bg-white/5 border-transparent' : 'bg-gray-50 border-transparent'
                          }`}>
                          <p className="font-medium">{n.text}</p>
                          <span className="text-[9px] text-gray-400 block mt-1">{n.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar indicator */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary text-white font-medium text-xs flex items-center justify-center shadow-lg shadow-primary/20">
                {studentName.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <h4 className="text-xs font-bold leading-none">{studentName.toUpperCase()}</h4>
                <span className="text-[9px] text-gray-400 block mt-1 uppercase font-bold">{rollNumber}</span>
              </div>
            </div>

          </div>
        </header>

        {/* MOBILE NAVIGATION BAR (Visible on mobile screens instead of sidebar) */}
        <div className={`md:hidden flex items-center justify-around py-3 px-2 border-b text-xs font-bold ${isDark ? 'border-white/5 bg-slate-900' : 'border-gray-200/60 bg-white'
          }`}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer ${activeTab === 'dashboard' ? 'text-primary' : 'text-gray-400'
              }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Home</span>
          </button>

          {studentType === 'HOSTELER' ? (
            <>
              <button
                onClick={() => setActiveTab('qr')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer ${activeTab === 'qr' ? 'text-primary' : 'text-gray-400'
                  }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Pass</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer ${activeTab === 'history' ? 'text-primary' : 'text-gray-400'
                  }`}
              >
                <History className="w-4 h-4" />
                <span>Logs</span>
              </button>
            </>
          ) : (
    <></>
  )}

          
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer ${activeTab === 'menu' ? 'text-primary' : 'text-gray-400'
              }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Menu</span>
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer ${activeTab === 'feedback' ? 'text-primary' : 'text-gray-400'
              }`}
          >
            <Star className="w-4 h-4" />
            <span>Feedback</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer ${activeTab === 'profile' ? 'text-primary' : 'text-gray-400'
              }`}
          >
            <User className="w-4 h-4" />
            <span>Profile</span>
          </button>
        </div>

        {/* WORKSPACE CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 pb-24 sm:pb-8 max-w-7xl mx-auto w-full space-y-4 sm:space-y-6">

          {/* ======================================= */}
          {/* TAB 1: DASHBOARD VIEW                   */}
          {/* ======================================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-3.5 sm:space-y-6 animate-fade-in">

              {/* Header Greeting Banner */}
              <div className={`p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl relative overflow-hidden border ${isDark
                  ? 'bg-gradient-to-br from-orange-600/15 via-slate-900 to-slate-900 border-white/10'
                  : 'bg-gradient-to-br from-orange-50 via-white to-white border-slate-200/90 shadow-sm'
                }`}>
                {/* Glow behind greeting */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[80px] pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 sm:gap-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                        Ramanujan Mess Hall • Active
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight mt-2 text-slate-950 dark:text-white truncate">
                      Good Day, <span className="text-primary">{(studentName || initialUser?.name || 'AMAN KUMAR SINGH')}</span>
                    </h2>
                    <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 mt-1 uppercase font-bold tracking-wider">
                      Hostel Residence: {hostelName || 'BH 10'} • Room {roomNumber || '010'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      onClick={() => setActiveTab('qr')}
                      className="flex-1 sm:flex-initial py-2.5 px-4 bg-primary hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/25 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>View QR Pass</span>
                    </button>
                    <button
                      onClick={onLogout}
                      className="md:hidden py-2.5 px-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Summary Cards & Stats Rings */}
              {studentType === 'HOSTELER' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-4 md:gap-6">
                {(['BREAKFAST', 'LUNCH', 'DINNER'] as const).map((mealType) => {
                  const state = getMealCardState(mealType);
                  const title = mealType.charAt(0) + mealType.slice(1).toLowerCase();
                  return (
                    <div
                      key={mealType}
                      className={`p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl border flex items-center justify-between gap-3 transition-all ${
                        state.isServingNow
                          ? isDark ? 'bg-orange-950/20 border-orange-500/40 shadow-lg shadow-orange-500/10' : 'bg-orange-50/60 border-orange-300 shadow-sm'
                          : isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200/90 shadow-xs hover:shadow-sm'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-extrabold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                            {title}
                          </span>
                          {state.isServingNow && (
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                          )}
                        </div>
                        <h3 className={`text-base sm:text-lg md:text-xl font-black tracking-tight flex items-center gap-1.5 ${state.statusColor}`}>
                          {state.status}
                        </h3>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border mt-0.5 ${state.badgeClass}`}>
                          <Clock className={`w-3.5 h-3.5 shrink-0 ${state.clockIconColor}`} />
                          <span className="truncate">{state.timeLabel}</span>
                        </div>
                      </div>

                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="28" cy="28" r="23" stroke={isDark ? '#1e293b' : '#e2e8f0'} strokeWidth="4.5" fill="transparent" />
                          <circle cx="28" cy="28" r="23" stroke={state.strokeColor} strokeWidth="4.5" fill="transparent" strokeDasharray="145" strokeDashoffset={state.strokeDashoffset} className={state.isServingNow ? "animate-pulse" : ""} />
                        </svg>
                        {state.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500 absolute" />
                        ) : state.isServingNow ? (
                          <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 absolute animate-pulse" />
                        ) : (
                          <Clock className={`w-5 h-5 sm:w-6 sm:h-6 absolute ${state.isClosed ? 'text-slate-400' : 'text-amber-500'}`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              ) : (
                <SurplusTokens isDark={isDark} />
              )}

              {/* Quick Summary deck grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-6">
                {/* Active serving menu card */}
                <div className={`${studentType === 'HOSTELER' ? 'lg:col-span-8' : 'lg:col-span-12'} p-4 sm:p-6 md:p-7 rounded-2xl sm:rounded-3xl border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200/90 shadow-sm'
                  }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 sm:mb-6">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white">
                        {currentMealInfo.isServingNow ? 'Currently Serving Menu' : 'Upcoming Meal Menu'}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                        {currentMealInfo.timeSubtitle}
                      </p>
                    </div>
                    <span className={`self-start sm:self-center px-3 py-1 rounded-full border text-[10px] font-black tracking-wider uppercase ${currentMealInfo.isServingNow
                        ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 animate-pulse'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      }`}>
                      {currentMealInfo.badgeText}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-4">
                    {upcomingMeal.items.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 sm:p-4 rounded-2xl border text-center transition-all hover:scale-[1.02] shadow-sm ${
                          isDark ? 'bg-slate-800/90 border-slate-700/80 text-white' : 'bg-white border-slate-200/90 text-slate-950'
                        }`}
                      >
                        <span className="text-2xl sm:text-3xl block mb-1.5 select-none" role="img" aria-label={item}>
                          {getDishEmoji(item)}
                        </span>
                        <h4 className={`text-xs sm:text-sm font-black line-clamp-2 leading-tight min-h-[2.2rem] flex items-center justify-center break-words px-1 ${
                          isDark ? 'text-white' : 'text-slate-950'
                        }`}>
                          {item}
                        </h4>
                        <span className="text-[10px] text-orange-600 font-extrabold block mt-1 uppercase tracking-wider">
                          Fresh Cooked
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stat summary cards */}
                {studentType === 'HOSTELER' && (
                <div className={`lg:col-span-4 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border flex flex-col justify-between ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200/90 shadow-sm'
                  }`}>
                  <h3 className="text-base font-black text-slate-950 dark:text-white mb-3 sm:mb-4">Meal Statistics</h3>

                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Attendance Rate</span>
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">92%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: '92%' }} />
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-white/5">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Streak Status</span>
                      <span className="text-sm font-black text-primary flex items-center gap-1">
                        <Flame className="w-4 h-4 fill-current" />
                        8 Meals
                      </span>
                    </div>
                  </div>
                </div>
                )}
              </div>

            </div>
          )}

          {/* ======================================= */}
          {/* TAB 2: MY QR PASS                       */}
          {/* ======================================= */}
          {activeTab === 'qr' && (
            <div className="max-w-lg mx-auto animate-fade-in px-1">
              <div className={`p-5 sm:p-8 rounded-3xl border text-center flex flex-col items-center gap-4 sm:gap-6 relative overflow-hidden ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 shadow-md'
                }`}>
                {/* Top strip */}
                <div className="absolute top-0 left-0 w-full h-[5px] bg-gradient-to-r from-orange-650 to-amber-500" />

                <div>
                  <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-[9px] font-extrabold tracking-widest uppercase">
                    SECURE MESS ACCESS PASS
                  </span>
                  <h3 className="text-base sm:text-lg font-black tracking-tight mt-2 text-slate-950 dark:text-white">Digital Mess Entry Pass</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Permanent secure token for your mess gate verification.</p>
                </div>

                {/* Student Info Verification Card */}
                <div className={`w-full p-3.5 sm:p-4 rounded-2xl flex items-center gap-3.5 text-left border ${isDark
                    ? 'bg-slate-950/40 border-white/5 shadow-inner'
                    : 'bg-orange-50/40 border-orange-100 shadow-xs'
                  }`}>
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-orange-500 text-white font-black text-sm flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
                    {((studentName || 'AK').slice(0, 2)).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-black truncate uppercase text-primary leading-none">{(studentName || 'AMAN KUMAR SINGH').toUpperCase()}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${effectiveFoodPref === 'VEG'
                          ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-800 dark:text-red-300 border border-red-500/30'
                        }`}>
                        {effectiveFoodPref}
                      </span>
                    </div>
                    <p className={`text-[10px] font-extrabold uppercase tracking-wider mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Roll: {rollNumber || '2502013'}
                    </p>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Hostel: {hostelName || 'BH 10'} • Room {roomNumber || '010'}
                    </p>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Mess: {messAssociation || 'Main 2nd Floor'}
                    </p>
                  </div>
                </div>

                {/* QR box with scanning laser beam */}
                <div className={`p-4 sm:p-6 rounded-3xl border relative shadow-xl max-w-sm sm:max-w-md w-full ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200/90'
                  }`}>
                  <div className="p-4 sm:p-6 bg-white rounded-2xl sm:rounded-3xl relative shadow-md overflow-hidden flex flex-col items-center justify-center">
                    <QRCodeSVG
                      value={qrToken}
                      size={280}
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                      level="L"
                      includeMargin={false}
                      className={`w-60 h-60 sm:w-72 sm:h-72 mx-auto transition-all ${isPassPaused() ? 'blur-md opacity-30 select-none' : ''}`}
                    />

                    {isPassPaused() ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-4 text-center">
                        <ShieldAlert className="w-10 h-10 text-red-500 mb-2 animate-pulse" />
                        <span className="text-white font-medium text-xs uppercase tracking-wider">Pass Paused</span>
                        <span className="text-gray-300 text-[9px] mt-1.5 leading-relaxed px-2">
                          Your dining pass is paused due to approved active leave.
                        </span>
                      </div>
                    ) : (
                      /* Animated Scanning Beam line */
                      <div className="absolute top-0 left-0 w-full h-[3px] bg-orange-500 shadow-md shadow-orange-500/50 animate-bounce" style={{ animationDuration: '3.5s' }} />
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/20">
                      ⚡ Fast Micro-QR
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[10px] font-black">
                      {qrToken}
                    </span>
                  </div>

                  <p className={`text-[11px] font-bold mt-2 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    📱 Hold phone 10-15cm from scanner with high brightness
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 3: MEAL LOG HISTORY                 */}
          {/* ======================================= */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Your Meal Logs</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Chronological database check-ins & checks</p>
                </div>
              </div>

              {/* TIMELINE UI CARDS */}
              <div className="space-y-4">
                {historyLogs.map((log) => (
                  <div key={log.id} className={`p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
                    }`}>

                    {/* Log Left details */}
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl shrink-0 ${log.status === 'CONSUMED'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : log.status === 'SKIPPED'
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'bg-red-500/10 text-red-500'
                        }`}>
                        <span className="text-xl">
                          {log.mealType === 'BREAKFAST' ? '🍳' : log.mealType === 'LUNCH' ? '🍲' : log.mealType === 'DINNER' ? '🍛' : '🗓️'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">{log.mealType}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${log.status === 'CONSUMED'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : log.status === 'SKIPPED'
                                ? 'bg-blue-500/10 text-blue-500'
                                : 'bg-red-500/10 text-red-500'
                            }`}>
                            {log.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{log.date} • {log.time}</p>
                      </div>
                    </div>

                    {/* Log Right metrics / parent SMS note */}
                    {log.status === 'CONSUMED' && (
                      <div className={`p-3 rounded-2xl border text-xs font-mono max-w-xs ${isDark ? 'bg-black/35 border-white/5' : 'bg-gray-50 border-gray-100'
                        }`}>
                        <div className="font-bold text-[9px] text-gray-400 mb-0.5">📨 PARENT DISPATCH LOGGED</div>
                        <span className="text-[10px] text-gray-400">Entry/Exit duration reporting dispatched successfully.</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 4: MENU OF TODAY & WEEKLY CYCLE     */}
          {/* ======================================= */}
          {activeTab === 'menu' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center flex-wrap gap-4 border-b border-gray-200/40 dark:border-white/5 pb-4">
                <div>
                  <h3 className="text-xl font-semibold">Boys Hostel Dining Menu</h3>
                  <p className="text-xs text-gray-400 mt-1">Official menu schedule for GITA Autonomous College, Bhubaneswar</p>
                </div>
                <div className="flex gap-2 bg-gray-150 dark:bg-white/5 p-1 rounded-xl">
                  <button
                    onClick={() => setMenuSubTab('today')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${menuSubTab === 'today'
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    Today's Meals
                  </button>
                  <button
                    onClick={() => setMenuSubTab('weekly')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${menuSubTab === 'weekly'
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                  >
                    7-Day Weekly Cycle
                  </button>
                </div>
              </div>

              {menuSubTab === 'today' ? (
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-6">
                    {/* Breakfast item card */}
                    <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border flex flex-col justify-between gap-4 sm:gap-5 relative overflow-hidden ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200/90 shadow-xs'
                      }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-base font-black text-slate-950 dark:text-white">Breakfast Buffet</h4>
                          <div className="flex flex-col gap-0.5 mt-1.5 text-[11px] font-bold">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              🏢 <span className="text-slate-400 font-medium">Mess Hall:</span> 07:00 AM - 08:30 AM
                            </span>
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              🍳 <span className="text-slate-400 font-medium">Kitchen Counter:</span> 08:30 AM - 10:00 AM
                            </span>
                          </div>
                        </div>
                        {currentMealInfo.mealType === 'BREAKFAST' && currentMealInfo.isServingNow ? (
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse border ${currentMealInfo.isKitchenServing
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            }`}>
                            {currentMealInfo.isKitchenServing ? '🍳 KITCHEN PICKUP' : '📢 MESS SERVING'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 text-[9px] font-bold">
                            SCHEDULED
                          </span>
                        )}
                      </div>

                      <div className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border ${isDark
                          ? 'bg-slate-800/60 border-slate-700/50'
                          : 'bg-orange-50/70 border-orange-200/60'
                        }`}>
                        <h5 className="text-[11px] font-black text-primary mb-1 uppercase tracking-wider">
                          Dishes Served:
                        </h5>
                        <p className={`text-xs sm:text-sm font-bold leading-relaxed ${isDark ? 'text-white' : 'text-slate-900'
                          }`}>
                          {(todayMeals.breakfast && todayMeals.breakfast.length > 0 ? todayMeals.breakfast : getInitialTodayMeals().breakfast).join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 font-bold border-t border-slate-100 dark:border-white/5 pt-3 sm:pt-4">
                        <span>🔥 380 kcal</span>
                        <span>•</span>
                        <span>💪 10g Protein</span>
                      </div>
                    </div>

                    {/* Lunch item card */}
                    <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border flex flex-col justify-between gap-4 sm:gap-5 relative overflow-hidden ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200/90 shadow-xs'
                      }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-base font-black text-slate-950 dark:text-white">Lunch Banquet</h4>
                          <div className="flex flex-col gap-0.5 mt-1.5 text-[11px] font-bold">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              🏢 <span className="text-slate-400 font-medium">Mess Hall:</span> 02:00 PM - 03:30 PM
                            </span>
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              🍳 <span className="text-slate-400 font-medium">Kitchen Counter:</span> 03:30 PM - 04:00 PM
                            </span>
                          </div>
                        </div>
                        {currentMealInfo.mealType === 'LUNCH' && currentMealInfo.isServingNow ? (
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse border ${currentMealInfo.isKitchenServing
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            }`}>
                            {currentMealInfo.isKitchenServing ? '🍳 KITCHEN PICKUP' : '📢 MESS SERVING'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 text-[9px] font-bold">
                            SCHEDULED
                          </span>
                        )}
                      </div>

                      <div className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border ${isDark
                          ? 'bg-slate-800/60 border-slate-700/50'
                          : 'bg-orange-50/70 border-orange-200/60'
                        }`}>
                        <h5 className="text-[11px] font-black text-primary mb-1 uppercase tracking-wider">
                          Dishes Served:
                        </h5>
                        <p className={`text-xs sm:text-sm font-bold leading-relaxed ${isDark ? 'text-white' : 'text-slate-900'
                          }`}>
                          {(todayMeals.lunch && todayMeals.lunch.length > 0 ? todayMeals.lunch : getInitialTodayMeals().lunch).join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 font-bold border-t border-slate-100 dark:border-white/5 pt-3 sm:pt-4">
                        <span>🔥 720 kcal</span>
                        <span>•</span>
                        <span>💪 22g Protein</span>
                      </div>
                    </div>

                    {/* Dinner item card */}
                    <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border flex flex-col justify-between gap-4 sm:gap-5 relative overflow-hidden ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200/90 shadow-xs'
                      }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-base font-black text-slate-950 dark:text-white">Dinner Buffet</h4>
                          <div className="flex flex-col gap-0.5 mt-1.5 text-[11px] font-bold">
                            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              🏢 <span className="text-slate-400 font-medium">Mess Hall:</span> 08:30 PM - 09:30 PM
                            </span>
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              🍳 <span className="text-slate-400 font-medium">Kitchen Counter:</span> 09:30 PM - 10:00 PM
                            </span>
                          </div>
                        </div>
                        {currentMealInfo.mealType === 'DINNER' && currentMealInfo.isServingNow ? (
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse border ${currentMealInfo.isKitchenServing
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            }`}>
                            {currentMealInfo.isKitchenServing ? '🍳 KITCHEN PICKUP' : '📢 MESS SERVING'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 text-[9px] font-bold">
                            SCHEDULED
                          </span>
                        )}
                      </div>

                      <div className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border ${isDark
                          ? 'bg-slate-800/60 border-slate-700/50'
                          : 'bg-orange-50/70 border-orange-200/60'
                        }`}>
                        <h5 className="text-[11px] font-black text-primary mb-1 uppercase tracking-wider">
                          Dishes Served:
                        </h5>
                        <p className={`text-xs sm:text-sm font-bold leading-relaxed ${isDark ? 'text-white' : 'text-slate-900'
                          }`}>
                          {(todayMeals.dinner && todayMeals.dinner.length > 0 ? todayMeals.dinner : getInitialTodayMeals().dinner).join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 font-bold border-t border-slate-100 dark:border-white/5 pt-3 sm:pt-4">
                        <span>🔥 640 kcal</span>
                        <span>•</span>
                        <span>💪 18g Protein</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Timing Notes */}
                  <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border text-xs leading-relaxed space-y-2 ${isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200/90 text-slate-700'
                    }`}>
                    <div>
                      🏢 <strong>Mess vs Kitchen Timings:</strong> Main Mess Hall is open for Breakfast (7-8:30 AM), Lunch (2-3:30 PM), & Dinner (8:30-9:30 PM). Delayed students can collect their food directly from the <strong>Kitchen Counter</strong> up to 10:00 AM (Breakfast), 4:00 PM (Lunch), and 10:00 PM (Dinner).
                    </div>
                    <div>
                      💡 <strong>Chef's Note:</strong> Food is cooked strictly without onion and garlic. Vegetarian alternatives (marked as VEG ONLY) are prepared in separate cooking utensils to ensure absolute purity. Let us avoid food waste and dine respectfully!
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Table View of 7 Days */}
                  <div className={`border rounded-3xl overflow-hidden shadow-sm ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100'
                    }`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${isDark ? 'bg-white/5 border-white/5 text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'
                            }`}>
                            <th className="py-4 px-6">Day</th>
                            <th className="py-4 px-6">Breakfast</th>
                            <th className="py-4 px-6">Lunch</th>
                            <th className="py-4 px-6">Dinner</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-xs">
                          {[
                            {
                              day: 'Monday',
                              breakfast: 'Chuda Poha, Ghuguni',
                              lunch: 'Rice, Dal, Besan Curry, Dahi Bundi',
                              dinner: 'Roti, Rice, Dal, Buta Dali Curry, Simei Kheer'
                            },
                            {
                              day: 'Tuesday',
                              breakfast: 'Bada, Ghuguni',
                              lunch: 'Rice, Dal, Aloo Potala Curry, Sagu Papad',
                              dinner: 'Roti, Rice, Dal, Soyabean Chilli, Rasogola'
                            },
                            {
                              day: 'Wednesday',
                              breakfast: 'Suji Halwa, Ghuguni',
                              lunch: 'Rice, Dal, Fish Masala, Pampad, Manchurian (Veg Only)',
                              dinner: 'Roti, Rice, Dal, Chilli Chicken, Mushroom Chilli (Veg Only)'
                            },
                            {
                              day: 'Thursday',
                              breakfast: 'Aloochop, Ghuguni',
                              lunch: 'Rice, Dalma, Aloo Kalara Chips, Amba Khata / Ambula Rai',
                              dinner: 'Fried Rice, Dal Fry, Paneer Butter Masala'
                            },
                            {
                              day: 'Friday',
                              breakfast: 'Dahibada, Aloo Dum, Seu',
                              lunch: 'Rice, Dal, Fish Masala, Mudhi Ghanta, Paneer Green Matar Masala, Papad (Veg Only)',
                              dinner: 'Roti, Rice, Dal, Chicken Butter Masala, Paneer Butter Masala'
                            },
                            {
                              day: 'Saturday',
                              breakfast: 'Idli, Ghuguni, Chatani',
                              lunch: 'Rice, Dalma, Aloo Bharata, Badichura / Mix Pickel',
                              dinner: 'Roti, Rice, Dal, Egg Tadka, Veg Tadka'
                            },
                            {
                              day: 'Sunday',
                              breakfast: 'Chat',
                              lunch: 'Rice, Dal, Egg Curry, Besan Curry (Veg Only), Papad',
                              dinner: 'Chicken Biriyani, Veg Biriyani, Chicken Joos, Raita (Dal Fry for Veg Only)'
                            }
                          ].map((row, idx) => {
                            const isToday = row.day === new Date().toLocaleDateString('en-US', { weekday: 'long' });
                            return (
                              <tr
                                key={idx}
                                className={`transition-colors ${isToday
                                    ? isDark ? 'bg-orange-500/10 font-bold text-orange-400' : 'bg-orange-50/50 font-bold text-orange-700'
                                    : isDark ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-600'
                                  }`}
                              >
                                <td className="py-4 px-6 font-bold flex items-center gap-2">
                                  {row.day}
                                  {isToday && <span className="px-1.5 py-0.5 rounded text-[8px] bg-orange-500 text-white font-medium">TODAY</span>}
                                </td>
                                <td className="py-4 px-6">{row.breakfast}</td>
                                <td className="py-4 px-6">{row.lunch}</td>
                                <td className="py-4 px-6">{row.dinner}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Informational Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Timings Card */}
                    <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800 shadow-xl' : 'bg-white border-slate-200/90 shadow-sm'
                      }`}>
                      <h4 className="text-sm font-black mb-4 flex items-center gap-2 text-orange-600">
                        ⏰ Servings Timings
                      </h4>
                      <div className="space-y-3.5 text-xs">
                        <div className={`flex justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                          <span className={`font-black ${isDark ? 'text-slate-100' : 'text-slate-950'}`}>Breakfast (Mon - Sat)</span>
                          <span className={`font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>07:00 AM - 08:00 AM</span>
                        </div>
                        <div className={`flex justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                          <span className={`font-black ${isDark ? 'text-slate-100' : 'text-slate-950'}`}>Breakfast (Sunday & Holidays)</span>
                          <span className={`font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>08:00 AM - 09:30 AM</span>
                        </div>
                        <div className={`flex justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                          <span className={`font-black ${isDark ? 'text-slate-100' : 'text-slate-950'}`}>Lunch (Mon - Sat)</span>
                          <span className={`font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>02:30 PM - 03:30 PM</span>
                        </div>
                        <div className={`flex justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                          <span className={`font-black ${isDark ? 'text-slate-100' : 'text-slate-950'}`}>Lunch (Sunday & Holidays)</span>
                          <span className={`font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>01:30 PM - 03:00 PM</span>
                        </div>
                        <div className={`flex justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                          <span className={`font-black ${isDark ? 'text-slate-100' : 'text-slate-950'}`}>Dinner (1st Year Boarders)</span>
                          <span className={`font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>08:30 PM - 09:30 PM</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`font-black ${isDark ? 'text-slate-100' : 'text-slate-950'}`}>Dinner (Seniors/Post-Grads)</span>
                          <span className={`font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>08:45 PM - 09:45 PM</span>
                        </div>
                      </div>
                    </div>

                    {/* Floor Allotments Card */}
                    <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800 shadow-xl' : 'bg-white border-slate-200/90 shadow-sm'
                      }`}>
                      <h4 className="text-sm font-black mb-4 flex items-center gap-2 text-orange-600">
                        🏢 Mess Floor Allotment
                      </h4>
                      <div className="space-y-3.5 text-xs">
                        <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                          isDark ? 'bg-slate-800/70 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-lg text-primary font-bold shrink-0">❶</span>
                          <div>
                            <div className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-950'}`}>Central Mess - 1st Floor</div>
                            <div className={`text-[11px] font-semibold mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Reserved for 3rd & 4th Year, MBA & MCA Boarders only.</div>
                          </div>
                        </div>
                        <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                          isDark ? 'bg-slate-800/70 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-lg text-primary font-bold shrink-0">❷</span>
                          <div>
                            <div className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-950'}`}>Central Mess - 2nd Floor</div>
                            <div className={`text-[11px] font-semibold mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Reserved for 2nd Year Boarders only.</div>
                          </div>
                        </div>
                        <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                          isDark ? 'bg-slate-800/70 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                        }`}>
                          <span className="text-lg text-primary font-bold shrink-0">❸</span>
                          <div>
                            <div className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-950'}`}>Central Mess - 3rd Floor</div>
                            <div className={`text-[11px] font-semibold mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Reserved for 1st Year Boarders only.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 5: ATTENDANCE ANALYTICS             */}
          {/* ======================================= */}
          {activeTab === 'attendance' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-lg font-semibold">Attendance Analytics</h3>
                <p className="text-xs text-gray-400 mt-0.5">Diner presence logs and compliance metrics</p>
              </div>

              {/* Attendance metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <span className="text-xs font-bold text-gray-400 uppercase">Monthly Ratio</span>
                  <h3 className="text-2xl font-semibold text-emerald-555 mt-2">{attendanceMetrics.monthlyRatio}%</h3>
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    {attendanceMetrics.monthlyRatio >= 90 ? 'Excellent Compliance' : attendanceMetrics.monthlyRatio >= 75 ? 'Good Compliance' : 'Attention Required'}
                  </span>
                </div>
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <span className="text-xs font-bold text-gray-400 uppercase">Meals Consumed</span>
                  <h3 className="text-2xl font-semibold text-orange-555 mt-2">{attendanceMetrics.mealsConsumed} Meals</h3>
                  <span className="text-[10px] text-gray-400 mt-1 block">Total check-in records</span>
                </div>
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <span className="text-xs font-bold text-gray-400 uppercase">Active Streak</span>
                  <h3 className="text-2xl font-semibold text-orange-555 mt-2">{attendanceMetrics.streak} Meals</h3>
                  <span className="text-[10px] text-gray-400 mt-1 block">Consecutive dining check-ins</span>
                </div>
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <span className="text-xs font-bold text-gray-400 uppercase">Missed & Absent</span>
                  <h3 className="text-2xl font-semibold text-red-555 mt-2">{attendanceMetrics.missedAndAbsent} Meals</h3>
                  <span className="text-[10px] text-gray-400 mt-1 block">Unregistered absences</span>
                </div>
              </div>

              {/* Weekly grid map */}
              <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                <h4 className="text-sm font-semibold mb-4">Weekly Attendance Heatmap</h4>
                <div className="grid grid-cols-7 gap-3 text-center">
                  {(attendanceHeatmap.length > 0 ? attendanceHeatmap : [
                    { day: 'Mon', breakfast: 'NONE', lunch: 'NONE', dinner: 'NONE' },
                    { day: 'Tue', breakfast: 'NONE', lunch: 'NONE', dinner: 'NONE' },
                    { day: 'Wed', breakfast: 'NONE', lunch: 'NONE', dinner: 'NONE' },
                    { day: 'Thu', breakfast: 'NONE', lunch: 'NONE', dinner: 'NONE' },
                    { day: 'Fri', breakfast: 'NONE', lunch: 'NONE', dinner: 'NONE' },
                    { day: 'Sat', breakfast: 'NONE', lunch: 'NONE', dinner: 'NONE' },
                    { day: 'Sun', breakfast: 'NONE', lunch: 'NONE', dinner: 'NONE' },
                  ]).map((item) => {
                    const getStyle = (status: string) => {
                      if (status === 'CONSUMED') return 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/25 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400';
                      if (status === 'SKIPPED') return 'bg-sky-500/10 dark:bg-sky-500/20 border-sky-500/25 dark:border-sky-500/40 text-sky-600 dark:text-sky-450';
                      if (status === 'ABSENT') return 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/25 dark:border-rose-500/40 text-rose-600 dark:text-rose-400';
                      return 'bg-gray-500/5 dark:bg-white/5 border-gray-500/10 dark:border-white/10 text-gray-400 dark:text-gray-500';
                    };
                    const getIcon = (mealType: 'bf' | 'ln' | 'dn', status: string) => {
                      if (status === 'CONSUMED') return mealType === 'bf' ? '🍳' : mealType === 'ln' ? '🍲' : '🍛';
                      if (status === 'SKIPPED') return '🌴';
                      if (status === 'ABSENT') return <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-450 animate-pulse" />;
                      return '•';
                    };
                    return (
                      <div key={item.day}>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-2">{item.day}</span>
                        <div className="space-y-2">
                          <div className={`h-8 rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${getStyle(item.breakfast)}`} title={`Breakfast: ${item.breakfast}`}>
                            {getIcon('bf', item.breakfast)}
                          </div>
                          <div className={`h-8 rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${getStyle(item.lunch)}`} title={`Lunch: ${item.lunch}`}>
                            {getIcon('ln', item.lunch)}
                          </div>
                          <div className={`h-8 rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${getStyle(item.dinner)}`} title={`Dinner: ${item.dinner}`}>
                            {getIcon('dn', item.dinner)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex gap-4 mt-6 pt-4 border-t border-gray-200/40 dark:border-white/5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded bg-emerald-500/10 dark:bg-emerald-500/25 border border-emerald-500/20 dark:border-emerald-500/40" />
                    <span>Consumed (Present)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded bg-sky-500/10 dark:bg-sky-500/25 border border-sky-500/20 dark:border-sky-500/40" />
                    <span>Paused (Leave Active)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded bg-rose-500/10 dark:bg-rose-500/25 border border-rose-500/20 dark:border-rose-500/40" />
                    <span>Missed (Absent)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded bg-gray-500/5 dark:bg-white/5 border border-gray-500/10 dark:border-white/10" />
                    <span>No Session</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ======================================= */}
          {/* TAB 6: LEAVE REGISTRY                   */}
          {/* ======================================= */}
          {activeTab === 'leave' && (
            <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* COLUMN 1: REGISTER LEAVE */}
                <div className={`p-6 rounded-3xl border flex flex-col justify-between ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'
                  }`}>
                  <div>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold">Pause Pass / Register Leave</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Pause your dining pass to help mess managers optimize food preparation.</p>
                    </div>

                    {leaveStatus === 'success' && (
                      <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-xs text-center font-bold">
                        Leave request submitted successfully! Awaiting Warden approval.
                      </div>
                    )}

                    {leaveStatus === 'error' && (
                      <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-bold">
                        Failed to submit leave. Please check dates and try again.
                      </div>
                    )}

                    <form onSubmit={handleApplyLeave} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Start Date</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-orange-500/50 text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200'
                              }`}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">End Date</label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-orange-500/50 text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200'
                              }`}
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={leaveStatus === 'submitting'}
                        className="w-full mt-4 py-3.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-500/10 active:scale-[0.98] disabled:opacity-50 cursor-pointer text-xs uppercase tracking-wider"
                      >
                        {leaveStatus === 'submitting' ? 'Registering Pause...' : 'Register Leave / Pause Pass'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* COLUMN 2: LEAVE HISTORY */}
                <div className={`p-6 rounded-3xl border flex flex-col ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'
                  }`}>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">My Leave History</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Track your submitted requests and pass pauses.</p>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[350px] space-y-3 pr-1">
                    {myLeaves.length === 0 ? (
                      <div className="text-center py-12 text-xs text-gray-400">
                        No leave history found.
                      </div>
                    ) : (
                      myLeaves.map((leave) => {
                        const start = new Date(leave.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                        const end = new Date(leave.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                        const days = Math.round((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

                        return (
                          <div
                            key={leave.id}
                            className={`p-4 rounded-2xl border flex justify-between items-center ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100 shadow-sm'
                              }`}
                          >
                            <div className="space-y-1">
                              <div className="text-xs font-bold">
                                {start} - {end}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                Duration: {days} {days === 1 ? 'Day' : 'Days'}
                              </div>
                            </div>
                            <div>
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${leave.status === 'APPROVED'
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : leave.status === 'REJECTED'
                                    ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                }`}>
                                {leave.status}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 7: FOOD AUDIT                       */}
          {/* ======================================= */}
          {activeTab === 'feedback' && (
            <div className="max-w-xl mx-auto animate-fade-in">
              <div className={`p-8 rounded-3xl border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'
                }`}>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold">Food Quality Audit</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Submit rating audits on recent meals directly to warden oversight.</p>
                </div>

                {feedbackStatus === 'success' && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-455 text-xs text-center font-bold">
                    Audit submitted successfully. Thank you for your input!
                  </div>
                )}

                <form onSubmit={submitFeedback} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">Rate Today's Food Quality</label>
                    <div className="flex gap-3 justify-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="focus:outline-none transition-all scale-110 active:scale-95 cursor-pointer text-2xl"
                        >
                          <Star className={`w-8 h-8 ${star <= rating ? 'text-amber-400 fill-current' : 'text-gray-250'
                            }`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Comments & Observations</label>
                    <textarea
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-orange-500/50 text-sm ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200'
                        }`}
                      placeholder="Comment on spice levels, hygiene, freshness..."
                      rows={3}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-[0.98] cursor-pointer text-xs uppercase tracking-wider"
                  >
                    Submit Audit Report
                  </button>
                </form>
              </div>
            </div>
          )}

          
          {/* ======================================= */}
          {/* TAB: SURPLUS TOKENS                     */}
          {/* ======================================= */}
          {activeTab === 'tokens' && (
            <SurplusTokens isDark={isDark} />
          )}


          {/* ======================================= */}
          {/* TAB 8: STUDENT PROFILE & EDIT           */}
          {/* ======================================= */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto animate-fade-in space-y-3.5">

              {/* SUCCESS TOAST ALERT */}
              {profileSaveStatus === 'success' && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center gap-3 animate-fade-in shadow-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>Profile details updated successfully! Dynamic QR identity pass synchronized.</span>
                </div>
              )}

              <div className={`p-4 sm:p-7 rounded-2xl sm:rounded-3xl border relative overflow-hidden ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                {/* HEADER & EDIT BUTTON */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b mb-5 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white text-xl sm:text-2xl font-black flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
                      {((studentName || initialUser?.name || 'AK').slice(0, 2)).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-800'}`}>
                          ACTIVE STUDENT PASS
                        </span>
                      </div>
                      <h3 className={`text-base sm:text-lg font-black mt-1 truncate ${isDark ? 'text-white' : 'text-slate-950'}`}>
                        {(studentName || initialUser?.name || 'AMAN KUMAR SINGH').toUpperCase()}
                      </h3>
                      <p className={`text-xs font-bold tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        ROLL NO: {rollNumber || initialUser?.student?.rollNumber || '2502013'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!isEditingProfile) {
                        setEditName(studentName || initialUser?.name || 'Aman Kumar Singh');
                        setEditRoomNumber(roomNumber || '010');
                        setEditFoodPref(foodPreference || 'Veg');
                        setEditMess(messAssociation || 'Main 2nd Floor');
                        setEditParentPhone(parentPhone || '+91 9692905128');
                      }
                      setIsEditingProfile(!isEditingProfile);
                    }}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer ${isEditingProfile
                        ? isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-primary text-white hover:opacity-95 shadow-orange-500/20'
                      }`}
                  >
                    {isEditingProfile ? (
                      <>
                        <X className="w-4 h-4" /> Cancel Edit
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-4 h-4" /> Edit Profile
                      </>
                    )}
                  </button>
                </div>

                {/* EDIT MODE FORM */}
                {isEditingProfile ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Edit Profile Information</h4>
                      <span className={`text-[10px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Syncs with QR</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Full Name</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors ${isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                            }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Room Number</label>
                        <input
                          type="text"
                          required
                          value={editRoomNumber}
                          onChange={(e) => setEditRoomNumber(e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors ${isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                            }`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Diner Preference</label>
                        <select
                          value={editFoodPref}
                          onChange={(e) => setEditFoodPref(e.target.value as any)}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors ${isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                            }`}
                        >
                          <option value="Veg">Vegetarian (Veg)</option>
                          <option value="Non-Veg">Non-Vegetarian (Non-Veg)</option>
                        </select>
                      </div>

                      <div>
                        <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Mess Association</label>
                        <select
                          value={editMess}
                          onChange={(e) => setEditMess(e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors ${isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                            }`}
                        >
                          <option value="Main 2nd Floor">Main 2nd Floor</option>
                          <option value="South Block Mess">South Block Mess</option>
                          <option value="North Canteen Mess">North Canteen Mess</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className={`block text-xs font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Parent Notification Phone</label>
                        <input
                          type="text"
                          required
                          value={editParentPhone}
                          onChange={(e) => setEditParentPhone(e.target.value)}
                          placeholder="+91 XXXXXXXXXX"
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors ${isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white'
                            }`}
                        />
                        <p className={`text-[10px] mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          * SMS reports for gate entry & exit meal scans are sent to this number.
                        </p>
                      </div>
                    </div>

                    <div className={`pt-3 border-t flex flex-col sm:flex-row items-center justify-end gap-2.5 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={profileSaveStatus === 'saving'}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
                      >
                        {profileSaveStatus === 'saving' ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" /> Saving Changes...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" /> Save Profile
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* VIEW MODE - HIGH CONTRAST MODERN RESPONSIVE TILES */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Hostel Residence */}
                    <div className={`p-3.5 sm:p-4 rounded-2xl border flex items-start gap-3 transition-all ${isDark ? 'bg-slate-800/60 border-white/10' : 'bg-slate-50/90 border-slate-200/90 shadow-xs'}`}>
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`text-[11px] font-extrabold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Hostel Residence
                        </span>
                        <p className={`text-sm sm:text-base font-black mt-0.5 truncate ${isDark ? 'text-white' : 'text-slate-950'}`}>
                          {hostelName || 'BH 10'} • Room {roomNumber || '010'}
                        </p>
                      </div>
                    </div>

                    {/* Dietary Preference */}
                    <div className={`p-3.5 sm:p-4 rounded-2xl border flex items-start gap-3 transition-all ${isDark ? 'bg-slate-800/60 border-white/10' : 'bg-slate-50/90 border-slate-200/90 shadow-xs'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${foodPreference === 'Veg' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'}`}>
                        <Utensils className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`text-[11px] font-extrabold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Dietary Preference
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className={`text-sm sm:text-base font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                            {foodPreference || 'Veg'} Food
                          </p>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${foodPreference === 'Veg' ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-800 dark:text-red-300 border border-red-500/30'}`}>
                            {foodPreference || 'Veg'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mess Association */}
                    <div className={`p-3.5 sm:p-4 rounded-2xl border flex items-start gap-3 transition-all ${isDark ? 'bg-slate-800/60 border-white/10' : 'bg-slate-50/90 border-slate-200/90 shadow-xs'}`}>
                      <div className="w-10 h-10 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`text-[11px] font-extrabold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Assigned Mess Hall
                        </span>
                        <p className={`text-sm sm:text-base font-black mt-0.5 truncate ${isDark ? 'text-white' : 'text-slate-950'}`}>
                          {messAssociation || 'Main 2nd Floor'}
                        </p>
                      </div>
                    </div>

                    {/* Student Email */}
                    <div className={`p-3.5 sm:p-4 rounded-2xl border flex items-start gap-3 transition-all ${isDark ? 'bg-slate-800/60 border-white/10' : 'bg-slate-50/90 border-slate-200/90 shadow-xs'}`}>
                      <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`text-[11px] font-extrabold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Campus Email
                        </span>
                        <p className={`text-sm sm:text-base font-black mt-0.5 truncate ${isDark ? 'text-white' : 'text-slate-950'}`} title={studentEmail}>
                          {studentEmail || '2502013_cse@gita.edu.in'}
                        </p>
                      </div>
                    </div>

                    {/* Parent Phone Telemetry */}
                    <div className={`sm:col-span-2 p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${isDark ? 'bg-emerald-950/30 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200/90 shadow-xs'}`}>
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <PhoneCall className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className={`text-[11px] font-extrabold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-900'}`}>
                            Parent Notification Link
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                            SMS Active
                          </span>
                        </div>
                        <p className={`text-sm sm:text-base font-black mt-1 ${isDark ? 'text-emerald-300' : 'text-emerald-950'}`}>
                          {parentPhone || '+91 9692905128'}
                        </p>
                        <p className={`text-[11px] font-medium mt-1 leading-relaxed ${isDark ? 'text-emerald-400/90' : 'text-emerald-800'}`}>
                          Dispatches automated live meal entry & checkout SMS alerts to parents.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB: MEAL FEEDBACK                     */}
          {/* ======================================= */}
          {activeTab === 'feedback' && (
            <MealFeedbackSection isDark={isDark} todayMeals={todayMeals} />
          )}

          {/* ======================================= */}
          {/* TAB 9: SETTINGS                         */}
          {/* ======================================= */}
          {activeTab === 'settings' && (
            <div className="max-w-xl mx-auto animate-fade-in">
              <div className={`p-8 rounded-3xl border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'
                }`}>
                <h3 className="text-base font-semibold mb-6">Application Settings</h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100/50">
                    <div>
                      <h4 className="text-xs font-bold">Dark Theme Interface</h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">Toggle dark mode visual layout</p>
                    </div>
                    <button
                      onClick={() => setIsDark(!isDark)}
                      className={`w-12 h-6 rounded-full p-1 transition-all ${isDark ? 'bg-primary flex justify-end' : 'bg-gray-300 flex justify-start'
                        }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white shadow-md" />
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-100/50">
                    <div>
                      <h4 className="text-xs font-bold">Real-time SMS Dispatches</h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">Sends entry/exit notification reports to parent</p>
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">Force Active</span>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <div>
                      <h4 className="text-xs font-bold">Culinary Preferences</h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">Update current preferred kitchen layout</p>
                    </div>
                    <select
                      value={foodPreference}
                      onChange={(e) => setFoodPreference(e.target.value as any)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-750'
                        }`}
                    >
                      <option value="Veg">Vegetarian</option>
                      <option value="Non-Veg">Non-Vegetarian</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
};

export default StudentPortal;
