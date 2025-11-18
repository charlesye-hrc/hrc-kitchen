import { Container, Box, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import MenuManagement from '../components/admin/MenuManagement';

const MenuManagementPage = () => {
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
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 0, sm: 2 } }}>
      <Box mb={{ xs: 2, sm: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          fontWeight="bold"
          sx={{ fontSize: { xs: '1.75rem', md: '2.125rem' } }}
        >
          Menu Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage daily menu items, categories, variations, and location assignments
        </Typography>
      </Box>

      <MenuManagement />
    </Container>
  );
};

export default MenuManagementPage;
