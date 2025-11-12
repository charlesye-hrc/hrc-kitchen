# Product Requirements Document (PRD)
## HRC Kitchen - Lunch Ordering System

**Version:** 1.0
**Date:** October 7, 2025
**Product Owner:** Huon Regional Care
**Document Status:** Draft

---

## 1. Executive Summary

### 1.1 Product Overview
HRC Kitchen is a web-based lunch ordering system designed for Huon Regional Care staff. The application enables staff to browse daily rotating menus, place same-day lunch orders within configured time windows, make secure credit card payments, and allows kitchen staff to manage and fulfill orders in batch preparation mode.

### 1.2 Business Objectives
- Streamline lunch ordering process for HRC staff
- Reduce manual order handling for kitchen staff
- Enable batch preparation for operational efficiency
- Provide secure payment processing
- Maintain rotating weekly menu system
- Allow non-technical kitchen leads to manage menus independently

### 1.3 Target Users
- **Staff Members**: HRC employees placing lunch orders
- **Kitchen Staff**: Food preparation team managing daily orders
- **Administrators**: System managers and kitchen leads

---

## 2. Product Scope

### 2.1 In Scope
- Self-service staff registration and authentication
- Daily rotating menu system (Monday-Friday)
- Time-windowed same-day ordering
- Secure credit card payment processing
- Batch order fulfillment for kitchen staff
- Non-technical menu management interface
- Order customization and special requests
- Order history and receipts
- Administrative configuration and reporting

### 2.2 Out of Scope
- Mobile native applications (Phase 1)
- Advance ordering (multi-day)
- Budget limits or spending caps
- Dietary restriction enforcement
- Inventory management
- Nutritional information tracking
- Multi-location support (Phase 1)
- Third-party integrations (HR systems, etc.)

---

## 3. User Roles & Permissions

### 3.1 Staff Member
**Registration**: Self-service registration with email verification

**Capabilities**:
- Register and create account
- Login/logout
- View today's menu (during ordering window)
- Add items to cart with customizations
- Place orders and make payments
- View order status
- Access order history and receipts
- Update profile information

**Restrictions**:
- Can only order during active ordering window
- Can only order for same day
- Cannot access kitchen or admin functions

### 3.2 Kitchen Staff
**Registration**: Promoted from Staff role by Administrator

**Capabilities**:
- All Staff capabilities
- View all daily orders
- Filter and group orders by menu item
- View order details (customer, quantity, customizations)
- Mark items/orders as prepared
- Mark batches as fulfilled
- Print kitchen tickets
- View daily order summaries

**Restrictions**:
- Cannot modify menus
- Cannot change system configuration
- Cannot manage users

### 3.3 Administrator
**Registration**: Promoted from Staff role by existing Administrator

**Capabilities**:
- All Kitchen Staff capabilities
- Manage weekly rotating menu
- Add/edit/remove menu items
- Configure ordering time windows
- Promote/demote user roles
- View/deactivate user accounts
- Access payment reconciliation reports
- View system analytics and statistics
- Configure system settings

---

## 4. Functional Requirements

### 4.1 User Registration & Authentication

#### 4.1.1 Staff Registration
**Priority**: P0 (Must Have)

**Requirements**:
- FR-1.1: System shall provide self-service registration form
- FR-1.2: Registration requires: email, password, full name
- FR-1.3: Optional fields: department, location, phone number
- FR-1.4: Email must be unique in the system
- FR-1.5: Password must meet security requirements:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character
- FR-1.6: System sends verification email upon registration
- FR-1.7: Account activated after email verification
- FR-1.8: Default role assigned: Staff

#### 4.1.2 Authentication
**Priority**: P0 (Must Have)

**Requirements**:
- FR-2.1: Login with email and password
- FR-2.2: "Remember me" option for extended sessions
- FR-2.3: Password reset via email link
- FR-2.4: Session timeout after 24 hours of inactivity
- FR-2.5: Secure session management using JWT tokens
- FR-2.6: Logout functionality

### 4.2 Menu Management

#### 4.2.1 Weekly Rotating Menu
**Priority**: P0 (Must Have)

**Requirements**:
- FR-3.1: System supports 5-day menu (Monday-Friday)
- FR-3.2: Menu items can be assigned to one or multiple weekdays
- FR-3.3: Menu automatically rotates weekly (Week 1 = Week 2)
- FR-3.4: Menu items include:
  - Name
  - Description
  - Price (AUD)
  - Category (Main, Side, Drink, Dessert, Other)
  - Image (optional)
  - Dietary tags (Vegetarian, Vegan, Gluten-Free, Dairy-Free, etc.)
  - Available customizations

#### 4.2.2 Menu Item Customizations
**Priority**: P0 (Must Have)

**Requirements**:
- FR-4.1: Menu items can have customization options
- FR-4.2: Examples: "Extra salt", "No pepper", "Spicy", "Mild", "Extra sauce"
- FR-4.3: Customizations are free-text or predefined options
- FR-4.4: Multiple customizations allowed per item
- FR-4.5: Customizations displayed to kitchen staff with orders

#### 4.2.3 Product Variations System
**Priority**: P0 (Must Have)
**Status**: ✅ Implemented

**Overview**:
Product variations enable menu items to have structured options with price modifiers, such as different sizes, protein choices, or add-ons. This differs from customizations (which are free-form modifications) by providing predefined, priced options that affect the total cost.

**Requirements**:
- FR-4.10: Menu items can have variation groups (e.g., "Size", "Protein Choice", "Add-ons")
- FR-4.11: Each variation group has a type:
  - Single-select (radio buttons): Customer chooses exactly one option
  - Multi-select (checkboxes): Customer can choose multiple options
- FR-4.12: Each variation group can be marked as required or optional
- FR-4.13: Variation options include:
  - Name (e.g., "Large", "Grilled Chicken", "Extra Cheese")
  - Price modifier (positive, negative, or zero)
  - Default selection flag (one per group)
- FR-4.14: Price modifiers automatically update cart total
- FR-4.15: Selected variations displayed in cart, checkout, order confirmation, and kitchen dashboard
- FR-4.16: Admin interface supports inline creation/editing of variation groups and options
- FR-4.17: Validation enforces one default option per group
- FR-4.18: Variations stored with order for historical accuracy

**User Experience**:
- Staff see variation selector when adding items to cart
- Dynamic price calculation shows impact of selections
- Selected variations displayed as chips with pricing
- Kitchen staff see all variation selections on orders
- Admin can create/edit variations without modal dialogs (inline editing)

**Database Schema**:
- `variation_groups`: Stores group definitions (name, type, required, display_order)
- `variation_options`: Stores individual options (name, price_modifier, is_default, display_order)
- `order_items.selected_variations`: JSON storage of customer selections

#### 4.2.4 Admin Menu Editor
**Priority**: P0 (Must Have)

**Requirements**:
- FR-5.1: Non-technical user-friendly interface
- FR-5.2: Administrator can add new menu items
- FR-5.3: Administrator can edit existing menu items
- FR-5.4: Administrator can delete menu items
- FR-5.5: Administrator can assign items to one or multiple weekdays (checkbox selection)
- FR-5.6: Administrator can set item availability (active/inactive)
- FR-5.7: Administrator can define customization options per item
- FR-5.8: Changes take effect immediately
- FR-5.9: Preview mode to view weekly menu

### 4.3 Ordering System

#### 4.3.1 Ordering Time Window
**Priority**: P0 (Must Have)

**Requirements**:
- FR-6.1: Administrator configures daily ordering window (start/end time)
- FR-6.2: Staff can only place orders during active window
- FR-6.3: Ordering window applies to current day only
- FR-6.4: System displays countdown timer during active window
- FR-6.5: Clear messaging when window is closed
- FR-6.6: Window configuration: separate start/end times
- FR-6.7: Window applies Monday-Friday (weekends disabled)

#### 4.3.2 Order Placement
**Priority**: P0 (Must Have)

**Requirements**:
- FR-7.1: Staff views today's menu during ordering window
- FR-7.2: Staff can add items to cart
- FR-7.3: Staff can specify quantity per item
- FR-7.4: Staff can select customizations per item
- FR-7.5: Staff can add special requests (free text)
- FR-7.6: Cart displays item summary with total price
- FR-7.7: Staff can modify cart before checkout
- FR-7.8: Staff can remove items from cart
- FR-7.9: Staff can clear entire cart
- FR-7.10: System validates order before checkout
- FR-7.11: One order per staff member per day
- FR-7.12: Staff can cancel/modify order before window closes

#### 4.3.3 Order Confirmation
**Priority**: P0 (Must Have)

**Requirements**:
- FR-8.1: System generates unique order number
- FR-8.2: Order confirmation page displays:
  - Order number
  - Items ordered with customizations
  - Total amount paid
  - Order timestamp
  - Estimated ready time
- FR-8.3: Confirmation email sent to staff
- FR-8.4: Order immediately visible to kitchen staff

### 4.4 Payment Processing

#### 4.4.1 Payment Gateway Integration
**Priority**: P0 (Must Have)

**Requirements**:
- FR-9.1: Integration with Stripe payment gateway
- FR-9.2: Secure credit card processing (PCI compliant)
- FR-9.3: Supported payment methods: Visa, Mastercard, Amex
- FR-9.4: Payment required before order submission
- FR-9.5: No stored payment methods (one-time payment)
- FR-9.6: Payment failure prevents order submission
- FR-9.7: Payment success triggers order creation

#### 4.4.2 Receipts & Records
**Priority**: P0 (Must Have)
**Status**: ✅ Implemented (Stripe-hosted receipts)

**Requirements**:
- FR-10.1: Digital receipt generated upon payment ✅
- FR-10.2: Receipt includes (via Stripe):
  - Order number (transaction ID)
  - Date and time
  - Itemized payment amount
  - Payment method (last 4 digits)
  - Stripe transaction ID
- FR-10.3: Receipt sent via email automatically by Stripe ✅
- FR-10.4: Receipt accessible via Stripe-hosted URL (30-day availability)
- FR-10.5: ~~Receipt downloadable as PDF~~ (Deferred to future enhancement)

**Implementation Notes**:
- Using Stripe's built-in `receipt_email` functionality
- Receipts automatically sent on successful payment
- Professional Stripe-branded receipt design
- Future enhancement: Custom HRC Kitchen-branded PDF receipts with full order details

### 4.5 Kitchen Dashboard

#### 4.5.1 Daily Order View
**Priority**: P0 (Must Have)

**Requirements**:
- FR-11.1: Kitchen staff views all orders for current day
- FR-11.2: Orders displayed with:
  - Order number
  - Staff name
  - Items with quantities
  - Customizations and special requests
  - Order timestamp
  - Fulfillment status
- FR-11.3: Default view groups orders by menu item
- FR-11.4: Alternative view: chronological order list
- FR-11.5: Filter options:
  - By menu item
  - By fulfillment status
  - By time range
  - By staff member

#### 4.5.2 Batch Fulfillment
**Priority**: P0 (Must Have)

**Requirements**:
- FR-12.1: Kitchen staff can view total quantity per menu item
- FR-12.2: Orders grouped by menu item for batch preparation
- FR-12.3: Kitchen staff marks items as "Prepared" in bulk
- FR-12.4: Kitchen staff marks individual orders as fulfilled
- FR-12.5: Kitchen staff marks all daily orders as complete
- FR-12.6: Fulfillment status updates visible to staff
- FR-12.7: Cannot un-fulfill completed orders

#### 4.5.3 Kitchen Ticket Printing
**Priority**: P1 (Should Have)
**Status**: ✅ Implemented (Bulk summary only)

**Requirements**:
- FR-13.1: Print-friendly view of daily orders ✅
- FR-13.2: Print view groups by menu item ✅
- FR-13.3: Includes all customizations and special requests ✅
- FR-13.4: ~~Print individual order tickets~~ (Out of scope - bulk summary sufficient)
- FR-13.5: Print bulk summary for batch preparation ✅

**Implementation Notes**:
- Single "Print All" button on kitchen dashboard
- Prints batch preparation summary grouped by menu item
- Shows total quantities, customizations, and special requests
- Optimized for kitchen workflow (batch cooking)

### 4.6 Order Status & History

#### 4.6.1 Order Status Tracking
**Priority**: P0 (Must Have)

**Requirements**:
- FR-14.1: Order status workflow:
  - Placed (payment confirmed)
  - Preparing (kitchen acknowledged)
  - Ready (prepared, available for pickup)
- FR-14.2: Staff can view current order status
- FR-14.3: Status updates display timestamp
- FR-14.4: No notifications for status changes (Phase 1)

#### 4.6.2 Order History
**Priority**: P1 (Should Have)

**Requirements**:
- FR-15.1: Staff can view past orders
- FR-15.2: Order history displays:
  - Order date
  - Items ordered
  - Total amount
  - Receipt download link
- FR-15.3: History sortable by date
- FR-15.4: History filterable by date range
- FR-15.5: Minimum 90 days of history retained

### 4.7 Administrative Functions

#### 4.7.1 User Management
**Priority**: P0 (Must Have)

**Requirements**:
- FR-16.1: Administrator views all registered users
- FR-16.2: User list displays: name, email, role, registration date, status
- FR-16.3: Administrator can promote Staff to Kitchen Staff
- FR-16.4: Administrator can promote Staff/Kitchen to Administrator
- FR-16.5: Administrator can demote users (except themselves)
- FR-16.6: Administrator can deactivate accounts
- FR-16.7: Deactivated accounts cannot login
- FR-16.8: Administrator cannot view user passwords
- FR-16.9: Search and filter users by name, email, role

#### 4.7.2 System Configuration
**Priority**: P0 (Must Have)

**Requirements**:
- FR-17.1: Configure ordering window start time (HH:MM format)
- FR-17.2: Configure ordering window end time (HH:MM format)
- FR-17.3: Configuration changes apply next day (not retroactive)
- FR-17.4: Default window: 8:00 AM - 10:30 AM
- FR-17.5: Validation: end time must be after start time
- FR-17.6: Maximum window duration: 8 hours

#### 4.7.3 Reporting & Analytics
**Priority**: P1 (Should Have)

**Requirements**:
- FR-18.1: Daily order summary report:
  - Total orders
  - Total revenue
  - Orders by menu item
  - Peak ordering times
- FR-18.2: Weekly revenue report
- FR-18.3: Popular menu items report
- FR-18.4: Payment reconciliation report
- FR-18.5: Export reports as CSV/PDF
- FR-18.6: Date range filtering

---

## 5. Non-Functional Requirements

### 5.1 Performance
- NFR-1.1: Page load time < 2 seconds on standard broadband
- NFR-1.2: Payment processing response < 5 seconds
- NFR-1.3: Support 100 concurrent users
- NFR-1.4: Database query response time < 500ms

### 5.2 Security
- NFR-2.1: All passwords hashed using bcrypt (minimum cost factor 10)
- NFR-2.2: HTTPS encryption for all communications
- NFR-2.3: PCI DSS compliance for payment processing
- NFR-2.4: SQL injection prevention
- NFR-2.5: XSS attack prevention
- NFR-2.6: CSRF token protection
- NFR-2.7: Rate limiting on API endpoints
- NFR-2.8: No sensitive data in client-side storage
- NFR-2.9: Session tokens expire after 24 hours

### 5.3 Availability
- NFR-3.1: 99% uptime during business hours (7 AM - 3 PM, Mon-Fri)
- NFR-3.2: Planned maintenance outside business hours
- NFR-3.3: Automated database backups daily
- NFR-3.4: Backup retention: 30 days

### 5.4 Usability
- NFR-4.1: Responsive design (desktop, tablet, mobile browsers)
- NFR-4.2: Accessible to non-technical users
- NFR-4.3: WCAG 2.1 Level AA compliance
- NFR-4.4: Intuitive navigation (max 3 clicks to any function)
- NFR-4.5: Clear error messages with actionable guidance
- NFR-4.6: Consistent UI/UX across all pages

### 5.5 Compatibility
- NFR-5.1: Modern browser support:
  - Chrome (last 2 versions)
  - Firefox (last 2 versions)
  - Safari (last 2 versions)
  - Edge (last 2 versions)
- NFR-5.2: Minimum screen resolution: 1024x768
- NFR-5.3: Mobile browser support (responsive)

### 5.6 Scalability
- NFR-6.1: Database design supports 500+ staff members
- NFR-6.2: Horizontal scaling capability for future growth
- NFR-6.3: Menu supports up to 50 items per weekday

### 5.7 Maintainability
- NFR-7.1: Modular code architecture
- NFR-7.2: Comprehensive code documentation
- NFR-7.3: Automated testing coverage > 70%
- NFR-7.4: Version control with Git
- NFR-7.5: Deployment via CI/CD pipeline

---

## 6. Technical Architecture

### 6.1 Technology Stack

#### Frontend
- **Framework**: React.js 18+ with TypeScript
- **State Management**: React Context API / Redux Toolkit
- **UI Library**: Material-UI or Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form
- **Payment UI**: Stripe Elements

#### Backend
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js
- **Language**: TypeScript
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Validation**: Joi or Zod
- **Email**: Nodemailer with SMTP

#### Database
- **Primary Database**: PostgreSQL 14+
- **ORM**: Prisma or TypeORM
- **Migrations**: Managed by ORM

#### Third-Party Services
- **Payment Gateway**: Stripe
- **Email Service**: SendGrid or AWS SES
- **File Storage**: AWS S3 or Cloudinary (for menu images)

#### DevOps & Hosting
- **Hosting**: AWS, Azure, or Vercel
- **Container**: Docker
- **CI/CD**: GitHub Actions or GitLab CI
- **Monitoring**: Sentry or LogRocket
- **Environment**: Development, Staging, Production

### 6.2 Database Schema (Core Entities)

#### Users
```
id, email, password_hash, full_name, department, location, phone, role (staff/kitchen/admin),
email_verified, is_active, created_at, updated_at
```

#### MenuItems
```
id, name, description, price, category, image_url, weekdays (array), dietary_tags,
is_active, created_at, updated_at
```
Note: `weekdays` is an array field allowing items to be assigned to multiple days (e.g., ["MONDAY", "WEDNESDAY", "FRIDAY"])

#### MenuItemCustomizations
```
id, menu_item_id, customization_name, created_at
```

#### VariationGroups
```
id, menu_item_id, name, type (SINGLE_SELECT/MULTI_SELECT), required, display_order,
created_at, updated_at
```

#### VariationOptions
```
id, variation_group_id, name, price_modifier, is_default, display_order,
created_at, updated_at
```

#### Orders
```
id, user_id, order_number, total_amount, payment_status, payment_id, fulfillment_status,
special_requests, order_date, created_at, updated_at
```

#### OrderItems
```
id, order_id, menu_item_id, quantity, customizations (JSON), selected_variations (JSON),
price_at_purchase, fulfillment_status, created_at
```

#### SystemConfig
```
id, config_key, config_value, updated_at, updated_by
```
(Example: `ordering_window_start`, `ordering_window_end`)

### 6.3 API Architecture
- RESTful API design
- JSON request/response format
- JWT-based authentication
- Role-based access control middleware
- API versioning: `/api/v1/`

### 6.4 Key API Endpoints

**Authentication**
- POST `/api/v1/auth/register` - Staff registration
- POST `/api/v1/auth/login` - User login
- POST `/api/v1/auth/verify-email` - Email verification
- POST `/api/v1/auth/forgot-password` - Password reset request
- POST `/api/v1/auth/reset-password` - Password reset confirmation

**Menu**
- GET `/api/v1/menu/today` - Get today's menu
- GET `/api/v1/menu/week` - Get full weekly menu (admin)
- POST `/api/v1/menu/items` - Create menu item (admin)
- PUT `/api/v1/menu/items/:id` - Update menu item (admin)
- DELETE `/api/v1/menu/items/:id` - Delete menu item (admin)

**Orders**
- POST `/api/v1/orders` - Create order
- GET `/api/v1/orders/my-orders` - Get user's orders
- GET `/api/v1/orders/today` - Get today's orders (kitchen)
- PATCH `/api/v1/orders/:id/status` - Update order status (kitchen)

**Payment**
- POST `/api/v1/payment/create-intent` - Create Stripe payment intent
- POST `/api/v1/payment/confirm` - Confirm payment

**Admin**
- GET `/api/v1/admin/users` - List all users
- PATCH `/api/v1/admin/users/:id/role` - Update user role
- GET `/api/v1/admin/config` - Get system config
- PUT `/api/v1/admin/config` - Update system config
- GET `/api/v1/admin/reports/daily` - Daily report
- GET `/api/v1/admin/reports/weekly` - Weekly report

---

## 7. User Workflows

### 7.1 Staff Registration & First Order
1. Navigate to registration page
2. Fill registration form (email, password, name)
3. Submit registration
4. Check email for verification link
5. Click verification link
6. Login with credentials
7. View today's menu (if within ordering window)
8. Add items to cart with customizations
9. Review cart
10. Proceed to checkout
11. Enter credit card details (Stripe)
12. Confirm payment
13. Receive order confirmation
14. Receive confirmation email

### 7.2 Kitchen Staff Daily Workflow
1. Login to kitchen dashboard
2. View today's orders grouped by menu item
3. See total quantities needed per dish
4. Prepare dishes in batches
5. Mark each dish type as "Prepared"
6. Mark individual orders as "Ready"
7. End of day: mark all as complete

### 7.3 Administrator Menu Management
1. Login to admin panel
2. Navigate to Menu Management
3. Select view mode (By Day, By Category, or All Items)
4. Click "Add New Item"
5. Fill item details (name, description, price, category)
6. Select one or more weekdays via checkboxes (at least one required)
7. Upload image (optional)
8. Add dietary tags
9. Define customization options
10. Save item (item will appear on all selected weekdays)
11. Preview weekly menu
12. Publish changes

### 7.4 Administrator Ordering Window Configuration
1. Login to admin panel
2. Navigate to System Configuration
3. Select "Ordering Window Settings"
4. Set start time (e.g., 08:00)
5. Set end time (e.g., 10:30)
6. Save configuration
7. Changes apply next business day

---

## 8. Success Metrics

### 8.1 User Adoption
- 80% of staff registered within first month
- 60% active daily users during ordering window
- < 5% support requests per week

### 8.2 Operational Efficiency
- Reduce order processing time by 50%
- Kitchen staff fulfills orders 30% faster
- Zero manual order entry errors

### 8.3 System Performance
- 99% uptime during business hours
- < 1% payment failure rate
- Average page load time < 2 seconds

### 8.4 User Satisfaction
- Menu management completed by non-technical staff without support
- < 2% order cancellation rate
- Positive user feedback score > 4/5

---

## 9. Risk Assessment

### 9.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Payment gateway downtime | High | Low | Fallback payment method, clear error messaging |
| Database performance issues | High | Medium | Proper indexing, query optimization, caching |
| Security breach | Critical | Low | Regular security audits, penetration testing |
| Browser compatibility issues | Medium | Medium | Cross-browser testing, polyfills |

### 9.2 Operational Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Kitchen staff unable to use system | High | Medium | Simple UI, training documentation, support |
| Menu not updated on time | Medium | Low | Email reminders, easy update process |
| Staff forget ordering window | Medium | High | Email notifications, dashboard countdown |
| Payment disputes | Medium | Low | Clear receipts, transaction records |

### 9.3 Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low user adoption | High | Medium | User training, onboarding emails, incentives |
| Kitchen overwhelmed by orders | Medium | Low | Order capacity limits, window adjustments |
| Incorrect menu pricing | Low | Medium | Admin review process, edit capabilities |

---

## 10. Project Phases

### Phase 1: MVP (Minimum Viable Product)
**Timeline**: 8-10 weeks

**Features**:
- User registration and authentication
- Basic menu display (today's menu)
- Order placement with cart
- Stripe payment integration
- Kitchen dashboard (basic view)
- Order status tracking
- Admin menu management
- Ordering window enforcement

**Deliverables**:
- Functional web application
- Database setup
- Basic admin panel
- Payment integration
- User documentation

### Phase 2: Enhancement
**Timeline**: 4-6 weeks post-MVP

**Features**:
- Order history with receipts
- Advanced kitchen filtering/grouping
- Print kitchen tickets
- Reporting and analytics
- Email notifications
- Enhanced admin dashboard
- Mobile responsive improvements

### Phase 3: Optimization
**Timeline**: Ongoing

**Features**:
- Performance optimization
- Advanced reporting
- A/B testing for UI improvements
- User feedback implementation
- Integration with other systems (future)

---

## 11. Deployment Strategy

### 11.1 Environment Setup
- **Development**: Local development environment
- **Staging**: Cloud-hosted staging server for UAT
- **Production**: Cloud-hosted production server

### 11.2 Deployment Process
1. Code review and approval
2. Automated testing (unit, integration)
3. Deploy to staging
4. User acceptance testing (UAT)
5. Deploy to production during off-hours
6. Monitor for issues
7. Rollback plan if critical issues detected

### 11.3 Data Migration
- Initial deployment: Empty database with seed data
- Future updates: Database migrations managed by ORM
- Backup before each production deployment

---

## 12. Support & Maintenance

### 12.1 User Support
- Email support: support@hrc-kitchen.com
- Response time: 24 hours for non-critical issues
- Response time: 2 hours for critical issues during business hours
- FAQ documentation
- Video tutorials for common tasks

### 12.2 System Maintenance
- Weekly database backups (automated)
- Monthly security updates
- Quarterly dependency updates
- Annual security audit

### 12.3 Training
- Kitchen lead training: 2-hour session on menu management
- Kitchen staff training: 1-hour session on dashboard usage
- Staff training: Self-service onboarding guide

---

## 13. Compliance & Legal

### 13.1 Data Privacy
- Compliant with Australian Privacy Principles (APPs)
- GDPR considerations for EU data subjects (if applicable)
- Privacy policy published and accessible
- User consent for data collection
- Right to data deletion upon request

### 13.2 Payment Security
- PCI DSS Level 1 compliance via Stripe
- No storage of credit card details
- Encrypted payment communications
- Regular security assessments

### 13.3 Terms of Service
- User agreement acceptance during registration
- Terms cover: account usage, payment terms, liability, cancellation policy
- Terms accessible from all pages

---

## 14. Application Separation Architecture (Phase 6)

**Status:** ✅ Planned (See [APP_SEPARATION_PLAN.md](./APP_SEPARATION_PLAN.md))

### 14.1 Dual Application Architecture

The system will be restructured into two separate frontend applications:

#### Public Ordering Application
**Purpose:** Customer-facing lunch ordering system

**Target Users:** General staff, guests, public users

**Features:**
- Menu browsing (no login required)
- Shopping cart and checkout
- Guest checkout support
- User registration (any email domain)
- Order history (authenticated users)
- Payment processing (Stripe)

**Access Control:**
- No email domain restrictions
- Self-registration allowed
- Guest checkout supported

#### Internal Management Application
**Purpose:** Operations and administration for authorized staff

**Target Users:** Kitchen staff, administrators, finance staff

**Features:**
- Kitchen dashboard (order fulfillment)
- Admin panel (menu/user/system management)
- Finance reports and analytics
- User role management

**Access Control:**
- **Email domain restrictions enforced**
- Only users with configured domain email can access
- Example: `@hrc-kitchen.com`, `@huonregionalcare.com.au`
- Guest access not allowed

### 14.2 Email Domain Restrictions

**Requirement:** FR-19.1 - Domain-Based Access Control

**Implementation:**
- Environment variable: `ALLOWED_ADMIN_DOMAIN` (comma-separated list)
- Backend middleware validates email domain for all management routes
- Role assignment validation prevents privilege escalation
- Frontend displays clear error messages for unauthorized domains

**Rules:**
- **STAFF role:** Any email domain allowed
- **KITCHEN role:** Must match allowed domain(s)
- **ADMIN role:** Must match allowed domain(s)
- **FINANCE role:** Must match allowed domain(s)

**Validation Points:**
1. Login to management app (frontend + backend)
2. API route access (backend middleware)
3. Role assignment (backend service)
4. User promotion (admin panel)

### 14.3 Shared Authentication

**Requirement:** FR-19.2 - Unified Authentication System

**Implementation:**
- Single JWT token system
- Same backend authentication service
- Shared user database
- Cross-app token validity

**User Experience:**
- User with `staff@gmail.com` can:
  - ✅ Access public ordering app
  - ❌ Cannot access management app
  - ❌ Cannot be promoted to Kitchen/Admin/Finance roles

- User with `staff@hrc-kitchen.com` can:
  - ✅ Access public ordering app
  - ✅ Access management app (if assigned Kitchen/Admin/Finance role)
  - ✅ Can be promoted to privileged roles

### 14.4 Technical Architecture

**Frontend Structure:**
```
frontend-public/     # Public ordering app (port 5173)
frontend-admin/      # Internal management app (port 5174)
frontend-common/     # Shared component library
```

**Backend Changes:**
- Domain validation middleware
- Enhanced CORS configuration
- Login endpoint returns `hasAdminAccess` flag
- Role assignment validation

**Deployment:**
- Separate subdomains recommended:
  - `order.hrc-kitchen.com` → Public app
  - `manage.hrc-kitchen.com` → Admin app
  - `api.hrc-kitchen.com` → Backend API
- Independent deployment pipelines
- Separate CDN/caching strategies

### 14.5 Security Enhancements

**Benefits:**
1. **Reduced Attack Surface**
   - Public app contains no admin code
   - Management app not exposed to public
   - Clear separation of concerns

2. **Domain-Based Access Control**
   - Prevents unauthorized role escalation
   - Enforces organizational email policy
   - Backend + frontend validation

3. **Independent Security Policies**
   - Different rate limiting per app
   - Separate monitoring and logging
   - Isolated security incident impact

### 14.6 Migration Strategy

**Backward Compatibility:**
- All backend changes are backward compatible
- Existing frontend continues working during migration
- Zero-downtime migration possible

**Timeline:** 5 weeks (detailed in [APP_SEPARATION_PLAN.md](./APP_SEPARATION_PLAN.md))

**Phases:**
1. Backend domain validation (Week 1)
2. Shared component library (Week 1-2)
3. Public app creation (Week 2-3)
4. Admin app creation (Week 3-4)
5. Integration testing (Week 4)
6. Documentation + deployment (Week 5)

---

## 15. Future Enhancements (Out of Scope for Current Phases)

### 15.1 Advanced Features
- Mobile native apps (iOS/Android)
- Push notifications for order status
- Multi-day advance ordering
- Dietary restriction filtering
- Favorite orders / repeat last order
- Loyalty program / rewards
- Integration with HR system for automatic staff onboarding
- Multi-location support
- Catering orders for meetings/events

### 15.2 Advanced Analytics
- Predictive ordering patterns
- Inventory recommendations
- Waste reduction insights
- Revenue forecasting

### 15.3 Integration
- Slack/Teams notifications
- Calendar integration for meetings
- Accounting software integration (Xero, MYOB)

---

## 16. Glossary

| Term | Definition |
|------|------------|
| Ordering Window | The configured time period during which staff can place orders |
| Batch Fulfillment | Kitchen staff preparing multiple orders of the same item together |
| Rotating Menu | Menu that changes each weekday and repeats weekly |
| Customization | Modifications to menu items (e.g., extra salt, no pepper) |
| Kitchen Ticket | Printed or displayed order details for kitchen staff |
| Order Status | Current state of an order (Placed, Preparing, Ready) |
| Payment Intent | Stripe object representing intent to collect payment |
| Public Ordering App | Customer-facing application for placing lunch orders (no domain restrictions) |
| Internal Management App | Staff-only application for kitchen operations and admin (domain-restricted) |
| Domain Validation | Backend middleware that enforces email domain restrictions for privileged roles |
| Privileged Roles | User roles requiring domain validation (KITCHEN, ADMIN, FINANCE) |

---

## 17. Appendices

### Appendix A: Wireframes
*(To be created during design phase)*

### Appendix B: API Documentation
*(To be generated from API specification)*

### Appendix C: Database ERD
*(To be created during development)*

### Appendix D: Security Checklist
*(To be maintained throughout development)*

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-07 | HRC Project Team | Initial draft |
| 1.1 | 2025-11-11 | HRC Project Team | Added Section 14: Application Separation Architecture |

---

**Document Approval**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Owner | | | |
| Technical Lead | | | |
| Kitchen Lead | | | |

---

**End of Document**
