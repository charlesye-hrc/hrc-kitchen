import { Container, Box, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import UserManagement from '../components/admin/UserManagement';

const UserManagementPage = () => {
  const { user, isLoading } = useAuth();

  // Wait for auth to load before checking permissions
  if (isLoading) {
    return null;
  }

  // Check if user is admin
  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/kitchen" replace />;
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box mb={4}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          fontWeight="bold"
          sx={{ fontSize: { xs: '1.75rem', md: '2.125rem' } }}
        >
          User Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage user accounts, roles, and permissions
        </Typography>
      </Box>

      <UserManagement />
    </Container>
  );
};

export default UserManagementPage;
