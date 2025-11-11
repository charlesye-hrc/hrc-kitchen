import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import financeController from '../controllers/finance.controller';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication and FINANCE or ADMIN role
router.use(authenticate);
router.use(authorize(UserRole.FINANCE, UserRole.ADMIN));

// GET /api/v1/finance/reports/daily-revenue - Get daily revenue report
router.get('/reports/daily-revenue', financeController.getDailyRevenueReport.bind(financeController));

// GET /api/v1/finance/reports/order-details - Get detailed order report
router.get('/reports/order-details', financeController.getOrderDetailsReport.bind(financeController));

// GET /api/v1/finance/reports/menu-item-sales - Get menu item sales report
router.get('/reports/menu-item-sales', financeController.getMenuItemSalesReport.bind(financeController));

// GET /api/v1/finance/reports/summary - Get summary statistics
router.get('/reports/summary', financeController.getSummaryStatistics.bind(financeController));

export default router;
