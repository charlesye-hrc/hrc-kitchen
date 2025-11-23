# HRC Kitchen - Lunch Ordering System

A web-based lunch ordering system for Huon Regional Care staff featuring self-service registration, daily rotating menus, time-windowed ordering, and secure payment processing via Stripe.

**Architecture**: Dual-application system (Public Ordering + Internal Management)

---

## Project Structure

```
hrc-kitchen/
├── backend/                # Node.js/Express/TypeScript API server
├── frontend-public/        # Public ordering app (React/TypeScript)
├── frontend-admin/         # Internal management app (React/TypeScript)
├── frontend-common/        # Shared types and utilities
├── docs/                   # Organized documentation
│   ├── 01-planning/        # PRD, roadmaps
│   ├── 02-development/     # Setup guides
│   ├── 03-deployment/      # Production guides
│   ├── 04-architecture/    # Technical design
│   └── 05-archive/         # Historical docs
├── CLAUDE.md              # Claude Code main reference
└── DOCUMENTATION_GUIDELINES.md  # Doc maintenance process
```

---

## Tech Stack

### Backend
- Node.js 18+ with TypeScript
- Express.js
- PostgreSQL (Neon cloud-hosted)
- Prisma ORM
- JWT Authentication
- Stripe Payment Integration (Card, Apple Pay, Google Pay)
- Cloudinary Image Upload

### Frontends
- React 18+ with TypeScript
- Vite build tool
- React Router v6
- Material-UI
- Axios
- React Hook Form

---

## Prerequisites

- Node.js 18+ LTS
- npm 9+
- Stripe account (for payments)
- Cloudinary account (for images)

---

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd hrc-kitchen
npm install
```

### 2. Environment Setup

**Backend:**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

**Frontend-Public:**
```bash
cp frontend-public/.env.example frontend-public/.env
# Edit frontend-public/.env with your configuration
```

**Frontend-Admin:**
```bash
cp frontend-admin/.env.example frontend-admin/.env
# Edit frontend-admin/.env with your configuration
```

### 3. Database Setup

```bash
npm run db:migrate   # Run migrations
npm run db:seed      # Seed test data
```

### 4. Start Development Servers

```bash
# Option 1: Backend only
npm run dev:backend  # Port 3000

# Option 2: Public ordering app
npm run dev:public   # Port 5173

# Option 3: Internal management app
npm run dev:admin    # Port 5174
```

**Access URLs:**
- Backend API: http://localhost:3000
- Public App: http://localhost:5173
- Admin App: http://localhost:5174

---

## Test Accounts

**Management App** (domain-restricted: `@huonregionalcare.org.au`):
- `admin@huonregionalcare.org.au` / `Admin123!`
- `kitchen@huonregionalcare.org.au` / `Kitchen123!`
- `finance@huonregionalcare.org.au` / `Finance123!`

**Public Ordering App** (any email):
- `staff@hrc-kitchen.com` / `Staff123!`

---

## Available Scripts

### Root Level
- `npm run dev` - Start backend + both frontend apps
- `npm run dev:backend` - Start backend API only
- `npm run dev:public` - Start public ordering app
- `npm run dev:admin` - Start internal management app
- `npm run build` - Build all applications
- `npm run build:public` - Build public app only
- `npm run build:admin` - Build admin app only
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with test data

### Workspace Level
```bash
cd backend && npm run dev
cd frontend-public && npm run dev
cd frontend-admin && npm run dev
```

---

## Documentation

### Quick Links
- **[CLAUDE.md](CLAUDE.md)** - Main reference for Claude Code (always current)
- **[PRD](docs/01-planning/PRD.md)** - Product Requirements Document
- **[Getting Started](docs/02-development/GETTING_STARTED.md)** - Detailed setup guide
- **[Deployment Guide](docs/03-deployment/DEPLOYMENT.md)** - Production deployment
- **[Documentation Guidelines](DOCUMENTATION_GUIDELINES.md)** - How to maintain docs

### All Documentation
- **Planning**: [docs/01-planning/](docs/01-planning/)
- **Development**: [docs/02-development/](docs/02-development/)
- **Deployment**: [docs/03-deployment/](docs/03-deployment/)
- **Archive**: [docs/05-archive/](docs/05-archive/)

---

## Project Status

**Current Phase**: Phase 7 Complete - Inventory Management
**Code Quality**: Reviewed and optimized (Nov 2025)

**Completed Features:**
- ✅ Dual-application architecture (Public + Admin)
- ✅ Self-service registration and ordering
- ✅ Guest checkout (no account required)
- ✅ Domain-restricted management access
- ✅ Daily rotating menus (Monday-Sunday)
- ✅ Time-windowed ordering (configurable)
- ✅ Stripe payment integration (Card, Apple Pay, Google Pay)
- ✅ Kitchen order fulfillment dashboard
- ✅ Admin panel with menu/user/config management
- ✅ Finance reporting
- ✅ Product variations system
- ✅ Multi-location support
- ✅ Inventory tracking and management
- ✅ Order history tracking

[See complete feature list in PRD](docs/01-planning/PRD.md)

---

## Architecture

### Dual-Application System

```
Public App (5173) ──┐
                    ├──> Backend API (3000) ──> Neon PostgreSQL
Admin App (5174) ───┘
```

**Public Ordering App:**
- Customer-facing interface
- Open to anyone (no domain restrictions)
- Guest checkout enabled
- Features: Menu, Cart, Checkout, Order History

**Internal Management App:**
- Domain-restricted (`@huonregionalcare.org.au`)
- Role-based access (KITCHEN, ADMIN, FINANCE)
- Features: Kitchen Dashboard, Admin Panel, Reports

**Shared Backend:**
- Single source of truth
- Unified authentication
- Domain validation middleware
- RESTful API (`/api/v1/*`)

---

## License

Proprietary - Huon Regional Care

---

## Support

For issues or questions:
- Development: See [CLAUDE.md](CLAUDE.md) for context
- Production: Contact support@hrc-kitchen.com

---

**Last Updated**: 2025-11-23
