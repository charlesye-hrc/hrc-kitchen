import { ReactNode } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  Container,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { useState } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4 }}>
            HRC Kitchen - Management
          </Typography>

          {isAuthenticated && (
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
              {(user?.role === 'KITCHEN' || user?.role === 'ADMIN') && (
                <Button
                  color="inherit"
                  onClick={() => navigate('/kitchen')}
                  sx={{
                    fontWeight: isActive('/kitchen') ? 'bold' : 'normal',
                    textDecoration: isActive('/kitchen') ? 'underline' : 'none',
                  }}
                >
                  Kitchen
                </Button>
              )}
              {user?.role === 'ADMIN' && (
                <>
                  <Button
                    color="inherit"
                    onClick={() => navigate('/admin')}
                    sx={{
                      fontWeight: isActive('/admin') ? 'bold' : 'normal',
                      textDecoration: isActive('/admin') ? 'underline' : 'none',
                    }}
                  >
                    Admin
                  </Button>
                  <Button
                    color="inherit"
                    onClick={() => navigate('/admin/locations')}
                    sx={{
                      fontWeight: isActive('/admin/locations') ? 'bold' : 'normal',
                      textDecoration: isActive('/admin/locations') ? 'underline' : 'none',
                    }}
                  >
                    Locations
                  </Button>
                  <Button
                    color="inherit"
                    onClick={() => navigate('/admin/user-locations')}
                    sx={{
                      fontWeight: isActive('/admin/user-locations') ? 'bold' : 'normal',
                      textDecoration: isActive('/admin/user-locations') ? 'underline' : 'none',
                    }}
                  >
                    User Access
                  </Button>
                </>
              )}
              {(user?.role === 'FINANCE' || user?.role === 'ADMIN') && (
                <Button
                  color="inherit"
                  onClick={() => navigate('/reports')}
                  sx={{
                    fontWeight: isActive('/reports') ? 'bold' : 'normal',
                    textDecoration: isActive('/reports') ? 'underline' : 'none',
                  }}
                >
                  Reports
                </Button>
              )}
            </Box>
          )}

          {isAuthenticated ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ mr: 1 }}>
                {user?.fullName} ({user?.role})
              </Typography>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                <AccountCircle />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </Box>
          ) : (
            <Button color="inherit" onClick={() => navigate('/login')}>
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container component="main" maxWidth={false} sx={{ flexGrow: 1, py: 3 }}>
        {children}
      </Container>

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
  );
};

export default AdminLayout;
