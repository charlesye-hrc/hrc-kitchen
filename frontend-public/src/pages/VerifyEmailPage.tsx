import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Box, Paper, Typography, Alert, Button, CircularProgress } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import api from '../services/api';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const hasVerified = useRef(false);

  useEffect(() => {
    const verifyEmail = async () => {
      // Prevent duplicate verification calls (React Strict Mode runs effects twice)
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
        await api.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage('Your email has been verified successfully!');

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.response?.data?.error?.message || 'Email verification failed. The link may have expired.');
      }
    };

    verifyEmail();
  }, [token, navigate]);

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
            background: status === 'success'
              ? 'linear-gradient(90deg, #2e7d32 0%, #4caf50 100%)'
              : status === 'error'
              ? 'linear-gradient(90deg, #d32f2f 0%, #f44336 100%)'
              : 'linear-gradient(90deg, #2D5F3F 0%, #4A8862 100%)',
          }
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          {status === 'loading' && (
            <>
              <CircularProgress size={56} sx={{ mb: 3 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                Verifying Your Email
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please wait while we verify your email address...
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
                Email Verified!
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
              <Button
                component={Link}
                to="/login"
                variant="contained"
                fullWidth
                sx={{ py: 1.5 }}
              >
                Go to Login
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
                Verification Failed
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
              <Button
                component={Link}
                to="/login"
                variant="contained"
                fullWidth
                sx={{ py: 1.5 }}
              >
                Go to Login
              </Button>
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default VerifyEmailPage;
