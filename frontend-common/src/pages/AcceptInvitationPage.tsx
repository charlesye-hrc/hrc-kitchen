import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { AxiosInstance } from 'axios';

export interface InvitationInfo {
  email: string;
  fullName: string;
  role: string;
}

export interface AcceptInvitationPageProps {
  api: AxiosInstance;
  loginPath?: string;
  adminLoginPath?: string;
  verifyInvitationPath?: string;
  acceptInvitationPath?: string;
  redirectDelayMs?: number;
  disableSuccessRedirect?: boolean;
  verifyingTitle?: string;
  verifyingSubtitle?: string;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  successTitle?: string;
  successMessage?: string;
  successRedirectMessage?: string;
  errorTitle?: string;
  errorSubtitle?: string;
  passwordRequirementsTitle?: string;
  passwordRequirements?: string[];
  roleLabels?: Record<string, string>;
  ctaLabel?: string;
  goToLoginButtonLabel?: string;
  validatePassword?: (password: string) => string | null;
  onAcceptSuccess?: () => void;
  getLoginPathForRole?: (role?: string | null) => string;
}

type InvitationStatus = 'loading' | 'form' | 'success' | 'error';

const DEFAULT_ROLE_LABELS: Record<string, string> = {
  STAFF: 'Staff Member',
  KITCHEN: 'Kitchen Staff',
  ADMIN: 'Administrator',
  FINANCE: 'Finance Staff',
};

const DEFAULT_PASSWORD_REQUIREMENTS = [
  'At least 8 characters',
  'One uppercase letter',
  'One lowercase letter',
  'One number',
  'One special character (!@#$%^&*...)',
];

const defaultValidatePassword = (pwd: string): string | null => {
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

const sanitizePath = (path: string) => path.replace(/\/+$/, '');

const AcceptInvitationPage = ({
  api,
  loginPath = '/login',
  adminLoginPath,
  verifyInvitationPath = '/invitations/verify',
  acceptInvitationPath = '/invitations/accept',
  redirectDelayMs = 3000,
  disableSuccessRedirect = false,
  verifyingTitle = 'Verifying Invitation',
  verifyingSubtitle = 'Please wait while we verify your invitation...',
  welcomeTitle = 'Welcome to HRC Kitchen!',
  welcomeSubtitle = 'Complete your account setup to get started',
  successTitle = 'Account Setup Complete!',
  successMessage = 'Your account has been set up successfully!',
  successRedirectMessage = 'Redirecting to login page...',
  errorTitle = 'Invalid Invitation',
  errorSubtitle = 'Please contact your administrator for a new invitation link.',
  passwordRequirementsTitle = 'Password Requirements:',
  passwordRequirements = DEFAULT_PASSWORD_REQUIREMENTS,
  roleLabels = DEFAULT_ROLE_LABELS,
  ctaLabel = 'Complete Setup',
  goToLoginButtonLabel = 'Go to Login',
  validatePassword = defaultValidatePassword,
  onAcceptSuccess,
  getLoginPathForRole,
}: AcceptInvitationPageProps) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const appContext = searchParams.get('app');

  const [status, setStatus] = useState<InvitationStatus>('loading');
  const [message, setMessage] = useState('');
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const successRedirectRef = useRef<number>();
  const isExternalPath = (path: string) => /^https?:\/\//i.test(path);
  const resolveLoginPath = (role?: string | null) => {
    if (getLoginPathForRole) {
      return getLoginPathForRole(role);
    }

    if (role) {
      const normalizedRole = role.toUpperCase();
      if (['ADMIN', 'KITCHEN', 'FINANCE'].includes(normalizedRole) && adminLoginPath) {
        return adminLoginPath;
      }
    }

    if (appContext === 'admin' && adminLoginPath) {
      return adminLoginPath;
    }

    return loginPath;
  };

  const redirectToLogin = (replace = false) => {
    const target = resolveLoginPath(invitationInfo?.role);
    if (isExternalPath(target)) {
      if (replace) {
        window.location.replace(target);
      } else {
        window.location.href = target;
      }
      return;
    }
    navigate(target, { replace });
  };

  useEffect(() => {
    const verifyInvitationToken = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid invitation link. No token provided.');
        return;
      }

      try {
        const sanitizedPath = sanitizePath(verifyInvitationPath);
        const response = await api.get(`${sanitizedPath}/${token}`);
        setInvitationInfo(response.data.user);
        setStatus('form');
      } catch (err: any) {
        setStatus('error');
        setMessage(
          err?.response?.data?.error?.message ||
            'Invalid or expired invitation link. Please contact your administrator.'
        );
      }
    };

    verifyInvitationToken();
  }, [api, token, verifyInvitationPath]);

  useEffect(() => {
    return () => {
      if (successRedirectRef.current) {
        window.clearTimeout(successRedirectRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const passwordError = validatePassword(password);
    if (passwordError) {
      setFormError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (!token) {
      setFormError('Invalid invitation link. No token provided.');
      return;
    }

    setSubmitting(true);

    try {
      await api.post(acceptInvitationPath, {
        invitationToken: token,
        password,
      });

      setStatus('success');
      setMessage(successMessage);
      onAcceptSuccess?.();

      if (!disableSuccessRedirect) {
        successRedirectRef.current = window.setTimeout(() => {
          redirectToLogin(true);
        }, redirectDelayMs);
      }
    } catch (err: any) {
      setFormError(
        err?.response?.data?.error?.message ||
          'Failed to set up your account. Please try again or contact your administrator.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    return roleLabels[role] || role;
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
                {verifyingTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {verifyingSubtitle}
              </Typography>
            </Box>
          )}

          {status === 'form' && invitationInfo && (
            <>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                {welcomeTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {welcomeSubtitle}
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
                  Name
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
                  label="Create Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  margin="normal"
                  required
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  margin="normal"
                  required
                  error={confirmPassword !== '' && confirmPassword !== password}
                  helperText={
                    confirmPassword !== '' && confirmPassword !== password ? 'Passwords do not match' : undefined
                  }
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirmPassword((prev) => !prev)} edge="end">
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
                    {passwordRequirementsTitle}
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                    {passwordRequirements.map((requirement) => (
                      <li key={requirement}>{requirement}</li>
                    ))}
                  </ul>
                </Box>

                <Button type="submit" variant="contained" fullWidth disabled={submitting} sx={{ py: 1.5 }}>
                  {submitting ? <CircularProgress size={24} /> : ctaLabel}
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
                {message || successMessage}
              </Alert>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {successRedirectMessage}
              </Typography>
              <Button onClick={() => redirectToLogin()} variant="contained" fullWidth sx={{ py: 1.5 }}>
                {goToLoginButtonLabel}
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
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {errorSubtitle}
              </Typography>
              <Button onClick={() => redirectToLogin()} variant="contained" fullWidth sx={{ py: 1.5 }}>
                {goToLoginButtonLabel}
              </Button>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default AcceptInvitationPage;
