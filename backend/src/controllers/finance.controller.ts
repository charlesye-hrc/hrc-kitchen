import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import financeService from '../services/finance.service';
import { validateDateRange } from '../utils/validation';
import { ApiError } from '../middleware/errorHandler';

export class FinanceController {
  /**
   * GET /api/v1/finance/reports/daily-revenue
   * Get daily revenue report
   */
  async getDailyRevenueReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate, locationId } = req.query;

      const { start, end } = validateDateRange(
        startDate as string,
        endDate as string,
        { required: true }
      );

      const report = await financeService.getDailyRevenueReport(
        {
          startDate: start!,
          endDate: end!,
        },
        locationId as string | undefined
      );

      res.json({
        success: true,
        data: report,
      });
      return;
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
        return;
      }
      console.error('Error generating daily revenue report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate daily revenue report',
      });
      return;
    }
  }

  /**
   * GET /api/v1/finance/reports/order-details
   * Get detailed order report
   */
  async getOrderDetailsReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate, locationId } = req.query;

      const { start, end } = validateDateRange(
        startDate as string,
        endDate as string,
        { required: true }
      );

      const report = await financeService.getOrderDetailsReport(
        {
          startDate: start!,
          endDate: end!,
        },
        locationId as string | undefined
      );

      res.json({
        success: true,
        data: report,
      });
      return;
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
        return;
      }
      console.error('Error generating order details report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate order details report',
      });
      return;
    }
  }

  /**
   * GET /api/v1/finance/reports/menu-item-sales
   * Get menu item sales report
   */
  async getMenuItemSalesReport(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate, locationId } = req.query;

      const { start, end } = validateDateRange(
        startDate as string,
        endDate as string,
        { required: true }
      );

      const report = await financeService.getMenuItemSalesReport(
        {
          startDate: start!,
          endDate: end!,
        },
        locationId as string | undefined
      );

      res.json({
        success: true,
        data: report,
      });
      return;
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
        return;
      }
      console.error('Error generating menu item sales report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate menu item sales report',
      });
      return;
    }
  }

  /**
   * GET /api/v1/finance/reports/summary
   * Get summary statistics
   */
  async getSummaryStatistics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate, locationId } = req.query;

      const { start, end } = validateDateRange(
        startDate as string,
        endDate as string,
        { required: true }
      );

      const stats = await financeService.getSummaryStatistics(
        {
          startDate: start!,
          endDate: end!,
        },
        locationId as string | undefined
      );

      res.json({
        success: true,
        data: stats,
      });
      return;
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
        return;
      }
      console.error('Error generating summary statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate summary statistics',
      });
      return;
    }
  }
}

export default new FinanceController();
