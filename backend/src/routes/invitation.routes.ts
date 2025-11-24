import express, { Response, NextFunction, Request } from 'express';
import { UserRole } from '@prisma/client';
import { UserInvitationService } from '../services/userInvitation.service';
import { EmailService } from '../services/email.service';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { authLimiter } from '../middleware/rateLimiter';

const router = express.Router();

/**
 * POST /api/v1/invitations
 * Admin invites a new user
 * Protected route - requires ADMIN role
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, fullName, role, department, phone, locationIds } = req.body as {
      email: string;
      fullName: string;
      role: UserRole;
      department?: string;
      phone?: string;
      locationIds?: string[];
    };
    console.log(`🔔 POST /invitations - Received invitation request for ${email} with role ${role}`);

    // Verify admin role
    if (req.user!.role !== 'ADMIN') {
      console.log(`❌ Authorization failed: User ${req.user!.email} is not an admin`);
      throw new ApiError(403, 'Only admins can invite users');
    }

    console.log(`✓ Admin verified: ${req.user!.email}`);
    const inviterName = req.user?.email ?? 'Admin User';

    // Invite user
    const { user, invitationToken } = await UserInvitationService.inviteUser({
      email,
      fullName,
      role,
      department,
      phone,
      locationIds,
      invitedBy: req.user!.id,
    });

    // Send invitation email
    try {
      await EmailService.sendInvitationEmail(
        user.email,
        user.fullName,
        inviterName,
        role,
        invitationToken
      );
      console.log(`✅ Invitation email sent successfully to ${user.email}`);
    } catch (emailError) {
      console.error('❌ Failed to send invitation email:', emailError);
      // Don't fail the entire request if email fails
      // The user is already created, admin can resend
    }

    res.status(201).json({
      message: 'User invited successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        invitedAt: user.invitedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/invitations/pending
 * Get list of pending invitations
 * Protected route - requires ADMIN role
 */
router.get('/pending', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      throw new ApiError(403, 'Only admins can view pending invitations');
    }

    const pendingInvitations = await UserInvitationService.getPendingInvitations(req.user!.id);

    res.json({
      invitations: pendingInvitations,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/invitations/:userId/resend
 * Resend invitation email
 * Protected route - requires ADMIN role
 */
router.post('/:userId/resend', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      throw new ApiError(403, 'Only admins can resend invitations');
    }

    const { userId } = req.params;

    const { invitationToken } = await UserInvitationService.resendInvitation(userId, req.user!.id);

    // Get user details to send email
    const prisma = (await import('../lib/prisma')).default;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Send invitation email
    const inviterName = req.user?.email ?? 'Admin User';
    await EmailService.sendInvitationEmail(
      user.email,
      user.fullName,
      inviterName,
      user.role,
      invitationToken
    );

    res.json({
      message: 'Invitation resent successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/invitations/:userId
 * Cancel/delete pending invitation
 * Protected route - requires ADMIN role
 */
router.delete('/:userId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      throw new ApiError(403, 'Only admins can cancel invitations');
    }

    const { userId } = req.params;

    await UserInvitationService.cancelInvitation(userId, req.user!.id);

    res.json({
      message: 'Invitation cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/invitations/verify/:token
 * Verify invitation token (public endpoint)
 */
router.get('/verify/:token', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;

    const userInfo = await UserInvitationService.verifyInvitationToken(token);

    res.json({
      valid: true,
      user: {
        email: userInfo.email,
        fullName: userInfo.fullName,
        role: userInfo.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/invitations/accept
 * Accept invitation and complete user setup (public endpoint)
 */
router.post('/accept', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { invitationToken, password } = req.body;

    await UserInvitationService.acceptInvitation({
      invitationToken,
      password,
    });

    res.json({
      message: 'Invitation accepted successfully. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
