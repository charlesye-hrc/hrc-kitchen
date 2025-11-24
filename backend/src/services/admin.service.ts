import { Weekday, MenuCategory, UserRole } from '@prisma/client';
import prisma from '../lib/prisma';
import {
  CreateVariationGroupInput,
  UpdateVariationGroupInput,
  CreateVariationOptionInput,
  UpdateVariationOptionInput,
} from '../types/variation.types';

interface CreateMenuItemData {
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  weekdays: Weekday[];
  imageUrl?: string;
  dietaryTags?: string[];
}

interface UpdateMenuItemData {
  name?: string;
  description?: string;
  price?: number;
  category?: MenuCategory;
  weekdays?: Weekday[];
  imageUrl?: string;
  dietaryTags?: string[];
  trackInventory?: boolean;
}

interface UserFilters {
  role?: UserRole;
  search?: string;
  isActive?: boolean;
}

export class AdminService {
  /**
   * Create a new menu item
   */
  async createMenuItem(data: CreateMenuItemData) {
    const item = await prisma.menuItem.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        category: data.category,
        weekdays: data.weekdays,
        imageUrl: data.imageUrl || null,
        dietaryTags: data.dietaryTags || [],
      },
      include: {
        customizations: true,
      },
    });

    return item;
  }

  /**
   * Update a menu item
   */
  async updateMenuItem(itemId: string, data: UpdateMenuItemData) {
    try {
      // Check if we're enabling inventory tracking
      const shouldInitializeInventory = data.trackInventory === true;
      let wasTrackingDisabled = false;

      if (shouldInitializeInventory) {
        const currentItem = await prisma.menuItem.findUnique({
          where: { id: itemId },
          select: { trackInventory: true },
        });
        wasTrackingDisabled = !currentItem?.trackInventory;
      }

      const item = await prisma.menuItem.update({
        where: { id: itemId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.price !== undefined && { price: data.price }),
          ...(data.category !== undefined && { category: data.category }),
          ...(data.weekdays !== undefined && { weekdays: data.weekdays }),
          ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
          ...(data.dietaryTags !== undefined && { dietaryTags: data.dietaryTags }),
          ...(data.trackInventory !== undefined && { trackInventory: data.trackInventory }),
        },
        include: {
          customizations: true,
        },
      });

      // Initialize inventory if we just enabled tracking
      if (shouldInitializeInventory && wasTrackingDisabled) {
        const { inventoryService } = await import('./inventory.service');
        await inventoryService.initializeInventoryForMenuItem(itemId);
      }

      return item;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete a menu item permanently
   * Cascades: customizations, variations, location assignments
   * Orders: preserved via snapshots (menuItemId set to null)
   */
  async deleteMenuItem(itemId: string) {
    await prisma.menuItem.delete({
      where: { id: itemId },
    });
  }

  /**
   * Add a customization option to a menu item
   */
  async addCustomization(menuItemId: string, name: string) {
    const customization = await prisma.menuItemCustomization.create({
      data: {
        menuItemId,
        customizationName: name,
      },
    });

    return customization;
  }

  /**
   * Delete a customization option
   */
  async deleteCustomization(customizationId: string) {
    await prisma.menuItemCustomization.delete({
      where: { id: customizationId },
    });
  }

  /**
   * Get a single user by ID
   */
  async getUserById(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          department: true,
          location: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all users with pagination and filtering
   */
  async getUsers(page: number = 1, limit: number = 20, filters: UserFilters = {}) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      // Exclude users with pending invitations (have invitationToken and no password)
      AND: [
        {
          OR: [
            { invitationToken: null },
            { passwordHash: { not: null } }
          ]
        }
      ]
    };

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          fullName: true,
          department: true,
          location: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          userLocations: {
            include: {
              location: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
    };
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: UserRole) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      return user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update user active status
   */
  async updateUserStatus(userId: string, isActive: boolean) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      return user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete a user
   * Performs hard delete from database
   */
  async deleteUser(userId: string) {
    try {
      await prisma.user.delete({
        where: { id: userId },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all system configuration as key-value pairs
   */
  async getConfig() {
    const configs = await prisma.systemConfig.findMany();

    // Convert to key-value object
    const configObject: Record<string, string> = {};
    configs.forEach(config => {
      configObject[config.configKey] = config.configValue;
    });

    return configObject;
  }

  /**
   * Update system configuration
   */
  async updateConfig(updates: { orderingWindowStart?: string; orderingWindowEnd?: string; restrictedRoleDomain?: string }) {
    const updatePromises = [];

    if (updates.orderingWindowStart) {
      updatePromises.push(
        prisma.systemConfig.upsert({
          where: { configKey: 'ordering_window_start' },
          update: { configValue: updates.orderingWindowStart },
          create: { configKey: 'ordering_window_start', configValue: updates.orderingWindowStart },
        })
      );
    }

    if (updates.orderingWindowEnd) {
      updatePromises.push(
        prisma.systemConfig.upsert({
          where: { configKey: 'ordering_window_end' },
          update: { configValue: updates.orderingWindowEnd },
          create: { configKey: 'ordering_window_end', configValue: updates.orderingWindowEnd },
        })
      );
    }

    if (updates.restrictedRoleDomain !== undefined) {
      updatePromises.push(
        prisma.systemConfig.upsert({
          where: { configKey: 'restricted_role_domain' },
          update: { configValue: updates.restrictedRoleDomain },
          create: { configKey: 'restricted_role_domain', configValue: updates.restrictedRoleDomain },
        })
      );
    }

    await Promise.all(updatePromises);

    // Return updated config
    return this.getConfig();
  }

  // ==================== VARIATION GROUP OPERATIONS ====================

  /**
   * Create a variation group for a menu item
   */
  async createVariationGroup(data: CreateVariationGroupInput) {
    const group = await prisma.variationGroup.create({
      data: {
        menuItemId: data.menuItemId,
        name: data.name,
        type: data.type,
        required: data.required ?? false,
        displayOrder: data.displayOrder ?? 0,
      },
      include: {
        options: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return group;
  }

  /**
   * Update a variation group
   */
  async updateVariationGroup(groupId: string, data: UpdateVariationGroupInput) {
    try {
      const group = await prisma.variationGroup.update({
        where: { id: groupId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.required !== undefined && { required: data.required }),
          ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
        },
        include: {
          options: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      });

      return group;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete a variation group (cascade deletes options)
   */
  async deleteVariationGroup(groupId: string) {
    await prisma.variationGroup.delete({
      where: { id: groupId },
    });
  }

  /**
   * Get all variation groups for a menu item
   */
  async getVariationGroups(menuItemId: string) {
    const groups = await prisma.variationGroup.findMany({
      where: { menuItemId },
      include: {
        options: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    return groups;
  }

  // ==================== VARIATION OPTION OPERATIONS ====================

  /**
   * Create a variation option
   */
  async createVariationOption(data: CreateVariationOptionInput) {
    const option = await prisma.variationOption.create({
      data: {
        variationGroupId: data.variationGroupId,
        name: data.name,
        priceModifier: data.priceModifier ?? 0,
        isDefault: data.isDefault ?? false,
        displayOrder: data.displayOrder ?? 0,
      },
    });

    return option;
  }

  /**
   * Update a variation option
   */
  async updateVariationOption(optionId: string, data: UpdateVariationOptionInput) {
    try {
      const option = await prisma.variationOption.update({
        where: { id: optionId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.priceModifier !== undefined && { priceModifier: data.priceModifier }),
          ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
          ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
        },
      });

      return option;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete a variation option
   */
  async deleteVariationOption(optionId: string) {
    await prisma.variationOption.delete({
      where: { id: optionId },
    });
  }

  /**
   * Get all options for a variation group
   */
  async getVariationOptions(groupId: string) {
    const options = await prisma.variationOption.findMany({
      where: { variationGroupId: groupId },
      orderBy: { displayOrder: 'asc' },
    });

    return options;
  }
}

export default new AdminService();
