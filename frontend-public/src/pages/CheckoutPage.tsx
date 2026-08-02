import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocationContext, LocationSelector, executeRecaptcha } from '@hrc-kitchen/common';
import { menuApi, OrderingContext } from '../services/api';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import type { PaymentRequest } from '@stripe/stripe-js';
import axios from 'axios';

interface GuestOrderSecurityToken {
  nonce: string;
  timestamp: number;
  signature: string;
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const CheckoutForm: React.FC = () => {
  const {
    items,
    clearCart,
    getCartTotal,
    calculateItemPrice,
    cartLocationId,
    removeItem,
    updateQuantity,
    updatePrepDate,
    setCartLocation,
  } = useCart();
  const { isAuthenticated } = useAuth();
  const { locations, selectedLocation, selectLocation, isLoading: locationsLoading } = useLocationContext();
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderingContext, setOrderingContext] = useState<OrderingContext | null>(null);
  const [checkingWindow, setCheckingWindow] = useState(true);
  const [validationNotice, setValidationNotice] = useState<string | null>(null);
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
  const paymentRequestRef = useRef<PaymentRequest | null>(null);
  const latestCheckoutState = useRef({
    items,
    cartLocationId,
    guestFirstName,
    guestLastName,
    guestEmail,
    isAuthenticated,
    loading,
  });

  const cartTotal = getCartTotal();
  const apiBaseUrl = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');
  const selectablePrepDates = orderingContext?.selectableDates || [];

  const ensureGuestSecurityToken = useCallback(async (): Promise<GuestOrderSecurityToken> => {
    if (guestSecurityToken && guestTokenExpiry && guestTokenExpiry > Date.now()) {
      return guestSecurityToken;
    }

    if (!recaptchaSiteKey) {
      throw new Error('Guest checkout security is not configured. Please contact support.');
    }

    const captchaToken = await executeRecaptcha(recaptchaSiteKey, 'guest_checkout');

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

  const validateCartItems = useCallback(async (
    targetItems = items,
    targetLocationId = cartLocationId
  ): Promise<{ valid: boolean; removedCount: number }> => {
    if (!targetItems.length || !targetLocationId) {
      return { valid: targetItems.length > 0, removedCount: 0 };
    }

    const payload = {
      locationId: targetLocationId,
      items: targetItems.map(item => ({
        clientLineId: item.cartItemId || `${item.menuItem.id}__${item.prepDate}`,
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        prepDate: item.prepDate,
        customizations: item.customizations.join(', '),
        specialRequests: item.specialRequests,
        selectedVariations: item.selectedVariations || [],
      })),
    };

    const response = await axios.post(`${apiBaseUrl}/orders/validate`, payload);
    const invalidLines = response.data?.data?.invalidLines || [];

    if (!invalidLines.length) {
      setValidationNotice(null);
      return { valid: true, removedCount: 0 };
    }

    const cartItemIdsToRemove = new Set<string>();

    invalidLines.forEach((line: any) => {
      if (line.clientLineId) {
        cartItemIdsToRemove.add(line.clientLineId);
        return;
      }

      const fallbackItem = targetItems.find(item => item.menuItem.id === line.menuItemId && item.prepDate === line.prepDate);
      if (fallbackItem) {
        cartItemIdsToRemove.add(fallbackItem.cartItemId || `${fallbackItem.menuItem.id}__${fallbackItem.prepDate}`);
      }
    });

    cartItemIdsToRemove.forEach((cartItemId) => removeItem(cartItemId));

    const uniqueDates = Array.from(new Set(invalidLines.map((line: any) => line.prepDate).filter(Boolean)));
    const removedNotice = uniqueDates.length > 0
      ? `We removed ${cartItemIdsToRemove.size} item(s) that are no longer orderable for ${uniqueDates.join(', ')}.`
      : `We removed ${cartItemIdsToRemove.size} item(s) that are no longer orderable.`;

    setValidationNotice(removedNotice);

    return {
      valid: false,
      removedCount: cartItemIdsToRemove.size,
    };
  }, [items, cartLocationId, removeItem]);

  const handleInvalidLineError = useCallback((err: any, targetItems: typeof items) => {
    const invalidLines = err?.response?.data?.invalidLines;
    if (!Array.isArray(invalidLines) || invalidLines.length === 0) {
      return false;
    }

    const cartItemIdsToRemove = new Set<string>();
    invalidLines.forEach((line: any) => {
      if (line.clientLineId) {
        cartItemIdsToRemove.add(line.clientLineId);
        return;
      }

      const fallbackItem = targetItems.find(item => item.menuItem.id === line.menuItemId && item.prepDate === line.prepDate);
      if (fallbackItem) {
        cartItemIdsToRemove.add(fallbackItem.cartItemId || `${fallbackItem.menuItem.id}__${fallbackItem.prepDate}`);
      }
    });

    cartItemIdsToRemove.forEach((id) => removeItem(id));
    setValidationNotice('Some items were removed because they are no longer orderable.');
    return true;
  }, [items, removeItem]);

  // Load ordering context on page load
  useEffect(() => {
    const loadOrderingContext = async () => {
      try {
        const response = await menuApi.getOrderingContext();
        if (response.success) {
          setOrderingContext(response.data);
        }
      } catch (err) {
        console.error('Error loading ordering context:', err);
      } finally {
        setCheckingWindow(false);
      }
    };

    loadOrderingContext();
  }, []);

  // Handle location change and validate cart
  const handleLocationChange = async (locationId: string) => {
    const newLocation = locations.find(loc => loc.id === locationId);
    if (!newLocation) return;

    // Get current cart location name
    const currentCartLocation = locations.find(loc => loc.id === cartLocationId);
    const currentLocationName = currentCartLocation?.name || 'current location';

    // Ask user to confirm location switch if cart has items
    if (items.length > 0) {
      const confirmLocationChange = window.confirm(
        `You have ${items.length} item(s) in your cart from ${currentLocationName}.\n\n` +
        `Do you want to switch your cart location to ${newLocation.name}?`
      );

      if (!confirmLocationChange) {
        return;
      }
    }

    selectLocation(locationId);
    setCartLocation(locationId);

    try {
      await validateCartItems(items, locationId);
    } catch (err) {
      console.error('Error validating cart for new location:', err);
      setError('Failed to validate cart for new location');
    }
  };

  // Keep latest state for the payment request handler without recreating the request object
  useEffect(() => {
    latestCheckoutState.current = {
      items,
      cartLocationId,
      guestFirstName,
      guestLastName,
      guestEmail,
      isAuthenticated,
      loading,
    };
  }, [items, cartLocationId, guestFirstName, guestLastName, guestEmail, isAuthenticated, loading]);

  useEffect(() => {
    if (checkingWindow || items.length === 0 || !cartLocationId) {
      return;
    }

    validateCartItems().catch((err) => {
      console.error('Cart validation failed:', err);
    });
  }, [checkingWindow, items.length, cartLocationId, validateCartItems]);

  // Initialize Payment Request Button for Apple Pay / Google Pay
  useEffect(() => {
    if (!stripe) {
      return;
    }

    // Reset the existing payment request when auth mode changes
    setPaymentRequest(null);
    setCanMakePayment(false);
    paymentRequestRef.current = null;

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

    paymentRequestRef.current = pr;

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
    const handlePaymentMethod = async (event: any) => {
      let paymentRequestCompleted = false;
      const {
        items: currentItems,
        cartLocationId: currentCartLocationId,
        guestFirstName: currentGuestFirstName,
        guestLastName: currentGuestLastName,
        guestEmail: currentGuestEmail,
        isAuthenticated: currentIsAuthenticated,
        loading: currentLoading,
      } = latestCheckoutState.current;

      // Prevent double-processing
      if (currentLoading) {
        event.complete('fail');
        return;
      }
      setLoading(true);
      setError(null);

      try {
        // For guest checkout, extract payer info from payment request
        const payerEmail = event.payerEmail || currentGuestEmail;
        const payerName = event.payerName || '';
        const [firstName, ...lastNameParts] = payerName.split(' ');
        const lastName = lastNameParts.join(' ');

        // Validate guest info for payment request
        if (!currentIsAuthenticated) {
          if (!payerEmail || !firstName) {
            event.complete('fail');
            setError('Payment method must provide name and email for guest checkout');
            setLoading(false);
            return;
          }
        }

        // Validate locationId
        if (!currentCartLocationId) {
          event.complete('fail');
          setError('Please select a location before placing an order');
          setLoading(false);
          return;
        }

        const validation = await validateCartItems(currentItems, currentCartLocationId);
        if (!validation.valid) {
          event.complete('fail');
          setError('Some items were removed because they are no longer orderable. Please review your cart.');
          setLoading(false);
          return;
        }

        // Create order and get payment intent
        const orderData = {
          items: currentItems.map(item => ({
            clientLineId: item.cartItemId || `${item.menuItem.id}__${item.prepDate}`,
            menuItemId: item.menuItem.id,
            quantity: item.quantity,
            prepDate: item.prepDate,
            customizations: item.customizations.join(', '),
            specialRequests: item.specialRequests,
            selectedVariations: item.selectedVariations || [],
          })),
          locationId: currentCartLocationId,
        };

        let response;
        let guestTokenPayload: GuestOrderSecurityToken | undefined;
        const authConfig = currentIsAuthenticated ? { withCredentials: true } : undefined;

        if (currentIsAuthenticated) {
          // Authenticated order
          response = await axios.post(
            `${apiBaseUrl}/orders`,
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
          response = await axios.post(`${apiBaseUrl}/orders/guest`, {
            ...orderData,
            guestInfo: {
              firstName: firstName || guestFirstName,
              lastName: lastName || currentGuestLastName,
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

        let finalPaymentIntent = paymentIntent;
        if (paymentIntent?.status === 'requires_action') {
          // Let Stripe handle any additional authentication step (e.g., 3DS) after wallet confirmation.
          event.complete('success');
          paymentRequestCompleted = true;

          const { error: actionError, paymentIntent: actionPaymentIntent } = await stripe.confirmCardPayment(clientSecret);
          if (actionError) {
            throw new Error(actionError.message || 'Additional payment authentication failed');
          }
          finalPaymentIntent = actionPaymentIntent;
        }

        if (finalPaymentIntent?.status === 'succeeded') {
          if (!paymentRequestCompleted) {
            event.complete('success');
            paymentRequestCompleted = true;
          }

          // Manually confirm payment status with backend (since webhooks may not fire in dev)
          try {
            await axios.post(
              `${apiBaseUrl}/payment/confirm`,
              { paymentIntentId: finalPaymentIntent.id, clientSecret },
              currentIsAuthenticated ? { withCredentials: true } : undefined
            );
            console.log('[Checkout] Payment status confirmed with backend');
          } catch (confirmErr) {
            console.error('[Checkout] Failed to confirm payment with backend:', confirmErr);
            // Don't block the user flow, payment succeeded on Stripe side
          }

          clearCart();
          setGuestSecurityToken(null);
          setGuestTokenExpiry(null);
          const confirmationSearch =
            !currentIsAuthenticated && accessToken
              ? `?token=${encodeURIComponent(accessToken)}`
              : '';
          navigate({
            pathname: `/order-confirmation/${order.id}`,
            search: confirmationSearch,
          }, {
            state: {
              isGuest: !currentIsAuthenticated,
              guestEmail: payerEmail,
              guestName: payerName || `${currentGuestFirstName} ${currentGuestLastName}`,
              accessToken: accessToken // Pass token for guest order retrieval
            }
          });
        } else {
          event.complete('fail');
          paymentRequestCompleted = true;
          throw new Error('Payment did not succeed');
        }
      } catch (err: any) {
        console.error('Payment Request error:', err);
        if (!paymentRequestCompleted) {
          event.complete('fail');
        }

        if (handleInvalidLineError(err, currentItems)) {
          setError('Some items were removed because they are no longer orderable. Please review your cart.');
          return;
        }

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

    pr.on('paymentmethod', handlePaymentMethod);

    return () => {
      pr.off('paymentmethod', handlePaymentMethod);
    };
  }, [stripe, isAuthenticated, cartTotal, ensureGuestSecurityToken, clearCart, navigate, validateCartItems, handleInvalidLineError]);

  // Keep the payment request total in sync without recreating the element
  useEffect(() => {
    if (paymentRequestRef.current) {
      paymentRequestRef.current.update({
        total: {
          label: 'HRC Kitchen Order',
          amount: Math.round(cartTotal * 100),
        },
      });
    }
  }, [cartTotal]);

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

    const validation = await validateCartItems(items, cartLocationId);
    if (!validation.valid) {
      setError('Some items were removed because they are no longer orderable. Please review your cart.');
      setLoading(false);
      return;
    }

    try {
      // Create order and get payment intent
      const orderData = {
        items: items.map(item => ({
          clientLineId: item.cartItemId || `${item.menuItem.id}__${item.prepDate}`,
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          prepDate: item.prepDate,
          customizations: item.customizations.join(', '),
          specialRequests: item.specialRequests,
          selectedVariations: item.selectedVariations || [],
        })),
        locationId: cartLocationId,
      };

      let response;
      let guestTokenPayload: GuestOrderSecurityToken | undefined;
        const authConfig = isAuthenticated ? { withCredentials: true } : undefined;

        if (isAuthenticated) {
          // Authenticated order
          response = await axios.post(
            `${apiBaseUrl}/orders`,
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
          `${apiBaseUrl}/orders/guest`,
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
            `${apiBaseUrl}/payment/confirm`,
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
        const confirmationSearch =
          !isAuthenticated && accessToken
            ? `?token=${encodeURIComponent(accessToken)}`
            : '';
        navigate({
          pathname: `/order-confirmation/${order.id}`,
          search: confirmationSearch,
        }, {
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

      if (handleInvalidLineError(err, items)) {
        setError('Some items were removed because they are no longer orderable. Please review your cart.');
        return;
      }

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
          background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
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

        {validationNotice && (
          <Alert severity="warning" sx={{ mb: 2.5 }}>
            {validationNotice}
          </Alert>
        )}

        <List>
          {items.map(item => {
            const cartItemIdentifier = item.cartItemId || `${item.menuItem.id}__${item.prepDate}`;
            const selectedDateOption = selectablePrepDates.find(dateOption => dateOption.date === item.prepDate);

            return (
            <ListItem key={cartItemIdentifier} sx={{ px: 0, py: { xs: 1.5, sm: 2 }, flexDirection: 'column', alignItems: 'flex-start' }}>
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
                          updateQuantity(cartItemIdentifier, item.quantity - 1);
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
                      onClick={() => updateQuantity(cartItemIdentifier, item.quantity + 1)}
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
                      onClick={() => removeItem(cartItemIdentifier)}
                      aria-label="Remove item"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ width: '100%', pl: { xs: 0, sm: 2 } }}>
                <Box sx={{ mt: 1, mb: 1.5, maxWidth: 280 }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel id={`prep-date-${cartItemIdentifier}`}>Prep Date</InputLabel>
                    <Select
                      labelId={`prep-date-${cartItemIdentifier}`}
                      value={item.prepDate}
                      label="Prep Date"
                      onChange={(event) => updatePrepDate(cartItemIdentifier, event.target.value)}
                    >
                      {selectablePrepDates.map((dateOption) => (
                        <MenuItem
                          key={dateOption.date}
                          value={dateOption.date}
                          disabled={!dateOption.eligible && dateOption.date !== item.prepDate}
                        >
                          {dateOption.label} ({dateOption.date}){!dateOption.eligible ? ' - Unavailable' : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {selectedDateOption && !selectedDateOption.eligible && (
                    <Typography variant="caption" color="warning.main" sx={{ mt: 0.5, display: 'block' }}>
                      {selectedDateOption.message || 'This date is no longer eligible and will be removed at checkout.'}
                    </Typography>
                  )}
                </Box>

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
          )})}
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
                hidePostalCode: true,
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
