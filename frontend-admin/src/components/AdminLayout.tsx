import { ReactNode, useState } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import SettingsIcon from '@mui/icons-material/Settings';
import InventoryIcon from '@mui/icons-material/Inventory';
import StorefrontIcon from '@mui/icons-material/Storefront';

interface AdminLayoutProps {
  children: ReactNode;
}

const DRAWER_WIDTH = 240;
const DRAWER_COLLAPSED_WIDTH = 64;

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
  roles: ('KITCHEN' | 'FINANCE' | 'ADMIN')[];
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // Mobile/tablet: < 900px
  const [drawerOpen, setDrawerOpen] = useState(!isMobile); // Closed on mobile by default

  // Get public app URL from environment
  const PUBLIC_APP_URL = import.meta.env.VITE_PUBLIC_APP_URL || 'http://localhost:5173';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Navigation items configuration
  const navItems: NavItem[] = [
    {
      path: '/kitchen',
      label: 'Kitchen Dashboard',
      icon: <DashboardIcon />,
      roles: ['KITCHEN', 'ADMIN'],
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: <AssessmentIcon />,
      roles: ['KITCHEN', 'FINANCE', 'ADMIN'],
    },
    {
      path: '/inventory',
      label: 'Inventory',
      icon: <InventoryIcon />,
      roles: ['KITCHEN', 'ADMIN'],
    },
    {
      path: '/menu-management',
      label: 'Menu Management',
      icon: <RestaurantMenuIcon />,
      roles: ['ADMIN'],
    },
    {
      path: '/locations',
      label: 'Locations',
      icon: <LocationOnIcon />,
      roles: ['ADMIN'],
    },
    {
      path: '/users',
      label: 'Users',
      icon: <PeopleIcon />,
      roles: ['ADMIN'],
    },
    {
      path: '/location-assignments',
      label: 'Location Assignments',
      icon: <AssignmentIndIcon />,
      roles: ['ADMIN'],
    },
    {
      path: '/system-settings',
      label: 'System Settings',
      icon: <SettingsIcon />,
      roles: ['ADMIN'],
    },
  ];

  // Filter navigation items based on user role
  const visibleNavItems = navItems.filter(
    (item) => user && user.role !== 'STAFF' && item.roles.includes(user.role)
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', overflowX: 'hidden', width: '100%' }}>
      {/* Top AppBar */}
      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backdropFilter: 'blur(16px)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ px: { xs: 2, md: 3 } }}>
          {isAuthenticated && (
            <IconButton
              color="inherit"
              aria-label="toggle drawer"
              onClick={toggleDrawer}
              edge="start"
              sx={{ mr: 2 }}
            >
              {drawerOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </IconButton>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '40%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem',
                mr: 1.5,
              }}
            >
              HK
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              >
                Huon Regional Care
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Kitchen Management
              </Typography>
            </Box>
          </Box>

          {isAuthenticated ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                component="a"
                href={PUBLIC_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                variant="contained"
                color="secondary"
                startIcon={!isMobile ? <StorefrontIcon /> : undefined}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 999,
                  px: { xs: 1.5, sm: 2 },
                  minWidth: 'auto',
                  boxShadow: '0 8px 16px rgba(212, 165, 116, 0.25)',
                }}
              >
                {isMobile ? <StorefrontIcon fontSize="small" /> : 'Order Food'}
              </Button>
              <Box
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  lineHeight: 1.1,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {user?.fullName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.role}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleLogout}
                startIcon={!isMobile ? <LogoutIcon /> : undefined}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 999,
                  px: { xs: 1.5, sm: 2 },
                  minWidth: 'auto',
                }}
              >
                {isMobile ? <LogoutIcon fontSize="small" /> : 'Logout'}
              </Button>
            </Box>
          ) : (
            <Button color="inherit" onClick={() => navigate('/login')}>
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Collapsible Sidebar */}
      {isAuthenticated && (
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={drawerOpen}
          onClose={toggleDrawer}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            width: drawerOpen ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: isMobile ? DRAWER_WIDTH : (drawerOpen ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH),
              boxSizing: 'border-box',
              transition: (theme) =>
                theme.transitions.create('width', {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.enteringScreen,
                }),
              overflowX: 'hidden',
            },
          }}
        >
          <Toolbar /> {/* Spacer for AppBar */}
          <Divider />
          <List>
            {visibleNavItems.map((item) => (
              <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
                <Tooltip title={!drawerOpen ? item.label : ''} placement="right">
                  <ListItemButton
                    onClick={() => {
                      navigate(item.path);
                      if (isMobile) setDrawerOpen(false); // Close drawer on mobile after navigation
                    }}
                    selected={isActive(item.path)}
                    sx={{
                      minHeight: 48,
                      justifyContent: drawerOpen ? 'initial' : 'center',
                      px: 2.5,
                      '&.Mui-selected': {
                        backgroundColor: 'primary.main',
                        color: 'primary.contrastText',
                        '&:hover': {
                          backgroundColor: 'primary.dark',
                        },
                        '& .MuiListItemIcon-root': {
                          color: 'primary.contrastText',
                        },
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: drawerOpen ? 3 : 'auto',
                        justifyContent: 'center',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      sx={{
                        opacity: drawerOpen ? 1 : 0,
                        whiteSpace: 'nowrap',
                      }}
                    />
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        </Drawer>
      )}

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: { xs: '100vw', md: 'auto' },
          overflowX: 'hidden',
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        <Container
          maxWidth={false}
          sx={{
            flexGrow: 1,
            py: 3,
            px: { xs: 1, sm: 2, md: 3 },
            width: '100%',
            maxWidth: '100%',
            overflowX: 'hidden',
          }}
        >
          {children}
        </Container>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            py: 2,
            px: 2,
            mt: 'auto',
            backgroundColor: (theme) =>
              theme.palette.mode === 'light'
                ? theme.palette.grey[200]
                : theme.palette.grey[800],
          }}
        >
          <Container maxWidth="lg">
            <Typography variant="body2" color="text.secondary" align="center">
              © {new Date().getFullYear()} Huon Regional Care - Internal Management System
            </Typography>
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
