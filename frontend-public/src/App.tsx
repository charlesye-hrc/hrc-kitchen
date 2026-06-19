import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import MenuPage from './pages/MenuPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import OrdersPage from './pages/OrdersPage';
import NotFoundPage from './pages/NotFoundPage';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { LocationProvider, useLocationContext } from '@hrc-kitchen/common';
import { ReactNode, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

/**
 * Public Ordering App
 * Customer-facing application for browsing menu and placing orders
 * - Public access: Menu browsing
 * - Guest checkout: No account required
 * - Authenticated: Order history
 * - All users can order from all locations (location assignments don't apply here)
 */

const AppRoutes = () => {
  const location = useLocation();

  return (
    <Routes>
      {/* Redirect root to menu */}
      <Route path="/" element={<Navigate to={{ pathname: '/menu', search: location.search }} replace />} />

      {/* Public Routes */}
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected Routes (Authenticated Users Only) */}
      <Route path="/orders" element={<OrdersPage />} />

      {/* 404 - Catch-all route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

const LocationUrlSync = () => {
  const { locations, selectedLocation, selectLocation, isLoading } = useLocationContext();
  const location = useLocation();
  const navigate = useNavigate();
  const hasInitializedFromUrl = useRef(false);

  useEffect(() => {
    if (isLoading || locations.length === 0) {
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const locParam = searchParams.get('loc');
    const matchedLocation = locParam
      ? locations.find((loc) => loc.publicCode === locParam)
      : undefined;

    // On first load, honor URL param as source of truth (for QR deep links).
    if (!hasInitializedFromUrl.current) {
      hasInitializedFromUrl.current = true;

      if (matchedLocation && selectedLocation?.id !== matchedLocation.id) {
        selectLocation(matchedLocation.id);
        return;
      }
    }

    if (!selectedLocation?.publicCode) {
      return;
    }

    if (locParam !== selectedLocation.publicCode) {
      searchParams.set('loc', selectedLocation.publicCode);
      navigate(
        {
          pathname: location.pathname,
          search: `?${searchParams.toString()}`,
        },
        { replace: true, state: location.state }
      );
    }
  }, [
    isLoading,
    locations,
    selectedLocation?.id,
    selectedLocation?.publicCode,
    location.pathname,
    location.search,
    navigate,
    selectLocation,
  ]);

  return null;
};

const LayoutWrapper = ({ children }: { children: ReactNode }) => {
  const location = useLocation();

  // Authentication-related pages that shouldn't show the layout
  const authPages = [
    '/login',
    '/register',
    '/verify-email',
    '/accept-invitation',
    '/forgot-password',
    '/reset-password',
  ];

  // Don't show layout on authentication pages
  if (authPages.includes(location.pathname)) {
    return <>{children}</>;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <AuthProvider>
      <LocationProvider apiUrl={API_URL} forceAllLocations={true}>
        <LocationUrlSync />
        <CartProvider>
          <LayoutWrapper>
            <AppRoutes />
          </LayoutWrapper>
        </CartProvider>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;
