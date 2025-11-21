import React, { createContext, useContext, ReactNode } from 'react';
import { useLocation, UseLocationReturn } from './useLocation';

const LocationContext = createContext<UseLocationReturn | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
  apiUrl?: string;
  forceAllLocations?: boolean; // If true, always fetch all active locations (for public ordering)
  tokenKey?: string; // localStorage key for auth token
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children, apiUrl, forceAllLocations, tokenKey }) => {
  const locationState = useLocation({ apiUrl, forceAllLocations, tokenKey });

  return (
    <LocationContext.Provider value={locationState}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationContext = (): UseLocationReturn => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
};
