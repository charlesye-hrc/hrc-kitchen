import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
const DEFAULT_ICON = '🍽️';
const RegisterPage = ({ register, isAuthenticated, authenticatedRedirectPath = '/menu', loginPath = '/login', postRegisterRedirectPath, successRedirectDelayMs = 2000, disableSuccessRedirect = false, brandIcon = DEFAULT_ICON, brandIconAriaLabel = 'Registration', title = 'Create Account', subtitle = 'Join HRC Kitchen to start ordering', successMessage = 'Registration successful! Please check your email to verify your account.', ctaLabel = 'Create Account', loginLinkLabel = 'Sign In', showDepartmentField = true, showLocationField = true, showPhoneField = true, onRegistrationSuccess, }) => {
    const [formData, setFormData] = useState({
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
    const successRedirectRef = useRef();
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
    const handleChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };
    const handleSubmit = async (e) => {
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
        }
        catch (err) {
            setError(err?.response?.data?.error?.message || 'Registration failed. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(Box, { sx: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            py: { xs: 3, md: 5 },
        }, children: _jsxs(Paper, { sx: {
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
            }, children: [_jsxs(Box, { sx: { textAlign: 'center', mb: 4 }, children: [_jsx(Box, { sx: {
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
                            }, children: _jsx("span", { "aria-label": brandIconAriaLabel, children: brandIcon }) }), _jsx(Typography, { variant: "h4", gutterBottom: true, align: "center", sx: {
                                fontSize: { xs: '1.75rem', md: '2rem' },
                                fontWeight: 700,
                                mb: 0.5,
                            }, children: title }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { fontWeight: 500 }, children: subtitle })] }), error && (_jsx(Alert, { severity: "error", sx: {
                        mb: 3,
                        borderLeft: '4px solid',
                        borderLeftColor: 'error.main',
                    }, children: error })), success && (_jsx(Alert, { severity: "success", sx: {
                        mb: 3,
                        borderLeft: '4px solid',
                        borderLeftColor: 'success.main',
                    }, children: successMessage })), _jsxs("form", { onSubmit: handleSubmit, children: [_jsx(TextField, { fullWidth: true, label: "Email", name: "email", type: "email", value: formData.email, onChange: handleChange, margin: "normal", required: true }), _jsx(TextField, { fullWidth: true, label: "Full Name", name: "fullName", value: formData.fullName, onChange: handleChange, margin: "normal", required: true }), _jsx(TextField, { fullWidth: true, label: "Password", name: "password", type: "password", value: formData.password, onChange: handleChange, margin: "normal", required: true, helperText: "Minimum 8 characters, including uppercase, lowercase, number, and special character" }), _jsx(TextField, { fullWidth: true, label: "Confirm Password", name: "confirmPassword", type: "password", value: formData.confirmPassword, onChange: handleChange, margin: "normal", required: true, error: formData.confirmPassword !== '' && formData.password !== formData.confirmPassword, helperText: formData.confirmPassword !== '' && formData.password !== formData.confirmPassword
                                ? 'Passwords do not match'
                                : undefined }), showDepartmentField && (_jsx(TextField, { fullWidth: true, label: "Department (Optional)", name: "department", value: formData.department, onChange: handleChange, margin: "normal" })), showLocationField && (_jsx(TextField, { fullWidth: true, label: "Location (Optional)", name: "location", value: formData.location, onChange: handleChange, margin: "normal" })), showPhoneField && (_jsx(TextField, { fullWidth: true, label: "Phone (Optional)", name: "phone", type: "tel", value: formData.phone, onChange: handleChange, margin: "normal" })), _jsx(Button, { fullWidth: true, type: "submit", variant: "contained", sx: { mt: 3, mb: 2, py: 1.5, fontSize: '1rem' }, disabled: loading || success, children: loading ? 'Creating Account...' : ctaLabel }), _jsx(Box, { sx: { textAlign: 'center', mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }, children: _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["Already have an account?", ' ', _jsx(Link, { to: loginPath, style: {
                                            textDecoration: 'none',
                                            color: '#2D5F3F',
                                            fontWeight: 600,
                                        }, children: loginLinkLabel })] }) })] })] }) }));
};
export default RegisterPage;
