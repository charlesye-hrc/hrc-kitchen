import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';
import { ApiError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';

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

      // Get user info and OTP code to send email
      const user = await prisma.user.findUnique({
        where: { email },
        select: { fullName: true },
      });

      const otpCode = await AuthService.getOtpCode(email);

      if (user && otpCode) {
        await EmailService.sendOtpEmail(email, user.fullName, otpCode);
      }

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

  // OTP Verification (Step 2 of login)

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
}
