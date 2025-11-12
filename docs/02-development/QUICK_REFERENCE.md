# HRC Kitchen - App Separation Quick Reference

**Last Updated:** November 11, 2025

---

## 🎯 What's Changing?

The HRC Kitchen application is being split into **two separate frontend applications**:

### Before (Current)
```
Single Frontend (Port 5173)
  ├── Menu & Cart (Public)
  ├── Kitchen Dashboard (Restricted)
  └── Admin Panel (Restricted)
```

### After (Target)
```
Public Ordering App (Port 5173)        Internal Management App (Port 5174)
  ├── Menu browsing                      ├── Kitchen Dashboard
  ├── Cart & checkout                    ├── Admin Panel
  ├── Guest checkout                     ├── Finance Reports
  └── Order history                      └── User Management

  ANY email domain                       DOMAIN-RESTRICTED emails only
```

---

## 📋 Quick Facts

| Aspect | Public App | Management App |
|--------|------------|----------------|
| **Port (Dev)** | 5173 | 5174 |
| **Subdomain (Prod)** | `order.hrc-kitchen.com` | `manage.hrc-kitchen.com` |
| **Email Restriction** | ❌ None (any email) | ✅ Domain-only (`@hrc-kitchen.com`) |
| **Guest Access** | ✅ Yes | ❌ No |
| **Self-Registration** | ✅ Yes | ❌ No (must be promoted) |
| **Payment** | ✅ Stripe checkout | ❌ N/A |
| **Roles Allowed** | STAFF (any email) | KITCHEN, ADMIN, FINANCE (domain-only) |

---

## 🔐 Email Domain Rules

### Staff Role (No Restrictions)
- ✅ `staff@gmail.com` - Can access **Public App**
- ✅ `staff@yahoo.com` - Can access **Public App**
- ✅ `staff@hrc-kitchen.com` - Can access **Public App**

### Privileged Roles (Domain Required)
- ❌ `kitchen@gmail.com` - **Cannot** be assigned KITCHEN role
- ✅ `kitchen@hrc-kitchen.com` - **Can** be assigned KITCHEN role
- ✅ `admin@huonregionalcare.com.au` - **Can** be assigned ADMIN role

### Configuration
```bash
# Backend .env
ALLOWED_ADMIN_DOMAIN=hrc-kitchen.com,huonregionalcare.com.au
```

---

## 🗂️ Directory Structure

```
hrc-kitchen/
│
├── backend/                   # Shared backend API (Port 3000)
│   ├── src/
│   │   ├── middleware/
│   │   │   └── domainValidation.ts    # NEW: Domain check middleware
│   │   ├── routes/
│   │   │   ├── auth.routes.ts         # UPDATED: Returns hasAdminAccess
│   │   │   ├── kitchen.routes.ts      # UPDATED: Uses domain middleware
│   │   │   └── admin.routes.ts        # UPDATED: Uses domain middleware
│   │   └── services/
│   │       └── admin.service.ts       # UPDATED: Validates role assignments
│   └── .env                            # UPDATED: New domain variables
│
├── frontend-public/           # NEW: Public ordering app (Port 5173)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── MenuPage.tsx
│   │   │   ├── CheckoutPage.tsx
│   │   │   ├── OrderConfirmationPage.tsx
│   │   │   ├── OrdersPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── components/
│   │   │   ├── PublicLayout.tsx
│   │   │   ├── CartDrawer.tsx
│   │   │   └── PaymentForm.tsx
│   │   └── contexts/
│   │       ├── AuthContext.tsx
│   │       └── CartContext.tsx
│   └── vite.config.ts         # Port 5173
│
├── frontend-admin/            # NEW: Internal management app (Port 5174)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── KitchenDashboard.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── ReportsPage.tsx
│   │   │   └── LoginPage.tsx          # Domain-restricted login
│   │   ├── components/
│   │   │   ├── AdminLayout.tsx
│   │   │   └── admin/
│   │   │       ├── MenuManagement.tsx
│   │   │       ├── UserManagement.tsx
│   │   │       └── SystemConfig.tsx
│   │   └── contexts/
│   │       └── AuthContext.tsx
│   └── vite.config.ts         # Port 5174
│
├── frontend-common/           # NEW: Shared component library
│   ├── src/
│   │   ├── components/
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── types/
│   │   │   └── index.ts       # Shared TypeScript types
│   │   └── utils/
│   │       ├── formatters.ts
│   │       └── validators.ts
│   └── package.json
│
├── frontend/                  # OLD: To be archived after migration
│
├── APP_SEPARATION_PLAN.md    # Detailed implementation plan
├── CLAUDE.md                  # Updated with Phase 6 overview
├── PRD.md                     # Updated with architecture section
└── QUICK_REFERENCE.md         # This file
```

---

## 🚀 Running Locally (After Migration)

### Option 1: All Services
```bash
# From root directory
npm run dev
```
This runs:
- Backend API on port 3000
- Public app on port 5173
- Admin app on port 5174

### Option 2: Individual Services
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Public App
cd frontend-public
npm run dev

# Terminal 3: Admin App
cd frontend-admin
npm run dev
```

---

## 🌐 URLs (Development)

| Service | URL | Access |
|---------|-----|--------|
| Backend API | `http://localhost:3000` | Internal |
| Public App | `http://localhost:5173` | Open to all |
| Admin App | `http://localhost:5174` | Domain-restricted |

---

## 🔑 Authentication Flow

### Login in Public App
```
User enters email/password
         ↓
Backend validates credentials
         ↓
Returns: { user, token, hasAdminAccess }
         ↓
hasAdminAccess = true?
    ├── Yes → Show "Management Portal" link
    └── No  → Hide management link
```

### Login in Admin App
```
User enters email/password
         ↓
Backend validates credentials
         ↓
Returns: { user, token, hasAdminAccess }
         ↓
hasAdminAccess = false?
    ├── Yes → Allow access to admin features
    └── No  → Show error: "Email domain not authorized"
```

---

## 🛡️ Security Validations

### Backend Middleware Stack

#### Public Routes (No restrictions)
```
/api/v1/menu/today
/api/v1/menu/week
/api/v1/orders/guest
```

#### Authenticated Routes (Any email)
```
/api/v1/orders           → requireAuth
/api/v1/orders/my-orders → requireAuth
```

#### Management Routes (Domain-restricted)
```
/api/v1/kitchen/*  → requireAuth → requireRole(['KITCHEN', 'ADMIN']) → validateAdminDomain
/api/v1/admin/*    → requireAuth → requireRole(['ADMIN']) → validateAdminDomain
/api/v1/finance/*  → requireAuth → requireRole(['FINANCE', 'ADMIN']) → validateAdminDomain
```

---

## 📦 Package Management

### Root package.json
```json
{
  "workspaces": [
    "backend",
    "frontend-public",
    "frontend-admin",
    "frontend-common"
  ]
}
```

### Installing Dependencies
```bash
# Install all workspace dependencies
npm install

# Install in specific workspace
npm install <package> --workspace=frontend-public
npm install <package> --workspace=frontend-admin
npm install <package> --workspace=backend
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test

# Test domain validation specifically
npm test -- domainValidation
```

### Frontend Tests
```bash
# Public app
cd frontend-public
npm test

# Admin app
cd frontend-admin
npm test
```

---

## 🚢 Deployment

### Production URLs (Example)
```
Public App:  https://order.hrc-kitchen.com
Admin App:   https://manage.hrc-kitchen.com
Backend API: https://api.hrc-kitchen.com
```

### Environment Variables

#### Backend (Production)
```bash
NODE_ENV=production
ALLOWED_ADMIN_DOMAIN=hrc-kitchen.com,huonregionalcare.com.au
PUBLIC_APP_URL=https://order.hrc-kitchen.com
ADMIN_APP_URL=https://manage.hrc-kitchen.com
CORS_ORIGIN=https://order.hrc-kitchen.com,https://manage.hrc-kitchen.com
```

#### Public App (Production)
```bash
VITE_API_URL=https://api.hrc-kitchen.com/api/v1
VITE_ADMIN_APP_URL=https://manage.hrc-kitchen.com
VITE_STRIPE_PUBLIC_KEY=pk_live_...
```

#### Admin App (Production)
```bash
VITE_API_URL=https://api.hrc-kitchen.com/api/v1
VITE_PUBLIC_APP_URL=https://order.hrc-kitchen.com
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
```

---

## 📝 Key Files to Update

### Backend
- [x] `backend/.env` - Add `ALLOWED_ADMIN_DOMAIN`, `PUBLIC_APP_URL`, `ADMIN_APP_URL`
- [ ] `backend/src/middleware/domainValidation.ts` - Create new file
- [ ] `backend/src/routes/auth.routes.ts` - Add `hasAdminAccess` to login response
- [ ] `backend/src/routes/kitchen.routes.ts` - Apply domain validation middleware
- [ ] `backend/src/routes/admin.routes.ts` - Apply domain validation middleware
- [ ] `backend/src/services/admin.service.ts` - Add role assignment validation
- [ ] `backend/src/index.ts` - Update CORS configuration

### Frontend
- [ ] Create `frontend-public/` workspace
- [ ] Create `frontend-admin/` workspace
- [ ] Create `frontend-common/` workspace
- [ ] Update root `package.json` workspaces
- [ ] Migrate components to appropriate apps
- [ ] Extract shared components to `frontend-common`

---

## ❓ FAQ

### Q: Can a user access both apps?
**A:** Yes, if they have an email from the allowed domain and are assigned a privileged role (KITCHEN/ADMIN/FINANCE).

### Q: What happens to existing users after migration?
**A:**
- Users with domain emails → Can continue accessing both apps
- Users with external emails → Can only access public ordering app
- Cannot promote external email users to privileged roles

### Q: Do we need to update the database?
**A:** No database schema changes required. All changes are at the application layer.

### Q: Can we add more allowed domains later?
**A:** Yes, simply update `ALLOWED_ADMIN_DOMAIN` in backend `.env` and restart the server.

### Q: What if a user forgets which app to use?
**A:**
- Public app shows "Management Portal" link for authorized users
- Admin app shows clear error message for unauthorized users
- Documentation will guide users to correct app

---

## 🔗 Related Documents

- **[APP_SEPARATION_PLAN.md](./APP_SEPARATION_PLAN.md)** - Complete implementation plan with technical details
- **[CLAUDE.md](./CLAUDE.md)** - Project overview and current development status
- **[PRD.md](./PRD.md)** - Product requirements including Phase 6 architecture
- **[MVP_PLAN.md](./MVP_PLAN.md)** - Original MVP build plan

---

## 📞 Support

For questions about the application separation:
1. Review [APP_SEPARATION_PLAN.md](./APP_SEPARATION_PLAN.md)
2. Check this quick reference
3. Consult the PRD Section 14

---

**Last Updated:** November 11, 2025
**Version:** 1.0
