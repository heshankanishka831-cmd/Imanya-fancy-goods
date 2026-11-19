import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AlertCircle, ShoppingBag } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { registerCustomer } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    businessName: '',
    phone: '',
    username: '',
    email: '',
    address: '',
    password: '',
    confirmPassword: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      await registerCustomer({
        first_name: formData.firstName,
        last_name: formData.lastName,
        business_name: formData.businessName,
        phone: formData.phone,
        username: formData.username,
        email: formData.email,
        address: formData.address,
        password: formData.password,
      });

      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed. Please check your details and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
          <ShoppingBag className="h-5 w-5" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Wholesale Customer Registration</h3>
        <p className="text-xs text-gray-500 mt-0.5">Register for commercial pricing and instant WhatsApp ordering</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name *"
            required
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="Sunil"
          />
          <Input
            label="Last Name *"
            required
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Perera"
          />
        </div>

        <Input
          label="Shop / Business Name (Wholesale)"
          value={formData.businessName}
          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
          placeholder="e.g. Perera Fancy Store"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Phone / WhatsApp *"
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="0771234567"
          />
          <Input
            label="Username *"
            required
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="sunilfancy"
          />
        </div>

        <Input
          label="Email Address *"
          type="email"
          required
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="sunil@example.com"
        />

        <Input
          label="Delivery Address / City"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="No. 45, Main Street, Colombo"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Password *"
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Min 6 chars"
          />
          <Input
            label="Confirm Password *"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            placeholder="Repeat password"
          />
        </div>

        <div className="pt-2">
          <Button type="submit" isLoading={isLoading} className="w-full">
            Create Customer Account
          </Button>
        </div>

        <div className="text-center pt-2 text-xs text-gray-500">
          Already registered?{' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
            Sign In here
          </Link>
        </div>
      </form>
    </div>
  );
};
