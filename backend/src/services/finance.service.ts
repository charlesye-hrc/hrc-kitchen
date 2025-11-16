import prisma from '../lib/prisma';
import { OrderStatus, PaymentStatus } from '@prisma/client';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface RevenueReport {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  refundedRevenue: number;
}

interface OrderDetailsReport {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  customerName: string | null;
  customerEmail: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: OrderStatus;
  items: Array<{
    menuItemName: string;
    quantity: number;
    priceAtPurchase: number;
  }>;
}

interface MenuItemSalesReport {
  menuItemName: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

export class FinanceService {
  /**
   * Get daily revenue report for a date range
   */
  async getDailyRevenueReport(dateRange: DateRange, locationId?: string): Promise<RevenueReport[]> {
    const where: any = {
      orderDate: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const orders = await prisma.order.findMany({
      where,
      select: {
        orderDate: true,
        totalAmount: true,
        paymentStatus: true,
      },
    });

    // Group by date
    const reportMap = new Map<string, RevenueReport>();

    orders.forEach(order => {
      const dateStr = order.orderDate.toISOString().split('T')[0];
      const amount = Number(order.totalAmount);

      if (!reportMap.has(dateStr)) {
        reportMap.set(dateStr, {
          date: dateStr,
          totalOrders: 0,
          totalRevenue: 0,
          paidRevenue: 0,
          pendingRevenue: 0,
          refundedRevenue: 0,
        });
      }

      const report = reportMap.get(dateStr)!;
      report.totalOrders++;
      report.totalRevenue += amount;

      if (order.paymentStatus === PaymentStatus.COMPLETED) {
        report.paidRevenue += amount;
      } else if (order.paymentStatus === PaymentStatus.PENDING) {
        report.pendingRevenue += amount;
      } else if (order.paymentStatus === PaymentStatus.REFUNDED) {
        report.refundedRevenue += amount;
      }
    });

    return Array.from(reportMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get detailed order report for a date range
   */
  async getOrderDetailsReport(dateRange: DateRange, locationId?: string): Promise<OrderDetailsReport[]> {
    const where: any = {
      orderDate: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
        orderItems: {
          include: {
            menuItem: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        orderDate: 'desc',
      },
    });

    return orders.map(order => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate.toISOString().split('T')[0],
      customerName: order.guestFirstName && order.guestLastName
        ? `${order.guestFirstName} ${order.guestLastName}`
        : order.user?.fullName || null,
      customerEmail: order.guestEmail || order.user?.email || 'N/A',
      totalAmount: Number(order.totalAmount),
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      items: order.orderItems.map(item => ({
        menuItemName: item.menuItem.name,
        quantity: item.quantity,
        priceAtPurchase: Number(item.priceAtPurchase),
      })),
    }));
  }

  /**
   * Get menu item sales report for a date range
   */
  async getMenuItemSalesReport(dateRange: DateRange, locationId?: string): Promise<MenuItemSalesReport[]> {
    const where: any = {
      orderDate: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
      paymentStatus: PaymentStatus.COMPLETED,
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: where,
      },
      include: {
        menuItem: {
          select: {
            name: true,
          },
        },
      },
    });

    // Group by menu item
    const reportMap = new Map<string, MenuItemSalesReport>();

    orderItems.forEach(item => {
      const menuItemName = item.menuItem.name;

      if (!reportMap.has(menuItemName)) {
        reportMap.set(menuItemName, {
          menuItemName,
          totalQuantity: 0,
          totalRevenue: 0,
          orderCount: 0,
        });
      }

      const report = reportMap.get(menuItemName)!;
      report.totalQuantity += item.quantity;
      report.totalRevenue += Number(item.priceAtPurchase) * item.quantity;
      report.orderCount++;
    });

    return Array.from(reportMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * Get summary statistics for a date range
   */
  async getSummaryStatistics(dateRange: DateRange, locationId?: string) {
    const where: any = {
      orderDate: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const orders = await prisma.order.findMany({
      where,
      select: {
        totalAmount: true,
        paymentStatus: true,
      },
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const paidOrders = orders.filter(o => o.paymentStatus === PaymentStatus.COMPLETED).length;
    const paidRevenue = orders
      .filter(o => o.paymentStatus === PaymentStatus.COMPLETED)
      .reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const pendingOrders = orders.filter(o => o.paymentStatus === PaymentStatus.PENDING).length;
    const pendingRevenue = orders
      .filter(o => o.paymentStatus === PaymentStatus.PENDING)
      .reduce((sum, order) => sum + Number(order.totalAmount), 0);
    const failedOrders = orders.filter(o => o.paymentStatus === PaymentStatus.FAILED).length;
    const refundedOrders = orders.filter(o => o.paymentStatus === PaymentStatus.REFUNDED).length;
    const refundedRevenue = orders
      .filter(o => o.paymentStatus === PaymentStatus.REFUNDED)
      .reduce((sum, order) => sum + Number(order.totalAmount), 0);

    return {
      totalOrders,
      totalRevenue,
      paidOrders,
      paidRevenue,
      pendingOrders,
      pendingRevenue,
      failedOrders,
      refundedOrders,
      refundedRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };
  }
}

export default new FinanceService();
