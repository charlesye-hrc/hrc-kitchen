import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDrawerOpen(false);
  };

  const handleNavClick = () => {
    setDrawerOpen(false);
  };

  const mobileMenu = (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      sx={{
        '& .MuiDrawer-paper': {
          width: 250,
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
        <IconButton onClick={() => setDrawerOpen(false)}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <List>
        {isAuthenticated ? (
          <>
            <ListItem>
              <ListItemText
                primary={user?.fullName}
                secondary={user?.role}
                primaryTypographyProps={{ fontWeight: 'bold' }}
              />
            </ListItem>
            <Divider />
            <ListItemButton component={Link} to="/menu" onClick={handleNavClick}>
              <ListItemText primary="Menu" />
            </ListItemButton>
            <ListItemButton component={Link} to="/orders" onClick={handleNavClick}>
              <ListItemText primary="Orders" />
            </ListItemButton>
            {(user?.role === 'KITCHEN' || user?.role === 'ADMIN') && (
              <ListItemButton component={Link} to="/kitchen" onClick={handleNavClick}>
                <ListItemText primary="Kitchen" />
              </ListItemButton>
            )}
            {user?.role === 'ADMIN' && (
              <>
                <ListItemButton component={Link} to="/admin" onClick={handleNavClick}>
                  <ListItemText primary="Admin" />
                </ListItemButton>
                <ListItemButton component={Link} to="/reports" onClick={handleNavClick}>
                  <ListItemText primary="Reports" />
                </ListItemButton>
              </>
            )}
            <Divider />
            <ListItemButton onClick={handleLogout}>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </>
        ) : (
          <>
            <ListItemButton component={Link} to="/login" onClick={handleNavClick}>
              <ListItemText primary="Login" />
            </ListItemButton>
            <ListItemButton component={Link} to="/register" onClick={handleNavClick}>
              <ListItemText primary="Register" />
            </ListItemButton>
          </>
        )}
      </List>
    </Drawer>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'inherit',
              fontSize: { xs: '1rem', sm: '1.25rem' }
            }}
          >
            HRC Kitchen
          </Typography>

          {isMobile ? (
            <>
              <IconButton
                color="inherit"
                edge="end"
                onClick={() => setDrawerOpen(true)}
              >
                <MenuIcon />
              </IconButton>
              {mobileMenu}
            </>
          ) : (
            <>
              {isAuthenticated ? (
                <>
                  <Typography
                    variant="body2"
                    sx={{
                      mr: 2,
                      display: { xs: 'none', md: 'block' },
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {user?.fullName} ({user?.role})
                  </Typography>
                  <Button color="inherit" component={Link} to="/menu">
                    Menu
                  </Button>
                  <Button color="inherit" component={Link} to="/orders">
                    Orders
                  </Button>
                  {(user?.role === 'KITCHEN' || user?.role === 'ADMIN') && (
                    <Button color="inherit" component={Link} to="/kitchen">
                      Kitchen
                    </Button>
                  )}
                  {user?.role === 'ADMIN' && (
                    <>
                      <Button color="inherit" component={Link} to="/admin">
                        Admin
                      </Button>
                      <Button color="inherit" component={Link} to="/reports">
                        Reports
                      </Button>
                    </>
                  )}
                  <Button color="inherit" onClick={handleLogout}>
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button color="inherit" component={Link} to="/login">
                    Login
                  </Button>
                  <Button color="inherit" component={Link} to="/register">
                    Register
                  </Button>
                </>
              )}
            </>
          )}
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1 }}>
        {children}
      </Box>

      <Box component="footer" sx={{ py: 3, px: 2, mt: 'auto', backgroundColor: '#f5f5f5' }}>
        <Typography variant="body2" color="text.secondary" align="center">
          © 2025 HRC Kitchen - Huon Regional Care
        </Typography>
      </Box>
    </Box>
  );
};

export default Layout;
