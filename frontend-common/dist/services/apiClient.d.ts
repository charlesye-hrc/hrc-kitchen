import { AxiosInstance } from 'axios';
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
export declare function createApiClient(config: ApiClientConfig): AxiosInstance;
//# sourceMappingURL=apiClient.d.ts.map