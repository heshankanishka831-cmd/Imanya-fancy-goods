import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Button } from '../../components/ui/Button';
import {
  AlertCircle,
  LogIn,
  Eye,
  EyeOff,
  HelpCircle,
  X,
  Phone,
  Mail,
  ShieldCheck,
  User,
  Lock,
} from 'lucide-react';

const REMEMBER_KEY = 'imanya_remember_login';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  // Initialize from ?email= (post-verification redirect) or Remembered identifier
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setIdentifier(emailParam);
      return;
    }
    const savedIdentifier = localStorage.getItem(REMEMBER_KEY);
    if (savedIdentifier) {
      setIdentifier(savedIdentifier);
      setRememberMe(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const cleanIdentifier = identifier.trim();
      const loggedUser = await login(cleanIdentifier, password);

      // Persist or clear Remember Me
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, cleanIdentifier);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      // Role-based navigation based exclusively on verified database role
      if (loggedUser.role_name === 'Customer') {
        navigate('/customer/dashboard');
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

  return (
    <div>
      {/* Brand Header */}
      <div className="mb-6 text-center">
        <div className="h-12 w-12 rounded-2xl bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center mx-auto mb-3 shadow-inner">
          <LogIn className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Sign In to Your Account</h3>
        <p className="text-xs text-gray-500 mt-1">
          Unified Access for Customers and Management Team
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Single Unified Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username or Email Input */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Email or Username *
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. buyer@imanya.local or username"
              autoComplete="username"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C6291] focus:border-transparent transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Password Input with Show / Hide Toggle */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
            Password *
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2C6291] focus:border-transparent transition-all shadow-xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 rounded-md transition-colors"
              title={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Remember Me & Forgot Password Link */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-gray-600 hover:text-gray-900 font-medium">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#2C6291] focus:ring-[#2C6291] transition-all"
            />
            <span>Remember Me</span>
          </label>

          <button
            type="button"
            onClick={() => setShowForgotHelp(true)}
            className="text-[#2C6291] hover:text-[#235077] font-semibold transition-colors"
          >
            Forgot Password?
          </button>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          isLoading={isLoading}
          className="w-full mt-2 py-2.5 bg-[#2C6291] hover:bg-[#235077] text-white font-bold rounded-xl shadow-xs"
        >
          Sign In
        </Button>
      </form>

      {/* Forgot Password Helper Popover / Box */}
      {showForgotHelp && (
        <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between font-bold text-slate-900">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-[#2C6291]" />
              <span>Need Help Resetting Password?</span>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotHelp(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            For security, customer and staff password resets are managed directly by administration.
            Please reach out with your registered email or username:
          </p>
          <div className="flex flex-col gap-1 pt-1 text-[11px]">
            <span className="flex items-center gap-2 text-slate-800 font-semibold">
              <Phone className="h-3.5 w-3.5 text-[#9AC640]" />
              WhatsApp / Hotline: +94 76 661 1606
            </span>
            <span className="flex items-center gap-2 text-slate-800 font-semibold">
              <Mail className="h-3.5 w-3.5 text-[#2C6291]" />
              Official Email: support@imanya.local
            </span>
          </div>
        </div>
      )}

      {/* Customer Registration Callout */}
      <div className="mt-6 pt-5 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-500">
          New to Imanya Fancy Goods?{' '}
          <Link
            to="/register"
            className="text-[#2C6291] hover:text-[#235077] font-bold ml-1 transition-colors"
          >
            Create Customer Account
          </Link>
        </p>
      </div>
    </div>
  );
};
