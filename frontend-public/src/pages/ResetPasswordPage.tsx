import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Box, Paper, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';
import api from '../services/api';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  // Validate token on page load
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Invalid reset link. No token provided.');
        setValidating(false);
        return;
      }

      try {
        await api.post('/auth/verify-reset-token', { token });
        setTokenValid(true);
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'This password reset link is invalid or has expired.');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate token exists
    if (!token) {
      setError('Invalid reset link. No token provided.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while validating token
  if (validating) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

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
            background: success
              ? 'linear-gradient(90deg, #2e7d32 0%, #4caf50 100%)'
              : error && !tokenValid
              ? 'linear-gradient(90deg, #d32f2f 0%, #f44336 100%)'
              : 'linear-gradient(90deg, #2D5F3F 0%, #4A8862 100%)',
          }
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: success ? 'success.main' : error && !tokenValid ? 'error.main' : 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              mb: 2,
              fontSize: '1.75rem',
            }}
          >
            {success ? '✓' : error && !tokenValid ? '✕' : '🔒'}
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
            {success ? 'Password Reset!' : error && !tokenValid ? 'Link Expired' : 'Reset Password'}
          </Typography>
          {!success && !error && (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              Enter your new password
            </Typography>
          )}
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

        {/* Show request new link button when token is invalid */}
        {error && !tokenValid && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Please request a new password reset link.
            </Typography>
            <Button
              component={Link}
              to="/forgot-password"
              variant="contained"
              fullWidth
              sx={{ py: 1.5, fontSize: '1rem', mb: 2 }}
            >
              Request New Link
            </Button>
            <Button
              component={Link}
              to="/login"
              variant="outlined"
              fullWidth
              sx={{ py: 1.5, fontSize: '1rem' }}
            >
              Back to Login
            </Button>
          </Box>
        )}

        {success ? (
          <>
            <Alert
              severity="success"
              sx={{
                mb: 3,
                borderLeft: '4px solid',
                borderLeftColor: 'success.main',
              }}
            >
              Your password has been reset successfully!
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              Redirecting to login page...
            </Typography>
            <Button
              component={Link}
              to="/login"
              variant="contained"
              fullWidth
              sx={{ py: 1.5, fontSize: '1rem' }}
            >
              Go to Login
            </Button>
          </>
        ) : tokenValid ? (
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              autoComplete="new-password"
              helperText="Min 8 characters with uppercase, lowercase, number, and special character"
            />

            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              required
              autoComplete="new-password"
              error={confirmPassword !== '' && password !== confirmPassword}
              helperText={confirmPassword !== '' && password !== confirmPassword ? 'Passwords do not match' : ''}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1rem' }}
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">
                Remember your password?{' '}
                <Link
                  to="/login"
                  style={{
                    textDecoration: 'none',
                    color: '#2D5F3F',
                    fontWeight: 600,
                  }}
                >
                  Sign In
                </Link>
              </Typography>
            </Box>
          </form>
        ) : null}
      </Paper>
    </Box>
  );
};

export default ResetPasswordPage;
