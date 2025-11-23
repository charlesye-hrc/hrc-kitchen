# Claude Code - HRC Kitchen Project

---

## Quick Start

- **Setup Guide**: [Getting Started](docs/02-development/GETTING_STARTED.md)
- **Requirements**: [Product Requirements Document](docs/01-planning/PRD.md)
- **Deployment**: [Deployment Guide](docs/03-deployment/DEPLOYMENT.md)
- **Code Quality**: [Code Review Report](docs/02-development/CODE_REVIEW_REPORT.md)

---

## Current State

**Phase**: Phase 7 Complete - Inventory Management
**Code Quality**: Recently reviewed and improved (Nov 2025)
**Architecture**: Dual-application system (Public Ordering + Internal Management)
**Status**: Production-ready

### Key Features
- Self-service ordering with guest checkout
- **Repeat last order** (authenticated users, validates availability)
- Multi-location support with location-based menu filtering
- Weekend menu support (Monday-Sunday)
- Domain-restricted management access
- Stripe payment processing (Card, Apple Pay, Google Pay)
- Real-time kitchen dashboard with location filtering
- Comprehensive admin panel
- Finance reporting
- Inventory tracking and management

[Complete status → PRD](docs/01-planning/PRD.md)

---

## Architecture

```
Public App (port 5173) ──┐
                         ├──> Backend API (port 3000) ──> Neon PostgreSQL
Admin App (port 5174) ───┘
```

- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Frontends**: React + TypeScript + Vite + Material-UI
- **Database**: Neon PostgreSQL (cloud-hosted)
- **Payment**: Stripe
- **Images**: Cloudinary

---

## Test Accounts

**All logins require MFA**: Password → Email OTP → Login

**Management App** (`@huonregionalcare.org.au`):
- `admin@huonregionalcare.org.au` / `Admin123!` + OTP
- `kitchen@huonregionalcare.org.au` / `Kitchen123!` + OTP
- `finance@huonregionalcare.org.au` / `Finance123!` + OTP

**Public App** (any email):
- `staff@hrc-kitchen.com` / `Staff123!` + OTP

---

## Development Commands

```bash
npm run dev:backend  # Backend API (port 3000)
npm run dev:public   # Public app (port 5173)
npm run dev:admin    # Admin app (port 5174)
npm run db:migrate   # Run migrations
npm run db:seed      # Seed test data
```

---

## Key Implementation Notes

### Authentication & Security
- **Mandatory MFA**: Password + OTP (email-based, 10-min expiry, cryptographically secure)
- **JWT tokens**: 7-day validity, automatic re-auth required
- **Domain validation**: Configurable via Admin UI (`restricted_role_domain`)
- **Role-based access**: STAFF, KITCHEN, ADMIN, FINANCE
- **Separate token storage**: `public_token` vs `admin_token` in localStorage

### Multi-Location Support
- **Location Assignment by Role**:
  - ADMIN: Access all active locations
  - KITCHEN/FINANCE: Assigned to specific locations
  - STAFF: No assignments (sees all in public app)
- **Public app**: Shows all locations (no filtering)
- **Admin apps**: Respect location assignments
- **Synchronized selection**: Kitchen & Inventory dashboards share location preference

### Inventory Management
- **Opt-in tracking**: Enable per menu item via toggle
- **Location-based**: Separate stock levels per item per location
- **Bulk editing**: Inline editing with visual indicators
- **Auto-initialization**: Records created when tracking enabled
- **Order integration**: Stock automatically reduced
- **Audit trail**: Full history with timestamps and reasons

### Weekend Menu Support
- Menu items assignable to any day (Monday-Sunday)
- Ordering is menu-driven (allowed when items exist)
- No hardcoded weekend restrictions
- Admins control availability via Menu Management

### Email Service
- SendGrid Web API for transactional emails
- Types: verification, password reset, welcome, order confirmation, OTP
- HTML templates with consistent branding
- OTP emails sent automatically after password verification

### Order Processing
- Format: `ORD-YYYYMMDD-####`
- Race condition handling with retry logic
- Guest checkout supported
- Location-based validation
- Stripe PaymentIntent created before confirmation
- **Repeat last order**: One-click reorder for authenticated users
  - Validates items available at current location
  - Checks ordering window and inventory
  - Uses current pricing and menu data
  - Prompts user if some items unavailable

### Code Quality (Updated Nov 2025)
- ✅ No memory leaks (singleton Prisma instances)
- ✅ Consistent logging (Winston logger throughout)
- ✅ Secure OTP generation (crypto.randomInt)
- ✅ Consolidated API clients (shared factory in frontend-common)
- ✅ Type-safe user access (no non-null assertions)
- ✅ Standardized error handling (centralized middleware)
- [See full review](docs/02-development/CODE_REVIEW_REPORT.md)

---

## Database

**Provider**: Neon PostgreSQL (cloud-hosted)

**Key Tables**:
- `users` - Authentication, roles, MFA tokens
- `locations` - Service locations
- `user_locations` - Location assignments
- `menu_items` - Daily menu with weekdays, categories, variations, inventory tracking flag
- `menu_item_locations` - Item availability by location
- `inventories` - Stock levels per item per location
- `inventory_history` - Audit trail
- `orders` - Order tracking (supports guests, includes locationId)
- `order_items` - Line items with variations
- `payments` - Stripe payment records
- `system_config` - Configurable settings

[Schema details](backend/prisma/schema.prisma)

---

## Environment Variables

**Backend** (`.env`):
- `DATABASE_URL` - Neon PostgreSQL
- `JWT_SECRET` - Authentication
- `STRIPE_SECRET_KEY` - Stripe API
- `SENDGRID_API_KEY` - Email service
- `EMAIL_FROM` - Sender email
- `CLOUDINARY_*` - Image upload
- `PUBLIC_APP_URL` - Public frontend URL
- `ADMIN_APP_URL` - Admin frontend URL

**Frontend-Public/Admin** (`.env`):
- `VITE_API_URL` - Backend API endpoint
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe public key (public app only)

---

## Documentation Index

### Planning & Requirements
- [Product Requirements Document](docs/01-planning/PRD.md)
- [MVP Plan](docs/01-planning/MVP_PLAN.md)
- [App Separation Plan](docs/01-planning/APP_SEPARATION_PLAN.md)

### Development
- [Getting Started Guide](docs/02-development/GETTING_STARTED.md)
- [Quick Reference](docs/02-development/QUICK_REFERENCE.md)
- [Code Review Report](docs/02-development/CODE_REVIEW_REPORT.md)

### Deployment
- [Deployment Guide](docs/03-deployment/DEPLOYMENT.md)

### Archive
- [Archived Documentation](docs/05-archive/README.md)
- [Code Quality Fixes (Nov 2025)](docs/05-archive/2025-11-23-code-quality-fixes.md)

### Maintenance
- [Documentation Guidelines](DOCUMENTATION_GUIDELINES.md)

---

## Important Notes

### Database Migrations
**CRITICAL: Developer must run migrations manually**
- **DO NOT** attempt `prisma migrate dev` or `prisma db push` from Claude
- Claude runs non-interactively and cannot see database state
- When schema changes needed:
  1. ✅ Update `schema.prisma`
  2. ✅ Write code using new schema
  3. 🛑 Tell developer: "Please run migration"
  4. ✅ Provide command: `cd backend && npx prisma migrate dev --name [name]`

### Process Management
- **DO NOT** automatically kill or restart backend/frontend processes
- Developer manages `npm run dev` manually
- Notify developer when restart needed

### Documentation Maintenance
**Follow these rules** (see [DOCUMENTATION_GUIDELINES.md](DOCUMENTATION_GUIDELINES.md)):
- Keep this file under 300 lines
- Archive old summaries immediately
- Link to details instead of duplicating
- Update test accounts when changed
- Verify links after moving docs

### Security
- Domain restrictions configured in database (Admin UI)
- CORS environment-aware (dev: localhost, prod: restricted)
- Stripe test mode in dev (test card: `4242 4242 4242 4242`)
- JWT tokens in localStorage
- HTTPS required for Apple Pay/Google Pay on desktop

---

**Last Updated**: 2025-11-23
**Document Version**: 2.7 (Repeat Order Feature)
**Line Count**: ~241 lines ✅

[Maintenance Guidelines](DOCUMENTATION_GUIDELINES.md) | [Archive](docs/05-archive/README.md) | [Code Review](docs/02-development/CODE_REVIEW_REPORT.md)
