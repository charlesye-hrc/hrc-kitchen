import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, UserRole } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { hasAdminDomainAccess } from '../middleware/domainValidation';

export interface RegisterDTO {
  email: string;
  password: string;
  fullName: string;
  department?: string;
  location?: string;
  phone?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface LoginStepOneResponse {
  requiresOtp: true;
  message: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    lastSelectedLocationId?: string | null;
  };
  token: string;
  hasAdminAccess: boolean; // NEW: Indicates if user can access management app
  accessibleLocations?: Array<{
    id: string;
    name: string;
  }>;
}

export class AuthService {
  private static readonly BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');
  private static readonly JWT_SECRET = (() => {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return process.env.JWT_SECRET;
  })();
  private static readonly JWT_EXPIRES_IN = '7d'; // 7 days for all authenticated users
  private static readonly OTP_CODE_EXPIRES_MINUTES = 10; // OTP valid for 10 minutes
  private static readonly VERIFICATION_TOKEN_EXPIRES = '24h';
  private static readonly RESET_TOKEN_EXPIRES = '1h';
  private static readonly GUEST_ORDER_TOKEN_EXPIRES = '30d';

  static async register(data: RegisterDTO): Promise<{ user: User; verificationToken: string }> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ApiError(400, 'Email already registered');
    }

    // Validate password strength
    this.validatePassword(data.password);

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, this.BCRYPT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        fullName: data.fullName,
        department: data.department,
        location: data.location,
        phone: data.phone,
        role: UserRole.STAFF,
        emailVerified: false,
        isActive: true,
      },
    });

    // Link any existing guest orders to this new user account
    await prisma.order.updateMany({
      where: {
        guestEmail: data.email,
        userId: null, // Only link orders that aren't already linked to a user
      },
      data: {
        userId: user.id,
      },
    });

    console.log(`Linked guest orders for ${data.email} to new user account ${user.id}`);

    // Generate verification token
    const verificationToken = this.generateVerificationToken(user.id, user.email);

    return { user, verificationToken };
  }

  static async login(data: LoginDTO): Promise<LoginStepOneResponse> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Check if user has been invited but hasn't completed setup
    if (!user.passwordHash) {
      throw new ApiError(403, 'Please complete your account setup by clicking the invitation link sent to your email');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(403, 'Account is deactivated');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new ApiError(403, 'Please verify your email before logging in');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!isValidPassword) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Password is valid - now generate and send OTP
    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + this.OTP_CODE_EXPIRES_MINUTES * 60 * 1000);

    // Store OTP in database (invalidates any previous OTP)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode,
        otpExpiresAt,
      },
    });

    console.log(`Login step 1 successful for ${data.email} - OTP generated`);

    // Return response indicating OTP is required
    return {
      requiresOtp: true,
      message: 'Password verified. Please enter the verification code sent to your email.',
    };
  }

  static async verifyEmail(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }

  static async requestPasswordReset(email: string): Promise<{ resetToken: string; fullName: string } | null> {
    const startTime = Date.now();
    const minDuration = 100; // Minimum response time in ms to prevent timing attacks

    const user = await prisma.user.findUnique({
      where: { email },
    });

    let result: { resetToken: string; fullName: string } | null = null;

    if (user) {
      // Generate a secure random token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Store token in database (this invalidates any previous token)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiresAt,
        },
      });

      result = { resetToken, fullName: user.fullName };
      console.log(`Password reset token generated for ${email}`);
    }

    // Ensure consistent response time to prevent email enumeration via timing
    const elapsed = Date.now() - startTime;
    const delay = Math.max(0, minDuration - elapsed);
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    return result;
  }

  static async verifyResetToken(token: string): Promise<{ userId: string; email: string }> {
    // Find user with this reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiresAt: {
          gt: new Date(), // Token must not be expired
        },
      },
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }

    return { userId: user.id, email: user.email };
  }

  static async resetPassword(userId: string, newPassword: string): Promise<void> {
    this.validatePassword(newPassword);

    const passwordHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);

    // Update password and clear the reset token (invalidate it)
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });
  }

  // OTP Authentication Methods

  static async getOtpCode(email: string): Promise<string | null> {
    // Helper method to retrieve OTP code for email sending
    // Used after login step 1 to get the OTP for email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { otpCode: true, otpExpiresAt: true },
    });

    // Only return OTP if it exists and hasn't expired
    if (user?.otpCode && user.otpExpiresAt && user.otpExpiresAt > new Date()) {
      return user.otpCode;
    }

    return null;
  }

  static async verifyOtp(email: string, otpCode: string): Promise<AuthResponse> {
    // Find user with this email and valid OTP
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userLocations: {
          include: {
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid email or code');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(403, 'Account is deactivated');
    }

    // Check if OTP exists and matches
    if (!user.otpCode || user.otpCode !== otpCode) {
      throw new ApiError(401, 'Invalid email or code');
    }

    // Check if OTP is expired
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new ApiError(401, 'Code has expired. Please request a new one.');
    }

    // Clear OTP after successful verification (single use)
    // Also mark email as verified if not already
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        emailVerified: true, // OTP verifies email ownership
      },
    });

    // Generate JWT token (7 days)
    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Check if user has admin domain access
    const hasAdminAccess = await hasAdminDomainAccess(user.email);

    // Get accessible locations
    let accessibleLocations;
    if (user.role === UserRole.ADMIN) {
      const allLocations = await prisma.location.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      accessibleLocations = allLocations;
    } else {
      accessibleLocations = user.userLocations.map((ul) => ul.location);
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        lastSelectedLocationId: user.lastSelectedLocationId,
      },
      token,
      hasAdminAccess,
      accessibleLocations,
    };
  }

  private static generateToken(payload: {
    id: string;
    email: string;
    role: UserRole;
  }): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
    });
  }

  static generateVerificationToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email, type: 'email_verification' },
      this.JWT_SECRET,
      { expiresIn: this.VERIFICATION_TOKEN_EXPIRES }
    );
  }

  static generateResetToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email, type: 'password_reset' },
      this.JWT_SECRET,
      { expiresIn: this.RESET_TOKEN_EXPIRES }
    );
  }

  static verifyToken(token: string, expectedType: 'email_verification' | 'password_reset'): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as {
        userId: string;
        email: string;
        type: string;
      };

      if (decoded.type !== expectedType) {
        throw new ApiError(400, 'Invalid token type');
      }

      return { userId: decoded.userId, email: decoded.email };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError(400, 'Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new ApiError(400, 'Invalid token');
      }
      throw error;
    }
  }

  static generateGuestOrderToken(orderId: string): string {
    return jwt.sign(
      { orderId, type: 'guest_order_access' },
      this.JWT_SECRET,
      { expiresIn: this.GUEST_ORDER_TOKEN_EXPIRES }
    );
  }

  static verifyGuestOrderToken(token: string): { orderId: string } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as {
        orderId: string;
        type: string;
      };

      if (decoded.type !== 'guest_order_access') {
        throw new ApiError(400, 'Invalid token type');
      }

      return { orderId: decoded.orderId };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new ApiError(400, 'Order access link has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new ApiError(400, 'Invalid order access link');
      }
      throw error;
    }
  }

  private static validatePassword(password: string): void {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      throw new ApiError(400, 'Password must be at least 8 characters');
    }

    if (!hasUpperCase) {
      throw new ApiError(400, 'Password must contain at least one uppercase letter');
    }

    if (!hasLowerCase) {
      throw new ApiError(400, 'Password must contain at least one lowercase letter');
    }

    if (!hasNumber) {
      throw new ApiError(400, 'Password must contain at least one number');
    }

    if (!hasSpecialChar) {
      throw new ApiError(400, 'Password must contain at least one special character');
    }
  }
}
