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
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface OrderItem {
  id: string;
  quantity: number;
  priceAtPurchase: number;
  menuItem: {
    name: string;
  };
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
}

interface PaginationData {
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

const OrdersPage: React.FC = () => {
  const { token } = useAuth();
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
            headers: {
              Authorization: `Bearer ${token}`,
            },
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

    if (token) {
      fetchOrders();
    }
  }, [token, currentPage, startDate, endDate]);

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
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontSize: { xs: '1.75rem', md: '2.125rem' } }}>
        My Orders
      </Typography>

      {/* Date Range Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
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
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            You haven't placed any orders yet
          </Typography>
          <Button variant="contained" onClick={() => navigate('/menu')} sx={{ mt: 2 }}>
            Browse Menu
          </Button>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {orders.map((order) => {
            const orderDate = new Date(order.orderDate);
            const createdDate = new Date(order.createdAt);

            return (
              <Card key={order.id}>
                <CardContent>
                  <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'flex-start' },
                    gap: { xs: 1, sm: 0 },
                    mb: 2
                  }}>
                    <Box>
                      <Typography variant="h6">{order.orderNumber}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Ordered on {createdDate.toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        For {orderDate.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                      <Typography variant="h6" color="primary">
                        ${Number(order.totalAmount).toFixed(2)}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        <Chip
                          label={order.paymentStatus}
                          color={order.paymentStatus === 'COMPLETED' ? 'success' : 'warning'}
                          size="small"
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
                        />
                      </Box>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" gutterBottom>
                    Items:
                  </Typography>
                  {order.orderItems.map((item) => (
                    <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2">
                        {item.menuItem.name} × {item.quantity}
                      </Typography>
                      <Typography variant="body2">
                        ${(Number(item.priceAtPurchase) * item.quantity).toFixed(2)}
                      </Typography>
                    </Box>
                  ))}

                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/order-confirmation/${order.id}`)}
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
