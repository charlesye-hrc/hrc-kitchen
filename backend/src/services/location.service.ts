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
   * Delete a location (Admin only)
   * Note: This will fail if there are orders associated with this location
   */
  async deleteLocation(locationId: string) {
    try {
      await prisma.location.delete({
        where: { id: locationId },
      });
      return true;
    } catch (error) {
      return false;
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
