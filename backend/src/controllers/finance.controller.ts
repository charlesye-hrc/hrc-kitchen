import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import financeService from '../services/finance.service';

export class FinanceController {
  /**
   * GET /api/v1/finance/reports/daily-revenue
   * Get daily revenue report
   */
  async getDailyRevenueReport(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate, locationId } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await financeService.getDailyRevenueReport(
        {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string),
        },
        locationId as string | undefined
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error generating daily revenue report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate daily revenue report',
      });
    }
  }

  /**
   * GET /api/v1/finance/reports/order-details
   * Get detailed order report
   */
  async getOrderDetailsReport(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate, locationId } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await financeService.getOrderDetailsReport(
        {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string),
        },
        locationId as string | undefined
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error generating order details report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate order details report',
      });
    }
  }

  /**
   * GET /api/v1/finance/reports/menu-item-sales
   * Get menu item sales report
   */
  async getMenuItemSalesReport(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate, locationId } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const report = await financeService.getMenuItemSalesReport(
        {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string),
        },
        locationId as string | undefined
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Error generating menu item sales report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate menu item sales report',
      });
    }
  }

  /**
   * GET /api/v1/finance/reports/summary
   * Get summary statistics
   */
  async getSummaryStatistics(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate, locationId } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
      }

      const stats = await financeService.getSummaryStatistics(
        {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string),
        },
        locationId as string | undefined
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error generating summary statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate summary statistics',
      });
    }
  }
}

export default new FinanceController();
