import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { AxiosInstance } from 'axios';

export interface VerifyEmailPageProps {
  api: AxiosInstance;
  loginPath?: string;
  verifyEmailPath?: string;
  redirectDelayMs?: number;
  disableSuccessRedirect?: boolean;
  loadingTitle?: string;
  loadingSubtitle?: string;
  successTitle?: string;
  successMessage?: string;
  errorTitle?: string;
  errorFallbackMessage?: string;
  buttonLabel?: string;
  onVerifySuccess?: () => void;
}

type VerificationState = 'loading' | 'success' | 'error';

const VerifyEmailPage = ({
  api,
  loginPath = '/login',
  verifyEmailPath = '/auth/verify-email',
  redirectDelayMs = 3000,
  disableSuccessRedirect = false,
  loadingTitle = 'Verifying Your Email',
  loadingSubtitle = 'Please wait while we verify your email address...',
  successTitle = 'Email Verified!',
  successMessage = 'Your email has been verified successfully!',
  errorTitle = 'Verification Failed',
  errorFallbackMessage = 'Email verification failed. The link may have expired.',
  buttonLabel = 'Go to Login',
  onVerifySuccess,
}: VerifyEmailPageProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<VerificationState>('loading');
  const [message, setMessage] = useState('');
  const hasVerified = useRef(false);
  const redirectTimeoutRef = useRef<number>();

  useEffect(() => {
    const verifyEmail = async () => {
      if (hasVerified.current) {
        return;
      }

      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. No token provided.');
        return;
      }

      hasVerified.current = true;

      try {
        const response = await api.post(verifyEmailPath, { token });
        setStatus('success');
        setMessage(response?.data?.message || successMessage);
        onVerifySuccess?.();

        if (!disableSuccessRedirect) {
          redirectTimeoutRef.current = window.setTimeout(() => {
            navigate(loginPath, { replace: true });
          }, redirectDelayMs);
        }
      } catch (err: any) {
        setStatus('error');
        setMessage(err?.response?.data?.error?.message || errorFallbackMessage);
      }
    };

    verifyEmail();
  }, [
    api,
    disableSuccessRedirect,
    errorFallbackMessage,
    loginPath,
    navigate,
    redirectDelayMs,
    successMessage,
    token,
    verifyEmailPath,
    onVerifySuccess,
  ]);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

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
            background:
              status === 'success'
                ? 'linear-gradient(90deg, #2e7d32 0%, #4caf50 100%)'
                : status === 'error'
                ? 'linear-gradient(90deg, #d32f2f 0%, #f44336 100%)'
                : 'linear-gradient(90deg, #2D5F3F 0%, #4A8862 100%)',
          },
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          {status === 'loading' && (
            <>
              <CircularProgress size={56} sx={{ mb: 3 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                {loadingTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {loadingSubtitle}
              </Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: 'success.main',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  mb: 2,
                }}
              >
                <CheckCircleOutlineIcon sx={{ fontSize: 32 }} />
              </Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                {successTitle}
              </Typography>
              <Alert
                severity="success"
                sx={{
                  mt: 2,
                  mb: 3,
                  borderLeft: '4px solid',
                  borderLeftColor: 'success.main',
                }}
              >
                {message}
              </Alert>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Redirecting to login page...
              </Typography>
              <Button component={Link} to={loginPath} variant="contained" fullWidth sx={{ py: 1.5 }}>
                {buttonLabel}
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: 'error.main',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  mb: 2,
                }}
              >
                <ErrorOutlineIcon sx={{ fontSize: 32 }} />
              </Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                {errorTitle}
              </Typography>
              <Alert
                severity="error"
                sx={{
                  mt: 2,
                  mb: 3,
                  borderLeft: '4px solid',
                  borderLeftColor: 'error.main',
                }}
              >
                {message}
              </Alert>
              <Button component={Link} to={loginPath} variant="contained" fullWidth sx={{ py: 1.5 }}>
                {buttonLabel}
              </Button>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default VerifyEmailPage;

