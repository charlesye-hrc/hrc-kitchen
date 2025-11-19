import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

// Custom claims namespace
const AUTH0_NAMESPACE = 'https://hrc-kitchen.com';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'STAFF' | 'KITCHEN' | 'FINANCE' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  requestOtp: (email: string) => Promise<void>;
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

// Check if Auth0 is configured
const isAuth0Configured = !!(
  import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID
);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Auth0-enabled provider
const Auth0AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    isAuthenticated: auth0IsAuthenticated,
    isLoading: auth0IsLoading,
    user: auth0User,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user data from Auth0 token
  useEffect(() => {
    const loadAuth0User = async () => {
      console.log('Auth0 state:', {
        isLoading: auth0IsLoading,
        isAuthenticated: auth0IsAuthenticated,
        user: auth0User?.email || 'none'
      });

      // Still loading Auth0 state
      if (auth0IsLoading) {
        setIsLoading(true);
        return;
      }

      if (auth0IsAuthenticated && auth0User) {
        try {
          // Get access token - try without audience first if not configured
          let accessToken: string;
          try {
            accessToken = await getAccessTokenSilently();
          } catch (tokenError: any) {
            // If audience is not configured, try getting token without it
            if (tokenError.error === 'consent_required' || tokenError.error === 'login_required') {
              console.warn('Token error, redirecting to login:', tokenError);
              await loginWithRedirect();
              return;
            }
            // For other errors, try getting the ID token claims instead
            console.warn('Could not get access token, using ID token:', tokenError);
            accessToken = '';
          }

          if (accessToken) {
            setToken(accessToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            localStorage.setItem('token', accessToken);
          }

          // First, check if we have custom claims from Auth0 Action
          const claimsRoles = auth0User[`${AUTH0_NAMESPACE}/roles`] as string[] | undefined;
          const claimsUserId = auth0User[`${AUTH0_NAMESPACE}/userId`] as string | undefined;
          const claimsFullName = auth0User[`${AUTH0_NAMESPACE}/fullName`] as string | undefined;

          // If we have custom claims from Auth0 Action, use them
          if (claimsUserId && claimsRoles) {
            const userData: User = {
              id: claimsUserId,
              email: auth0User.email || '',
              fullName: claimsFullName || auth0User.name || auth0User.nickname || '',
              role: (claimsRoles[0] as User['role']) || 'STAFF',
            };

            console.log('Auth0 user loaded from claims:', userData);
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          } else {
            // No custom claims - fetch user data directly from backend
            console.log('No Auth0 claims found, fetching from backend for:', auth0User.email);
            try {
              // Send Auth0 access token for validation (backend will extract email from it)
              const response = await axios.post(
                `${API_URL}/auth/sync-auth0-user`,
                { name: auth0User.name || auth0User.nickname || '' },
                { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} }
              );

              const backendUser = response.data;

              if (backendUser) {
                const userData: User = {
                  id: backendUser.id,
                  email: backendUser.email,
                  fullName: backendUser.fullName,
                  role: backendUser.role as User['role'],
                };

                // Use the backend JWT for API calls
                if (backendUser.token) {
                  setToken(backendUser.token);
                  axios.defaults.headers.common['Authorization'] = `Bearer ${backendUser.token}`;
                  localStorage.setItem('token', backendUser.token);
                }

                console.log('Auth0 user loaded from backend:', userData);
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
              } else {
                // User not in database - use defaults
                const userData: User = {
                  id: auth0User.sub || '',
                  email: auth0User.email || '',
                  fullName: auth0User.name || auth0User.nickname || '',
                  role: 'STAFF',
                };

                console.log('Auth0 user not in database, using defaults:', userData);
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
              }
            } catch (backendError) {
              console.error('Failed to fetch user from backend:', backendError);
              // Fallback to basic Auth0 data
              const userData: User = {
                id: auth0User.sub || '',
                email: auth0User.email || '',
                fullName: auth0User.name || auth0User.nickname || '',
                role: 'STAFF',
              };

              setUser(userData);
              localStorage.setItem('user', JSON.stringify(userData));
            }
          }
        } catch (error) {
          console.error('Error loading Auth0 user:', error);
          setUser(null);
          setToken(null);
        }
      } else {
        // Not authenticated
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
      }

      setIsLoading(false);
    };

    loadAuth0User();
  }, [auth0IsAuthenticated, auth0User, auth0IsLoading, getAccessTokenSilently, loginWithRedirect]);

  // Login redirects to Auth0
  const login = async (_email: string, _password: string) => {
    await loginWithRedirect({
      authorizationParams: {
        login_hint: _email,
      },
    });
  };

  // OTP methods redirect to Auth0 (not supported in Auth0 Universal Login by default)
  const requestOtp = async (_email: string) => {
    await loginWithRedirect({
      authorizationParams: {
        login_hint: _email,
      },
    });
  };

  const verifyOtp = async (_email: string, _code: string) => {
    // Auth0 handles verification through Universal Login
    await loginWithRedirect();
  };

  // Logout from Auth0
  const logout = () => {
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  // Register redirects to Auth0 signup
  const register = async (_data: RegisterData) => {
    await loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup',
      },
    });
  };

  const value = {
    user,
    token,
    login,
    requestOtp,
    verifyOtp,
    logout,
    register,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Legacy provider (original implementation)
const LegacyAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });

      const { user: userData, token: authToken } = response.data;

      setUser(userData);
      setToken(authToken);

      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(userData));

      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const requestOtp = async (email: string) => {
    try {
      await axios.post(`${API_URL}/auth/request-otp`, { email });
    } catch (error) {
      console.error('OTP request failed:', error);
      throw error;
    }
  };

  const verifyOtp = async (email: string, code: string) => {
    try {
      const response = await axios.post(`${API_URL}/auth/verify-otp`, {
        email,
        code,
      });

      const { user: userData, token: authToken } = response.data;

      setUser(userData);
      setToken(authToken);

      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(userData));

      axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    } catch (error) {
      console.error('OTP verification failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
    login,
    requestOtp,
    verifyOtp,
    logout,
    register,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Export the appropriate provider based on configuration
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (isAuth0Configured) {
    return <Auth0AuthProvider>{children}</Auth0AuthProvider>;
  }
  return <LegacyAuthProvider>{children}</LegacyAuthProvider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
