import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Box, Paper, TextField, Button, Typography, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the redirect path from location state
  const from = (location.state as any)?.from;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);

      // Wait a bit for context to update with user info
      setTimeout(() => {
        // Redirect based on where they came from or their role
        if (from && from !== '/login') {
          navigate(from);
        } else {
          // Default redirect based on role
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            if (userData.role === 'ADMIN') {
              navigate('/admin');
            } else if (userData.role === 'KITCHEN') {
              navigate('/kitchen');
            } else if (userData.role === 'FINANCE') {
              navigate('/reports');
            } else {
              navigate('/kitchen');
            }
          } else {
            navigate('/');
          }
        }
      }, 100);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', py: 4 }}>
      <Paper
        sx={{
          p: { xs: 3, sm: 4.5 },
          maxWidth: 440,
          width: '100%',
          border: '1px solid',
          borderColor: 'divider',
          position: 'relative',
          overflow: 'hidden',
          '&:before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #2D5F3F 0%, #4A8862 100%)',
          }
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              mb: 2,
              fontSize: '1.75rem',
            }}
          >
            🍽️
          </Box>
          <Typography
            variant="h4"
            gutterBottom
            align="center"
            sx={{
              fontSize: { xs: '1.75rem', md: '2rem' },
              fontWeight: 700,
              mb: 0.5,
            }}
          >
            Welcome Back
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            Sign in to your account
          </Typography>
        </Box>

        {error && (
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderLeft: '4px solid',
              borderLeftColor: 'error.main',
            }}
          >
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            required
            autoComplete="email"
          />

          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            required
            autoComplete="current-password"
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1rem' }}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link
                to="/register"
                style={{
                  textDecoration: 'none',
                  color: '#2D5F3F',
                  fontWeight: 600,
                }}
              >
                Create Account
              </Link>
            </Typography>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default LoginPage;
