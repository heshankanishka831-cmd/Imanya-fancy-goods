import React from 'react';
import { LogOut, User as UserIcon, Menu } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  onToggleSidebar?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ title, subtitle, onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 px-4 sm:px-6 flex items-center justify-between shadow-xs shrink-0 z-30 print:hidden">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Toggle Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
          {subtitle && <p className="text-[11px] text-gray-500 hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* User Identity Profile */}
        <div className="flex items-center gap-2.5 text-right">
          <div className="hidden sm:block">
            <p className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight">
              {user?.first_name} {user?.last_name}
            </p>
            <span className="inline-block text-[10px] font-bold text-[#2C6291] bg-[#EBF2F7] px-2 py-0.5 rounded-full border border-[#2C6291]/20 mt-0.5">
              {user?.role_name}
            </span>
          </div>
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center font-bold text-xs sm:text-sm shadow-2xs">
            {(user?.first_name || 'A')[0].toUpperCase()}
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
