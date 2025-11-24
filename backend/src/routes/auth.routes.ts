import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authLimiter, accountLimiter } from '../middleware/rateLimiter';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', authLimiter, accountLimiter, AuthController.register);

// POST /api/v1/auth/login
router.post('/login', authLimiter, accountLimiter, AuthController.login);

// POST /api/v1/auth/verify-email
router.post('/verify-email', authLimiter, AuthController.verifyEmail);

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', authLimiter, accountLimiter, AuthController.forgotPassword);

// POST /api/v1/auth/reset-password
router.post('/reset-password', authLimiter, AuthController.resetPassword);

// POST /api/v1/auth/verify-reset-token
router.post('/verify-reset-token', authLimiter, AuthController.verifyResetToken);

// POST /api/v1/auth/verify-otp (Step 2 of login - verify OTP after password)
router.post('/verify-otp', authLimiter, accountLimiter, AuthController.verifyOtp);

// POST /api/v1/auth/logout
router.post('/logout', AuthController.logout);

export default router;
