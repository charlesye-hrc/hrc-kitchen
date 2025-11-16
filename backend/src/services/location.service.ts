import prisma from '../lib/prisma';
import { UserRole } from '@prisma/client';

interface CreateLocationData {
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
}

interface UpdateLocationData {
  name?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
}

export class LocationService {
  /**
   * Get all locations
   */
  async getAllLocations() {
    const locations = await prisma.location.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return locations;
  }

  /**
   * Get all locations for admin (includes inactive)
   */
  async getAllLocationsForAdmin() {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
    });
    return locations;
  }

  /**
   * Get location by ID
   */
  async getLocationById(locationId: string) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });
    return location;
  }

  /**
   * Create a new location (Admin only)
   */
  async createLocation(data: CreateLocationData) {
    const location = await prisma.location.create({
      data: {
        name: data.name,
        address: data.address || null,
        phone: data.phone || null,
        isActive: data.isActive,
      },
    });
    return location;
  }

  /**
   * Update a location (Admin only)
   */
  async updateLocation(locationId: string, data: UpdateLocationData) {
    try {
      const location = await prisma.location.update({
        where: { id: locationId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.address !== undefined && { address: data.address }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });
      return location;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate if a location can be deleted
   * Returns dependency information and recommended action
   *
   * Note: Orders and menu items no longer block deletion due to snapshot pattern.
   * Only user assignments block deletion to prevent data loss.
   */
  async validateLocationDeletion(locationId: string) {
    const [menuItemCount, userCount, orderCount] = await Promise.all([
      prisma.menuItemLocation.count({
        where: { locationId },
      }),
      prisma.userLocation.count({
        where: { locationId },
      }),
      prisma.order.count({
        where: { locationId },
      }),
    ]);

    // Determine action based on dependencies
    let action: 'CAN_DELETE' | 'CAN_CASCADE' | 'BLOCKED';
    const reasons: string[] = [];

    if (userCount > 0) {
      // Has user assignments - blocked, require manual cleanup
      action = 'BLOCKED';
      reasons.push(`${userCount} user(s) assigned (KITCHEN/FINANCE)`);
      reasons.push('Unassign users first or use "Unassign All & Delete"');
    } else if (menuItemCount > 0 || orderCount > 0) {
      // Has menu items or orders - can cascade (snapshots preserve historical data)
      action = 'CAN_CASCADE';
      if (menuItemCount > 0) {
        reasons.push(`${menuItemCount} menu item assignment(s) will be removed`);
      }
      if (orderCount > 0) {
        reasons.push(`${orderCount} historical order(s) exist (preserved via snapshots)`);
      }
    } else {
      // No dependencies - safe to delete
      action = 'CAN_DELETE';
    }

    return {
      action,
      canDelete: action !== 'BLOCKED',
      dependencies: {
        menuItems: menuItemCount,
        users: userCount,
        orders: orderCount,
      },
      reasons,
    };
  }

  /**
   * Get preview of what will happen when removing a location
   * Used by frontend to show appropriate confirmation dialog
   */
  async getRemovalPreview(locationId: string) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new Error('Location not found');
    }

    const validation = await this.validateLocationDeletion(locationId);

    return {
      location,
      ...validation,
    };
  }

  /**
   * Delete a location (Admin only)
   * Validates dependencies and handles cascade deletion
   *
   * Note: Orders are preserved via snapshots (onDelete: SetNull)
   * Menu item assignments are cascaded (onDelete: Cascade)
   * Only blocked by user assignments
   */
  async deleteLocation(locationId: string) {
    // Validate dependencies
    const validation = await this.validateLocationDeletion(locationId);

    // Block if has users (must unassign first)
    if (validation.dependencies.users > 0) {
      throw new Error(
        `Cannot delete location with ${validation.dependencies.users} user(s) assigned. ` +
        'Unassign users first or use the "Unassign All & Delete" option.'
      );
    }

    try {
      // Delete location
      // - Menu items: cascade removed (MenuItemLocation has onDelete: Cascade)
      // - Orders: preserved with snapshots (Order.locationId set to null)
      await prisma.location.delete({
        where: { id: locationId },
      });
      return {
        success: true,
        menuItemsUnassigned: validation.dependencies.menuItems,
        ordersPreserved: validation.dependencies.orders,
      };
    } catch (error) {
      throw new Error('Failed to delete location');
    }
  }

  /**
   * Unassign all dependencies and delete location (Admin only)
   * Transaction-safe: rolls back if any step fails
   *
   * Note: Orders are preserved via snapshots (no need to check)
   * Menu items will cascade automatically, but we explicitly delete for clarity
   */
  async unassignAllAndDelete(locationId: string) {
    const validation = await this.validateLocationDeletion(locationId);

    try {
      // Use transaction to ensure atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Remove user assignments
        await tx.userLocation.deleteMany({
          where: { locationId },
        });

        // Remove menu item assignments (will cascade anyway, but explicit is clear)
        await tx.menuItemLocation.deleteMany({
          where: { locationId },
        });

        // Delete the location (orders preserved via snapshots)
        await tx.location.delete({
          where: { id: locationId },
        });

        return {
          success: true,
          usersUnassigned: validation.dependencies.users,
          menuItemsUnassigned: validation.dependencies.menuItems,
          ordersPreserved: validation.dependencies.orders,
        };
      });

      return result;
    } catch (error) {
      throw new Error('Failed to unassign and delete location');
    }
  }

  /**
   * Soft-delete a location by setting isActive to false (Admin only)
   * This preserves historical data while removing the location from active use
   */
  async deactivateLocation(locationId: string) {
    try {
      const location = await prisma.location.update({
        where: { id: locationId },
        data: { isActive: false },
      });
      return location;
    } catch (error) {
      throw new Error('Failed to deactivate location');
    }
  }

  /**
   * Reactivate a location by setting isActive to true (Admin only)
   */
  async activateLocation(locationId: string) {
    try {
      const location = await prisma.location.update({
        where: { id: locationId },
        data: { isActive: true },
      });
      return location;
    } catch (error) {
      throw new Error('Failed to activate location');
    }
  }

  /**
   * Get locations accessible by a user
   * - ADMIN role: all active locations
   * - Other roles: assigned locations only
   */
  async getUserAccessibleLocations(userId: string, userRole: UserRole) {
    if (userRole === UserRole.ADMIN) {
      // Admins have access to all active locations
      return this.getAllLocations();
    }

    // Get user's assigned locations
    const userLocations = await prisma.userLocation.findMany({
      where: { userId },
      include: {
        location: true,
      },
    });

    return userLocations
      .filter(ul => ul.location.isActive)
      .map(ul => ul.location);
  }

  /**
   * Assign locations to a user (Admin only)
   */
  async assignLocationsToUser(userId: string, locationIds: string[]) {
    // Remove existing assignments
    await prisma.userLocation.deleteMany({
      where: { userId },
    });

    // Create new assignments
    if (locationIds.length > 0) {
      await prisma.userLocation.createMany({
        data: locationIds.map(locationId => ({
          userId,
          locationId,
        })),
      });
    }

    return this.getUserAssignedLocations(userId);
  }

  /**
   * Get locations assigned to a user
   */
  async getUserAssignedLocations(userId: string) {
    const userLocations = await prisma.userLocation.findMany({
      where: { userId },
      include: {
        location: true,
      },
    });

    return userLocations.map(ul => ul.location);
  }

  /**
   * Update user's last selected location
   */
  async updateUserLastLocation(userId: string, locationId: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { lastSelectedLocationId: locationId },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's last selected location
   */
  async getUserLastLocation(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        lastSelectedLocation: true,
      },
    });

    return user?.lastSelectedLocation || null;
  }

  /**
   * Get menu items for a specific location
   */
  async getMenuItemsByLocation(locationId: string) {
    const menuItemLocations = await prisma.menuItemLocation.findMany({
      where: { locationId },
      include: {
        menuItem: {
          include: {
            customizations: true,
            variationGroups: {
              include: {
                options: {
                  orderBy: { displayOrder: 'asc' },
                },
              },
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });

    return menuItemLocations.map(mil => mil.menuItem);
  }

  /**
   * Assign menu item to locations (Admin only)
   */
  async assignMenuItemToLocations(menuItemId: string, locationIds: string[]) {
    // Remove existing assignments
    await prisma.menuItemLocation.deleteMany({
      where: { menuItemId },
    });

    // Create new assignments
    if (locationIds.length > 0) {
      await prisma.menuItemLocation.createMany({
        data: locationIds.map(locationId => ({
          menuItemId,
          locationId,
        })),
      });
    }

    return this.getMenuItemLocations(menuItemId);
  }

  /**
   * Get locations where a menu item is available
   */
  async getMenuItemLocations(menuItemId: string) {
    const menuItemLocations = await prisma.menuItemLocation.findMany({
      where: { menuItemId },
      include: {
        location: true,
      },
    });

    return menuItemLocations.map(mil => mil.location);
  }

  /**
   * Check if a menu item is available at a location
   */
  async isMenuItemAvailableAtLocation(menuItemId: string, locationId: string) {
    const exists = await prisma.menuItemLocation.findFirst({
      where: {
        menuItemId,
        locationId,
      },
    });

    return !!exists;
  }
}

export default new LocationService();
