# Kitchen Dashboard Testing Guide

## Overview
This guide provides step-by-step instructions for testing the Kitchen Dashboard functionality implemented in Phase 3.

## Prerequisites
- Backend and frontend servers running (`npm run dev`)
- Database seeded with test data (`npm run db:seed` in backend directory)

## Test Accounts

### Kitchen Staff Account
- **Email**: kitchen@hrc-kitchen.com
- **Password**: Kitchen123!
- **Role**: KITCHEN

### Admin Account (also has kitchen access)
- **Email**: admin@hrc-kitchen.com
- **Password**: Admin123!
- **Role**: ADMIN

### Staff Account (for placing test orders)
- **Email**: staff@hrc-kitchen.com
- **Password**: Staff123!
- **Role**: STAFF

## Testing Steps

### Part 1: Create Test Orders

1. **Login as Staff User**
   - Navigate to http://localhost:5173/login
   - Login with: staff@hrc-kitchen.com / Staff123!

2. **Place Multiple Test Orders**
   - Go to Menu page
   - Add several items to cart (try different quantities and customizations)
   - Complete checkout with Stripe test card: `4242 4242 4242 4242`
   - Use any future expiry date and any CVC
   - Place at least 2-3 orders with different items

3. **Verify Orders Placed**
   - Check the Orders page to confirm orders were created
   - Note the order numbers for reference

### Part 2: Test Kitchen Dashboard - Order List View

1. **Login as Kitchen Staff**
   - Logout from staff account
   - Login with: kitchen@hrc-kitchen.com / Kitchen123!

2. **Navigate to Kitchen Dashboard**
   - Click "Kitchen" in the navigation menu
   - You should see the Kitchen Dashboard

3. **Verify Dashboard Statistics**
   - Check that the stats show:
     - Total Orders count
     - Total Revenue amount
     - Pending orders count
   - Verify numbers match the orders you created

4. **Test Order List View** (Default tab)
   - Verify all today's orders are displayed
   - Each order card should show:
     - Order number
     - Customer name and email
     - Order time
     - Fulfillment status chip
     - Total amount
     - List of items with quantities
     - Any customizations or special requests

5. **Test Status Filters**
   - Use the "Status Filter" dropdown
   - Select "PLACED" - should show only new orders
   - Select "PREPARING" - should show orders being prepared
   - Select "READY" - should show completed orders ready for pickup
   - Select "All Orders" - should show all orders again

6. **Test Date Filter**
   - Change the date to tomorrow - should show "No orders found"
   - Change back to today - should show orders again

### Part 3: Test Order Status Updates

1. **Update Order Status - Start Preparing**
   - Find an order with status "PLACED"
   - Click "Start Preparing" button
   - Verify:
     - Status chip changes to "PREPARING" (blue)
     - Button changes to "Mark Ready"
     - Icon updates appropriately

2. **Update Order Status - Mark Ready**
   - Click "Mark Ready" button on the preparing order
   - Verify:
     - Status chip changes to "READY" (green)
     - Button changes to "Complete"
     - Icon updates to delivery truck

3. **Update Order Status - Complete**
   - Click "Complete" button
   - Verify:
     - Status chip changes to "COMPLETED" (gray)
     - No action buttons shown (completed orders locked)

4. **Test Status Filter Updates**
   - After updating statuses, test filters again
   - Each filter should show only orders matching that status

### Part 4: Test Batch View

1. **Switch to Batch View Tab**
   - Click the "Batch View" tab
   - View should change to show items grouped by menu item

2. **Verify Batch Grouping**
   - Each card should show:
     - Menu item name
     - Category
     - Total quantity needed (e.g., "5 total")
     - List of individual orders for this item
   - Items should be sorted by total quantity (most popular first)

3. **Verify Order Details in Batch View**
   - Each order under a menu item should show:
     - Order number
     - Quantity for this specific order
     - Any customizations (if applicable)

4. **Test with Different Menu Items**
   - If multiple different items were ordered, verify each is grouped separately
   - Verify quantities are summed correctly

### Part 5: Test Edge Cases

1. **Test with No Orders**
   - Change date to a future date (e.g., next week)
   - Verify "No orders found" message appears
   - Switch between tabs - both should show the message

2. **Test Multiple Orders from Same Customer**
   - Login as staff user again
   - Place another order
   - Switch back to kitchen user
   - Verify both orders from same customer appear in list

3. **Test Refresh/Reload**
   - After updating some order statuses
   - Refresh the page
   - Verify statuses persist correctly
   - Verify stats update accordingly

### Part 6: Test Access Control

1. **Test Kitchen Access with Staff Role**
   - Logout and login as staff@hrc-kitchen.com
   - Try to navigate to /kitchen directly
   - Should see "You do not have permission" error

2. **Test Admin Access to Kitchen**
   - Logout and login as admin@hrc-kitchen.com
   - Navigate to Kitchen dashboard
   - Should have full access (admins can access kitchen features)

### Part 7: API Endpoint Testing (Optional)

Using a tool like Postman or curl, test the API directly:

1. **Get Kitchen Orders**
   ```bash
   GET http://localhost:3000/api/v1/kitchen/orders
   Headers: Authorization: Bearer <token>
   ```

2. **Get Order Summary**
   ```bash
   GET http://localhost:3000/api/v1/kitchen/summary
   Headers: Authorization: Bearer <token>
   ```

3. **Update Order Status**
   ```bash
   PATCH http://localhost:3000/api/v1/kitchen/orders/:id/status
   Headers: Authorization: Bearer <token>
   Body: { "status": "PREPARING" }
   ```

4. **Get Daily Stats**
   ```bash
   GET http://localhost:3000/api/v1/kitchen/stats
   Headers: Authorization: Bearer <token>
   ```

## Expected Results

### ✅ Success Criteria
- [x] Kitchen staff can view all today's orders
- [x] Orders display complete information (customer, items, customizations)
- [x] Order status can be updated through the workflow (PLACED → PREPARING → READY → COMPLETED)
- [x] Status filters work correctly
- [x] Date filter works correctly
- [x] Batch view groups orders by menu item
- [x] Batch view shows correct total quantities
- [x] Statistics display accurate counts and revenue
- [x] Completed orders cannot be modified
- [x] Staff role cannot access kitchen dashboard
- [x] Admin role has full kitchen access
- [x] UI is responsive and clear
- [x] No console errors

## Common Issues & Troubleshooting

### Issue: "No orders found"
- **Cause**: Orders may be for a different date or all filtered out
- **Solution**: Check date filter is set to today, set status filter to "All Orders"

### Issue: "Failed to load kitchen data"
- **Cause**: Backend API not running or authentication issue
- **Solution**: Check backend is running on port 3000, verify you're logged in as kitchen/admin user

### Issue: Order status not updating
- **Cause**: API error or validation failure
- **Solution**: Check browser console for errors, verify order is not already completed

### Issue: Statistics showing 0
- **Cause**: No orders placed for selected date
- **Solution**: Place test orders first, or change date to when orders exist

## Next Steps

After successful testing:
1. Document any bugs found
2. Consider UI/UX improvements based on testing experience
3. Plan for Phase 4 features:
   - Admin panel for menu management
   - System configuration
   - Reporting and analytics
   - Email notifications

## Reporting Issues

If you find any issues during testing:
1. Note the steps to reproduce
2. Include browser console errors
3. Include network request/response details if relevant
4. Document expected vs actual behavior
