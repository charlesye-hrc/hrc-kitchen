import { Request, Response } from 'express';
import menuService from '../services/menu.service';
import configService from '../services/config.service';

export class MenuController {
  /**
   * GET /api/v1/menu/today
   * Get today's menu items
   * Optional query param: locationId
   */
  async getTodaysMenu(req: Request, res: Response) {
    try {
      const locationId = req.query.locationId as string | undefined;
      const result = await menuService.getTodaysMenu(locationId);
      const orderingWindow = await configService.isOrderingWindowActive();

      if (result.items.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            items: [],
            weekday: result.weekday,
            orderingWindow,
          },
          message: result.message,
        });
      }

      res.json({
        success: true,
        data: {
          items: result.items,
          weekday: result.weekday,
          orderingWindow,
        },
      });
    } catch (error) {
      console.error('Error fetching today\'s menu:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch menu',
      });
    }
  }

  /**
   * GET /api/v1/menu/week
   * Get full weekly menu (admin only)
   */
  async getWeeklyMenu(req: Request, res: Response) {
    try {
      const weeklyMenu = await menuService.getWeeklyMenu();

      res.json({
        success: true,
        data: weeklyMenu,
      });
    } catch (error) {
      console.error('Error fetching weekly menu:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch weekly menu',
      });
    }
  }

  /**
   * GET /api/v1/menu/items/:id
   * Get single menu item by ID
   */
  async getMenuItem(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const item = await menuService.getMenuItem(id);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Menu item not found',
        });
      }

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      console.error('Error fetching menu item:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch menu item',
      });
    }
  }
}

export default new MenuController();
