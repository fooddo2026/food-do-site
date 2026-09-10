import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, KeyRound } from 'lucide-react';

interface OtpVerifyProps {
  email: string;
  onBack: () => void;
  onSuccess: () => void;
}

const OtpVerify: React.FC<OtpVerifyProps> = ({ email, onBack, onSuccess }) => {
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(59);

  const inputs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    const countdown = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(countdown);
  }, []);

  const handleChange = (element: HTMLInputElement, index: number) => {
    const value = element.value.replace(/[^0-9]/g, '');
    if (!value) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Focus next input
    if (index < 5 && element.value) {
      inputs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);

      // Focus previous input
      if (index > 0) {
        inputs.current[index - 1].focus();
      }
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) return;

    setLoading(true);
    setError('');

    // Simulate OTP validation
    setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 1000);
  };

  const handleResend = () => {
    if (timer > 0) return;
    setTimer(59);
    setOtp(Array(6).fill(''));
    inputs.current[0].focus();
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative font-sans text-slate-100 overflow-hidden selection:bg-orange-500 selection:text-white">
      {/* 100% Full Unbroken Mess Photo Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat filter brightness-90 contrast-105 pointer-events-none"
        style={{ backgroundImage: "url('/images/hostel_mess_image.jpg')" }}
      />
      
      {/* Uniform Ultra-Soft Dark Tint */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {/* Seamless Radial Orange Warm Glow */}
      <div className="absolute w-[450px] h-[450px] bg-orange-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />

      <div className="w-full max-w-md p-8 md:p-10 rounded-3xl bg-black/40 backdrop-blur-md border border-white/25 border-t-2 border-t-orange-500/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 mx-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-orange-400 mb-6 group cursor-pointer transition-colors drop-shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 text-orange-400 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        <div className="inline-flex p-3.5 rounded-2xl bg-orange-500/25 border border-orange-400/40 mb-4 text-orange-400 shadow-md">
          <KeyRound className="w-7 h-7" />
        </div>

        <h2 className="text-2xl font-semibold text-white tracking-tight mb-2 drop-shadow-md">Enter OTP Code</h2>
        <p className="text-xs text-slate-100 mb-6 leading-relaxed font-bold drop-shadow-sm">
          We've sent a 6-digit verification code to <strong className="text-white font-semibold">{email}</strong>. Enter it below to proceed.
        </p>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-600/80 border border-rose-400 text-white text-xs text-center font-semibold shadow-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex gap-2.5 justify-between">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                type="text"
                maxLength={1}
                value={digit}
                ref={(el) => {
                  if (el) inputs.current[idx] = el;
                }}
                onChange={(e) => handleChange(e.target, idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className="w-12 h-14 text-center text-xl font-semibold bg-black/50 border border-white/30 text-white rounded-xl focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/40 shadow-md"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || otp.join('').length < 6}
            className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white rounded-xl font-semibold transition-all shadow-xl shadow-orange-950/60 active:scale-[0.98] disabled:opacity-40 cursor-pointer text-sm uppercase tracking-wider"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs">
          <span className="text-slate-100 font-bold drop-shadow-sm">Didn't receive the code? </span>
          {timer > 0 ? (
            <span className="text-orange-400 font-semibold drop-shadow-sm">Resend in {timer}s</span>
          ) : (
            <button
              onClick={handleResend}
              className="text-orange-400 font-semibold hover:underline cursor-pointer ml-1 drop-shadow-sm"
            >
              Resend Code
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtpVerify;
