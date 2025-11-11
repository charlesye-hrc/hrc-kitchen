import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import LoginPage from './pages/LoginPage';
import KitchenDashboard from './pages/KitchenDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ReportsPage from './pages/ReportsPage';
import NotFoundPage from './pages/NotFoundPage';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box, Alert, Container } from '@mui/material';

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
  const { isAuthenticated, user } = useAuth();

  // Default redirect based on role
  const getDefaultRoute = () => {
    if (!isAuthenticated || !user) return '/login';

    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'KITCHEN') return '/kitchen';
    if (user.role === 'FINANCE') return '/reports';

    return '/login';
  };

  return (
    <Routes>
      {/* Root redirect based on role */}
      <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />

      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes - Kitchen Staff */}
      <Route
        path="/kitchen"
        element={
          <ProtectedRoute allowedRoles={['KITCHEN', 'ADMIN']}>
            <KitchenDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes - Admin Only */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected Routes - Finance & Admin */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['FINANCE', 'ADMIN']}>
            <ReportsPage />
          </ProtectedRoute>
        }
      />

      {/* 404 - Catch-all route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <AdminLayout>
        <AppRoutes />
      </AdminLayout>
    </AuthProvider>
  );
}

export default App;
