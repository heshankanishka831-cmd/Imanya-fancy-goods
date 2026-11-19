import React, { createContext, useContext, useState } from 'react';
import { User } from '../../types';
import { authApi } from '../../services/endpoints';

export interface CustomerProfile {
  business_name?: string;
  phone?: string;
  address?: string;
}

interface AuthContextType {
  user: User | null;
  customerProfile: CustomerProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  registerCustomer: (data: {
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    password: string;
    phone: string;
    business_name?: string;
    address?: string;
  }) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(() => {
    const saved = localStorage.getItem('customerProfile');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });

  const login = async (email: string, password: string): Promise<User> => {
    const res = await authApi.login(email, password);
    if (res.success && res.data) {
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('token', res.data.token);

      const profile: CustomerProfile = {
        business_name: res.data.business_name,
        phone: res.data.phone,
        address: res.data.address,
      };
      setCustomerProfile(profile);
      localStorage.setItem('customerProfile', JSON.stringify(profile));
      return res.data.user;
    }
    throw new Error('Login failed');
  };

  const registerCustomer = async (data: {
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    password: string;
    phone: string;
    business_name?: string;
    address?: string;
  }) => {
    const res = await authApi.register(data);
    if (res.success && res.data) {
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('token', res.data.token);

      const profile: CustomerProfile = {
        business_name: res.data.business_name,
        phone: res.data.phone,
        address: res.data.address,
      };
      setCustomerProfile(profile);
      localStorage.setItem('customerProfile', JSON.stringify(profile));
    }
  };

  const logout = () => {
    setUser(null);
    setCustomerProfile(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('customerProfile');
    localStorage.removeItem('token');
  };

  const hasRole = (...roles: string[]): boolean => {
    if (!user) return false;
    if (user.role_name === 'Super Administrator') return true;
    return roles.includes(user.role_name);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        customerProfile,
        token,
        isAuthenticated: !!token,
        login,
        registerCustomer,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
