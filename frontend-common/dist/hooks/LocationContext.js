import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from 'react';
import { useLocation } from './useLocation';
const LocationContext = createContext(undefined);
export const LocationProvider = ({ children, apiUrl, forceAllLocations, tokenKey, authMode, }) => {
    const locationState = useLocation({ apiUrl, forceAllLocations, tokenKey, authMode });
    return (_jsx(LocationContext.Provider, { value: locationState, children: children }));
};
export const useLocationContext = () => {
    const context = useContext(LocationContext);
    if (!context) {
        throw new Error('useLocationContext must be used within a LocationProvider');
    }
    return context;
};
