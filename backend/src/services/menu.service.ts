import { Weekday } from '@prisma/client';
import prisma from '../lib/prisma';

export class MenuService {
  /**
   * Get current weekday as Prisma enum
   */
  private getCurrentWeekday(): Weekday | null {
    const day = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    const weekdayMap: { [key: number]: Weekday } = {
      0: 'SUNDAY',
      1: 'MONDAY',
      2: 'TUESDAY',
      3: 'WEDNESDAY',
      4: 'THURSDAY',
      5: 'FRIDAY',
      6: 'SATURDAY',
    };

    return weekdayMap[day] || null;
  }

  /**
   * Get today's menu items (current weekday only)
   * Optionally filtered by location
   */
  async getTodaysMenu(locationId?: string) {
    const weekday = this.getCurrentWeekday();

    if (!weekday) {
      return {
        items: [],
        message: 'Unable to determine current day',
        weekday: null,
      };
    }

    let items;

    if (locationId) {
      // Get menu items filtered by location
      const menuItemLocations = await prisma.menuItemLocation.findMany({
        where: {
          locationId,
          menuItem: {
            weekdays: {
              has: weekday,
            },
          },
        },
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
              inventories: {
                where: {
                  locationId,
                },
                select: {
                  stockQuantity: true,
                  isAvailable: true,
                  lowStockThreshold: true,
                },
              },
            },
          },
        },
      });

      // Filter out items with insufficient inventory (only for items with tracking enabled)
      items = menuItemLocations
        .map(mil => mil.menuItem)
        .filter(item => {
          // If item doesn't track inventory, always include it
          if (!item.trackInventory) {
            return true;
          }

          // If item tracks inventory, check if it has stock
          const inventory = item.inventories[0]; // Should be only one for this location
          if (!inventory) {
            return false; // No inventory record = not available
          }

          return inventory.isAvailable && inventory.stockQuantity > 0;
        });
    } else {
      // Get all menu items (no location filter)
      items = await prisma.menuItem.findMany({
        where: {
          weekdays: {
            has: weekday,
          },
        },
        include: {
          customizations: true,
          variationGroups: {
            where: {},
            include: {
              options: {
                orderBy: { displayOrder: 'asc' },
              },
            },
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' },
        ],
      });
    }

    return {
      items,
      weekday,
      message: items.length > 0 ? null : 'No menu items available for today',
    };
  }

  /**
   * Get full weekly menu (all weekdays) - Admin only
   */
  async getWeeklyMenu() {
    const items = await prisma.menuItem.findMany({
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
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    // Group by weekday - items can appear in multiple days
    const groupedByWeekday = {
      MONDAY: items.filter(item => item.weekdays.includes('MONDAY')),
      TUESDAY: items.filter(item => item.weekdays.includes('TUESDAY')),
      WEDNESDAY: items.filter(item => item.weekdays.includes('WEDNESDAY')),
      THURSDAY: items.filter(item => item.weekdays.includes('THURSDAY')),
      FRIDAY: items.filter(item => item.weekdays.includes('FRIDAY')),
      SATURDAY: items.filter(item => item.weekdays.includes('SATURDAY')),
      SUNDAY: items.filter(item => item.weekdays.includes('SUNDAY')),
    };

    return groupedByWeekday;
  }

  /**
   * Get menu item by ID with customizations and variations
   */
  async getMenuItem(itemId: string) {
    const item = await prisma.menuItem.findUnique({
      where: { id: itemId },
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
    });

    return item;
  }

  /**
   * Get all menu items with optional filters
   * Admin endpoint for management purposes
   */
  async getAllMenuItems(filters?: {
    weekday?: Weekday;
    category?: string;
    trackInventory?: boolean;
    locationId?: string;
  }) {
    const where: any = {};

    // Filter by weekday
    if (filters?.weekday) {
      where.weekdays = { has: filters.weekday };
    }

    // Filter by category
    if (filters?.category) {
      where.category = filters.category;
    }

    // Filter by inventory tracking
    if (filters?.trackInventory !== undefined) {
      where.trackInventory = filters.trackInventory;
    }

    // Filter by location
    if (filters?.locationId) {
      where.menuItemLocations = {
        some: {
          locationId: filters.locationId,
        },
      };
    }

    const items = await prisma.menuItem.findMany({
      where,
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
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });

    return items;
  }
}

export default new MenuService();
