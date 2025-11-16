import React, { createContext, useContext, ReactNode } from 'react';
import { useLocation, UseLocationReturn } from './useLocation';

const LocationContext = createContext<UseLocationReturn | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
  apiUrl?: string;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children, apiUrl }) => {
  const locationState = useLocation({ apiUrl });

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
