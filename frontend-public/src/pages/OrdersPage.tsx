import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Divider,
  Button,
  TextField,
  Grid,
  Pagination,
} from '@mui/material';
//import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface OrderItem {
  id: string;
  quantity: number;
  priceAtPurchase: number;
  selectedVariations?: any;
  // Relation (null if menu item deleted)
  menuItem?: {
    name: string;
  } | null;
  // Snapshots (preserved even after deletion)
  itemName?: string | null;
  itemDescription?: string | null;
  itemCategory?: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  orderDate: string;
  createdAt: string;
  orderItems: OrderItem[];
  // Relation (null if location deleted)
  location?: {
    id: string;
    name: string;
    address?: string;
  } | null;
  // Snapshots (preserved even after deletion)
  locationName?: string | null;
  locationAddress?: string | null;
}

interface PaginationData {
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

const OrdersPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    totalPages: 1,
    limit: 20
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const params: any = {
          page: currentPage,
          limit: 20
        };

        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/orders`,
          {
            withCredentials: true,
            params
          }
        );

        setOrders(response.data.data);
        setPagination(response.data.pagination);
      } catch (err: any) {
        console.error('Failed to fetch orders:', err);
        setError(err.response?.data?.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, currentPage, startDate, endDate]);

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="info">
          Please sign in to view your past orders.
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        </Box>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading your orders...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/menu')}>
          Back to Menu
        </Button>
      </Container>
    );
  }

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{
          fontSize: { xs: '1.875rem', md: '2.25rem' },
          fontWeight: 700,
          mb: 3,
          background: 'linear-gradient(135deg, #2D5F3F 0%, #4A8862 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        My Orders
      </Typography>

      {/* Date Range Filters */}
      <Paper
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Showing {orders.length} of {pagination.total} orders
        </Typography>
      </Paper>

      {orders.length === 0 ? (
        <Paper
          sx={{
            p: 5,
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'grey.100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              mb: 2,
            }}
          >
            <Typography variant="h3">📋</Typography>
          </Box>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
            No Orders Yet
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
            You haven't placed any orders yet
          </Typography>
          <Button variant="contained" onClick={() => navigate('/menu')} sx={{ py: 1.25, px: 3 }}>
            Browse Menu
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {orders.map((order) => {
            const orderDate = new Date(order.orderDate);
            const createdDate = new Date(order.createdAt);

            return (
              <Card
                key={order.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                  <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'flex-start' },
                    gap: { xs: 2, sm: 3 },
                    mb: 2.5
                  }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                        {order.orderNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Ordered on {createdDate.toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        For {orderDate.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Typography>
                      {(order.location?.name || order.locationName) && (
                        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box component="span" sx={{ fontWeight: 500 }}>📍</Box>
                          {order.location?.name || order.locationName}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', mb: 1.5 }}>
                        ${Number(order.totalAmount).toFixed(2)}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Chip
                          label={order.paymentStatus}
                          color={order.paymentStatus === 'COMPLETED' ? 'success' : 'warning'}
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                        <Chip
                          label={order.fulfillmentStatus}
                          color={
                            order.fulfillmentStatus === 'READY'
                              ? 'success'
                              : order.fulfillmentStatus === 'PREPARING'
                              ? 'info'
                              : 'default'
                          }
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2.5 }} />

                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mb: 1.5 }}>
                    Items:
                  </Typography>
                  <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2 }}>
                    {order.orderItems.map((item, index) => (
                      <Box
                        key={item.id}
                        sx={{
                          py: 1,
                          ...(index !== order.orderItems.length - 1 && {
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                          })
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: item.selectedVariations ? 0.5 : 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {item.menuItem?.name || item.itemName || 'Unknown Item'} × {item.quantity}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            ${(Number(item.priceAtPurchase) * item.quantity).toFixed(2)}
                          </Typography>
                        </Box>
                        {item.selectedVariations && item.selectedVariations.variations && item.selectedVariations.variations.length > 0 && (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                            {item.selectedVariations.variations.map((variation: any, idx: number) => (
                              <Chip
                                key={idx}
                                label={`${variation.groupName}: ${variation.optionName}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: '20px' }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>

                  <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      onClick={() => navigate(`/order-confirmation/${order.id}`)}
                      sx={{ py: 1, px: 2.5 }}
                    >
                      View Details
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            );
          })}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={pagination.totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </Box>
      )}
    </Container>
  );
};

export default OrdersPage;
