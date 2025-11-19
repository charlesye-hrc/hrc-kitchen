import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Box, Paper, TextField, Button, Typography, Alert, Tabs, Tab, CircularProgress } from '@mui/material';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuth } from '../contexts/AuthContext';

// Check if Auth0 is configured
const isAuth0Configured = !!(
  import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID
);

const LoginPage = () => {
  const [tabValue, setTabValue] = useState(0); // 0 = OTP, 1 = Password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, requestOtp, verifyOtp, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get Auth0 hook only if configured
  const auth0 = isAuth0Configured ? useAuth0() : null;

  // Get the redirect path from location state (e.g., from checkout page)
  const from = (location.state as any)?.from || '/menu';

  // If Auth0 is configured and user is already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from);
    }
  }, [isAuthenticated, navigate, from]);

  // If Auth0 is configured, redirect to Auth0 login
  // But only if we're not currently processing a callback (check for code/state in URL)
  useEffect(() => {
    if (isAuth0Configured && auth0) {
      // Check if we're returning from Auth0 (callback has code or state params)
      const searchParams = new URLSearchParams(window.location.search);
      const hasAuthParams = searchParams.has('code') || searchParams.has('state') || searchParams.has('error');

      // Don't redirect if:
      // 1. Auth0 is still loading (processing callback)
      // 2. User is already authenticated
      // 3. We're in the middle of a callback (URL has auth params)
      if (!auth0.isLoading && !auth0.isAuthenticated && !hasAuthParams) {
        auth0.loginWithRedirect({
          appState: { returnTo: from },
        });
      }
    }
  }, [auth0, from]);

  // Show loading while Auth0 processes
  if (isAuth0Configured) {
    // If Auth0 SDK is loading or user is authenticated, show loading
    if (auth0?.isLoading || auth0?.isAuthenticated) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              {auth0?.isAuthenticated ? 'Loading your account...' : 'Processing login...'}
            </Typography>
          </Box>
        </Box>
      );
    }

    // Show redirecting state
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} sx={{ mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Redirecting to login...
          </Typography>
        </Box>
      </Box>
    );
  }

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
    setOtpSent(false);
    setOtpCode('');
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate(from);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await requestOtp(email);
      setOtpSent(true);
      setSuccess('A verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifyOtp(email, otpCode);
      navigate(from);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await requestOtp(email);
      setSuccess('A new verification code has been sent to your email.');
      setOtpCode('');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to resend code. Please try again.');
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
        <Box sx={{ textAlign: 'center', mb: 3 }}>
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

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            mb: 3,
            '& .MuiTab-root': {
              fontWeight: 600,
              textTransform: 'none',
            },
          }}
        >
          <Tab label="Email Code" />
          <Tab label="Password" />
        </Tabs>

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

        {success && (
          <Alert
            severity="success"
            sx={{
              mb: 3,
              borderLeft: '4px solid',
              borderLeftColor: 'success.main',
            }}
          >
            {success}
          </Alert>
        )}

        {/* OTP Login Tab */}
        {tabValue === 0 && (
          <>
            {!otpSent ? (
              <form onSubmit={handleRequestOtp}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  required
                  autoComplete="email"
                  helperText="We'll send you a verification code"
                />

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1rem' }}
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Code'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Enter the 6-digit code sent to <strong>{email}</strong>
                </Typography>

                <TextField
                  fullWidth
                  label="Verification Code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  margin="normal"
                  required
                  autoComplete="one-time-code"
                  inputProps={{
                    maxLength: 6,
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                    style: { letterSpacing: '0.5em', fontWeight: 'bold', fontSize: '1.25rem' },
                  }}
                  placeholder="000000"
                />

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1rem' }}
                  disabled={loading || otpCode.length !== 6}
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </Button>

                <Box sx={{ textAlign: 'center' }}>
                  <Button
                    variant="text"
                    onClick={handleResendOtp}
                    disabled={loading}
                    sx={{ textTransform: 'none' }}
                  >
                    Resend Code
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                      setError('');
                      setSuccess('');
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Change Email
                  </Button>
                </Box>
              </form>
            )}
          </>
        )}

        {/* Password Login Tab */}
        {tabValue === 1 && (
          <form onSubmit={handlePasswordLogin}>
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

            <Box sx={{ textAlign: 'right', mt: 1 }}>
              <Link
                to="/forgot-password"
                style={{
                  textDecoration: 'none',
                  color: '#2D5F3F',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                Forgot Password?
              </Link>
            </Box>

            <Button
              fullWidth
              type="submit"
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1rem' }}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </Button>
          </form>
        )}

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
      </Paper>
    </Box>
  );
};

export default LoginPage;
