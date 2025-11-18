import { Container, Box, Typography } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import SystemConfig from '../components/admin/SystemConfig';

const SystemSettingsPage = () => {
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
          System Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure system-wide settings including ordering windows and domain restrictions
        </Typography>
      </Box>

      <SystemConfig />
    </Container>
  );
};

export default SystemSettingsPage;
