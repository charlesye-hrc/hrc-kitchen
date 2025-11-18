import { useState, useEffect, useCallback } from 'react';
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
export const useLocation = (options?: UseLocationOptions): UseLocationReturn => {
  const API_URL = options?.apiUrl || 'http://localhost:3000/api/v1';
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const SELECTED_LOCATION_KEY = 'selectedLocationId';

  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      let endpoint = token
        ? `${API_URL}/locations/user/accessible`  // Authenticated: get user's accessible locations
        : `${API_URL}/locations`;                  // Guest: get all active locations

      const headers: HeadersInit = token
        ? { 'Authorization': `Bearer ${token}` }
        : {};

      let response = await fetch(endpoint, { headers });

      // If authenticated endpoint fails with 401, fall back to public endpoint
      if (token && response.status === 401) {
        // Token is invalid or expired, remove it and try public endpoint
        localStorage.removeItem('token');
        endpoint = `${API_URL}/locations`;
        response = await fetch(endpoint);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setLocations(data.data);

        // Auto-select location from localStorage or first location
        const savedLocationId = localStorage.getItem(SELECTED_LOCATION_KEY);
        if (savedLocationId) {
          const savedLocation = data.data.find((loc: Location) => loc.id === savedLocationId);
          if (savedLocation) {
            setSelectedLocation(savedLocation);
          } else if (data.data.length > 0) {
            setSelectedLocation(data.data[0]);
            localStorage.setItem(SELECTED_LOCATION_KEY, data.data[0].id);
          }
        } else if (data.data.length > 0) {
          setSelectedLocation(data.data[0]);
          localStorage.setItem(SELECTED_LOCATION_KEY, data.data[0].id);
        }
      } else {
        setError(data.message || 'Failed to fetch locations');
      }
    } catch (err) {
      setError('Failed to fetch locations');
      console.error('Error fetching locations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const selectLocation = useCallback((locationId: string) => {
    const location = locations.find(loc => loc.id === locationId);
    if (location) {
      setSelectedLocation(location);
      localStorage.setItem(SELECTED_LOCATION_KEY, locationId);

      // Update user's last selected location on server (if authenticated)
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`${API_URL}/locations/user/last-selected`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ locationId }),
        }).catch(err => console.error('Failed to update last selected location:', err));
      }
    }
  }, [locations]);

  const refreshLocations = useCallback(async () => {
    await fetchLocations();
  }, [fetchLocations]);

  return {
    locations,
    selectedLocation,
    isLoading,
    error,
    selectLocation,
    refreshLocations,
  };
};
