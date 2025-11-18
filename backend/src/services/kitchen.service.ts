import { OrderStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { escapeHtml } from '../utils/validation';

export interface KitchenOrderFilters {
  date?: string; // ISO date string
  fulfillmentStatus?: OrderStatus;
  menuItemId?: string;
  locationId?: string;
}

export class KitchenService {
  /**
   * Get all orders for kitchen staff with optional filters
   */
  async getOrders(filters: KitchenOrderFilters = {}) {
    const { date, fulfillmentStatus, menuItemId, locationId } = filters;

    // Build where clause
    const where: any = {};

    // Filter by date (default to today)
    if (date) {
      // Parse date as local timezone by appending time
      const orderDate = new Date(date + 'T00:00:00');
      where.orderDate = orderDate;
    } else {
      // Default to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.orderDate = today;
    }

    // Filter by location
    if (locationId) {
      where.locationId = locationId;
    }

    // Filter by fulfillment status
    if (fulfillmentStatus) {
      where.fulfillmentStatus = fulfillmentStatus;
    }

    // Filter by menu item (requires join)
    if (menuItemId) {
      where.orderItems = {
        some: {
          menuItemId
        }
      };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        },
        orderItems: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                description: true,
                category: true,
                imageUrl: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return orders;
  }

  /**
   * Get order summary grouped by menu item for batch preparation
   */
  async getOrderSummary(date?: string, locationId?: string) {
    // Build where clause for date
    let orderDate: Date;
    if (date) {
      // Parse date as local timezone by appending time
      orderDate = new Date(date + 'T00:00:00');
    } else {
      orderDate = new Date();
      orderDate.setHours(0, 0, 0, 0);
    }

    const where: any = {
      orderDate
      // Don't filter by payment status - show all orders for batch preparation
    };

    // Filter by location
    if (locationId) {
      where.locationId = locationId;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        },
        orderItems: {
          include: {
            menuItem: true
          }
        }
      }
    });

    // Group by menu item
    const summary: Record<string, {
      menuItem: any;
      totalQuantity: number;
      orders: Array<{
        orderId: string;
        orderItemId: string;
        orderNumber: string;
        quantity: number;
        customizations: any;
        selectedVariations: any;
        customerName: string;
        fulfillmentStatus: OrderStatus;
      }>;
    }> = {};

    for (const order of orders) {
      for (const item of order.orderItems) {
        // Skip items where menu item has been deleted
        if (!item.menuItem) {
          console.log(`[Kitchen Summary] Skipping order item with deleted menu item: ${item.itemName || 'Unknown'}`);
          continue;
        }

        const key = item.menuItemId;

        if (!summary[key]) {
          summary[key] = {
            menuItem: item.menuItem,
            totalQuantity: 0,
            orders: []
          };
        }

        summary[key].totalQuantity += item.quantity;
        summary[key].orders.push({
          orderId: order.id,
          orderItemId: item.id,
          orderNumber: order.orderNumber,
          quantity: item.quantity,
          customizations: item.customizations,
          selectedVariations: item.selectedVariations,
          customerName: order.user?.fullName || `${order.guestFirstName} ${order.guestLastName}` || 'Guest',
          fulfillmentStatus: order.fulfillmentStatus
        });
      }
    }

    // Convert to array and sort by total quantity (most popular first)
    const summaryArray = Object.values(summary).sort(
      (a, b) => b.totalQuantity - a.totalQuantity
    );

    return summaryArray;
  }

  /**
   * Update order item fulfillment status
   */
  async updateOrderItemStatus(orderItemId: string, status: OrderStatus) {
    // Validate status transition (PARTIALLY_FULFILLED is set automatically)
    const validStatuses: OrderStatus[] = ['PLACED', 'FULFILLED'];

    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid fulfillment status: ${status}. Use PLACED or FULFILLED for items.`);
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId }
    });

    if (!orderItem) {
      throw new Error('Order item not found');
    }

    // Prevent un-fulfilling fulfilled items
    if (orderItem.fulfillmentStatus === 'FULFILLED' && status !== 'FULFILLED') {
      throw new Error('Cannot change status of fulfilled items');
    }

    // Update the order item status
    const updatedItem = await prisma.orderItem.update({
      where: { id: orderItemId },
      data: {
        fulfillmentStatus: status
      },
      include: {
        menuItem: {
          select: {
            name: true,
            description: true,
            imageUrl: true
          }
        }
      }
    });

    // Update the parent order status based on all items
    await this.updateOrderStatusFromItems(orderItem.orderId);

    return updatedItem;
  }

  /**
   * Update order status based on its items' statuses
   */
  private async updateOrderStatusFromItems(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Calculate order status based on item statuses
    const allItemsFulfilled = order.orderItems.every(
      item => item.fulfillmentStatus === 'FULFILLED'
    );
    const anyItemFulfilled = order.orderItems.some(
      item => item.fulfillmentStatus === 'FULFILLED'
    );

    let newOrderStatus: OrderStatus;
    if (allItemsFulfilled) {
      newOrderStatus = 'FULFILLED';
    } else if (anyItemFulfilled) {
      newOrderStatus = 'PARTIALLY_FULFILLED';
    } else {
      newOrderStatus = 'PLACED';
    }

    // Update order status if it changed
    if (order.fulfillmentStatus !== newOrderStatus) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          fulfillmentStatus: newOrderStatus,
          updatedAt: new Date()
        }
      });
    }
  }

  /**
   * Update order fulfillment status (updates all items)
   */
  async updateOrderStatus(orderId: string, status: OrderStatus) {
    // Validate status transition
    const validStatuses: OrderStatus[] = ['PLACED', 'FULFILLED'];

    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid fulfillment status: ${status}`);
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true
      }
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Update all order items to the same status
    await prisma.orderItem.updateMany({
      where: { orderId },
      data: {
        fulfillmentStatus: status
      }
    });

    // Update the order itself
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: status,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        },
        orderItems: {
          include: {
            menuItem: {
              select: {
                name: true,
                description: true,
                imageUrl: true
              }
            }
          }
        }
      }
    });

    return updatedOrder;
  }

  /**
   * Generate printable HTML for bulk summary
   */
  async generatePrintableHTML(date?: string, locationId?: string): Promise<string> {
    const summary = await this.getOrderSummary(date, locationId);

    let orderDate: Date;
    if (date) {
      orderDate = new Date(date + 'T00:00:00');
    } else {
      orderDate = new Date();
      orderDate.setHours(0, 0, 0, 0);
    }

    const formattedDate = orderDate.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Kitchen Batch Summary - ${formattedDate}</title>
  <style>
    @media print {
      @page { margin: 1cm; }
      body { margin: 0; }
    }

    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #333;
      padding-bottom: 15px;
    }

    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
    }

    .header .date {
      font-size: 18px;
      color: #666;
    }

    .menu-item {
      margin-bottom: 30px;
      page-break-inside: avoid;
      border: 2px solid #ddd;
      padding: 15px;
      background: #f9f9f9;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }

    .item-name {
      font-size: 22px;
      font-weight: bold;
    }

    .item-quantity {
      font-size: 28px;
      font-weight: bold;
      background: #333;
      color: white;
      padding: 5px 15px;
      border-radius: 5px;
    }

    .order-list {
      margin-top: 10px;
    }

    .order {
      margin-bottom: 10px;
      padding: 10px;
      background: white;
      border-left: 4px solid #666;
      display: grid;
      grid-template-columns: 180px 180px 1fr 80px;
      gap: 15px;
      align-items: center;
    }

    .customer-name {
      font-weight: bold;
      font-size: 16px;
    }

    .order-number {
      color: #666;
      font-size: 14px;
    }

    .quantity {
      font-weight: bold;
      font-size: 16px;
      text-align: right;
    }

    .details {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
    }

    .customizations {
      font-size: 14px;
      color: #444;
    }

    .customizations strong {
      color: #d32f2f;
    }

    .variations {
      font-size: 14px;
      color: #1976d2;
      font-weight: 500;
    }

    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 16px;
      cursor: pointer;
    }

    @media print {
      .print-button { display: none; }
    }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">🖨️ Print</button>

  <div class="header">
    <h1>Kitchen Batch Summary</h1>
    <div class="date">${formattedDate}</div>
  </div>

  ${summary.map(item => `
    <div class="menu-item">
      <div class="item-header">
        <div class="item-name">${escapeHtml(item.menuItem.name)}</div>
        <div class="item-quantity">QTY: ${item.totalQuantity}</div>
      </div>

      <div class="order-list">
        ${item.orders.map(order => `
          <div class="order">
            <div class="customer-name">${escapeHtml(order.customerName)}</div>
            <div class="order-number">${escapeHtml(order.orderNumber)}</div>
            <div class="details">
              ${order.selectedVariations ? `
                <span class="variations"><strong>Variations:</strong> ${order.selectedVariations.variations?.map((v: any) =>
                  `${escapeHtml(v.groupName)}: ${escapeHtml(v.optionName)}`
                ).join(', ') || 'None'}</span>
              ` : ''}
              ${order.customizations ? `
                <span class="customizations"><strong>Customizations:</strong> ${escapeHtml(JSON.stringify(order.customizations))}</span>
              ` : ''}
            </div>
            <div class="quantity">× ${order.quantity}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')}
</body>
</html>
    `;

    return html;
  }

  /**
   * Get daily statistics for kitchen dashboard
   */
  async getDailyStats(date?: string, locationId?: string) {
    let orderDate: Date;
    if (date) {
      // Parse date as local timezone by appending time
      orderDate = new Date(date + 'T00:00:00');
    } else {
      orderDate = new Date();
      orderDate.setHours(0, 0, 0, 0);
    }

    const where: any = {
      orderDate
    };

    // Filter by location
    if (locationId) {
      where.locationId = locationId;
    }

    const orders = await prisma.order.findMany({
      where
    });

    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => {
        const amount = Number(order.totalAmount);
        return sum + amount;
      }, 0),
      ordersByStatus: {
        PLACED: 0,
        PARTIALLY_FULFILLED: 0,
        FULFILLED: 0
      },
      ordersByPayment: {
        PENDING: 0,
        COMPLETED: 0,
        FAILED: 0,
        REFUNDED: 0
      }
    };

    orders.forEach(order => {
      stats.ordersByStatus[order.fulfillmentStatus as OrderStatus]++;
      stats.ordersByPayment[order.paymentStatus as keyof typeof stats.ordersByPayment]++;
    });

    return stats;
  }
}
