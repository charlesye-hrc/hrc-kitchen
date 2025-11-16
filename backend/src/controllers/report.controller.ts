import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ReportService, ReportDateRange } from '../services/report.service';
import { PaymentStatus, OrderStatus, UserRole } from '@prisma/client';
import locationService from '../services/location.service';

export class ReportController {
  private reportService: ReportService;

  constructor() {
    this.reportService = new ReportService();
  }

  /**
   * Get allowed location IDs for the current user based on role
   * - ADMIN: null (all locations)
   * - KITCHEN/FINANCE: array of assigned location IDs
   */
  private async getAllowedLocationIds(req: AuthRequest): Promise<string[] | null> {
    const user = req.user!;

    // ADMIN users can access all locations
    if (user.role === UserRole.ADMIN) {
      return null;
    }

    // KITCHEN and FINANCE users are restricted to their assigned locations
    if (user.role === UserRole.KITCHEN || user.role === UserRole.FINANCE) {
      const assignedLocations = await locationService.getUserAssignedLocations(user.id);
      return assignedLocations.map(loc => loc.id);
    }

    // Default: no locations (shouldn't happen based on route authorization)
    return [];
  }

  /**
   * Get revenue by user report
   * GET /api/v1/admin/reports/revenue-by-user?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&format=json|csv
   * KITCHEN/FINANCE users are restricted to their assigned locations
   */
  getRevenueByUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, format = 'json', locationId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'startDate and endDate are required'
        });
        return;
      }

      // Get allowed locations based on user role
      const allowedLocationIds = await this.getAllowedLocationIds(req);

      const dateRange: ReportDateRange = {
        startDate: startDate as string,
        endDate: endDate as string,
        locationId: locationId as string | undefined,
        allowedLocationIds
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
   * KITCHEN/FINANCE users are restricted to their assigned locations
   */
  getPopularItems = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, format = 'json', locationId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'startDate and endDate are required'
        });
        return;
      }

      // Get allowed locations based on user role
      const allowedLocationIds = await this.getAllowedLocationIds(req);

      const dateRange: ReportDateRange = {
        startDate: startDate as string,
        endDate: endDate as string,
        locationId: locationId as string | undefined,
        allowedLocationIds
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
   * KITCHEN/FINANCE users are restricted to their assigned locations
   */
  getSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, locationId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'startDate and endDate are required'
        });
        return;
      }

      // Get allowed locations based on user role
      const allowedLocationIds = await this.getAllowedLocationIds(req);

      const dateRange: ReportDateRange = {
        startDate: startDate as string,
        endDate: endDate as string,
        locationId: locationId as string | undefined,
        allowedLocationIds
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
   * KITCHEN/FINANCE users are restricted to their assigned locations
   */
  getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, paymentStatus, fulfillmentStatus, format = 'json', locationId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'startDate and endDate are required'
        });
        return;
      }

      // Get allowed locations based on user role
      const allowedLocationIds = await this.getAllowedLocationIds(req);

      const dateRange: ReportDateRange = {
        startDate: startDate as string,
        endDate: endDate as string,
        locationId: locationId as string | undefined,
        allowedLocationIds
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
