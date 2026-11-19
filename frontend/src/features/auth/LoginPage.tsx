import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AlertCircle, Store, ShieldCheck, KeyRound, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab: 'customer' | 'admin'
  const initialTab = searchParams.get('tab') === 'admin' ? 'admin' : 'customer';
  const [activeTab, setActiveTab] = useState<'customer' | 'admin'>(initialTab);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'admin' || tabParam === 'customer') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const switchTab = (tab: 'customer' | 'admin') => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setError(null);
    setIdentifier('');
    setPassword('');
  };

  const handleFillAdmin = () => {
    setIdentifier('admin@wholesale.local');
    setPassword('Admin@123456');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const loggedUser = await login(identifier.trim(), password);
      if (loggedUser.role_name === 'Customer') {
        navigate('/');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ||
          'Invalid credentials. Please verify your email/username and password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Tab Switcher */}
      <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-2xl mb-6 border border-gray-200">
        <button
          type="button"
          onClick={() => switchTab('customer')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'customer'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Store className="h-4 w-4" />
          <span>Customer Login</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('admin')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'admin'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Staff / Admin</span>
        </button>
      </div>

      {/* Header Info */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">
          {activeTab === 'customer' ? 'Wholesale Customer Sign In' : 'Staff & Super Admin Sign In'}
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {activeTab === 'customer'
            ? 'Sign in with your registered username or email to place wholesale WhatsApp orders.'
            : 'Access the admin dashboard to manage products, staff permissions, stock, and PDF reports.'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label={activeTab === 'customer' ? 'Email Address or Username *' : 'Staff Email Address *'}
            type="text"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={
              activeTab === 'customer'
                ? 'e.g. sunilfancy or customer@example.com'
                : 'admin@wholesale.local'
            }
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

        <Button type="submit" isLoading={isLoading} className="w-full mt-2">
          {activeTab === 'customer' ? 'Sign In as Wholesale Customer' : 'Sign In to Admin Portal'}
        </Button>
      </form>

      {/* Wholesale Customer Help / Register Link */}
      {activeTab === 'customer' ? (
        <div className="mt-6 pt-5 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-600 mb-2">Don't have a wholesale account yet?</p>
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            <span>Register New Wholesale Customer Account</span>
          </Link>
        </div>
      ) : (
        /* Staff / Super Admin Quick Autofill */
        <div className="mt-6 pt-5 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Default Super Admin
            </span>
            <button
              type="button"
              onClick={handleFillAdmin}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
            >
              <KeyRound className="h-3 w-3" />
              <span>1-Click Auto-Fill</span>
            </button>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70 text-xs text-slate-700 font-mono">
            <p><span className="text-slate-400">Email:</span> admin@wholesale.local</p>
            <p><span className="text-slate-400">Pass:</span> Admin@123456</p>
          </div>
        </div>
      )}
    </div>
  );
};
