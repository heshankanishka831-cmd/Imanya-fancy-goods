import React from 'react';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useNavigate } from 'react-router-dom';

export const AdminHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 px-6 flex items-center justify-between shadow-xs">
      <div>
        <h2 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* User Identity Profile */}
        <div className="flex items-center gap-2.5 text-right">
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900 leading-tight">
              {user?.first_name} {user?.last_name}
            </p>
            <span className="inline-block text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              {user?.role_name}
            </span>
          </div>
          <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <UserIcon className="h-5 w-5" />
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
