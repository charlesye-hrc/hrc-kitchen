import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Box, Paper, TextField, Button, Typography, Alert } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const [step, setStep] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginWithPassword, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the redirect path from location state (e.g., from checkout page)
  const from = (location.state as any)?.from || '/menu';

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await loginWithPassword(email, password);

      if (result.requiresOtp) {
        setStep('otp');
        setSuccess('Password verified! A verification code has been sent to your email.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed. Please check your credentials.');
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
      // Re-submit password to get new OTP
      await loginWithPassword(email, password);
      setSuccess('A new verification code has been sent to your email.');
      setOtpCode('');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPassword = () => {
    setStep('password');
    setOtpCode('');
    setError('');
    setSuccess('');
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
            {step === 'password' ? 'Welcome Back' : 'Verify Your Identity'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {step === 'password' ? 'Sign in to your account' : 'Enter the code sent to your email'}
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

        {/* Step 1: Password */}
        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
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
              {loading ? 'Verifying...' : 'Continue'}
            </Button>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
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
              autoFocus
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
              {loading ? 'Verifying...' : 'Verify & Sign In'}
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
                onClick={handleBackToPassword}
                disabled={loading}
                sx={{ textTransform: 'none' }}
              >
                Back to Login
              </Button>
            </Box>
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
