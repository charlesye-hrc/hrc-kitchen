import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Paper, TextField, Typography } from '@mui/material';
import { AxiosInstance } from 'axios';

export interface ResetPasswordPageProps {
  api: AxiosInstance;
  loginPath?: string;
  forgotPasswordPath?: string;
  verifyResetTokenPath?: string;
  resetPasswordPath?: string;
  postResetRedirectPath?: string;
  successRedirectDelayMs?: number;
  disableSuccessRedirect?: boolean;
  title?: string;
  successTitle?: string;
  expiredTitle?: string;
  subtitle?: string;
  successMessage?: string;
  requestNewLinkMessage?: string;
  ctaLabel?: string;
  requestNewLinkButtonLabel?: string;
  goToLoginButtonLabel?: string;
  rememberPasswordLabel?: string;
  loginLinkLabel?: string;
  onResetSuccess?: () => void;
}

const ResetPasswordPage = ({
  api,
  loginPath = '/login',
  forgotPasswordPath = '/forgot-password',
  verifyResetTokenPath = '/auth/verify-reset-token',
  resetPasswordPath = '/auth/reset-password',
  postResetRedirectPath,
  successRedirectDelayMs = 3000,
  disableSuccessRedirect = false,
  title = 'Reset Password',
  successTitle = 'Password Reset!',
  expiredTitle = 'Link Expired',
  subtitle = 'Enter your new password',
  successMessage = 'Your password has been reset successfully!',
  requestNewLinkMessage = 'Please request a new password reset link.',
  ctaLabel = 'Reset Password',
  requestNewLinkButtonLabel = 'Request New Link',
  goToLoginButtonLabel = 'Go to Login',
  rememberPasswordLabel = 'Remember your password?',
  loginLinkLabel = 'Sign In',
  onResetSuccess,
}: ResetPasswordPageProps) => {
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

  const successRedirectRef = useRef<number>();
  const successRedirectPath = postResetRedirectPath || loginPath;

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Invalid reset link. No token provided.');
        setValidating(false);
        return;
      }

      try {
        await api.post(verifyResetTokenPath, { token });
        setTokenValid(true);
      } catch (err: any) {
        setError(err?.response?.data?.error?.message || 'This password reset link is invalid or has expired.');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [api, token, verifyResetTokenPath]);

  useEffect(() => {
    return () => {
      if (successRedirectRef.current) {
        window.clearTimeout(successRedirectRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Invalid reset link. No token provided.');
      return;
    }

    setLoading(true);

    try {
      await api.post(resetPasswordPath, { token, newPassword: password });
      setSuccess(true);
      onResetSuccess?.();

      if (!disableSuccessRedirect) {
        successRedirectRef.current = window.setTimeout(() => {
          navigate(successRedirectPath, { replace: true });
        }, successRedirectDelayMs);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const showErrorState = !!error && !tokenValid;

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
              : showErrorState
              ? 'linear-gradient(90deg, #d32f2f 0%, #f44336 100%)'
              : 'linear-gradient(90deg, #2D5F3F 0%, #4A8862 100%)',
          },
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: success ? 'success.main' : showErrorState ? 'error.main' : 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              mb: 2,
              fontSize: '1.75rem',
            }}
          >
            {success ? '✓' : showErrorState ? '✕' : '🔐'}
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
            {success ? successTitle : showErrorState ? expiredTitle : title}
          </Typography>
          {!success && !error && (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {subtitle}
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

        {showErrorState && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {requestNewLinkMessage}
            </Typography>
            <Button
              component={Link}
              to={forgotPasswordPath}
              variant="contained"
              fullWidth
              sx={{ py: 1.5, fontSize: '1rem', mb: 2 }}
            >
              {requestNewLinkButtonLabel}
            </Button>
            <Button
              component={Link}
              to={loginPath}
              variant="outlined"
              fullWidth
              sx={{ py: 1.5, fontSize: '1rem' }}
            >
              {goToLoginButtonLabel}
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
              {successMessage}
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              Redirecting to login page...
            </Typography>
            <Button
              component={Link}
              to={loginPath}
              variant="contained"
              fullWidth
              sx={{ py: 1.5, fontSize: '1rem' }}
            >
              {goToLoginButtonLabel}
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
              {loading ? 'Resetting...' : ctaLabel}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary">
                {rememberPasswordLabel}{' '}
                <Link
                  to={loginPath}
                  style={{
                    textDecoration: 'none',
                    color: '#2D5F3F',
                    fontWeight: 600,
                  }}
                >
                  {loginLinkLabel}
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

