import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import adminService from '../services/admin.service';
import UploadService from '../services/upload.service';
import { Weekday, MenuCategory, UserRole, VariationGroupType } from '@prisma/client';

export class AdminController {
  /**
   * POST /api/v1/admin/menu/items
   * Create a new menu item
   */
  async createMenuItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        name,
        description,
        price,
        category,
        weekdays,
        imageUrl,
        dietaryTags,
      } = req.body;

      // Validation
      if (!name || !price || !category || !weekdays || !Array.isArray(weekdays) || weekdays.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: name, price, category, weekdays (must be non-empty array)',
        });
        return;
      }

      const item = await adminService.createMenuItem({
        name,
        description: description || '',
        price: parseFloat(price),
        category: category as MenuCategory,
        weekdays: weekdays as Weekday[],
        imageUrl,
        dietaryTags: dietaryTags || [],
      });

      res.status(201).json({
        success: true,
        data: item,
        message: 'Menu item created successfully',
      });
      return;
    } catch (error) {
      console.error('Error creating menu item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create menu item',
      });
      return;
    }
  }

  /**
   * PUT /api/v1/admin/menu/items/:id
   * Update a menu item
   */
  async updateMenuItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive: _deprecatedIsActive, ...updateData } = req.body || {};

      // Convert price to float if provided
      if (updateData.price) {
        updateData.price = parseFloat(updateData.price);
      }

      const item = await adminService.updateMenuItem(id, updateData);

      if (!item) {
        res.status(404).json({
          success: false,
          message: 'Menu item not found',
        });
        return;
      }

      res.json({
        success: true,
        data: item,
        message: 'Menu item updated successfully',
      });
      return;
    } catch (error) {
      console.error('Error updating menu item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update menu item',
      });
      return;
    }
  }

  /**
   * DELETE /api/v1/admin/menu/items/:id
   * Delete/deactivate a menu item
   */
  async deleteMenuItem(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Hard delete only (snapshots preserve historical order data)
      await adminService.deleteMenuItem(id);

      res.json({
        success: true,
        message: 'Menu item deleted successfully',
      });
      return;
    } catch (error) {
      console.error('Error deleting menu item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete menu item',
      });
      return;
    }
  }

  /**
   * POST /api/v1/admin/menu/items/:id/customizations
   * Add a customization option to a menu item
   */
  async addCustomization(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          message: 'Customization name is required',
        });
        return;
      }

      const customization = await adminService.addCustomization(id, name);

      res.status(201).json({
        success: true,
        data: customization,
        message: 'Customization added successfully',
      });
      return;
    } catch (error) {
      console.error('Error adding customization:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add customization',
      });
      return;
    }
  }

  /**
   * DELETE /api/v1/admin/menu/customizations/:id
   * Remove a customization option
   */
  async deleteCustomization(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await adminService.deleteCustomization(id);

      res.json({
        success: true,
        message: 'Customization deleted successfully',
      });
      return;
    } catch (error) {
      console.error('Error deleting customization:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete customization',
      });
      return;
    }
  }

  /**
   * GET /api/v1/admin/users
   * Get all users with pagination and filtering
   */
  async getUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        page = '1',
        limit = '20',
        role,
        search,
        isActive,
      } = req.query;

      const filters = {
        role: role as UserRole | undefined,
        search: search as string | undefined,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      };

      const result = await adminService.getUsers(
        parseInt(page as string),
        parseInt(limit as string),
        filters
      );

      res.json({
        success: true,
        data: result.users,
        pagination: {
          total: result.total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(result.total / parseInt(limit as string)),
        },
      });
      return;
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
      });
      return;
    }
  }

  /**
   * PATCH /api/v1/admin/users/:id/role
   * Update user role
   */
  async updateUserRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role || !['STAFF', 'KITCHEN', 'FINANCE', 'ADMIN'].includes(role)) {
        res.status(400).json({
          success: false,
          message: 'Invalid role. Must be STAFF, KITCHEN, FINANCE, or ADMIN',
        });
        return;
      }

      // Prevent self-demotion
      if (id === req.user?.id && role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          message: 'Cannot demote yourself',
        });
        return;
      }

      // Check email domain restriction for KITCHEN, FINANCE, and ADMIN roles
      if (role === 'KITCHEN' || role === 'FINANCE' || role === 'ADMIN') {
        const user = await adminService.getUserById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

        // Get restricted domain from config
        const config = await adminService.getConfig();
        const allowedDomain = config.restricted_role_domain || '@huonregionalcare.org.au';

        if (!user.email.toLowerCase().endsWith(allowedDomain.toLowerCase())) {
          res.status(403).json({
            success: false,
            message: `Only users with ${allowedDomain} email addresses can be assigned KITCHEN, FINANCE, or ADMIN roles`,
            code: 'INVALID_EMAIL_DOMAIN',
          });
          return;
        }
      }

      const user = await adminService.updateUserRole(id, role as UserRole);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: user,
        message: 'User role updated successfully',
      });
      return;
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user role',
      });
      return;
    }
  }

  /**
   * PATCH /api/v1/admin/users/:id/status
   * Activate/deactivate user
   */
  async updateUserStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'isActive must be a boolean',
        });
        return;
      }

      // Prevent self-deactivation
      if (id === req.user?.id && !isActive) {
        res.status(403).json({
          success: false,
          message: 'Cannot deactivate yourself',
        });
        return;
      }

      const user = await adminService.updateUserStatus(id, isActive);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: user,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
      return;
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user status',
      });
      return;
    }
  }

  /**
   * DELETE /api/v1/admin/users/:id
   * Delete a user
   */
  async deleteUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (id === req.user?.id) {
        res.status(403).json({
          success: false,
          message: 'Cannot delete yourself',
        });
        return;
      }

      const success = await adminService.deleteUser(id);

      if (!success) {
        res.status(404).json({
          success: false,
          message: 'User not found or failed to delete',
        });
        return;
      }

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
      return;
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
      });
      return;
    }
  }

  /**
   * GET /api/v1/admin/config
   * Get all system configuration
   */
  async getConfig(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const config = await adminService.getConfig();

      res.json({
        success: true,
        data: config,
      });
      return;
    } catch (error) {
      console.error('Error fetching config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system configuration',
      });
      return;
    }
  }

  /**
   * PUT /api/v1/admin/config
   * Update system configuration
   */
  async updateConfig(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { orderingWindowStart, orderingWindowEnd, restrictedRoleDomain } = req.body;

      // Validation
      if (orderingWindowStart && orderingWindowEnd) {
        // Validate time format (HH:MM)
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

        if (!timeRegex.test(orderingWindowStart) || !timeRegex.test(orderingWindowEnd)) {
          res.status(400).json({
            success: false,
            message: 'Invalid time format. Use HH:MM (e.g., 08:00)',
          });
          return;
        }

        // Validate end time is after start time
        const [startHour, startMin] = orderingWindowStart.split(':').map(Number);
        const [endHour, endMin] = orderingWindowEnd.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        if (endMinutes <= startMinutes) {
          res.status(400).json({
            success: false,
            message: 'End time must be after start time',
          });
          return;
        }
      }

      // Validate restricted domain format (optional)
      if (restrictedRoleDomain !== undefined && restrictedRoleDomain !== '') {
        if (!restrictedRoleDomain.startsWith('@')) {
          res.status(400).json({
            success: false,
            message: 'Restricted domain must start with @ (e.g., @example.com)',
          });
          return;
        }
      }

      const config = await adminService.updateConfig({
        orderingWindowStart,
        orderingWindowEnd,
        restrictedRoleDomain,
      });

      res.json({
        success: true,
        data: config,
        message: 'System configuration updated successfully',
      });
      return;
    } catch (error) {
      console.error('Error updating config:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update system configuration',
      });
      return;
    }
  }

  /**
   * POST /api/v1/admin/upload/signature
   * Generate signed upload signature for Cloudinary
   */
  async getUploadSignature(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { folder = 'menu-items' } = req.body;

      const signature = await UploadService.generateUploadSignature(folder);

      res.json({
        success: true,
        data: signature,
      });
      return;
    } catch (error) {
      console.error('Error generating upload signature:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate upload signature',
      });
      return;
    }
  }

  /**
   * POST /api/v1/admin/upload/image
   * Upload image to Cloudinary (server-side)
   */
  async uploadImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { imageData, folder = 'menu-items' } = req.body;

      if (!imageData) {
        res.status(400).json({
          success: false,
          message: 'Image data is required',
        });
        return;
      }

      const imageUrl = await UploadService.uploadImage(imageData, folder);

      res.json({
        success: true,
        data: { url: imageUrl },
        message: 'Image uploaded successfully',
      });
      return;
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload image',
      });
      return;
    }
  }

  // ==================== VARIATION GROUP ENDPOINTS ====================

  /**
   * POST /api/v1/admin/menu/items/:id/variation-groups
   * Create a variation group for a menu item
   */
  async createVariationGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id: menuItemId } = req.params;
      const { name, type, required, displayOrder } = req.body;

      if (!name || !type) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: name, type',
        });
        return;
      }

      const group = await adminService.createVariationGroup({
        menuItemId,
        name,
        type: type as VariationGroupType,
        required,
        displayOrder,
      });

      res.status(201).json({
        success: true,
        data: group,
        message: 'Variation group created successfully',
      });
      return;
    } catch (error) {
      console.error('Error creating variation group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create variation group',
      });
      return;
    }
  }

  /**
   * PUT /api/v1/admin/variation-groups/:id
   * Update a variation group
   */
  async updateVariationGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, type, required, displayOrder } = req.body;

      const group = await adminService.updateVariationGroup(id, {
        name,
        type: type as VariationGroupType,
        required,
        displayOrder,
      });

      if (!group) {
        res.status(404).json({
          success: false,
          message: 'Variation group not found',
        });
        return;
      }

      res.json({
        success: true,
        data: group,
        message: 'Variation group updated successfully',
      });
      return;
    } catch (error) {
      console.error('Error updating variation group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update variation group',
      });
      return;
    }
  }

  /**
   * DELETE /api/v1/admin/variation-groups/:id
   * Delete a variation group
   */
  async deleteVariationGroup(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await adminService.deleteVariationGroup(id);

      res.json({
        success: true,
        message: 'Variation group deleted successfully',
      });
      return;
    } catch (error) {
      console.error('Error deleting variation group:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete variation group',
      });
      return;
    }
  }

  /**
   * GET /api/v1/admin/menu/items/:id/variation-groups
   * Get all variation groups for a menu item
   */
  async getVariationGroups(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id: menuItemId } = req.params;

      const groups = await adminService.getVariationGroups(menuItemId);

      res.json({
        success: true,
        data: groups,
      });
      return;
    } catch (error) {
      console.error('Error fetching variation groups:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch variation groups',
      });
      return;
    }
  }

  // ==================== VARIATION OPTION ENDPOINTS ====================

  /**
   * POST /api/v1/admin/variation-groups/:id/options
   * Create a variation option
   */
  async createVariationOption(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id: variationGroupId } = req.params;
      const { name, priceModifier, isDefault, displayOrder } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          message: 'Option name is required',
        });
        return;
      }

      const option = await adminService.createVariationOption({
        variationGroupId,
        name,
        priceModifier: priceModifier !== undefined ? parseFloat(priceModifier) : 0,
        isDefault,
        displayOrder,
      });

      res.status(201).json({
        success: true,
        data: option,
        message: 'Variation option created successfully',
      });
      return;
    } catch (error) {
      console.error('Error creating variation option:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create variation option',
      });
      return;
    }
  }

  /**
   * PUT /api/v1/admin/variation-options/:id
   * Update a variation option
   */
  async updateVariationOption(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, priceModifier, isDefault, displayOrder } = req.body;

      const option = await adminService.updateVariationOption(id, {
        name,
        priceModifier: priceModifier !== undefined ? parseFloat(priceModifier) : undefined,
        isDefault,
        displayOrder,
      });

      if (!option) {
        res.status(404).json({
          success: false,
          message: 'Variation option not found',
        });
        return;
      }

      res.json({
        success: true,
        data: option,
        message: 'Variation option updated successfully',
      });
      return;
    } catch (error) {
      console.error('Error updating variation option:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update variation option',
      });
      return;
    }
  }

  /**
   * DELETE /api/v1/admin/variation-options/:id
   * Delete a variation option
   */
  async deleteVariationOption(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await adminService.deleteVariationOption(id);

      res.json({
        success: true,
        message: 'Variation option deleted successfully',
      });
      return;
    } catch (error) {
      console.error('Error deleting variation option:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete variation option',
      });
      return;
    }
  }

  /**
   * GET /api/v1/admin/variation-groups/:id/options
   * Get all options for a variation group
   */
  async getVariationOptions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id: groupId } = req.params;

      const options = await adminService.getVariationOptions(groupId);

      res.json({
        success: true,
        data: options,
      });
      return;
    } catch (error) {
      console.error('Error fetching variation options:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch variation options',
      });
      return;
    }
  }
}

export default new AdminController();
