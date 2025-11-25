import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { executeRecaptcha } from '@hrc-kitchen/common';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'STAFF' | 'KITCHEN' | 'FINANCE' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  hasAdminAccess: boolean;
  loginWithPassword: (
    email: string,
    password: string,
    options?: { skipCaptcha?: boolean }
  ) => Promise<{ requiresOtp: boolean }>;
  verifyOtp: (email: string, code: string) => Promise<{ user: User; hasAdminAccess: boolean }>;
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

axios.defaults.withCredentials = true;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState<boolean>(false);
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
    let isMounted = true;

    const loadSession = async () => {
      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          withCredentials: true,
        });

        if (!isMounted) {
          return;
        }

        setUser(response.data.user);
        setHasAdminAccess(response.data.hasAdminAccess || false);
      } catch (_error) {
        if (isMounted) {
          setUser(null);
          setHasAdminAccess(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [API_URL]);

  const loginWithPassword = async (
    email: string,
    password: string,
    options?: { skipCaptcha?: boolean }
  ): Promise<{ requiresOtp: boolean }> => {
    try {
      const captchaToken = options?.skipCaptcha ? undefined : await getCaptchaToken('admin_login');
      const response = await axios.post(
        `${API_URL}/auth/login`,
        {
          email,
          password,
          skipCaptcha: Boolean(options?.skipCaptcha),
          ...(captchaToken ? { captchaToken } : {}),
        },
        {
          withCredentials: true,
        }
      );

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
        {
          withCredentials: true,
        }
      );

      const { user: userData, hasAdminAccess: adminAccess } = response.data;

      setUser(userData);
      setHasAdminAccess(adminAccess || false);

      return {
        user: userData,
        hasAdminAccess: adminAccess || false,
      };
    } catch (error) {
      console.error('OTP verification failed:', error);
      throw error;
    }
  };

  const logout = () => {
    axios
      .post(
        `${API_URL}/auth/logout`,
        {},
        {
          withCredentials: true,
        }
      )
      .catch((error) => {
        console.error('Logout failed:', error);
      })
      .finally(() => {
        setUser(null);
        setHasAdminAccess(false);
      });
  };

  const register = async (data: RegisterData) => {
    try {
      const captchaToken = await getCaptchaToken('admin_register');
      await axios.post(
        `${API_URL}/auth/register`,
        { ...data, captchaToken },
        { withCredentials: true }
      );
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const value = {
    user,
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
