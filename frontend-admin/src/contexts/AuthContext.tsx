import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'STAFF' | 'KITCHEN' | 'FINANCE' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  hasAdminAccess: boolean;
  loginWithPassword: (email: string, password: string) => Promise<{ requiresOtp: boolean }>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  department?: string;
  location?: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

  useEffect(() => {
    // Load user from localStorage on mount
    // Use app-specific keys to avoid conflicts with public app
    const storedToken = localStorage.getItem('admin_token');
    const storedUser = localStorage.getItem('admin_user');
    const storedHasAdminAccess = localStorage.getItem('admin_hasAdminAccess');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setHasAdminAccess(storedHasAdminAccess === 'true');
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }

    setIsLoading(false);
  }, []);

  const loginWithPassword = async (email: string, password: string): Promise<{ requiresOtp: boolean }> => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      // New flow: login endpoint always returns requiresOtp: true
      // OTP is sent automatically by backend
      return { requiresOtp: response.data.requiresOtp };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const verifyOtp = async (email: string, code: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/verify-otp`, {
        email,
        code,
      });

      const { user: userData, token: authToken, hasAdminAccess: adminAccess } = response.data;

      setUser(userData);
      setToken(authToken);
      setHasAdminAccess(adminAccess || false);

      localStorage.setItem('admin_token', authToken);
      localStorage.setItem('admin_user', JSON.stringify(userData));
      localStorage.setItem('admin_hasAdminAccess', String(adminAccess || false));

      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    } catch (error) {
      console.error('OTP verification failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setHasAdminAccess(false);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_hasAdminAccess');
    delete axios.defaults.headers.common['Authorization'];
  };

  const register = async (data: RegisterData) => {
    try {
      await axios.post(`${API_URL}/auth/register`, data);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const value = {
    user,
    token,
    hasAdminAccess,
    loginWithPassword,
    verifyOtp,
    logout,
    register,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
