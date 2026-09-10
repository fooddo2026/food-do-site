import React, { useState, useEffect } from 'react';
import { Ticket, QrCode, RefreshCw, ShoppingCart, Clock, CheckCircle } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { QRCodeSVG } from 'qrcode.react';

interface SurplusTokensProps {
  isDark: boolean;
}

const SurplusTokens: React.FC<SurplusTokensProps> = ({ isDark }) => {
  const [availableTokens, setAvailableTokens] = useState<any[]>([]);
  const [myTokens, setMyTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTokenQR, setActiveTokenQR] = useState<string | null>(null);

  // Payment Flow State
  const [paymentModalData, setPaymentModalData] = useState<{ mealType: string, date: string, price: number } | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [availRes, myRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/meals/surplus/available`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/api/meals/surplus/my-tokens`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (availRes.ok) setAvailableTokens(await availRes.json());
      if (myRes.ok) setMyTokens(await myRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const initiatePayment = (mealType: string, date: string, price: number) => {
    setPaymentModalData({ mealType, date, price });
    setPaymentSuccess(false);
  };

  const processPayment = () => {
    setIsProcessingPayment(true);
    // Simulate payment gateway delay (1.5 seconds)
    setTimeout(() => {
      setIsProcessingPayment(false);
      setPaymentSuccess(true);
      
      // Auto-claim after success (1 second)
      setTimeout(() => {
        const data = paymentModalData;
        setPaymentModalData(null);
        if (data) handleClaim(data.mealType, data.date);
      }, 1000);
      
    }, 1500);
  };

  const handleClaim = async (mealType: string, date: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/meals/surplus/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mealType, date })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Token claimed successfully!');
        fetchData();
      } else {
        setMessage(data.error || 'Failed to claim token');
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.warn('Backend API unreachable, simulating token claim locally...');
      try {
        const storedTokensStr = localStorage.getItem('food_do_surplus_tokens');
        if (storedTokensStr) {
          const allTokens = JSON.parse(storedTokensStr);
          const userStr = localStorage.getItem('user');
          const user = userStr ? JSON.parse(userStr) : null;
          
          const tokenIndex = allTokens.findIndex((t: any) => t.mealType === mealType && t.status === 'AVAILABLE');
          
          if (tokenIndex !== -1) {
            allTokens[tokenIndex].status = 'CLAIMED';
            allTokens[tokenIndex].studentId = user?.id || 'guest';
            allTokens[tokenIndex].claimedAt = new Date().toISOString();
            
            localStorage.setItem('food_do_surplus_tokens', JSON.stringify(allTokens));
            setMessage('Token claimed successfully!');
            fetchData();
          } else {
            setMessage('No tokens available.');
          }
        }
      } catch (e) {
        setMessage('Network Error');
      }
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const getActiveTokens = () => myTokens.filter(t => t.status === 'CLAIMED');
  const getUsedTokens = () => myTokens.filter(t => t.status === 'USED');

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div>
        <h3 className="text-lg font-semibold">Surplus Food Tokens</h3>
        <p className="text-xs text-gray-400 mt-0.5">Claim surplus food from the mess at subsidized rates.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs font-bold text-center border ${message.includes('success') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
          {message}
        </div>
      )}

      {/* MOCK PAYMENT MODAL */}
      {paymentModalData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className={`rounded-3xl w-full max-w-sm p-6 shadow-2xl relative border ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-gray-100'}`}>
            
            {paymentSuccess ? (
              <div className="text-center py-6 animate-in zoom-in duration-300">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h3>
                <p className="text-xs text-gray-500 font-medium">₹{paymentModalData.price} paid for {paymentModalData.mealType} Token.</p>
                <p className="text-[10px] text-gray-400 mt-4 animate-pulse">Generating your QR code...</p>
              </div>
            ) : (
              <>
                {/* Razorpay Header Style */}
                <div className="bg-[#02042b] -mx-6 -mt-6 p-6 rounded-t-3xl flex justify-between items-center mb-6 border-b border-white/10 shadow-md relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                   <div>
                     <h3 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                       <span className="w-5 h-5 rounded bg-blue-600 inline-block shrink-0"></span> Razorpay
                     </h3>
                     <p className="text-[10px] text-blue-200 uppercase tracking-widest mt-1 opacity-80">Test Environment</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] text-blue-200 uppercase tracking-widest mb-0.5 opacity-80">Amount</p>
                     <p className="text-2xl font-black text-white">₹{paymentModalData.price}</p>
                   </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-gray-500 text-center mb-2 font-medium">Select Payment Method for {paymentModalData.mealType} Token</p>
                  
                  {/* Payment Options */}
                  <button 
                    onClick={processPayment}
                    disabled={isProcessingPayment}
                    className="w-full p-4 border border-gray-200 dark:border-white/10 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer flex items-center justify-between group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600">UPI</p>
                        <p className="text-[10px] text-gray-500">Google Pay, PhonePe, Paytm</p>
                      </div>
                    </div>
                    <span className="text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity text-xs">PAY</span>
                  </button>

                  <button 
                    onClick={processPayment}
                    disabled={isProcessingPayment}
                    className="w-full p-4 border border-gray-200 dark:border-white/10 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer flex items-center justify-between group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600">Card</p>
                        <p className="text-[10px] text-gray-500">Visa, MasterCard, RuPay</p>
                      </div>
                    </div>
                    <span className="text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity text-xs">PAY</span>
                  </button>

                  {isProcessingPayment && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-3xl">
                       <div className="flex flex-col items-center">
                         <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                         <p className="text-sm font-bold text-gray-900 dark:text-white">Processing Payment...</p>
                         <p className="text-[10px] text-gray-500 mt-1 animate-pulse">Do not close this window</p>
                       </div>
                    </div>
                  )}

                  <button 
                    onClick={() => !isProcessingPayment && setPaymentModalData(null)}
                    disabled={isProcessingPayment}
                    className="w-full py-3 mt-4 text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-red-500 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    Cancel Payment
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Buy Token Component */}
        <div className={`p-6 rounded-3xl border flex flex-col ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-sm font-semibold text-orange-500 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Available Tokens Today
            </h4>
            <button onClick={fetchData} className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-all cursor-pointer">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <div className="space-y-4 flex-1">
            {availableTokens.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-xs text-gray-500">No surplus tokens released yet today.</p>
                <p className="text-[10px] text-gray-400 mt-2">Tokens are usually released after the main serving time ends if there is leftover food.</p>
              </div>
            ) : (
              // Group by mealType
              Object.entries(availableTokens.reduce((acc, token) => {
                const key = `${token.mealType}_${token.date}`;
                if (!acc[key]) acc[key] = { ...token, count: 0 };
                acc[key].count++;
                return acc;
              }, {} as Record<string, any>)).map(([key, tokenData]: any) => (
                <div key={key} className={`p-4 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                  <div>
                    <h5 className="font-bold text-sm">{tokenData.mealType} Token</h5>
                    <p className="text-[10px] text-gray-400 font-semibold mt-0.5">₹{tokenData.price} • {tokenData.count} Available</p>
                  </div>
                  <button 
                    onClick={() => initiatePayment(tokenData.mealType, tokenData.date, tokenData.price)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-md text-xs cursor-pointer active:scale-95"
                  >
                    Buy (₹{tokenData.price})
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* My Tokens Component */}
        <div className={`p-6 rounded-3xl border flex flex-col ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
          <h4 className="text-sm font-semibold mb-6 text-emerald-500 flex items-center gap-2">
            <Ticket className="w-4 h-4" /> My Active Tokens
          </h4>
          
          <div className="space-y-4 flex-1">
            {getActiveTokens().length === 0 ? (
              <div className="text-center py-10">
                <p className="text-xs text-gray-500">You don't have any active tokens.</p>
              </div>
            ) : (
              getActiveTokens().map(token => (
                <div key={token.id} className={`p-4 rounded-2xl border ${isDark ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[8px] bg-emerald-500/20 text-emerald-800 font-bold uppercase tracking-wider border border-emerald-500/30">READY TO USE</span>
                      <h5 className="font-bold text-sm mt-1">{token.mealType} Token</h5>
                    </div>
                    <span className={`text-xs font-mono font-black px-2.5 py-1 rounded-md shadow-sm ${isDark ? 'bg-emerald-900 text-emerald-100 border border-emerald-700' : 'bg-emerald-600 text-white border border-emerald-700'}`}>Paid ₹{token.price}</span>
                  </div>
                  
                  {activeTokenQR === token.id ? (
                    <div className="bg-white p-4 rounded-xl flex flex-col items-center shadow-inner">
                      <QRCodeSVG value={`TOKEN:${token.id}`} size={140} />
                      <button 
                        onClick={() => setActiveTokenQR(null)}
                        className="mt-4 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-[10px] text-gray-600 font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Hide QR Code
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setActiveTokenQR(token.id)}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold transition-all text-xs cursor-pointer flex items-center justify-center gap-2 shadow-sm active:scale-95"
                    >
                      <QrCode className="w-4 h-4" /> Show QR to Scanner
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Used Tokens History */}
      {getUsedTokens().length > 0 && (
        <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
          <h4 className="text-sm font-semibold mb-4 text-gray-500 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Token History
          </h4>
          <div className="space-y-3">
            {getUsedTokens().slice(0, 5).map(token => (
              <div key={token.id} className={`p-3 rounded-2xl flex justify-between items-center text-xs ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div>
                  <span className="font-bold">{token.mealType} Token</span>
                  <span className="text-gray-400 ml-2">{new Date(token.usedAt || token.date).toLocaleDateString()}</span>
                </div>
                <span className="px-2 py-1 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold">USED</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SurplusTokens;

