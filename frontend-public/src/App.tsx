import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, CircularProgress, Typography } from '@mui/material';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import MenuPage from './pages/MenuPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import OrdersPage from './pages/OrdersPage';
import NotFoundPage from './pages/NotFoundPage';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { LocationProvider } from '@hrc-kitchen/common';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Check if Auth0 is configured
const isAuth0Configured = !!(
  import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID
);

// Component to handle Auth0 loading state at root level
const Auth0LoadingGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Only use Auth0 hook if configured
  if (!isAuth0Configured) {
    return <>{children}</>;
  }

  const { isLoading, error } = useAuth0();

  if (error) {
    console.error('Auth0 error:', error);
  }

  // Show loading while Auth0 processes the callback
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Loading...
          </Typography>
        </Box>
      </Box>
    );
  }

  return <>{children}</>;
};

/**
 * Public Ordering App
 * Customer-facing application for browsing menu and placing orders
 * - Public access: Menu browsing
 * - Guest checkout: No account required
 * - Authenticated: Order history
 */
function App() {
  return (
    <Auth0LoadingGuard>
      <AuthProvider>
        <LocationProvider apiUrl={API_URL}>
          <CartProvider>
            <Layout>
              <Routes>
                {/* Redirect root to menu */}
                <Route path="/" element={<Navigate to="/menu" replace />} />

                {/* Public Routes */}
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Protected Routes (Authenticated Users Only) */}
                <Route path="/orders" element={<OrdersPage />} />

                {/* 404 - Catch-all route */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Layout>
          </CartProvider>
        </LocationProvider>
      </AuthProvider>
    </Auth0LoadingGuard>
  );
}

export default App;
