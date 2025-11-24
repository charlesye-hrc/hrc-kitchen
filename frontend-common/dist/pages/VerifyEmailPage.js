import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Paper, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
const VerifyEmailPage = ({ api, loginPath = '/login', verifyEmailPath = '/auth/verify-email', redirectDelayMs = 3000, disableSuccessRedirect = false, loadingTitle = 'Verifying Your Email', loadingSubtitle = 'Please wait while we verify your email address...', successTitle = 'Email Verified!', successMessage = 'Your email has been verified successfully!', errorTitle = 'Verification Failed', errorFallbackMessage = 'Email verification failed. The link may have expired.', buttonLabel = 'Go to Login', onVerifySuccess, }) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');
    const hasVerified = useRef(false);
    const redirectTimeoutRef = useRef();
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
            }
            catch (err) {
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
    return (_jsx(Box, { sx: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', py: 4 }, children: _jsx(Paper, { sx: {
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
                },
            }, children: _jsxs(Box, { sx: { textAlign: 'center' }, children: [status === 'loading' && (_jsxs(_Fragment, { children: [_jsx(CircularProgress, { size: 56, sx: { mb: 3 } }), _jsx(Typography, { variant: "h5", gutterBottom: true, sx: { fontWeight: 700 }, children: loadingTitle }), _jsx(Typography, { variant: "body2", color: "text.secondary", children: loadingSubtitle })] })), status === 'success' && (_jsxs(_Fragment, { children: [_jsx(Box, { sx: {
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
                                }, children: message }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mb: 3 }, children: "Redirecting to login page..." }), _jsx(Button, { component: Link, to: loginPath, variant: "contained", fullWidth: true, sx: { py: 1.5 }, children: buttonLabel })] })), status === 'error' && (_jsxs(_Fragment, { children: [_jsx(Box, { sx: {
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
                                }, children: message }), _jsx(Button, { component: Link, to: loginPath, variant: "contained", fullWidth: true, sx: { py: 1.5 }, children: buttonLabel })] }))] }) }) }));
};
export default VerifyEmailPage;
