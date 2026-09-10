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
    <div className="min-h-screen flex items-center justify-center bg-radial from-gray-900 via-gray-950 to-black relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl relative z-10 mx-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white mb-6 group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        <div className="inline-flex p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-4 text-orange-500">
          <KeyRound className="w-6 h-6" />
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight mb-2">Enter OTP Code</h2>
        <p className="text-xs text-gray-400 mb-6 leading-relaxed">
          We've sent a 6-digit OTP code to <strong className="text-slate-200">{email}</strong>. Enter it below to proceed.
        </p>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-bold">
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
                className="w-12 h-14 text-center text-xl font-bold bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || otp.join('').length < 6}
            className="w-full py-3.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-[0.98] disabled:opacity-40 cursor-pointer text-sm"
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs">
          <span className="text-gray-400">Didn't receive the code? </span>
          {timer > 0 ? (
            <span className="text-orange-500 font-bold">Resend in {timer}s</span>
          ) : (
            <button
              onClick={handleResend}
              className="text-orange-500 font-bold hover:underline cursor-pointer"
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
