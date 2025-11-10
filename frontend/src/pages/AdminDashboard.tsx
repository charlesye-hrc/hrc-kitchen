import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Container,
} from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import MenuManagement from '../components/admin/MenuManagement';
import UserManagement from '../components/admin/UserManagement';
import SystemConfig from '../components/admin/SystemConfig';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminDashboard = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);

  // Wait for auth to load before checking permissions
  if (isLoading) {
    return null; // or a loading spinner if you prefer
  }

  // Check if user is admin
  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/menu" replace />;
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

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
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage menu items, users, and system configuration
        </Typography>
      </Box>

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            aria-label="admin dashboard tabs"
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                minWidth: { xs: 0, sm: 160 },
                padding: { xs: '6px 8px', sm: '12px 16px' }
              }
            }}
          >
            <Tab
              icon={<RestaurantIcon />}
              label="Menu Management"
              iconPosition="start"
              id="admin-tab-0"
              aria-controls="admin-tabpanel-0"
            />
            <Tab
              icon={<PeopleIcon />}
              label="User Management"
              iconPosition="start"
              id="admin-tab-1"
              aria-controls="admin-tabpanel-1"
            />
            <Tab
              icon={<SettingsIcon />}
              label="System Configuration"
              iconPosition="start"
              id="admin-tab-2"
              aria-controls="admin-tabpanel-2"
            />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          <MenuManagement />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <UserManagement />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <SystemConfig />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default AdminDashboard;
