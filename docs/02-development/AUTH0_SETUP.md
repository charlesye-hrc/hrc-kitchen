# Auth0 Setup Guide for HRC Kitchen

This guide walks you through setting up Auth0 authentication for the HRC Kitchen application.

## Prerequisites

- Auth0 account (free tier available at https://auth0.com)
- Node.js 18+
- Access to your HRC Kitchen codebase

## 1. Auth0 Tenant Configuration

### Create Applications

You need to create **two applications** in Auth0 (or use a single SPA for both):

1. **HRC Kitchen Public App** (Single Page Application)
   - For customer-facing ordering app
   - Allowed Callback URLs: `http://localhost:5173, https://your-public-domain.com`
   - Allowed Logout URLs: `http://localhost:5173, https://your-public-domain.com`
   - Allowed Web Origins: `http://localhost:5173, https://your-public-domain.com`

2. **HRC Kitchen Admin App** (Single Page Application)
   - For internal management app
   - Allowed Callback URLs: `http://localhost:5174, https://your-admin-domain.com`
   - Allowed Logout URLs: `http://localhost:5174, https://your-admin-domain.com`
   - Allowed Web Origins: `http://localhost:5174, https://your-admin-domain.com`

### Create API

1. Go to **Applications > APIs** in Auth0 Dashboard
2. Click **Create API**
3. Set:
   - Name: `HRC Kitchen API`
   - Identifier: `https://api.hrc-kitchen.com`
   - Signing Algorithm: RS256
4. Enable **RBAC** in the API settings
5. Enable **Add Permissions in the Access Token**

### Create Roles

Go to **User Management > Roles** and create:

| Role | Description |
|------|-------------|
| STAFF | Regular staff members who can place orders |
| KITCHEN | Kitchen staff who can manage orders |
| FINANCE | Finance staff who can view reports |
| ADMIN | Administrators with full access |

### Configure MFA

1. Go to **Security > Multi-factor Auth**
2. Enable your preferred MFA methods:
   - **One-time Password** (recommended) - Google Authenticator, Authy
   - **Push Notifications** - Auth0 Guardian app
   - **SMS** - Requires Twilio setup
3. Set MFA Policy to **Always** or **Adaptive**
4. Enable **Remember Browser** for 30 days (reduces MFA prompts)

### Configure Refresh Token Rotation

1. Go to **Applications > [Your App] > Settings**
2. Scroll to **Refresh Token Rotation**
3. Enable **Rotation**
4. Set **Reuse Interval** to 60 seconds
5. Configure lifetimes:
   - **Absolute Lifetime**: 2592000 seconds (30 days) or longer for mobile
   - **Inactivity Lifetime**: 1296000 seconds (15 days)

## 2. Auth0 Actions Setup

### Add Custom Claims Action

1. Go to **Actions > Library > Build Custom**
2. Create action: **Add HRC Kitchen Claims**
3. Trigger: **Login / Post Login**
4. Copy the code from `backend/src/config/auth0-actions.js` (the `onExecutePostLogin` function)
5. Add Secrets:
   - `DATABASE_URL`: Your Neon PostgreSQL connection string
   - `RESTRICTED_ROLE_DOMAIN`: `@huonregionalcare.org.au`
6. Add Dependencies:
   - `pg@8.11.3`

### Deploy to Login Flow

1. Go to **Actions > Flows > Login**
2. Add your **Add HRC Kitchen Claims** action to the flow
3. Click **Apply**

## 3. Environment Configuration

### Backend (.env)

Add to your existing `.env` file:

```env
# Auth0 Configuration
AUTH0_DOMAIN=dev-6x2wywu0u6qyk3la.au.auth0.com
AUTH0_AUDIENCE=https://api.hrc-kitchen.com
AUTH0_CLIENT_ID=your_backend_client_id
AUTH0_CLIENT_SECRET=your_backend_client_secret
```

### Frontend Public (.env)

```env
# Auth0 Configuration
VITE_AUTH0_DOMAIN=dev-6x2wywu0u6qyk3la.au.auth0.com
VITE_AUTH0_CLIENT_ID=q0Qi938sFrtIfWjXpCut1PwkgjQmH2Sh
VITE_AUTH0_AUDIENCE=https://api.hrc-kitchen.com
```

### Frontend Admin (.env)

```env
# Auth0 Configuration
VITE_AUTH0_DOMAIN=dev-6x2wywu0u6qyk3la.au.auth0.com
VITE_AUTH0_CLIENT_ID=q0Qi938sFrtIfWjXpCut1PwkgjQmH2Sh
VITE_AUTH0_AUDIENCE=https://api.hrc-kitchen.com
```

## 4. Install Dependencies

### Backend

```bash
cd backend
npm install jwks-rsa
```

### Frontend Apps

```bash
cd frontend-public
npm install @auth0/auth0-react

cd ../frontend-admin
npm install @auth0/auth0-react
```

## 5. Configure Callback URLs

In Auth0 Dashboard, ensure these URLs are configured for your application:

### Development

- **Allowed Callback URLs**: `http://localhost:5173, http://localhost:5174`
- **Allowed Logout URLs**: `http://localhost:5173, http://localhost:5174`
- **Allowed Web Origins**: `http://localhost:5173, http://localhost:5174`

### Production

Add your production URLs to the same fields.

## 6. User Migration Strategy

The system supports both Auth0 and legacy JWT authentication during migration:

### Automatic Migration

1. Existing users continue using their passwords through Auth0 Universal Login
2. Auth0 Action syncs user data to tokens on each login
3. New users register through Auth0

### Manual Migration (Optional)

To pre-import users:

1. Export users from your database
2. Use Auth0 Management API to import users
3. Set `email_verified: true` for existing verified users

### Migration Period

During migration, the backend accepts both:
- Auth0 JWT tokens (RS256, from Auth0)
- Legacy JWT tokens (HS256, from your JWT_SECRET)

The middleware automatically detects the token type by checking the `iss` (issuer) claim.

## 7. Testing

### Test Login Flow

1. Start your backend: `npm run dev:backend`
2. Start public app: `npm run dev:public`
3. Click "Login" - should redirect to Auth0 Universal Login
4. Complete authentication (and MFA if enabled)
5. Should redirect back to app with user authenticated

### Test API Authentication

```bash
# Get your Auth0 access token from browser dev tools
curl -H "Authorization: Bearer YOUR_AUTH0_TOKEN" \
  http://localhost:3000/api/v1/menu
```

### Test Role-Based Access

1. Assign KITCHEN role to a user in Auth0
2. Login with that user
3. Access kitchen dashboard - should work
4. Access admin panel - should be denied (unless also ADMIN role)

## 8. Customization

### Universal Login Branding

1. Go to **Branding > Universal Login**
2. Customize colors, logo, and text
3. Use **New Universal Login** for best experience

### Email Templates

1. Go to **Branding > Email Templates**
2. Customize verification emails, password reset, etc.

### Custom Domain (Optional)

1. Go to **Branding > Custom Domains**
2. Add your custom domain (e.g., `auth.hrc-kitchen.com`)
3. Configure DNS records

## 9. Security Considerations

### Token Storage

- Access tokens stored in localStorage (for refresh token rotation)
- Refresh tokens are rotated on each use
- Tokens are automatically refreshed before expiry

### Domain Validation

The Auth0 Action checks email domain for `hasAdminAccess`:
- Only `@huonregionalcare.org.au` emails get admin access
- Configurable via `RESTRICTED_ROLE_DOMAIN` secret

### Step-Up Authentication (Optional)

For sensitive actions, you can require re-authentication:

```typescript
const { getAccessTokenSilently } = useAuth0();

// Require MFA for sensitive action
const token = await getAccessTokenSilently({
  authorizationParams: {
    acr_values: 'http://schemas.openid.net/pape/policies/2007/06/multi-factor'
  }
});
```

## 10. Troubleshooting

### "Invalid token" errors

- Check that `AUTH0_AUDIENCE` matches your API identifier exactly
- Ensure the API has RBAC enabled
- Verify the Action is deployed to the Login flow

### "Unauthorized" after login

- Check custom claims are being added (use https://jwt.io to decode token)
- Verify the namespace `https://hrc-kitchen.com` is correct
- Check database connection in Auth0 Action

### MFA not prompting

- Verify MFA is enabled in Security settings
- Check the MFA policy is set correctly
- Ensure user has enrolled in MFA

### Refresh token issues

- Enable Refresh Token Rotation in app settings
- Set appropriate lifetimes
- Use `useRefreshTokens={true}` in Auth0Provider

## 11. Monitoring

### Auth0 Logs

- Go to **Monitoring > Logs** to view authentication events
- Filter by event type (login success, failure, etc.)
- Set up Log Streams for production monitoring

### Action Logs

- View Action execution logs in **Actions > Logs**
- Check for errors in your custom claims Action

## Support

- Auth0 Documentation: https://auth0.com/docs
- Auth0 Community: https://community.auth0.com
- HRC Kitchen Issues: https://github.com/your-repo/issues
