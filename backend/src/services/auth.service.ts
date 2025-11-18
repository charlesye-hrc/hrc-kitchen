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
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
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

    // Generate verification token
    const verificationToken = this.generateVerificationToken(user.id, user.email);

    return { user, verificationToken };
  }

  static async login(data: LoginDTO): Promise<AuthResponse> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
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
      throw new ApiError(401, 'Invalid credentials');
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

    // Generate JWT token
    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Check if user has admin domain access
    const hasAdminAccess = await hasAdminDomainAccess(user.email);

    // Get accessible locations
    // ADMIN role has access to all locations
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
      hasAdminAccess, // Indicates if email domain allows management app access
      accessibleLocations,
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
