import { ReactNode } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  Container,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LogoutIcon from '@mui/icons-material/Logout';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2">
                {user?.fullName} ({user?.role})
              </Typography>
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
