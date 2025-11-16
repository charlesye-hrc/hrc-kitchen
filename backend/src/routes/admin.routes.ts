import { Router } from 'express';
import adminController from '../controllers/admin.controller';
import reportController from '../controllers/report.controller';
import locationController from '../controllers/location.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validateAdminDomain } from '../middleware/domainValidation';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication and domain validation
router.use(authenticate);
router.use(validateAdminDomain);

// Report routes - accessible by KITCHEN, FINANCE and ADMIN
router.get('/reports/revenue-by-user', authorize(UserRole.KITCHEN, UserRole.FINANCE, UserRole.ADMIN), reportController.getRevenueByUser);
router.get('/reports/popular-items', authorize(UserRole.KITCHEN, UserRole.FINANCE, UserRole.ADMIN), reportController.getPopularItems);
router.get('/reports/summary', authorize(UserRole.KITCHEN, UserRole.FINANCE, UserRole.ADMIN), reportController.getSummary);
router.get('/reports/orders', authorize(UserRole.KITCHEN, UserRole.FINANCE, UserRole.ADMIN), reportController.getOrders);

// All other admin routes require ADMIN role only
router.use(authorize(UserRole.ADMIN));

/**
 * Menu Management Routes
 */

/**
 * @route   POST /api/v1/admin/menu/items
 * @desc    Create a new menu item
 * @access  Admin only
 */
router.post('/menu/items', adminController.createMenuItem);

/**
 * @route   PUT /api/v1/admin/menu/items/:id
 * @desc    Update a menu item
 * @access  Admin only
 */
router.put('/menu/items/:id', adminController.updateMenuItem);

/**
 * @route   DELETE /api/v1/admin/menu/items/:id
 * @desc    Delete/deactivate a menu item
 * @access  Admin only
 */
router.delete('/menu/items/:id', adminController.deleteMenuItem);

/**
 * @route   POST /api/v1/admin/menu/items/:id/customizations
 * @desc    Add a customization option to a menu item
 * @access  Admin only
 */
router.post('/menu/items/:id/customizations', adminController.addCustomization);

/**
 * @route   DELETE /api/v1/admin/menu/customizations/:id
 * @desc    Remove a customization option
 * @access  Admin only
 */
router.delete('/menu/customizations/:id', adminController.deleteCustomization);

/**
 * Variation Group Routes
 */

/**
 * @route   POST /api/v1/admin/menu/items/:id/variation-groups
 * @desc    Create a variation group for a menu item
 * @access  Admin only
 */
router.post('/menu/items/:id/variation-groups', adminController.createVariationGroup);

/**
 * @route   GET /api/v1/admin/menu/items/:id/variation-groups
 * @desc    Get all variation groups for a menu item
 * @access  Admin only
 */
router.get('/menu/items/:id/variation-groups', adminController.getVariationGroups);

/**
 * @route   PUT /api/v1/admin/variation-groups/:id
 * @desc    Update a variation group
 * @access  Admin only
 */
router.put('/variation-groups/:id', adminController.updateVariationGroup);

/**
 * @route   DELETE /api/v1/admin/variation-groups/:id
 * @desc    Delete a variation group
 * @access  Admin only
 */
router.delete('/variation-groups/:id', adminController.deleteVariationGroup);

/**
 * Variation Option Routes
 */

/**
 * @route   POST /api/v1/admin/variation-groups/:id/options
 * @desc    Create a variation option
 * @access  Admin only
 */
router.post('/variation-groups/:id/options', adminController.createVariationOption);

/**
 * @route   GET /api/v1/admin/variation-groups/:id/options
 * @desc    Get all options for a variation group
 * @access  Admin only
 */
router.get('/variation-groups/:id/options', adminController.getVariationOptions);

/**
 * @route   PUT /api/v1/admin/variation-options/:id
 * @desc    Update a variation option
 * @access  Admin only
 */
router.put('/variation-options/:id', adminController.updateVariationOption);

/**
 * @route   DELETE /api/v1/admin/variation-options/:id
 * @desc    Delete a variation option
 * @access  Admin only
 */
router.delete('/variation-options/:id', adminController.deleteVariationOption);

/**
 * User Management Routes
 */

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users with pagination and filtering
 * @access  Admin only
 */
router.get('/users', adminController.getUsers);

/**
 * @route   PATCH /api/v1/admin/users/:id/role
 * @desc    Update user role
 * @access  Admin only
 */
router.patch('/users/:id/role', adminController.updateUserRole);

/**
 * @route   PATCH /api/v1/admin/users/:id/status
 * @desc    Activate/deactivate user
 * @access  Admin only
 */
router.patch('/users/:id/status', adminController.updateUserStatus);

/**
 * System Configuration Routes
 */

/**
 * @route   GET /api/v1/admin/config
 * @desc    Get all system configuration
 * @access  Admin only
 */
router.get('/config', adminController.getConfig);

/**
 * @route   PUT /api/v1/admin/config
 * @desc    Update system configuration
 * @access  Admin only
 */
router.put('/config', adminController.updateConfig);

/**
 * Upload Routes
 */

/**
 * @route   POST /api/v1/admin/upload/signature
 * @desc    Generate signed upload signature for Cloudinary
 * @access  Admin only
 */
router.post('/upload/signature', adminController.getUploadSignature);

/**
 * @route   POST /api/v1/admin/upload/image
 * @desc    Upload image to Cloudinary (server-side)
 * @access  Admin only
 */
router.post('/upload/image', adminController.uploadImage);

/**
 * Location Management Routes
 */

/**
 * @route   GET /api/v1/admin/locations
 * @desc    Get all locations (including inactive)
 * @access  Admin only
 */
router.get('/locations', locationController.getAdminLocations);

/**
 * @route   POST /api/v1/admin/locations
 * @desc    Create a new location
 * @access  Admin only
 */
router.post('/locations', locationController.createLocation);

/**
 * @route   PUT /api/v1/admin/locations/:id
 * @desc    Update a location
 * @access  Admin only
 */
router.put('/locations/:id', locationController.updateLocation);

/**
 * @route   GET /api/v1/admin/locations/:id/removal-preview
 * @desc    Get preview of what will happen when removing a location
 * @access  Admin only
 */
router.get('/locations/:id/removal-preview', locationController.getRemovalPreview);

/**
 * @route   DELETE /api/v1/admin/locations/:id
 * @desc    Delete a location (validates dependencies, supports cascade)
 * @access  Admin only
 */
router.delete('/locations/:id', locationController.deleteLocation);

/**
 * @route   PATCH /api/v1/admin/locations/:id/deactivate
 * @desc    Deactivate a location (soft delete)
 * @access  Admin only
 */
router.patch('/locations/:id/deactivate', locationController.deactivateLocation);

/**
 * @route   PATCH /api/v1/admin/locations/:id/activate
 * @desc    Activate a location
 * @access  Admin only
 */
router.patch('/locations/:id/activate', locationController.activateLocation);

/**
 * @route   GET /api/v1/admin/users/:userId/locations
 * @desc    Get locations assigned to a user
 * @access  Admin only
 */
router.get('/users/:userId/locations', locationController.getUserAssignedLocations);

/**
 * @route   PUT /api/v1/admin/users/:userId/locations
 * @desc    Assign locations to a user
 * @access  Admin only
 */
router.put('/users/:userId/locations', locationController.assignLocationsToUser);

/**
 * @route   GET /api/v1/admin/menu-items/:menuItemId/locations
 * @desc    Get locations where a menu item is available
 * @access  Admin only
 */
router.get('/menu-items/:menuItemId/locations', locationController.getMenuItemLocations);

/**
 * @route   PUT /api/v1/admin/menu-items/:menuItemId/locations
 * @desc    Assign menu item to locations
 * @access  Admin only
 */
router.put('/menu-items/:menuItemId/locations', locationController.assignMenuItemToLocations);

export default router;
