import { Router, Request, Response } from 'express';
import { KitchenService } from '../services/kitchen.service';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validateAdminDomain } from '../middleware/domainValidation';
import { OrderStatus } from '@prisma/client';
import prisma from '../lib/prisma';

const router = Router();
const kitchenService = new KitchenService();

// Helper function to get user's accessible location IDs
async function getUserLocationIds(userId: string, userRole: string): Promise<string[] | null> {
  // ADMIN has access to all locations
  if (userRole === 'ADMIN') {
    return null; // null means all locations
  }

  const userLocations = await prisma.userLocation.findMany({
    where: { userId },
    select: { locationId: true },
  });

  return userLocations.map((ul) => ul.locationId);
}

// Helper function to verify order belongs to user's locations
async function verifyOrderLocationAccess(orderId: string, allowedLocationIds: string[] | null): Promise<boolean> {
  if (allowedLocationIds === null) {
    return true; // ADMIN has access to all
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { locationId: true },
  });

  if (!order) {
    return false;
  }

  return allowedLocationIds.includes(order.locationId ?? '');
}

// Helper function to verify order item belongs to user's locations
async function verifyOrderItemLocationAccess(orderItemId: string, allowedLocationIds: string[] | null): Promise<boolean> {
  if (allowedLocationIds === null) {
    return true; // ADMIN has access to all
  }

  const orderItem = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    select: {
      order: {
        select: { locationId: true },
      },
    },
  });

  if (!orderItem) {
    return false;
  }

  return allowedLocationIds.includes(orderItem.order.locationId ?? '');
}

// All routes require authentication, KITCHEN/ADMIN role, and domain validation
router.use(authenticate);
router.use(authorize('KITCHEN', 'ADMIN'));
router.use(validateAdminDomain);

/**
 * GET /api/v1/kitchen/orders
 * Get all orders with optional filters (kitchen staff only)
 */
router.get('/orders', async (req: Request, res: Response): Promise<void> => {
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
    return;
  } catch (error: any) {
    console.error('Error fetching kitchen orders:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch orders'
    });
    return;
  }
});

/**
 * GET /api/v1/kitchen/summary
 * Get order summary grouped by menu item (kitchen staff only)
 */
router.get('/summary', async (req: Request, res: Response): Promise<void> => {
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
    return;
  } catch (error: any) {
    console.error('Error fetching order summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch order summary'
    });
    return;
  }
});

/**
 * PATCH /api/v1/kitchen/orders/:id/status
 * Update order fulfillment status (kitchen staff only) - marks all items
 */
router.patch('/orders/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        success: false,
        message: 'Status is required'
      });
      return;
    }

    const validStatuses: OrderStatus[] = ['PLACED', 'FULFILLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
      return;
    }

    // Verify user has access to this order's location
    const userLocationIds = await getUserLocationIds(req.user!.id, req.user!.role);
    const hasAccess = await verifyOrderLocationAccess(id, userLocationIds);

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update orders at this location'
      });
      return;
    }

    const updatedOrder = await kitchenService.updateOrderStatus(id, status);

    res.json({
      success: true,
      data: updatedOrder,
      message: `Order status updated to ${status}`
    });
    return;
  } catch (error: any) {
    console.error('Error updating order status:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to update order status'
    });
    return;
  }
});

/**
 * PATCH /api/v1/kitchen/order-items/:id/status
 * Update individual order item fulfillment status (kitchen staff only)
 */
router.patch('/order-items/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({
        success: false,
        message: 'Status is required'
      });
      return;
    }

    const validStatuses: OrderStatus[] = ['PLACED', 'FULFILLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
      return;
    }

    // Verify user has access to this order item's location
    const userLocationIds = await getUserLocationIds(req.user!.id, req.user!.role);
    const hasAccess = await verifyOrderItemLocationAccess(id, userLocationIds);

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update order items at this location'
      });
      return;
    }

    const updatedItem = await kitchenService.updateOrderItemStatus(id, status);

    res.json({
      success: true,
      data: updatedItem,
      message: `Order item status updated to ${status}`
    });
    return;
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
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
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
    return;
  } catch (error: any) {
    console.error('Error fetching daily stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch statistics'
    });
    return;
  }
});

/**
 * GET /api/v1/kitchen/print
 * Get printable HTML for batch summary (kitchen staff only)
 */
router.get('/print', async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, locationId } = req.query;

    const html = await kitchenService.generatePrintableHTML(
      date as string | undefined,
      locationId as string | undefined
    );

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
    return;
  } catch (error: any) {
    console.error('Error generating printable summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate printable summary'
    });
    return;
  }
});

export default router;
