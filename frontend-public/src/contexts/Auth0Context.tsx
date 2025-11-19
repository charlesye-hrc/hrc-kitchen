/**
 * Auth0 Authentication Context for HRC Kitchen Public App
 *
 * This context wraps the Auth0 React SDK and provides a compatible interface
 * with the existing AuthContext for seamless migration.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth0, Auth0Provider } from '@auth0/auth0-react';
import axios from 'axios';

// Custom claims namespace
const AUTH0_NAMESPACE = 'https://hrc-kitchen.com';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'STAFF' | 'KITCHEN' | 'FINANCE' | 'ADMIN';
  lastSelectedLocationId?: string | null;
}

interface AccessibleLocation {
  id: string;
  name: string;
}

interface Auth0ContextType {
  user: User | null;
  token: string | null;
  login: () => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  getAccessToken: () => Promise<string>;
  accessibleLocations: AccessibleLocation[];
}

interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  department?: string;
  location?: string;
  phone?: string;
}

const Auth0Context = createContext<Auth0ContextType | undefined>(undefined);

// Inner provider that uses Auth0 hooks
const Auth0ContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    isAuthenticated,
    isLoading: auth0Loading,
    user: auth0User,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [accessibleLocations, setAccessibleLocations] = useState<AccessibleLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

  // Extract user data from Auth0 token when authenticated
  useEffect(() => {
    const loadUser = async () => {
      if (isAuthenticated && auth0User) {
        try {
          // Get access token
          const accessToken = await getAccessTokenSilently();
          setToken(accessToken);

          // Set axios default header
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

          // Extract custom claims from Auth0 user
          const roles = auth0User[`${AUTH0_NAMESPACE}/roles`] as string[] || ['STAFF'];
          const userId = auth0User[`${AUTH0_NAMESPACE}/userId`] as string || '';
          const fullName = auth0User[`${AUTH0_NAMESPACE}/fullName`] as string || auth0User.name || '';
          const locations = auth0User[`${AUTH0_NAMESPACE}/accessibleLocations`] as AccessibleLocation[] || [];

          setUser({
            id: userId,
            email: auth0User.email || '',
            fullName,
            role: roles[0] as User['role'] || 'STAFF',
            lastSelectedLocationId: null,
          });

          setAccessibleLocations(locations);

          // Store in localStorage for persistence
          localStorage.setItem('token', accessToken);
          localStorage.setItem('user', JSON.stringify({
            id: userId,
            email: auth0User.email,
            fullName,
            role: roles[0],
          }));
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      } else if (!auth0Loading) {
        // Clear user data when not authenticated
        setUser(null);
        setToken(null);
        setAccessibleLocations([]);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
      }

      setIsLoading(auth0Loading);
    };

    loadUser();
  }, [isAuthenticated, auth0User, auth0Loading, getAccessTokenSilently]);

  // Login with Auth0 Universal Login
  const login = async () => {
    await loginWithRedirect();
  };

  // Login with password (for legacy support - redirects to Auth0)
  const loginWithPassword = async (_email: string, _password: string) => {
    // Auth0 handles password authentication through Universal Login
    // This method is kept for API compatibility but redirects to Auth0
    await loginWithRedirect({
      authorizationParams: {
        login_hint: _email,
      },
    });
  };

  // Logout
  const logout = () => {
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
    setUser(null);
    setToken(null);
    setAccessibleLocations([]);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  // Register - redirects to Auth0 signup
  const register = async (_data: RegisterData) => {
    await loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup',
      },
    });
  };

  // Get access token for API calls
  const getAccessToken = async (): Promise<string> => {
    if (!isAuthenticated) {
      throw new Error('Not authenticated');
    }
    const accessToken = await getAccessTokenSilently();
    return accessToken;
  };

  const value: Auth0ContextType = {
    user,
    token,
    login,
    loginWithPassword,
    logout,
    register,
    isAuthenticated,
    isLoading,
    getAccessToken,
    accessibleLocations,
  };

  return <Auth0Context.Provider value={value}>{children}</Auth0Context.Provider>;
};

// Main Auth0 Provider wrapper
interface Auth0ProviderWrapperProps {
  children: React.ReactNode;
}

export const Auth0ProviderWrapper: React.FC<Auth0ProviderWrapperProps> = ({ children }) => {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  if (!domain || !clientId) {
    console.error('Auth0 domain and clientId are required');
    return <>{children}</>;
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: audience,
        scope: 'openid profile email',
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      <Auth0ContextProvider>{children}</Auth0ContextProvider>
    </Auth0Provider>
  );
};

// Hook to use Auth0 context
export const useAuth0Context = () => {
  const context = useContext(Auth0Context);
  if (context === undefined) {
    throw new Error('useAuth0Context must be used within an Auth0ProviderWrapper');
  }
  return context;
};

export default Auth0Context;
