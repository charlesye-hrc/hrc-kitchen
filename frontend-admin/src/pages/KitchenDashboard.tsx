import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Collapse,
  IconButton
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  LocalShipping as LocalShippingIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useLocationContext, LocationSelector } from '@hrc-kitchen/common';
import api from '../services/api';
import AdminPageLayout from '../components/AdminPageLayout';

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  fulfillmentStatus: 'PLACED' | 'PARTIALLY_FULFILLED' | 'FULFILLED';
  paymentStatus: string;
  specialRequests: string | null;
  orderDate: string;
  createdAt: string;
  user: {
    fullName: string;
    email: string;
  } | null;
  guestEmail?: string | null;
  guestFirstName?: string | null;
  guestLastName?: string | null;
  orderItems: Array<{
    id: string;
    quantity: number;
    customizations: any;
    selectedVariations: any;
    fulfillmentStatus: 'PLACED' | 'FULFILLED';
    menuItem: {
      id: string;
      name: string;
      description: string;
      category: string;
      imageUrl: string | null;
      variationGroups?: any[];
    };
  }>;
}

interface OrderSummary {
  menuItem: {
    id: string;
    name: string;
    description: string;
    category: string;
    imageUrl: string | null;
  };
  totalQuantity: number;
  orders: Array<{
    orderId: string;
    orderItemId: string;
    orderNumber: string;
    quantity: number;
    customizations: any;
    selectedVariations: any;
    customerName: string;
    fulfillmentStatus: string;
    menuItem?: {
      variationGroups?: any[];
    };
  }>;
}

interface DailyStats {
  totalOrders: number;
  totalRevenue: number;
  ordersByStatus: {
    PLACED: number;
    PARTIALLY_FULFILLED: number;
    FULFILLED: number;
  };
  ordersByPayment: {
    PENDING: number;
    COMPLETED: number;
    FAILED: number;
    REFUNDED: number;
  };
}

const KitchenDashboard = () => {
  const { user } = useAuth();
  const { locations, selectedLocation, selectLocation, isLoading: locationsLoading } = useLocationContext();
  const [tabValue, setTabValue] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<OrderSummary[]>([]);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [flashingCards, setFlashingCards] = useState<Record<string, boolean>>({});
  const [flashingRows, setFlashingRows] = useState<Record<string, boolean>>({});
  const cardPositions = useRef<Record<string, { top: number; height: number }>>({});

  useEffect(() => {
    if (selectedLocation) {
      loadData();
    }
  }, [selectedDate, statusFilter, selectedLocation]);

  const loadData = async () => {
    if (!selectedLocation) return;

    try {
      setLoading(true);
      setError('');

      // Build query params
      const params: any = { date: selectedDate, locationId: selectedLocation.id };
      if (statusFilter !== 'all') {
        params.fulfillmentStatus = statusFilter;
      }

      // Load orders, summary, and stats in parallel
      const [ordersRes, summaryRes, statsRes] = await Promise.all([
        api.get('/kitchen/orders', { params }),
        api.get('/kitchen/summary', { params: { date: selectedDate, locationId: selectedLocation.id } }),
        api.get('/kitchen/stats', { params: { date: selectedDate, locationId: selectedLocation.id } })
      ]);

      setOrders(ordersRes.data.data || []);
      setSummary(summaryRes.data.data || []);
      setStats(statsRes.data.data || null);
    } catch (err: any) {
      console.error('Error loading kitchen data:', err);
      setError(err.response?.data?.message || 'Failed to load kitchen data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await api.patch(`/kitchen/orders/${orderId}/status`, { status: newStatus });

      // Update state locally instead of reloading
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? {
                ...order,
                fulfillmentStatus: newStatus as 'PLACED' | 'PARTIALLY_FULFILLED' | 'FULFILLED',
                orderItems: order.orderItems.map(item => ({
                  ...item,
                  fulfillmentStatus: newStatus as 'PLACED' | 'FULFILLED'
                }))
              }
            : order
        )
      );

      // Update summary
      setSummary(prevSummary =>
        prevSummary.map(summaryItem => ({
          ...summaryItem,
          orders: summaryItem.orders.map(orderRef =>
            orderRef.orderId === orderId
              ? { ...orderRef, fulfillmentStatus: newStatus }
              : orderRef
          )
        }))
      );
    } catch (err: any) {
      console.error('Error updating order status:', err);
      setError(err.response?.data?.message || 'Failed to update order status');
    }
  };

  const handleItemStatusChange = async (orderItemId: string, newStatus: string) => {
    try {
      // Trigger flash effect on the specific row
      setFlashingRows(prev => ({ ...prev, [orderItemId]: true }));

      // Remove flash effect after animation completes
      setTimeout(() => {
        setFlashingRows(prev => ({ ...prev, [orderItemId]: false }));
      }, 600);

      await api.patch(`/kitchen/order-items/${orderItemId}/status`, { status: newStatus });

      // Update state locally instead of reloading
      setOrders(prevOrders =>
        prevOrders.map(order => {
          // Find if this order contains the item
          const hasItem = order.orderItems.some(item => item.id === orderItemId);
          if (!hasItem) return order;

          // Update the item status
          const updatedItems = order.orderItems.map(item =>
            item.id === orderItemId
              ? { ...item, fulfillmentStatus: newStatus as 'PLACED' | 'FULFILLED' }
              : item
          );

          // Calculate new order status
          const allItemsFulfilled = updatedItems.every(item => item.fulfillmentStatus === 'FULFILLED');
          const anyItemFulfilled = updatedItems.some(item => item.fulfillmentStatus === 'FULFILLED');

          let newOrderStatus: 'PLACED' | 'PARTIALLY_FULFILLED' | 'FULFILLED';
          if (allItemsFulfilled) {
            newOrderStatus = 'FULFILLED';
          } else if (anyItemFulfilled) {
            newOrderStatus = 'PARTIALLY_FULFILLED';
          } else {
            newOrderStatus = 'PLACED';
          }

          return {
            ...order,
            orderItems: updatedItems,
            fulfillmentStatus: newOrderStatus
          };
        })
      );

      // Update summary if on batch view
      setSummary(prevSummary =>
        prevSummary.map(summaryItem => ({
          ...summaryItem,
          orders: summaryItem.orders.map(orderRef => {
            // Find the order in the orders array
            const order = orders.find(o => o.id === orderRef.orderId);
            if (!order) return orderRef;

            const item = order.orderItems.find(i => i.id === orderItemId);
            if (!item) return orderRef;

            return {
              ...orderRef,
              fulfillmentStatus: newStatus
            };
          })
        }))
      );

      // Update stats
      if (stats) {
        setStats(prevStats => {
          if (!prevStats) return prevStats;

          // This is approximate - ideally we'd recalculate from the updated orders
          // But for now just update the pending count
          const updatedStats = { ...prevStats };

          return updatedStats;
        });
      }
    } catch (err: any) {
      console.error('Error updating order item status:', err);
      setError(err.response?.data?.message || 'Failed to update order item status');
    }
  };

  const handleBatchFulfillment = async (menuItemId: string) => {
    try {
      // Trigger flash effect
      setFlashingCards(prev => ({ ...prev, [menuItemId]: true }));

      // Find all order items for this menu item that are not fulfilled
      const orderItemsToFulfill: string[] = [];

      orders.forEach(order => {
        order.orderItems.forEach(item => {
          if (item.menuItem?.id === menuItemId && item.fulfillmentStatus === 'PLACED') {
            orderItemsToFulfill.push(item.id);
          }
        });
      });

      // Update all items in parallel
      await Promise.all(
        orderItemsToFulfill.map(itemId =>
          api.patch(`/kitchen/order-items/${itemId}/status`, { status: 'FULFILLED' })
        )
      );

      // Update state locally instead of reloading
      setOrders(prevOrders =>
        prevOrders.map(order => {
          // Check if this order has any items for this menu item
          const hasMenuItem = order.orderItems.some(item => item.menuItem?.id === menuItemId);
          if (!hasMenuItem) return order;

          // Update all items for this menu item to FULFILLED
          const updatedItems = order.orderItems.map(item =>
            item.menuItem?.id === menuItemId
              ? { ...item, fulfillmentStatus: 'FULFILLED' as 'PLACED' | 'FULFILLED' }
              : item
          );

          // Calculate new order status
          const allItemsFulfilled = updatedItems.every(item => item.fulfillmentStatus === 'FULFILLED');
          const anyItemFulfilled = updatedItems.some(item => item.fulfillmentStatus === 'FULFILLED');

          let newOrderStatus: 'PLACED' | 'PARTIALLY_FULFILLED' | 'FULFILLED';
          if (allItemsFulfilled) {
            newOrderStatus = 'FULFILLED';
          } else if (anyItemFulfilled) {
            newOrderStatus = 'PARTIALLY_FULFILLED';
          } else {
            newOrderStatus = 'PLACED';
          }

          return {
            ...order,
            orderItems: updatedItems,
            fulfillmentStatus: newOrderStatus
          };
        })
      );

      // Remove flash effect after animation completes
      setTimeout(() => {
        setFlashingCards(prev => ({ ...prev, [menuItemId]: false }));
      }, 600);
    } catch (err: any) {
      console.error('Error batch fulfilling items:', err);
      setError(err.response?.data?.message || 'Failed to batch fulfill items');
      // Remove flash effect on error too
      setFlashingCards(prev => ({ ...prev, [menuItemId]: false }));
    }
  };

  const getFulfillmentStatusColor = (status: string) => {
    switch (status) {
      case 'PLACED':
        return 'warning';
      case 'PARTIALLY_FULFILLED':
        return 'info';
      case 'FULFILLED':
        return 'success';
      default:
        return 'default';
    }
  };

  const getFulfillmentStatusIcon = (status: string) => {
    switch (status) {
      case 'PLACED':
        return <ScheduleIcon />;
      case 'PARTIALLY_FULFILLED':
        return <RestaurantIcon />;
      case 'FULFILLED':
        return <CheckCircleIcon />;
      default:
        return null;
    }
  };

  // Check if user has kitchen/admin role
  if (!user || (user.role !== 'KITCHEN' && user.role !== 'ADMIN')) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error">
          You do not have permission to access the kitchen dashboard.
        </Alert>
      </Box>
    );
  }

  return (
    <AdminPageLayout
      title="Kitchen Dashboard"
      subtitle="Monitor fulfillment progress by location and menu item."
      actions={
        <Button
          variant="contained"
          color="primary"
          startIcon={<PrintIcon />}
          onClick={async () => {
            try {
              const response = await api.get(`/kitchen/print?date=${selectedDate}`, {
                headers: { Accept: 'text/html' },
                responseType: 'text',
              });
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(response.data);
                printWindow.document.close();
              }
            } catch (err) {
              console.error('Print error:', err);
              alert('Failed to generate print view. Please try again.');
            }
          }}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Print All
        </Button>
      }
    >

        {/* Date filter and stats */}
        <Paper sx={{ p: { xs: 1.5, sm: 2.5 }, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2.5}>
              <LocationSelector
                locations={locations}
                selectedLocationId={selectedLocation?.id || null}
                onLocationChange={selectLocation}
                isLoading={locationsLoading}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                label="Date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Status Filter</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status Filter"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Orders</MenuItem>
                  <MenuItem value="PLACED">Placed</MenuItem>
                  <MenuItem value="PARTIALLY_FULFILLED">Partially Fulfilled</MenuItem>
                  <MenuItem value="FULFILLED">Fulfilled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {stats && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={4} md={2}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" variant="body2">
                      Total Orders
                    </Typography>
                    <Typography variant="h5">{stats.totalOrders}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4} md={2}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" variant="body2">
                      Revenue
                    </Typography>
                    <Typography variant="h5">
                      ${stats.totalRevenue.toFixed(2)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4} md={2}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" variant="body2">
                      Pending
                    </Typography>
                    <Typography variant="h5">
                      {stats.ordersByStatus.PLACED + stats.ordersByStatus.PARTIALLY_FULFILLED}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Tabs for different views */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label="Group by Item" />
            <Tab label="Order List" />
          </Tabs>
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
          {/* Group by Item View */}
          {tabValue === 0 && (
            <Box>
              {(() => {
                // Filter summary based on status filter
                const filteredSummary = summary.map(item => {
                  // Filter orders within each menu item based on status
                  const filteredOrders = statusFilter === 'all'
                    ? item.orders
                    : item.orders.filter(order => {
                        // Find the actual order to check its status
                        const fullOrder = orders.find(o => o.id === order.orderId);
                        return fullOrder?.fulfillmentStatus === statusFilter;
                      });

                  return {
                    ...item,
                    orders: filteredOrders,
                    totalQuantity: filteredOrders.reduce((sum, order) => sum + order.quantity, 0)
                  };
                }).filter(item => item.orders.length > 0); // Remove items with no matching orders

                // Sort: unfulfilled items first, then fulfilled items
                const sortedSummary = filteredSummary.sort((a, b) => {
                  const aFulfilledCount = orders.reduce((count, order) => {
                    return count + order.orderItems.filter(
                      oi => oi.menuItem?.id === a.menuItem?.id && oi.fulfillmentStatus === 'FULFILLED'
                    ).length;
                  }, 0);
                  const aTotalCount = orders.reduce((count, order) => {
                    return count + order.orderItems.filter(
                      oi => oi.menuItem?.id === a.menuItem?.id
                    ).length;
                  }, 0);
                  const aAllFulfilled = aFulfilledCount === aTotalCount;

                  const bFulfilledCount = orders.reduce((count, order) => {
                    return count + order.orderItems.filter(
                      oi => oi.menuItem?.id === b.menuItem?.id && oi.fulfillmentStatus === 'FULFILLED'
                    ).length;
                  }, 0);
                  const bTotalCount = orders.reduce((count, order) => {
                    return count + order.orderItems.filter(
                      oi => oi.menuItem?.id === b.menuItem?.id
                    ).length;
                  }, 0);
                  const bAllFulfilled = bFulfilledCount === bTotalCount;

                  // Unfulfilled items (false) come before fulfilled items (true)
                  if (aAllFulfilled !== bAllFulfilled) {
                    return aAllFulfilled ? 1 : -1;
                  }
                  return 0;
                });

                return sortedSummary.length === 0 ? (
                  <Alert severity="info">No orders found.</Alert>
                ) : (
                  <Grid container spacing={2} sx={{ position: 'relative' }}>
                    {sortedSummary.map((item, itemIndex) => {
                      // Calculate fulfillment to determine order
                      const fulfilledCount = orders.reduce((count, order) => {
                        return count + order.orderItems.filter(
                          oi => oi.menuItem?.id === item.menuItem?.id && oi.fulfillmentStatus === 'FULFILLED'
                        ).length;
                      }, 0);
                      const totalCount = orders.reduce((count, order) => {
                        return count + order.orderItems.filter(
                          oi => oi.menuItem?.id === item.menuItem?.id
                        ).length;
                      }, 0);
                      const isFullyFulfilled = fulfilledCount === totalCount;

                      return (
                    <Grid
                      item
                      xs={12}
                      key={`summary-${item.menuItem?.id || 'unknown'}-${itemIndex}`}
                      sx={{
                        transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: flashingCards[item.menuItem?.id] ? 'scale(1.02)' : 'scale(1)',
                        order: isFullyFulfilled ? 1000 + itemIndex : itemIndex,
                      }}
                    >
                      {(() => {
                        // Calculate fulfillment progress
                        const fulfilledCount = orders.reduce((count, order) => {
                          return count + order.orderItems.filter(
                            oi => oi.menuItem?.id === item.menuItem?.id && oi.fulfillmentStatus === 'FULFILLED'
                          ).length;
                        }, 0);
                        const totalCount = orders.reduce((count, order) => {
                          return count + order.orderItems.filter(
                            oi => oi.menuItem?.id === item.menuItem?.id
                          ).length;
                        }, 0);
                        const hasUnfulfilledItems = fulfilledCount < totalCount;
                        const isFullyFulfilled = !hasUnfulfilledItems;

                        return (
                          <Card
                            sx={{
                              transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                              backgroundColor: flashingCards[item.menuItem?.id]
                                ? 'rgba(76, 175, 80, 0.15)'
                                : isFullyFulfilled
                                ? 'rgba(76, 175, 80, 0.08)'
                                : 'white',
                              boxShadow: flashingCards[item.menuItem?.id]
                                ? '0 4px 20px rgba(76, 175, 80, 0.4)'
                                : undefined,
                            }}
                          >
                            <CardContent>
                              {(() => {
                                const isExpanded = expandedCards[item.menuItem?.id] ?? false;

                                return (
                                  <>
                                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 }, mb: 2 }}>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
                                    <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>{item.menuItem?.name}</Typography>
                                    <Chip
                                      label={item.menuItem?.category}
                                      size="small"
                                      variant="outlined"
                                      sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                    />
                                    <Chip
                                      label={`${fulfilledCount} of ${totalCount} fulfilled`}
                                      size="small"
                                      color={hasUnfulfilledItems ? 'warning' : 'success'}
                                      variant="outlined"
                                      sx={{
                                        fontWeight: 'bold',
                                        fontSize: { xs: '0.7rem', sm: '0.8rem' }
                                      }}
                                    />
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: { xs: 'flex-end', sm: 'center' }, width: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'space-between', sm: 'flex-end' } }}>
                                    <Box sx={{ textAlign: 'right' }}>
                                      <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold', display: 'inline', fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                                        {item.totalQuantity}
                                      </Typography>
                                      <Typography variant="body1" color="primary" sx={{ display: 'inline', ml: 0.5, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                                        in total
                                      </Typography>
                                    </Box>
                                    {!hasUnfulfilledItems && (
                                      <IconButton
                                        size="small"
                                        onClick={() => setExpandedCards(prev => ({
                                          ...prev,
                                          [item.menuItem?.id]: !isExpanded
                                        }))}
                                      >
                                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                      </IconButton>
                                    )}
                                  </Box>
                                </Box>

                                {/* Batch fulfillment button */}
                                {hasUnfulfilledItems && (
                                  <Box sx={{ mb: 2 }}>
                                    <Button
                                      variant="contained"
                                      size="small"
                                      color="success"
                                      fullWidth
                                      startIcon={<CheckCircleIcon />}
                                      onClick={() => handleBatchFulfillment(item.menuItem?.id)}
                                      sx={{ color: 'white' }}
                                    >
                                      Mark All {item.menuItem?.name} as Fulfilled
                                    </Button>
                                  </Box>
                                )}
                              </>
                            );
                          })()}

                          <Collapse in={(() => {
                            const fulfilledCount = orders.reduce((count, order) => {
                              return count + order.orderItems.filter(
                                oi => oi.menuItem?.id === item.menuItem?.id && oi.fulfillmentStatus === 'FULFILLED'
                              ).length;
                            }, 0);
                            const totalCount = orders.reduce((count, order) => {
                              return count + order.orderItems.filter(
                                oi => oi.menuItem?.id === item.menuItem?.id
                              ).length;
                            }, 0);
                            const hasUnfulfilledItems = fulfilledCount < totalCount;
                            const isExpanded = expandedCards[item.menuItem?.id] ?? false;

                            // Always show if has unfulfilled items, otherwise check expanded state
                            return hasUnfulfilledItems || isExpanded;
                          })()}>
                            <Divider sx={{ my: 2 }} />

                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                              {item.orders.sort((a, b) => {
                                // Sort unfulfilled items first
                                const aOrder = orders.find(o => o.id === a.orderId);
                                const aItem = aOrder?.orderItems.find(oi => oi.id === a.orderItemId);
                                const aStatus = aItem?.fulfillmentStatus || 'PLACED';

                                const bOrder = orders.find(o => o.id === b.orderId);
                                const bItem = bOrder?.orderItems.find(oi => oi.id === b.orderItemId);
                                const bStatus = bItem?.fulfillmentStatus || 'PLACED';

                                if (aStatus === 'PLACED' && bStatus === 'FULFILLED') return -1;
                                if (aStatus === 'FULFILLED' && bStatus === 'PLACED') return 1;
                                return 0;
                              }).map((order, index) => {
                                // Find the actual order to get the item status
                                const fullOrder = orders.find(o => o.id === order.orderId);
                                const orderItem = fullOrder?.orderItems.find(
                                  oi => oi.id === order.orderItemId
                                );
                                const itemStatus = orderItem?.fulfillmentStatus || 'PLACED';

                                return (
                                  <Box
                                    key={order.orderItemId}
                                  sx={{
                                    display: 'grid',
                                    gridTemplateColumns: {
                                      xs: '1fr',
                                      sm: '120px 50px 1fr auto',
                                      md: '160px 70px 1fr auto'
                                    },
                                    gap: { xs: 1, md: 2 },
                                    alignItems: 'center',
                                    py: 1.5,
                                    px: { xs: 1, md: 2 },
                                    backgroundColor: flashingRows[orderItem?.id || '']
                                      ? 'rgba(76, 175, 80, 0.2)'
                                      : index % 2 === 0
                                      ? 'transparent'
                                      : 'rgba(0, 0, 0, 0.02)',
                                    transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                    transform: flashingRows[orderItem?.id || ''] ? 'scale(1.01)' : 'scale(1)',
                                    boxShadow: flashingRows[orderItem?.id || '']
                                      ? '0 2px 10px rgba(76, 175, 80, 0.3)'
                                      : 'none',
                                    '&:hover': {
                                      backgroundColor: flashingRows[orderItem?.id || '']
                                        ? 'rgba(76, 175, 80, 0.2)'
                                        : 'rgba(0, 0, 0, 0.04)'
                                    }
                                  }}
                                >
                                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                    {order.orderNumber}
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                                    {order.quantity}x
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                    <Typography variant="body2" color="text.primary" sx={{ fontWeight: 'medium' }}>
                                      {order.customerName}
                                    </Typography>
                                    {order.selectedVariations && order.selectedVariations.variations && order.selectedVariations.variations.length > 0 && (
                                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75, ml: 1 }}>
                                        {order.selectedVariations.variations.map((variation: any, idx: number) => (
                                          <Chip
                                            key={idx}
                                            label={`${variation.groupName}: ${variation.optionName}`}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                          />
                                        ))}
                                      </Box>
                                    )}
                                    {order.customizations && order.customizations.customizations && (
                                      <Typography variant="caption" color="text.secondary" sx={{ width: '100%' }}>
                                        {order.customizations.customizations.join(', ')}
                                      </Typography>
                                    )}
                                  </Box>
                                  {itemStatus === 'FULFILLED' ? (
                                    <Chip
                                      label="Done"
                                      color="success"
                                      size="small"
                                      variant="outlined"
                                    />
                                  ) : (
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      color="success"
                                      startIcon={<CheckCircleIcon fontSize="small" />}
                                      onClick={() => handleItemStatusChange(orderItem?.id || '', 'FULFILLED')}
                                      sx={{
                                        fontWeight: 500,
                                        borderRadius: 999,
                                        px: 1.5,
                                      }}
                                    >
                                      Mark fulfilled
                                    </Button>
                                  )}
                                </Box>
                              );
                            })}
                            </Box>
                          </Collapse>
                        </CardContent>
                      </Card>
                        );
                      })()}
                    </Grid>
                      );
                    })}
                  </Grid>
                );
              })()}
            </Box>
          )}

          {/* Order List View */}
          {tabValue === 1 && (
            <Box>
              {orders.length === 0 ? (
                <Alert severity="info">No orders found for the selected date and filters.</Alert>
              ) : (
                <Grid container spacing={2}>
                  {orders
                    .slice()
                    .sort((a, b) => {
                      // Prioritize unfulfilled/partially fulfilled orders
                      const priorityA = a.fulfillmentStatus === 'FULFILLED' ? 1 : 0;
                      const priorityB = b.fulfillmentStatus === 'FULFILLED' ? 1 : 0;
                      return priorityA - priorityB;
                    })
                    .map((order) => (
                    <Grid item xs={12} key={order.id}>
                      <Card
                        sx={{
                          backgroundColor: order.fulfillmentStatus === 'FULFILLED'
                            ? 'rgba(76, 175, 80, 0.08)'
                            : 'white',
                        }}
                      >
                        <CardContent>
                          <Box sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            justifyContent: 'space-between',
                            gap: { xs: 1, sm: 0 },
                            mb: 2
                          }}>
                            <Box>
                              <Typography variant="h6">{order.orderNumber}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {order.user
                                  ? `${order.user.fullName} (${order.user.email})`
                                  : `${order.guestFirstName} ${order.guestLastName} (${order.guestEmail}) - Guest`
                                }
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {new Date(order.createdAt).toLocaleTimeString()}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                              <Typography variant="h6" color="primary">
                                ${Number(order.totalAmount).toFixed(2)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                {order.fulfillmentStatus === 'FULFILLED'
                                  ? 'All items fulfilled'
                                  : order.fulfillmentStatus === 'PARTIALLY_FULFILLED'
                                  ? 'In progress'
                                  : 'Pending'}
                              </Typography>
                            </Box>
                          </Box>

                          <Divider sx={{ my: 2 }} />

                          {/* Order items */}
                          <Stack spacing={2} sx={{ mb: 2 }}>
                            {order.orderItems.map((item) => (
                              <Box key={item.id} sx={{
                                p: 1.5,
                                border: order.fulfillmentStatus === 'FULFILLED'
                                  ? '1px solid transparent'
                                  : '1px solid #e0e0e0',
                                borderRadius: 1,
                                backgroundColor: order.fulfillmentStatus === 'FULFILLED'
                                  ? 'transparent'
                                  : item.fulfillmentStatus === 'FULFILLED'
                                  ? 'rgba(76, 175, 80, 0.08)'
                                  : 'transparent'
                              }}>
                                <Box sx={{
                                  display: 'flex',
                                  flexDirection: { xs: 'column', sm: 'row' },
                                  justifyContent: 'space-between',
                                  alignItems: { xs: 'flex-start', sm: 'flex-start' },
                                  mb: 1
                                }}>
                                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                    <Typography variant="body1">
                                      <strong>{item.quantity}x</strong> {item.menuItem?.name || 'Deleted Item'}
                                    </Typography>
                                    {item.selectedVariations && item.selectedVariations.variations && item.selectedVariations.variations.length > 0 && (
                                      <>
                                        {item.selectedVariations.variations.map((variation: any, idx: number) => (
                                          <Chip
                                            key={idx}
                                            label={`${variation.groupName}: ${variation.optionName}`}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                          />
                                        ))}
                                      </>
                                    )}
                                    {item.customizations && (item.customizations.customizations || item.customizations.specialRequests) && (
                                      <Typography variant="body2" color="text.secondary" sx={{ width: '100%', mt: 0.5 }}>
                                        {item.customizations.customizations &&
                                          `Customizations: ${item.customizations.customizations.join(', ')}`}
                                        {item.customizations.specialRequests &&
                                          ` | Special: ${item.customizations.specialRequests}`}
                                      </Typography>
                                    )}
                                  </Box>
                                  {item.fulfillmentStatus === 'FULFILLED' ? (
                                    <Chip
                                      icon={<CheckCircleIcon />}
                                      label="FULFILLED"
                                      color="success"
                                      size="small"
                                      variant="outlined"
                                      sx={{ ml: 2 }}
                                    />
                                  ) : (
                                    <Button
                                      variant="outlined"
                                      size="small"
                                      color="success"
                                      startIcon={<CheckCircleIcon fontSize="small" />}
                                      onClick={() => handleItemStatusChange(item.id, 'FULFILLED')}
                                      sx={{ ml: 2, flexShrink: 0, borderRadius: 999, px: 1.5, fontWeight: 500 }}
                                    >
                                      Mark fulfilled
                                    </Button>
                                  )}
                                </Box>
                              </Box>
                            ))}
                          </Stack>

                          {order.specialRequests && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                              <strong>Special Requests:</strong> {order.specialRequests}
                            </Alert>
                          )}

                          {/* Quick action: Mark all items as fulfilled */}
                          {order.fulfillmentStatus !== 'FULFILLED' &&
                           order.orderItems.some(item => item.fulfillmentStatus === 'PLACED') && (
                            <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed #e0e0e0' }}>
                              <Button
                                variant="outlined"
                                size="small"
                                color="success"
                                startIcon={<CheckCircleIcon />}
                                onClick={() => handleStatusChange(order.id, 'FULFILLED')}
                              >
                                Mark All Items as Fulfilled
                              </Button>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}
          </>
        )}
    </AdminPageLayout>
  );
};

export default KitchenDashboard;
