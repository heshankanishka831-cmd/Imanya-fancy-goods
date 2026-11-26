import React, { createContext, useContext, useState } from 'react';
import { User } from '../../types';
import { authApi } from '../../services/endpoints';

export interface CustomerProfile {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  business_name?: string;
  phone?: string;
  residential_address?: string;
  delivery_address?: string;
  address?: string;
  del_city?: string;
  res_city?: string;
  del_postal_code?: string;
  res_postal_code?: string;
  membership_tier?: string;
  lifetime_spent?: number;
  profile_photo_url?: string;
}

interface AuthContextType {
  user: User | null;
  customerProfile: CustomerProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  syncCustomerSession: (userUpdates: Partial<User>, profileUpdates: Partial<CustomerProfile>) => void;
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
        residential_address: res.data.residential_address,
        delivery_address: res.data.delivery_address || res.data.address,
        address: res.data.address || res.data.delivery_address,
        membership_tier: res.data.membership_tier,
      };
      setCustomerProfile(profile);
      localStorage.setItem('customerProfile', JSON.stringify(profile));
      return res.data.user;
    }
    throw new Error('Login failed');
  };

  const syncCustomerSession = (
    userUpdates: Partial<User>,
    profileUpdates: Partial<CustomerProfile>
  ) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...userUpdates };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
    setCustomerProfile((prev) => {
      const next = { ...(prev || {}), ...profileUpdates };
      localStorage.setItem('customerProfile', JSON.stringify(next));
      return next;
    });
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
        syncCustomerSession,
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
