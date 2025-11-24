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
import { authenticate, authorize } from '../middleware/auth';
import { validateAdminDomain } from '../middleware/domainValidation';
import { UserRole } from '@prisma/client';
import { inventoryWriteLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Public endpoint - check availability for cart items
router.post('/check-availability', checkAvailability);

// All other routes require authentication and domain validation
router.use(authenticate);
router.use(validateAdminDomain);
router.use(authorize(UserRole.KITCHEN, UserRole.ADMIN));

// Kitchen staff routes - KITCHEN and ADMIN roles
router.get('/location/:locationId', getInventoryByLocation);
router.get('/location/:locationId/low-stock', getLowStockItems);
router.get('/item/:menuItemId/:locationId', getInventoryByMenuItem);
router.patch('/item/:menuItemId/:locationId', updateInventory);
router.post('/item/:menuItemId/:locationId/restock', restockInventory);
router.get('/history', getInventoryHistory);

// Admin-only routes (role-based checks in controller)
router.use(authorize(UserRole.ADMIN));

router.get('/all', getAllInventory);
router.post('/bulk-update', inventoryWriteLimiter, bulkUpdateInventory);
router.patch('/menu-item/:menuItemId/tracking', toggleInventoryTracking);
router.post('/menu-item/:menuItemId/initialize', inventoryWriteLimiter, initializeInventory);

export default router;
