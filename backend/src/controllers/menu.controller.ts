import { Request, Response } from 'express';
import menuService from '../services/menu.service';
import configService from '../services/config.service';

export class MenuController {
  /**
   * GET /api/v1/menu/today
   * Get today's menu items
   * Optional query param: locationId
   */
  async getTodaysMenu(req: Request, res: Response): Promise<void> {
    try {
      const locationId = req.query.locationId as string | undefined;
      const result = await menuService.getTodaysMenu(locationId);
      const orderingWindow = await configService.isOrderingWindowActive();

      if (result.items.length === 0) {
        res.status(200).json({
          success: true,
          data: {
            items: [],
            weekday: result.weekday,
            orderingWindow,
          },
          message: result.message,
        });
        return;
      }

      res.json({
        success: true,
        data: {
          items: result.items,
          weekday: result.weekday,
          orderingWindow,
        },
      });
      return;
    } catch (error) {
      console.error('Error fetching today\'s menu:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch menu',
      });
      return;
    }
  }

  /**
   * GET /api/v1/menu/week
   * Get full weekly menu (admin only)
   */
  async getWeeklyMenu(_req: Request, res: Response): Promise<void> {
    try {
      const weeklyMenu = await menuService.getWeeklyMenu();

      res.json({
        success: true,
        data: weeklyMenu,
      });
      return;
    } catch (error) {
      console.error('Error fetching weekly menu:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch weekly menu',
      });
      return;
    }
  }

  /**
   * GET /api/v1/menu/items/:id
   * Get single menu item by ID
   */
  async getMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const item = await menuService.getMenuItem(id);

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
      });
      return;
    } catch (error) {
      console.error('Error fetching menu item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch menu item',
      });
      return;
    }
  }

  /**
   * GET /api/v1/menu/items
   * Get all menu items with optional filters
   * Query params: weekday, category, trackInventory, locationId
   */
  async getAllMenuItems(req: Request, res: Response): Promise<void> {
    try {
      const { weekday, category, trackInventory, locationId } = req.query;

      const filters: any = {};

      if (weekday) {
        filters.weekday = weekday as string;
      }

      if (category) {
        filters.category = category as string;
      }

      if (trackInventory !== undefined) {
        filters.trackInventory = trackInventory === 'true';
      }

      if (locationId) {
        filters.locationId = locationId as string;
      }

      const items = await menuService.getAllMenuItems(filters);

      res.json({
        success: true,
        data: items,
      });
      return;
    } catch (error) {
      console.error('Error fetching all menu items:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch menu items',
      });
      return;
    }
  }
}

export default new MenuController();
