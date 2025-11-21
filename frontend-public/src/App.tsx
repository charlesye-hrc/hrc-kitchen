import { Routes, Route, Navigate } from 'react-router-dom';
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
import { LocationProvider } from '@hrc-kitchen/common';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

/**
 * Public Ordering App
 * Customer-facing application for browsing menu and placing orders
 * - Public access: Menu browsing
 * - Guest checkout: No account required
 * - Authenticated: Order history
 * - All users can order from all locations (location assignments don't apply here)
 */
function App() {
  return (
    <AuthProvider>
      <LocationProvider apiUrl={API_URL} forceAllLocations={true} tokenKey="public_token">
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
              <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
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
  );
}

export default App;
