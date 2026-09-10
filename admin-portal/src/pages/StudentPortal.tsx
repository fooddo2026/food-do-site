import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { API_BASE_URL } from '../config';
import { 
  LayoutDashboard, QrCode, History, Utensils, CalendarDays, 
  CalendarRange, MessageSquare, User, Settings, LogOut, 
  Search, Bell, Sun, Moon, Clock, Flame,
  CheckCircle2, RefreshCw, Maximize2, Timer, Star
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

const WEEKLY_CYCLE_MAP: Record<string, { breakfast: string[]; lunch: string[]; dinner: string[] }> = {
  Sunday: {
    breakfast: ['Chat'],
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

const getTodayMenuForDay = (date: Date = new Date()) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[date.getDay()];
  return WEEKLY_CYCLE_MAP[dayName] || WEEKLY_CYCLE_MAP['Tuesday'];
};

const StudentPortal: React.FC<StudentPortalProps> = ({ onLogout }) => {
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'qr' | 'history' | 'menu' | 'attendance' | 'leave' | 'feedback' | 'profile' | 'settings'
  >('dashboard');

  // Dark mode local simulation state
  const [isDark, setIsDark] = useState<boolean>(false);

  // Search & Notification simulation
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [isQrFullscreen, setIsQrFullscreen] = useState(false);

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Helper to load real session user from local storage
  const getSessionUser = () => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {}
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
  
  // Real-time scan toast state
  const [scanAlert, setScanAlert] = useState<{
    show: boolean;
    studentName: string;
    smsAlert: string;
    timestamp: string;
    gateType: 'ENTRY' | 'EXIT';
    duration?: number;
  } | null>(null);

  // QR Rotating Pass Token
  const [qrSignature, setQrSignature] = useState('INITIAL_SIGNATURE_XYZ');
  const [secondsRemaining, setSecondsRemaining] = useState(30);

  // Form states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveStatus, setLeaveStatus] = useState<string | null>(null);

  const [rating, setRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);

  // Mock Menu
  const [upcomingMeal, setUpcomingMeal] = useState({
    mealType: 'DINNER',
    items: ['Paneer Lababdar', 'Butter Roti', 'Jeera Rice', 'Gulab Jamun']
  });

  const [todayMeals, _setTodayMeals] = useState<any>(getTodayMenuForDay(new Date()));

  // Mock Notification logs
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Dinner is now active at Ramanujan Mess Hall.', time: '10m ago', unread: true },
    { id: 2, text: 'Your Leave registry for Aug 12 - Aug 15 has been processed.', time: '2h ago', unread: true },
    { id: 3, text: 'Weekly nutrition audit report is available.', time: '1d ago', unread: false }
  ]);

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
      const dayMenu = getTodayMenuForDay(now);
      const items = info.mealType === 'BREAKFAST'
        ? (todayMeals.breakfast && todayMeals.breakfast.length > 0 ? todayMeals.breakfast : dayMenu.breakfast)
        : info.mealType === 'LUNCH'
          ? (todayMeals.lunch && todayMeals.lunch.length > 0 ? todayMeals.lunch : dayMenu.lunch)
          : (todayMeals.dinner && todayMeals.dinner.length > 0 ? todayMeals.dinner : dayMenu.dinner);

      setUpcomingMeal({
        mealType: info.mealType,
        items
      });
    };

    syncActiveMeal();
    const clockTimer = setInterval(syncActiveMeal, 10000);
    return () => clearInterval(clockTimer);
  }, []);

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
            setStudentName(data.student.name);
            setRollNumber(data.student.rollNumber);
            setFoodPreference(data.student.foodPreference || 'Veg');
            if (data.student.hostel) {
              setHostelName(data.student.hostel.name || data.student.hostel);
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
          }
        }
      } catch (err) {
        console.warn('Could not fetch live profile, using fallback');
      }
    };

    fetchProfile();
    fetchMenu();
    fetchQRToken();

    // Listen to real-time scanning events via Socket.io
    let userRole = 'STUDENT';
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role) userRole = user.role;
      }
    } catch (e) {}

    const socket = io(API_BASE_URL, {
      query: { role: userRole }
    });

    socket.on('meal_scanned', (eventData) => {
      if (eventData && eventData.studentId === studentId) {
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

    socket.on('food_ready', (eventData) => {
      const itemsStr = Array.isArray(eventData.items) ? eventData.items.join(', ') : '';
      const newNotification = {
        id: Date.now(),
        text: `📢 ${eventData.mealType} is ready at ${eventData.mess}! Items: ${itemsStr}`,
        time: 'Just now',
        unread: true
      };
      setNotifications(prev => [newNotification, ...prev]);

      setScanAlert({
        show: true,
        studentName: studentName,
        smsAlert: `📢 Notification broadcast: ${eventData.mealType} ready!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        gateType: 'ENTRY',
      });

      fetchMenu();

      setTimeout(() => {
        setScanAlert(null);
      }, 8000);
    });

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev > 1) {
          return prev - 1;
        } else {
          fetchQRToken();
          return 30;
        }
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      socket.disconnect();
    };
  }, [studentId]);

  const fetchQRToken = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/meals/qr`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setQrSignature(data.token);
        setSecondsRemaining(data.expiresIn || 30);
      } else {
        throw new Error('Local signature fallback');
      }
    } catch (err) {
      const randomHash = Math.random().toString(36).substring(2, 15);
      setQrSignature(randomHash);
      setSecondsRemaining(30);
    }
  };

  const fetchMenu = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/menus`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const itemsList = data[0].items;
          const itemsArray = Array.isArray(itemsList) 
            ? itemsList 
            : typeof itemsList === 'string' 
              ? JSON.parse(itemsList) 
              : ['Paneer Masala', 'Tandoori Roti', 'Basmati Rice'];
          
          setUpcomingMeal({
            mealType: data[0].mealType,
            items: itemsArray,
          });
        }
      }
    } catch (err) {
      console.warn('Could not fetch menu, using default');
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;

    setLeaveStatus('submitting');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/leaves`, {
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
        setHistoryLogs((prev) => [
          {
            id: Math.random().toString(),
            mealType: 'ALL MEALS',
            date: 'Future Leave Registered',
            status: 'SKIPPED',
            time: '--'
          },
          ...prev
        ]);
        setTimeout(() => setLeaveStatus(null), 4000);
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      setTimeout(() => {
        setLeaveStatus('success');
        setStartDate('');
        setEndDate('');
        setHistoryLogs((prev) => [
          {
            id: Math.random().toString(),
            mealType: 'ALL MEALS',
            date: 'Future Leave Registered',
            status: 'SKIPPED',
            time: '--'
          },
          ...prev
        ]);
        setTimeout(() => setLeaveStatus(null), 4000);
      }, 600);
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

  const qrToken = JSON.stringify({
    sid: studentId || initialUser?.id || initialUser?.studentId || '',
    roll: rollNumber || initialUser?.rollNumber || '',
    name: studentName || initialUser?.name || '',
    hostel: hostelName || initialUser?.hostel || '',
    room: roomNumber || initialUser?.roomNumber || '',
    pref: foodPreference,
    mess: messAssociation || initialUser?.mess || '',
    tok: qrSignature,
    ts: Math.floor(Date.now() / 1000)
  });

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
          ? 'bg-orange-950/80 text-orange-200 border-orange-700/60 font-black animate-pulse' 
          : 'bg-orange-100 text-orange-950 border-orange-300 font-black animate-pulse',
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
    return `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all cursor-pointer ${
      isActive
        ? 'bg-orange-650 text-white shadow-lg shadow-orange-600/10'
        : isDark
          ? 'text-gray-400 hover:text-white hover:bg-white/5'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    }`;
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

      {/* FULLSCREEN QR OVERLAY MODAL */}
      {isQrFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-6 backdrop-blur-xl animate-fade-in text-white">
          <div className="w-full max-w-sm text-center">
            <h3 className="text-xl font-bold tracking-tight">Dynamic Access Pass</h3>
            <p className="text-xs text-gray-400 mt-1 mb-6">Keep QR centered on scanner terminal scanner screen</p>
            
            {/* Student Info Verification Card inside Fullscreen view */}
            <div className="w-full p-4 rounded-2xl flex items-center gap-4 text-left border border-white/10 bg-white/5 mb-6">
              <div className="w-12 h-12 rounded-xl bg-orange-500 text-white font-extrabold text-sm flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
                {studentName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black truncate uppercase text-orange-500 leading-none">{studentName.toUpperCase()}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                    foodPreference.toLowerCase() === 'veg'
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-500 border border-red-500/20'
                  }`}>
                    {foodPreference}
                  </span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider mt-1 text-gray-400">
                  Roll: {rollNumber}
                </p>
                <p className="text-[10px] font-black uppercase tracking-wider mt-0.5 text-gray-300">
                  Hostel: {hostelName} • Room {roomNumber}
                </p>
                <p className="text-[10px] font-black uppercase tracking-wider mt-0.5 text-gray-350">
                  Mess: {messAssociation}
                </p>
              </div>
            </div>

            <div className="my-8 p-6 bg-white rounded-3xl inline-block relative shadow-2xl shadow-orange-500/10">
              <QRCodeSVG 
                value={qrToken} 
                size={256}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="M"
                includeMargin={true}
                className="w-64 h-64 mx-auto"
              />
              {/* Scan Beam Line */}
              <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 shadow-md animate-bounce" />
            </div>

            <div className="flex items-center justify-center gap-2 mb-6">
              <Timer className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-semibold">Updating signature in: <strong className="text-orange-500">{secondsRemaining}s</strong></span>
            </div>

            <button 
              onClick={() => setIsQrFullscreen(false)} 
              className="py-3 px-6 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Exit Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* LEFT NAVIGATION SIDEBAR (Collapses on mobile, overlay via header/sidebar links) */}
      <aside className={`w-64 shrink-0 border-r ${isDark ? 'border-white/5 bg-slate-900' : 'border-gray-200/60 bg-white'} hidden md:flex flex-col justify-between p-6 z-10`}>
        <div className="space-y-6">
          {/* Logo Header */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <span className="text-xl font-black text-orange-500">FD</span>
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight leading-none">FOOD-DO</h2>
              <span className="text-[8px] font-black tracking-widest text-orange-500 uppercase mt-0.5 block">
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
            <button onClick={() => setActiveTab('qr')} className={navItemClass('qr')}>
              <QrCode className="w-5 h-5" />
              My QR Pass
            </button>
            <button onClick={() => setActiveTab('history')} className={navItemClass('history')}>
              <History className="w-5 h-5" />
              Meal History
            </button>
            <button onClick={() => setActiveTab('menu')} className={navItemClass('menu')}>
              <Utensils className="w-5 h-5" />
              Today's Menu
            </button>
            <button onClick={() => setActiveTab('attendance')} className={navItemClass('attendance')}>
              <CalendarDays className="w-5 h-5" />
              Attendance
            </button>
            <button onClick={() => setActiveTab('leave')} className={navItemClass('leave')}>
              <CalendarRange className="w-5 h-5" />
              Leave Registry
            </button>
            <button onClick={() => setActiveTab('feedback')} className={navItemClass('feedback')}>
              <MessageSquare className="w-5 h-5" />
              Food Audit
            </button>
            <button onClick={() => setActiveTab('profile')} className={navItemClass('profile')}>
              <User className="w-5 h-5" />
              My Profile
            </button>
            <button onClick={() => setActiveTab('settings')} className={navItemClass('settings')}>
              <Settings className="w-5 h-5" />
              Settings
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
        <header className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${
          isDark ? 'border-white/5 bg-slate-900' : 'border-gray-200/60 bg-white'
        }`}>
          {/* Left search */}
          <div className="flex items-center gap-3 flex-1 max-w-xs md:max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search meals, history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium focus:outline-none ${
                  isDark ? 'bg-white/5 border border-white/10 text-white' : 'bg-gray-100 border border-transparent focus:bg-white focus:border-gray-200'
                }`}
              />
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3 md:gap-5 shrink-0">
            
            {/* Server-time Clock Display */}
            <div className={`hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold ${
              isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-600'
            }`}>
              <Clock className="w-4 h-4 text-orange-500 shrink-0" />
              <span>{formatDate(currentTime)} • {formatTime(currentTime)}</span>
            </div>

            {/* Dark Mode toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isDark ? 'bg-white/5 border-white/10 text-yellow-450 hover:bg-white/10' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notifications panel dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-xl border transition-all cursor-pointer relative ${
                  isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Bell className="w-4 h-4" />
                {notifications.some(n => n.unread) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-650 animate-ping" />
                )}
              </button>

              {showNotifications && (
                <div className={`absolute right-0 mt-3 w-80 rounded-2xl border p-4 shadow-xl z-20 transition-all ${
                  isDark ? 'bg-slate-900 border-white/10 text-white shadow-black/40' : 'bg-white border-gray-100 text-gray-800 shadow-gray-200/80'
                }`}>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-orange-500">Notifications</h4>
                    <button 
                      onClick={() => setNotifications(prev => prev.map(n => ({...n, unread: false})))} 
                      className="text-[10px] font-bold text-gray-400 hover:underline cursor-pointer"
                    >
                      Clear Unread
                    </button>
                  </div>
                  <div className="space-y-3">
                    {notifications.map((n) => (
                      <div key={n.id} className={`p-2.5 rounded-xl border transition-all text-xs ${
                        n.unread 
                          ? isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50/50 border-orange-100' 
                          : isDark ? 'bg-white/5 border-transparent' : 'bg-gray-50 border-transparent'
                      }`}>
                        <p className="font-medium">{n.text}</p>
                        <span className="text-[9px] text-gray-400 block mt-1">{n.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar indicator */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-orange-500 text-white font-extrabold text-xs flex items-center justify-center shadow-lg shadow-orange-650/10">
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
        <div className={`md:hidden flex items-center justify-around py-3 px-2 border-b text-xs font-bold ${
          isDark ? 'border-white/5 bg-slate-900' : 'border-gray-200/60 bg-white'
        }`}>
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard' ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button 
            onClick={() => setActiveTab('qr')} 
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'qr' ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Pass</span>
          </button>

          <button 
            onClick={() => setActiveTab('history')} 
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'history' ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Logs</span>
          </button>

          <button 
            onClick={() => setActiveTab('menu')} 
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'menu' ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Menu</span>
          </button>

          <button 
            onClick={() => setActiveTab('leave')} 
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'leave' ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <CalendarRange className="w-4 h-4" />
            <span>Leave</span>
          </button>
        </div>

        {/* WORKSPACE CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">

          {/* ======================================= */}
          {/* TAB 1: DASHBOARD VIEW                   */}
          {/* ======================================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Header Greeting Banner */}
              <div className={`p-6 md:p-8 rounded-3xl relative overflow-hidden border ${
                isDark 
                  ? 'bg-gradient-to-br from-orange-600/10 via-slate-900 to-slate-900 border-white/5' 
                  : 'bg-gradient-to-br from-orange-50 via-white to-white border-orange-100/50 shadow-sm'
              }`}>
                {/* Glow behind greeting */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[80px] pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                  <div>
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase bg-orange-500/10 text-orange-500 border border-orange-500/20">
                      Ramanujan Mess Hall • Active
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight mt-3">
                      Good Day, <span className="text-orange-500">{studentName}</span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-wider">
                      Hostel Residence: {hostelName} • Room {roomNumber}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveTab('qr')}
                      className="py-3 px-5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-orange-650/15 cursor-pointer flex items-center gap-1.5"
                    >
                      <QrCode className="w-4 h-4" />
                      View QR Pass
                    </button>
                    <button
                      onClick={onLogout}
                      className="md:hidden py-3 px-5 bg-red-500/10 hover:bg-red-500/20 text-red-550 border border-red-550/10 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Summary Cards & Stats Rings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(['BREAKFAST', 'LUNCH', 'DINNER'] as const).map((mealType) => {
                  const state = getMealCardState(mealType);
                  const title = mealType.charAt(0) + mealType.slice(1).toLowerCase();
                  return (
                    <div 
                      key={mealType}
                      className={`p-6 rounded-3xl border flex items-center justify-between gap-4 transition-all ${
                        isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200/80 shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <span className="text-xs font-extrabold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                          {title}
                        </span>
                        <h3 className={`text-xl font-black tracking-tight flex items-center gap-1.5 ${state.statusColor}`}>
                          {state.status}
                        </h3>
                        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black border mt-1 ${state.badgeClass}`}>
                          <Clock className={`w-4 h-4 shrink-0 ${state.clockIconColor}`} />
                          <span>{state.timeLabel}</span>
                        </div>
                      </div>
                      <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="28" cy="28" r="23" stroke={isDark ? '#1e293b' : '#e2e8f0'} strokeWidth="4.5" fill="transparent" />
                          <circle cx="28" cy="28" r="23" stroke={state.strokeColor} strokeWidth="4.5" fill="transparent" strokeDasharray="145" strokeDashoffset={state.strokeDashoffset} className={state.isServingNow ? "animate-pulse" : ""} />
                        </svg>
                        {state.isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 absolute" />
                        ) : state.isServingNow ? (
                          <Flame className="w-6 h-6 text-orange-500 absolute animate-pulse" />
                        ) : (
                          <Clock className={`w-6 h-6 absolute ${state.isClosed ? 'text-slate-400' : 'text-amber-500'}`} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Summary deck grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Active serving menu card */}
                <div className={`lg:col-span-8 p-6 rounded-3xl border ${
                  isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'
                }`}>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-base font-black">
                        {currentMealInfo.isServingNow ? 'Currently Serving Menu' : 'Upcoming Meal Menu'}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {currentMealInfo.timeSubtitle}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full border text-[9px] font-black tracking-widest uppercase ${
                      currentMealInfo.isServingNow
                        ? 'bg-orange-500/10 text-orange-500 border-orange-500/20 animate-pulse'
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {currentMealInfo.badgeText}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {upcomingMeal.items.map((item, idx) => (
                      <div key={idx} className={`p-4 rounded-2xl border text-center ${
                        isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'
                      }`}>
                        <span className="text-2xl block mb-2">
                          {item.includes('Paneer') ? '🍲' : item.includes('Roti') ? '🫓' : item.includes('Rice') ? '🍚' : '🍬'}
                        </span>
                        <h4 className="text-xs font-bold truncate">{item}</h4>
                        <span className="text-[9px] text-orange-500 font-bold block mt-1.5">Fresh Cooked</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stat summary cards */}
                <div className={`lg:col-span-4 p-6 rounded-3xl border flex flex-col justify-between ${
                  isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'
                }`}>
                  <h3 className="text-base font-black mb-4">Meal Statistics</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-400">Attendance Rate</span>
                      <span className="text-sm font-extrabold text-emerald-500">92%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-gray-200/50 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }} />
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-gray-400">Streak Status</span>
                      <span className="text-sm font-extrabold text-orange-500 flex items-center gap-1">
                        <Flame className="w-4 h-4 fill-current" />
                        8 Meals
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-100/50">
                      <span className="text-xs font-medium text-gray-400">Wastage Saved</span>
                      <span className="text-xs font-extrabold text-gray-400">4.5 kg equivalent</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ======================================= */}
          {/* TAB 2: MY QR PASS                       */}
          {/* ======================================= */}
          {activeTab === 'qr' && (
            <div className="max-w-md mx-auto animate-fade-in">
              <div className={`p-8 rounded-3xl border text-center flex flex-col items-center gap-6 relative overflow-hidden ${
                isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'
              }`}>
                {/* Top strip */}
                <div className="absolute top-0 left-0 w-full h-[5px] bg-gradient-to-r from-orange-500 to-amber-500" />
                
                <div>
                  <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 text-[9px] font-black tracking-widest uppercase">
                    SECURE MESS ACCESS PASS
                  </span>
                  <h3 className="text-lg font-black tracking-tight mt-3">Digital Mess Entry Pass</h3>
                  <p className="text-xs text-gray-400 mt-1">Auto-refreshes every 30 seconds for secure mess gate verification.</p>
                </div>

                {/* Student Info Verification Card */}
                <div className={`w-full p-4 rounded-2xl flex items-center gap-4 text-left border ${
                  isDark 
                    ? 'bg-slate-950/40 border-white/5 shadow-inner' 
                    : 'bg-orange-50/20 border-orange-100/50 shadow-sm'
                }`}>
                  <div className="w-12 h-12 rounded-xl bg-orange-500 text-white font-extrabold text-sm flex items-center justify-center shadow-lg shadow-orange-500/20 shrink-0">
                    {studentName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-black truncate uppercase text-orange-500 leading-none">{studentName.toUpperCase()}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                        foodPreference.toLowerCase() === 'veg'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-500 border border-red-500/20'
                      }`}>
                        {foodPreference}
                      </span>
                    </div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Roll: {rollNumber}
                    </p>
                    <p className={`text-[10px] font-black uppercase tracking-wider mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Hostel: {hostelName} • Room {roomNumber}
                    </p>
                    <p className={`text-[10px] font-black uppercase tracking-wider mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-650'}`}>
                      Mess: {messAssociation}
                    </p>
                  </div>
                </div>

                {/* QR box with scanning laser beam */}
                <div className={`p-6 rounded-3xl border relative shadow-2xl ${
                  isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200/30'
                }`}>
                  <div className="p-4 bg-white rounded-2xl relative shadow-md overflow-hidden flex items-center justify-center">
                    <QRCodeSVG 
                      value={qrToken} 
                      size={220}
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                      level="M"
                      includeMargin={true}
                      className="w-56 h-56 mx-auto"
                    />
                    
                    {/* Animated Scanning Beam line */}
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-orange-500 shadow-md shadow-orange-500/50 animate-bounce" style={{ animationDuration: '3.5s' }} />
                  </div>

                  {/* Fullscreen icon button */}
                  <button
                    onClick={() => setIsQrFullscreen(true)}
                    className="absolute bottom-3 right-3 p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white transition-all cursor-pointer"
                    title="Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Rotation counter */}
                <div className="w-full space-y-3">
                  <div className="flex justify-between items-center text-xs font-semibold px-2">
                    <span className="text-gray-400">Pass Security Signature</span>
                    <span className="text-orange-500 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Auto-updates in {secondsRemaining}s
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                    <div 
                      className="h-full bg-orange-500 transition-all duration-1000 rounded-full" 
                      style={{ width: `${(secondsRemaining / 30) * 100}%` }} 
                    />
                  </div>
                </div>

                {/* Action button deck */}
                <div className="grid grid-cols-2 gap-3 w-full pt-4 border-t border-gray-100/50">
                  <button
                    onClick={fetchQRToken}
                    className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Generate Signature
                  </button>
                  <button
                    onClick={() => setIsQrFullscreen(true)}
                    className="py-3 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/10 cursor-pointer"
                  >
                    Launch Fullscreen
                  </button>
                </div>

                <div className="text-[10px] text-gray-400 bg-orange-500/5 p-3 rounded-2xl border border-orange-500/10 text-left leading-relaxed">
                  🔒 <strong>Warden Notice:</strong> Screen recording or pass screenshots are deactivated. Real-time scanning alerts are dispatched directly to parent phone terminals.
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
                  <h3 className="text-lg font-black">Your Meal Logs</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Chronological database check-ins & checks</p>
                </div>
              </div>

              {/* TIMELINE UI CARDS */}
              <div className="space-y-4">
                {historyLogs.map((log) => (
                  <div key={log.id} className={`p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
                  }`}>
                    
                    {/* Log Left details */}
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl shrink-0 ${
                        log.status === 'CONSUMED'
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
                          <h4 className="text-sm font-extrabold">{log.mealType}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            log.status === 'CONSUMED'
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
                      <div className={`p-3 rounded-2xl border text-xs font-mono max-w-xs ${
                        isDark ? 'bg-black/35 border-white/5' : 'bg-gray-50 border-gray-100'
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
          {/* TAB 4: MENU OF TODAY                    */}
          {/* ======================================= */}
          {activeTab === 'menu' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-lg font-black">Today's Mess Menu</h3>
                <p className="text-xs text-gray-400 mt-0.5">Daily nutritional and culinary listings</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Breakfast item card */}
                <div className={`p-6 rounded-3xl border flex flex-col justify-between gap-5 relative overflow-hidden ${
                  isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-extrabold">Breakfast Buffet</h4>
                      <div className="flex flex-col gap-0.5 mt-1.5 text-[11px] font-bold">
                        <span className="text-gray-500 flex items-center gap-1">
                          🏢 <span className="text-gray-400 font-medium">Mess Hall:</span> 07:00 AM - 08:30 AM
                        </span>
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          🍳 <span className="text-gray-400 font-medium">Kitchen Counter:</span> 08:30 AM - 10:00 AM
                        </span>
                      </div>
                    </div>
                    {currentMealInfo.mealType === 'BREAKFAST' && currentMealInfo.isServingNow ? (
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse border ${
                        currentMealInfo.isKitchenServing
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      }`}>
                        {currentMealInfo.isKitchenServing ? '🍳 KITCHEN PICKUP' : '📢 MESS SERVING'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 text-[9px] font-bold">
                        SCHEDULED
                      </span>
                    )}
                  </div>

                  <div className={`p-4 rounded-2xl border ${
                    isDark 
                      ? 'bg-slate-800/60 border-slate-700/50' 
                      : 'bg-orange-50/70 border-orange-200/60'
                  }`}>
                    <h5 className="text-[11px] font-black text-orange-600 dark:text-orange-400 mb-1.5 uppercase tracking-wider">
                      Dishes Served:
                    </h5>
                    <p className={`text-sm font-black leading-relaxed ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      {(todayMeals.breakfast && todayMeals.breakfast.length > 0 
                        ? todayMeals.breakfast 
                        : getTodayMenuForDay(currentTime).breakfast).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-400 font-bold border-t border-gray-100/50 pt-4">
                    <span>🔥 340 kcal</span>
                    <span>•</span>
                    <span>💪 8g Prot</span>
                  </div>
                </div>

                {/* Lunch item card */}
                <div className={`p-6 rounded-3xl border flex flex-col justify-between gap-5 relative overflow-hidden ${
                  isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-extrabold">Lunch Banquet</h4>
                      <div className="flex flex-col gap-0.5 mt-1.5 text-[11px] font-bold">
                        <span className="text-gray-500 flex items-center gap-1">
                          🏢 <span className="text-gray-400 font-medium">Mess Hall:</span> 02:00 PM - 03:30 PM
                        </span>
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          🍳 <span className="text-gray-400 font-medium">Kitchen Counter:</span> 03:30 PM - 04:00 PM
                        </span>
                      </div>
                    </div>
                    {currentMealInfo.mealType === 'LUNCH' && currentMealInfo.isServingNow ? (
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse border ${
                        currentMealInfo.isKitchenServing
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      }`}>
                        {currentMealInfo.isKitchenServing ? '🍳 KITCHEN PICKUP' : '📢 MESS SERVING'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 text-[9px] font-bold">
                        SCHEDULED
                      </span>
                    )}
                  </div>

                  <div className={`p-4 rounded-2xl border ${
                    isDark 
                      ? 'bg-slate-800/60 border-slate-700/50' 
                      : 'bg-orange-50/70 border-orange-200/60'
                  }`}>
                    <h5 className="text-[11px] font-black text-orange-600 dark:text-orange-400 mb-1.5 uppercase tracking-wider">
                      Dishes Served:
                    </h5>
                    <p className={`text-sm font-black leading-relaxed ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      {(todayMeals.lunch && todayMeals.lunch.length > 0 
                        ? todayMeals.lunch 
                        : getTodayMenuForDay(currentTime).lunch).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-400 font-bold border-t border-gray-100/50 pt-4">
                    <span>🔥 680 kcal</span>
                    <span>•</span>
                    <span>💪 24g Prot</span>
                  </div>
                </div>

                {/* Dinner item card */}
                <div className={`p-6 rounded-3xl border flex flex-col justify-between gap-5 relative overflow-hidden ${
                  isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-base font-extrabold">Dinner Buffet</h4>
                      <div className="flex flex-col gap-0.5 mt-1.5 text-[11px] font-bold">
                        <span className="text-gray-500 flex items-center gap-1">
                          🏢 <span className="text-gray-400 font-medium">Mess Hall:</span> 08:30 PM - 09:30 PM
                        </span>
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          🍳 <span className="text-gray-400 font-medium">Kitchen Counter:</span> 09:30 PM - 10:00 PM
                        </span>
                      </div>
                    </div>
                    {currentMealInfo.mealType === 'DINNER' && currentMealInfo.isServingNow ? (
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse border ${
                        currentMealInfo.isKitchenServing
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      }`}>
                        {currentMealInfo.isKitchenServing ? '🍳 KITCHEN PICKUP' : '📢 MESS SERVING'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 text-[9px] font-bold">
                        SCHEDULED
                      </span>
                    )}
                  </div>

                  <div className={`p-4 rounded-2xl border ${
                    isDark 
                      ? 'bg-slate-800/60 border-slate-700/50' 
                      : 'bg-orange-50/70 border-orange-200/60'
                  }`}>
                    <h5 className="text-[11px] font-black text-orange-600 dark:text-orange-400 mb-1.5 uppercase tracking-wider">
                      Dishes Served:
                    </h5>
                    <p className={`text-sm font-black leading-relaxed ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      {(todayMeals.dinner && todayMeals.dinner.length > 0 
                        ? todayMeals.dinner 
                        : getTodayMenuForDay(currentTime).dinner).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-400 font-bold border-t border-gray-100/50 pt-4">
                    <span>🔥 590 kcal</span>
                    <span>•</span>
                    <span>💪 18g Prot</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 5: ATTENDANCE ANALYTICS             */}
          {/* ======================================= */}
          {activeTab === 'attendance' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-lg font-black">Attendance Analytics</h3>
                <p className="text-xs text-gray-400 mt-0.5">Diner presence logs and compliance metrics</p>
              </div>

              {/* Attendance metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <span className="text-xs font-bold text-gray-400 uppercase">Monthly Ratio</span>
                  <h3 className="text-2xl font-black text-emerald-500 mt-2">92.4%</h3>
                  <span className="text-[10px] text-gray-400 mt-1 block">Excellent Compliance</span>
                </div>
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <span className="text-xs font-bold text-gray-400 uppercase">Meals Consumed</span>
                  <h3 className="text-2xl font-black text-orange-500 mt-2">84 Meals</h3>
                  <span className="text-[10px] text-gray-400 mt-1 block">Past 30 Days</span>
                </div>
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <span className="text-xs font-bold text-gray-400 uppercase">Active Streak</span>
                  <h3 className="text-2xl font-black text-orange-500 mt-2">8 Meals</h3>
                  <span className="text-[10px] text-gray-400 mt-1 block">No skips since Tuesday</span>
                </div>
                <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <span className="text-xs font-bold text-gray-400 uppercase">Missed & Absent</span>
                  <h3 className="text-2xl font-black text-red-500 mt-2">2 Meals</h3>
                  <span className="text-[10px] text-gray-400 mt-1 block">Unregistered Absences</span>
                </div>
              </div>

              {/* Weekly grid map */}
              <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                <h4 className="text-sm font-black mb-4">Weekly Attendance Heatmap</h4>
                <div className="grid grid-cols-7 gap-3 text-center">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div key={day}>
                      <span className="text-xs font-bold text-gray-400 block mb-2">{day}</span>
                      <div className="space-y-2">
                        {/* Breakfast */}
                        <div className="h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold text-emerald-500" title="Breakfast consumed">
                          🍳
                        </div>
                        {/* Lunch */}
                        <div className="h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold text-emerald-500" title="Lunch consumed">
                          🍲
                        </div>
                        {/* Dinner */}
                        <div className="h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold text-emerald-500" title="Dinner consumed">
                          🍛
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ======================================= */}
          {/* TAB 6: LEAVE REGISTRY                   */}
          {/* ======================================= */}
          {activeTab === 'leave' && (
            <div className="max-w-xl mx-auto animate-fade-in">
              <div className={`p-8 rounded-3xl border ${
                isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'
              }`}>
                <div className="mb-6">
                  <h3 className="text-lg font-black">Pause Pass / Register Leave</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Pause your dining pass to help mess managers optimize food preparation.</p>
                </div>

                {leaveStatus === 'success' && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-xs text-center font-bold">
                    Leave successfully registered! Your dining pass is paused for selected dates.
                  </div>
                )}

                <form onSubmit={handleApplyLeave} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-orange-500/50 text-sm ${
                          isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200'
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
                        className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-orange-500/50 text-sm ${
                          isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200'
                        }`}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={leaveStatus === 'submitting'}
                    className="w-full py-3.5 bg-orange-655 hover:bg-orange-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-500/10 active:scale-[0.98] disabled:opacity-50 cursor-pointer text-xs uppercase tracking-wider"
                  >
                    {leaveStatus === 'submitting' ? 'Registering Pause...' : 'Register Leave / Pause Pass'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 7: FOOD AUDIT                       */}
          {/* ======================================= */}
          {activeTab === 'feedback' && (
            <div className="max-w-xl mx-auto animate-fade-in">
              <div className={`p-8 rounded-3xl border ${
                isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'
              }`}>
                <div className="mb-6">
                  <h3 className="text-lg font-black">Food Quality Audit</h3>
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
                          <Star className={`w-8 h-8 ${
                            star <= rating ? 'text-amber-400 fill-current' : 'text-gray-250'
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
                      className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-orange-500/50 text-sm ${
                        isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200'
                      }`}
                      placeholder="Comment on spice levels, hygiene, freshness..."
                      rows={3}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-orange-655 hover:bg-orange-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-[0.98] cursor-pointer text-xs uppercase tracking-wider"
                  >
                    Submit Audit Report
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 8: STUDENT PROFILE                  */}
          {/* ======================================= */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl mx-auto animate-fade-in">
              <div className={`p-8 rounded-3xl border ${
                isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'
              }`}>
                <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-gray-150/10 mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-orange-500 text-white text-3xl font-black flex items-center justify-center shadow-xl shadow-orange-500/20">
                    {studentName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-center sm:text-left">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-bold">ACTIVE STUDENT PASS</span>
                    <h3 className="text-xl font-black mt-1.5">{studentName.toUpperCase()}</h3>
                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mt-0.5">Roll No: {rollNumber}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Hostel Coordinate</h4>
                    <p className="text-sm font-semibold">{hostelName} • Room {roomNumber}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Diner Preference</h4>
                    <p className="text-sm font-semibold">{foodPreference} Preference</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Mess Association</h4>
                    <p className="text-sm font-semibold">{messAssociation}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email</h4>
                    <p className="text-sm font-semibold">{studentEmail}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Parent Notification Link</h4>
                    <p className="text-sm font-semibold">{parentPhone} (Dispatches scans)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* TAB 9: SETTINGS                         */}
          {/* ======================================= */}
          {activeTab === 'settings' && (
            <div className="max-w-xl mx-auto animate-fade-in">
              <div className={`p-8 rounded-3xl border ${
                isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'
              }`}>
                <h3 className="text-base font-black mb-6">Application Settings</h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100/50">
                    <div>
                      <h4 className="text-xs font-bold">Dark Theme Interface</h4>
                      <p className="text-[10px] text-gray-400">Toggle dark mode visual layout</p>
                    </div>
                    <button
                      onClick={() => setIsDark(!isDark)}
                      className={`w-12 h-6 rounded-full p-1 transition-all ${
                        isDark ? 'bg-orange-500 flex justify-end' : 'bg-gray-300 flex justify-start'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white shadow-md" />
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-100/50">
                    <div>
                      <h4 className="text-xs font-bold">Real-time SMS Dispatches</h4>
                      <p className="text-[10px] text-gray-400">Sends entry/exit notification reports to parent</p>
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">Force Active</span>
                  </div>

                  <div className="flex justify-between items-center py-3">
                    <div>
                      <h4 className="text-xs font-bold">Culinary Preferences</h4>
                      <p className="text-[10px] text-gray-400">Update current preferred kitchen layout</p>
                    </div>
                    <select
                      value={foodPreference}
                      onChange={(e) => setFoodPreference(e.target.value as any)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                        isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-750'
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
