import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { inventoryService } from '../services/inventory.service';
import { InventoryChangeType } from '@prisma/client';

/**
 * Get inventory for a specific location (Kitchen Staff)
 */
export const getInventoryByLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { locationId } = req.params;

    const inventories = await inventoryService.getInventoryByLocation(
      locationId
    );

    res.json({
      success: true,
      data: inventories,
    });
    return;
  } catch (error: any) {
    console.error('Error fetching inventory by location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory',
      error: error.message,
    });
    return;
  }
};

/**
 * Get all inventory across all locations (Admin only)
 */
export const getAllInventory = async (_req: Request, res: Response): Promise<void> => {
  try {
    const inventories = await inventoryService.getAllInventory();

    res.json({
      success: true,
      data: inventories,
    });
    return;
  } catch (error: any) {
    console.error('Error fetching all inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory',
      error: error.message,
    });
    return;
  }
};

/**
 * Get inventory for a specific menu item at a location
 */
export const getInventoryByMenuItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { menuItemId, locationId } = req.params;

    const inventory = await inventoryService.getInventory(
      menuItemId,
      locationId
    );

    if (!inventory) {
      res.status(404).json({
        success: false,
        message: 'Inventory not found',
      });
      return;
    }

    res.json({
      success: true,
      data: inventory,
    });
    return;
  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory',
      error: error.message,
    });
    return;
  }
};

/**
 * Get low stock items for a location
 */
export const getLowStockItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { locationId } = req.params;

    const lowStockItems = await inventoryService.getLowStockItems(locationId);

    res.json({
      success: true,
      data: lowStockItems,
    });
    return;
  } catch (error: any) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock items',
      error: error.message,
    });
    return;
  }
};

/**
 * Update inventory for a menu item at a location (Kitchen Staff)
 */
export const updateInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { menuItemId, locationId } = req.params;
    const { stockQuantity, lowStockThreshold, isAvailable, reason } = req.body;
    const userId = req.user?.id;

    if (stockQuantity === undefined) {
      res.status(400).json({
        success: false,
        message: 'stockQuantity is required',
      });
      return;
    }

    const updatedInventory = await inventoryService.updateInventory(
      menuItemId,
      locationId,
      {
        stockQuantity,
        lowStockThreshold,
        isAvailable,
      },
      InventoryChangeType.ADJUSTMENT,
      userId,
      reason
    );

    res.json({
      success: true,
      message: 'Inventory updated successfully',
      data: updatedInventory,
    });
    return;
  } catch (error: any) {
    console.error('Error updating inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update inventory',
      error: error.message,
    });
    return;
  }
};

/**
 * Restock inventory (Kitchen Staff)
 */
export const restockInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { menuItemId, locationId } = req.params;
    const { quantity, reason } = req.body;
    const userId = req.user?.id;

    if (!quantity || quantity <= 0) {
      res.status(400).json({
        success: false,
        message: 'Valid quantity is required',
      });
      return;
    }

    // Get current inventory
    const currentInventory = await inventoryService.getInventory(
      menuItemId,
      locationId
    );

    const newQuantity = (currentInventory?.stockQuantity || 0) + quantity;

    const updatedInventory = await inventoryService.updateInventory(
      menuItemId,
      locationId,
      {
        stockQuantity: newQuantity,
        isAvailable: true, // Enable availability when restocking
      },
      InventoryChangeType.RESTOCK,
      userId,
      reason || 'Restock'
    );

    res.json({
      success: true,
      message: 'Inventory restocked successfully',
      data: updatedInventory,
    });
    return;
  } catch (error: any) {
    console.error('Error restocking inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restock inventory',
      error: error.message,
    });
    return;
  }
};

/**
 * Bulk update inventory (Admin only)
 */
export const bulkUpdateInventory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { updates, reason } = req.body;
    const userId = req.user?.id;

    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Updates array is required',
      });
      return;
    }

    const results = await inventoryService.bulkUpdateInventory(
      updates,
      userId,
      reason
    );

    res.json({
      success: true,
      message: `${results.length} inventory records updated successfully`,
      data: results,
    });
    return;
  } catch (error: any) {
    console.error('Error bulk updating inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update inventory',
      error: error.message,
    });
    return;
  }
};

/**
 * Check inventory availability for cart items
 */
export const checkAvailability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Items array is required',
      });
      return;
    }

    const results = await inventoryService.checkBulkAvailability(items);

    const allAvailable = results.every((result) => result.available);
    const unavailableItems = results.filter((result) => !result.available);

    res.json({
      success: true,
      allAvailable,
      results,
      unavailableItems,
    });
    return;
  } catch (error: any) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check availability',
      error: error.message,
    });
    return;
  }
};

/**
 * Get inventory history
 */
export const getInventoryHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { locationId, menuItemId } = req.query;
    const limit = parseInt(req.query.limit as string) || 100;

    const history = await inventoryService.getInventoryHistory(
      locationId as string,
      menuItemId as string,
      limit
    );

    res.json({
      success: true,
      data: history,
    });
    return;
  } catch (error: any) {
    console.error('Error fetching inventory history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory history',
      error: error.message,
    });
    return;
  }
};

/**
 * Toggle inventory tracking for a menu item (Admin only)
 */
export const toggleInventoryTracking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { menuItemId } = req.params;
    const { trackInventory } = req.body;

    if (trackInventory === undefined) {
      res.status(400).json({
        success: false,
        message: 'trackInventory is required',
      });
      return;
    }

    const menuItem = await inventoryService.toggleInventoryTracking(
      menuItemId,
      trackInventory
    );

    res.json({
      success: true,
      message: `Inventory tracking ${trackInventory ? 'enabled' : 'disabled'} for menu item`,
      data: menuItem,
    });
    return;
  } catch (error: any) {
    console.error('Error toggling inventory tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle inventory tracking',
      error: error.message,
    });
    return;
  }
};

/**
 * Initialize inventory for a menu item (Admin only)
 */
export const initializeInventory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { menuItemId } = req.params;

    const inventories =
      await inventoryService.initializeInventoryForMenuItem(menuItemId);

    res.json({
      success: true,
      message: `Inventory initialized for ${inventories.length} locations`,
      data: inventories,
    });
    return;
  } catch (error: any) {
    console.error('Error initializing inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize inventory',
      error: error.message,
    });
    return;
  }
};
