import { Request, Response } from 'express';
import { ReportService, ReportDateRange } from '../services/report.service';
import { PaymentStatus, OrderStatus } from '@prisma/client';

export class ReportController {
  private reportService: ReportService;

  constructor() {
    this.reportService = new ReportService();
  }

  /**
   * Get revenue by user report
   * GET /api/v1/admin/reports/revenue-by-user?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&format=json|csv
   */
  getRevenueByUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, format = 'json', locationId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'startDate and endDate are required'
        });
        return;
      }

      const dateRange: ReportDateRange = {
        startDate: startDate as string,
        endDate: endDate as string,
        locationId: locationId as string | undefined
      };

      const data = await this.reportService.getRevenueByUser(dateRange);

      if (format === 'csv') {
        const csv = this.reportService.exportToCSV(data, 'revenue-by-user');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=revenue-by-user-${startDate}-${endDate}.csv`);
        res.send(csv);
        return;
      }

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error generating revenue by user report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate revenue by user report'
      });
    }
  };

  /**
   * Get popular items report
   * GET /api/v1/admin/reports/popular-items?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&format=json|csv
   */
  getPopularItems = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, format = 'json', locationId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'startDate and endDate are required'
        });
        return;
      }

      const dateRange: ReportDateRange = {
        startDate: startDate as string,
        endDate: endDate as string,
        locationId: locationId as string | undefined
      };

      const data = await this.reportService.getPopularItems(dateRange);

      if (format === 'csv') {
        const csv = this.reportService.exportToCSV(data, 'popular-items');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=popular-items-${startDate}-${endDate}.csv`);
        res.send(csv);
        return;
      }

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error generating popular items report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate popular items report'
      });
    }
  };

  /**
   * Get summary statistics report
   * GET /api/v1/admin/reports/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  getSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, locationId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'startDate and endDate are required'
        });
        return;
      }

      const dateRange: ReportDateRange = {
        startDate: startDate as string,
        endDate: endDate as string,
        locationId: locationId as string | undefined
      };

      const data = await this.reportService.getSummaryReport(dateRange);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error generating summary report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate summary report'
      });
    }
  };

  /**
   * Get detailed orders report
   * GET /api/v1/admin/reports/orders?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&paymentStatus=COMPLETED&fulfillmentStatus=FULFILLED&format=json|csv
   */
  getOrders = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, paymentStatus, fulfillmentStatus, format = 'json' } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'startDate and endDate are required'
        });
        return;
      }

      const dateRange: ReportDateRange = {
        startDate: startDate as string,
        endDate: endDate as string
      };

      const filters: any = {};
      if (paymentStatus) {
        filters.paymentStatus = paymentStatus as PaymentStatus;
      }
      if (fulfillmentStatus) {
        filters.fulfillmentStatus = fulfillmentStatus as OrderStatus;
      }

      const data = await this.reportService.getOrdersReport(dateRange, filters);

      if (format === 'csv') {
        const csv = this.reportService.exportToCSV(data, 'orders');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=orders-${startDate}-${endDate}.csv`);
        res.send(csv);
        return;
      }

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error generating orders report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate orders report'
      });
    }
  };
}

export default new ReportController();
