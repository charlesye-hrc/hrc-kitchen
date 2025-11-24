import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  Chip,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Button,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useLocationContext } from '@hrc-kitchen/common';
import AdminPageLayout from '../AdminPageLayout';
import api from '../../services/api';

interface InventoryItem {
  id: string;
  menuItemId: string;
  locationId: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isAvailable: boolean;
  lastRestocked: string | null;
  menuItem: {
    id: string;
    name: string;
    category: string;
    imageUrl: string | null;
    trackInventory: boolean;
  };
}

interface Location {
  id: string;
  name: string;
}

export const InventoryDashboard: React.FC = () => {
  const { user } = useAuth();
  const { locations, selectedLocation, selectLocation, isLoading: locationsLoading } = useLocationContext();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Bulk editing state
  const [editedQuantities, setEditedQuantities] = useState<{ [key: string]: number }>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (selectedLocation) {
      fetchInventory();
    } else if (!locationsLoading && locations && locations.length === 0) {
      // No locations available, stop loading
      setLoading(false);
    }
  }, [selectedLocation, locationsLoading, locations]);

  const fetchInventory = async () => {
    if (!selectedLocation) return;

    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/inventory/location/${selectedLocation.id}`);
      setInventory(response.data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (menuItemId: string, locationId: string, value: string) => {
    const key = `${menuItemId}|||${locationId}`;
    const numValue = parseInt(value) || 0;
    const item = inventory.find(
      (inv) => inv.menuItemId === menuItemId && inv.locationId === locationId
    );

    if (!item) return;

    const newValue = Math.max(0, numValue);

    // Track edited quantities
    if (newValue !== item.stockQuantity) {
      setEditedQuantities(prev => ({ ...prev, [key]: newValue }));
      setHasChanges(true);
    } else {
      // Remove from edited if reverted to original
      setEditedQuantities(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
      setHasChanges(Object.keys(editedQuantities).length > 1 || (Object.keys(editedQuantities).length === 1 && editedQuantities[key] === undefined));
    }
  };

  const handleQuickAdjust = (menuItemId: string, locationId: string, change: number) => {
    const item = inventory.find(
      (inv) => inv.menuItemId === menuItemId && inv.locationId === locationId
    );
    if (!item) return;

    const key = `${menuItemId}|||${locationId}`;
    const currentValue = editedQuantities[key] !== undefined ? editedQuantities[key] : item.stockQuantity;
    const newValue = Math.max(0, currentValue + change);

    if (newValue !== item.stockQuantity) {
      setEditedQuantities(prev => ({ ...prev, [key]: newValue }));
      setHasChanges(true);
    } else {
      setEditedQuantities(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
      setHasChanges(Object.keys(editedQuantities).filter(k => k !== key).length > 0);
    }
  };

  const handleSaveAll = async () => {
    if (!hasChanges || Object.keys(editedQuantities).length === 0) return;

    try {
      setUpdating(true);
      setError(null);

      if (user?.role === 'ADMIN') {
        // Prepare bulk update payload for admins
        const updates = Object.entries(editedQuantities).map(([key, quantity]) => {
          const [menuItemId, locationId] = key.split('|||');
          return { menuItemId, locationId, stockQuantity: quantity };
        });

        await api.post('/inventory/bulk-update', {
          updates,
          reason: 'Bulk inventory adjustment',
        });

        setSuccess(`Successfully updated ${updates.length} item${updates.length > 1 ? 's' : ''}`);
      } else {
        // Kitchen staff only have access to their assigned locations,
        // so update each item individually
        const updateEntries = Object.entries(editedQuantities);
        await Promise.all(
          updateEntries.map(async ([key, quantity]) => {
            const [menuItemId, locationId] = key.split('|||');
            await api.patch(`/inventory/item/${menuItemId}/${locationId}`, {
              stockQuantity: quantity,
              reason: 'Manual inventory adjustment',
            });
          })
        );

        setSuccess(`Successfully updated ${updateEntries.length} item${updateEntries.length > 1 ? 's' : ''}`);
      }

      setEditedQuantities({});
      setHasChanges(false);
      await fetchInventory();
    } catch (err: any) {
      setError(err.message || 'Failed to update inventory');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelChanges = () => {
    setEditedQuantities({});
    setHasChanges(false);
  };

  const getStockStatus = (item: InventoryItem) => {
    if (!item.isAvailable || item.stockQuantity === 0) {
      return { label: 'Out of Stock', color: 'error' as const };
    }
    if (item.stockQuantity <= item.lowStockThreshold) {
      return { label: 'Low Stock', color: 'warning' as const };
    }
    return { label: 'In Stock', color: 'success' as const };
  };

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      MAIN: 'Main',
      SIDE: 'Side',
      DRINK: 'Drink',
      DESSERT: 'Dessert',
      OTHER: 'Other',
    };
    return labels[category] || category;
  };

  if (loading && inventory.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Check if user has no locations assigned
  if (!locations || locations.length === 0) {
    return (
      <Box>
        <Typography variant="h5" component="h2" gutterBottom>
          Inventory Management
        </Typography>
        <Alert severity="warning">
          You do not have any locations assigned. Please contact your administrator to assign you to a location.
        </Alert>
      </Box>
    );
  }

  return (
    <AdminPageLayout
      title="Inventory Management"
      subtitle="Track stock levels and availability across locations."
    >
      {((locations && locations.length > 1) || hasChanges) && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
            gap: { xs: 1.5, md: 2 },
            mb: 2
          }}
        >
          {locations && locations.length > 1 && (
            <FormControl
              size="small"
              sx={{ width: { xs: '100%', sm: 'auto' }, minWidth: { sm: 220 }, maxWidth: 320 }}
            >
              <InputLabel>Location</InputLabel>
              <Select
                value={selectedLocation?.id || ''}
                onChange={(e) => selectLocation(e.target.value)}
                label="Location"
              >
                {locations.map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {hasChanges && (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveAll}
                disabled={updating}
                sx={{ flex: { xs: 1, sm: 'none' }, minWidth: { sm: 140 } }}
              >
                Save Changes ({Object.keys(editedQuantities).length})
              </Button>
              <Button
                variant="outlined"
                onClick={handleCancelChanges}
                disabled={updating}
                sx={{ flex: { xs: 1, sm: 'none' }, minWidth: { sm: 120 } }}
              >
                Cancel
              </Button>
            </Stack>
          )}
        </Box>
      )}

      {inventory.length === 0 ? (
        <Alert severity="info">
          No inventory items found for this location. Items with inventory tracking enabled will appear here.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Stock Quantity</TableCell>
                <TableCell align="center">Low Stock Alert</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventory.map((item) => {
                const status = getStockStatus(item);
                const key = `${item.menuItemId}|||${item.locationId}`;
                const hasEdit = editedQuantities[key] !== undefined;

                return (
                  <TableRow
                    key={`${item.menuItemId}-${item.locationId}`}
                    sx={{
                      borderLeft: status.color === 'error' || status.color === 'warning' ? 4 : 0,
                      borderColor: status.color === 'error' ? 'error.main' : status.color === 'warning' ? 'warning.main' : 'transparent',
                      opacity: updating ? 0.6 : 1,
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        {item.menuItem.imageUrl && (
                          <img
                            src={item.menuItem.imageUrl}
                            alt={item.menuItem.name}
                            style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }}
                          />
                        )}
                        <Typography variant="body2">{item.menuItem.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{getCategoryLabel(item.menuItem.category)}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={status.label}
                        color={status.color}
                        size="small"
                        icon={status.color === 'error' || status.color === 'warning' ? <WarningIcon /> : undefined}
                        sx={{
                          fontWeight: 600,
                          ...(status.color === 'success' && {
                            backgroundColor: 'success.main',
                            color: 'common.white',
                            '& .MuiChip-icon': {
                              color: 'common.white',
                            },
                          }),
                        }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1 }}>
                      <Box display="flex" justifyContent="center" alignItems="center" gap={0.5}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleQuickAdjust(item.menuItemId, item.locationId, -1)}
                          disabled={updating || (editedQuantities[key] || item.stockQuantity) === 0}
                          sx={{ padding: '4px' }}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <TextField
                          type="number"
                          value={
                            editedQuantities[key] !== undefined
                              ? editedQuantities[key]
                              : item.stockQuantity
                          }
                          onChange={(e) => handleQuantityChange(item.menuItemId, item.locationId, e.target.value)}
                          disabled={updating}
                          inputProps={{
                            min: 0,
                            style: {
                              textAlign: 'center',
                              fontSize: '1rem',
                              fontWeight: 600,
                              padding: '6px 8px',
                              width: '60px',
                              backgroundColor: hasEdit ? '#fff3cd' : 'inherit'
                            }
                          }}
                          variant="outlined"
                          size="small"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '&.Mui-focused fieldset': {
                                borderColor: 'primary.main',
                                borderWidth: 2,
                              },
                              ...(hasEdit && {
                                '& fieldset': {
                                  borderColor: 'warning.main',
                                  borderWidth: 2,
                                }
                              })
                            }
                          }}
                        />
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleQuickAdjust(item.menuItemId, item.locationId, 1)}
                          disabled={updating}
                          sx={{ padding: '4px' }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {item.lowStockThreshold}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Success Snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          top: { xs: 96, sm: 112 },
          right: { xs: 16, sm: 32 },
        }}
      >
        <Alert
          onClose={() => setSuccess(null)}
          severity="success"
          variant="standard"
          sx={{
            width: '100%',
            bgcolor: '#f2fbf4',
            color: '#14532d',
            border: '1px solid #22c55e',
            boxShadow: 3,
          }}
        >
          {success}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          top: { xs: 96, sm: 112 },
          right: { xs: 16, sm: 32 },
        }}
      >
        <Alert
          onClose={() => setError(null)}
          severity="error"
          variant="standard"
          sx={{
            width: '100%',
            bgcolor: (theme) => theme.palette.error.light,
            color: (theme) => theme.palette.error.dark,
            border: '1px solid',
            borderColor: 'error.main',
            boxShadow: 3,
          }}
        >
          {error}
        </Alert>
      </Snackbar>
    </AdminPageLayout>
  );
};
