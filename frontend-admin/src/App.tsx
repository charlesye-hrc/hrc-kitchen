import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import KitchenDashboard from './pages/KitchenDashboard';
import ReportsPage from './pages/ReportsPage';
import MenuManagementPage from './pages/MenuManagementPage';
import LocationManagementPage from './pages/LocationManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import UserLocationAssignmentPage from './pages/UserLocationAssignmentPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import InventoryDashboardPage from './pages/InventoryDashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { LocationProvider } from '@hrc-kitchen/common';
import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box, Alert, Container } from '@mui/material';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

/**
 * Internal Management App
 * Domain-restricted application for kitchen, admin, and finance staff
 * - Domain validation: Only configured email domains allowed
 * - Role-based access: KITCHEN, ADMIN, FINANCE roles only
 * - No guest access
 */

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('STAFF' | 'KITCHEN' | 'ADMIN' | 'FINANCE')[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading, hasAdminAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Check domain access (hasAdminAccess flag from backend)
  if (!hasAdminAccess) {
    return (
      <Container maxWidth="md" sx={{ mt: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>Access Denied</strong>
        </Alert>
        <Alert severity="warning">
          This application is restricted to authorized domain users only.
          <br />
          Your email domain does not have access to management features.
          <br />
          <br />
          Please contact your administrator if you believe this is an error.
        </Alert>
      </Container>
    );
  }

  // Check role-based access
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <Container maxWidth="md" sx={{ mt: 8 }}>
        <Alert severity="error">
          <strong>Access Denied</strong>
          <br />
          You do not have the required role to access this page.
          <br />
          Required: {allowedRoles.join(', ')}
          <br />
          Your role: {user.role}
        </Alert>
      </Container>
    );
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Default redirect based on role
  const getDefaultRoute = () => {
    if (!isAuthenticated || !user) return '/login';

    if (user.role === 'ADMIN') return '/kitchen';
    if (user.role === 'KITCHEN') return '/kitchen';
    if (user.role === 'FINANCE') return '/reports';

    return '/login';
  };

  // Show loading while auth state is being determined
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      {/* Root redirect based on role */}
      <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />

      {/* Public Routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <LoginPage />}
      />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected Routes - Kitchen Dashboard - KITCHEN and ADMIN */}
      <Route
        path="/kitchen"
        element={
          <ProtectedRoute allowedRoles={['KITCHEN', 'ADMIN']}>
            <KitchenDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes - Reports - KITCHEN, FINANCE, and ADMIN */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['KITCHEN', 'FINANCE', 'ADMIN']}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes - Admin Only - Menu Management */}
      <Route
        path="/menu-management"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <MenuManagementPage />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes - Admin Only - Locations */}
      <Route
        path="/locations"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <LocationManagementPage />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes - Admin Only - Users */}
      <Route
        path="/users"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <UserManagementPage />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes - Admin Only - Location Assignments */}
      <Route
        path="/location-assignments"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <UserLocationAssignmentPage />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes - Admin Only - System Settings */}
      <Route
        path="/system-settings"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <SystemSettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes - Inventory Dashboard - KITCHEN and ADMIN */}
      <Route
        path="/inventory"
        element={
          <ProtectedRoute allowedRoles={['KITCHEN', 'ADMIN']}>
            <InventoryDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* 404 - Catch-all route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

const LayoutWrapper = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const authPages = new Set([
    '/login',
    '/register',
    '/verify-email',
    '/accept-invitation',
    '/forgot-password',
    '/reset-password',
  ]);

  // Don't show layout on authentication-related pages
  if (authPages.has(location.pathname) || !isAuthenticated) {
    return <>{children}</>;
  }

  return <AdminLayout>{children}</AdminLayout>;
};

function App() {
  return (
    <AuthProvider>
      <LocationProvider apiUrl={API_URL} tokenKey="admin_token">
        <LayoutWrapper>
          <AppRoutes />
        </LayoutWrapper>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;
