import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Menus from './pages/Menus';
import Leaves from './pages/Leaves';
import Feedback from './pages/Feedback';

// Authentication Deck Pages
import Welcome from './pages/auth/Welcome';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import OtpVerify from './pages/auth/OtpVerify';
import ResetPassword from './pages/auth/ResetPassword';

import Preloader from './components/Preloader';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Authentication Onboarding Screen Router
  const [authScreen, setAuthScreen] = useState<'welcome' | 'login' | 'forgot' | 'otp' | 'reset'>('welcome');
  const [recoveryEmail, setRecoveryEmail] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.role?.toUpperCase() !== 'STUDENT') {
          setIsAuthenticated(true);
          setUser(parsed);
        } else {
          // Clear student sessions from admin-portal
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleLoginSuccess = (token: string, userData: { id: string; email: string; role: string }) => {
    if (userData.role?.toUpperCase() === 'STUDENT') {
      alert('This portal is for Admins and Staff only. Please use the Student Portal.');
      return;
    }
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    setAuthScreen('welcome');
  };

  if (loading) {
    return <Preloader onComplete={() => setLoading(false)} minDurationMs={2000} />;
  }


  if (!isAuthenticated) {
    if (authScreen === 'welcome') {
      return <Welcome onNavigate={(screen) => setAuthScreen(screen as any)} />;
    }
    if (authScreen === 'login') {
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onNavigateToSignup={() => {}} // No self-signup for admin portal
          onForgotPassword={() => setAuthScreen('forgot')}
        />
      );
    }
    if (authScreen === 'forgot') {
      return (
        <ForgotPassword
          onBack={() => setAuthScreen('login')}
          onSuccess={(email) => {
            setRecoveryEmail(email);
            setAuthScreen('otp');
          }}
        />
      );
    }
    if (authScreen === 'otp') {
      return (
        <OtpVerify
          email={recoveryEmail}
          onBack={() => setAuthScreen('forgot')}
          onSuccess={() => setAuthScreen('reset')}
        />
      );
    }
    if (authScreen === 'reset') {
      return <ResetPassword onSuccess={() => setAuthScreen('login')} />;
    }
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-50 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:flex-shrink-0 h-full">
          <Sidebar onLogout={handleLogout} userRole={user?.role} />
        </div>

        {/* Mobile Sidebar Overlay Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Drawer Content */}
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl">
              <Sidebar 
                onLogout={handleLogout} 
                userRole={user?.role} 
                onClose={() => setIsMobileMenuOpen(false)} 
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          {/* Mobile Navigation Header */}
          <header className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-30">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 text-gray-500 hover:text-gray-905 focus:outline-none hover:bg-gray-50 rounded-xl"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-lg font-extrabold text-primary">FOOD-DO Admin</span>
            <div className="w-9 h-9" /> {/* Spacer to center title */}
          </header>

          <main className="flex-1 overflow-y-auto w-full">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/users" element={<Users />} />
              <Route path="/menus" element={<Menus />} />
              <Route path="/leaves" element={<Leaves />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
