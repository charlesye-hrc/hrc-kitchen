import React from 'react';
import { Location } from '../types';
interface LocationSelectorProps {
    locations: Location[];
    selectedLocationId: string | null;
    onLocationChange: (locationId: string) => void;
    isLoading?: boolean;
    error?: string | null;
    label?: string;
    disabled?: boolean;
    fullWidth?: boolean;
    size?: 'small' | 'medium';
    includeAll?: boolean;
    allLabel?: string;
}
export declare const LocationSelector: React.FC<LocationSelectorProps>;
export {};
//# sourceMappingURL=LocationSelector.d.ts.map