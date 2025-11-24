import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Paper, TextField, Button, Typography, Alert } from '@mui/material';
import { executeRecaptcha } from '../utils/recaptcha';
const ForgotPasswordPage = ({ api, loginPath = '/login', appContext }) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (!siteKey) {
                throw new Error('Captcha is not configured. Please contact support.');
            }
            const captchaToken = await executeRecaptcha(siteKey, appContext === 'admin' ? 'admin_forgot_password' : 'public_forgot_password');
            const payload = { email };
            if (appContext) {
                payload.app = appContext;
            }
            payload.captchaToken = captchaToken;
            await api.post('/auth/forgot-password', payload);
            setSuccess(true);
        }
        catch (err) {
            setError(err.response?.data?.error?.message ||
                err.message ||
                'Failed to send reset email. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', py: 4 }, children: _jsxs(Paper, { sx: {
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
                            }, children: "\uD83D\uDD11" }), _jsx(Typography, { variant: "h4", gutterBottom: true, align: "center", sx: {
                                fontSize: { xs: '1.75rem', md: '2rem' },
                                fontWeight: 700,
                                mb: 0.5,
                            }, children: "Forgot Password?" }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { fontWeight: 500 }, children: "Enter your email to receive a reset link" })] }), error && (_jsx(Alert, { severity: "error", sx: {
                        mb: 3,
                        borderLeft: '4px solid',
                        borderLeftColor: 'error.main',
                    }, children: error })), success ? (_jsxs(_Fragment, { children: [_jsx(Alert, { severity: "success", sx: {
                                mb: 3,
                                borderLeft: '4px solid',
                                borderLeftColor: 'success.main',
                            }, children: "If an account exists with this email, you will receive a password reset link shortly." }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3, textAlign: 'center' }, children: "Please check your inbox and spam folder." }), _jsx(Button, { component: Link, to: loginPath, variant: "contained", fullWidth: true, sx: { py: 1.5, fontSize: '1rem' }, children: "Back to Login" })] })) : (_jsxs("form", { onSubmit: handleSubmit, children: [_jsx(TextField, { fullWidth: true, label: "Email", type: "email", value: email, onChange: (e) => setEmail(e.target.value), margin: "normal", required: true, autoComplete: "email", autoFocus: true }), _jsx(Button, { fullWidth: true, type: "submit", variant: "contained", sx: { mt: 3, mb: 2, py: 1.5, fontSize: '1rem' }, disabled: loading, children: loading ? 'Sending...' : 'Send Reset Link' }), _jsx(Box, { sx: { textAlign: 'center', mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }, children: _jsxs(Typography, { variant: "body2", color: "text.secondary", children: ["Remember your password?", ' ', _jsx(Link, { to: loginPath, style: {
                                            textDecoration: 'none',
                                            color: '#2D5F3F',
                                            fontWeight: 600,
                                        }, children: "Sign In" })] }) })] }))] }) }));
};
export default ForgotPasswordPage;
