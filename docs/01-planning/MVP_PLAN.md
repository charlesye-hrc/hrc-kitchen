# HRC Kitchen - MVP Build Plan

**Version**: 1.0
**Date**: October 9, 2025
**Timeline**: 6-8 weeks
**Status**: ✅ MVP Complete - Ready for UAT

---

## Table of Contents
1. [Current Status](#current-status)
2. [Build Phases](#build-phases)
3. [Implementation Timeline](#implementation-timeline)
4. [Technical Stack](#technical-stack)
5. [Progress Tracking](#progress-tracking)

---

## Current Status

### ✅ Completed Foundation
- Database schema (Prisma with PostgreSQL/Neon)
- Authentication system (registration, login, JWT, email verification)
- Stripe payment integration (backend services + webhooks)
- Basic frontend structure (React, TypeScript, Vite, Material-UI)
- Frontend pages: Home, Login, Register
- Development environment setup
- Test data seeding with sample users and menu items

### 🎯 MVP Scope
Implementing Phase 1 features from PRD (see PRD.md Section 10) to deliver a functional lunch ordering system with:
- Menu browsing with time-windowed ordering
- Shopping cart and checkout
- Secure payment processing
- Kitchen order management
- Admin menu and system configuration

---

## Build Phases

### **Phase 1: Menu Browsing & Cart System**
**Timeline**: Week 1-2
**Status**: ✅ Completed

#### Backend Tasks
- [x] **1.1 Menu API Endpoints**
  - `GET /api/v1/menu/today` - Fetch today's menu items based on weekday
  - `GET /api/v1/menu/week` - Fetch full weekly menu (admin only)
  - Create menu controller and service
  - Add ordering window validation middleware
  - Filter by active items and correct weekday

- [x] **1.2 System Config Service**
  - Create system config service for retrieving/updating config
  - Seed default ordering window times (8:00 AM - 10:30 AM)
  - Create utility to check if current time is within ordering window
  - Add config keys: `ordering_window_start`, `ordering_window_end`

#### Frontend Tasks
- [x] **1.3 Menu Page Component**
  - Create MenuPage component with route `/menu`
  - Fetch and display today's menu items
  - Group items by category (Main, Side, Drink, Dessert, Other)
  - Display item cards with: image, name, description, price, dietary tags
  - Show ordering window countdown timer
  - Display message when ordering window is closed
  - Add dietary tag filters

- [x] **1.4 Shopping Cart System**
  - Create CartContext for global cart state management
  - Cart data structure: items with quantity, customizations, special requests
  - Add to cart functionality from menu items
  - Cart sidebar/drawer component
  - Cart item list with quantity controls (+/-)
  - Remove item from cart
  - Clear entire cart
  - Display cart subtotal
  - Customization options UI per item
  - Special requests text field
  - Persist cart in localStorage (optional enhancement)

**Deliverables**: Staff can browse today's menu and add items to cart during ordering window ✅

---

### **Phase 2: Order Placement & Payment**
**Timeline**: Week 2-3
**Status**: ✅ Completed

#### Backend Tasks
- [x] **2.1 Order API Endpoints**
  - `POST /api/v1/orders` - Create order with items
  - `GET /api/v1/orders` - Get user's order history
  - `GET /api/v1/orders/:id` - Get single order details
  - Create order controller and service
  - Implement order number generation (format: ORD-YYYYMMDD-####)
  - Validate items are from today's menu
  - Check ordering window is active

- [x] **2.2 Enhanced Payment Integration**
  - Update payment service to create payment intent with order context
  - Link payment intent to pending order
  - Webhook handler to confirm order on payment success
  - Atomically create order and order items on payment confirmation (database transactions)
  - Handle payment failures and order cleanup
  - Store transaction details in Order.paymentId

- [x] **2.3 Order Confirmation**
  - Generate receipt data
  - Return order confirmation response

#### Frontend Tasks
- [x] **2.4 Checkout Flow**
  - Create CheckoutPage component with route `/checkout`
  - Display order summary (items, quantities, customizations, total)
  - Integrate Stripe Elements for payment form
  - Handle payment submission
  - Show loading state during payment processing
  - Error handling for payment failures

- [x] **2.5 Order Confirmation Page**
  - Create OrderConfirmationPage component with route `/order-confirmation/:orderId`
  - Display order number, timestamp, items, total
  - Display payment and fulfillment status
  - Success message and navigation to order history

- [x] **2.6 Order History Page**
  - Create OrdersPage component with route `/orders`
  - Display user's past orders (newest first)
  - Status badges for payment and fulfillment status
  - View details links to confirmation page
  - Empty state with "Browse Menu" CTA

**Deliverables**: Staff can complete checkout, make payment, and receive order confirmation ✅

---

### **Phase 3: Kitchen Dashboard**
**Timeline**: Week 3-4
**Status**: ✅ Completed

#### Backend Tasks
- [x] **3.1 Kitchen API Endpoints**
  - `GET /api/v1/kitchen/orders` - Get all orders with filters (date, status, menu item)
  - `GET /api/v1/kitchen/summary` - Get orders grouped by menu item for batch preparation
  - `PATCH /api/v1/kitchen/orders/:id/status` - Update order fulfillment status
  - `PATCH /api/v1/kitchen/order-items/:id/status` - Update individual order item status
  - `GET /api/v1/kitchen/stats` - Get daily statistics
  - Add role-based middleware for kitchen staff access (KITCHEN, ADMIN)
  - Implement grouping/aggregation logic for batch view
  - Filter options: by menu item, status, date

- [x] **3.2 Order Query Services**
  - Create kitchen service for order queries
  - Aggregate orders by menu item with quantities
  - Include customizations for each item instance
  - Calculate total quantities per menu item
  - Automatic order status calculation (PLACED → PARTIALLY_FULFILLED → FULFILLED)
  - Item-level fulfillment tracking

#### Frontend Tasks
- [x] **3.3 Kitchen Dashboard Page**
  - Create KitchenDashboardPage component with route `/kitchen`
  - Protected route for KITCHEN and ADMIN roles only
  - Tab navigation: Order List View | Batch View
  - Date picker for viewing any date's orders
  - Status filter dropdown (All, PLACED, PARTIALLY_FULFILLED, FULFILLED)
  - Daily statistics cards (Total Orders, Revenue, Pending)

- [x] **3.4 Batch View**
  - Display orders grouped by menu item in full-width cards
  - Show total quantity needed per item with prominent display
  - List all customizations for each order
  - Individual line item fulfillment with "Mark Fulfilled" buttons
  - Batch fulfillment: "Mark All [Item] as Fulfilled" button
  - Collapsible fulfilled item cards to reduce clutter
  - Smart sorting: unfulfilled items first (both card level and row level)
  - Progress indicator: "X of Y fulfilled" badge
  - Alternating row backgrounds with hover effects
  - Real-time UI updates without page refresh

- [x] **3.5 Order List View**
  - Display chronological list of all orders
  - Order cards with: order number, customer name, timestamp, items
  - Show fulfillment status with subtle text (not redundant chips)
  - Item-level fulfillment controls
  - Mark all items in order as fulfilled
  - Filter by status works in both views
  - Customer names and customizations displayed

- [ ] **3.6 Kitchen Ticket Printing** (Deferred to later phase)
  - Create print-friendly view CSS
  - Print all orders button
  - Print individual order ticket
  - Print batch summary (quantities per item)

**Deliverables**: Kitchen staff can view orders, batch prepare items, update item-level fulfillment status, and manage orders efficiently ✅

---

### **Phase 4: Admin Panel**
**Timeline**: Week 4-5
**Status**: ✅ Completed

#### Backend Tasks
- [x] **4.1 Menu Management API**
  - `POST /api/v1/admin/menu/items` - Create menu item
  - `PUT /api/v1/admin/menu/items/:id` - Update menu item
  - `DELETE /api/v1/admin/menu/items/:id` - Delete/deactivate menu item
  - `POST /api/v1/admin/menu/items/:id/customizations` - Add customization
  - `DELETE /api/v1/admin/menu/customizations/:id` - Remove customization
  - Add admin role middleware
  - Validate menu item data
  - Handle image upload URLs

- [x] **4.2 User Management API**
  - `GET /api/v1/admin/users` - List all users with pagination
  - `PATCH /api/v1/admin/users/:id/role` - Update user role
  - `PATCH /api/v1/admin/users/:id/status` - Activate/deactivate user
  - Search and filter users
  - Prevent self-demotion logic

- [x] **4.3 System Configuration API**
  - `GET /api/v1/admin/config` - Get all system config
  - `PUT /api/v1/admin/config` - Update system config
  - Validate ordering window times
  - Ensure end time is after start time

- [x] **4.4 Image Upload Integration**
  - Integrated with Cloudinary
  - Create upload service with automatic optimization
  - Generate signed upload URLs
  - Handle image optimization (800x800 max) and CDN delivery

#### Frontend Tasks
- [x] **4.5 Admin Dashboard**
  - Create AdminDashboardPage with route `/admin`
  - Protected route for ADMIN role only
  - Tab navigation: Menu Management | User Management | System Config

- [x] **4.6 Menu Management Interface**
  - Three view modes (By Day, By Category, All Items) with icon toggles
  - Weekday tabs for By Day view (Mon-Fri)
  - Category selector for By Category view
  - Global search across all menu items
  - Add new menu item form/modal
  - Edit menu item form
  - Delete confirmation dialog
  - Image upload widget with automatic compression
  - Upload progress indicator
  - Category and dietary tags selectors
  - Customization options manager (add/remove options)
  - Active/inactive toggle
  - Visual card-based layout with images
  - Contextual chips (weekday/category based on view mode)

- [x] **4.7 User Management Interface**
  - Users table with columns: name, email, role, status, registration date
  - Search by name/email
  - Filter by role and status
  - Pagination (20 users per page)
  - Role promotion/demotion with confirmation
  - Activate/deactivate toggle
  - Self-protection (cannot modify own account)

- [x] **4.8 System Configuration Interface**
  - Configuration form for ordering window
  - Time pickers for start/end times (HH:MM format)
  - Validation error display
  - Save confirmation
  - Configuration guidelines and help text
  - Real-time configuration updates

**Deliverables**: Admin can manage menu items, users, and system configuration through comprehensive UI ✅

---

### **Phase 5: Reporting, Enhancements & Production Readiness**
**Timeline**: Week 6-7
**Status**: ✅ Completed

#### Backend Tasks
- [x] **5.1 Enhanced Order History API** ✅
  - Enhanced `GET /api/v1/orders` with date range filters
  - Added pagination support with metadata
  - Sort by date descending (already implemented)

- [x] **5.2 Dynamic Reporting API** ✅
  - `GET /api/v1/admin/reports/orders` - Order report with dynamic date range filters
  - `GET /api/v1/admin/reports/revenue-by-user` - Revenue by user over custom period
  - `GET /api/v1/admin/reports/popular-items` - Most ordered items with date filters
  - `GET /api/v1/admin/reports/summary` - Overall statistics with date range
  - Export to CSV functionality for all reports

- [x] **5.3 Receipt Generation** ✅
  - Enabled Stripe's `receipt_email` functionality (1-line code change)
  - Stripe automatically sends professional receipts on successful payment
  - Receipts include transaction details, payment method, amount
  - ~~PDF receipt generation~~ (Deferred - using Stripe-hosted receipts instead)
  - ~~Download receipt endpoint~~ (Not needed - Stripe provides receipt URL)
  - **Future Enhancement**: Custom HRC Kitchen-branded PDF receipts

- [x] **5.4 Kitchen Ticket Printing** ✅ (Deferred from Phase 3)
  - Print-friendly HTML template with CSS for batch summary
  - `GET /api/v1/kitchen/print?date=YYYY-MM-DD` - Printable bulk summary grouped by menu item
  - Shows total quantities, all customizations, special requests per item
  - "Print All" button on kitchen dashboard batch view
  - ~~Individual order tickets~~ (Out of scope - bulk summary only)

#### Frontend Tasks
- [x] **5.5 Enhanced Order History Page** ✅
  - Added date range filter to existing `/orders` page
  - Added pagination controls with page navigation
  - Clear filters button
  - Shows order count and pagination info
  - ~~Download receipt button~~ (Handled by Stripe receipts)

- [x] **5.6 Admin Reporting Dashboard** ✅
  - Created ReportsPage component with route `/admin/reports`
  - Added to admin dashboard as 4th tab
  - Dynamic date range picker (start date, end date)
  - Revenue by User report with table view
  - Popular Items report with table view
  - Order Summary with statistics cards
  - Export to CSV button for each report
  - ~~Revenue trend charts~~ (Optional enhancement deferred)

- [x] **5.7 Kitchen Ticket Printing UI** ✅
  - Print button on kitchen dashboard (opens printable page in new tab)
  - Print-friendly view with CSS media queries
  - Batch print all orders for selected date
  - ~~Individual order ticket print~~ (Out of scope)

- [ ] **5.8 UI/UX Polish** (Deferred to future phases)
  - Add loading skeletons for all data fetching
  - Error boundaries for graceful error handling
  - Toast notifications for actions (success/error)
  - Form validation with helpful error messages
  - Consistent spacing and styling
  - Responsive design improvements for mobile/tablet
  - Empty states for no data scenarios
  - Accessibility improvements (ARIA labels, keyboard navigation)

- [ ] **5.9 Testing** (Deferred to future phases)
  - End-to-end testing for critical user flows:
    - Registration → Login → Order → Payment → Confirmation
    - Kitchen: View orders → Update status
    - Admin: Add menu item → Assign to weekday
    - Admin: Generate revenue reports
  - Cross-browser testing (Chrome, Firefox, Safari, Edge)
  - Mobile responsive testing (iOS Safari, Chrome Mobile)
  - Payment testing with Stripe test cards
  - Edge cases: expired ordering window, duplicate orders, payment failures
  - Performance testing with 50+ concurrent users

- [ ] **5.10 Documentation** (Deferred to future phases)
  - API documentation (Swagger/Postman collection)
  - Staff user guide with screenshots
  - Kitchen staff training document
  - Admin training materials (menu, users, reports)
  - Deployment guide
  - Environment setup instructions
  - Troubleshooting guide

**Deliverables**: ✅ All core reporting features complete - dynamic reports, CSV export, kitchen printing, Stripe receipts, enhanced order history

---

## Implementation Timeline

```
Week 1:     Phase 1 - Menu API + Menu Page ✅
Week 2:     Phase 1 - Shopping Cart ✅ | Phase 2 - Order API ✅
Week 3:     Phase 2 - Checkout & Payment Flow ✅ | Phase 3 - Kitchen API ✅
Week 4:     Phase 3 - Kitchen Dashboard UI ✅
Week 5:     Phase 4 - Admin Panel Complete ✅
Week 6:     Phase 5 - All Core Features Complete ✅
Week 7+:    Future Enhancements (UI Polish, Testing, Documentation)
```

---

## Technical Stack

### Backend
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 14+ (Neon cloud)
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **Payment**: Stripe SDK
- **Email**: Nodemailer (to be integrated)
- **Validation**: Zod (to be added)

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **Routing**: React Router v6
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Payment UI**: Stripe Elements (@stripe/react-stripe-js)
- **Forms**: React Hook Form (to be added)

### DevOps
- **Version Control**: Git
- **Package Manager**: npm
- **Development**: Concurrent backend + frontend servers
- **Deployment**: TBD (AWS/Vercel/Railway)

---

## Progress Tracking

### Phase 1: Menu Browsing & Cart System
**Status**: ✅ Completed (October 7, 2025)
**Progress**: 4/4 tasks completed
**Blockers**: None

**Completed Tasks**:
- ✅ Menu API endpoints (`GET /api/v1/menu/today`, `GET /api/v1/menu/week`, `GET /api/v1/menu/items/:id`)
- ✅ System config service with ordering window validation
- ✅ Menu page component with category grouping and dietary tag filtering
- ✅ Shopping cart context with localStorage persistence
- ✅ Cart drawer UI with quantity controls and customization display
- ✅ Database seeded with 18 menu items across all weekdays
- ✅ Ordering window configuration (8:00 AM - 10:30 AM)

**Deliverables**: Staff can browse today's menu and add items to cart with customizations ✅

### Phase 2: Order Placement & Payment
**Status**: ✅ Completed (October 7, 2025)
**Progress**: 6/6 tasks completed
**Blockers**: None

**Completed Tasks**:
- ✅ Order API endpoints (`POST /api/v1/orders`, `GET /api/v1/orders`, `GET /api/v1/orders/:id`)
- ✅ Order service with Stripe PaymentIntent integration and database transactions
- ✅ Order number generation and ordering window validation
- ✅ Checkout page with Stripe Elements card payment form
- ✅ Order confirmation page with order details
- ✅ Order history page with status tracking

**Deliverables**: Staff can complete checkout, make payment, and receive order confirmation ✅

### Phase 3: Kitchen Dashboard
**Status**: ✅ Completed (October 7, 2025)
**Progress**: 5/6 tasks completed (Kitchen Ticket Printing deferred)
**Blockers**: None

**Completed Tasks**:
- ✅ Kitchen API endpoints (`GET /api/v1/kitchen/orders`, `GET /api/v1/kitchen/summary`, `PATCH /api/v1/kitchen/orders/:id/status`, `PATCH /api/v1/kitchen/order-items/:id/status`, `GET /api/v1/kitchen/stats`)
- ✅ Kitchen service with order aggregation and item-level fulfillment
- ✅ Automatic order status calculation (PLACED → PARTIALLY_FULFILLED → FULFILLED)
- ✅ Kitchen dashboard page with two-view system (Order List + Batch View)
- ✅ Batch view with full-width cards, collapsible fulfilled items, smart sorting
- ✅ Item-level and batch fulfillment controls
- ✅ Date picker and status filtering
- ✅ Daily statistics display
- ✅ Real-time UI updates without page refresh

**Deliverables**: Kitchen staff can efficiently view orders, batch prepare items, and manage item-level fulfillment ✅

### Phase 4: Admin Panel
**Status**: ✅ Completed (October 7, 2025)
**Progress**: 8/8 tasks completed
**Blockers**: None

**Completed Tasks**:
- ✅ Admin API endpoints for menu, user, and config management
- ✅ Menu management with three flexible view modes
- ✅ User management with role-based controls and self-protection
- ✅ System configuration for ordering windows
- ✅ Cloudinary integration with automatic image compression
- ✅ Admin dashboard with tabbed navigation
- ✅ Search and filter functionality across all admin interfaces
- ✅ Comprehensive validation and error handling

**Deliverables**: Admin can fully manage menu items, users, and system settings through intuitive UI ✅

### Phase 5: Reporting, Enhancements & Production Readiness
**Status**: ✅ Completed & UI Polished
**Progress**: 7/7 core tasks completed (3 deferred) + UI refinements
**Blockers**: None
**Completion Date**: October 9, 2025

**Completed Features**:
- ✅ Dynamic reporting with custom date ranges
- ✅ Revenue by user analysis for finance
- ✅ Stripe receipt email delivery
- ✅ Kitchen bulk ticket printing (HTML/CSS with 4-column grid layout)
- ✅ Enhanced order history with date filters and pagination
- ✅ Reports as top-level navigation (moved from Admin Dashboard)
- ✅ CSV export with proper authentication (blob download)
- ✅ All reporting APIs functional

**UI/UX Refinements**:
- ✅ Print layout: CSS Grid for vertical alignment
- ✅ Print button repositioned to page header
- ✅ Reports page: 4-column responsive filter layout
- ✅ Button heights aligned with text fields (56px)
- ✅ Authentication fixes for print and CSV downloads

**Deferred to Future**:
- Advanced UI polish (loading skeletons, error boundaries)
- Comprehensive testing (E2E, cross-browser, mobile)
- Documentation (API docs, user guides, training materials)

---

## Risk Mitigation

| Risk | Mitigation Strategy |
|------|---------------------|
| Stripe payment integration complexity | Use Stripe test mode extensively; implement comprehensive error handling |
| Ordering window logic errors | Thorough testing with different timezones; clear validation messages |
| Kitchen staff UI usability | User testing with actual kitchen staff; iterative feedback |
| Performance with many concurrent users | Database indexing; caching strategies; load testing |
| Browser compatibility issues | Cross-browser testing early; use polyfills where needed |

---

## Success Criteria

- [x] Staff can register, login, and place orders during ordering window
- [x] Payment processing works reliably with Stripe
- [x] Kitchen staff can view and manage orders efficiently
- [x] Admin can manage weekly menu without technical assistance
- [x] System enforces ordering window correctly
- [ ] One order per user per day validation works (optional enhancement)
- [ ] Mobile responsive design works on common devices (to be tested)
- [ ] No critical bugs in production (pending full testing)
- [ ] Documentation complete for all user roles (in progress)

---

## Notes

- All features align with PRD.md Section 4 (Functional Requirements)
- Focus on P0 (Must Have) features for MVP
- P1 (Should Have) features included in Phase 5
- Regular commits and branch management for each phase
- Weekly progress reviews recommended

---

## References

- **PRD**: `./PRD.md` - Complete product requirements
- **CLAUDE.md**: `./CLAUDE.md` - Project context and setup
- **Database Schema**: `./backend/prisma/schema.prisma`
- **Getting Started**: `./GETTING_STARTED.md`

---

**Last Updated**: October 9, 2025
**Next Review**: User Acceptance Testing
**Recent Changes**:
- ✅ Phase 1 completed successfully (Menu browsing & cart system)
- ✅ Phase 2 completed successfully (Order placement & payment checkout)
- ✅ Phase 3 completed successfully (Kitchen Dashboard with item-level fulfillment and smooth animations)
- ✅ Phase 4 completed successfully (Admin Panel with comprehensive management features)
- ✅ Phase 5 completed successfully (Reporting, enhancements, and UI polish)
- All core MVP features functional and polished
- Enhanced UX with smooth animations in Kitchen Dashboard
- Professional print layouts with CSS Grid alignment
- Top-level Reports navigation for easy access
- Proper authentication patterns for all downloads
- **MVP is now feature-complete and ready for UAT**
