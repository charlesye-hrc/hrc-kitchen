import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authLimiter } from '../middleware/rateLimiter';
import { authenticateAuth0 } from '../middleware/auth0';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', authLimiter, AuthController.register);

// POST /api/v1/auth/login
router.post('/login', authLimiter, AuthController.login);

// POST /api/v1/auth/verify-email
router.post('/verify-email', authLimiter, AuthController.verifyEmail);

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', authLimiter, AuthController.forgotPassword);

// POST /api/v1/auth/reset-password
router.post('/reset-password', authLimiter, AuthController.resetPassword);

// POST /api/v1/auth/verify-reset-token
router.post('/verify-reset-token', authLimiter, AuthController.verifyResetToken);

// OTP Authentication Routes
// POST /api/v1/auth/request-otp
router.post('/request-otp', authLimiter, AuthController.requestOtp);

// POST /api/v1/auth/verify-otp
router.post('/verify-otp', authLimiter, AuthController.verifyOtp);

// Auth0 Integration Routes
// GET /api/v1/auth/user-by-email - Used by Auth0 Action to get user data for custom claims
router.get('/user-by-email', AuthController.getUserByEmail);

// POST /api/v1/auth/sync-auth0-user - Called by frontend after Auth0 authentication
// Protected by Auth0 token validation to prevent unauthorized JWT generation
router.post('/sync-auth0-user', authenticateAuth0, AuthController.syncAuth0User);

export default router;
