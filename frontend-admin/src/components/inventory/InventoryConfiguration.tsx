import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import { Inventory as InventoryIcon, History as HistoryIcon } from '@mui/icons-material';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  trackInventory: boolean;
  imageUrl: string | null;
  inventories: {
    locationId: string;
    stockQuantity: number;
    lowStockThreshold: number;
    isAvailable: boolean;
    location: {
      id: string;
      name: string;
    };
  }[];
}

interface InventoryHistoryEntry {
  id: string;
  changeType: string;
  quantity: number;
  previousQty: number;
  newQty: number;
  reason: string | null;
  createdAt: string;
  inventory: {
    menuItem: {
      name: string;
    };
    location: {
      name: string;
    };
  };
  user: {
    fullName: string;
    email: string;
  } | null;
  order: {
    orderNumber: string;
  } | null;
}

export const InventoryConfiguration: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [history, setHistory] = useState<InventoryHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchMenuItems();
    fetchHistory();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the new /menu/items endpoint that returns all items in a flat array
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/menu/items`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch menu items');
      }

      const data = await response.json();
      const allItems = data.data;

      // Fetch inventory for each menu item
      const itemsWithInventory = await Promise.all(
        allItems.map(async (item: any) => {
          if (!item.trackInventory) {
            return { ...item, inventories: [] };
          }

          try {
            const invResponse = await fetch(
              `${import.meta.env.VITE_API_URL}/inventory/all`,
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
                },
              }
            );

            if (invResponse.ok) {
              const invData = await invResponse.json();
              const itemInventories = invData.data.filter((inv: any) => inv.menuItemId === item.id);
              return { ...item, inventories: itemInventories };
            }
          } catch (err) {
            console.error('Failed to fetch inventory for item:', err);
          }

          return { ...item, inventories: [] };
        })
      );

      setMenuItems(itemsWithInventory);
    } catch (err: any) {
      setError(err.message || 'Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/inventory/history?limit=50`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      setHistory(data.data);
    } catch (err: any) {
      console.error('Failed to load history:', err);
    }
  };

  const handleToggleTracking = async (menuItemId: string, trackInventory: boolean) => {
    try {
      setUpdating(menuItemId);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/inventory/menu-item/${menuItemId}/tracking`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
          },
          body: JSON.stringify({ trackInventory }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to toggle inventory tracking');
      }

      setSuccess(`Inventory tracking ${trackInventory ? 'enabled' : 'disabled'} successfully`);
      setTimeout(() => setSuccess(null), 3000);
      await fetchMenuItems();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle inventory tracking');
    } finally {
      setUpdating(null);
    }
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

  const getChangeTypeLabel = (changeType: string) => {
    const labels: { [key: string]: { label: string; color: 'success' | 'error' | 'warning' | 'info' } } = {
      RESTOCK: { label: 'Restock', color: 'success' },
      ORDER: { label: 'Order', color: 'error' },
      ADJUSTMENT: { label: 'Adjustment', color: 'warning' },
      WASTE: { label: 'Waste', color: 'info' },
    };
    return labels[changeType] || { label: changeType, color: 'info' as const };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Inventory Configuration
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab icon={<InventoryIcon />} label="Menu Items" />
        <Tab icon={<HistoryIcon />} label="History" />
      </Tabs>

      {tabValue === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="center">Track Inventory</TableCell>
                <TableCell align="center">Locations</TableCell>
                <TableCell align="center">Total Stock</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {menuItems.map((item) => {
                const totalStock = item.inventories.reduce((sum, inv) => sum + inv.stockQuantity, 0);
                const isUpdating = updating === item.id;

                return (
                  <TableRow key={item.id} sx={{ opacity: isUpdating ? 0.6 : 1 }}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }}
                          />
                        )}
                        <Typography variant="body2">{item.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{getCategoryLabel(item.category)}</TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={item.trackInventory}
                        onChange={(e) => handleToggleTracking(item.id, e.target.checked)}
                        disabled={isUpdating}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {item.trackInventory && item.inventories.length > 0 ? (
                        <Box display="flex" flexDirection="column" gap={0.5}>
                          {item.inventories.map((inv) => (
                            <Chip
                              key={inv.locationId}
                              label={`${inv.location.name}: ${inv.stockQuantity}`}
                              size="small"
                              color={inv.stockQuantity <= inv.lowStockThreshold ? 'warning' : 'default'}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {item.trackInventory ? 'Not initialized' : 'N/A'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="h6">
                        {item.trackInventory ? totalStock : '∞'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tabValue === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date/Time</TableCell>
                <TableCell>Item</TableCell>
                <TableCell>Location</TableCell>
                <TableCell align="center">Type</TableCell>
                <TableCell align="center">Change</TableCell>
                <TableCell align="center">Before</TableCell>
                <TableCell align="center">After</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Reason/Order</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No inventory history found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                history.map((entry) => {
                  const changeType = getChangeTypeLabel(entry.changeType);

                  return (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDate(entry.createdAt)}</TableCell>
                      <TableCell>{entry.inventory.menuItem.name}</TableCell>
                      <TableCell>{entry.inventory.location.name}</TableCell>
                      <TableCell align="center">
                        <Chip label={changeType.label} color={changeType.color} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          color={entry.quantity > 0 ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {entry.quantity > 0 ? '+' : ''}
                          {entry.quantity}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{entry.previousQty}</TableCell>
                      <TableCell align="center">{entry.newQty}</TableCell>
                      <TableCell>
                        {entry.user ? (
                          <Typography variant="body2">{entry.user.fullName}</Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            System
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.order ? (
                          <Chip label={entry.order.orderNumber} size="small" />
                        ) : entry.reason ? (
                          <Typography variant="body2" color="text.secondary">
                            {entry.reason}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};
