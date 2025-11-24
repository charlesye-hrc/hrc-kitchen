import { PrismaClient, InventoryChangeType, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface InventoryCheckResult {
  available: boolean;
  currentStock: number;
  requested: number;
  menuItemId: string;
  locationId: string;
}

interface InventoryUpdateData {
  stockQuantity?: number;
  lowStockThreshold?: number;
  isAvailable?: boolean;
}

export class InventoryService {
  /**
   * Get inventory for a specific menu item at a location
   */
  async getInventory(menuItemId: string, locationId: string) {
    const inventory = await prisma.inventory.findUnique({
      where: {
        menuItemId_locationId: {
          menuItemId,
          locationId,
        },
      },
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
            trackInventory: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return inventory;
  }

  /**
   * Get all inventory for a location
   */
  async getInventoryByLocation(locationId: string) {
    const inventories = await prisma.inventory.findMany({
      where: {
        locationId,
        menuItem: {
          trackInventory: true, // Only show items with inventory tracking enabled
        },
      },
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
            category: true,
            imageUrl: true,
            trackInventory: true,
          },
        },
      },
      orderBy: [
        { stockQuantity: 'asc' }, // Low stock first
        { menuItem: { name: 'asc' } },
      ],
    });

    return inventories;
  }

  /**
   * Get all inventory across all locations (admin only)
   */
  async getAllInventory() {
    const inventories = await prisma.inventory.findMany({
      where: {
        menuItem: {
          trackInventory: true,
        },
      },
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
            category: true,
            imageUrl: true,
            trackInventory: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { location: { name: 'asc' } },
        { stockQuantity: 'asc' },
        { menuItem: { name: 'asc' } },
      ],
    });

    return inventories;
  }

  /**
   * Get low stock items for a location
   */
  async getLowStockItems(locationId: string) {
    const lowStockItems = await prisma.inventory.findMany({
      where: {
        locationId,
        menuItem: {
          trackInventory: true,
        },
        OR: [
          {
            stockQuantity: {
              lte: prisma.inventory.fields.lowStockThreshold,
            },
          },
          {
            isAvailable: false,
          },
        ],
      },
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
            category: true,
            trackInventory: true,
          },
        },
      },
      orderBy: {
        stockQuantity: 'asc',
      },
    });

    return lowStockItems;
  }

  /**
   * Check if sufficient inventory is available for an order
   */
  async checkAvailability(
    menuItemId: string,
    locationId: string,
    requestedQuantity: number
  ): Promise<InventoryCheckResult> {
    // First check if the menu item has inventory tracking enabled
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      select: { trackInventory: true },
    });

    // If inventory tracking is disabled, always return available
    if (!menuItem || !menuItem.trackInventory) {
      return {
        available: true,
        currentStock: -1, // Unlimited
        requested: requestedQuantity,
        menuItemId,
        locationId,
      };
    }

    // Get current inventory
    const inventory = await this.getInventory(menuItemId, locationId);

    if (!inventory) {
      // No inventory record means not available
      return {
        available: false,
        currentStock: 0,
        requested: requestedQuantity,
        menuItemId,
        locationId,
      };
    }

    const available =
      inventory.isAvailable && inventory.stockQuantity >= requestedQuantity;

    return {
      available,
      currentStock: inventory.stockQuantity,
      requested: requestedQuantity,
      menuItemId,
      locationId,
    };
  }

  /**
   * Check availability for multiple items (for cart validation)
   */
  async checkBulkAvailability(
    items: { menuItemId: string; locationId: string; quantity: number }[]
  ): Promise<InventoryCheckResult[]> {
    const results = await Promise.all(
      items.map((item) =>
        this.checkAvailability(item.menuItemId, item.locationId, item.quantity)
      )
    );

    return results;
  }

  /**
   * Deduct inventory for an order (called within transaction)
   */
  async deductInventory(
    menuItemId: string,
    locationId: string,
    quantity: number,
    orderId: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;

    // Check if inventory tracking is enabled
    const menuItem = await client.menuItem.findUnique({
      where: { id: menuItemId },
      select: { trackInventory: true },
    });

    // Skip deduction if tracking is disabled
    if (!menuItem || !menuItem.trackInventory) {
      return null;
    }

    // Get current inventory
    const inventory = await client.inventory.findUnique({
      where: {
        menuItemId_locationId: {
          menuItemId,
          locationId,
        },
      },
    });

    if (!inventory) {
      throw new Error(
        `Inventory record not found for menu item ${menuItemId} at location ${locationId}`
      );
    }

    if (inventory.stockQuantity < quantity) {
      throw new Error(
        `Insufficient inventory for menu item ${menuItemId}. Available: ${inventory.stockQuantity}, Requested: ${quantity}`
      );
    }

    const previousQty = inventory.stockQuantity;
    const newQty = previousQty - quantity;

    // Update inventory
    const updatedInventory = await client.inventory.update({
      where: {
        menuItemId_locationId: {
          menuItemId,
          locationId,
        },
      },
      data: {
        stockQuantity: newQty,
        isAvailable: newQty > 0, // Auto-disable if out of stock
      },
    });

    // Create history record
    await client.inventoryHistory.create({
      data: {
        inventoryId: inventory.id,
        changeType: InventoryChangeType.ORDER,
        quantity: -quantity, // Negative for deduction
        previousQty,
        newQty,
        orderId,
      },
    });

    return updatedInventory;
  }

  /**
   * Update inventory manually (restock, adjustment, etc.)
   */
  async updateInventory(
    menuItemId: string,
    locationId: string,
    data: InventoryUpdateData,
    changeType: InventoryChangeType,
    userId?: string,
    reason?: string
  ) {
    // Get current inventory
    let inventory = await this.getInventory(menuItemId, locationId);

    // Create inventory record if it doesn't exist
    if (!inventory) {
      inventory = await prisma.inventory.create({
        data: {
          menuItemId,
          locationId,
          stockQuantity: data.stockQuantity || 0,
          lowStockThreshold: data.lowStockThreshold || 5,
          isAvailable: data.isAvailable ?? true,
        },
        include: {
          menuItem: {
            select: {
              id: true,
              name: true,
              trackInventory: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }

    const previousQty = inventory.stockQuantity;
    const newQty = data.stockQuantity ?? previousQty;
    const quantityChange = newQty - previousQty;

    // Automatically update isAvailable based on stock quantity
    // If stockQuantity is explicitly provided and is 0, set isAvailable to false
    // If stockQuantity is explicitly provided and is > 0, set isAvailable to true
    const updateData: any = { ...data };
    if (data.stockQuantity !== undefined) {
      updateData.isAvailable = data.stockQuantity > 0;
    }
    if (changeType === InventoryChangeType.RESTOCK) {
      updateData.lastRestocked = new Date();
    }

    // Update inventory
    const updatedInventory = await prisma.inventory.update({
      where: {
        menuItemId_locationId: {
          menuItemId,
          locationId,
        },
      },
      data: updateData,
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
            trackInventory: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create history record if quantity changed
    if (quantityChange !== 0) {
      await prisma.inventoryHistory.create({
        data: {
          inventoryId: updatedInventory.id,
          changeType,
          quantity: quantityChange,
          previousQty,
          newQty,
          userId,
          reason,
        },
      });
    }

    return updatedInventory;
  }

  /**
   * Bulk update inventory for multiple items
   */
  async bulkUpdateInventory(
    updates: {
      menuItemId: string;
      locationId: string;
      stockQuantity: number;
    }[],
    userId?: string,
    reason?: string
  ) {
    const results = await Promise.all(
      updates.map((update) =>
        this.updateInventory(
          update.menuItemId,
          update.locationId,
          { stockQuantity: update.stockQuantity },
          InventoryChangeType.ADJUSTMENT,
          userId,
          reason
        )
      )
    );

    return results;
  }

  /**
   * Initialize inventory for a menu item at all its assigned locations
   */
  async initializeInventoryForMenuItem(menuItemId: string) {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        menuItemLocations: true,
      },
    });

    if (!menuItem || !menuItem.trackInventory) {
      return [];
    }

    const inventories = await Promise.all(
      menuItem.menuItemLocations.map(async (mil) => {
        // Check if inventory already exists
        const existing = await this.getInventory(menuItemId, mil.locationId);
        if (existing) {
          return existing;
        }

        // Create new inventory record
        return await prisma.inventory.create({
          data: {
            menuItemId,
            locationId: mil.locationId,
            stockQuantity: 0,
            lowStockThreshold: 5,
            isAvailable: false, // Start as unavailable until stocked
          },
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                trackInventory: true,
              },
            },
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      })
    );

    return inventories;
  }

  /**
   * Get inventory history for a location
   */
  async getInventoryHistory(
    locationId?: string,
    menuItemId?: string,
    limit: number = 100
  ) {
    const history = await prisma.inventoryHistory.findMany({
      where: {
        ...(locationId && {
          inventory: {
            locationId,
          },
        }),
        ...(menuItemId && {
          inventory: {
            menuItemId,
          },
        }),
      },
      include: {
        inventory: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
              },
            },
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return history;
  }

  /**
   * Toggle inventory tracking for a menu item
   */
  async toggleInventoryTracking(menuItemId: string, trackInventory: boolean) {
    const menuItem = await prisma.menuItem.update({
      where: { id: menuItemId },
      data: { trackInventory },
    });

    // If enabling tracking, initialize inventory records
    if (trackInventory) {
      await this.initializeInventoryForMenuItem(menuItemId);
    }

    return menuItem;
  }
}

export const inventoryService = new InventoryService();
