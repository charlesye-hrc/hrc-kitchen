import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  CircularProgress,
  FormHelperText,
} from '@mui/material';
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

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  locations,
  selectedLocationId,
  onLocationChange,
  isLoading = false,
  error = null,
  label = 'Location',
  disabled = false,
  fullWidth = true,
  size = 'medium',
  includeAll = false,
  allLabel = 'All Locations',
}) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onLocationChange(event.target.value);
  };

  if (isLoading) {
    return (
      <FormControl fullWidth={fullWidth} size={size}>
        <InputLabel>{label}</InputLabel>
        <Select
          value=""
          label={label}
          disabled
          endAdornment={<CircularProgress size={20} sx={{ mr: 2 }} />}
        >
          <MenuItem value="">Loading...</MenuItem>
        </Select>
      </FormControl>
    );
  }

  if (error) {
    return (
      <FormControl fullWidth={fullWidth} size={size} error>
        <InputLabel>{label}</InputLabel>
        <Select value="" label={label} disabled>
          <MenuItem value="">Error loading locations</MenuItem>
        </Select>
        <FormHelperText>{error}</FormHelperText>
      </FormControl>
    );
  }

  if (locations.length === 0) {
    return (
      <FormControl fullWidth={fullWidth} size={size}>
        <InputLabel>{label}</InputLabel>
        <Select value="" label={label} disabled>
          <MenuItem value="">No locations available</MenuItem>
        </Select>
      </FormControl>
    );
  }

  return (
    <FormControl fullWidth={fullWidth} size={size}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={selectedLocationId || ''}
        onChange={handleChange}
        label={label}
        disabled={disabled}
      >
        {includeAll && (
          <MenuItem value="all">
            {allLabel}
          </MenuItem>
        )}
        {locations.map((location) => (
          <MenuItem key={location.id} value={location.id}>
            {location.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
