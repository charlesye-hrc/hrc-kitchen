import { Box, Container } from '@mui/material';
import { InventoryConfiguration } from '../components/inventory/InventoryConfiguration';

const InventoryConfigPage = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <InventoryConfiguration />
    </Container>
  );
};

export default InventoryConfigPage;
