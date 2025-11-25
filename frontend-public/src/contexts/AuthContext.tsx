import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { executeRecaptcha } from '@hrc-kitchen/common';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'STAFF' | 'KITCHEN' | 'FINANCE' | 'ADMIN';
  hasAdminAccess?: boolean; // Indicates if user can access management app
}

interface AuthContextType {
  user: User | null;
  loginWithPassword: (
    email: string,
    password: string,
    options?: { skipCaptcha?: boolean }
  ) => Promise<{ requiresOtp: boolean }>;
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
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  const getCaptchaToken = async (action: string): Promise<string> => {
    if (!RECAPTCHA_SITE_KEY) {
      throw new Error('Captcha is not configured. Please contact support.');
    }
    return executeRecaptcha(RECAPTCHA_SITE_KEY, action);
  };

  useEffect(() => {
    // Remove legacy token storage
    localStorage.removeItem('public_token');

    // Load user from localStorage on mount
    // Use app-specific keys to avoid conflicts with admin app
    const storedUser = localStorage.getItem('public_user');

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        // Corrupted localStorage, clear and start fresh
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('public_user');
      }
    }

    setIsLoading(false);
  }, []);

  const loginWithPassword = async (
    email: string,
    password: string,
    options?: { skipCaptcha?: boolean }
  ): Promise<{ requiresOtp: boolean }> => {
    try {
      const captchaToken = options?.skipCaptcha ? undefined : await getCaptchaToken('public_login');
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
        skipCaptcha: Boolean(options?.skipCaptcha),
        ...(captchaToken ? { captchaToken } : {}),
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
      const response = await axios.post(
        `${API_URL}/auth/verify-otp`,
        {
          email,
          code,
        },
        { withCredentials: true }
      );

      const { user: userData, hasAdminAccess } = response.data;

      // Add hasAdminAccess to user object
      const userWithAccess = {
        ...userData,
        hasAdminAccess,
      };

      setUser(userWithAccess);

      localStorage.setItem('public_user', JSON.stringify(userWithAccess));
    } catch (error) {
      console.error('OTP verification failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
    setUser(null);
    localStorage.removeItem('public_user');
    localStorage.removeItem('public_token');
  };

  const register = async (data: RegisterData) => {
    try {
      const captchaToken = await getCaptchaToken('public_register');
      await axios.post(`${API_URL}/auth/register`, { ...data, captchaToken });
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const value = {
    user,
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
