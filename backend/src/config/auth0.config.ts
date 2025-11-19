/**
 * Auth0 Configuration for HRC Kitchen Backend
 *
 * This file contains Auth0 configuration constants and types.
 * Configure your Auth0 tenant settings in the .env file.
 */

export interface Auth0Config {
  domain: string;
  audience: string;
  issuerBaseURL: string;
  clientId: string;
  clientSecret: string;
  namespace: string;
}

// Custom claims namespace - must be a URL to avoid conflicts with OIDC claims
export const AUTH0_NAMESPACE = 'https://hrc-kitchen.com';

// Auth0 configuration loaded from environment variables
export const auth0Config: Auth0Config = {
  domain: process.env.AUTH0_DOMAIN || '',
  audience: process.env.AUTH0_AUDIENCE || '',
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
  clientId: process.env.AUTH0_CLIENT_ID || '',
  clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
  namespace: AUTH0_NAMESPACE,
};

// User role types (matching existing Prisma UserRole enum)
export type UserRole = 'STAFF' | 'KITCHEN' | 'FINANCE' | 'ADMIN';

// Interface for Auth0 JWT claims with custom namespace
export interface Auth0JwtPayload {
  sub: string; // Auth0 user ID
  email?: string;
  email_verified?: boolean;
  name?: string;
  [key: string]: unknown; // Custom claims with namespace
}

// Interface for custom claims
export interface Auth0CustomClaims {
  roles: UserRole[];
  hasAdminAccess: boolean;
  userId: string; // Database user ID
  fullName: string;
  accessibleLocations?: Array<{
    id: string;
    name: string;
  }>;
}

// Helper function to extract custom claims from JWT
export function extractCustomClaims(payload: Auth0JwtPayload): Auth0CustomClaims {
  const namespace = AUTH0_NAMESPACE;

  return {
    roles: (payload[`${namespace}/roles`] as UserRole[]) || ['STAFF'],
    hasAdminAccess: (payload[`${namespace}/hasAdminAccess`] as boolean) || false,
    userId: (payload[`${namespace}/userId`] as string) || '',
    fullName: (payload[`${namespace}/fullName`] as string) || payload.name || '',
    accessibleLocations: payload[`${namespace}/accessibleLocations`] as Array<{
      id: string;
      name: string;
    }> | undefined,
  };
}

// Validate Auth0 configuration
export function validateAuth0Config(): void {
  const requiredVars = [
    'AUTH0_DOMAIN',
    'AUTH0_AUDIENCE',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET',
  ];

  const missingVars = requiredVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    console.warn(
      `Warning: Missing Auth0 environment variables: ${missingVars.join(', ')}. ` +
      'Auth0 authentication will not work until these are configured.'
    );
  }
}
