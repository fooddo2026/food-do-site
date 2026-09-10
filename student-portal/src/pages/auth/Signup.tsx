import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Mail, Lock, User, MapPin, Phone, HeartPulse, Sparkles, ChevronDown } from 'lucide-react';

import { API_BASE_URL } from '../../config';

interface SignupProps {
  onBack: () => void;
  onSignupSuccess: (token: string, user: { id: string; email: string; role: string }) => void;
}

const Signup: React.FC<SignupProps> = ({ onBack, onSignupSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVerifiedHosteller, setIsVerifiedHosteller] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');

  // Step 1: Credentials
  const [studentType] = useState<'HOSTELER' | 'DAY_SCHOLAR'>(() => {
    return (localStorage.getItem('student_identity_preference') as 'HOSTELER' | 'DAY_SCHOLAR') || 'HOSTELER';
  });
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Details
  const [department, setDepartment] = useState('CSE');
  const [year, setYear] = useState('2nd Year');
  const [hostel, setHostel] = useState('BH 01');
  const [roomNumber, setRoomNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  // Step 3: Preferences
  const [foodPreference, setFoodPreference] = useState<'Veg' | 'Non-Veg'>('Veg');
  const [allergies, setAllergies] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [mess, setMess] = useState('South Block Mess');

  const nextStep = async () => {
    setError('');
    setVerificationMessage('');
    if (step === 1) {
      if (!fullName || !rollNumber || !email || !password || !confirmPassword) {
        setError('All fields are required');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      if (studentType === 'DAY_SCHOLAR') {
        // Skip hosteller verification and hostel details for Day Scholars
        setStep(3); // Directly to preferences or skip if not needed. Let's send them to step 3 directly (or maybe they don't even need mess preference, wait. Let's just ask for phone number in step 2 instead. Actually let's just use Step 2 for phone and skip hostel.
      } else {
        setLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/hosteller/${rollNumber}`);
          if (response.ok) {
            const data = await response.json();
            setFullName(data.name);
            setHostel(data.hostelName);
            setRoomNumber(data.roomNumber);
            setParentPhone(data.parentPhone);
            setFoodPreference(data.foodPreference === 'Non-Veg' ? 'Non-Veg' : 'Veg');
            if (data.mess) {
              setMess(data.mess);
            }
            setIsVerifiedHosteller(true);
            setVerificationMessage(`✅ Verified Hosteller: official records loaded for ${data.name}!`);
          } else {
            setIsVerifiedHosteller(false);
            setVerificationMessage('⚠️ Notice: Roll number not found in master database. Please fill details manually.');
          }
        } catch (err) {
          console.warn('Failed to query hosteller master registry:', err);
          setIsVerifiedHosteller(false);
        } finally {
          setLoading(false);
        }
      }
      setStep(2);
    } else if (step === 2) {
      if (!department || !year || !phone) {
        setError('Department, Year and Phone are required');
        return;
      }
      if (studentType === 'HOSTELER' && (!hostel || !roomNumber)) {
        setError('Hostel and Room Number are required');
        return;
      }
      if (studentType === 'DAY_SCHOLAR') {
          // Can skip step 3 for day scholars entirely and register directly
          handleRegister(new Event('submit') as any);
          return;
      }
      setStep(3);
    }
  };

  const prevStep = () => {
    setError('');
    setStep((prev) => prev - 1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          phone,
          password,
          rollNumber,
          name: fullName,
          hostelName: studentType === 'DAY_SCHOLAR' ? null : hostel,
          roomNumber: studentType === 'DAY_SCHOLAR' ? null : roomNumber,
          foodPreference,
          parentPhone,
          mess: studentType === 'DAY_SCHOLAR' ? null : mess,
          studentType
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      const userToSave = {
        id: data.user?.id || 'student-' + Date.now(),
        email: email,
        role: 'STUDENT',
        name: fullName,
        rollNumber: rollNumber,
        hostelName: studentType === 'DAY_SCHOLAR' ? null : hostel,
        hostel: studentType === 'DAY_SCHOLAR' ? null : hostel,
        roomNumber: studentType === 'DAY_SCHOLAR' ? null : roomNumber,
        foodPreference: foodPreference,
        parentPhone: parentPhone,
        mess: studentType === 'DAY_SCHOLAR' ? null : mess,
        studentType: studentType
      };

      try {
        const storedUsers = localStorage.getItem('food_do_registered_users');
        const usersList = storedUsers ? JSON.parse(storedUsers) : [];
        const idx = usersList.findIndex((u: any) => u.email?.toLowerCase() === email.toLowerCase() || u.rollNumber?.toLowerCase() === rollNumber.toLowerCase());
        if (idx >= 0) {
          usersList[idx] = { ...usersList[idx], ...userToSave };
        } else {
          usersList.push(userToSave);
        }
        localStorage.setItem('food_do_registered_users', JSON.stringify(usersList));
      } catch (e) {}

      // Save to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userToSave));

      setLoading(false);
      onSignupSuccess(data.token, userToSave);
    } catch (err: any) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('NetworkError')) {
        console.warn('Backend API unreachable, completing registration locally...');
        const demoUser = {
          id: 'student-' + Date.now(),
          email,
          role: 'STUDENT',
          name: fullName,
          rollNumber,
          hostelName: studentType === 'DAY_SCHOLAR' ? null : hostel,
          hostel: studentType === 'DAY_SCHOLAR' ? null : hostel,
          roomNumber: studentType === 'DAY_SCHOLAR' ? null : roomNumber,
          foodPreference,
          parentPhone,
          mess: studentType === 'DAY_SCHOLAR' ? null : mess,
          studentType: studentType
        };
        try {
          const storedUsers = localStorage.getItem('food_do_registered_users');
          const usersList = storedUsers ? JSON.parse(storedUsers) : [];
          const idx = usersList.findIndex((u: any) => u.email?.toLowerCase() === email.toLowerCase() || u.rollNumber?.toLowerCase() === rollNumber.toLowerCase());
          if (idx >= 0) {
            usersList[idx] = { ...usersList[idx], ...demoUser };
          } else {
            usersList.push(demoUser);
          }
          localStorage.setItem('food_do_registered_users', JSON.stringify(usersList));
        } catch (e) {}
        const demoToken = 'demo-student-jwt-' + demoUser.id;
        localStorage.setItem('token', demoToken);
        localStorage.setItem('user', JSON.stringify(demoUser));
        setLoading(false);
        onSignupSuccess(demoToken, demoUser);
        return;
      }
      setError(err.message || 'Registration failed. Please check network.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative font-sans text-white overflow-hidden selection:bg-orange-500 selection:text-white">
      
      {/* 100% Full Unbroken Mess Photo Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat filter brightness-90 contrast-105 pointer-events-none"
        style={{ backgroundImage: "url('/images/hostel_mess_image.jpg')" }}
      />
      
      {/* Deep Dark Tint for High Contrast */}
      <div className="absolute inset-0 bg-black/65 pointer-events-none" />

      {/* Seamless Radial Orange Warm Glow */}
      <div className="absolute w-[450px] h-[450px] bg-orange-500/25 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      {/* High-Contrast Frosted Glass Panel */}
      <div className="w-full max-w-lg p-8 md:p-10 rounded-3xl bg-black/85 backdrop-blur-2xl border border-white/30 border-t-2 border-t-orange-500 shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative z-10 mx-4">
        
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={step === 1 ? onBack : prevStep}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-orange-400 group cursor-pointer transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
          >
            <ArrowLeft className="w-4 h-4 text-orange-400 group-hover:-translate-x-0.5 transition-transform" />
            {step === 1 ? 'Back to Login' : 'Back'}
          </button>
          
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all duration-300 ${
                  s === step 
                    ? 'w-7 bg-orange-500 shadow-md shadow-orange-500/50' 
                    : s < step 
                      ? 'w-3.5 bg-emerald-400' 
                      : 'w-3.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mb-6">
          <span className="text-[11px] font-semibold text-orange-400 uppercase tracking-widest block mb-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            Step {step} of 3
          </span>
          <h2 className="text-2xl font-semibold text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            {step === 1 && 'Create Your Credentials'}
            {step === 2 && 'Hostel & Room Details'}
            {step === 3 && 'Dietary Preferences'}
          </h2>
          <p className="text-xs text-slate-100 font-medium mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {step === 1 && 'Provide your name and college credentials.'}
            {step === 2 && 'Fill out your active department and room coordinates.'}
            {step === 3 && 'Configure mess selection and dietary requirements.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-600 border border-rose-400 text-white text-xs text-center font-semibold shadow-lg">
            {error}
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          
          {/* STEP 1: Basic credentials */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              

              <div>
                <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-4 h-4 text-orange-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/75 border border-white/40 text-white placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/50 text-sm font-semibold transition-all shadow-inner"
                    placeholder="Enter your name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Roll Number</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-4 h-4 text-orange-400" />
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/75 border border-white/40 text-white placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/50 text-sm font-semibold transition-all shadow-inner"
                    placeholder="Enter your roll.no (7 digit)"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-4 h-4 text-orange-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/75 border border-white/40 text-white placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/50 text-sm font-semibold transition-all shadow-inner"
                    placeholder="enter your email i'd"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-4 h-4 text-orange-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/75 border border-white/40 text-white placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/50 text-sm font-semibold transition-all shadow-inner"
                    placeholder="new password"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-4 h-4 text-orange-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/75 border border-white/40 text-white placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/50 text-sm font-semibold transition-all shadow-inner"
                    placeholder="confirm passwords"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Hostel Coordinates */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              {verificationMessage && studentType === 'HOSTELER' && (
                <div className={`p-3.5 rounded-xl border text-xs font-semibold leading-normal shadow-lg ${
                  isVerifiedHosteller
                    ? 'bg-emerald-600 border-emerald-400 text-white'
                    : 'bg-orange-600 border-orange-400 text-white'
                }`}>
                  {verificationMessage}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Department</label>
                  <div className="relative">
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full pl-4 pr-10 py-3.5 rounded-xl bg-black/80 border border-white/40 text-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/50 text-sm font-semibold appearance-none cursor-pointer shadow-inner"
                    >
                      <option value="CSE" className="bg-slate-950 text-white font-semibold">CSE</option>
                      <option value="AIML" className="bg-slate-950 text-white font-semibold">AIML</option>
                      <option value="Data Science (D.S)" className="bg-slate-950 text-white font-semibold">Data Science (D.S)</option>
                      <option value="Cyber Security" className="bg-slate-950 text-white font-semibold">Cyber Security</option>
                      <option value="Information Tech" className="bg-slate-950 text-white font-semibold">Information Tech</option>
                      <option value="Electronics" className="bg-slate-950 text-white font-semibold">Electronics</option>
                      <option value="Electrical" className="bg-slate-950 text-white font-semibold">Electrical</option>
                      <option value="Mechanical" className="bg-slate-950 text-white font-semibold">Mechanical</option>
                      <option value="Civil" className="bg-slate-950 text-white font-semibold">Civil</option>
                      <option value="Chemical" className="bg-slate-950 text-white font-semibold">Chemical</option>
                      <option value="Metallurgy" className="bg-slate-950 text-white font-semibold">Metallurgy</option>
                      <option value="Bio-Technology" className="bg-slate-950 text-white font-semibold">Bio-Technology</option>
                      <option value="Business Administration" className="bg-slate-950 text-white font-semibold">Business Administration</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-4 w-4 h-4 text-orange-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Academic Year</label>
                  <div className="relative">
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full pl-4 pr-10 py-3.5 rounded-xl bg-black/80 border border-white/40 text-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/50 text-sm font-semibold appearance-none cursor-pointer shadow-inner"
                    >
                      <option value="1st Year" className="bg-slate-950 text-white font-semibold">1st Year</option>
                      <option value="2nd Year" className="bg-slate-950 text-white font-semibold">2nd Year</option>
                      <option value="3rd Year" className="bg-slate-950 text-white font-semibold">3rd Year</option>
                      <option value="4th Year" className="bg-slate-950 text-white font-semibold">4th Year</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-4 w-4 h-4 text-orange-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {studentType === 'HOSTELER' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Hostel Name</label>
                    <div className="relative">
                      <select
                        value={hostel}
                        onChange={(e) => setHostel(e.target.value)}
                        className="w-full pl-4 pr-10 py-3.5 rounded-xl bg-black/80 border border-white/40 text-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/50 text-sm font-semibold appearance-none cursor-pointer shadow-inner"
                      >
                        {Array.from({ length: 17 }, (_, i) => `BH ${String(i + 1).padStart(2, '0')}`).map((name) => (
                          <option key={name} value={name} className="bg-slate-950 text-white font-semibold">{name}</option>
                        ))}
                        {Array.from({ length: 10 }, (_, i) => `GH ${String(i + 1).padStart(2, '0')}`).map((name) => (
                          <option key={name} value={name} className="bg-slate-950 text-white font-semibold">{name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-4 w-4 h-4 text-orange-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Room Number</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-orange-400" />
                      <input
                        type="text"
                        value={roomNumber}
                        onChange={(e) => setRoomNumber(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/75 border border-white/40 text-white placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/50 text-sm font-semibold transition-all shadow-inner"
                        placeholder="Room 304"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Your Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-3.5 w-4 h-4 text-orange-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/75 border border-white/40 text-white placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/50 text-sm font-semibold transition-all shadow-inner"
                    placeholder="9999999991"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Culinary preference */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  Mess Association
                </label>
                <div className="relative">
                  <select
                    value={mess}
                    onChange={(e) => setMess(e.target.value)}
                    className="w-full pl-4 pr-10 py-3.5 rounded-xl bg-black/80 border border-white/40 text-white focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/50 text-sm font-semibold appearance-none cursor-pointer shadow-inner"
                  >
                    <option value="South Block Mess" className="bg-slate-950 text-white font-semibold">South Block Mess</option>
                    <option value="Main 1st Floor" className="bg-slate-950 text-white font-semibold">Main 1st Floor</option>
                    <option value="Main 2nd Floor" className="bg-slate-950 text-white font-semibold">Main 2nd Floor</option>
                    <option value="Main 3rd Floor" className="bg-slate-950 text-white font-semibold">Main 3rd Floor</option>
                    <option value="Girl's Campus" className="bg-slate-950 text-white font-semibold">Girl's Campus</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-4 w-4 h-4 text-orange-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  Culinary Preference
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFoodPreference('Veg')}
                    className={`p-4 rounded-xl border font-semibold flex flex-col items-center gap-2 transition-all cursor-pointer shadow-md ${
                      foodPreference === 'Veg'
                        ? 'border-emerald-400 bg-emerald-600/70 text-white shadow-emerald-950/50'
                        : 'border-white/40 bg-black/75 text-white hover:border-white/60'
                    }`}
                  >
                    <span className="text-2xl">🥗</span>
                    Vegetarian
                  </button>
                  <button
                    type="button"
                    onClick={() => setFoodPreference('Non-Veg')}
                    className={`p-4 rounded-xl border font-semibold flex flex-col items-center gap-2 transition-all cursor-pointer shadow-md ${
                      foodPreference === 'Non-Veg'
                        ? 'border-orange-400 bg-orange-600/70 text-white shadow-orange-950/50'
                        : 'border-white/40 bg-black/75 text-white hover:border-white/60'
                    }`}
                  >
                    <span className="text-2xl">🍗</span>
                    Non-Vegetarian
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Allergies (Optional)</label>
                <div className="relative">
                  <HeartPulse className="absolute left-4 top-3.5 w-4 h-4 text-orange-400" />
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-black/75 border border-white/40 text-white placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/50 text-sm font-semibold transition-all shadow-inner"
                    placeholder="e.g. Peanuts, Gluten"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Medical Notes (Optional)</label>
                <textarea
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-black/75 border border-white/40 text-white placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/50 text-sm font-semibold transition-all shadow-inner"
                  placeholder="Any medical condition or critical dining instruction..."
                  rows={2}
                />
              </div>

              <div className="p-4 bg-orange-600/40 border border-orange-400/60 rounded-2xl flex gap-3 text-xs text-white font-semibold leading-relaxed shadow-md">
                <Sparkles className="w-5 h-5 shrink-0 text-orange-400" />
                <span>By finalizing, you register {mess} and configure automatic entry/exit SMS reporting.</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-8 pt-4 border-t border-white/20">
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-xl shadow-orange-950/70 active:scale-[0.98] cursor-pointer text-sm uppercase tracking-wider border border-orange-400/30"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRegister}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-950/70 active:scale-[0.98] disabled:opacity-50 cursor-pointer text-sm uppercase tracking-wider border border-emerald-400/30"
              >
                {loading ? 'Creating account...' : 'Complete Registration'}
                {!loading && <Check className="w-4 h-4" />}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};

export default Signup;
