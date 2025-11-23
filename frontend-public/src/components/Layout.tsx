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
  useMediaQuery,
  Grid,
  Badge,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import CartDrawer from './CartDrawer';
import { useLocationContext, LocationSelector } from '@hrc-kitchen/common';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { getCartItemCount } = useCart();
  const { locations, selectedLocation, selectLocation, isLoading: locationsLoading } = useLocationContext();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const currentYear = new Date().getFullYear();

  const handleLogout = () => {
    logout();
    navigate('/');
    setDrawerOpen(false);
  };

  const handleNavClick = () => {
    setDrawerOpen(false);
  };

  const primaryLinks = [
    { label: 'Menu', path: '/menu' },
    { label: 'Orders', path: '/orders', authOnly: true },
  ];

  const mobileMenu = (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      ModalProps={{ keepMounted: true }}
      sx={{
        '& .MuiDrawer-paper': {
          width: 320,
          background: 'linear-gradient(180deg, #ffffff 0%, #f5f7f9 100%)',
          borderTopLeftRadius: 24,
          borderBottomLeftRadius: 24,
          borderLeft: '1px solid',
          borderColor: 'divider',
          boxShadow: '0px 25px 80px rgba(15, 31, 22, 0.25)',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Navigation
        </Typography>
        <IconButton onClick={() => setDrawerOpen(false)}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />
      <List sx={{ py: 2 }}>
        <ListItemButton
          onClick={() => {
            setCartDrawerOpen(true);
            setDrawerOpen(false);
          }}
          sx={{
            mx: 1,
            mb: 1,
            borderRadius: 2,
            bgcolor: 'rgba(45,95,63,0.08)',
          }}
        >
          <ShoppingCartIcon fontSize="small" sx={{ mr: 1 }} />
          <ListItemText
            primary="View Cart"
            secondary={`${getCartItemCount()} item${getCartItemCount() === 1 ? '' : 's'}`}
            secondaryTypographyProps={{ fontWeight: 500 }}
            primaryTypographyProps={{ fontWeight: 600 }}
          />
        </ListItemButton>
        {isAuthenticated && (
          <>
            <ListItem>
              <ListItemText
                primary={user?.fullName}
                secondary={user?.role}
                primaryTypographyProps={{ fontWeight: 600 }}
              />
            </ListItem>
            <Divider sx={{ my: 1.5 }} />
          </>
        )}
        {primaryLinks.map(({ label, path, authOnly }) => {
          if (authOnly && !isAuthenticated) {
            return null;
          }
          return (
            <ListItemButton
              key={path}
              component={Link}
              to={path}
              onClick={handleNavClick}
              sx={{
                borderRadius: 2,
                mx: 1,
                my: 0.5,
                '&:hover': {
                  backgroundColor: 'rgba(45, 95, 63, 0.08)',
                },
              }}
            >
              <ListItemText
                primary={label}
                primaryTypographyProps={{ fontWeight: 600 }}
              />
            </ListItemButton>
          );
        })}
        <Divider sx={{ my: 2 }} />
        {isAuthenticated ? (
          <ListItem disablePadding>
            <ListItemButton onClick={handleLogout} sx={{ mx: 1, borderRadius: 2 }}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItemButton>
          </ListItem>
        ) : (
          <>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/login" onClick={handleNavClick} sx={{ mx: 1, borderRadius: 2 }}>
                <ListItemText primary="Login" primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/register"
                onClick={handleNavClick}
                sx={{
                  mx: 1,
                  mt: 1,
                  borderRadius: 2,
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { backgroundColor: 'primary.dark' },
                }}
              >
                <ListItemText primary="Create Account" primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>
    </Drawer>
  );

  return (
    <>
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          backdropFilter: 'blur(18px)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderBottom: '1px solid rgba(45, 95, 63, 0.08)',
          color: 'text.primary',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ py: 1.5, px: { xs: 2, md: 4 }, gap: 2 }}>
          <Box
            component={Link}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              textDecoration: 'none',
              color: 'inherit',
              flexGrow: { xs: 1, md: 0 },
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '42%',
                background: 'linear-gradient(135deg, #2D5F3F 0%, #4A8862 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                boxShadow: '0px 12px 30px rgba(45, 95, 63, 0.4)',
              }}
            >
              <LunchDiningIcon />
            </Box>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  letterSpacing: 1,
                  color: 'primary.main',
                  textTransform: 'uppercase',
                }}
              >
                Huon Regional Care
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.1 }}>
                Kitchen
              </Typography>
            </Box>
          </Box>

          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
              {primaryLinks.map(({ label, path, authOnly }) => {
                if (authOnly && !isAuthenticated) {
                  return null;
                }
                return (
                  <Button
                    key={path}
                    component={Link}
                    to={path}
                    color="primary"
                    sx={{ fontWeight: 600, textTransform: 'none' }}
                  >
                    {label}
                  </Button>
                );
              })}
              <Box sx={{ minWidth: 220 }}>
                <LocationSelector
                  locations={locations}
                  selectedLocationId={selectedLocation?.id || null}
                  onLocationChange={selectLocation}
                  isLoading={locationsLoading}
                  size="small"
                  fullWidth
                />
              </Box>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setCartDrawerOpen(true)}
                startIcon={<ShoppingCartIcon />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: 999,
                  px: 2.5,
                  boxShadow: '0 12px 24px rgba(45,95,63,0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                View Cart
                <Box
                  sx={{
                    minWidth: 22,
                    height: 22,
                    borderRadius: '50%',
                    bgcolor: 'secondary.main',
                    color: 'secondary.contrastText',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 0.75,
                  }}
                >
                  {getCartItemCount()}
                </Box>
              </Button>
              {isAuthenticated ? (
                <>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        lineHeight: 1.1,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {user?.fullName}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                        {user?.role}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={handleLogout}
                      startIcon={<LogoutIcon />}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                      }}
                    >
                      Logout
                    </Button>
                  </Box>
                </>
              ) : (
                <>
                  <Button
                    component={Link}
                    to="/login"
                    color="primary"
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Login
                  </Button>
                  <Button
                    component={Link}
                    to="/register"
                    variant="contained"
                    color="primary"
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      boxShadow: '0px 12px 24px rgba(45, 95, 63, 0.25)',
                    }}
                  >
                    Create Account
                  </Button>
                </>
              )}
            </Box>
          )}

          {isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isAuthenticated && (
                <Typography
                  variant="body2"
                  sx={{
                    maxWidth: 160,
                    fontWeight: 600,
                    color: 'text.secondary',
                    textAlign: 'right',
                  }}
                >
                  {user?.fullName}
                </Typography>
              )}
              <IconButton
                color="primary"
                edge="end"
                onClick={() => setDrawerOpen(true)}
                sx={{
                  bgcolor: 'rgba(45, 95, 63, 0.08)',
                  borderRadius: 2,
                }}
              >
                <MenuIcon />
              </IconButton>
              {mobileMenu}
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          px: { xs: 1.5, md: 4 },
          py: { xs: 4, md: 6 },
        }}
      >
        <Box sx={{ maxWidth: 1400, mx: 'auto', width: '100%' }}>{children}</Box>
      </Box>

      <Box
        component="footer"
        sx={{
          background: 'linear-gradient(180deg, #0F1F17 0%, #13271D 100%)',
          color: 'rgba(255, 255, 255, 0.9)',
          mt: 'auto',
          py: { xs: 5, md: 6 },
          px: { xs: 3, md: 6 },
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Grid container spacing={4}>
            <Grid item xs={12} md={5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '42%',
                    background: 'rgba(212, 165, 116, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'secondary.light',
                  }}
                >
                  <LunchDiningIcon />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    HRC Kitchen
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                    Fresh meals crafted for Huon Regional Care
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.65)', maxWidth: 320 }}>
                Seasonal produce, thoughtful nutrition, and a seamless ordering experience for our community.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="subtitle2" sx={{ mb: 2, color: 'white' }}>
                Quick Links
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  component={Link}
                  to="/menu"
                  sx={{
                    color: 'rgba(255,255,255,0.8)',
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    px: 0,
                  }}
                >
                  Menu
                </Button>
                <Button
                  component={Link}
                  to="/orders"
                  sx={{
                    color: 'rgba(255,255,255,0.8)',
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    px: 0,
                  }}
                >
                  Orders
                </Button>
                {!isAuthenticated && (
                  <>
                    <Button
                      component={Link}
                      to="/login"
                      sx={{
                        color: 'rgba(255,255,255,0.8)',
                        justifyContent: 'flex-start',
                        textTransform: 'none',
                        px: 0,
                      }}
                    >
                      Login
                    </Button>
                    <Button
                      component={Link}
                      to="/register"
                      sx={{
                        color: 'rgba(255,255,255,0.8)',
                        justifyContent: 'flex-start',
                        textTransform: 'none',
                        px: 0,
                      }}
                    >
                      Register
                    </Button>
                  </>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="subtitle2" sx={{ mb: 2, color: 'white' }}>
                Contact
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                kitchen@huonregionalcare.org.au
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                (03) 6123 4567
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.6)', mt: 2 }}>
                Service hours: 6:00am – 7:30pm, Monday to Sunday
              </Typography>
            </Grid>
          </Grid>
          <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.12)' }} />
          <Typography variant="body2" align="center" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            © {currentYear} HRC Kitchen · Huon Regional Care. All rights reserved.
          </Typography>
        </Box>
      </Box>
    </Box>
    <CartDrawer open={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
    </>
  );
};

export default Layout;
