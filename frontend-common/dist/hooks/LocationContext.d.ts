import React, { ReactNode } from 'react';
import { UseLocationReturn } from './useLocation';
interface LocationProviderProps {
    children: ReactNode;
    apiUrl?: string;
}
export declare const LocationProvider: React.FC<LocationProviderProps>;
export declare const useLocationContext: () => UseLocationReturn;
export {};
//# sourceMappingURL=LocationContext.d.ts.map