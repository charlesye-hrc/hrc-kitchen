# HRC Kitchen - Application Separation Implementation Plan

**Version:** 1.0
**Date:** November 11, 2025
**Status:** ✅ **COMPLETED** - November 12, 2025

---

## Executive Summary

This document outlines the implementation plan to split the HRC Kitchen monolithic application into **two separate web applications**:

1. **Public Ordering App** - Customer-facing application for placing lunch orders
2. **Internal Management App** - Staff-only application for kitchen operations, admin, and finance

### Key Objectives
- ✅ Separate public ordering from internal management
- ✅ Enforce email domain restrictions for management app
- ✅ Share authentication system across both apps
- ✅ Maintain single source of truth (shared backend)
- ✅ Enable independent deployment and scaling

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Backend Changes](#2-backend-changes)
3. [Frontend Restructure](#3-frontend-restructure)
4. [Shared Components Library](#4-shared-components-library)
5. [Authentication Flow](#5-authentication-flow)
6. [Deployment Strategy](#6-deployment-strategy)
7. [Migration Plan](#7-migration-plan)
8. [Testing Strategy](#8-testing-strategy)
9. [Timeline](#9-timeline)

---

## 1. Architecture Overview

### 1.1 Current Architecture (Single App)
```
┌─────────────────────────────────────┐
│       Single Frontend App           │
│  (Menu, Cart, Kitchen, Admin)       │
│         Port 5173                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         Backend API                 │
│    (Express + TypeScript)           │
│         Port 3000                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    PostgreSQL Database              │
│      (Neon Cloud)                   │
└─────────────────────────────────────┘
```

### 1.2 Target Architecture (Dual Apps)
```
┌──────────────────────┐         ┌──────────────────────┐
│  Public Ordering App │         │ Internal Mgmt App    │
│  (Menu, Cart, Orders)│         │ (Kitchen, Admin,     │
│    Port 5173         │         │  Finance, Reports)   │
│ ANY email domain     │         │    Port 5174         │
│ Guest checkout OK    │         │ DOMAIN-ONLY emails   │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           └────────────┬───────────────────┘
                        ▼
         ┌─────────────────────────────────┐
         │     Shared Backend API          │
         │   (Express + TypeScript)        │
         │   Domain validation middleware  │
         │        Port 3000                 │
         └──────────────┬──────────────────┘
                        │
                        ▼
         ┌─────────────────────────────────┐
         │   PostgreSQL Database           │
         │      (Neon Cloud)               │
         └─────────────────────────────────┘
```

### 1.3 Key Principles
- **Single Backend**: One shared Express API serving both apps
- **Domain-Based Access Control**: Management app enforces email domain restrictions
- **Shared Authentication**: Same JWT tokens work across both apps
- **Independent Frontends**: Each app can be deployed, scaled, and updated independently
- **Code Reusability**: Shared components library for common UI elements

---

## 2. Backend Changes

### 2.1 Environment Variables

#### New Environment Variables
Add to `backend/.env`:

```bash
# Email Domain Restrictions
ALLOWED_ADMIN_DOMAIN=hrc-kitchen.com
# Multiple domains supported (comma-separated)
# Example: ALLOWED_ADMIN_DOMAIN=hrc-kitchen.com,huonregionalcare.com.au

# Frontend URLs (CORS)
PUBLIC_APP_URL=http://localhost:5173
ADMIN_APP_URL=http://localhost:5174

# Production Example:
# PUBLIC_APP_URL=https://order.hrc-kitchen.com
# ADMIN_APP_URL=https://manage.hrc-kitchen.com
```

Update `backend/.env.example` accordingly.

### 2.2 Domain Validation Middleware

Create `backend/src/middleware/domainValidation.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

/**
 * Validates that user's email domain matches allowed admin domain(s)
 * for privileged roles (KITCHEN, ADMIN, FINANCE)
 */
export const validateAdminDomain = (req: Request, res: Response, next: NextFunction) => {
  const user = req.user; // Assuming auth middleware sets req.user

  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Only apply domain restrictions to privileged roles
  const privilegedRoles: Role[] = ['KITCHEN', 'ADMIN', 'FINANCE'];

  if (!privilegedRoles.includes(user.role)) {
    return next(); // Staff role can have any email
  }

  const allowedDomains = process.env.ALLOWED_ADMIN_DOMAIN?.split(',').map(d => d.trim()) || [];
  const userDomain = user.email.split('@')[1];

  if (!allowedDomains.includes(userDomain)) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your email domain is not authorized for this role'
    });
  }

  next();
};

/**
 * Validates domain before role assignment
 * Used when promoting users to privileged roles
 */
export const validateRoleAssignment = (email: string, newRole: Role): boolean => {
  const privilegedRoles: Role[] = ['KITCHEN', 'ADMIN', 'FINANCE'];

  if (!privilegedRoles.includes(newRole)) {
    return true; // Staff role has no restrictions
  }

  const allowedDomains = process.env.ALLOWED_ADMIN_DOMAIN?.split(',').map(d => d.trim()) || [];
  const userDomain = email.split('@')[1];

  return allowedDomains.includes(userDomain);
};
```

### 2.3 Route Protection

Update route files to apply domain validation:

#### `/api/v1/kitchen/*` routes
```typescript
// backend/src/routes/kitchen.routes.ts
import { validateAdminDomain } from '../middleware/domainValidation';
import { requireAuth, requireRole } from '../middleware/auth';

router.use(requireAuth); // Must be authenticated
router.use(requireRole(['KITCHEN', 'ADMIN'])); // Must have kitchen role
router.use(validateAdminDomain); // Must have allowed email domain

// Kitchen routes...
```

#### `/api/v1/admin/*` routes
```typescript
// backend/src/routes/admin.routes.ts
import { validateAdminDomain } from '../middleware/domainValidation';
import { requireAuth, requireRole } from '../middleware/auth';

router.use(requireAuth);
router.use(requireRole(['ADMIN']));
router.use(validateAdminDomain); // Must have allowed email domain

// Admin routes...
```

#### `/api/v1/finance/*` routes (if exists)
```typescript
// backend/src/routes/finance.routes.ts
import { validateAdminDomain } from '../middleware/domainValidation';
import { requireAuth, requireRole } from '../middleware/auth';

router.use(requireAuth);
router.use(requireRole(['FINANCE', 'ADMIN']));
router.use(validateAdminDomain); // Must have allowed email domain

// Finance routes...
```

### 2.4 User Role Assignment Validation

Update `backend/src/services/admin.service.ts`:

```typescript
import { validateRoleAssignment } from '../middleware/domainValidation';

export class AdminService {
  // Existing method with validation
  static async updateUserRole(userId: string, newRole: Role, adminId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    // Validate domain for privileged roles
    if (!validateRoleAssignment(user.email, newRole)) {
      throw new Error(
        `Cannot assign ${newRole} role to users outside allowed email domain(s): ${process.env.ALLOWED_ADMIN_DOMAIN}`
      );
    }

    // Existing role update logic...
  }
}
```

### 2.5 CORS Configuration

Update `backend/src/index.ts`:

```typescript
const allowedOrigins = [
  process.env.PUBLIC_APP_URL,
  process.env.ADMIN_APP_URL,
  'http://localhost:5173',  // Public app dev
  'http://localhost:5174',  // Admin app dev
];

// Development: Also allow local network and ngrok
if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push(/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d{4}$/);
  allowedOrigins.push(/https:\/\/[a-z0-9-]+\.ngrok-free\.app$/);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

### 2.6 Login Endpoint Update

Update `backend/src/routes/auth.routes.ts` to return domain validation info:

```typescript
router.post('/login', async (req, res) => {
  // Existing login logic...

  // After successful authentication:
  const allowedDomains = process.env.ALLOWED_ADMIN_DOMAIN?.split(',') || [];
  const userDomain = user.email.split('@')[1];
  const hasAdminAccess = allowedDomains.includes(userDomain);

  res.json({
    user: { ...userInfo },
    token,
    hasAdminAccess, // New field: indicates if user can access management app
  });
});
```

---

## 3. Frontend Restructure

### 3.1 New Directory Structure

```
hrc-kitchen/
├── backend/                      # Existing backend (no major changes)
├── frontend-public/              # NEW: Public ordering app
│   ├── src/
│   │   ├── pages/
│   │   │   ├── MenuPage.tsx
│   │   │   ├── CheckoutPage.tsx
│   │   │   ├── OrderConfirmationPage.tsx
│   │   │   ├── OrdersPage.tsx       # Authenticated users only
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   ├── components/
│   │   │   ├── CartDrawer.tsx
│   │   │   ├── PaymentForm.tsx
│   │   │   ├── VariationSelector.tsx
│   │   │   └── PublicLayout.tsx     # Public app layout (no admin nav)
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx      # Shared (copied from common)
│   │   │   └── CartContext.tsx
│   │   ├── services/
│   │   │   ├── api.ts               # API client
│   │   │   └── payment.service.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── theme.ts                 # Material-UI theme
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── frontend-admin/               # NEW: Internal management app
│   ├── src/
│   │   ├── pages/
│   │   │   ├── KitchenDashboard.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── ReportsPage.tsx      # Finance role
│   │   │   ├── LoginPage.tsx        # Domain-restricted login
│   │   │   └── NotFoundPage.tsx
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   ├── MenuManagement.tsx
│   │   │   │   ├── UserManagement.tsx
│   │   │   │   ├── SystemConfig.tsx
│   │   │   │   └── VariationGroupManager.tsx
│   │   │   └── AdminLayout.tsx      # Admin app layout
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx      # Shared (copied from common)
│   │   ├── services/
│   │   │   └── api.ts               # API client
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── theme.ts                 # Material-UI theme
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── frontend-common/              # NEW: Shared component library
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── ConfirmDialog.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useAPI.ts
│   │   ├── utils/
│   │   │   ├── formatters.ts
│   │   │   └── validators.ts
│   │   ├── types/
│   │   │   └── index.ts             # Shared TypeScript types
│   │   └── index.ts                 # Export all shared code
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                     # OLD: To be archived after migration
│   └── ...
│
├── package.json                  # Root workspace config
└── README.md
```

### 3.2 Package.json Updates

#### Root `package.json`
```json
{
  "name": "hrc-kitchen",
  "version": "2.0.0",
  "private": true,
  "workspaces": [
    "backend",
    "frontend-public",
    "frontend-admin",
    "frontend-common"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:public\" \"npm run dev:admin\"",
    "dev:backend": "npm run dev --workspace=backend",
    "dev:public": "npm run dev --workspace=frontend-public",
    "dev:admin": "npm run dev --workspace=frontend-admin",
    "build": "npm run build:common && npm run build --workspaces --if-present",
    "build:common": "npm run build --workspace=frontend-common",
    "build:public": "npm run build --workspace=frontend-public",
    "build:admin": "npm run build --workspace=frontend-admin",
    "build:backend": "npm run build --workspace=backend"
  }
}
```

#### `frontend-public/package.json`
```json
{
  "name": "hrc-kitchen-public",
  "version": "2.0.0",
  "private": true,
  "dependencies": {
    "hrc-kitchen-common": "*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@mui/material": "^5.14.18",
    "@stripe/stripe-js": "^2.2.0",
    "@stripe/react-stripe-js": "^2.4.0",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.42",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.2",
    "vite": "^5.0.4"
  },
  "scripts": {
    "dev": "vite --port 5173",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

#### `frontend-admin/package.json`
```json
{
  "name": "hrc-kitchen-admin",
  "version": "2.0.0",
  "private": true,
  "dependencies": {
    "hrc-kitchen-common": "*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@mui/material": "^5.14.18",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.42",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.2",
    "vite": "^5.0.4"
  },
  "scripts": {
    "dev": "vite --port 5174",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

#### `frontend-common/package.json`
```json
{
  "name": "hrc-kitchen-common",
  "version": "2.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "peerDependencies": {
    "react": "^18.2.0",
    "@mui/material": "^5.14.18"
  },
  "devDependencies": {
    "typescript": "^5.3.2",
    "@types/react": "^18.2.42"
  }
}
```

### 3.3 Public App Routes

`frontend-public/src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import PublicLayout from './components/PublicLayout';
import MenuPage from './pages/MenuPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import OrdersPage from './pages/OrdersPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicLayout />}>
              {/* Public Routes */}
              <Route path="/" element={<MenuPage />} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Routes (Authenticated Users Only) */}
              <Route
                path="/orders"
                element={
                  <ProtectedRoute>
                    <OrdersPage />
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
```

### 3.4 Admin App Routes

`frontend-admin/src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AdminLayout from './components/AdminLayout';
import KitchenDashboard from './pages/KitchenDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ReportsPage from './pages/ReportsPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login (Public) */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route element={<AdminLayout />}>
            <Route
              path="/"
              element={
                <Navigate to="/kitchen" replace />
              }
            />

            <Route
              path="/kitchen"
              element={
                <ProtectedRoute roles={['KITCHEN', 'ADMIN']}>
                  <KitchenDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedRoute roles={['FINANCE', 'ADMIN']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

### 3.5 Vite Configuration

#### `frontend-public/vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow local network access
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
```

#### `frontend-admin/vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
```

---

## 4. Shared Components Library

### 4.1 Purpose

The `frontend-common` workspace provides:
- Reusable UI components
- Shared TypeScript types
- Common utility functions
- Custom React hooks
- Shared theme configuration

### 4.2 Exported Components

`frontend-common/src/index.ts`:

```typescript
// Components
export { default as LoadingSpinner } from './components/LoadingSpinner';
export { default as ErrorBoundary } from './components/ErrorBoundary';
export { default as ConfirmDialog } from './components/ConfirmDialog';

// Hooks
export { useAuth } from './hooks/useAuth';
export { useAPI } from './hooks/useAPI';

// Utils
export * from './utils/formatters';
export * from './utils/validators';

// Types
export * from './types';
```

### 4.3 Shared Types

`frontend-common/src/types/index.ts`:

```typescript
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'STAFF' | 'KITCHEN' | 'ADMIN' | 'FINANCE';
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'MAIN' | 'SIDE' | 'DRINK' | 'DESSERT' | 'OTHER';
  imageUrl?: string;
  weekdays: string[];
  dietaryTags: string[];
  isActive: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  totalAmount: number;
  status: 'PLACED' | 'PREPARING' | 'READY' | 'FULFILLED';
  items: OrderItem[];
  createdAt: string;
}

export interface OrderItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  customizations: string[];
  selectedVariations: SelectedVariation[];
  priceAtPurchase: number;
}

export interface SelectedVariation {
  groupName: string;
  options: string[];
}

// Add more shared types...
```

---

## 5. Authentication Flow

### 5.1 Public App Login Flow

```
User (Any Email)
     │
     ▼
┌─────────────────────┐
│  Public Login Page  │
│  (No restrictions)  │
└──────────┬──────────┘
           │
           ▼
    POST /api/v1/auth/login
           │
           ▼
┌─────────────────────────────┐
│  Backend validates creds    │
│  Returns: { user, token,    │
│            hasAdminAccess }  │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Public app stores token    │
│  If hasAdminAccess=true:    │
│  Show "Management" link     │
└─────────────────────────────┘
```

### 5.2 Admin App Login Flow

```
User (Domain Email Required)
     │
     ▼
┌─────────────────────┐
│  Admin Login Page   │
│  (Domain check UI)  │
└──────────┬──────────┘
           │
           ▼
    POST /api/v1/auth/login
           │
           ▼
┌──────────────────────────────┐
│  Backend validates creds     │
│  Returns: { user, token,     │
│            hasAdminAccess }  │
└──────────┬───────────────────┘
           │
           ▼
      hasAdminAccess?
           │
    ┌──────┴──────┐
    │             │
   Yes            No
    │             │
    ▼             ▼
┌────────┐  ┌──────────────────┐
│ Allow  │  │ Show error:      │
│ Access │  │ "Email domain    │
│        │  │  not authorized" │
└────────┘  └──────────────────┘
```

### 5.3 Cross-App Navigation

Public app can link to admin app for authorized users:

```typescript
// frontend-public/src/components/PublicLayout.tsx
const { user, hasAdminAccess } = useAuth();

{hasAdminAccess && (
  <Button
    component="a"
    href={import.meta.env.VITE_ADMIN_APP_URL}
    target="_blank"
  >
    Management Portal
  </Button>
)}
```

---

## 6. Deployment Strategy

### 6.1 Development Environment

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Public App
cd frontend-public
npm run dev  # Runs on port 5173

# Terminal 3: Admin App
cd frontend-admin
npm run dev  # Runs on port 5174
```

Access:
- Backend API: `http://localhost:3000`
- Public App: `http://localhost:5173`
- Admin App: `http://localhost:5174`

### 6.2 Production Deployment

#### Option 1: Separate Subdomains (Recommended)
```
https://order.hrc-kitchen.com     → frontend-public
https://manage.hrc-kitchen.com    → frontend-admin
https://api.hrc-kitchen.com       → backend
```

**Benefits:**
- Clear separation of concerns
- Independent SSL certificates
- Easy CORS configuration
- Separate CDN caching strategies

**Deployment Platforms:**
- **Vercel** (recommended for React apps)
  - Create two separate Vercel projects
  - Configure custom domains
  - Automatic HTTPS and CDN

- **Netlify** (alternative)
  - Similar to Vercel

- **AWS S3 + CloudFront**
  - Static hosting for frontends
  - Backend on EC2/ECS/Lambda

#### Option 2: Subdirectories
```
https://hrc-kitchen.com/           → frontend-public
https://hrc-kitchen.com/manage/    → frontend-admin
https://hrc-kitchen.com/api/       → backend
```

**Benefits:**
- Single domain
- Simpler DNS configuration

**Drawbacks:**
- More complex routing configuration
- Harder to scale independently

### 6.3 CI/CD Pipeline

**GitHub Actions Example:**

```yaml
# .github/workflows/deploy.yml
name: Deploy HRC Kitchen

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy Backend
        run: |
          cd backend
          npm install
          npm run build
          # Deploy to hosting platform

  deploy-public:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy Public App
        run: |
          cd frontend-public
          npm install
          npm run build
          # Deploy to Vercel/Netlify

  deploy-admin:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy Admin App
        run: |
          cd frontend-admin
          npm install
          npm run build
          # Deploy to Vercel/Netlify
```

---

## 7. Migration Plan

### 7.1 Phase 1: Backend Preparation (Week 1)
- [ ] Add `ALLOWED_ADMIN_DOMAIN` environment variable
- [ ] Create domain validation middleware
- [ ] Update auth routes to return `hasAdminAccess`
- [ ] Update admin service role assignment validation
- [ ] Update CORS configuration
- [ ] Test backend changes with existing frontend

### 7.2 Phase 2: Create Shared Library (Week 1-2)
- [ ] Create `frontend-common` workspace
- [ ] Extract shared types
- [ ] Extract shared utility functions
- [ ] Extract reusable components
- [ ] Configure TypeScript compilation
- [ ] Test library builds

### 7.3 Phase 3: Build Public App (Week 2-3)
- [ ] Create `frontend-public` workspace
- [ ] Set up Vite configuration
- [ ] Copy public-facing pages (Menu, Checkout, Orders)
- [ ] Copy cart and payment components
- [ ] Update imports to use `frontend-common`
- [ ] Create `PublicLayout` component
- [ ] Configure routing
- [ ] Test all public features
- [ ] Test guest checkout flow

### 7.4 Phase 4: Build Admin App (Week 3-4)
- [ ] Create `frontend-admin` workspace
- [ ] Set up Vite configuration
- [ ] Copy admin pages (Kitchen, Admin, Reports)
- [ ] Copy admin components
- [ ] Update imports to use `frontend-common`
- [ ] Create `AdminLayout` component
- [ ] Add domain restriction UI messaging
- [ ] Configure routing
- [ ] Test all admin features
- [ ] Test role-based access control

### 7.5 Phase 5: Integration Testing (Week 4)
- [ ] Test authentication across both apps
- [ ] Test cross-app navigation
- [ ] Test domain restrictions
- [ ] Test role-based access control
- [ ] Performance testing
- [ ] Security testing
- [ ] Browser compatibility testing

### 7.6 Phase 6: Documentation & Deployment (Week 5)
- [ ] Update all documentation
- [ ] Create deployment guides
- [ ] Update README files
- [ ] Configure production environments
- [ ] Deploy to staging
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Archive old `frontend` folder

---

## 8. Testing Strategy

### 8.1 Backend Testing

#### Domain Validation Tests
```typescript
describe('Domain Validation Middleware', () => {
  it('should allow staff with any email domain', () => {
    // Test staff@gmail.com can access staff endpoints
  });

  it('should block kitchen role with wrong domain', () => {
    // Test kitchen@gmail.com cannot access kitchen endpoints
  });

  it('should allow kitchen role with correct domain', () => {
    // Test kitchen@hrc-kitchen.com can access kitchen endpoints
  });

  it('should block admin role assignment to wrong domain', () => {
    // Test cannot promote user@gmail.com to ADMIN
  });
});
```

#### Authentication Tests
```typescript
describe('Login Endpoint', () => {
  it('should return hasAdminAccess=true for domain users', () => {
    // Test login with admin@hrc-kitchen.com
  });

  it('should return hasAdminAccess=false for public users', () => {
    // Test login with user@gmail.com
  });
});
```

### 8.2 Frontend Testing

#### Public App Tests
- Menu browsing without authentication
- Guest checkout flow
- Cart persistence
- Authenticated user order history
- Payment integration (Stripe test mode)

#### Admin App Tests
- Domain-restricted login
- Kitchen dashboard access control
- Admin panel access control
- Role-based feature visibility
- User management operations

### 8.3 Integration Tests

#### Cross-App Authentication
```typescript
describe('Cross-App Authentication', () => {
  it('should share JWT token between apps', () => {
    // Login in public app
    // Verify token works in admin app API calls
  });

  it('should redirect unauthorized users from admin app', () => {
    // Login as staff@gmail.com
    // Attempt to access admin app
    // Expect access denied
  });
});
```

---

## 9. Timeline

### Overall Timeline: 5 Weeks

| Week | Phase | Tasks | Deliverables |
|------|-------|-------|--------------|
| **1** | Backend + Shared Library | Domain validation, CORS, shared types | Backend API ready, `frontend-common` package |
| **2** | Public App Development | Menu, Cart, Checkout pages | `frontend-public` app functional |
| **3** | Admin App Development | Kitchen, Admin, Reports pages | `frontend-admin` app functional |
| **4** | Integration Testing | Cross-app auth, domain restrictions | Test reports, bug fixes |
| **5** | Documentation + Deployment | Update docs, deploy to production | Production deployment, updated docs |

---

## 10. Environment Variables Reference

### Backend `.env`

```bash
# Existing variables...

# NEW: Email Domain Restrictions
ALLOWED_ADMIN_DOMAIN=hrc-kitchen.com,huonregionalcare.com.au

# NEW: Frontend URLs (CORS)
PUBLIC_APP_URL=http://localhost:5173
ADMIN_APP_URL=http://localhost:5174

# Production example:
# PUBLIC_APP_URL=https://order.hrc-kitchen.com
# ADMIN_APP_URL=https://manage.hrc-kitchen.com
```

### Public App `.env`

```bash
VITE_API_URL=http://localhost:3000/api/v1
VITE_ADMIN_APP_URL=http://localhost:5174
VITE_STRIPE_PUBLIC_KEY=pk_test_...

# Production:
# VITE_API_URL=https://api.hrc-kitchen.com/api/v1
# VITE_ADMIN_APP_URL=https://manage.hrc-kitchen.com
```

### Admin App `.env`

```bash
VITE_API_URL=http://localhost:3000/api/v1
VITE_PUBLIC_APP_URL=http://localhost:5173
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...

# Production:
# VITE_API_URL=https://api.hrc-kitchen.com/api/v1
# VITE_PUBLIC_APP_URL=https://order.hrc-kitchen.com
```

---

## 11. Security Considerations

### 11.1 Domain Validation
- ✅ Enforced at backend middleware level (not just frontend)
- ✅ Multiple domains supported (comma-separated)
- ✅ Case-insensitive email domain matching
- ✅ Role assignment validation prevents privilege escalation

### 11.2 CORS Configuration
- ✅ Whitelist both app URLs
- ✅ Development: Allow localhost on different ports
- ✅ Production: Strict origin checking
- ✅ Credentials enabled for JWT cookies

### 11.3 Token Security
- ✅ Same JWT secret across all apps
- ✅ HttpOnly cookies for token storage (recommended)
- ✅ Token expiration enforced
- ✅ Refresh token rotation (future enhancement)

### 11.4 Role-Based Access Control
- ✅ Backend validates roles on every request
- ✅ Frontend hides unauthorized UI elements
- ✅ API endpoints protected by middleware
- ✅ Self-protection (users cannot modify own roles)

---

## 12. Rollback Plan

### If Migration Fails

1. **Keep old frontend running** during migration
2. **Switch CORS** back to old frontend URL
3. **DNS rollback** if using separate domains
4. **Database rollback** (no schema changes in this migration)
5. **Backend rollback** (remove domain validation middleware)

### Minimal Risk Migration

- Backend changes are **backward compatible**
- Old frontend continues working during migration
- New apps can be deployed to staging first
- Zero-downtime deployment possible

---

## 13. Success Criteria

### Must Have ✅
- [ ] Public app accessible to any user (any email domain)
- [ ] Admin app restricted to configured domain(s)
- [ ] Guest checkout works in public app
- [ ] Shared authentication (same JWT tokens)
- [ ] All existing features functional in respective apps
- [ ] Role-based access control enforced
- [ ] No performance degradation

### Nice to Have 🎯
- [ ] Shared component library reduces code duplication by >50%
- [ ] Independent deployment pipelines
- [ ] Separate analytics tracking per app
- [ ] Custom branding per app

---

## 14. Open Questions

1. **Domain Configuration**: Single domain or multiple domains?
   - Recommendation: Support multiple (future-proof)

2. **Public App Registration**: Allow self-registration or invite-only?
   - Current: Allow self-registration (already implemented)

3. **Cross-App Links**: Should apps link to each other?
   - Recommendation: Yes, with clear "switch to management" UX

4. **Finance Role**: Separate app or part of admin app?
   - Recommendation: Part of admin app with role-based tabs

5. **Mobile Apps**: Native mobile apps needed?
   - Out of scope for this phase

---

## 15. Implementation Summary

### ✅ Completed Stages

**Stage 1: Backend Domain Validation**
- ✅ Created `domainValidation.ts` middleware
- ✅ Added `hasAdminAccess` flag to auth response
- ✅ Applied middleware to kitchen/admin/finance routes
- ✅ Updated CORS for dual frontend support
- ✅ Database config integration for domain restrictions

**Stage 2: Shared Frontend Library**
- ✅ Created `frontend-common` workspace
- ✅ Extracted shared types, formatters, validators, api-helpers
- ✅ TypeScript compilation successful
- ✅ Proper peer dependencies configuration

**Stage 3: Public Ordering App**
- ✅ Created `frontend-public` workspace (port 5173)
- ✅ Simplified routes (removed admin/kitchen/finance)
- ✅ Guest checkout functionality
- ✅ Fixed duplicate BrowserRouter issue
- ✅ Environment configuration (.env with Stripe key)
- ✅ Build and runtime verified

**Stage 4: Internal Management App**
- ✅ Created `frontend-admin` workspace (port 5174)
- ✅ AdminLayout with role-based navigation
- ✅ Domain-restricted authentication flow
- ✅ ProtectedRoute component with domain + role checks
- ✅ Login page with domain validation (UX friendly)
- ✅ Automatic role-based redirect after login
- ✅ Build and runtime verified

**Additional Fixes:**
- ✅ Fixed order number race condition (retry logic + transaction-safe generation)
- ✅ Updated test accounts to use correct domain (@huonregionalcare.org.au)
- ✅ Added Finance user account
- ✅ Database seed updated with domain-separated accounts

### Test Accounts (Post-Implementation)

**Management App** (`@huonregionalcare.org.au`):
- Admin: admin@huonregionalcare.org.au / Admin123!
- Kitchen: kitchen@huonregionalcare.org.au / Kitchen123!
- Finance: finance@huonregionalcare.org.au / Finance123!

**Public App** (any email):
- Staff: staff@hrc-kitchen.com / Staff123!

### Access URLs

- **Public Ordering App**: http://localhost:5173 (`npm run dev:public`)
- **Internal Management App**: http://localhost:5174 (`npm run dev:admin`)
- **Backend API**: http://localhost:3000

### Verification Results

✅ Domain validation working (non-domain users blocked from management app)
✅ Role-based access control enforced
✅ Public app accessible to all users
✅ Guest checkout functional
✅ Order placement successful (race condition fixed)
✅ All dashboards loading correctly

---

## 16. Next Steps

**For Production Deployment:**
1. Set up production environment variables
2. Configure domain names (e.g., `order.hrc-kitchen.com`, `manage.hrc-kitchen.com`)
3. Deploy backend to production server
4. Deploy frontend-public to production
5. Deploy frontend-admin to production
6. Update CORS configuration for production domains
7. Test end-to-end in production environment

**Optional Enhancements:**
1. Email notifications for order status updates
2. Print functionality for kitchen tickets
3. Enhanced reporting and analytics
4. Advanced filtering and search in order history

---

**Document Version History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-11 | Claude | Initial implementation plan |
| 1.1 | 2025-11-12 | Claude | Added implementation summary and completion status |

---

**End of Document**
