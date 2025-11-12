# Product Variations System Implementation

## Overview
Implemented a flexible product variations system that allows administrators to configure multiple dimensions of variations (e.g., "Protein Choice", "Size", "Add-ons") with optional pricing for each option.

## Architecture Decision
**Chosen Approach**: **Variation Groups with Optional Pricing**

This approach was selected because it:
- Avoids combinatorial explosion (no need to create every possible variant combination)
- Supports flexible dimensions without hard-coding
- Allows mixing free and paid options
- Provides intuitive UX for both admins and customers
- Follows industry standards (Shopify, UberEats, DoorDash)

## Database Schema

### New Tables

#### `variation_groups`
Represents a dimension of variation (e.g., "Protein Choice", "Spice Level")
- `id` - UUID primary key
- `menu_item_id` - Foreign key to menu_items
- `name` - Group name (e.g., "Protein Choice")
- `type` - SINGLE_SELECT or MULTI_SELECT (enum)
- `required` - Boolean, whether selection is mandatory
- `display_order` - Integer for sorting
- `created_at`, `updated_at` - Timestamps

#### `variation_options`
Represents a specific choice within a group (e.g., "Grilled Chicken", "Mild")
- `id` - UUID primary key
- `variation_group_id` - Foreign key to variation_groups
- `name` - Option name (e.g., "Grilled Chicken")
- `price_modifier` - Decimal(10,2), price adjustment (+$3.00, -$0.50, or $0)
- `is_default` - Boolean, whether this is the default selection
- `display_order` - Integer for sorting
- `created_at`, `updated_at` - Timestamps

#### `order_items` (Modified)
- Added `selected_variations` - JSONB field storing structured variation data

### Enums
- `VariationGroupType`: SINGLE_SELECT, MULTI_SELECT

## Backend Implementation

### 1. TypeScript Types (`backend/src/types/variation.types.ts`)
- `VariationGroupDTO` - Full variation group data
- `VariationOptionDTO` - Full variation option data
- `CreateVariationGroupInput` - Input for creating groups
- `UpdateVariationGroupInput` - Input for updating groups
- `CreateVariationOptionInput` - Input for creating options
- `UpdateVariationOptionInput` - Input for updating options
- `SelectedVariation` - Structure stored in OrderItem JSON
- `VariationSelection` - Structure for order placement
- `OrderItemWithVariations` - Order item with calculated pricing

### 2. Admin Service (`backend/src/services/admin.service.ts`)
**Variation Group Operations:**
- `createVariationGroup()` - Create a variation group for a menu item
- `updateVariationGroup()` - Update group properties
- `deleteVariationGroup()` - Delete group (cascade deletes options)
- `getVariationGroups()` - Get all groups for a menu item

**Variation Option Operations:**
- `createVariationOption()` - Create an option within a group
- `updateVariationOption()` - Update option properties (name, price, etc.)
- `deleteVariationOption()` - Delete an option
- `getVariationOptions()` - Get all options for a group

### 3. Admin Controller (`backend/src/controllers/admin.controller.ts`)
**New Endpoints:**
- `POST /api/v1/admin/menu/items/:id/variation-groups` - Create variation group
- `GET /api/v1/admin/menu/items/:id/variation-groups` - Get all groups for item
- `PUT /api/v1/admin/variation-groups/:id` - Update group
- `DELETE /api/v1/admin/variation-groups/:id` - Delete group
- `POST /api/v1/admin/variation-groups/:id/options` - Create option
- `GET /api/v1/admin/variation-groups/:id/options` - Get all options
- `PUT /api/v1/admin/variation-options/:id` - Update option
- `DELETE /api/v1/admin/variation-options/:id` - Delete option

### 4. Menu Service (`backend/src/services/menu.service.ts`)
**Updated Methods:**
- `getTodaysMenu()` - Now includes variation groups and options
- `getWeeklyMenu()` - Now includes variation groups and options
- `getMenuItem()` - Now includes variation groups and options

All menu queries now include:
```typescript
variationGroups: {
  include: {
    options: {
      orderBy: { displayOrder: 'asc' }
    }
  },
  orderBy: { displayOrder: 'asc' }
}
```

### 5. Order Service (`backend/src/services/order.service.ts`)
**Updated `createOrder()` Method:**
- Fetches menu items with variation groups and options
- Calculates price modifiers based on selected variations
- Stores final calculated price in `priceAtPurchase`
- Stores selected variations in JSON format:
```json
{
  "variations": [
    {
      "groupId": "uuid",
      "groupName": "Protein Choice",
      "optionId": "uuid",
      "optionName": "Grilled Chicken",
      "priceModifier": 3.00
    }
  ],
  "totalModifier": 3.00
}
```

**Pricing Calculation:**
```typescript
itemPrice = basePrice + sum(selectedVariations.priceModifiers)
totalAmount = itemPrice * quantity
```

## Example Use Cases

### Example 1: Caesar Salad
**Variation Group 1**: "Protein Choice" (SINGLE_SELECT, required)
- No protein ($0)
- Grilled Chicken (+$3)
- Smoked Salmon (+$5)

**Variation Group 2**: "Dressing" (SINGLE_SELECT, required)
- Regular ($0, default)
- On the side ($0)
- Light dressing ($0)

**Variation Group 3**: "Add-ons" (MULTI_SELECT, optional)
- Extra croutons (+$1)
- Extra parmesan (+$1.50)
- No croutons ($0)

**Calculated Price:**
- Base: $12.00
- Selected: Grilled Chicken (+$3), On the side ($0), Extra Parmesan (+$1.50)
- Final: $16.50

### Example 2: Coffee
**Variation Group 1**: "Size" (SINGLE_SELECT, required)
- Small (-$0.50)
- Medium ($0, default)
- Large (+$1)

**Variation Group 2**: "Milk Type" (SINGLE_SELECT)
- Regular ($0)
- Soy (+$0.50)
- Almond (+$0.50)
- Oat (+$0.70)

**Variation Group 3**: "Extras" (MULTI_SELECT)
- Extra shot (+$1)
- Extra hot ($0)

**Calculated Price:**
- Base: $4.50
- Selected: Large (+$1), Oat Milk (+$0.70), Extra Shot (+$1)
- Final: $7.20

## Migration Applied
Migration `20251007200033_add_product_variations` successfully applied to database.

## Next Steps (Frontend Implementation)

### Admin UI Tasks:
1. Create variation group management interface in admin panel
2. Add variation groups section to menu item edit dialog
3. Implement drag-and-drop ordering for groups and options
4. Add price modifier input with validation
5. Support SINGLE_SELECT vs MULTI_SELECT toggle
6. Visual distinction between required and optional groups

### Customer UI Tasks:
1. Update menu item cards to show variation options
2. Create variation selector in "Add to Cart" dialog
   - Radio buttons for SINGLE_SELECT
   - Checkboxes for MULTI_SELECT
   - Real-time price calculation display
3. Update cart display to show selected variations
4. Update checkout page to display variations
5. Update order confirmation to show variations
6. Update order history to display past selections

### Cart Context Updates:
1. Extend CartItem type to include `selectedVariations`
2. Update `addItem()` to accept variation selections
3. Update price calculation to include modifiers
4. Update localStorage persistence

## Testing Checklist
- [ ] Create variation group via admin API
- [ ] Create variation options with different price modifiers
- [ ] Update variation group properties
- [ ] Delete variation option
- [ ] Fetch menu with variations
- [ ] Place order with variations (SINGLE_SELECT)
- [ ] Place order with variations (MULTI_SELECT)
- [ ] Verify correct price calculation
- [ ] Verify variations stored in order
- [ ] View order details with variations
- [ ] Kitchen dashboard displays variations correctly

## Benefits of This Implementation

### For Administrators:
✅ **Flexible Configuration**: Define any number of variation dimensions per item
✅ **Simple Pricing**: Add price modifiers without complex formulas
✅ **Easy Maintenance**: Add/remove options without affecting other items
✅ **No Coding Required**: All configuration through admin UI

### For Customers:
✅ **Clear Choices**: Organized by logical groups
✅ **Transparent Pricing**: See price changes in real-time
✅ **Intuitive Selection**: Radio buttons for single choice, checkboxes for multiple
✅ **Mix Free & Paid**: Some customizations free, others have cost

### For Developers:
✅ **Scalable**: No combinatorial explosion
✅ **Type-Safe**: Full TypeScript coverage
✅ **Maintainable**: Clear separation of concerns
✅ **Extensible**: Easy to add features (min/max selections, conditional logic, etc.)

## Technical Notes

### Price Calculation Strategy
Prices are calculated at order placement time and stored in `priceAtPurchase`. This ensures:
1. **Historical Accuracy**: Old orders reflect prices at the time of purchase
2. **No Retroactive Changes**: Menu price updates don't affect existing orders
3. **Simple Queries**: No need to recalculate prices when viewing orders

### JSON Storage Format
Selected variations are stored as structured JSON (not simple strings) to enable:
1. **Filtering**: Query orders by specific variation options
2. **Analytics**: Report on popular variations
3. **Display**: Reconstruct the exact selections with names and prices
4. **Validation**: Verify selections against current menu structure

### Backward Compatibility
The system maintains backward compatibility with the existing customization system:
- `customizations` field (legacy) - Free-text customizations
- `selectedVariations` field (new) - Structured variations with pricing
- Both can coexist on the same order item

This allows gradual migration from the old system to the new one.
