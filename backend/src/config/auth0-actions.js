/**
 * Auth0 Actions for HRC Kitchen
 *
 * Copy these actions into your Auth0 Dashboard under:
 * Actions > Library > Custom Actions
 *
 * Then add them to the Login flow under:
 * Actions > Flows > Login
 */

// =============================================================================
// ACTION 1: Add Custom Claims to Tokens
// =============================================================================
// Name: Add HRC Kitchen Claims
// Trigger: Login / Post Login
// =============================================================================

/**
 * This action adds custom claims to the ID and Access tokens.
 * It queries your database to get user roles and permissions.
 *
 * IMPORTANT: You need to add these Secrets in Auth0 Action settings:
 * - DATABASE_URL: Your Neon PostgreSQL connection string
 * - RESTRICTED_ROLE_DOMAIN: The domain for admin access (e.g., @huonregionalcare.org.au)
 */

exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://hrc-kitchen.com';

  // Get user email
  const email = event.user.email;

  if (!email) {
    console.log('No email found for user');
    return;
  }

  // Check if email domain grants admin access
  const restrictedDomain = event.secrets.RESTRICTED_ROLE_DOMAIN || '@huonregionalcare.org.au';
  const hasAdminAccess = email.toLowerCase().endsWith(restrictedDomain.toLowerCase());

  // Query your database for user details
  // You'll need to use the pg package in Auth0 Actions
  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: event.secrets.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Find user by email
    const userResult = await pool.query(
      `SELECT id, email, "fullName", role, "lastSelectedLocationId", "isActive"
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      // User not in database yet - will be created on first login
      // Set default claims for new users
      api.accessToken.setCustomClaim(`${namespace}/roles`, ['STAFF']);
      api.accessToken.setCustomClaim(`${namespace}/hasAdminAccess`, hasAdminAccess);
      api.accessToken.setCustomClaim(`${namespace}/userId`, '');
      api.accessToken.setCustomClaim(`${namespace}/fullName`, event.user.name || '');

      api.idToken.setCustomClaim(`${namespace}/roles`, ['STAFF']);
      api.idToken.setCustomClaim(`${namespace}/hasAdminAccess`, hasAdminAccess);
      api.idToken.setCustomClaim(`${namespace}/userId`, '');
      api.idToken.setCustomClaim(`${namespace}/fullName`, event.user.name || '');

      return;
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (!user.isActive) {
      api.access.deny('Your account has been deactivated');
      return;
    }

    // Get accessible locations for user
    let accessibleLocations = [];

    if (user.role === 'ADMIN') {
      // Admin has access to all locations
      const locationsResult = await pool.query(
        `SELECT id, name FROM locations WHERE "isActive" = true ORDER BY name`
      );
      accessibleLocations = locationsResult.rows;
    } else {
      // Other roles have specific location assignments
      const locationsResult = await pool.query(
        `SELECT l.id, l.name
         FROM locations l
         JOIN user_locations ul ON l.id = ul."locationId"
         WHERE ul."userId" = $1 AND l."isActive" = true
         ORDER BY l.name`,
        [user.id]
      );
      accessibleLocations = locationsResult.rows;
    }

    // Set custom claims on access token
    api.accessToken.setCustomClaim(`${namespace}/roles`, [user.role]);
    api.accessToken.setCustomClaim(`${namespace}/hasAdminAccess`, hasAdminAccess);
    api.accessToken.setCustomClaim(`${namespace}/userId`, user.id);
    api.accessToken.setCustomClaim(`${namespace}/fullName`, user.fullName);
    api.accessToken.setCustomClaim(`${namespace}/accessibleLocations`, accessibleLocations);

    // Set custom claims on ID token
    api.idToken.setCustomClaim(`${namespace}/roles`, [user.role]);
    api.idToken.setCustomClaim(`${namespace}/hasAdminAccess`, hasAdminAccess);
    api.idToken.setCustomClaim(`${namespace}/userId`, user.id);
    api.idToken.setCustomClaim(`${namespace}/fullName`, user.fullName);
    api.idToken.setCustomClaim(`${namespace}/accessibleLocations`, accessibleLocations);

    // Update last login time (optional)
    await pool.query(
      `UPDATE users SET "updatedAt" = NOW() WHERE id = $1`,
      [user.id]
    );

  } catch (error) {
    console.error('Error in post-login action:', error);
    // Don't block login on error, but log it
  } finally {
    await pool.end();
  }
};


// =============================================================================
// ACTION 2: Pre-Registration Domain Validation (Optional)
// =============================================================================
// Name: Validate Admin Registration
// Trigger: Pre User Registration
// =============================================================================

/**
 * This action validates email domains during registration.
 * Only needed if you want to restrict who can register for the admin app.
 *
 * Note: For HRC Kitchen, we allow any email to register (for public ordering),
 * but domain validation happens at login for admin access.
 */

exports.onExecutePreUserRegistration = async (event, api) => {
  // This is informational - we don't block registration
  // Domain validation happens at login time

  const email = event.user.email;
  const restrictedDomain = event.secrets.RESTRICTED_ROLE_DOMAIN || '@huonregionalcare.org.au';

  if (email && email.toLowerCase().endsWith(restrictedDomain.toLowerCase())) {
    console.log(`User registering with admin domain: ${email}`);
    // You could set user metadata here if needed
    // api.user.setUserMetadata({ isOrganizationMember: true });
  }
};


// =============================================================================
// ACTION 3: Sync User to Database on First Login
// =============================================================================
// Name: Sync User to Database
// Trigger: Login / Post Login (add after "Add HRC Kitchen Claims")
// =============================================================================

/**
 * This action creates a user in your database if they don't exist.
 * This handles the case where someone signs up through Auth0 Universal Login.
 */

exports.onExecutePostLoginSync = async (event, api) => {
  // Only run for new users (first login)
  if (event.stats.logins_count > 1) {
    return;
  }

  const email = event.user.email;

  if (!email) {
    return;
  }

  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: event.secrets.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      return; // User already exists
    }

    // Create new user with STAFF role
    const result = await pool.query(
      `INSERT INTO users (
        id, email, "passwordHash", "fullName", role, "emailVerified", "isActive", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid(), $1, '', $2, 'STAFF', true, true, NOW(), NOW()
      ) RETURNING id`,
      [email, event.user.name || email.split('@')[0]]
    );

    console.log(`Created new user in database: ${result.rows[0].id}`);

  } catch (error) {
    console.error('Error syncing user to database:', error);
    // Don't block login on sync error
  } finally {
    await pool.end();
  }
};
