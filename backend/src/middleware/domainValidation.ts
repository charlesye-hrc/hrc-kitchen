import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { ApiError } from './errorHandler';
import { UserRole } from '@prisma/client';
import prisma from '../lib/prisma';

/**
 * Middleware that validates user's email domain for privileged roles
 * Uses restricted_role_domain from system_config table (configurable via admin UI)
 * Only users with matching email domains can access management routes
 */
export const validateAdminDomain = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      throw new ApiError(401, 'Authentication required');
    }

    // Only apply domain restrictions to privileged roles
    const privilegedRoles: UserRole[] = ['KITCHEN', 'ADMIN', 'FINANCE'];

    if (!privilegedRoles.includes(user.role)) {
      // Staff role can have any email domain
      return next();
    }

    // Get restricted domain from database config
    const config = await prisma.systemConfig.findUnique({
      where: { configKey: 'restricted_role_domain' },
    });

    const allowedDomain = config?.configValue || '@huonregionalcare.org.au';

    // Check if user's email ends with allowed domain
    if (!user.email.toLowerCase().endsWith(allowedDomain.toLowerCase())) {
      throw new ApiError(
        403,
        `Access denied: Your email domain is not authorized for ${user.role} role. Required domain: ${allowedDomain}`
      );
    }

    // Domain is valid, proceed
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Checks if a user's email domain grants access to management app
 * Used in login response to set hasAdminAccess flag
 *
 * @param email - User's email address
 * @returns true if email domain matches restricted_role_domain
 */
export const hasAdminDomainAccess = async (email: string): Promise<boolean> => {
  try {
    // Get restricted domain from database config
    const config = await prisma.systemConfig.findUnique({
      where: { configKey: 'restricted_role_domain' },
    });

    const allowedDomain = config?.configValue || '@huonregionalcare.org.au';

    // Check if email ends with allowed domain
    return email.toLowerCase().endsWith(allowedDomain.toLowerCase());
  } catch (error) {
    // Return false on error to fail safely
    return false;
  }
};
