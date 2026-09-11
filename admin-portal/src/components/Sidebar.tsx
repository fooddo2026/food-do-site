import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  onLogout: () => void;
  userRole?: string;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout, userRole, onClose }) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const linkClass = (path: string) =>
    `block px-4 py-2.5 rounded-xl font-medium transition-all ${isActive(path)
      ? 'bg-orange-550/10 text-primary bg-orange-50'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  return (
    <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-full relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 md:hidden text-gray-400 hover:text-gray-600 p-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <div className="p-6 border-b border-gray-50">
        <h1 className="text-2xl font-extrabold text-primary tracking-tight">FOOD-DO</h1>
        <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-wider">
          {userRole} Portal
        </p>
      </div>
      <nav className="flex-1 px-4 space-y-1.5 mt-6">
        {userRole?.toUpperCase() === 'ADMIN' ? (
          <>
            <Link to="/" className={linkClass('/')} onClick={handleLinkClick}>
              Dashboard
            </Link>
            <Link to="/users" className={linkClass('/users')} onClick={handleLinkClick}>
              User Management
            </Link>
            <Link to="/leaves" className={linkClass('/leaves')} onClick={handleLinkClick}>
              Leave Requests
            </Link>
            <Link to="/menus" className={linkClass('/menus')} onClick={handleLinkClick}>
              Menu Management
            </Link>
            <Link to="/feedback" className={linkClass('/feedback')} onClick={handleLinkClick}>
              Meal Feedback
            </Link>
          </>
        ) : userRole?.toUpperCase() === 'STAFF' ? (
          <>
            <Link to="/menus" className={linkClass('/menus')} onClick={handleLinkClick}>
              View Menu
            </Link>
            <Link to="/feedback" className={linkClass('/feedback')} onClick={handleLinkClick}>
              Meal Feedback
            </Link>
          </>
        ) : (
          <>
            <Link to="/student" className={linkClass('/student')} onClick={handleLinkClick}>
              Student Portal
            </Link>
          </>
        )}
      </nav>
      <div className="p-4 border-t border-gray-50">
        <button
          onClick={onLogout}
          className="w-full px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all cursor-pointer text-center block"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
