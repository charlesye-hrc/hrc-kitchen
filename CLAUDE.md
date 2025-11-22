# Claude Code - HRC Kitchen Project

---

## Quick Start

- **Setup Guide**: [Getting Started](docs/02-development/GETTING_STARTED.md)
- **Requirements**: [Product Requirements Document](docs/01-planning/PRD.md)
- **Deployment**: [Deployment Guide](docs/03-deployment/DEPLOYMENT.md)
- **Development Reference**: [Quick Reference](docs/02-development/QUICK_REFERENCE.md)

---

## Current State

**Phase**: Phase 7 Complete - Inventory Management
**Architecture**: Dual-application system (Public Ordering + Internal Management)
**Status**: Production-ready

### Key Features
- Self-service ordering with guest checkout
- Multi-location support with location-based menu filtering
- Weekend menu support (Monday-Sunday)
- Domain-restricted management access
- Stripe payment processing (Card, Apple Pay, Google Pay)
- Real-time kitchen dashboard
- Comprehensive admin panel
- Finance reporting
- **Inventory tracking and management (NEW)**

[Complete status and implementation details → PRD](docs/01-planning/PRD.md)

---

## Architecture Overview

### System Components

```
Public App (port 5173) ──┐
                         ├──> Backend API (port 3000) ──> Neon PostgreSQL
Admin App (port 5174) ───┘
```

- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Public App**: React + TypeScript + Vite + Material-UI (customer-facing)
- **Admin App**: React + TypeScript + Vite + Material-UI (domain-restricted)
- **Database**: Neon PostgreSQL (cloud-hosted)
- **Payment**: Stripe (Card, Apple Pay, Google Pay)
- **Images**: Cloudinary

[Detailed architecture docs → docs/04-architecture/](docs/04-architecture/)

---

## Test Accounts

**All logins require MFA**: Enter password → Check email for OTP code → Enter OTP

**Management App** (domain-restricted: `@huonregionalcare.org.au`):
- `admin@huonregionalcare.org.au` / `Admin123!` + OTP
- `kitchen@huonregionalcare.org.au` / `Kitchen123!` + OTP
- `finance@huonregionalcare.org.au` / `Finance123!` + OTP

**Public Ordering App** (any email):
- `staff@hrc-kitchen.com` / `Staff123!` + OTP
- All domain users can also use the public app

---

## Development Commands

```bash
# Backend API (port 3000)
npm run dev:backend

# Public Ordering App (port 5173)
npm run dev:public

# Internal Management App (port 5174)
npm run dev:admin

# Database operations
npm run db:migrate   # Run migrations
npm run db:seed      # Seed test data
```

---

## Workspace Structure

```
hrc-kitchen/
├── backend/                # Node.js API server
├── frontend/               # Original frontend (legacy)
├── frontend-common/        # Shared types & utilities
├── frontend-public/        # Public ordering app
├── frontend-admin/         # Internal management app
└── docs/                   # Organized documentation
    ├── 01-planning/        # PRD, roadmaps
    ├── 02-development/     # Setup, reference
    ├── 03-deployment/      # Production guides
    ├── 04-architecture/    # Technical design
    └── 05-archive/         # Historical docs
```

---

## Key Implementation Notes

### Authentication & Authorization
- **Mandatory MFA**: All users require Password + OTP (email-based) for login
- Two-step authentication flow:
  1. Password verification → OTP sent to email
  2. OTP verification (6-digit code, 10-minute expiry) → JWT token issued
- JWT tokens valid for 7 days (automatic re-authentication required weekly)
- Domain validation via database config (`restricted_role_domain`)
- `hasAdminAccess` flag in login response
- Role-based access: STAFF, KITCHEN, ADMIN, FINANCE
- Email verification required for new registrations
- Secure password reset with database-stored tokens (single-use, 1-hour expiry)
- [Backend Auth Service](backend/src/services/auth.service.ts)

### Email Service
- SendGrid Web API for transactional emails
- Email types: verification, password reset, welcome, order confirmation, **OTP codes**
- HTML templates with consistent branding
- OTP emails sent automatically after password verification
- Token validation on reset page load (better UX)
- [Email Service](backend/src/services/email.service.ts)
- [Email Templates](backend/src/templates/emails/)

### Domain Validation
- Middleware: [domainValidation.ts](backend/src/middleware/domainValidation.ts)
- Applied to `/api/v1/kitchen/*`, `/api/v1/admin/*`, `/api/v1/finance/*`
- Configurable via Admin UI → System Config
- Default domain: `@huonregionalcare.org.au`

### Multi-Location Support
- Each location has separate menu item assignments
- **Location Assignment by Role**:
  - **ADMIN**: Access to all active locations (no assignments needed)
  - **KITCHEN/FINANCE**: Assigned to specific locations via Admin UI
  - **STAFF**: No location assignments (public ordering only, sees all locations)
- **Public Ordering App**: All users see all locations (location assignments ignored)
- **Internal Management Apps**: Respect user location assignments
  - Kitchen Dashboard & Reports: Show only assigned locations (ADMIN sees all)
- **Separate Authentication State**:
  - Public app uses `public_token` in localStorage
  - Admin app uses `admin_token` in localStorage
  - Prevents cross-app token conflicts when using both simultaneously
- Cart validates items against selected location
- Orders include `locationId` and validate item availability
- [Location Service](backend/src/services/location.service.ts)
- [Location Hook](frontend-common/src/hooks/useLocation.ts)

### Weekend Menu Support
- Menu items can be assigned to any day (Monday-Sunday)
- Ordering is **menu-driven**: allowed when items exist for that day
- No hardcoded weekend restrictions
- Same ordering window applies to all days
- Admins assign items to weekend days in Menu Management
- [Config Service](backend/src/services/config.service.ts)

### Order Processing
- Order number format: `ORD-YYYYMMDD-####`
- Race condition handling: Retry logic with transaction-safe generation
- Guest checkout supported
- Location-based validation: Items must be available at order's location
- Stripe PaymentIntent created before order confirmation
- [Order Service](backend/src/services/order.service.ts)

### Payment Integration
- Stripe Elements for card payments
- Payment Request Button for Apple Pay / Google Pay
- Automatic device/browser detection
- Guest orders include `receipt_email`
- [Payment Service](backend/src/services/payment.service.ts)

### Inventory Management
- **Opt-in tracking**: Menu items can enable inventory tracking via toggle in Menu Management
- **Location-based**: Separate stock levels for each menu item at each location
- **Bulk editing**: Inline editing with visual indicators (yellow background for edited fields)
- **Automatic initialization**: Inventory records created automatically when tracking is enabled
- **Order integration**: Stock automatically reduced when orders are placed
- **Stock status**: Out of stock (red), Low stock (orange), In stock (green)
- **Audit trail**: Full history of inventory changes with timestamps and reasons
- **Access control**: KITCHEN staff see assigned locations, ADMIN sees all
- **Synchronized location selection**: Kitchen Dashboard and Inventory Dashboard share location preference
- [Inventory Service](backend/src/services/inventory.service.ts)
- [Inventory Dashboard](frontend-admin/src/components/inventory/InventoryDashboard.tsx)

### Frontend Apps

**Public App** (frontend-public):
- Routes: Menu, Checkout, Order History, Login, Register
- Guest checkout enabled
- No admin/kitchen/finance features
- Simplified navigation

**Admin App** (frontend-admin):
- Routes: Kitchen Dashboard, Admin Panel, Finance Reports, Inventory Management
- Domain validation at login
- Role-based navigation
- ProtectedRoute component with domain + role checks
- Auto-redirect based on user role
- Synchronized location selection across dashboards (localStorage: `selectedLocationId`)

---

## Database

**Provider**: Neon PostgreSQL (cloud-hosted)
**Connection**: Configured in `backend/.env`

**Key Tables**:
- `users` - Authentication and roles
- `locations` - Multiple service locations
- `user_locations` - User-location assignments
- `menu_items` - Daily menu with weekdays (Mon-Sun), categories, variations, inventory tracking flag
- `menu_item_locations` - Menu item availability by location
- `inventories` - Stock levels per menu item per location
- `inventory_history` - Audit trail of inventory changes
- `orders` - Order tracking (supports guest orders, includes locationId)
- `order_items` - Line items with variations
- `payments` - Stripe payment records
- `system_config` - Configurable settings (ordering window, domain)

[Database migrations](backend/prisma/migrations/)
[Seed file](backend/prisma/seed.ts)

---

## CORS Configuration

**Development**:
- Allows `localhost:5173` (public app)
- Allows `localhost:5174` (admin app)
- Allows local network IPs (192.168.x.x)
- Allows ngrok tunnels for mobile testing

**Production**:
- Only configured `PUBLIC_APP_URL` and `ADMIN_APP_URL`
- Set via environment variables

[CORS Config](backend/src/index.ts)

---

## Environment Variables

**Backend** (`.env`):
- `DATABASE_URL` - Neon PostgreSQL connection
- `JWT_SECRET` - Authentication secret
- `STRIPE_SECRET_KEY` - Stripe API key
- `SENDGRID_API_KEY` - SendGrid API key for emails
- `EMAIL_FROM` - Sender email address
- `CLOUDINARY_*` - Image upload credentials
- `PUBLIC_APP_URL` - Public frontend URL
- `ADMIN_APP_URL` - Admin frontend URL

**Frontend-Public** (`.env`):
- `VITE_API_URL` - Backend API endpoint
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe public key

**Frontend-Admin** (`.env`):
- `VITE_API_URL` - Backend API endpoint
- `VITE_PUBLIC_APP_URL` - Link to public app

---

## Documentation Index

### Planning & Requirements
- [Product Requirements Document](docs/01-planning/PRD.md)
- [MVP Plan](docs/01-planning/MVP_PLAN.md)
- [App Separation Plan](docs/01-planning/APP_SEPARATION_PLAN.md)

### Development
- [Getting Started Guide](docs/02-development/GETTING_STARTED.md)
- [Quick Reference](docs/02-development/QUICK_REFERENCE.md)

### Deployment
- [Deployment Guide](docs/03-deployment/DEPLOYMENT.md)

### Archive
- [Archived Documentation](docs/05-archive/README.md)

### Maintenance
- [Documentation Guidelines](DOCUMENTATION_GUIDELINES.md)

---

## Important Notes

### Database Migrations
**CRITICAL: Developer must run database migrations manually**
- **DO NOT** attempt to run `prisma migrate dev` or `prisma db push`
- Claude runs in non-interactive mode (Prisma blocks this)
- Cannot see actual database state or make informed decisions about data loss
- When schema changes are needed:
  1. ✅ Update `schema.prisma`
  2. ✅ Write code that uses new schema
  3. 🛑 Tell developer: "Please run the migration yourself"
  4. ✅ Provide exact command: `cd backend && npx prisma migrate dev --name [name]`

### Process Management
**DO NOT** automatically kill or restart backend/frontend processes.
- Developer manages `npm run dev` manually
- Notify developer when restart is needed
- You may check process output, but don't kill/restart

### Documentation Maintenance
**Follow these rules** (see [DOCUMENTATION_GUIDELINES.md](DOCUMENTATION_GUIDELINES.md)):
- Keep this file under 300 lines
- Archive old phase summaries immediately
- Link to details instead of duplicating content
- Update test accounts when changed
- Verify links work after moving docs

### Security
- Domain restrictions configured in database (Admin UI → System Config)
- CORS environment-aware (dev allows localhost, prod restricts)
- Stripe test mode in development (test card: `4242 4242 4242 4242`)
- JWT tokens stored in localStorage
- HTTPS required for Apple Pay/Google Pay on desktop

---

**Last Updated**: 2025-11-22
**Document Version**: 2.5 (Inventory Management Implementation)

[Maintenance Guidelines](DOCUMENTATION_GUIDELINES.md) | [Archive](docs/05-archive/README.md) | [MFA Implementation](docs/05-archive/2025-11-20-mfa-implementation.md)