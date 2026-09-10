import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import StudentPortal from './pages/StudentPortal';

// Authentication Deck Pages
import Welcome from './pages/auth/Welcome';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import OtpVerify from './pages/auth/OtpVerify';
import ResetPassword from './pages/auth/ResetPassword';

import Preloader from './components/Preloader';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Authentication Onboarding Screen Router
  const [authScreen, setAuthScreen] = useState<'welcome' | 'login' | 'signup' | 'forgot' | 'otp' | 'reset'>('welcome');
  const [recoveryEmail, setRecoveryEmail] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed.role?.toUpperCase() === 'STUDENT') {
          setIsAuthenticated(true);
        } else {
          // Clear non-student sessions from student-portal
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleLoginSuccess = (token: string, userData: { id: string; email: string; role: string }) => {
    if (userData.role?.toUpperCase() !== 'STUDENT') {
      alert('This portal is for students only. Please use the Admin Portal.');
      return;
    }
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setAuthScreen('welcome');
  };

  if (loading) {
    return <Preloader onComplete={() => setLoading(false)} minDurationMs={2000} />;
  }



  if (!isAuthenticated) {
    if (authScreen === 'welcome') {
      return <Welcome onNavigate={(screen) => setAuthScreen(screen)} />;
    }
    if (authScreen === 'login') {
      return (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onNavigateToSignup={() => setAuthScreen('signup')}
          onForgotPassword={() => setAuthScreen('forgot')}
        />
      );
    }
    if (authScreen === 'signup') {
      return (
        <Signup
          onBack={() => setAuthScreen('welcome')}
          onSignupSuccess={handleLoginSuccess}
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
        <main className="flex-1 overflow-y-auto w-full">
          <Routes>
            <Route path="/student" element={<StudentPortal onLogout={handleLogout} />} />
            <Route path="/" element={<Navigate to="/student" replace />} />
            <Route path="*" element={<Navigate to="/student" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
