import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, IconButton, InputAdornment, Paper, TextField, Typography, } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
const DEFAULT_ROLE_LABELS = {
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
const defaultValidatePassword = (pwd) => {
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
const sanitizePath = (path) => path.replace(/\/+$/, '');
const AcceptInvitationPage = ({ api, loginPath = '/login', verifyInvitationPath = '/invitations/verify', acceptInvitationPath = '/invitations/accept', redirectDelayMs = 3000, disableSuccessRedirect = false, verifyingTitle = 'Verifying Invitation', verifyingSubtitle = 'Please wait while we verify your invitation...', welcomeTitle = 'Welcome to HRC Kitchen!', welcomeSubtitle = 'Complete your account setup to get started', successTitle = 'Account Setup Complete!', successMessage = 'Your account has been set up successfully!', successRedirectMessage = 'Redirecting to login page...', errorTitle = 'Invalid Invitation', errorSubtitle = 'Please contact your administrator for a new invitation link.', passwordRequirementsTitle = 'Password Requirements:', passwordRequirements = DEFAULT_PASSWORD_REQUIREMENTS, roleLabels = DEFAULT_ROLE_LABELS, ctaLabel = 'Complete Setup', goToLoginButtonLabel = 'Go to Login', validatePassword = defaultValidatePassword, onAcceptSuccess, getLoginPathForRole, }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');
    const [invitationInfo, setInvitationInfo] = useState(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const successRedirectRef = useRef();
    const isExternalPath = (path) => /^https?:\/\//i.test(path);
    const resolveLoginPath = (role) => {
        if (getLoginPathForRole) {
            return getLoginPathForRole(role);
        }
        return loginPath;
    };
    const redirectToLogin = (replace = false) => {
        const target = resolveLoginPath(invitationInfo?.role);
        if (isExternalPath(target)) {
            if (replace) {
                window.location.replace(target);
            }
            else {
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
            }
            catch (err) {
                setStatus('error');
                setMessage(err?.response?.data?.error?.message ||
                    'Invalid or expired invitation link. Please contact your administrator.');
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
    const handleSubmit = async (e) => {
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
        }
        catch (err) {
            setFormError(err?.response?.data?.error?.message ||
                'Failed to set up your account. Please try again or contact your administrator.');
        }
        finally {
            setSubmitting(false);
        }
    };
    const getRoleDisplayName = (role) => {
        return roleLabels[role] || role;
    };
    return (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', py: 4 }, children: _jsx(Paper, { sx: {
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
                    background: status === 'success'
                        ? 'linear-gradient(90deg, #2e7d32 0%, #4caf50 100%)'
                        : status === 'error'
                            ? 'linear-gradient(90deg, #d32f2f 0%, #f44336 100%)'
                            : 'linear-gradient(90deg, #2D5F3F 0%, #4A8862 100%)',
                },
            }, children: _jsxs(Box, { children: [status === 'loading' && (_jsxs(Box, { sx: { textAlign: 'center' }, children: [_jsx(CircularProgress, { size: 56, sx: { mb: 3 } }), _jsx(Typography, { variant: "h5", gutterBottom: true, sx: { fontWeight: 700 }, children: verifyingTitle }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: verifyingSubtitle })] })), status === 'form' && invitationInfo && (_jsxs(_Fragment, { children: [_jsx(Typography, { variant: "h5", gutterBottom: true, sx: { fontWeight: 700 }, children: welcomeTitle }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: welcomeSubtitle }), _jsxs(Box, { sx: {
                                    bgcolor: 'grey.50',
                                    p: 2.5,
                                    borderRadius: 1.5,
                                    border: '1px solid',
                                    borderColor: 'grey.200',
                                    mb: 3,
                                }, children: [_jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 0.5 }, children: "Email" }), _jsx(Typography, { variant: "body1", sx: { fontWeight: 600, mb: 1.5 }, children: invitationInfo.email }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 0.5 }, children: "Name" }), _jsx(Typography, { variant: "body1", sx: { fontWeight: 600, mb: 1.5 }, children: invitationInfo.fullName }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 0.5 }, children: "Role" }), _jsx(Typography, { variant: "body1", sx: { fontWeight: 600 }, children: getRoleDisplayName(invitationInfo.role) })] }), formError && (_jsx(Alert, { severity: "error", sx: {
                                    mb: 3,
                                    borderLeft: '4px solid',
                                    borderLeftColor: 'error.main',
                                }, children: formError })), _jsxs(Box, { component: "form", onSubmit: handleSubmit, children: [_jsx(TextField, { fullWidth: true, label: "Create Password", type: showPassword ? 'text' : 'password', value: password, onChange: (e) => setPassword(e.target.value), margin: "normal", required: true, InputProps: {
                                            endAdornment: (_jsx(InputAdornment, { position: "end", children: _jsx(IconButton, { onClick: () => setShowPassword((prev) => !prev), edge: "end", children: showPassword ? _jsx(VisibilityOffIcon, {}) : _jsx(VisibilityIcon, {}) }) })),
                                        } }), _jsx(TextField, { fullWidth: true, label: "Confirm Password", type: showConfirmPassword ? 'text' : 'password', value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), margin: "normal", required: true, error: confirmPassword !== '' && confirmPassword !== password, helperText: confirmPassword !== '' && confirmPassword !== password ? 'Passwords do not match' : undefined, InputProps: {
                                            endAdornment: (_jsx(InputAdornment, { position: "end", children: _jsx(IconButton, { onClick: () => setShowConfirmPassword((prev) => !prev), edge: "end", children: showConfirmPassword ? _jsx(VisibilityOffIcon, {}) : _jsx(VisibilityIcon, {}) }) })),
                                        } }), _jsxs(Box, { sx: {
                                            bgcolor: 'grey.50',
                                            p: 2,
                                            borderRadius: 1,
                                            mb: 3,
                                            fontSize: '0.875rem',
                                        }, children: [_jsx(Typography, { variant: "body2", sx: { fontWeight: 600, mb: 1 }, children: passwordRequirementsTitle }), _jsx("ul", { style: { margin: 0, paddingLeft: '1.25rem' }, children: passwordRequirements.map((requirement) => (_jsx("li", { children: requirement }, requirement))) })] }), _jsx(Button, { type: "submit", variant: "contained", fullWidth: true, disabled: submitting, sx: { py: 1.5 }, children: submitting ? _jsx(CircularProgress, { size: 24 }) : ctaLabel })] })] })), status === 'success' && (_jsxs(Box, { sx: { textAlign: 'center' }, children: [_jsx(Box, { sx: {
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
                                }, children: _jsx(CheckCircleOutlineIcon, { sx: { fontSize: 32 } }) }), _jsx(Typography, { variant: "h5", gutterBottom: true, sx: { fontWeight: 700 }, children: successTitle }), _jsx(Alert, { severity: "success", sx: {
                                    mt: 2,
                                    mb: 3,
                                    borderLeft: '4px solid',
                                    borderLeftColor: 'success.main',
                                }, children: message || successMessage }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: successRedirectMessage }), _jsx(Button, { onClick: () => redirectToLogin(), variant: "contained", fullWidth: true, sx: { py: 1.5 }, children: goToLoginButtonLabel })] })), status === 'error' && (_jsxs(Box, { sx: { textAlign: 'center' }, children: [_jsx(Box, { sx: {
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
                                }, children: _jsx(ErrorOutlineIcon, { sx: { fontSize: 32 } }) }), _jsx(Typography, { variant: "h5", gutterBottom: true, sx: { fontWeight: 700 }, children: errorTitle }), _jsx(Alert, { severity: "error", sx: {
                                    mt: 2,
                                    mb: 3,
                                    borderLeft: '4px solid',
                                    borderLeftColor: 'error.main',
                                }, children: message }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: errorSubtitle }), _jsx(Button, { onClick: () => redirectToLogin(), variant: "contained", fullWidth: true, sx: { py: 1.5 }, children: goToLoginButtonLabel })] }))] }) }) }));
};
export default AcceptInvitationPage;
