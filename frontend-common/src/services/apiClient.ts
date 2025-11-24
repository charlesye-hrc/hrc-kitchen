import axios, { AxiosInstance } from 'axios';

export interface ApiClientConfig {
  tokenKey?: string;
  userKey: string;
  baseURL: string;
  redirectOnUnauthorized?: boolean;
  loginPath?: string;
  useTokenStorage?: boolean;
  withCredentials?: boolean;
}

/**
 * Creates a configured axios instance with authentication and error handling
 *
 * @param config - Configuration for the API client
 * @returns Configured axios instance
 *
 * @example
 * ```typescript
 * // Public app
 * const api = createApiClient({
 *   tokenKey: 'public_token',
 *   userKey: 'public_user',
 *   baseURL: import.meta.env.VITE_API_URL || '/api/v1',
 * });
 *
 * // Admin app
 * const api = createApiClient({
 *   tokenKey: 'admin_token',
 *   userKey: 'admin_user',
 *   baseURL: import.meta.env.VITE_API_URL || '/api/v1',
 * });
 * ```
 */
export function createApiClient(config: ApiClientConfig): AxiosInstance {
  const {
    tokenKey,
    userKey,
    baseURL,
    redirectOnUnauthorized = true,
    loginPath = '/login',
    useTokenStorage = true,
    withCredentials = false,
  } = config;

  const shouldUseTokenStorage = useTokenStorage && Boolean(tokenKey);

  // Create axios instance
  const api = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials,
  });

  // Request interceptor to add auth token
  api.interceptors.request.use(
    (requestConfig) => {
      if (shouldUseTokenStorage && tokenKey) {
        const token = localStorage.getItem(tokenKey);
        if (token) {
          requestConfig.headers.Authorization = `Bearer ${token}`;
        }
      }
      return requestConfig;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 && redirectOnUnauthorized) {
        // Clear authentication data
        if (shouldUseTokenStorage && tokenKey) {
          localStorage.removeItem(tokenKey);
        }
        localStorage.removeItem(userKey);

        // Additional cleanup for admin app
        if (tokenKey === 'admin_token') {
          localStorage.removeItem('admin_hasAdminAccess');
        }

        // Redirect to login
        window.location.href = loginPath;
      }
      return Promise.reject(error);
    }
  );

  return api;
}
