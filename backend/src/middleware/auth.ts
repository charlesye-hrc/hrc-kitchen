import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { ApiError } from './errorHandler';
import { UserRole } from '@prisma/client';
import { AUTH0_NAMESPACE } from '../config/auth0.config';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    auth0Id?: string;
    hasAdminAccess?: boolean;
  };
}

// JWKS client for Auth0 token verification
let jwksClient: jwksRsa.JwksClient | null = null;

function getJwksClient(): jwksRsa.JwksClient {
  if (!jwksClient && process.env.AUTH0_DOMAIN) {
    jwksClient = jwksRsa({
      jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    });
  }
  return jwksClient!;
}

// Get signing key from Auth0 JWKS
function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  const client = getJwksClient();
  if (!client) {
    callback(new Error('JWKS client not initialized'));
    return;
  }

  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

// Verify Auth0 token
async function verifyAuth0Token(token: string): Promise<{
  id: string;
  email: string;
  role: UserRole;
  auth0Id: string;
  hasAdminAccess: boolean;
}> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        audience: process.env.AUTH0_AUDIENCE,
        issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      },
      (err, decoded) => {
        if (err) {
          reject(err);
          return;
        }

        const payload = decoded as Record<string, unknown>;

        // Extract custom claims from Auth0 namespace
        const roles = (payload[`${AUTH0_NAMESPACE}/roles`] as UserRole[]) || ['STAFF'];
        const userId = (payload[`${AUTH0_NAMESPACE}/userId`] as string) || '';
        const hasAdminAccess = (payload[`${AUTH0_NAMESPACE}/hasAdminAccess`] as boolean) || false;

        resolve({
          id: userId,
          email: (payload.email as string) || '',
          role: roles[0] || 'STAFF',
          auth0Id: payload.sub as string,
          hasAdminAccess,
        });
      }
    );
  });
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided');
    }

    const token = authHeader.substring(7);

    // Decode token header to determine type
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded) {
      throw new ApiError(401, 'Invalid token');
    }

    const payload = decoded.payload as Record<string, unknown>;
    const issuer = payload.iss as string;

    // Check if this is an Auth0 token
    if (issuer && issuer.includes('auth0.com') && process.env.AUTH0_DOMAIN) {
      // Verify Auth0 token
      try {
        const auth0User = await verifyAuth0Token(token);
        req.user = auth0User;
        next();
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          next(new ApiError(401, 'Token expired'));
        } else {
          next(new ApiError(401, 'Invalid Auth0 token'));
        }
      }
    } else {
      // Legacy JWT token
      const secret = process.env.JWT_SECRET;

      if (!secret) {
        throw new Error('JWT_SECRET not configured');
      }

      const legacyDecoded = jwt.verify(token, secret) as {
        id: string;
        email: string;
        role: UserRole;
      };

      req.user = legacyDecoded;
      next();
    }
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, 'Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new ApiError(401, 'Token expired'));
    } else if (error instanceof ApiError) {
      next(error);
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(401, 'Unauthorized');
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, 'Forbidden: Insufficient permissions');
    }

    next();
  };
};
