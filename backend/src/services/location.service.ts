import prisma from '../lib/prisma';
import { UserRole } from '@prisma/client';
import UploadService from './upload.service';

interface CreateLocationData {
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  themePrimary?: string;
  themeSecondary?: string;
}

interface UpdateLocationData {
  name?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
  themePrimary?: string;
  themeSecondary?: string;
}

interface CreateLocationMenuPdfData {
  title: string;
  fileData: string;
}

export class LocationService {
  private static readonly DEFAULT_THEME_PRIMARY = '#2D5F3F';
  private static readonly DEFAULT_THEME_SECONDARY = '#D4A574';

  private normalizeHexColor(input?: string, fallback = '#000000'): string {
    if (!input) {
      return fallback;
    }
    const trimmed = input.trim();
    const hex = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    const isValid = /^#[0-9a-fA-F]{6}$/.test(hex);
    return isValid ? hex.toUpperCase() : fallback;
  }

  private normalizePublicCode(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async generateUniquePublicCode(name: string): Promise<string> {
    const fallback = `location-${Date.now()}`;
    const baseCode = this.normalizePublicCode(name) || fallback;
    let candidateCode = baseCode;
    let suffix = 2;

    while (true) {
      const existing = await prisma.location.findUnique({
        where: { publicCode: candidateCode },
        select: { id: true },
      });

      if (!existing) {
        return candidateCode;
      }

      candidateCode = `${baseCode}-${suffix}`;
      suffix += 1;
    }
  }

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
    const publicCode = await this.generateUniquePublicCode(data.name);
    const themePrimary = this.normalizeHexColor(data.themePrimary, LocationService.DEFAULT_THEME_PRIMARY);
    const themeSecondary = this.normalizeHexColor(data.themeSecondary, LocationService.DEFAULT_THEME_SECONDARY);

    const location = await prisma.location.create({
      data: {
        name: data.name,
        publicCode,
        themePrimary,
        themeSecondary,
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
          ...(data.themePrimary !== undefined && {
            themePrimary: this.normalizeHexColor(data.themePrimary, LocationService.DEFAULT_THEME_PRIMARY),
          }),
          ...(data.themeSecondary !== undefined && {
            themeSecondary: this.normalizeHexColor(data.themeSecondary, LocationService.DEFAULT_THEME_SECONDARY),
          }),
        },
      });
      return location;
    } catch (error) {
      console.error('LocationService.updateLocation failed:', error, { locationId, data });
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
   * Get location-scoped PDF menus for public app.
   * Only active locations are exposed publicly.
   */
  async getPublicMenuPdfsByLocation(locationId: string) {
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!location) {
      return null;
    }

    return prisma.locationMenuPdf.findMany({
      where: { locationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get all location PDF menus for admin app.
   */
  async getMenuPdfsByLocation(locationId: string) {
    return prisma.locationMenuPdf.findMany({
      where: { locationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        locationId: true,
        title: true,
        fileUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Check whether a user can access a specific location.
   * - ADMIN: any existing location
   * - Others: must be assigned to the location
   */
  async canUserAccessLocation(userId: string, userRole: UserRole, locationId: string): Promise<boolean> {
    if (userRole === UserRole.ADMIN) {
      const location = await prisma.location.findUnique({
        where: { id: locationId },
        select: { id: true },
      });
      return Boolean(location);
    }

    const assignment = await prisma.userLocation.findFirst({
      where: {
        userId,
        locationId,
      },
      select: { id: true },
    });

    return Boolean(assignment);
  }

  /**
   * Upload and create a location PDF menu entry.
   */
  async createLocationMenuPdf(locationId: string, data: CreateLocationMenuPdfData) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true },
    });

    if (!location) {
      throw new Error('Location not found');
    }

    const uploadResult = await UploadService.uploadPdf(data.fileData, `location-menu-pdfs/${locationId}`);

    return prisma.locationMenuPdf.create({
      data: {
        locationId,
        title: data.title.trim(),
        fileUrl: uploadResult.url,
        cloudinaryPublicId: uploadResult.publicId,
      },
      select: {
        id: true,
        locationId: true,
        title: true,
        fileUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Delete a location PDF menu entry and backing Cloudinary file.
   */
  async deleteLocationMenuPdf(locationId: string, pdfId: string) {
    const existing = await prisma.locationMenuPdf.findFirst({
      where: {
        id: pdfId,
        locationId,
      },
    });

    if (!existing) {
      return null;
    }

    await prisma.locationMenuPdf.delete({
      where: { id: pdfId },
    });

    await UploadService.deleteByPublicId(existing.cloudinaryPublicId, 'raw');
    return existing;
  }

  /**
   * Get locations accessible by a user (for internal apps: kitchen, admin, finance)
   * - ADMIN role: all active locations
   * - Other roles (STAFF, KITCHEN, FINANCE): assigned locations only
   *
   * Note: Public ordering app uses forceAllLocations flag to bypass this
   * and show all locations to all users for ordering purposes.
   */
  async getUserAccessibleLocations(userId: string, userRole: UserRole) {
    if (userRole === UserRole.ADMIN) {
      // Only Admins have access to all active locations in internal apps
      return this.getAllLocations();
    }

    // STAFF, KITCHEN, and FINANCE roles: only assigned locations
    // If no locations are assigned, return empty array
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
   * Validates that the location exists and user has access to it
   */
  async updateUserLastLocation(userId: string, locationId: string, userRole: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify location exists and is active
      const location = await prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!location || !location.isActive) {
        return { success: false, error: 'Location not found or inactive' };
      }

      // For non-ADMIN users, verify they have access to this location
      if (userRole !== 'ADMIN') {
        const userLocation = await prisma.userLocation.findFirst({
          where: {
            userId,
            locationId,
          },
        });

        if (!userLocation) {
          return { success: false, error: 'Not authorized to access this location' };
        }
      }

      await prisma.user.update({
        where: { id: userId },
        data: { lastSelectedLocationId: locationId },
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to update location' };
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
