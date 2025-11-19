import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';
import { ApiError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';

// API key for Auth0 Action (should be set in environment)
const AUTH0_ACTION_API_KEY = process.env.AUTH0_ACTION_API_KEY;

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, fullName, department, location, phone } = req.body;

      if (!email || !password || !fullName) {
        throw new ApiError(400, 'Email, password, and full name are required');
      }

      const { user, verificationToken } = await AuthService.register({
        email,
        password,
        fullName,
        department,
        location,
        phone,
      });

      // Send verification email
      await EmailService.sendVerificationEmail(user.email, user.fullName, verificationToken);

      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ApiError(400, 'Email and password are required');
      }

      const result = await AuthService.login({ email, password });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        throw new ApiError(400, 'Verification token is required');
      }

      // Validate token and extract userId
      const { userId } = AuthService.verifyToken(token, 'email_verification');

      await AuthService.verifyEmail(userId);

      // Get user info for welcome email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { fullName: true, email: true },
      });

      // Send welcome email
      if (user) {
        await EmailService.sendWelcomeEmail(user.email, user.fullName);
      }

      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        throw new ApiError(400, 'Email is required');
      }

      const result = await AuthService.requestPasswordReset(email);

      // Send password reset email if user exists
      if (result) {
        await EmailService.sendPasswordResetEmail(email, result.fullName, result.resetToken);
      }

      // Always return same message to prevent email enumeration
      res.json({ message: 'If an account exists, a password reset link has been sent' });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        throw new ApiError(400, 'Token and new password are required');
      }

      // Verify reset token from database
      const { userId } = await AuthService.verifyResetToken(token);

      await AuthService.resetPassword(userId, newPassword);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async verifyResetToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        throw new ApiError(400, 'Token is required');
      }

      // Verify reset token from database (throws if invalid/expired)
      await AuthService.verifyResetToken(token);

      res.json({ valid: true, message: 'Token is valid' });
    } catch (error) {
      next(error);
    }
  }

  // OTP Authentication Endpoints

  static async requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        throw new ApiError(400, 'Email is required');
      }

      const result = await AuthService.requestOtp(email);

      // Send OTP email if user exists
      if (result) {
        // Get the OTP from database to send in email
        const user = await prisma.user.findUnique({
          where: { email },
          select: { otpCode: true, fullName: true },
        });

        if (user && user.otpCode) {
          await EmailService.sendOtpEmail(email, user.fullName, user.otpCode);
        }
      }

      // Always return same message to prevent email enumeration
      res.json({ message: 'If an account exists, a verification code has been sent' });
    } catch (error) {
      next(error);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        throw new ApiError(400, 'Email and verification code are required');
      }

      const result = await AuthService.verifyOtp(email, code);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // Auth0 Integration Endpoints

  /**
   * Get user by email for Auth0 Action
   * This endpoint is called by Auth0 Action to fetch user data for custom claims
   * Protected by API key
   */
  static async getUserByEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate API key
      const apiKey = req.headers['x-api-key'] as string;

      if (!AUTH0_ACTION_API_KEY) {
        console.error('AUTH0_ACTION_API_KEY not configured');
        throw new ApiError(500, 'Server configuration error');
      }

      if (!apiKey || apiKey !== AUTH0_ACTION_API_KEY) {
        throw new ApiError(401, 'Invalid API key');
      }

      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        throw new ApiError(400, 'Email parameter is required');
      }

      const userData = await AuthService.getUserByEmail(email);

      if (!userData) {
        // Return null for users not in database (they'll get default STAFF role)
        res.json(null);
        return;
      }

      res.json(userData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync Auth0 user with PostgreSQL database
   * Called by frontend after Auth0 authentication
   * Protected by authenticateAuth0 middleware - uses validated email from token
   */
  static async syncAuth0User(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get email from validated Auth0 token (set by authenticateAuth0 middleware)
      const userFromToken = (req as any).user;

      console.log('syncAuth0User - userFromToken:', userFromToken);

      if (!userFromToken || !userFromToken.email) {
        throw new ApiError(401, 'Invalid token - no email found');
      }

      // Use the validated email from the token, not from request body
      const email = userFromToken.email;
      const auth0Id = userFromToken.auth0Id || '';
      const { name } = req.body; // Name can come from body as it's not security-sensitive

      console.log('syncAuth0User - calling AuthService.syncAuth0User with email:', email);

      const userData = await AuthService.syncAuth0User(email, auth0Id, name || '');

      console.log('syncAuth0User - userData returned:', userData);

      if (!userData) {
        throw new ApiError(403, 'Account is deactivated');
      }

      res.json(userData);
    } catch (error) {
      console.error('syncAuth0User - error:', error);
      next(error);
    }
  }
}
