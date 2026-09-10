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

      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/hosteller/${rollNumber}`);
        if (response.ok) {
          const data = await response.json();
          setFullName(data.name);
          setHostel(data.hostelName);
          setRoomNumber(data.roomNumber);
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
      setStep(2);
    } else if (step === 2) {
      if (!department || !year || !hostel || !roomNumber || !phone) {
        setError('All fields are required');
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
          hostelName: hostel,
          roomNumber,
          foodPreference,
          mess,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Save to localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setLoading(false);
      onSignupSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check network.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-gray-900 via-gray-950 to-black relative overflow-hidden font-sans text-white">
      <div className="absolute top-[-25%] left-[-25%] w-[80%] h-[80%] bg-orange-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-lg p-8 md:p-10 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl relative z-10 mx-4">
        
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={step === 1 ? onBack : prevStep}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            {step === 1 ? 'Back to Login' : 'Back'}
          </button>
          
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step 
                    ? 'w-6 bg-orange-500' 
                    : s < step 
                      ? 'w-3 bg-emerald-500' 
                      : 'w-3 bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mb-6">
          <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest block mb-1">
            Step {step} of 3
          </span>
          <h2 className="text-2xl font-black tracking-tight">
            {step === 1 && 'Create Your Credentials'}
            {step === 2 && 'Hostel & Room details'}
            {step === 3 && 'Dietary Preferences'}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {step === 1 && 'Provide your name and college credentials.'}
            {step === 2 && 'Fill out your active department and room coordinates.'}
            {step === 3 && 'Let us know if you require special culinary preferences.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-bold">
            {error}
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          
          {/* STEP 1: Basic credentials */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 text-sm"
                    placeholder="Enter your name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Roll Number</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 text-sm"
                    placeholder="Enter your roll.no (7 digit)"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 text-sm"
                    placeholder="enter your email i'd"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 text-sm"
                    placeholder="new password"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 text-sm"
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
              {verificationMessage && (
                <div className={`p-3 rounded-xl border text-xs font-semibold leading-normal ${
                  isVerifiedHosteller
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                }`}>
                  {verificationMessage}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Department</label>
                  <div className="relative">
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm font-bold appearance-none cursor-pointer hover:border-slate-500 transition-all shadow-inner"
                    >
                      <option value="CSE" className="bg-slate-900 text-white font-semibold">CSE</option>
                      <option value="AIML" className="bg-slate-900 text-white font-semibold">AIML</option>
                      <option value="Data Science (D.S)" className="bg-slate-900 text-white font-semibold">Data Science (D.S)</option>
                      <option value="Cyber Security" className="bg-slate-900 text-white font-semibold">Cyber Security</option>
                      <option value="Information Tech" className="bg-slate-900 text-white font-semibold">Information Tech</option>
                      <option value="Electronics" className="bg-slate-900 text-white font-semibold">Electronics</option>
                      <option value="Electrical" className="bg-slate-900 text-white font-semibold">Electrical</option>
                      <option value="Mechanical" className="bg-slate-900 text-white font-semibold">Mechanical</option>
                      <option value="Civil" className="bg-slate-900 text-white font-semibold">Civil</option>
                      <option value="Chemical" className="bg-slate-900 text-white font-semibold">Chemical</option>
                      <option value="Metallurgy" className="bg-slate-900 text-white font-semibold">Metallurgy</option>
                      <option value="Bio-Technology" className="bg-slate-900 text-white font-semibold">Bio-Technology</option>
                      <option value="Business Administration" className="bg-slate-900 text-white font-semibold">Business Administration</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-orange-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Academic Year</label>
                  <div className="relative">
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm font-bold appearance-none cursor-pointer hover:border-slate-500 transition-all shadow-inner"
                    >
                      <option value="1st Year" className="bg-slate-900 text-white font-semibold">1st Year</option>
                      <option value="2nd Year" className="bg-slate-900 text-white font-semibold">2nd Year</option>
                      <option value="3rd Year" className="bg-slate-900 text-white font-semibold">3rd Year</option>
                      <option value="4th Year" className="bg-slate-900 text-white font-semibold">4th Year</option>
                    </select>
                    <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-orange-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Hostel Name</label>
                  <div className="relative">
                    <select
                      value={hostel}
                      onChange={(e) => setHostel(e.target.value)}
                      className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm font-bold appearance-none cursor-pointer hover:border-slate-500 transition-all shadow-inner"
                    >
                      {Array.from({ length: 17 }, (_, i) => `BH ${String(i + 1).padStart(2, '0')}`).map((name) => (
                        <option key={name} value={name} className="bg-slate-900 text-white font-semibold">{name}</option>
                      ))}
                      {Array.from({ length: 10 }, (_, i) => `GH ${String(i + 1).padStart(2, '0')}`).map((name) => (
                        <option key={name} value={name} className="bg-slate-900 text-white font-semibold">{name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-orange-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Room Number</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 text-sm"
                      placeholder="Room 304"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Your Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 text-sm"
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
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  Mess Association
                </label>
                <div className="relative">
                  <select
                    value={mess}
                    onChange={(e) => setMess(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm font-bold appearance-none cursor-pointer hover:border-slate-500 transition-all shadow-inner"
                  >
                    <option value="South Block Mess" className="bg-slate-900 text-white font-semibold">South Block Mess</option>
                    <option value="Main 1st Floor" className="bg-slate-900 text-white font-semibold">Main 1st Floor</option>
                    <option value="Main 2nd Floor" className="bg-slate-900 text-white font-semibold">Main 2nd Floor</option>
                    <option value="Main 3rd Floor" className="bg-slate-900 text-white font-semibold">Main 3rd Floor</option>
                    <option value="Girl's Campus" className="bg-slate-900 text-white font-semibold">Girl's Campus</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-3.5 w-4 h-4 text-orange-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
                  Culinary Preference
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFoodPreference('Veg')}
                    className={`p-4 rounded-xl border font-bold flex flex-col items-center gap-2 transition-all cursor-pointer ${
                      foodPreference === 'Veg'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-white/10 bg-white/5 text-gray-405'
                    }`}
                  >
                    <span className="text-xl">🥗</span>
                    Vegetarian
                  </button>
                  <button
                    type="button"
                    onClick={() => setFoodPreference('Non-Veg')}
                    className={`p-4 rounded-xl border font-bold flex flex-col items-center gap-2 transition-all cursor-pointer ${
                      foodPreference === 'Non-Veg'
                        ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                        : 'border-white/10 bg-white/5 text-gray-405'
                    }`}
                  >
                    <span className="text-xl">🍗</span>
                    Non-Vegetarian
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Allergies (Optional)</label>
                <div className="relative">
                  <HeartPulse className="absolute left-4 top-3.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 text-sm"
                    placeholder="e.g. Peanuts, Gluten"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Medical Notes (Optional)</label>
                <textarea
                  value={medicalNotes}
                  onChange={(e) => setMedicalNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 text-sm"
                  placeholder="Any medical condition or critical dining instruction..."
                  rows={2}
                />
              </div>

              <div className="p-4 bg-orange-500/5 border border-orange-500/15 rounded-2xl flex gap-3 text-xs text-orange-400 font-medium leading-relaxed">
                <Sparkles className="w-5 h-5 shrink-0" />
                <span>By finalizing, you register {mess} for dining tracking.</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-8 pt-4 border-t border-white/5">
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="w-full py-3.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-orange-600/10 active:scale-[0.98] cursor-pointer text-sm"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRegister}
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-600/10 active:scale-[0.98] disabled:opacity-50 cursor-pointer text-sm"
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
