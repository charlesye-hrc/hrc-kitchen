import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import type { PaymentRequest } from '@stripe/stripe-js';
import axios from 'axios';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const CheckoutForm: React.FC = () => {
  const { items, clearCart, getCartTotal, calculateItemPrice } = useCart();
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderingWindow, setOrderingWindow] = useState<any>(null);
  const [checkingWindow, setCheckingWindow] = useState(true);

  // Guest checkout fields
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  // Email exists dialog
  const [showEmailExistsDialog, setShowEmailExistsDialog] = useState(false);

  // Payment Request Button (Apple Pay / Google Pay)
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [canMakePayment, setCanMakePayment] = useState(false);

  const cartTotal = getCartTotal();

  // Check ordering window on page load
  useEffect(() => {
    const checkOrderingWindow = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/menu/today`);
        const windowData = response.data.data.orderingWindow;
        setOrderingWindow(windowData);

        // If ordering window is closed, redirect to menu with error
        if (windowData && !windowData.active) {
          setError('Ordering is currently closed. You cannot proceed with checkout at this time.');
          setTimeout(() => {
            navigate('/menu');
          }, 3000);
        }
      } catch (err) {
        console.error('Error checking ordering window:', err);
      } finally {
        setCheckingWindow(false);
      }
    };

    checkOrderingWindow();
  }, [navigate]);

  // Initialize Payment Request Button for Apple Pay / Google Pay
  useEffect(() => {
    if (!stripe) {
      return;
    }

    const pr = stripe.paymentRequest({
      country: 'AU',
      currency: 'aud',
      total: {
        label: 'HRC Kitchen Order',
        amount: Math.round(cartTotal * 100), // Convert to cents
      },
      requestPayerName: !isAuthenticated,
      requestPayerEmail: !isAuthenticated,
    });

    // Check if browser supports Apple Pay or Google Pay
    pr.canMakePayment().then((result) => {
      console.log('Payment Request canMakePayment result:', result);
      if (result) {
        setPaymentRequest(pr);
        setCanMakePayment(true);
      } else {
        console.log('Apple Pay/Google Pay not available on this device/browser');
      }
    });

    // Handle payment method
    pr.on('paymentmethod', async (event) => {
      setLoading(true);
      setError(null);

      try {
        // For guest checkout, extract payer info from payment request
        const payerEmail = event.payerEmail || guestEmail;
        const payerName = event.payerName || '';
        const [firstName, ...lastNameParts] = payerName.split(' ');
        const lastName = lastNameParts.join(' ');

        // Validate guest info for payment request
        if (!isAuthenticated) {
          if (!payerEmail || !firstName) {
            event.complete('fail');
            setError('Payment method must provide name and email for guest checkout');
            setLoading(false);
            return;
          }
        }

        // Create order and get payment intent
        const orderData = {
          items: items.map(item => ({
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            customizations: item.customizations.join(', '),
            specialRequests: item.specialRequests,
            selectedVariations: item.selectedVariations || [],
          })),
          deliveryNotes: deliveryNotes || undefined,
        };

        let response;
        if (isAuthenticated) {
          // Authenticated order
          response = await axios.post(
            `${import.meta.env.VITE_API_URL}/orders`,
            orderData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        } else {
          // Guest order
          response = await axios.post(
            `${import.meta.env.VITE_API_URL}/orders/guest`,
            {
              ...orderData,
              guestInfo: {
                firstName: firstName || guestFirstName,
                lastName: lastName || guestLastName,
                email: payerEmail,
              },
            }
          );
        }

        const { order, clientSecret } = response.data.data;

        // Confirm payment with Stripe
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: event.paymentMethod.id },
          { handleActions: false }
        );

        if (confirmError) {
          event.complete('fail');
          throw new Error(confirmError.message);
        }

        if (paymentIntent?.status === 'succeeded') {
          event.complete('success');
          clearCart();
          navigate(`/order-confirmation/${order.id}`, {
            state: {
              isGuest: !isAuthenticated,
              guestEmail: payerEmail,
              guestName: payerName || `${guestFirstName} ${guestLastName}`
            }
          });
        } else {
          event.complete('fail');
          throw new Error('Payment did not succeed');
        }
      } catch (err: any) {
        console.error('Payment Request error:', err);
        event.complete('fail');

        // Check if error is due to existing email
        if (err.response?.data?.code === 'EMAIL_EXISTS') {
          setShowEmailExistsDialog(true);
          setError(null);
        } else {
          setError(err.response?.data?.message || err.message || 'Payment failed. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    });
  }, [stripe, cartTotal, isAuthenticated, items, deliveryNotes, token, navigate, clearCart, guestFirstName, guestLastName, guestEmail]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    // Validate guest info if not authenticated
    if (!isAuthenticated) {
      if (!guestFirstName || !guestLastName || !guestEmail) {
        setError('Please fill in all guest information fields');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
        setError('Please enter a valid email address');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Create order and get payment intent
      const orderData = {
        items: items.map(item => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          customizations: item.customizations.join(', '),
          specialRequests: item.specialRequests,
          selectedVariations: item.selectedVariations || [],
        })),
        deliveryNotes: deliveryNotes || undefined,
      };

      let response;
      if (isAuthenticated) {
        // Authenticated order
        response = await axios.post(
          `${import.meta.env.VITE_API_URL}/orders`,
          orderData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else {
        // Guest order
        response = await axios.post(
          `${import.meta.env.VITE_API_URL}/orders/guest`,
          {
            ...orderData,
            guestInfo: {
              firstName: guestFirstName,
              lastName: guestLastName,
              email: guestEmail,
            },
          }
        );
      }

      const { order, clientSecret } = response.data.data;

      // Confirm payment with Stripe
      const cardElement = elements.getElement(CardElement);

      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent?.status === 'succeeded') {
        // Payment successful
        clearCart();
        navigate(`/order-confirmation/${order.id}`, {
          state: {
            isGuest: !isAuthenticated,
            guestEmail: guestEmail || undefined,
            guestName: `${guestFirstName} ${guestLastName}` || undefined
          }
        });
      }
    } catch (err: any) {
      console.error('Checkout error:', err);

      // Check if error is due to existing email
      if (err.response?.data?.code === 'EMAIL_EXISTS') {
        setShowEmailExistsDialog(true);
        setError(null);
      } else {
        setError(err.response?.data?.message || err.message || 'Payment failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignInFromDialog = () => {
    setShowEmailExistsDialog(false);
    navigate('/login', { state: { from: '/checkout' } });
  };

  if (checkingWindow) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (items.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
        <Alert severity="info">
          Your cart is empty. <Button onClick={() => navigate('/menu')}>Browse Menu</Button>
        </Alert>
      </Container>
    );
  }

  // If ordering is closed, show error and prevent checkout
  if (orderingWindow && !orderingWindow.active) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
        <Alert severity="error">
          {error || 'Ordering is currently closed'}
          <Typography variant="body2" sx={{ mt: 1 }}>
            Redirecting to menu...
          </Typography>
        </Alert>
      </Container>
    );
  }

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
        Checkout
      </Typography>

      <Paper
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2.5 }}>
          Order Summary
        </Typography>

        <List>
          {items.map(item => (
            <ListItem key={item.menuItem.id} sx={{ px: 0, py: { xs: 1.5, sm: 2 }, flexDirection: 'column', alignItems: 'flex-start' }}>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body1" fontWeight="bold">
                  {item.menuItem.name} × {item.quantity}
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  ${(calculateItemPrice(item) * item.quantity).toFixed(2)}
                </Typography>
              </Box>

              <Box sx={{ width: '100%', pl: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  ${calculateItemPrice(item).toFixed(2)} each
                </Typography>

                {/* Display selected variations */}
                {item.selectedVariations && item.selectedVariations.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {item.selectedVariations.map((selection) => {
                      const group = item.menuItem.variationGroups?.find(
                        (g) => g.id === selection.groupId
                      );
                      if (!group) return null;

                      const selectedOptions = selection.optionIds
                        .map((optionId) => group.options.find((o) => o.id === optionId))
                        .filter(Boolean);

                      return (
                        <Typography key={selection.groupId} variant="body2" color="text.secondary">
                          • {group.name}: {selectedOptions.map((opt) =>
                            `${opt!.name}${opt!.priceModifier !== 0 ? ` (+$${Number(opt!.priceModifier).toFixed(2)})` : ''}`
                          ).join(', ')}
                        </Typography>
                      );
                    })}
                  </Box>
                )}

                {item.customizations.length > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    • Customizations: {item.customizations.join(', ')}
                  </Typography>
                )}
                {item.specialRequests && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    • Special Requests: {item.specialRequests}
                  </Typography>
                )}
              </Box>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 3 }} />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
            py: 2,
            px: 2.5,
            bgcolor: 'grey.50',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Total:</Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
            ${cartTotal.toFixed(2)}
          </Typography>
        </Box>

        <TextField
          fullWidth
          label="Delivery Notes (Optional)"
          multiline
          rows={2}
          value={deliveryNotes}
          onChange={(e) => setDeliveryNotes(e.target.value)}
          placeholder="e.g., Office location, special instructions..."
        />
      </Paper>

      <Paper
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2.5 }}>
          {!isAuthenticated ? 'Your Information' : 'Payment Details'}
        </Typography>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderLeft: '4px solid',
              borderLeftColor: 'error.main',
            }}
          >
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {/* Guest Information Form */}
          {!isAuthenticated && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Please provide your information to complete the order
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Already have an account?{' '}
                <Box
                  component="span"
                  onClick={() => navigate('/login', { state: { from: '/checkout' } })}
                  sx={{
                    color: 'primary.main',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontWeight: 500,
                    '&:hover': {
                      color: 'primary.dark',
                    }
                  }}
                >
                  Sign In
                </Box>
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                <TextField
                  required
                  label="First Name"
                  value={guestFirstName}
                  onChange={(e) => setGuestFirstName(e.target.value)}
                  disabled={loading}
                />
                <TextField
                  required
                  label="Last Name"
                  value={guestLastName}
                  onChange={(e) => setGuestLastName(e.target.value)}
                  disabled={loading}
                />
              </Box>
              <TextField
                required
                fullWidth
                type="email"
                label="Email Address"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                disabled={loading}
                helperText="You'll receive order confirmation and receipt at this email"
                sx={{ mb: 2 }}
              />
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Payment Details
              </Typography>
            </Box>
          )}

          {/* Apple Pay / Google Pay Button */}
          {canMakePayment && paymentRequest && (
            <Box sx={{ mb: 3 }}>
              <PaymentRequestButtonElement
                options={{
                  paymentRequest,
                  style: {
                    paymentRequestButton: {
                      type: 'default',
                      theme: 'dark',
                      height: '48px',
                    },
                  },
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                <Divider sx={{ flex: 1 }} />
                <Typography variant="body2" sx={{ px: 2, color: 'text.secondary' }}>
                  OR PAY WITH CARD
                </Typography>
                <Divider sx={{ flex: 1 }} />
              </Box>
            </Box>
          )}

          <Box sx={{ mb: 3, p: 2, border: '1px solid #ccc', borderRadius: 1 }}>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/menu')}
              disabled={loading}
              fullWidth
              sx={{ py: 1.5 }}
            >
              Back to Menu
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={!stripe || loading}
              fullWidth
              sx={{ py: 1.5, fontSize: '1rem' }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : `Pay $${cartTotal.toFixed(2)}`}
            </Button>
          </Box>
        </form>
      </Paper>

      <Box
        sx={{
          mt: 3,
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          color: 'text.secondary',
        }}
      >
        <Box
          component="span"
          sx={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            bgcolor: 'success.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
          }}
        >
          🔒
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          Your payment information is securely processed by Stripe
        </Typography>
      </Box>

      {/* Email Exists Dialog */}
      <Dialog open={showEmailExistsDialog} onClose={() => setShowEmailExistsDialog(false)}>
        <DialogTitle>Account Already Exists</DialogTitle>
        <DialogContent>
          <Typography>
            An account with the email <strong>{guestEmail}</strong> already exists.
            Please sign in to continue with your order.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEmailExistsDialog(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSignInFromDialog}>
            Sign In
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

const CheckoutPage: React.FC = () => {
  // Stripe Elements appearance configuration for better integration
  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#1976d2',
      colorBackground: '#ffffff',
      colorText: '#30313d',
      colorDanger: '#df1b41',
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      spacingUnit: '4px',
      borderRadius: '4px',
    },
  };

  const options = {
    appearance,
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm />
    </Elements>
  );
};

export default CheckoutPage;
