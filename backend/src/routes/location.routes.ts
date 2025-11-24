import { Router } from 'express';
import locationController from '../controllers/location.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Authenticated User Routes (must be before :id routes to avoid conflicts)
 */

/**
 * @route   GET /api/v1/locations/user/accessible
 * @desc    Get locations accessible by the current user
 * @access  Authenticated
 */
router.get('/user/accessible', authenticate, locationController.getUserAccessibleLocations);

/**
 * @route   GET /api/v1/locations/user/last-selected
 * @desc    Get user's last selected location
 * @access  Authenticated
 */
router.get('/user/last-selected', authenticate, locationController.getUserLastLocation);

/**
 * @route   PUT /api/v1/locations/user/last-selected
 * @desc    Update user's last selected location
 * @access  Authenticated
 */
router.put('/user/last-selected', authenticate, locationController.updateUserLastLocation);

/**
 * Public Location Routes (no auth required for basic location info)
 */

/**
 * @route   GET /api/v1/locations
 * @desc    Get all active locations
 * @access  Public
 */
router.get('/', locationController.getAllLocations);

/**
 * @route   GET /api/v1/locations/:id
 * @desc    Get a specific location
 * @access  Public
 */
router.get('/:id', locationController.getLocationById);

/**
 * @route   GET /api/v1/locations/:id/menu-items
 * @desc    Get menu items available at a specific location
 * @access  Public
 */
router.get('/:id/menu-items', locationController.getLocationMenuItems);

export default router;
