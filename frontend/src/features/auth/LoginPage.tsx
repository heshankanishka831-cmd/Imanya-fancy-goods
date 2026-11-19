import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AlertCircle, LogIn, KeyRound, UserCheck, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const loggedUser = await login(identifier.trim(), password);
      // Automatic role-based routing:
      // Customers go to the Wholesale Storefront; Staff and Super Admins go to the Management Dashboard
      if (loggedUser.role_name === 'Customer') {
        navigate('/');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          'Invalid username/email or password. Please verify your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fillAdmin = () => {
    setIdentifier('admin@wholesale.local');
    setPassword('Admin@123456');
    setError(null);
  };

  const fillCustomer = () => {
    setIdentifier('sunilfancy');
    setPassword('Customer@123');
    setError(null);
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <LogIn className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Sign In to Your Account</h3>
        <p className="text-xs text-gray-500 mt-1">
          Wholesale Customers & Management Staff Portal
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Single Unified Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="Username or Email Address *"
            type="text"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g. sunilfancy or admin@wholesale.local"
          />
        </div>

        <div>
          <Input
            label="Password *"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" isLoading={isLoading} className="w-full mt-2 py-2.5">
          Sign In
        </Button>
      </form>

      {/* Register Customer Link */}
      <div className="mt-6 pt-5 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-500">
          New wholesale customer?{' '}
          <Link to="/register" className="text-blue-600 hover:text-blue-700 font-bold ml-1">
            Register Wholesale Account
          </Link>
        </p>
      </div>

      {/* Quick Testing Shortcuts */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block text-center mb-2">
          Quick 1-Click Test Logins
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={fillAdmin}
            className="flex items-center justify-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
            <span>Super Admin</span>
          </button>
          <button
            type="button"
            onClick={fillCustomer}
            className="flex items-center justify-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 transition-colors"
          >
            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Sample Customer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
