import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
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
  };
  token: string;
  hasAdminAccess: boolean; // NEW: Indicates if user can access management app
}

export class AuthService {
  private static readonly BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

  static async register(data: RegisterDTO): Promise<User> {
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

    // TODO: Send verification email

    return user;
  }

  static async login(data: LoginDTO): Promise<AuthResponse> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(403, 'Account is deactivated');
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

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      token,
      hasAdminAccess, // Indicates if email domain allows management app access
    };
  }

  static async verifyEmail(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }

  static async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // TODO: Generate reset token and send email
    console.log(`Password reset requested for ${email}`);
  }

  static async resetPassword(userId: string, newPassword: string): Promise<void> {
    this.validatePassword(newPassword);

    const passwordHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
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
