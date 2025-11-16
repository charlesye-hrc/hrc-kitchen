import { Router, Request, Response } from 'express';
import { KitchenService } from '../services/kitchen.service';
import { authenticate, authorize } from '../middleware/auth';
import { validateAdminDomain } from '../middleware/domainValidation';
import { OrderStatus } from '@prisma/client';

const router = Router();
const kitchenService = new KitchenService();

// All routes require authentication, KITCHEN/ADMIN role, and domain validation
router.use(authenticate);
router.use(authorize('KITCHEN', 'ADMIN'));
router.use(validateAdminDomain);

/**
 * GET /api/v1/kitchen/orders
 * Get all orders with optional filters (kitchen staff only)
 */
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { date, fulfillmentStatus, menuItemId, locationId } = req.query;

    const filters: any = {};
    if (date) filters.date = date as string;
    if (fulfillmentStatus) filters.fulfillmentStatus = fulfillmentStatus as OrderStatus;
    if (menuItemId) filters.menuItemId = menuItemId as string;
    if (locationId) filters.locationId = locationId as string;

    const orders = await kitchenService.getOrders(filters);

    res.json({
      success: true,
      data: orders
    });
  } catch (error: any) {
    console.error('Error fetching kitchen orders:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch orders'
    });
  }
});

/**
 * GET /api/v1/kitchen/summary
 * Get order summary grouped by menu item (kitchen staff only)
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { date, locationId } = req.query;

    const summary = await kitchenService.getOrderSummary(
      date as string | undefined,
      locationId as string | undefined
    );

    res.json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    console.error('Error fetching order summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch order summary'
    });
  }
});

/**
 * PATCH /api/v1/kitchen/orders/:id/status
 * Update order fulfillment status (kitchen staff only) - marks all items
 */
router.patch('/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses: OrderStatus[] = ['PLACED', 'FULFILLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updatedOrder = await kitchenService.updateOrderStatus(id, status);

    res.json({
      success: true,
      data: updatedOrder,
      message: `Order status updated to ${status}`
    });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update order status'
    });
  }
});

/**
 * PATCH /api/v1/kitchen/order-items/:id/status
 * Update individual order item fulfillment status (kitchen staff only)
 */
router.patch('/order-items/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses: OrderStatus[] = ['PLACED', 'FULFILLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updatedItem = await kitchenService.updateOrderItemStatus(id, status);

    res.json({
      success: true,
      data: updatedItem,
      message: `Order item status updated to ${status}`
    });
  } catch (error: any) {
    console.error('Error updating order item status:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update order item status'
    });
  }
});

/**
 * GET /api/v1/kitchen/stats
 * Get daily statistics for kitchen dashboard (kitchen staff only)
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { date, locationId } = req.query;

    const stats = await kitchenService.getDailyStats(
      date as string | undefined,
      locationId as string | undefined
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error fetching daily stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch statistics'
    });
  }
});

/**
 * GET /api/v1/kitchen/print
 * Get printable HTML for batch summary (kitchen staff only)
 */
router.get('/print', async (req: Request, res: Response) => {
  try {
    const { date, locationId } = req.query;

    const html = await kitchenService.generatePrintableHTML(
      date as string | undefined,
      locationId as string | undefined
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    console.error('Error generating printable summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate printable summary'
    });
  }
});

export default router;
