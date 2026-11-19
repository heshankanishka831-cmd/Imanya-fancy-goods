import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../../types';
import { authApi } from '../../services/endpoints';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('token');
  });

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    if (res.success && res.data) {
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      localStorage.setItem('token', res.data.token);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
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
        token,
        isAuthenticated: !!token,
        login,
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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
