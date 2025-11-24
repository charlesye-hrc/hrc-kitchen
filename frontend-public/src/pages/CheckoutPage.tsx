import React, { useState, useEffect, useCallback } from 'react';
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
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocationContext, LocationSelector } from '@hrc-kitchen/common';
import { menuApi } from '../services/api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import type { PaymentRequest } from '@stripe/stripe-js';
import axios from 'axios';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

let recaptchaScriptPromise: Promise<void> | null = null;

const loadRecaptchaScript = (siteKey: string): Promise<void> => {
  const waitForReady = () =>
    new Promise<void>((resolve) => {
      if (window.grecaptcha) {
        window.grecaptcha.ready(() => resolve());
      } else {
        resolve();
      }
    });

  if (window.grecaptcha) {
    return waitForReady();
  }

  if (!recaptchaScriptPromise) {
    recaptchaScriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (!window.grecaptcha) {
          reject(new Error('reCAPTCHA failed to initialize'));
          return;
        }
        window.grecaptcha.ready(() => resolve());
      };
      script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
      document.head.appendChild(script);
    });
  }

  return recaptchaScriptPromise;
};

interface GuestOrderSecurityToken {
  nonce: string;
  timestamp: number;
  signature: string;
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const CheckoutForm: React.FC = () => {
  const { items, clearCart, getCartTotal, calculateItemPrice, cartLocationId, removeItem, updateQuantity, setCartLocation, validateCartForLocation } = useCart();
  const { isAuthenticated } = useAuth();
  const { locations, selectedLocation, selectLocation, isLoading: locationsLoading } = useLocationContext();
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderingWindow, setOrderingWindow] = useState<any>(null);
  const [checkingWindow, setCheckingWindow] = useState(true);
  const [guestSecurityToken, setGuestSecurityToken] = useState<GuestOrderSecurityToken | null>(null);
  const [guestTokenExpiry, setGuestTokenExpiry] = useState<number | null>(null);

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
  const apiBaseUrl = import.meta.env.VITE_API_URL || '/api/v1';

  const ensureGuestSecurityToken = useCallback(async (): Promise<GuestOrderSecurityToken> => {
    if (guestSecurityToken && guestTokenExpiry && guestTokenExpiry > Date.now()) {
      return guestSecurityToken;
    }

    if (!recaptchaSiteKey) {
      throw new Error('Guest checkout security is not configured. Please contact support.');
    }

    await loadRecaptchaScript(recaptchaSiteKey);

    if (!window.grecaptcha) {
      throw new Error('Security verification failed to load. Please refresh and try again.');
    }

    const captchaToken = await window.grecaptcha.execute(recaptchaSiteKey, {
      action: 'guest_checkout',
    });

    const response = await axios.post(`${apiBaseUrl}/orders/guest/token`, {
      captchaToken,
    });

    const tokenPayload: GuestOrderSecurityToken | undefined = response.data?.data?.token;
    const expiresInMs: number | undefined = response.data?.data?.expiresInMs;

    if (!tokenPayload) {
      throw new Error('Unable to verify guest checkout. Please try again.');
    }

    setGuestSecurityToken(tokenPayload);
    setGuestTokenExpiry(expiresInMs ? Date.now() + expiresInMs : Date.now() + 5 * 60 * 1000);
    return tokenPayload;
  }, [guestSecurityToken, guestTokenExpiry, recaptchaSiteKey, apiBaseUrl]);

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

  // Handle location change and validate cart
  const handleLocationChange = async (locationId: string) => {
    const newLocation = locations.find(loc => loc.id === locationId);
    if (!newLocation) return;

    // Get current cart location name
    const currentCartLocation = locations.find(loc => loc.id === cartLocationId);
    const currentLocationName = currentCartLocation?.name || 'current location';

    try {
      // Fetch menu items for the new location to validate cart
      const response = await menuApi.getTodaysMenu(locationId);
      if (response.success) {
        const availableMenuItemIds = response.data.items.map((item: any) => item.id);
        const unavailableItems = validateCartForLocation(locationId, availableMenuItemIds);

        if (unavailableItems.length > 0) {
          // Get item names
          const unavailableNames = unavailableItems
            .map(id => items.find(item => item.menuItem.id === id)?.menuItem.name)
            .filter(Boolean);

          const confirmRemove = window.confirm(
            `The following items in your cart are not available at ${newLocation.name}:\n\n` +
            unavailableNames.join('\n') +
            '\n\nThese items will be removed from your cart. Continue?'
          );

          if (confirmRemove) {
            // Remove all cart items with unavailable menu items (including all variations)
            unavailableItems.forEach(menuItemId => {
              items.filter(item => item.menuItem.id === menuItemId).forEach(item => {
                removeItem(item.cartItemId || item.menuItem.id);
              });
            });
            selectLocation(locationId);
            setCartLocation(locationId);
          }
          // If user cancels, don't change location
        } else {
          // All items ARE available at new location, but ask user to confirm
          const confirmLocationChange = window.confirm(
            `You have ${items.length} item(s) in your cart from ${currentLocationName}.\n\n` +
            `Do you want to switch your cart location to ${newLocation.name}?`
          );

          if (confirmLocationChange) {
            selectLocation(locationId);
            setCartLocation(locationId);
          }
          // If user cancels, revert to cart location (don't change the dropdown)
        }
      }
    } catch (err) {
      console.error('Error validating cart for new location:', err);
      setError('Failed to validate cart for new location');
    }
  };

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
      // Prevent double-processing
      if (loading) {
        event.complete('fail');
        return;
      }
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

        // Validate locationId
        if (!cartLocationId) {
          event.complete('fail');
          setError('Please select a location before placing an order');
          setLoading(false);
          return;
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
          locationId: cartLocationId,
        };

        let response;
        let guestTokenPayload: GuestOrderSecurityToken | undefined;
        const authConfig = isAuthenticated ? { withCredentials: true } : undefined;

        if (isAuthenticated) {
          // Authenticated order
          response = await axios.post(
            `${import.meta.env.VITE_API_URL}/orders`,
            orderData,
            authConfig
          );
        } else {
          try {
            guestTokenPayload = await ensureGuestSecurityToken();
          } catch (tokenErr) {
            console.error('Guest token error:', tokenErr);
            event.complete('fail');
            setError(tokenErr instanceof Error ? tokenErr.message : 'Unable to verify guest checkout. Please try again.');
            setLoading(false);
            return;
          }

          // Guest order
          response = await axios.post(`${import.meta.env.VITE_API_URL}/orders/guest`, {
            ...orderData,
            guestInfo: {
              firstName: firstName || guestFirstName,
              lastName: lastName || guestLastName,
              email: payerEmail,
            },
            guestToken: guestTokenPayload,
          });
        }

        const { order, clientSecret, accessToken } = response.data.data;

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

          // Manually confirm payment status with backend (since webhooks may not fire in dev)
          try {
            await axios.post(
              `${import.meta.env.VITE_API_URL}/payment/confirm`,
              { paymentIntentId: paymentIntent.id, clientSecret },
              isAuthenticated ? { withCredentials: true } : undefined
            );
            console.log('[Checkout] Payment status confirmed with backend');
          } catch (confirmErr) {
            console.error('[Checkout] Failed to confirm payment with backend:', confirmErr);
            // Don't block the user flow, payment succeeded on Stripe side
          }

          clearCart();
          setGuestSecurityToken(null);
          setGuestTokenExpiry(null);
          navigate(`/order-confirmation/${order.id}`, {
            state: {
              isGuest: !isAuthenticated,
              guestEmail: payerEmail,
              guestName: payerName || `${guestFirstName} ${guestLastName}`,
              accessToken: accessToken // Pass token for guest order retrieval
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
  }, [stripe, cartTotal, isAuthenticated, items, deliveryNotes, navigate, clearCart, guestFirstName, guestLastName, guestEmail, ensureGuestSecurityToken]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    // Set loading IMMEDIATELY to prevent double-submission
    if (loading) {
      return; // Already processing
    }
    setLoading(true);
    setError(null);

    // Validate guest info if not authenticated
    if (!isAuthenticated) {
      if (!guestFirstName || !guestLastName || !guestEmail) {
        setError('Please fill in all guest information fields');
        setLoading(false);
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }
    }

    // Validate locationId
    if (!cartLocationId) {
      setError('Please select a location before placing an order');
      setLoading(false);
      return;
    }

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
        locationId: cartLocationId,
      };

      let response;
      let guestTokenPayload: GuestOrderSecurityToken | undefined;
        const authConfig = isAuthenticated ? { withCredentials: true } : undefined;

        if (isAuthenticated) {
          // Authenticated order
          response = await axios.post(
            `${import.meta.env.VITE_API_URL}/orders`,
            orderData,
            authConfig
          );
        } else {
        try {
          guestTokenPayload = await ensureGuestSecurityToken();
        } catch (tokenErr) {
          console.error('Guest token error:', tokenErr);
          setError(tokenErr instanceof Error ? tokenErr.message : 'Unable to verify guest checkout. Please try again.');
          setLoading(false);
          return;
        }

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
            guestToken: guestTokenPayload,
          }
        );
      }

      const { order, clientSecret, accessToken } = response.data.data;

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
        // Manually confirm payment status with backend (since webhooks may not fire in dev)
        try {
          await axios.post(
            `${import.meta.env.VITE_API_URL}/payment/confirm`,
            { paymentIntentId: paymentIntent.id, clientSecret },
            isAuthenticated ? { withCredentials: true } : undefined
          );
          console.log('[Checkout] Payment status confirmed with backend');
        } catch (confirmErr) {
          console.error('[Checkout] Failed to confirm payment with backend:', confirmErr);
          // Don't block the user flow, payment succeeded on Stripe side
        }

        // Payment successful
        clearCart();
        setGuestSecurityToken(null);
        setGuestTokenExpiry(null);
        navigate(`/order-confirmation/${order.id}`, {
          state: {
            isGuest: !isAuthenticated,
            guestEmail: guestEmail || undefined,
            guestName: `${guestFirstName} ${guestLastName}` || undefined,
            accessToken: accessToken // Pass token for guest order retrieval
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

      {/* Location Selector */}
      <Paper
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
          Delivery Location
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select the location where you'd like to receive your order
        </Typography>
        <LocationSelector
          locations={locations}
          selectedLocationId={selectedLocation?.id || null}
          onLocationChange={handleLocationChange}
          isLoading={locationsLoading}
          label="Delivery Location"
          size="medium"
        />
      </Paper>

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
              <Box sx={{
                width: '100%',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'flex-start', sm: 'center' },
                mb: 1,
                gap: { xs: 1, sm: 0 }
              }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1" fontWeight="bold">
                    {item.menuItem.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ${calculateItemPrice(item).toFixed(2)} each
                  </Typography>
                </Box>

                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: { xs: '100%', sm: 'auto' },
                  gap: { xs: 2, sm: 1 }
                }}>
                  {/* Quantity Controls */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (item.quantity > 1) {
                          updateQuantity(item.cartItemId || item.menuItem.id, item.quantity - 1);
                        }
                      }}
                      disabled={item.quantity <= 1}
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                    <Typography sx={{ minWidth: '30px', textAlign: 'center', fontWeight: 500 }}>
                      {item.quantity}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => updateQuantity(item.cartItemId || item.menuItem.id, item.quantity + 1)}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" fontWeight="bold" sx={{ minWidth: '60px', textAlign: 'right' }}>
                      ${(calculateItemPrice(item) * item.quantity).toFixed(2)}
                    </Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeItem(item.cartItemId || item.menuItem.id)}
                      aria-label="Remove item"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ width: '100%', pl: { xs: 0, sm: 2 } }}>

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
