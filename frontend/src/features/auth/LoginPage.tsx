import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@wholesale.local');
  const [password, setPassword] = useState('Admin@123456');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const loggedUser = await login(email, password);
      if (loggedUser.role_name === 'Customer') {
        navigate('/');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-1">Sign In to Your Account</h3>
      <p className="text-xs text-gray-500 mb-6">Staff Management & Wholesale Customer Portal</p>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@wholesale.local or your email"
          />
        </div>

        <div>
          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" isLoading={isLoading} className="w-full mt-2">
          Sign In
        </Button>
      </form>

      {/* Customer Registration Link */}
      <div className="mt-5 text-center text-xs text-gray-500">
        New wholesale customer?{' '}
        <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
          Register Customer Account
        </Link>
      </div>

      {/* Default Admin Seed Notice */}
      <div className="mt-6 pt-5 border-t border-gray-100 text-center">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
          Default Super Administrator Login
        </span>
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-xs text-slate-600 font-mono text-left">
          <p><span className="text-slate-400">Email:</span> admin@wholesale.local</p>
          <p><span className="text-slate-400">Pass:</span> Admin@123456</p>
        </div>
      </div>
    </div>
  );
};
