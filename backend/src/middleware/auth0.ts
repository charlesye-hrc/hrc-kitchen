/**
 * Auth0 Authentication Middleware for HRC Kitchen
 *
 * Validates Auth0 JWTs and extracts user information including custom claims.
 * Supports both Auth0 tokens and legacy JWT tokens during migration period.
 */

import { Request, Response, NextFunction } from 'express';
import { auth } from 'express-oauth2-jwt-bearer';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { UserRole } from '@prisma/client';
import { ApiError } from './errorHandler';
import {
  auth0Config,
  AUTH0_NAMESPACE,
  extractCustomClaims,
  Auth0JwtPayload,
} from '../config/auth0.config';

// Extended request interface with Auth0 user data
export interface Auth0Request extends Request {
  user?: {
    id: string; // Database user ID
    email: string;
    role: UserRole;
    auth0Id?: string; // Auth0 user ID (sub claim)
    hasAdminAccess?: boolean;
  };
  auth?: {
    payload: Auth0JwtPayload;
  };
}

// Create Auth0 JWT validator
const auth0JwtCheck = auth({
  audience: auth0Config.audience,
  issuerBaseURL: auth0Config.issuerBaseURL,
  tokenSigningAlg: 'RS256',
});

/**
 * Middleware that validates Auth0 JWT tokens
 * Falls back to legacy JWT validation during migration
 * Also supports opaque tokens by calling Auth0's /userinfo endpoint
 */
export const authenticateAuth0 = async (
  req: Auth0Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'No token provided'));
  }

  const token = authHeader.substring(7);

  // Try to decode token to determine if it's Auth0 JWT, legacy JWT, or opaque token
  const decoded = jwt.decode(token, { complete: true });

  console.log('Auth0 middleware - Token decoded:', decoded ? 'JWT' : 'Opaque/Invalid');
  console.log('Auth0 middleware - issuerBaseURL:', auth0Config.issuerBaseURL);

  if (!decoded) {
    // Token is not a JWT - it might be an opaque Auth0 access token
    // Validate by calling Auth0's /userinfo endpoint
    try {
      console.log('Auth0 middleware - Calling userinfo endpoint...');
      const userInfoResponse = await axios.get(
        `${auth0Config.issuerBaseURL}/userinfo`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const userInfo = userInfoResponse.data;
      console.log('Auth0 middleware - UserInfo response:', userInfo);

      if (!userInfo || !userInfo.email) {
        return next(new ApiError(401, 'Could not get user info from Auth0'));
      }

      // Set user on request with info from Auth0 userinfo endpoint
      req.user = {
        id: '', // Will be populated by syncAuth0User
        email: userInfo.email,
        role: 'STAFF' as UserRole, // Default role, will be updated by syncAuth0User
        auth0Id: userInfo.sub,
      };

      console.log('Auth0 middleware - User set from userinfo:', req.user.email);
      return next();
    } catch (error: any) {
      console.error('Failed to validate opaque token with Auth0 userinfo:', error.response?.data || error.message);
      return next(new ApiError(401, 'Invalid token'));
    }
  }

  // Check if this is an Auth0 token (has 'iss' claim with Auth0 domain)
  const payload = decoded.payload as Record<string, unknown>;
  const issuer = payload.iss as string;

  if (issuer && issuer.includes('auth0.com')) {
    // Auth0 JWT token - validate with Auth0 middleware
    auth0JwtCheck(req, res, async (err) => {
      if (err) {
        console.error('Auth0 JWT validation error:', err);
        return next(new ApiError(401, 'Invalid Auth0 token'));
      }

      // Extract custom claims from Auth0 token
      const auth0Payload = req.auth?.payload as Auth0JwtPayload;

      if (!auth0Payload) {
        return next(new ApiError(401, 'Invalid token payload'));
      }

      const customClaims = extractCustomClaims(auth0Payload);

      // Check if email is in the token
      let email = auth0Payload.email || '';

      // If no email in token, fetch from userinfo endpoint
      if (!email) {
        console.log('Auth0 middleware - No email in JWT, fetching from userinfo...');
        try {
          const userInfoResponse = await axios.get(
            `${auth0Config.issuerBaseURL}/userinfo`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          email = userInfoResponse.data.email || '';
          console.log('Auth0 middleware - Got email from userinfo:', email);
        } catch (userInfoError: any) {
          console.error('Failed to fetch email from userinfo:', userInfoError.response?.data || userInfoError.message);
        }
      }

      // Set user on request
      req.user = {
        id: customClaims.userId,
        email: email,
        role: customClaims.roles[0] || 'STAFF',
        auth0Id: auth0Payload.sub,
        hasAdminAccess: customClaims.hasAdminAccess,
      };

      console.log('Auth0 middleware - JWT validated, user email:', email);
      next();
    });
  } else {
    // Legacy JWT token - validate with existing secret
    try {
      const secret = process.env.JWT_SECRET;

      if (!secret) {
        throw new Error('JWT_SECRET not configured');
      }

      const legacyPayload = jwt.verify(token, secret) as {
        id: string;
        email: string;
        role: UserRole;
      };

      req.user = {
        id: legacyPayload.id,
        email: legacyPayload.email,
        role: legacyPayload.role,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return next(new ApiError(401, 'Invalid token'));
      } else if (error instanceof jwt.TokenExpiredError) {
        return next(new ApiError(401, 'Token expired'));
      }
      next(error);
    }
  }
};

/**
 * Role-based authorization middleware
 * Works with both Auth0 and legacy tokens
 */
export const authorizeAuth0 = (...roles: UserRole[]) => {
  return (req: Auth0Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'Forbidden: Insufficient permissions');
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Validates token if present but doesn't require it
 */
export const optionalAuth0 = async (
  req: Auth0Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token - continue without user
    return next();
  }

  // Token present - validate it
  return authenticateAuth0(req, res, next);
};
