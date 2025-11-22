import { Router } from 'express';
import menuController from '../controllers/menu.controller';

const router = Router();

/**
 * @route   GET /api/v1/menu/today
 * @desc    Get today's menu items with ordering window status
 * @access  Public (no authentication required for guest checkout)
 * @note    Used by public ordering app - includes orderingWindow metadata
 */
router.get('/today', menuController.getTodaysMenu);

/**
 * @route   GET /api/v1/menu/week
 * @desc    Get full weekly menu grouped by weekday
 * @access  Public (no authentication required for guest checkout)
 * @note    Returns: { MONDAY: [], TUESDAY: [], ... } - Used by admin MenuManagement UI
 */
router.get('/week', menuController.getWeeklyMenu);

/**
 * @route   GET /api/v1/menu/items
 * @desc    Get all menu items (flat array) with optional filters
 * @access  Public (no authentication required for guest checkout)
 * @query   weekday - Filter by weekday (MONDAY, TUESDAY, etc.)
 * @query   category - Filter by category (MAIN, SIDE, DRINK, DESSERT, OTHER)
 * @query   trackInventory - Filter by inventory tracking (true/false)
 * @query   locationId - Filter by location availability
 * @note    Preferred endpoint for admin tools, inventory management, and filtering
 * @example GET /menu/items?weekday=MONDAY&category=MAIN&trackInventory=true
 */
router.get('/items', menuController.getAllMenuItems);

/**
 * @route   GET /api/v1/menu/items/:id
 * @desc    Get single menu item by ID
 * @access  Public (no authentication required for guest checkout)
 */
router.get('/items/:id', menuController.getMenuItem);

export default router;
