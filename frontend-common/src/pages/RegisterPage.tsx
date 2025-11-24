import { ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';

export interface RegisterFormValues {
  email: string;
  password: string;
  fullName: string;
  department?: string;
  location?: string;
  phone?: string;
}

export interface RegisterPageProps {
  register: (data: RegisterFormValues) => Promise<void>;
  isAuthenticated: boolean;
  authenticatedRedirectPath?: string;
  loginPath?: string;
  postRegisterRedirectPath?: string;
  successRedirectDelayMs?: number;
  disableSuccessRedirect?: boolean;
  brandIcon?: ReactNode;
  brandIconAriaLabel?: string;
  title?: string;
  subtitle?: string;
  successMessage?: string;
  ctaLabel?: string;
  loginLinkLabel?: string;
  showDepartmentField?: boolean;
  showLocationField?: boolean;
  showPhoneField?: boolean;
  onRegistrationSuccess?: () => void;
}

const DEFAULT_ICON = '🍽️';

interface RegisterFormState extends RegisterFormValues {
  confirmPassword: string;
  department: string;
  location: string;
  phone: string;
}

const RegisterPage = ({
  register,
  isAuthenticated,
  authenticatedRedirectPath = '/menu',
  loginPath = '/login',
  postRegisterRedirectPath,
  successRedirectDelayMs = 2000,
  disableSuccessRedirect = false,
  brandIcon = DEFAULT_ICON,
  brandIconAriaLabel = 'Registration',
  title = 'Create Account',
  subtitle = 'Join HRC Kitchen to start ordering',
  successMessage = 'Registration successful! Please check your email to verify your account.',
  ctaLabel = 'Create Account',
  loginLinkLabel = 'Sign In',
  showDepartmentField = true,
  showLocationField = true,
  showPhoneField = true,
  onRegistrationSuccess,
}: RegisterPageProps) => {
  const [formData, setFormData] = useState<RegisterFormState>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    department: '',
    location: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const successRedirectRef = useRef<number>();
  const successRedirectPath = postRegisterRedirectPath || loginPath;

  useEffect(() => {
    if (isAuthenticated) {
      navigate(authenticatedRedirectPath, { replace: true });
    }
  }, [authenticatedRedirectPath, isAuthenticated, navigate]);

  useEffect(() => {
    return () => {
      if (successRedirectRef.current) {
        window.clearTimeout(successRedirectRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        department: formData.department || undefined,
        location: formData.location || undefined,
        phone: formData.phone || undefined,
      });

      setSuccess(true);
      onRegistrationSuccess?.();

      if (!disableSuccessRedirect) {
        successRedirectRef.current = window.setTimeout(() => {
          navigate(successRedirectPath, { replace: true });
        }, successRedirectDelayMs);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        py: { xs: 3, md: 5 },
      }}
    >
      <Paper
        sx={{
          p: { xs: 3, sm: 4.5 },
          maxWidth: 520,
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
          },
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
            <span aria-label={brandIconAriaLabel}>{brandIcon}</span>
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
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {subtitle}
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
            {successMessage}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            margin="normal"
            required
            helperText="Minimum 8 characters, including uppercase, lowercase, number, and special character"
          />

          <TextField
            fullWidth
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            margin="normal"
            required
            error={formData.confirmPassword !== '' && formData.password !== formData.confirmPassword}
            helperText={
              formData.confirmPassword !== '' && formData.password !== formData.confirmPassword
                ? 'Passwords do not match'
                : undefined
            }
          />

          {showDepartmentField && (
            <TextField
              fullWidth
              label="Department (Optional)"
              name="department"
              value={formData.department}
              onChange={handleChange}
              margin="normal"
            />
          )}

          {showLocationField && (
            <TextField
              fullWidth
              label="Location (Optional)"
              name="location"
              value={formData.location}
              onChange={handleChange}
              margin="normal"
            />
          )}

          {showPhoneField && (
            <TextField
              fullWidth
              label="Phone (Optional)"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              margin="normal"
            />
          )}

          <Button
            fullWidth
            type="submit"
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.5, fontSize: '1rem' }}
            disabled={loading || success}
          >
            {loading ? 'Creating Account...' : ctaLabel}
          </Button>

          <Box sx={{ textAlign: 'center', mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
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
      </Paper>
    </Box>
  );
};

export default RegisterPage;

