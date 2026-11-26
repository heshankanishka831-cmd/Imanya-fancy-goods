import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user, hasRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xs border border-slate-200 p-8 text-center space-y-4 animate-in fade-in">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-xs">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Access Restricted</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your authenticated role (<strong className="text-slate-900">{user?.role_name || 'Customer'}</strong>) does not have permission to access the administrative management portal.
          </p>
          <div className="pt-2">
            <a
              href={user?.role_name === 'Customer' ? '/customer/dashboard' : '/'}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#2C6291] hover:bg-[#235077] rounded-xl transition-all shadow-xs"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to {user?.role_name === 'Customer' ? 'Customer Dashboard' : 'Storefront'}</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
