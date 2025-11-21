import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Button,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import api from '../services/api';

interface InvitationInfo {
  email: string;
  fullName: string;
  role: string;
}

const AcceptInvitationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);

  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const verifyInvitationToken = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid invitation link. No token provided.');
        return;
      }

      try {
        const response = await api.get(`/invitations/verify/${token}`);
        setInvitationInfo(response.data.user);
        setStatus('form');
      } catch (err: any) {
        setStatus('error');
        setMessage(
          err.response?.data?.error?.message ||
            'Invalid or expired invitation link. Please contact your administrator.'
        );
      }
    };

    verifyInvitationToken();
  }, [token]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validate passwords
    const passwordError = validatePassword(password);
    if (passwordError) {
      setFormError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/invitations/accept', {
        invitationToken: token,
        password,
      });

      setStatus('success');
      setMessage('Your account has been set up successfully!');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setFormError(
        err.response?.data?.error?.message ||
          'Failed to set up your account. Please try again or contact your administrator.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleDisplayName = (role: string): string => {
    const roleMap: Record<string, string> = {
      STAFF: 'Staff Member',
      KITCHEN: 'Kitchen Staff',
      ADMIN: 'Administrator',
      FINANCE: 'Finance Staff',
    };
    return roleMap[role] || role;
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', py: 4 }}>
      <Paper
        sx={{
          p: { xs: 3, sm: 4.5 },
          maxWidth: 480,
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
        <Box>
          {status === 'loading' && (
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={56} sx={{ mb: 3 }} />
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                Verifying Invitation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please wait while we verify your invitation...
              </Typography>
            </Box>
          )}

          {status === 'form' && invitationInfo && (
            <>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                Welcome to HRC Kitchen!
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Complete your account setup to get started
              </Typography>

              <Box
                sx={{
                  bgcolor: 'grey.50',
                  p: 2.5,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'grey.200',
                  mb: 3,
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Email
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 1.5 }}>
                  {invitationInfo.email}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Full Name
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, mb: 1.5 }}>
                  {invitationInfo.fullName}
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Role
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {getRoleDisplayName(invitationInfo.role)}
                </Typography>
              </Box>

              {formError && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 3,
                    borderLeft: '4px solid',
                    borderLeftColor: 'error.main',
                  }}
                >
                  {formError}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={submitting}
                  sx={{ mb: 2.5 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={submitting}
                  sx={{ mb: 2 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                          size="small"
                        >
                          {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Box
                  sx={{
                    bgcolor: 'grey.50',
                    p: 2,
                    borderRadius: 1,
                    mb: 3,
                    fontSize: '0.875rem',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Password Requirements:
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                    <li>At least 8 characters</li>
                    <li>One uppercase letter</li>
                    <li>One lowercase letter</li>
                    <li>One number</li>
                    <li>One special character (!@#$%^&*...)</li>
                  </ul>
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={submitting}
                  sx={{ py: 1.5 }}
                >
                  {submitting ? <CircularProgress size={24} /> : 'Complete Setup'}
                </Button>
              </Box>
            </>
          )}

          {status === 'success' && (
            <Box sx={{ textAlign: 'center' }}>
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
                Account Setup Complete!
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
                onClick={() => navigate('/login')}
                variant="contained"
                fullWidth
                sx={{ py: 1.5 }}
              >
                Go to Login
              </Button>
            </Box>
          )}

          {status === 'error' && (
            <Box sx={{ textAlign: 'center' }}>
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
                Invalid Invitation
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
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Please contact your administrator for a new invitation link.
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default AcceptInvitationPage;
