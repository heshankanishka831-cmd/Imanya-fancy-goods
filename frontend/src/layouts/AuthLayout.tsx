import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Package } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-slate-50">
      <div className="w-full max-w-md">
        {/* Brand Header with Official Logo */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex flex-col items-center gap-2.5 text-slate-900 group">
            <img
              src="/logo.png"
              alt="Imanya Fancy Goods Logo"
              className="h-20 w-20 object-contain rounded-full bg-white shadow-md group-hover:scale-105 transition-transform"
            />
            <span className="text-2xl font-black tracking-tight text-[#2C6291]">
              IMANYA FANCY GOODS
            </span>
          </Link>
          <p className="text-xs text-slate-500 font-medium mt-1">Direct Imports & Distribution Portal</p>
        </div>

        {/* Auth Body */}
        <div className="bg-white rounded-3xl p-8 shadow-xs border border-slate-200">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
