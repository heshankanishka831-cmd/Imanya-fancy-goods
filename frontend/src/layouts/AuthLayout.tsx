import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Package } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-slate-900">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 text-white mb-2">
            <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Package className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Imanya Fancy Goods</span>
          </Link>
          <p className="text-sm text-slate-400">Wholesale Customer & Management Portal</p>
        </div>

        {/* Auth Body */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
