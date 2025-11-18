import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import locationService from '../services/location.service';

export class LocationController {
  /**
   * GET /api/v1/locations
   * Get all active locations (public endpoint)
   */
  async getAllLocations(req: AuthRequest, res: Response) {
    try {
      const locations = await locationService.getAllLocations();

      res.json({
        success: true,
        data: locations,
      });
    } catch (error) {
      console.error('Error fetching locations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch locations',
      });
    }
  }

  /**
   * GET /api/v1/locations/:id
   * Get a specific location
   */
  async getLocationById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const location = await locationService.getLocationById(id);

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'Location not found',
        });
      }

      res.json({
        success: true,
        data: location,
      });
    } catch (error) {
      console.error('Error fetching location:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch location',
      });
    }
  }

  /**
   * GET /api/v1/locations/user/accessible
   * Get locations accessible by the current user
   */
  async getUserAccessibleLocations(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const locations = await locationService.getUserAccessibleLocations(userId, userRole);

      res.json({
        success: true,
        data: locations,
      });
    } catch (error) {
      console.error('Error fetching user accessible locations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch accessible locations',
      });
    }
  }

  /**
   * GET /api/v1/locations/user/last-selected
   * Get user's last selected location
   */
  async getUserLastLocation(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const location = await locationService.getUserLastLocation(userId);

      res.json({
        success: true,
        data: location,
      });
    } catch (error) {
      console.error('Error fetching user last location:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch last selected location',
      });
    }
  }

  /**
   * PUT /api/v1/locations/user/last-selected
   * Update user's last selected location
   */
  async updateUserLastLocation(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const { locationId } = req.body;

      if (!locationId) {
        return res.status(400).json({
          success: false,
          message: 'locationId is required',
        });
      }

      const result = await locationService.updateUserLastLocation(userId, locationId, userRole);

      if (!result.success) {
        const statusCode = result.error?.includes('Not authorized') ? 403 : 400;
        return res.status(statusCode).json({
          success: false,
          message: result.error || 'Failed to update last selected location',
        });
      }

      res.json({
        success: true,
        message: 'Last selected location updated successfully',
      });
    } catch (error) {
      console.error('Error updating user last location:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update last selected location',
      });
    }
  }

  /**
   * GET /api/v1/locations/:id/menu-items
   * Get menu items available at a specific location
   */
  async getLocationMenuItems(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const menuItems = await locationService.getMenuItemsByLocation(id);

      res.json({
        success: true,
        data: menuItems,
      });
    } catch (error) {
      console.error('Error fetching location menu items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch menu items',
      });
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * GET /api/v1/admin/locations
   * Get all locations including inactive (Admin only)
   */
  async getAdminLocations(req: AuthRequest, res: Response) {
    try {
      const locations = await locationService.getAllLocationsForAdmin();

      res.json({
        success: true,
        data: locations,
      });
    } catch (error) {
      console.error('Error fetching admin locations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch locations',
      });
    }
  }

  /**
   * POST /api/v1/admin/locations
   * Create a new location (Admin only)
   */
  async createLocation(req: AuthRequest, res: Response) {
    try {
      const { name, address, phone, isActive = true } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Location name is required',
        });
      }

      const location = await locationService.createLocation({
        name,
        address,
        phone,
        isActive,
      });

      res.status(201).json({
        success: true,
        data: location,
        message: 'Location created successfully',
      });
    } catch (error) {
      console.error('Error creating location:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create location',
      });
    }
  }

  /**
   * PUT /api/v1/admin/locations/:id
   * Update a location (Admin only)
   */
  async updateLocation(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const location = await locationService.updateLocation(id, updateData);

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'Location not found',
        });
      }

      res.json({
        success: true,
        data: location,
        message: 'Location updated successfully',
      });
    } catch (error) {
      console.error('Error updating location:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update location',
      });
    }
  }

  /**
   * GET /api/v1/admin/locations/:id/removal-preview
   * Get preview of what will happen when removing a location (Admin only)
   */
  async getRemovalPreview(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const preview = await locationService.getRemovalPreview(id);

      res.json({
        success: true,
        data: preview,
      });
    } catch (error: any) {
      console.error('Error getting removal preview:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Failed to get removal preview',
      });
    }
  }

  /**
   * DELETE /api/v1/admin/locations/:id
   * Delete a location (Admin only)
   * Validates dependencies and handles cascade deletion
   */
  async deleteLocation(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { forceUnassign } = req.query;

      let result;
      if (forceUnassign === 'true') {
        // Unassign all and delete
        result = await locationService.unassignAllAndDelete(id);
      } else {
        // Regular delete with cascade
        result = await locationService.deleteLocation(id);
      }

      res.json({
        success: true,
        data: result,
        message: 'Location deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting location:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete location',
      });
    }
  }

  /**
   * PATCH /api/v1/admin/locations/:id/deactivate
   * Deactivate a location (Admin only)
   * Soft-delete that preserves historical data
   */
  async deactivateLocation(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const location = await locationService.deactivateLocation(id);

      res.json({
        success: true,
        data: location,
        message: 'Location deactivated successfully',
      });
    } catch (error: any) {
      console.error('Error deactivating location:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to deactivate location',
      });
    }
  }

  /**
   * PATCH /api/v1/admin/locations/:id/activate
   * Activate a location (Admin only)
   */
  async activateLocation(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const location = await locationService.activateLocation(id);

      res.json({
        success: true,
        data: location,
        message: 'Location activated successfully',
      });
    } catch (error: any) {
      console.error('Error activating location:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to activate location',
      });
    }
  }

  /**
   * GET /api/v1/admin/users/:userId/locations
   * Get locations assigned to a user (Admin only)
   */
  async getUserAssignedLocations(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;
      const locations = await locationService.getUserAssignedLocations(userId);

      res.json({
        success: true,
        data: locations,
      });
    } catch (error) {
      console.error('Error fetching user assigned locations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch assigned locations',
      });
    }
  }

  /**
   * PUT /api/v1/admin/users/:userId/locations
   * Assign locations to a user (Admin only)
   */
  async assignLocationsToUser(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { locationIds } = req.body;

      if (!Array.isArray(locationIds)) {
        return res.status(400).json({
          success: false,
          message: 'locationIds must be an array',
        });
      }

      const locations = await locationService.assignLocationsToUser(userId, locationIds);

      res.json({
        success: true,
        data: locations,
        message: 'User locations updated successfully',
      });
    } catch (error) {
      console.error('Error assigning locations to user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign locations',
      });
    }
  }

  /**
   * GET /api/v1/admin/menu-items/:menuItemId/locations
   * Get locations where a menu item is available (Admin only)
   */
  async getMenuItemLocations(req: AuthRequest, res: Response) {
    try {
      const { menuItemId } = req.params;
      const locations = await locationService.getMenuItemLocations(menuItemId);

      res.json({
        success: true,
        data: locations,
      });
    } catch (error) {
      console.error('Error fetching menu item locations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch menu item locations',
      });
    }
  }

  /**
   * PUT /api/v1/admin/menu-items/:menuItemId/locations
   * Assign menu item to locations (Admin only)
   */
  async assignMenuItemToLocations(req: AuthRequest, res: Response) {
    try {
      const { menuItemId } = req.params;
      const { locationIds } = req.body;

      if (!Array.isArray(locationIds)) {
        return res.status(400).json({
          success: false,
          message: 'locationIds must be an array',
        });
      }

      const locations = await locationService.assignMenuItemToLocations(menuItemId, locationIds);

      res.json({
        success: true,
        data: locations,
        message: 'Menu item locations updated successfully',
      });
    } catch (error) {
      console.error('Error assigning menu item to locations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to assign menu item locations',
      });
    }
  }
}

export default new LocationController();
