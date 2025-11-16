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
import LogoutIcon from '@mui/icons-material/Logout';
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
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: 'primary.main',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Toolbar sx={{ py: 0.5 }}>
          <Box
            component={Link}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              textDecoration: 'none',
              color: 'inherit',
              flexGrow: 1,
              transition: 'opacity 0.2s',
              '&:hover': {
                opacity: 0.9,
              }
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
              }}
            >
              🍽️
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontSize: { xs: '1.0625rem', sm: '1.25rem' },
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                }}
              >
                HRC Kitchen
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.7rem',
                  opacity: 0.85,
                  display: { xs: 'none', sm: 'block' },
                  lineHeight: 1,
                }}
              >
                Huon Regional Care
              </Typography>
            </Box>
          </Box>

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
                  <Button
                    color="inherit"
                    onClick={handleLogout}
                    startIcon={<LogoutIcon />}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      },
                    }}
                  >
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

      <Box
        component="footer"
        sx={{
          py: 4,
          px: 3,
          mt: 'auto',
          background: 'linear-gradient(180deg, #F8F9FA 0%, #EAECEF 100%)',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                mb: 1.5,
                fontSize: '1.5rem',
              }}
            >
              🍽️
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
              HRC Kitchen
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Fresh, Delicious Meals for Huon Regional Care
            </Typography>
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}
          >
            © 2025 HRC Kitchen - Huon Regional Care. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
