import { useState, useEffect, useCallback } from 'react';
/**
 * Hook to manage locations
 * - Fetches all locations
 * - Manages selected location state
 * - Persists selected location to localStorage
 */
export const useLocation = (options) => {
    const API_URL = options?.apiUrl || 'http://localhost:3000/api/v1';
    const TOKEN_KEY = options?.tokenKey || 'token';
    const [locations, setLocations] = useState([]);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const SELECTED_LOCATION_KEY = 'selectedLocationId';
    const fetchLocations = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Check if user is authenticated
            const token = localStorage.getItem(TOKEN_KEY);
            // For public ordering app, always fetch all locations regardless of user assignments
            // For internal apps (kitchen, admin), fetch user-specific accessible locations
            let endpoint;
            let headers = {};
            if (options?.forceAllLocations) {
                // Public ordering app: fetch all locations WITHOUT authentication
                // This ensures we always get all locations regardless of user assignments
                endpoint = `${API_URL}/locations`;
                // Do NOT send token for public ordering - we want ALL locations
            }
            else {
                // Internal apps: use authentication and location assignments
                endpoint = token
                    ? `${API_URL}/locations/user/accessible` // Authenticated: get user's accessible locations
                    : `${API_URL}/locations`; // Guest: get all active locations
                // Only send token for internal apps
                if (token) {
                    headers = { 'Authorization': `Bearer ${token}` };
                }
            }
            let response = await fetch(endpoint, { headers });
            // If authenticated endpoint fails with 401, fall back to public endpoint
            if (token && response.status === 401 && !options?.forceAllLocations) {
                // Token is invalid or expired, remove it and try public endpoint
                localStorage.removeItem(TOKEN_KEY);
                endpoint = `${API_URL}/locations`;
                response = await fetch(endpoint);
            }
            const data = await response.json();
            if (data.success && data.data) {
                setLocations(data.data);
                // Auto-select location from localStorage or first location
                const savedLocationId = localStorage.getItem(SELECTED_LOCATION_KEY);
                if (savedLocationId) {
                    const savedLocation = data.data.find((loc) => loc.id === savedLocationId);
                    if (savedLocation) {
                        setSelectedLocation(savedLocation);
                    }
                    else if (data.data.length > 0) {
                        setSelectedLocation(data.data[0]);
                        localStorage.setItem(SELECTED_LOCATION_KEY, data.data[0].id);
                    }
                }
                else if (data.data.length > 0) {
                    setSelectedLocation(data.data[0]);
                    localStorage.setItem(SELECTED_LOCATION_KEY, data.data[0].id);
                }
            }
            else {
                setError(data.message || 'Failed to fetch locations');
            }
        }
        catch (err) {
            setError('Failed to fetch locations');
            console.error('Error fetching locations:', err);
        }
        finally {
            setIsLoading(false);
        }
    }, [API_URL, TOKEN_KEY, options?.forceAllLocations]);
    useEffect(() => {
        fetchLocations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [API_URL, TOKEN_KEY, options?.forceAllLocations]);
    const selectLocation = useCallback((locationId) => {
        const location = locations.find(loc => loc.id === locationId);
        if (location) {
            setSelectedLocation(location);
            localStorage.setItem(SELECTED_LOCATION_KEY, locationId);
            // Update user's last selected location on server (if authenticated)
            const token = localStorage.getItem(TOKEN_KEY);
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
    }, [locations, API_URL, TOKEN_KEY]);
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
