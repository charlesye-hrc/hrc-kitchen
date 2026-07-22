# Multi-Day Ordering Requirements (Prep Date at Order Line)

## Context

This document captures the agreed requirement for enabling meal ordering across multiple future dates without introducing child orders.

Current implementation (as reviewed in this branch) uses:
- `Order.orderDate` as the main business date for kitchen/reporting filters.
- One order header with many order line items (`OrderItem`).
- Existing snapshot pattern on order header and order line item.
- Existing ordering window logic in `ConfigService.isOrderingWindowActive()` using start/end time.

Key source files reviewed:
- `backend/prisma/schema.prisma`
- `backend/src/services/order.service.ts`
- `backend/src/services/config.service.ts`
- `backend/src/services/kitchen.service.ts`
- `backend/src/services/report.service.ts`
- `frontend-public/src/pages/CheckoutPage.tsx`

---

## Confirmed Business Requirements

1. Allow users to order meals for multiple days ahead, with window = **today + next 6 days**.
2. In ordering frontend:
   - Default selected date is **today**.
   - User can select **multiple, non-continuous** dates.
   - User pays **once upfront** for all selected dates/items.
3. Ordering time-window logic changes:
   - System accepts ordering actions 24/7.
   - Existing cutoff env/config remains authoritative.
   - After daily cutoff time, **today** becomes unavailable for new order lines.
   - Future dates within window remain orderable.
4. Kitchen dashboard should show only items with **line prep date == today**.
5. Do not introduce child orders; keep existing single order model.
6. Add date information to order line and include it in immutable snapshot data.
7. Existing placed orders remain actionable/preparable even if menu item is later discontinued.
8. No limit on number of selected days (subject only to rolling 7-day date eligibility).
9. Stale cart handling at checkout:
   - If user returns later with previously added cart lines and cutoff has passed for one or more selected prep dates, those lines become invalid.
   - Checkout must clearly notify user which date(s) are no longer orderable.
   - Checkout must automatically remove invalid lines from cart before payment.
   - If all lines become invalid, checkout must block submission and ask user to reselect eligible dates/items.

---

## Agreed Data Model Direction

### No New Order Hierarchy
- Keep one `Order` header + many `OrderItem` records.
- Multi-day ordering is represented by assigning a prep date on each order line.

### Prep Date at Line Level
- Introduce `OrderItem.prepDate` (date-only semantics).
- Add `prepDate` into the line snapshot payload for immutability/audit.

### Order Header Date
- `Order.orderDate` remains creation/business date for header-level metadata.
- Operational filtering for kitchen/reports should switch (where applicable) to line `prepDate` instead of header `orderDate`.

---

## Functional Requirements

## 1) Date Eligibility Rules

For any attempted order line:
- Eligible prep dates are `[today, today+1, ..., today+6]` in configured business timezone.
- After cutoff time for current business day, `today` is not eligible for new lines.
- Dates outside the rolling 7-day window are rejected.

## 2) Frontend Ordering UX

- Checkout/order flow supports selecting prep date per line item (or equivalent grouping UI by date).
- Default date selection = today.
- Users can include multiple dates in one checkout.
- Dates do not need to be continuous.
- After cutoff, today is visible but disabled with reason text (e.g., cutoff passed).

## 3) Stale Cart Revalidation

At checkout load and before payment confirmation:
- Revalidate every cart line’s prep date against current business time and cutoff rules.
- Auto-remove any ineligible lines (e.g., today lines after cutoff).
- Present user-facing message listing removed date(s)/line(s) and reason.
- Recalculate totals from remaining valid lines.
- Prevent payment if cart is empty after auto-removal.

## 4) Pricing and Payment

- Price calculation and payment capture continue at single checkout level.
- One payment intent, one charge, one order header.
- Total amount is sum of all lines across selected dates.

## 5) Snapshot and Data Immutability

At order placement time, each line must preserve existing snapshot fields plus prep date snapshot:
- Existing line snapshots currently include item name/description/category/image/base price and selected variations with computed purchase price.
- Add prep date snapshot so later menu/date changes do not mutate placed order interpretation.

## 6) Kitchen Dashboard Behavior

- Dashboard item list and batch summary use `OrderItem.prepDate == today` (business timezone).
- Header `Order.orderDate` must not drive kitchen “today workload” filtering.

## 7) Reporting Behavior

- Reports that currently filter on `Order.orderDate` should be reviewed and migrated to line `prepDate` where report intent is about meals prepared/consumed by date.
- Header-date based reporting can still exist when intent is transaction/checkout creation date, but must be explicit.

---

## Existing-Code Findings Relevant to Change

## A) Ordering Window/Cutoff
- Current gate is `ConfigService.isOrderingWindowActive()` using `ordering_window_start`/`ordering_window_end` and blocks entire checkout when outside window.
- This will conflict with new 24/7 ordering + per-date cutoff behavior and must be refactored.

## B) Order Creation
- `OrderService.createOrderInternal()` currently computes a single `orderDate = getBusinessDate()` and all lines implicitly belong to that date.
- Line DTO currently lacks prep date.

## C) Kitchen
- `KitchenService` filters by `Order.orderDate` in `getOrders`, `getOrderSummary`, and `getDailyStats`.
- Must move workload filtering to line `prepDate`.

## D) Reports
- `ReportService` currently uses `Order.orderDate` in all major report queries:
  - Revenue by user
  - Popular items
  - Summary
  - Detailed orders
  - CSV export date column
- Need a deliberate migration strategy by report intent (see suggestions below).

## E) Checkout Frontend
- `frontend-public/src/pages/CheckoutPage.tsx` currently checks a single ordering window from `/menu/today`.
- Multi-date + stale-cart behavior requires line-by-line date eligibility validation at checkout time.

---

## Report Change Suggestions (for design phase)

These are recommendations, pending your approval in the design document:

1. Introduce report date mode semantics:
   - **Prep Date mode** (default for kitchen/meal analytics): based on `OrderItem.prepDate`.
   - **Order Date mode** (finance/transaction analytics): based on `Order.orderDate`.

2. Popular Items report:
   - Should use `OrderItem.prepDate` by default.

3. Kitchen-oriented Summary metrics:
   - Should use `OrderItem.prepDate`.
   - If header-level order counts are needed, define whether to count distinct orders having at least one line in range.

4. Revenue by user:
   - Clarify metric meaning:
     - Transaction revenue by checkout date (`Order.orderDate`), or
     - Meal revenue allocated by prep date (`OrderItem.prepDate`).
   - If prep-date mode is used, multi-day orders require line-level prorated totals (line price × qty).

5. Detailed Orders report:
   - Add line prep date field and filtering.
   - For mixed-date orders, present grouped lines by prep date.

6. CSV exports:
   - Add explicit `Prep Date` column when report is line/prep based.
   - Keep `Order Date` separately when needed to avoid ambiguity.

---

## Non-Goals (for this requirement)

- No child order entities.
- No change to single-payment checkout model.
- No retroactive mutation of placed order lines due to menu/availability updates.

---

## Open Clarifications for Design Phase

To finalize technical design (next step), we still need your decision on:

1. For Revenue/Summary reports, should default date dimension become prep date, or should UI expose switchable date dimension?
2. Should line-level cancellations/refunds be introduced now, or keep current order-level handling only?
3. Should inventory deduction remain at order placement time for all future-day lines, or be deferred by prep date? (Current behavior deducts immediately.)

---

## Acceptance Criteria (Requirement-Level)

1. User can place one paid order containing items mapped to multiple prep dates in [today..today+6].
2. After cutoff, today is not selectable/orderable; future dates remain selectable.
3. Checkout revalidation removes stale ineligible lines and clearly informs user before payment.
4. Kitchen dashboard today view shows only lines where `prepDate == today`.
5. Existing placed future-day lines stay intact/actionable when menu items are later changed/discontinued.
6. Reports are updated per approved design so date filtering semantics are explicit and correct.
