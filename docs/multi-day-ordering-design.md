# Multi-Day Ordering Design (UX-First)

## Purpose

This design translates `docs/multi-day-ordering-requirements.md` into an implementation plan focused on the simplest and smoothest user experience for multi-day ordering.

Primary UX goal:
- Let users order for multiple future dates with minimal friction, single payment, and clear date/cutoff behavior.

---

## 1. Design Principles

1. **Date-first clarity, item-level control**
   - Users should always know which date each item belongs to.
2. **Keep current checkout mental model**
   - One cart, one checkout, one payment.
3. **Progressive disclosure**
   - Default to today; advanced multi-day only when user needs it.
4. **Fail-safe at payment time**
   - Revalidate and auto-clean stale lines before payment confirmation.
5. **No surprises for kitchen**
   - Kitchen only sees today’s prep lines.
6. **Minimize repeated clicks**
   - Support cloning one configured line to multiple dates in one action.

---

## 2. UX Design (Frontend Public)

## 2.1 Recommended Interaction Model

Use **line-level prep date** with lightweight date controls:

- Default prep date selector at top of menu: `Today`.
- “Add to cart” uses current selected prep date.
- Cart groups items by `prepDate` (date sections/cards).
- Each line can change prep date via inline date chip/dropdown.
- User can mix non-continuous dates in one cart naturally.
- Add a quick action: **“Apply to more dates”** on each cart line.

Why this is simplest:
- No separate “day planner” wizard.
- Reuses existing menu + cart pattern.
- Reduces context switches and preserves fast ordering.

## 2.2 Date Picker Rules

Date choices:
- Show exactly `today .. today+6` (business timezone).
- Support **multi-select of non-continuous dates**.
- After cutoff, `today` is visible but disabled with label “Cutoff passed”.
- Future days remain enabled.

Display format:
- `Today`, `Tomorrow`, then weekday + date (e.g., `Fri 24 Jul`).

## 2.3 Multi-Date Clone Behavior (Agreed)

When user chooses **“Apply to more dates”** for a cart line:
- Open date multi-select picker for eligible dates.
- User can choose any non-continuous subset.
- For each selected date, create/update a line for same item with cloned configuration.

Default clone payload (copy all):
- menu item
- quantity
- selected variations
- special notes/customizations

Post-clone editability:
- Each date line remains independently editable after cloning.
- Changing one date line does not mutate the other cloned lines.

Deduping rule:
- If same item+variation already exists on selected date, merge quantity or prompt user depending on existing cart merge behavior (prefer consistent current cart merge logic).

## 2.4 Cart Presentation

Cart structure:
- Group header per date: `Prep Date: Fri 24 Jul`.
- Under each group: line items + qty controls + variation summary.
- Show per-day subtotal.
- Show grand total at bottom.

Microcopy:
- “You’re paying once now for all selected dates.”

## 2.5 Checkout Revalidation (Critical)

When checkout page opens and again before payment submit:
1. Revalidate every line’s `prepDate`.
2. Remove ineligible lines automatically.
3. Show non-blocking alert if some removed:
   - “We removed 2 items for Today because cutoff has passed.”
4. If cart becomes empty:
   - Block payment and show CTA: “Back to menu”.

## 2.6 Error UX

If backend rejects due to race condition cutoff crossing:
- Show server message mapped to friendly text.
- Auto-refresh cart eligibility and retry path.

---

## 3. Data Model Design

## 3.1 Prisma Schema Changes

`OrderItem` additions:
- `prepDate` (`@db.Date`) — operational prep date.
- `prepDateSnapshot` (`@db.Date`) — immutable snapshot copy at purchase.

Notes:
- Keep existing `Order.orderDate` unchanged for header transaction date.
- Add index on `OrderItem.prepDate` for kitchen/report performance.
- Consider composite index: `(prepDate, fulfillmentStatus)` for kitchen views.

## 3.2 DTO / Type Changes

Create/checkout payload line item includes:
- `menuItemId`
- `quantity`
- `selectedVariations`
- `customizations`
- `prepDate` (YYYY-MM-DD)

Validation:
- Required for every line.
- Must be eligible by window + cutoff logic.

---

## 4. Backend Service Design

## 4.1 Cutoff/Eligibility Service

Introduce reusable eligibility evaluator (new utility/service):
- Input: `prepDate`, current business datetime, cutoff config.
- Output: eligible/ineligible + reason code.

Rules:
- `prepDate` in [today..today+6].
- If `prepDate == today`, require current time <= cutoff.
- If `prepDate > today`, ignore cutoff for that future day at placement time.

This replaces current “global window active” assumption.

## 4.2 Order Creation Flow (`OrderService`)

Replace current window check:
- Remove hard gate relying on `isOrderingWindowActive()` for entire order.
- Validate each line by eligibility service.

On create:
- Persist `Order.orderDate = today` (transaction date).
- Persist each line with `prepDate` + `prepDateSnapshot`.
- Keep existing snapshot fields (name, category, base price, variations, etc.).

Failure handling:
- If some lines invalid at server validation, return structured error containing invalid line ids/reasons so UI can auto-clean precisely.

## 4.3 Menu Endpoint Strategy

Current `/menu/today` is insufficient for multi-day UX.

Recommended:
1. Add new endpoint: `/menu/ordering-context`
   - Returns business today, cutoff, selectable dates with enabled/disabled + reason.
2. Keep `/menu/today` for backward compatibility, but migrate checkout/menu to new context endpoint.

Optional later:
- `/menu/by-date?date=YYYY-MM-DD` if menu availability will differ by date semantics beyond weekday logic.

---

## 5. Kitchen Dashboard Design

## 5.1 Query Semantics

Change kitchen workload queries from header `orderDate` to line `prepDate`:
- Only include lines where `prepDate == businessToday`.
- Join parent order for customer/payment metadata.

Affected backend methods:
- `KitchenService.getOrders`
- `KitchenService.getOrderSummary`
- `KitchenService.getDailyStats`

## 5.2 Status Updates

When kitchen updates item status:
- Continue item-level status updates.
- Header fulfillment status should still derive from aggregated line statuses.
- Mixed prep-date orders remain consistent because kitchen only acts on today’s lines.

---

## 6. Reporting Design (Suggested)

Current reports use `Order.orderDate`. Multi-day prep requires explicit date dimension.

## 6.1 Date Dimension Model

Add report filter dimension:
- `dateDimension = PREP_DATE | ORDER_DATE`

Defaults:
- Finance-facing revenue summary default `ORDER_DATE` (transaction date).
- Kitchen/operations reports default `PREP_DATE`.

## 6.2 Report-Specific Behavior

1. Popular Items:
- Default `PREP_DATE` (operational demand view).

2. Detailed Orders:
- Include both `orderDate` and line `prepDate` columns.
- Group/expand lines by prep date for multi-day orders.

3. Summary:
- If `PREP_DATE`, aggregate line-level revenue/qty.
- If `ORDER_DATE`, aggregate header totals.

4. Revenue by User:
- Keep default `ORDER_DATE` unless business asks for “consumption-date revenue”.

## 6.3 CSV

For prep-based exports include:
- `Prep Date`
- `Order Date`
- `Order Number`
- line-level item fields

---

## 7. Inventory + Availability Strategy

Current behavior deducts inventory at order placement.

For this phase (least-risk, minimal change):
- Keep immediate deduction behavior.
- Apply same for future-date lines.

Caveat:
- May reserve stock too early for future dates.

Future enhancement (not in current scope):
- move to allocation model by prep date.

---

## 8. API Contract Changes (Proposed)

## 8.1 Create Order Request

`items[]` adds required `prepDate`.

## 8.2 Create Order Response Errors

Add machine-readable validation block:
- `code: PREP_DATE_INELIGIBLE`
- `invalidLines: [{clientLineId?, menuItemId, prepDate, reason}]`

## 8.3 Ordering Context Endpoint

Return:
- business timezone
- current business date/time
- cutoff time
- selectable dates with states

---

## 9. Migration Plan

1. DB migration
- Add `order_items.prep_date` and `order_items.prep_date_snapshot`.
- Backfill existing rows from parent `orders.order_date`.
- Add indexes.

2. Backend compatibility
- During rollout, if incoming line has no `prepDate`, default to today (temporary compatibility guard).
- Remove guard after frontend deploy completes.

3. Frontend deploy
- Add date selector + grouped cart + checkout revalidation UX.

4. Kitchen/report deploy
- Switch queries to prep-date semantics.

---

## 10. Rollout and Risk Control

Feature flag:
- `MULTI_DAY_ORDERING_ENABLED` for frontend and backend behavior.

Safe rollout order:
1. DB migration + backward compatible backend.
2. Frontend UX release.
3. Kitchen/report prep-date query switch.
4. Remove temporary compatibility paths.

Monitoring:
- Count removed stale lines at checkout.
- Track server `PREP_DATE_INELIGIBLE` errors.
- Observe kitchen “today volume” before/after change.

---

## 11. Testing Strategy

## 11.1 Unit Tests

- Date eligibility evaluator:
  - before cutoff today allowed
  - after cutoff today blocked
  - tomorrow..today+6 allowed
  - >today+6 blocked

- Order creation validation per line prep date.

## 11.2 Integration Tests

- Multi-date single checkout creates one header + correct line prep dates.
- Stale cart lines removed and totals recalculated.
- Kitchen endpoints return only today prep lines.
- Reports produce correct results for selected date dimension.

## 11.3 UX Acceptance Tests

- User can place non-continuous dates in one payment.
- User can clone one configured line to multiple non-continuous dates.
- Cloned lines include quantity, variations, and special notes/customizations.
- Today disabled after cutoff in date picker.
- Friendly alert shown when stale lines removed.

---

## 12. Open Decisions Needed Before Build

1. Reports UI: should we expose `Date Dimension` toggle now or default silently per report?
2. Summary semantics in prep mode: order count = distinct orders or distinct prep-date line groups?
3. Refund scope: keep order-level only in this phase (recommended) or add line-level partial refunds now?

---

## 13. Recommended Scope for Phase 1 (Simple + Smooth)

Implement now:
- line `prepDate` + snapshot
- frontend date selector + grouped cart
- **apply-to-more-dates clone flow** (non-continuous multi-select)
- clone copies quantity + variations + special notes/customizations by default
- checkout stale-line auto-clean
- kitchen prep-date filtering
- minimal report changes with clear prep date columns

Defer:
- advanced report date-dimension toggle
- inventory reservation redesign
- line-level refunds

This phased approach keeps UX smooth, minimizes risk, and avoids rebuilding the current working product.
