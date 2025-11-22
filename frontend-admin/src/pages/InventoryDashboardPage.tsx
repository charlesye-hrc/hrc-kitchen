import { Box, Container } from '@mui/material';
import { InventoryDashboard } from '../components/inventory/InventoryDashboard';

const InventoryDashboardPage = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <InventoryDashboard />
    </Container>
  );
};

export default InventoryDashboardPage;
