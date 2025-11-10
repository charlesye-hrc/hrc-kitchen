import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from 'axios';

interface OrderItem {
  id: string;
  quantity: number;
  priceAtPurchase: number;
  customizations: any | null;
  menuItem: {
    name: string;
    description: string | null;
    price: number;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  paymentStatus: string;
  fulfillmentStatus: string;
  specialRequests: string | null;
  orderDate: string;
  createdAt: string;
  paymentId: string | null;
  orderItems: OrderItem[];
}

const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { token, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guest checkout state from navigation
  const isGuest = location.state?.isGuest || false;
  const guestEmail = location.state?.guestEmail;
  const guestName = location.state?.guestName;

  // Account creation dialog
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        let response;
        if (isAuthenticated) {
          // Authenticated user
          response = await axios.get(
            `${import.meta.env.VITE_API_URL}/orders/${orderId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        } else {
          // Guest order
          response = await axios.get(
            `${import.meta.env.VITE_API_URL}/orders/guest/${orderId}`
          );
        }

        setOrder(response.data.data);

        // Show account creation dialog for guests after successful order fetch
        if (isGuest && guestEmail) {
          setShowAccountDialog(true);
        }
      } catch (err: any) {
        console.error('Failed to fetch order:', err);
        setError(err.response?.data?.message || 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId, token, isAuthenticated, isGuest, guestEmail]);

  const handleCreateAccount = async () => {
    if (!password || !confirmPassword) {
      setAccountError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setAccountError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setAccountError('Password must be at least 8 characters');
      return;
    }

    setAccountLoading(true);
    setAccountError(null);

    try {
      // Extract first and last name
      const [firstName = '', ...lastNameParts] = (guestName || '').split(' ');
      const lastName = lastNameParts.join(' ') || '';

      // Register the account
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, {
        email: guestEmail,
        password,
        fullName: guestName || `${firstName} ${lastName}`.trim(),
      });

      // Auto-login
      await login(guestEmail!, password);

      setShowAccountDialog(false);
      // Show success message
      alert('Account created successfully! You are now logged in.');
    } catch (err: any) {
      console.error('Account creation failed:', err);
      setAccountError(err.response?.data?.message || 'Failed to create account');
    } finally {
      setAccountLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading order details...
        </Typography>
      </Container>
    );
  }

  if (error || !order) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Order not found'}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/menu')}>
          Back to Menu
        </Button>
      </Container>
    );
  }

  const deliveryDate = new Date(order.orderDate);
  const orderCreatedDate = new Date(order.createdAt);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
      <Paper sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
            Order Confirmed!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Thank you for your order. Your lunch will be prepared for{' '}
            {deliveryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Order Details
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Order Number
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {order.orderNumber}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">
                Payment Status
              </Typography>
              <Chip
                label={order.paymentStatus.replace('_', ' ')}
                color={order.paymentStatus === 'COMPLETED' ? 'success' : 'warning'}
                size="small"
              />
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">
                Ordered At
              </Typography>
              <Typography variant="body1">
                {orderCreatedDate.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Amount
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                ${Number(order.totalAmount).toFixed(2)}
              </Typography>
            </Box>
          </Box>

          {order.specialRequests && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Special Requests
              </Typography>
              <Typography variant="body1">{order.specialRequests}</Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Items Ordered
          </Typography>

          <List>
            {order.orderItems.map((item) => {
              const subtotal = Number(item.priceAtPurchase) * item.quantity;
              return (
                <ListItem key={item.id} sx={{ px: 0 }}>
                  <ListItemText
                    primary={`${item.menuItem.name} × ${item.quantity}`}
                    secondary={
                      <>
                        {item.customizations?.customizations && (
                          <Typography variant="body2" color="text.secondary">
                            Customizations: {item.customizations.customizations}
                          </Typography>
                        )}
                        {item.customizations?.specialRequests && (
                          <Typography variant="body2" color="text.secondary">
                            Special Requests: {item.customizations.specialRequests}
                          </Typography>
                        )}
                      </>
                    }
                  />
                  <Typography variant="body1">${subtotal.toFixed(2)}</Typography>
                </ListItem>
              );
            })}
          </List>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">Total:</Typography>
            <Typography variant="h6">${Number(order.totalAmount).toFixed(2)}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'center', mt: 4 }}>
          <Button variant="outlined" onClick={() => navigate('/menu')}>
            Order Again
          </Button>
          {isAuthenticated && (
            <Button variant="contained" onClick={() => navigate('/orders')}>
              View All Orders
            </Button>
          )}
        </Box>
      </Paper>

      {/* Account Creation Dialog for Guests */}
      <Dialog open={showAccountDialog} onClose={() => setShowAccountDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Create an Account</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Save time on future orders! Create an account to skip entering your information next time.
          </Typography>

          {accountError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {accountError}
            </Alert>
          )}

          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Email:</strong> {guestEmail}
          </Typography>

          <TextField
            fullWidth
            type="password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={accountLoading}
            helperText="Minimum 8 characters"
            sx={{ mb: 2, mt: 2 }}
          />

          <TextField
            fullWidth
            type="password"
            label="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={accountLoading}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAccountDialog(false)} disabled={accountLoading}>
            Skip for Now
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateAccount}
            disabled={accountLoading}
          >
            {accountLoading ? <CircularProgress size={24} /> : 'Create Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OrderConfirmationPage;
