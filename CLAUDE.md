# Claude Code - HRC Kitchen Project

## Project Documentation

### Primary Reference
- **[Product Requirements Document (PRD)](./PRD.md)** - Complete functional and technical specification for the HRC Kitchen lunch ordering system

## Quick Links
- PRD: `./PRD.md`
- MVP Build Plan: `./MVP_PLAN.md`
- **[App Separation Plan](./APP_SEPARATION_PLAN.md)** - Implementation plan for splitting into public and admin apps

## Project Overview
HRC Kitchen is a web-based lunch ordering system for Huon Regional Care staff, featuring:
- Self-service registration and ordering
- Daily rotating weekly menus
- Time-windowed same-day ordering
- Secure payment processing via Stripe
- Batch order fulfillment for kitchen staff
- Non-technical menu management interface

## Development Status
- **Current Phase**: Application Separation (Public vs Admin Apps)
- **Previous Phase**: MVP Complete + Apple Pay/Google Pay Integration
- **Completed**:
  - ✅ Project structure and monorepo setup
  - ✅ Backend API foundation (Node.js/Express/TypeScript)
  - ✅ PostgreSQL database with Prisma ORM (using Neon cloud database)
  - ✅ Complete database schema (users, menu items, orders, payments, system config)
  - ✅ Authentication system (JWT, bcrypt, email/password registration)
  - ✅ Stripe payment integration (backend service + webhooks)
  - ✅ Frontend foundation (React/TypeScript/Vite with Material-UI)
  - ✅ User registration and login flows (tested and working)
  - ✅ Development environment setup
  - ✅ Database seeding with test users and sample menu data (all weekdays)
  - ✅ **Phase 1 Complete**: Menu browsing & shopping cart system
    - Menu API endpoints (`/api/v1/menu/today`, `/api/v1/menu/week`)
    - System config service for ordering window management
    - Menu page with item cards, dietary tags, and categories
    - Cart context with localStorage persistence
    - Cart drawer with quantity controls and customizations
    - Add to cart with customization options and special requests
    - Ordering window banner (red warning when closed)
  - ✅ **Phase 2 Complete**: Order placement and payment checkout
    - Order API endpoints (`POST /api/v1/orders`, `GET /api/v1/orders`, `GET /api/v1/orders/:id`)
    - Order service with transaction handling and Stripe integration
    - Ordering window validation
    - Checkout page with Stripe Elements card payment form
    - **Apple Pay & Google Pay Integration**:
      - Stripe Payment Request Button API implementation
      - Automatic detection of device/browser capabilities
      - Apple Pay support on Safari (macOS/iOS)
      - Google Pay support on Chrome (desktop with account, Android)
      - Unified payment flow for card, Apple Pay, and Google Pay
      - Guest checkout support with payment method info extraction
      - HTTPS requirement for desktop browsers (works with ngrok for testing)
      - Material-UI themed appearance configuration
    - Order confirmation page with order details
    - Orders history page listing all user orders
    - End-to-end tested: Menu → Cart → Checkout → Payment (Card/Apple Pay/Google Pay) → Confirmation → Order History
  - ✅ **Phase 3 Complete**: Kitchen Dashboard for order management
    - Kitchen API endpoints (`/api/v1/kitchen/*`)
    - Item-level fulfillment tracking with automatic order status calculation
    - Two-view system: "Group by Item" (default) and "Order List"
    - Batch fulfillment functionality with smooth animations
    - Collapsible fulfilled items
    - Real-time status updates without page refresh
    - Role-based access control (KITCHEN/ADMIN only)
    - Daily statistics and filtering
    - Smooth reordering animations when items are fulfilled
    - Visual feedback: card-level flash for batch fulfillment, row-level flash for individual items
  - ✅ **Phase 4 Complete**: Admin Panel for comprehensive management
    - Admin API endpoints (`/api/v1/admin/*`)
    - Menu management with three view modes:
      - By Day (weekday tabs: Monday-Friday)
      - By Category (Main, Side, Drink, Dessert, Other)
      - All Items (unified view)
    - Search functionality across all menu items
    - Create, edit, delete menu items
    - Customization management for menu items
    - Image upload with Cloudinary integration
    - Automatic client-side image compression before upload
    - **Product Variations System**:
      - Variation groups (e.g., Size, Protein Choice, Add-ons)
      - Single-select (radio) and multi-select (checkbox) options
      - Price modifiers for each option (positive/negative/zero)
      - Default option selection support (one default per group)
      - Required/optional group configuration
      - Inline editing for groups and options (no modal dialogs)
      - Real-time state updates without page refreshes
      - Customer-facing variation selector with dynamic pricing
      - Kitchen dashboard displays selected variations
      - Order system stores and processes variation selections
    - User management (view, search, filter users)
    - Role management (promote/demote users with self-protection)
    - User activation/deactivation with self-protection
    - System configuration (ordering window times)
    - Time validation (HH:MM format, end after start)
    - Admin dashboard with tabbed navigation
    - Three-panel interface: Menu Management, User Management, System Config
    - **Multi-Weekday Menu Support**:
      - Menu items can be assigned to multiple weekdays (checkbox selection)
      - Items appear on all selected days in weekly view
      - Database schema uses `weekdays: Weekday[]` array field
      - Admin UI shows weekday chips for each assigned day
      - Validation requires at least one weekday selection
  - ✅ **Phase 5 Complete**: Guest Checkout & UX Improvements
    - **Guest Checkout System**:
      - Database schema updates: nullable `userId`, added `guestEmail`, `guestFirstName`, `guestLastName` fields
      - Guest order endpoints (`POST /api/v1/orders/guest`, `GET /api/v1/orders/guest/:id`)
      - Email existence check to prevent duplicate accounts (409 response with `EMAIL_EXISTS` code)
      - Guest order support in Kitchen Dashboard with proper display of guest information
      - Checkout page with conditional guest info form (firstName, lastName, email)
      - Email validation and duplicate detection with dialog prompt to sign in
      - Post-purchase account creation dialog on order confirmation page
      - Cart preservation across login/logout via localStorage
      - Stripe `receipt_email` integration for guest orders
    - **Navigation & Routing**:
      - Menu page set as home page (`/` route)
      - Logout redirects to home (menu) instead of login page
      - 404 Not Found page with 5-second countdown and auto-redirect to home
      - Catch-all route handler for undefined paths
      - Removed duplicate Container wrapper from App.tsx for consistent layout
    - **Menu Access**:
      - Menu routes made public (no authentication required)
      - Guest users can browse menu and add items to cart
      - Login optional for ordering (supports guest checkout)

- **Next Steps** (Optional Enhancements):
  1. Email notifications for order status updates
  2. Print functionality for kitchen tickets
  3. Enhanced reporting and analytics
  4. Advanced filtering and search in order history
  5. Production deployment preparation

## Technical Setup

### Database
- **Provider**: Neon PostgreSQL (cloud-hosted)
- **Connection**: Configured in `backend/.env`
- **Migrations**: Run via `npm run db:migrate` in backend
- **Seeding**: Test data available via `npm run db:seed`

### Test Accounts
After seeding, the following accounts are available:
- **Admin**: admin@hrc-kitchen.com / Admin123!
- **Kitchen**: kitchen@hrc-kitchen.com / Kitchen123!
- **Staff**: staff@hrc-kitchen.com / Staff123!

### Running Locally
```bash
npm run dev  # Starts both backend (port 3000) and frontend (port 5173)
```

### Testing Apple Pay / Google Pay
**Development Testing:**
- **Apple Pay**: Use Safari on macOS/iOS with Apple Pay configured
- **Google Pay**: Requires HTTPS on desktop Chrome
  - Option 1: Test on Android device via local network (`http://192.168.0.9:5173`)
  - Option 2: Use ngrok for HTTPS tunnel (`ngrok http 5173`)
  - Option 3: Deploy to staging environment with HTTPS (Vercel, Netlify)
- Payment Request Button automatically detects and shows available payment methods
- Test card: `4242 4242 4242 4242`, any future expiry, any CVC

**Production:**
- Works automatically on HTTPS domains
- No special configuration needed

## Key Implementation Details

### Backend Architecture
- **Order Service** (`backend/src/services/order.service.ts`):
  - Creates orders with Stripe payment intents in a database transaction
  - Validates ordering windows (8:00 AM - 10:30 AM on weekdays)
  - Generates unique order numbers (format: ORD-YYYYMMDD-####)
  - Stores customizations and special requests as JSON
  - `createOrderInternal()` - Internal method for order creation (used by both authenticated and guest flows)
  - `createGuestOrder()` - Guest order creation with guest information
  - `getGuestOrderById()` - Retrieve guest orders without authentication

- **Kitchen Service** (`backend/src/services/kitchen.service.ts`):
  - `getOrders()` - Fetch orders with filters (date, status, menu item)
  - `getOrderSummary()` - Group orders by menu item for batch preparation
  - `updateOrderStatus()` - Update entire order fulfillment status
  - `updateOrderItemStatus()` - Update individual item status with auto-calculation
  - `getDailyStats()` - Calculate daily statistics
  - Automatic order status calculation: PLACED → PARTIALLY_FULFILLED → FULFILLED

- **Payment Integration**:
  - Static PaymentService methods for Stripe operations
  - Payment intents created before order confirmation
  - Webhook handlers for payment status updates
  - Payment IDs stored directly on Order model
  - Payment Request Button API for Apple Pay/Google Pay
  - Automatic payment method detection based on device/browser capabilities

- **CORS Configuration** (`backend/src/index.ts`):
  - Environment-aware CORS policy
  - Development: Allows localhost, local network (192.168.x.x), and ngrok tunnels
  - Production: Only allows configured frontend domain (via `FRONTEND_URL` env variable)
  - Regex-based pattern matching for ngrok URLs
  - Request origin logging for security monitoring

- **Admin Service** (`backend/src/services/admin.service.ts`):
  - `createMenuItem()` - Create new menu items with dietary tags, customizations, and multiple weekdays
  - `updateMenuItem()` - Update existing menu items including weekday assignments
  - `deleteMenuItem()` - Soft delete (deactivate) or permanently delete menu items
  - `addCustomization()` - Add customization options to menu items
  - `deleteCustomization()` - Remove customization options
  - `createVariationGroup()` - Create variation groups for menu items
  - `updateVariationGroup()` - Update variation group settings
  - `deleteVariationGroup()` - Delete variation groups
  - `createVariationOption()` - Add options to variation groups with price modifiers
  - `updateVariationOption()` - Update variation options
  - `deleteVariationOption()` - Remove variation options
  - `getUsers()` - Fetch users with pagination, search, and filtering
  - `updateUserRole()` - Promote/demote user roles with self-protection
  - `updateUserStatus()` - Activate/deactivate users with self-protection
  - `getConfig()` - Retrieve all system configuration
  - `updateConfig()` - Update ordering window times with validation

- **Upload Service** (`backend/src/services/upload.service.ts`):
  - Cloudinary integration for menu item images
  - `generateUploadSignature()` - Generate signed URLs for direct uploads
  - `uploadImage()` - Server-side image upload with optimization
  - `deleteImage()` - Remove images from Cloudinary
  - Automatic image transformation (800x800 max, quality optimization)

### Frontend Architecture
- **Pages**:
  - `/` - Home page (MenuPage)
  - `/menu` - Browse daily menu with cart functionality
  - `/checkout` - Stripe Elements payment form with guest checkout support
    - **Payment Request Button**: Automatically shows Apple Pay/Google Pay when available
    - Card payment via Stripe Elements
    - Guest checkout with email validation
    - Material-UI themed Stripe Elements appearance
    - Unified payment flow for all payment methods
  - `/order-confirmation/:orderId` - Order success page with optional account creation
  - `/orders` - Order history with status tracking (authenticated users only)
  - `/kitchen` - Kitchen dashboard (KITCHEN/ADMIN only)
  - `/admin` - Admin dashboard (ADMIN only)
  - `/login` - Login page with redirect support
  - `/register` - Registration page
  - `*` (404) - Not Found page with auto-redirect to home

- **Vite Configuration** (`frontend/vite.config.ts`):
  - `host: '0.0.0.0'` - Enables local network and ngrok access for development
  - `allowedHosts` - Permits ngrok tunnel hosts for Apple Pay/Google Pay testing
  - Development-only settings (ignored in production build)
  - API proxy to backend (`/api` → `http://localhost:3000`)

- **Kitchen Dashboard Features** (`/kitchen`):
  - **Two View Modes**:
    - **Group by Item** (default): Orders grouped by menu item for batch preparation
      - Collapsible fulfilled item cards
      - Batch fulfillment: Mark all items of a menu type as fulfilled at once
      - Shows quantity summary per menu item
      - Individual order details within each menu item
    - **Order List**: Individual orders with full details and item-level fulfillment
      - Full customer information per order
      - Item-by-item fulfillment tracking
      - Special requests display
  - Date picker for viewing any date's orders
  - Status filtering (All, PLACED, PARTIALLY_FULFILLED, FULFILLED)
  - Smart sorting (unfulfilled items first, both at card and row level)
  - Local state updates for instant UI feedback (no page refresh)
  - Daily statistics: Total orders, revenue, pending count
  - **Smooth Animations**:
    - Card-level green flash animation when batch fulfilling
    - Row-level green flash animation when marking individual items
    - Smooth reordering with fulfilled items sinking down (0.8s Material Design easing)
    - Scale effects for visual feedback

- **Admin Dashboard Features** (`/admin`):
  - **Menu Management Tab**:
    - **Three View Modes** (icon-based toggle with tooltips):
      - By Day: Weekday tabs (Monday-Friday)
      - By Category: Filter by meal type (Main, Side, Drink, Dessert, Other)
      - All Items: Unified view of entire menu
    - Global search across all menu items (name, description, category, dietary tags)
    - Create, edit, delete menu items
    - Image upload with Cloudinary integration
    - Automatic client-side image compression (1200px @ 80%, fallback to 800px @ 60%)
    - Upload progress indicator
    - Dietary tag selection (Vegetarian, Vegan, Gluten-Free, Dairy-Free, Nut-Free, Halal)
    - Category assignment (Main, Side, Drink, Dessert, Other)
    - **Multi-weekday selection** (checkboxes for Monday-Friday, at least one required)
    - Items automatically appear on all selected weekdays
    - Active/inactive toggle for menu items
    - Visual card-based layout with images
    - Contextual chips showing all assigned weekdays/category based on view mode
    - **Variation Management**:
      - Inline group creation/editing (no modal dialogs)
      - Inline option creation/editing within groups
      - All groups always visible (no expand/collapse)
      - Real-time state updates without page refreshes
      - Single/Multi-select type configuration
      - Required/optional group settings
      - Price modifier support with automatic formatting
      - Default option enforcement (one per group)
      - Drag indicators for future reordering support
  - **User Management Tab**:
    - Searchable and filterable user table
    - Role-based filtering (Staff, Kitchen, Admin)
    - Status filtering (Active/Inactive)
    - Pagination support (20 users per page)
    - Role promotion/demotion with confirmation
    - User activation/deactivation
    - Self-protection (cannot modify own account)
    - Full name and email search
  - **System Configuration Tab**:
    - Ordering window time configuration
    - Time validation (HH:MM format, end after start)
    - Real-time configuration updates
    - Configuration guidelines and help text
    - Monday-Friday application (weekends automatically disabled)

- **State Management**:
  - CartContext with localStorage persistence
  - AuthContext with JWT token management
  - React Router for navigation
  - Local component state for kitchen dashboard collapse/expand

### Data Flow

**Authenticated User Flow:**
1. User browses menu and adds items to cart (with customizations and variations)
2. Variation selector shows available options with dynamic price calculation
3. Cart persisted to localStorage with selected variations
4. Checkout creates order and Stripe PaymentIntent with user ID
5. User selects payment method:
   - **Apple Pay/Google Pay**: One-click payment (if available on device/browser)
   - **Card**: Enters card details via Stripe Elements
6. Payment confirmed → Order status updated → Redirect to confirmation
7. User can view order history and details with variations
8. Kitchen dashboard displays orders with user information and variation selections

**Guest User Flow:**
1. Guest browses menu without login and adds items to cart
2. Cart persisted to localStorage (survives across login/logout)
3. At checkout, guest enters firstName, lastName, and email
4. System checks if email already exists:
   - If exists: Shows dialog prompting guest to sign in
   - If new: Creates guest order with guest information
5. Guest selects payment method:
   - **Apple Pay/Google Pay**: Payment method provides name/email automatically
   - **Card**: Uses manually entered guest information
6. Checkout creates order and Stripe PaymentIntent with guest email (for receipt)
7. Payment confirmed → Order status updated → Redirect to confirmation
8. Order confirmation page offers optional account creation
9. Kitchen dashboard displays guest orders with guest name and email

**Payment Request Button (Apple Pay/Google Pay):**
- Automatically detects browser/device capabilities using `stripe.paymentRequest().canMakePayment()`
- Shows only when user's device supports Apple Pay or Google Pay
- Extracts payer name and email from payment method for guest checkout
- Unified payment flow with same order creation and confirmation process
- Falls back to card payment if digital wallet not available

## Development Guidelines

### Process Management
**IMPORTANT**: Do NOT kill processes or start/restart the backend and frontend servers automatically.
- The developer will manage `npm run dev` manually
- When server restart is needed, notify the developer to restart it themselves
- You may check process output using BashOutput tool, but do not kill or restart services

### Notes
- All project requirements, architecture decisions, and specifications are documented in the PRD
- See `GETTING_STARTED.md` for detailed setup instructions
- Backend API documentation follows RESTful conventions at `/api/v1/*`
- Stripe test mode enabled - use test cards for payment testing
- Use Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC

### Security Notes
- **CORS**: Environment-aware configuration
  - Development: Allows localhost, local network, and ngrok for testing
  - Production: Restricts to configured `FRONTEND_URL` only
- **Vite Dev Server**: `host: '0.0.0.0'` and `allowedHosts` are development-only
  - Safe behind home/office router (not exposed to internet)
  - Settings ignored in production builds (serves static files)
- **Apple Pay/Google Pay**: Requires HTTPS on desktop browsers
  - Use ngrok or production deployment for desktop testing
  - Works on mobile devices over HTTP (local network)

## Database Schema Changes

### Order Model Updates (Phase 5)
Added support for guest orders with nullable user relationship:

```prisma
model Order {
  userId            String?       @map("user_id")
  guestEmail        String?       @map("guest_email")
  guestFirstName    String?       @map("guest_first_name")
  guestLastName     String?       @map("guest_last_name")
  user              User?         @relation(fields: [userId], references: [id])

  @@index([guestEmail])
}
```

**Migration**: `20251009000000_add_guest_checkout_support.sql`

### MenuItem Model Updates (Multi-Weekday Support)
Changed single weekday field to array for multiple weekday assignments:

```prisma
model MenuItem {
  weekdays        Weekday[]     @default([])  // Changed from: weekday Weekday

  @@index([isActive])  // Removed weekday from index
}
```

**Migration**: `20251010000000_add_multiple_weekdays_support.sql`

**Data Migration Steps**:
1. Adds `weekdays` array column with default empty array
2. Migrates existing `weekday` value to `weekdays` array: `UPDATE menu_items SET weekdays = ARRAY[weekday]`
3. Drops old `weekday` column
4. Updates index from `(weekday, isActive)` to `(isActive)` only

## API Endpoints

### Guest Order Endpoints (Phase 5)
- `POST /api/v1/orders/guest` - Create guest order (no authentication required)
  - Request body: `{ items, deliveryNotes, guestInfo: { firstName, lastName, email } }`
  - Returns: `{ order, clientSecret }` or `409` if email exists
- `GET /api/v1/orders/guest/:id` - Retrieve guest order by ID (no authentication required)

### Updated Menu Endpoints
- `GET /api/v1/menu/today` - Public access (no authentication)
- `GET /api/v1/menu/week` - Public access (no authentication)
- `GET /api/v1/menu/items/:id` - Public access (no authentication)

---

## Application Separation Architecture (Phase 6 - In Planning)

**See [APP_SEPARATION_PLAN.md](./APP_SEPARATION_PLAN.md) for complete implementation details.**

### Overview

The application will be split into **two separate frontend applications** while maintaining a single shared backend:

#### 1. Public Ordering App (`frontend-public`)
**Purpose:** Customer-facing lunch ordering system

**Features:**
- Menu browsing (public access)
- Shopping cart with localStorage
- Guest checkout (no account required)
- User registration (any email domain accepted)
- Authenticated order history
- Payment processing (Stripe)

**Access:** Open to anyone (staff, guests, public)

**Port:** 5173 (dev), separate subdomain in production (e.g., `order.hrc-kitchen.com`)

#### 2. Internal Management App (`frontend-admin`)
**Purpose:** Staff-only operations and administration

**Features:**
- Kitchen dashboard (order fulfillment)
- Admin panel (menu/user/system management)
- Finance reports
- Analytics and reporting

**Access:** Restricted to configured email domain(s) only

**Port:** 5174 (dev), separate subdomain in production (e.g., `manage.hrc-kitchen.com`)

### Key Benefits

1. **Security Separation**
   - Public app has no admin code exposure
   - Admin app enforces email domain restrictions
   - Reduced attack surface for each app

2. **User Experience**
   - Cleaner, focused interface for each user type
   - Public app optimized for ordering workflow
   - Admin app optimized for management tasks

3. **Deployment Flexibility**
   - Independent deployment pipelines
   - Scale apps independently
   - Different CDN/caching strategies

4. **Code Organization**
   - Clear separation of concerns
   - Shared component library (`frontend-common`)
   - Easier maintenance and testing

### Email Domain Restrictions

**Configuration:**
```bash
# Backend environment variable
ALLOWED_ADMIN_DOMAIN=hrc-kitchen.com,huonregionalcare.com.au
```

**Enforcement:**
- **Staff Role:** Any email domain allowed (e.g., `user@gmail.com`)
- **Kitchen/Admin/Finance Roles:** Must match configured domain(s)
- **Backend Validation:** Domain checked via middleware on all protected routes
- **Frontend Validation:** Admin app login page checks domain before login
- **Role Assignment:** Cannot assign privileged roles to users outside allowed domain(s)

### Shared Authentication

- Single JWT token system
- Same credentials work across both apps
- Login in public app → Can access admin app (if authorized)
- Login in admin app → Can access public app
- Token stored in localStorage/cookies (shared domain strategy)

### Architecture Diagram

```
┌──────────────────────┐         ┌──────────────────────┐
│  Public Ordering App │         │ Internal Mgmt App    │
│                      │         │                      │
│  - Menu browsing     │         │  - Kitchen dashboard │
│  - Cart & checkout   │         │  - Admin panel       │
│  - Guest orders      │         │  - Finance reports   │
│  - Order history     │         │  - Analytics         │
│                      │         │                      │
│  ANY email domain    │         │  DOMAIN-ONLY emails  │
│  Port: 5173          │         │  Port: 5174          │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           │    ┌────────────────────┐      │
           └────┤ Shared Components  ├──────┘
                │  (frontend-common) │
                └──────────┬─────────┘
                           │
                           ▼
         ┌─────────────────────────────────┐
         │     Shared Backend API          │
         │   (Express + TypeScript)        │
         │                                 │
         │  - Domain validation middleware │
         │  - Role-based access control    │
         │  - Shared authentication        │
         │                                 │
         │        Port: 3000                │
         └──────────────┬──────────────────┘
                        │
                        ▼
         ┌─────────────────────────────────┐
         │   PostgreSQL Database           │
         │      (Neon Cloud)               │
         └─────────────────────────────────┘
```

### Migration Status

**Current Status:** Planning Phase

**Next Steps:**
1. Backend domain validation implementation
2. Shared component library extraction
3. Public app creation
4. Admin app creation
5. Integration testing
6. Documentation updates
7. Production deployment

**Timeline:** 5 weeks (see [APP_SEPARATION_PLAN.md](./APP_SEPARATION_PLAN.md) for detailed timeline)

**Backward Compatibility:**
- Backend changes are backward compatible
- Current frontend will continue working during migration
- Zero-downtime migration possible
