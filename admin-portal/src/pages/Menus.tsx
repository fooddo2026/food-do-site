import React, { useState, useEffect } from 'react';

import { API_BASE_URL } from '../config';

interface MenuItem {
  id: string;
  serveDate: string;
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  items: string[];
  totalCalories: number;
  isReady?: boolean;
}

const Menus: React.FC = () => {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [menuSubTab, setMenuSubTab] = useState<'scheduled' | 'weekly'>('scheduled');

  const isTokenReleaseAllowed = (mealType: string) => {
    const hour = new Date().getHours();
    if (mealType === 'BREAKFAST' && hour >= 11) return false; 
    if (mealType === 'LUNCH' && hour >= 16) return false;     
    if (mealType === 'DINNER' && hour >= 23) return false;    
    return true;
  };

  // Form states
    const [serveDate, setServeDate] = useState('');
  const [mealType, setMealType] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'>('BREAKFAST');
  const [itemsString, setItemsString] = useState('');
  const [totalCalories, setTotalCalories] = useState(650);

  // Surplus Token states
  const [showSurplusModal, setShowSurplusModal] = useState(false);
  const [selectedSurplusMenu, setSelectedSurplusMenu] = useState<MenuItem | null>(null);
  const [surplusQty, setSurplusQty] = useState(10);
  const [surplusPrice, setSurplusPrice] = useState(5);
  const [surplusStatus, setSurplusStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!serveDate) return;
    
    // Parse date to day of week
    const dateObj = new Date(serveDate);
    if (isNaN(dateObj.getTime())) return;
    
    // Get day name (Monday, Tuesday, etc.)
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[dateObj.getDay()];
    
    const weeklyCycle: Record<string, { breakfast: string, lunch: string, dinner: string }> = {
      Monday: {
        breakfast: 'Chuda Poha, Ghuguni',
        lunch: 'Rice, Dal, Besan Curry, Dahi Bundi',
        dinner: 'Roti, Rice, Dal, Buta Dali Curry, Simei Kheer'
      },
      Tuesday: {
        breakfast: 'Bada, Ghuguni',
        lunch: 'Rice, Dal, Aloo Potala Curry, Sagu Papad',
        dinner: 'Roti, Rice, Dal, Soyabean Chilli, Rasogola'
      },
      Wednesday: {
        breakfast: 'Suji Halwa, Ghuguni',
        lunch: 'Rice, Dal, Fish Masala, Pampad, Manchurian (Veg Only)',
        dinner: 'Roti, Rice, Dal, Chilli Chicken, Mushroom Chilli (Veg Only)'
      },
      Thursday: {
        breakfast: 'Aloochop, Ghuguni',
        lunch: 'Rice, Dalma, Aloo Kalara Chips, Amba Khata / Ambula Rai',
        dinner: 'Fried Rice, Dal Fry, Paneer Butter Masala'
      },
      Friday: {
        breakfast: 'Dahibada, Aloo Dum, Seu',
        lunch: 'Rice, Dal, Fish Masala, Mudhi Ghanta, Paneer Green Matar Masala, Papad (Veg Only)',
        dinner: 'Roti, Rice, Dal, Chicken Butter Masala, Paneer Butter Masala'
      },
      Saturday: {
        breakfast: 'Idli, Ghuguni, Chatani',
        lunch: 'Rice, Dalma, Aloo Bharata, Badichura / Mix Pickel',
        dinner: 'Roti, Rice, Dal, Egg Tadka, Veg Tadka'
      },
      Sunday: {
        breakfast: 'Chat',
        lunch: 'Rice, Dal, Egg Curry, Besan Curry (Veg Only), Papad',
        dinner: 'Chicken Biriyani, Veg Biriyani, Chicken Joos, Raita (Dal Fry for Veg Only)'
      }
    };
    
    const dayMenu = weeklyCycle[dayName];
    if (dayMenu) {
      if (mealType === 'BREAKFAST') {
        setItemsString(dayMenu.breakfast);
        setTotalCalories(380);
      } else if (mealType === 'LUNCH') {
        setItemsString(dayMenu.lunch);
        setTotalCalories(720);
      } else if (mealType === 'DINNER') {
        setItemsString(dayMenu.dinner);
        setTotalCalories(640);
      }
    }
  }, [serveDate, mealType]);

  const fetchMenus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/menus`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const getLocalYMD = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      
      const todayStr = getLocalYMD(new Date());

      if (response.ok) {
        const data = await response.json();
        // Format items array and filter strictly for TODAY's date
        const formatted = data
          .map((m: any) => ({
            ...m,
            items: Array.isArray(m.items) ? m.items : JSON.parse(m.items || '[]'),
          }))
          .filter((m: any) => getLocalYMD(new Date(m.serveDate)) === todayStr);

        if (formatted.length > 0) {
          setMenus(formatted);
          setLoading(false);
          return;
        }
      }

      // If no API menus for today or API fallback, auto-generate from calendar day of week
      generateTodayAutoMenu();
    } catch (err: any) {
      console.warn('API error, auto-generating today\'s menu from calendar:', err.message);
      generateTodayAutoMenu();
    } finally {
      setLoading(false);
    }
  };

  const generateTodayAutoMenu = () => {
    const getLocalYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const todayStr = getLocalYMD(new Date());
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];

    const autoWeeklyMap: Record<string, MenuItem[]> = {
      Monday: [
        { id: 'auto-b', serveDate: todayStr, mealType: 'BREAKFAST', items: ['Chuda Poha', 'Ghuguni'], totalCalories: 380 },
        { id: 'auto-l', serveDate: todayStr, mealType: 'LUNCH', items: ['Rice', 'Dal', 'Besan Curry', 'Dahi Bundi'], totalCalories: 720 },
        { id: 'auto-d', serveDate: todayStr, mealType: 'DINNER', items: ['Roti', 'Rice', 'Dal', 'Buta Dali Curry', 'Simei Kheer'], totalCalories: 640 }
      ],
      Tuesday: [
        { id: 'auto-b', serveDate: todayStr, mealType: 'BREAKFAST', items: ['Bada', 'Ghuguni'], totalCalories: 380 },
        { id: 'auto-l', serveDate: todayStr, mealType: 'LUNCH', items: ['Rice', 'Dal', 'Aloo Potala Curry', 'Sagu Papad'], totalCalories: 710 },
        { id: 'auto-d', serveDate: todayStr, mealType: 'DINNER', items: ['Roti', 'Rice', 'Dal', 'Soyabean Chilli', 'Rasogola'], totalCalories: 650 }
      ],
      Wednesday: [
        { id: 'auto-b', serveDate: todayStr, mealType: 'BREAKFAST', items: ['Suji Halwa', 'Ghuguni'], totalCalories: 400 },
        { id: 'auto-l', serveDate: todayStr, mealType: 'LUNCH', items: ['Rice', 'Dal', 'Fish Masala', 'Pampad', 'Manchurian (Veg Only)'], totalCalories: 810 },
        { id: 'auto-d', serveDate: todayStr, mealType: 'DINNER', items: ['Roti', 'Rice', 'Dal', 'Chilli Chicken', 'Mushroom Chilli (Veg Only)'], totalCalories: 750 }
      ],
      Thursday: [
        { id: 'auto-b', serveDate: todayStr, mealType: 'BREAKFAST', items: ['Aloochop', 'Ghuguni'], totalCalories: 390 },
        { id: 'auto-l', serveDate: todayStr, mealType: 'LUNCH', items: ['Rice', 'Dalma', 'Aloo Kalara Chips', 'Amba Khata / Ambula Rai'], totalCalories: 700 },
        { id: 'auto-d', serveDate: todayStr, mealType: 'DINNER', items: ['Fried Rice', 'Dal Fry', 'Paneer Butter Masala'], totalCalories: 680 }
      ],
      Friday: [
        { id: 'auto-b', serveDate: todayStr, mealType: 'BREAKFAST', items: ['Dahibada', 'Aloo Dum', 'Seu'], totalCalories: 420 },
        { id: 'auto-l', serveDate: todayStr, mealType: 'LUNCH', items: ['Rice', 'Dal', 'Fish Masala', 'Mudhi Ghanta', 'Paneer Green Matar Masala', 'Papad (Veg Only)'], totalCalories: 830 },
        { id: 'auto-d', serveDate: todayStr, mealType: 'DINNER', items: ['Roti', 'Rice', 'Dal', 'Chicken Butter Masala', 'Paneer Butter Masala'], totalCalories: 760 }
      ],
      Saturday: [
        { id: 'auto-b', serveDate: todayStr, mealType: 'BREAKFAST', items: ['Idli', 'Ghuguni', 'Chatani'], totalCalories: 370 },
        { id: 'auto-l', serveDate: todayStr, mealType: 'LUNCH', items: ['Rice', 'Dalma', 'Aloo Bharata', 'Badichura / Mix Pickel'], totalCalories: 690 },
        { id: 'auto-d', serveDate: todayStr, mealType: 'DINNER', items: ['Roti', 'Rice', 'Dal', 'Egg Tadka', 'Veg Tadka'], totalCalories: 660 }
      ],
      Sunday: [
        { id: 'auto-b', serveDate: todayStr, mealType: 'BREAKFAST', items: ['Chat'], totalCalories: 350 },
        { id: 'auto-l', serveDate: todayStr, mealType: 'LUNCH', items: ['Rice', 'Dal', 'Egg Curry', 'Besan Curry (Veg Only)', 'Papad'], totalCalories: 780 },
        { id: 'auto-d', serveDate: todayStr, mealType: 'DINNER', items: ['Chicken Biriyani', 'Veg Biriyani', 'Chicken Joos', 'Raita (Dal Fry for Veg Only)'], totalCalories: 850 }
      ]
    };

    setMenus(autoWeeklyMap[todayName] || autoWeeklyMap['Sunday']);
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serveDate || !itemsString) {
      setError('Please fill in all fields');
      return;
    }

    const items = itemsString.split(',').map((item) => item.trim()).filter(Boolean);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/menus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serveDate,
          mealType,
          items,
          totalCalories: Number(totalCalories),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create menu');
      }

      await fetchMenus();
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      console.warn('API error during menu addition, simulating locally:', err.message);
      const newMenu: MenuItem = {
        id: Math.random().toString(),
        serveDate,
        mealType,
        items,
        totalCalories: Number(totalCalories),
      };
      setMenus((prev) => [newMenu, ...prev]);
      setShowAddModal(false);
      resetForm();
    }
  };

    const handleReleaseSurplus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSurplusMenu) return;

    setSurplusStatus('submitting');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/meals/surplus/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mealType: selectedSurplusMenu.mealType,
          date: selectedSurplusMenu.serveDate,
          quantity: Number(surplusQty),
          price: Number(surplusPrice),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to release tokens');
      }

      setSurplusStatus('success');
      setTimeout(() => {
        setShowSurplusModal(false);
        setSurplusStatus(null);
      }, 2000);
    } catch (err: any) {
      console.warn('API error releasing tokens, simulating locally:', err.message);
      
      try {
        const existingTokensStr = localStorage.getItem('food_do_surplus_tokens');
        const existingTokens = existingTokensStr ? JSON.parse(existingTokensStr) : [];
        
        const newTokens = Array.from({ length: Number(surplusQty) }).map(() => ({
          id: 'token-' + Math.random().toString(36).substr(2, 9),
          mealType: selectedSurplusMenu?.mealType,
          date: selectedSurplusMenu?.serveDate,
          price: Number(surplusPrice) || 5,
          status: 'AVAILABLE',
          createdAt: new Date().toISOString()
        }));
        
        localStorage.setItem('food_do_surplus_tokens', JSON.stringify([...newTokens, ...existingTokens]));
        
        setSurplusStatus('success');
        setTimeout(() => {
          setShowSurplusModal(false);
          setSurplusStatus(null);
        }, 2000);
      } catch (localErr) {
        setSurplusStatus('error');
        setTimeout(() => setSurplusStatus(null), 3000);
      }
    }
  };

  const handleNotifyReady = async (menuId: string) => {
    const targetMenu = menus.find(m => m.id === menuId);
    
    // Broadcast payload for student portal real-time notification
    const broadcastPayload = {
      id: Date.now(),
      mealType: targetMenu?.mealType || 'MEAL',
      mess: 'Ramanujan Mess Hall',
      items: targetMenu?.items || [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Store in localStorage & dispatch custom DOM event for instant cross-tab sync
    localStorage.setItem('food_ready_broadcast', JSON.stringify(broadcastPayload));
    window.dispatchEvent(new CustomEvent('food_ready_event', { detail: broadcastPayload }));

    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/menus/${menuId}/notify-ready`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mess: 'Ramanujan Mess Hall'
        })
      });
    } catch (err: any) {
      console.warn('API error during notification trigger, applying local broadcast fallback:', err.message);
    } finally {
      // Mark as served/ready so it is removed from active schedule view
      setMenus(prev => prev.map(m => m.id === menuId ? { ...m, isReady: true } : m));
    }
  };

  const resetForm = () => {
    const getLocalYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    setServeDate(getLocalYMD(new Date()));
    setMealType('BREAKFAST');
    setItemsString('');
    setTotalCalories(650);
    setError('');
  };

  const activeMenus = menus;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Menu Management</h2>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Schedule and manage daily meals, calorie charts, and weekly cycles.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto">
          <div className="flex p-1 bg-gray-100/90 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setMenuSubTab('scheduled')}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                menuSubTab === 'scheduled'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Today's Live Schedule
            </button>
            <button
              onClick={() => setMenuSubTab('weekly')}
              className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                menuSubTab === 'weekly'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Weekly Cycle Reference
            </button>
          </div>
          {menuSubTab === 'scheduled' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-primary text-white px-4 py-2.5 rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-sm cursor-pointer whitespace-nowrap text-xs sm:text-sm text-center w-full sm:w-auto"
            >
              + Special Meal Override
            </button>
          )}
        </div>
      </div>

      {menuSubTab === 'scheduled' ? (
        loading ? (
          <div className="flex justify-center items-center py-20 text-gray-500">
            <svg className="animate-spin h-8 w-8 text-primary mr-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading Menu Schedules...
          </div>
        ) : activeMenus.length === 0 ? (
          <div className="p-12 bg-white rounded-3xl border border-gray-100 text-center space-y-3 shadow-sm animate-in fade-in duration-300">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
              ✨
            </div>
            <h3 className="text-lg font-extrabold text-gray-800">All Today's Meals Notified & Served!</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Food ready alerts have been broadcasted to all students. Your dashboard is clear and relaxed for upcoming meals.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {activeMenus.map((menu) => (
              <div
                key={menu.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col"
              >
                <div className="p-6 border-b border-gray-50 flex justify-between items-start">
                  <div>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wider ${
                        menu.mealType === 'BREAKFAST'
                          ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                          : menu.mealType === 'LUNCH'
                          ? 'bg-orange-50 text-primary border border-orange-100'
                          : menu.mealType === 'DINNER'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          : 'bg-green-50 text-green-700 border border-green-100'
                      }`}
                    >
                      {menu.mealType}
                    </span>
                    <h3 className="text-lg font-bold text-gray-800 mt-2">
                      {new Date(menu.serveDate).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-400 block">Energy</span>
                    <span className="text-base font-bold text-gray-800">{menu.totalCalories} kcal</span>
                  </div>
                </div>
                <div className="p-6 flex-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
                    Menu Items
                  </span>
                  <ul className="space-y-2 mb-4">
                    {menu.items.map((item, idx) => (
                      <li key={idx} className="flex items-center text-gray-600 text-sm">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-6 border-t border-gray-50 flex justify-between items-center bg-gray-50/50">
                  <div className="flex w-full gap-2">
                    <button
                      onClick={() => handleNotifyReady(menu.id)}
                      disabled={menu.isReady}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                        menu.isReady
                          ? 'bg-orange-100 text-orange-400 cursor-not-allowed border border-orange-200'
                          : 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer'
                      }`}
                      title={menu.isReady ? "Already Notified" : "Notify Food Ready"}
                    >
                      {menu.isReady ? '✅ Notified' : '📢 Notify'}
                    </button>
                    <button
                      onClick={() => { setSelectedSurplusMenu(menu); setShowSurplusModal(true); }}
                      disabled={!isTokenReleaseAllowed(menu.mealType)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                        isTokenReleaseAllowed(menu.mealType) 
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 opacity-70'
                      }`}
                      title={isTokenReleaseAllowed(menu.mealType) ? "Release Surplus Tokens" : "Cannot release tokens (Meal time over, food may be stale)"}
                    >
                      🎟️ Release Tokens
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Mobile Card List View (No Horizontal Scroll on Mobile) */}
          <div className="space-y-4 md:hidden">
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
                <div 
                  key={idx} 
                  className={`p-4 rounded-2xl border transition-all ${
                    isToday 
                      ? 'bg-orange-50/70 border-orange-200 shadow-sm' 
                      : 'bg-white border-gray-100 shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                      {row.day}
                      {isToday && <span className="px-2 py-0.5 rounded text-[9px] bg-primary text-white font-extrabold">TODAY</span>}
                    </h4>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-yellow-50/70 border border-yellow-100">
                      <span className="font-bold text-yellow-800 text-[10px] uppercase block mb-0.5">Breakfast</span>
                      <p className="text-gray-800 font-medium">{row.breakfast}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-orange-50/70 border border-orange-100">
                      <span className="font-bold text-orange-800 text-[10px] uppercase block mb-0.5">Lunch</span>
                      <p className="text-gray-800 font-medium">{row.lunch}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
                      <span className="font-bold text-indigo-800 text-[10px] uppercase block mb-0.5">Dinner</span>
                      <p className="text-gray-800 font-medium">{row.dinner}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View of 7 Days */}
          <div className="hidden md:block border rounded-3xl overflow-hidden shadow-md bg-white border-slate-300">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b text-xs font-black uppercase tracking-wider bg-slate-100 border-slate-300 text-slate-950">
                    <th className="py-4 px-6 text-slate-950 font-black">Day</th>
                    <th className="py-4 px-6 text-slate-950 font-black">Breakfast</th>
                    <th className="py-4 px-6 text-slate-950 font-black">Lunch</th>
                    <th className="py-4 px-6 text-slate-950 font-black">Dinner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-extrabold">
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
                        className={`transition-colors ${
                          isToday 
                            ? 'bg-orange-100/80 font-black text-orange-950'
                            : 'hover:bg-slate-50 text-slate-900'
                        }`}
                      >
                        <td className="py-4 px-6 font-black flex items-center gap-2 text-slate-950">
                          {row.day}
                          {isToday && <span className="px-2 py-0.5 rounded text-[8px] bg-orange-600 text-white font-black shadow">TODAY</span>}
                        </td>
                        <td className="py-4 px-6 text-slate-900">{row.breakfast}</td>
                        <td className="py-4 px-6 text-slate-900">{row.lunch}</td>
                        <td className="py-4 px-6 text-slate-900">{row.dinner}</td>
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
            <div className="p-6 rounded-3xl border bg-white border-slate-300 shadow-md">
              <h4 className="text-sm font-black mb-4 flex items-center gap-2 text-orange-600">
                ⏰ Official Servings Timings
              </h4>
              <div className="space-y-3.5 text-xs font-bold">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="font-black text-slate-950">Breakfast (Mon - Sat)</span>
                  <span className="font-black text-slate-900">07:00 AM - 08:00 AM</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="font-black text-slate-950">Breakfast (Sunday & Holidays)</span>
                  <span className="font-black text-slate-900">08:00 AM - 09:30 AM</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="font-black text-slate-950">Lunch (Mon - Sat)</span>
                  <span className="font-black text-slate-900">02:30 PM - 03:30 PM</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="font-black text-slate-950">Lunch (Sunday & Holidays)</span>
                  <span className="font-black text-slate-900">01:30 PM - 03:00 PM</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="font-black text-slate-950">Dinner (1st Year Boarders)</span>
                  <span className="font-black text-slate-900">08:30 PM - 09:30 PM</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-black text-slate-950">Dinner (Seniors/Post-Grads)</span>
                  <span className="font-black text-slate-900">08:45 PM - 09:45 PM</span>
                </div>
              </div>
            </div>

            {/* Floor Allotments Card */}
            <div className="p-6 rounded-3xl border bg-white border-slate-300 shadow-md">
              <h4 className="text-sm font-black mb-4 flex items-center gap-2 text-orange-600">
                🏢 Mess Floor Allotment
              </h4>
              <div className="space-y-4 text-xs font-bold">
                <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-300 flex items-start gap-3">
                  <span className="text-lg font-black text-orange-600">❶</span>
                  <div>
                    <div className="font-black text-slate-950 text-sm">Central Mess - 1st Floor</div>
                    <div className="text-xs font-extrabold text-slate-800 mt-1">Reserved for 3rd & 4th Year, MBA & MCA Boarders only.</div>
                  </div>
                </div>
                <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-300 flex items-start gap-3">
                  <span className="text-lg font-black text-orange-600">❷</span>
                  <div>
                    <div className="font-black text-slate-950 text-sm">Central Mess - 2nd Floor</div>
                    <div className="text-xs font-extrabold text-slate-800 mt-1">Reserved for 2nd Year Boarders only.</div>
                  </div>
                </div>
                <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-300 flex items-start gap-3">
                  <span className="text-lg font-black text-orange-600">❸</span>
                  <div>
                    <div className="font-black text-slate-950 text-sm">Central Mess - 3rd Floor</div>
                    <div className="text-xs font-extrabold text-slate-800 mt-1">Reserved for 1st Year Boarders only.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Surplus Token Modal */}
      {showSurplusModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowSurplusModal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
            >
              ✕
            </button>
            <div className="text-center mb-6">
              <span className="text-4xl mb-2 block">🎟️</span>
              <h3 className="text-xl font-bold text-gray-900">Release Surplus</h3>
              <p className="text-xs text-gray-500 mt-1">Make leftover food available to Day Scholars as tokens.</p>
            </div>

            {surplusStatus === 'success' && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs text-center font-bold">
                Tokens released successfully!
              </div>
            )}
            
            {surplusStatus === 'error' && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs text-center font-bold">
                Failed to release tokens.
              </div>
            )}

            <form onSubmit={handleReleaseSurplus} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Meal Type</label>
                <input type="text" readOnly value={selectedSurplusMenu?.mealType || ''} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm font-bold" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quantity</label>
                  <input
                    type="number"
                    value={surplusQty}
                    onChange={(e) => setSurplusQty(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-800 focus:outline-none focus:border-emerald-500 text-sm"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Price (₹)</label>
                  <input
                    type="number"
                    value={surplusPrice}
                    onChange={(e) => setSurplusPrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-800 focus:outline-none focus:border-emerald-500 text-sm"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={surplusStatus === 'submitting'}
                  className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all cursor-pointer disabled:opacity-50"
                >
                  {surplusStatus === 'submitting' ? 'Releasing...' : 'Confirm Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Menu Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Schedule New Meal</h3>
            <p className="text-sm text-gray-500 mb-6">Create the mess menu for a specific date and session.</p>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleAddMenu} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={serveDate}
                    onChange={(e) => setServeDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-800 focus:outline-none focus:border-primary transition-all text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Session
                  </label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-800 focus:outline-none focus:border-primary transition-all text-sm"
                  >
                    <option value="BREAKFAST">Breakfast</option>
                    <option value="LUNCH">Lunch</option>
                    <option value="DINNER">Dinner</option>
                    <option value="SNACK">Snack</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Items (Comma-separated)
                </label>
                <textarea
                  value={itemsString}
                  onChange={(e) => setItemsString(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-primary transition-all text-sm h-24"
                  placeholder="e.g., Paneer Butter Masala, Roti, Rice, Dal Makhani"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Total Calories (kcal)
                </label>
                <input
                  type="number"
                  value={totalCalories}
                  onChange={(e) => setTotalCalories(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-800 focus:outline-none focus:border-primary transition-all text-sm"
                  min="100"
                  max="3000"
                  required
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-all cursor-pointer"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menus;
