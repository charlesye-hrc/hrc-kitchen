import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { FormControl, InputLabel, Select, MenuItem, CircularProgress, FormHelperText, } from '@mui/material';
export const LocationSelector = ({ locations, selectedLocationId, onLocationChange, isLoading = false, error = null, label = 'Location', disabled = false, fullWidth = true, size = 'medium', includeAll = false, allLabel = 'All Locations', }) => {
    const handleChange = (event) => {
        onLocationChange(event.target.value);
    };
    if (isLoading) {
        return (_jsxs(FormControl, { fullWidth: fullWidth, size: size, children: [_jsx(InputLabel, { children: label }), _jsx(Select, { value: "", label: label, disabled: true, endAdornment: _jsx(CircularProgress, { size: 20, sx: { mr: 2 } }), children: _jsx(MenuItem, { value: "", children: "Loading..." }) })] }));
    }
    if (error) {
        return (_jsxs(FormControl, { fullWidth: fullWidth, size: size, error: true, children: [_jsx(InputLabel, { children: label }), _jsx(Select, { value: "", label: label, disabled: true, children: _jsx(MenuItem, { value: "", children: "Error loading locations" }) }), _jsx(FormHelperText, { children: error })] }));
    }
    if (locations.length === 0) {
        return (_jsxs(FormControl, { fullWidth: fullWidth, size: size, children: [_jsx(InputLabel, { children: label }), _jsx(Select, { value: "", label: label, disabled: true, children: _jsx(MenuItem, { value: "", children: "No locations available" }) })] }));
    }
    return (_jsxs(FormControl, { fullWidth: fullWidth, size: size, children: [_jsx(InputLabel, { children: label }), _jsxs(Select, { value: selectedLocationId || '', onChange: handleChange, label: label, disabled: disabled, children: [includeAll && (_jsx(MenuItem, { value: "all", children: allLabel })), locations.map((location) => (_jsx(MenuItem, { value: location.id, children: location.name }, location.id)))] })] }));
};
