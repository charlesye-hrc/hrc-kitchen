import crypto from 'crypto';
import { UserRole } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { hasAdminDomainAccess } from '../middleware/domainValidation';

export interface InviteUserDTO {
  email: string;
  fullName: string;
  role: UserRole;
  department?: string;
  phone?: string;
  locationIds?: string[]; // Location assignments
  invitedBy: string; // Admin user ID
}

export interface AcceptInvitationDTO {
  invitationToken: string;
  password: string;
}

export class UserInvitationService {
  private static readonly INVITATION_TOKEN_EXPIRES = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Admin invites a new user
   * Creates user record with invitation token, sends invitation email
   */
  static async inviteUser(data: InviteUserDTO): Promise<{ user: any; invitationToken: string }> {
    // Validate that inviting user is an admin
    const inviter = await prisma.user.findUnique({
      where: { id: data.invitedBy },
    });

    if (!inviter || inviter.role !== UserRole.ADMIN) {
      throw new ApiError(403, 'Only admins can invite users');
    }

    // For privileged roles, validate domain
    const privilegedRoles: UserRole[] = [UserRole.ADMIN, UserRole.KITCHEN, UserRole.FINANCE];
    if (privilegedRoles.includes(data.role as UserRole)) {
      const hasAccess = await hasAdminDomainAccess(data.email);
      if (!hasAccess) {
        const config = await prisma.systemConfig.findUnique({
          where: { configKey: 'restricted_role_domain' },
        });
        const requiredDomain = config?.configValue || '@huonregionalcare.org.au';
        throw new ApiError(400, `${data.role} role requires email from ${requiredDomain} domain`);
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      console.log(`⚠️  User invitation failed: ${data.email} already exists (ID: ${existingUser.id})`);
      throw new ApiError(400, 'User with this email already exists');
    }

    console.log(`📧 Creating invitation for ${data.email} with role ${data.role}`);

    // Validate locations if provided
    if (data.locationIds && data.locationIds.length > 0) {
      const locations = await prisma.location.findMany({
        where: { id: { in: data.locationIds } },
      });

      if (locations.length !== data.locationIds.length) {
        throw new ApiError(400, 'One or more location IDs are invalid');
      }
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + this.INVITATION_TOKEN_EXPIRES);

    // Create user record (without password)
    const user = await prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        department: data.department,
        phone: data.phone,
        emailVerified: false, // Will be verified when they accept invitation
        isActive: true,
        invitedBy: data.invitedBy,
        invitationToken,
        invitationExpiresAt,
        invitedAt: new Date(),
      },
    });

    // Assign locations if provided
    if (data.locationIds && data.locationIds.length > 0) {
      await prisma.userLocation.createMany({
        data: data.locationIds.map((locationId) => ({
          userId: user.id,
          locationId,
        })),
      });
    }

    console.log(`User invitation created for ${data.email} by ${inviter.email}`);

    return { user, invitationToken };
  }

  /**
   * Verify invitation token is valid
   */
  static async verifyInvitationToken(token: string): Promise<{ userId: string; email: string; fullName: string; role: UserRole }> {
    const user = await prisma.user.findFirst({
      where: {
        invitationToken: token,
        invitationExpiresAt: {
          gt: new Date(), // Token must not be expired
        },
        passwordHash: null, // User hasn't completed setup yet
      },
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired invitation token');
    }

    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  /**
   * Accept invitation and complete user setup
   * Sets password, verifies email, clears invitation token
   */
  static async acceptInvitation(data: AcceptInvitationDTO): Promise<void> {
    // Verify token first
    const userInfo = await this.verifyInvitationToken(data.invitationToken);

    // Import bcrypt here to avoid circular dependency
    const bcrypt = await import('bcrypt');

    // Validate password strength using AuthService's private method
    // We'll need to expose this or duplicate the validation
    if (data.password.length < 8) {
      throw new ApiError(400, 'Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(data.password)) {
      throw new ApiError(400, 'Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(data.password)) {
      throw new ApiError(400, 'Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(data.password)) {
      throw new ApiError(400, 'Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(data.password)) {
      throw new ApiError(400, 'Password must contain at least one special character');
    }

    // Hash password
    const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    // Update user: set password, verify email, clear invitation token
    await prisma.user.update({
      where: { id: userInfo.userId },
      data: {
        passwordHash,
        emailVerified: true, // Email is verified by accepting invitation
        invitationToken: null,
        invitationExpiresAt: null,
      },
    });

    console.log(`User ${userInfo.email} accepted invitation and completed setup`);
  }

  /**
   * Get list of invited users (pending invitations)
   */
  static async getPendingInvitations(adminId: string): Promise<any[]> {
    // Verify admin
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ApiError(403, 'Only admins can view pending invitations');
    }

    const pendingUsers = await prisma.user.findMany({
      where: {
        passwordHash: null, // Haven't completed setup
        invitationToken: { not: null },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        invitedAt: true,
        invitationExpiresAt: true,
        inviter: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        invitedAt: 'desc',
      },
    });

    return pendingUsers;
  }

  /**
   * Resend invitation email
   */
  static async resendInvitation(userId: string, adminId: string): Promise<{ invitationToken: string }> {
    // Verify admin
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ApiError(403, 'Only admins can resend invitations');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.passwordHash !== null) {
      throw new ApiError(400, 'User has already accepted invitation');
    }

    // Generate new invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationExpiresAt = new Date(Date.now() + this.INVITATION_TOKEN_EXPIRES);

    // Update user with new token
    await prisma.user.update({
      where: { id: userId },
      data: {
        invitationToken,
        invitationExpiresAt,
        invitedAt: new Date(),
      },
    });

    console.log(`Invitation resent for ${user.email} by ${admin.email}`);

    return { invitationToken };
  }

  /**
   * Cancel/delete pending invitation
   */
  static async cancelInvitation(userId: string, adminId: string): Promise<void> {
    // Verify admin
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
    });

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ApiError(403, 'Only admins can cancel invitations');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.passwordHash !== null) {
      throw new ApiError(400, 'Cannot cancel invitation - user has already set up their account');
    }

    // Delete the user record (cascade will delete user_locations)
    await prisma.user.delete({
      where: { id: userId },
    });

    console.log(`Invitation for ${user.email} cancelled by ${admin.email}`);
  }
}
