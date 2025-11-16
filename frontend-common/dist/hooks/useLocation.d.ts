import { Location } from '../types';
export interface UseLocationReturn {
    locations: Location[];
    selectedLocation: Location | null;
    isLoading: boolean;
    error: string | null;
    selectLocation: (locationId: string) => void;
    refreshLocations: () => Promise<void>;
}
export interface UseLocationOptions {
    apiUrl?: string;
}
/**
 * Hook to manage locations
 * - Fetches all locations
 * - Manages selected location state
 * - Persists selected location to localStorage
 */
export declare const useLocation: (options?: UseLocationOptions) => UseLocationReturn;
//# sourceMappingURL=useLocation.d.ts.map