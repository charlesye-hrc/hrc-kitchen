import express from 'express';
import {
  getInventoryByLocation,
  getAllInventory,
  getInventoryByMenuItem,
  getLowStockItems,
  updateInventory,
  restockInventory,
  bulkUpdateInventory,
  checkAvailability,
  getInventoryHistory,
  toggleInventoryTracking,
  initializeInventory,
} from '../controllers/inventory.controller';
import { authenticate } from '../middleware/auth';
import { validateAdminDomain } from '../middleware/domainValidation';

const router = express.Router();

// Public endpoint - check availability for cart items
router.post('/check-availability', checkAvailability);

// All other routes require authentication and domain validation
router.use(authenticate);
router.use(validateAdminDomain);

// Kitchen staff routes - KITCHEN and ADMIN roles
router.get('/location/:locationId', getInventoryByLocation);
router.get('/location/:locationId/low-stock', getLowStockItems);
router.get('/item/:menuItemId/:locationId', getInventoryByMenuItem);
router.patch('/item/:menuItemId/:locationId', updateInventory);
router.post('/item/:menuItemId/:locationId/restock', restockInventory);
router.get('/history', getInventoryHistory);

// Admin-only routes (role-based checks in controller)
router.get('/all', getAllInventory);
router.post('/bulk-update', bulkUpdateInventory);
router.patch('/menu-item/:menuItemId/tracking', toggleInventoryTracking);
router.post('/menu-item/:menuItemId/initialize', initializeInventory);

export default router;
