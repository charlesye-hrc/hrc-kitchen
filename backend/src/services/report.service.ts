import { OrderStatus, PaymentStatus } from '@prisma/client';
import prisma from '../lib/prisma';

export interface ReportDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  locationId?: string; // Optional location filter
}

export interface RevenueByUserReport {
  user: {
    id: string;
    fullName: string;
    email: string;
    department: string | null;
  };
  totalRevenue: number;
  orderCount: number;
  orders: {
    orderNumber: string;
    orderDate: Date;
    amount: number;
  }[];
}

export interface PopularItemReport {
  menuItem: {
    id: string;
    name: string;
    category: string;
    price: number;
  };
  totalQuantity: number;
  orderCount: number;
  totalRevenue: number;
}

export interface SummaryReport {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: {
    PLACED: number;
    PARTIALLY_FULFILLED: number;
    FULFILLED: number;
  };
  ordersByPayment: {
    PENDING: number;
    COMPLETED: number;
    FAILED: number;
    REFUNDED: number;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export class ReportService {
  /**
   * Get revenue by user over a custom date range
   */
  async getRevenueByUser(dateRange: ReportDateRange): Promise<RevenueByUserReport[]> {
    const startDate = new Date(dateRange.startDate + 'T00:00:00');
    const endDate = new Date(dateRange.endDate + 'T23:59:59');

    const whereClause: any = {
      orderDate: {
        gte: startDate,
        lte: endDate
      },
      paymentStatus: 'COMPLETED', // Only completed payments
      userId: { not: null } // Exclude guest orders (they don't have a user)
    };

    // Add location filter if provided
    if (dateRange.locationId) {
      whereClause.locationId = dateRange.locationId;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            department: true
          }
        }
      },
      orderBy: {
        orderDate: 'desc'
      }
    });

    // Group by user
    const revenueByUser: Record<string, RevenueByUserReport> = {};

    for (const order of orders) {
      // Skip if user is null (shouldn't happen due to filter, but safety check)
      if (!order.user) continue;

      const userId = order.user.id;

      if (!revenueByUser[userId]) {
        revenueByUser[userId] = {
          user: order.user,
          totalRevenue: 0,
          orderCount: 0,
          orders: []
        };
      }

      revenueByUser[userId].totalRevenue += Number(order.totalAmount);
      revenueByUser[userId].orderCount++;
      revenueByUser[userId].orders.push({
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        amount: Number(order.totalAmount)
      });
    }

    // Convert to array and sort by total revenue (highest first)
    return Object.values(revenueByUser).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * Get most popular items over a custom date range
   */
  async getPopularItems(dateRange: ReportDateRange): Promise<PopularItemReport[]> {
    const startDate = new Date(dateRange.startDate + 'T00:00:00');
    const endDate = new Date(dateRange.endDate + 'T23:59:59');

    const whereClause: any = {
      order: {
        orderDate: {
          gte: startDate,
          lte: endDate
        },
        paymentStatus: 'COMPLETED' // Only completed orders
      }
    };

    // Add location filter if provided
    if (dateRange.locationId) {
      whereClause.order.locationId = dateRange.locationId;
    }

    const orderItems = await prisma.orderItem.findMany({
      where: whereClause,
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
            category: true,
            price: true
          }
        },
        order: {
          select: {
            id: true
          }
        }
      }
    });

    // Group by menu item
    const itemStats: Record<string, PopularItemReport> = {};

    for (const item of orderItems) {
      const menuItemId = item.menuItem.id;

      if (!itemStats[menuItemId]) {
        itemStats[menuItemId] = {
          menuItem: item.menuItem,
          totalQuantity: 0,
          orderCount: 0,
          totalRevenue: 0
        };
      }

      itemStats[menuItemId].totalQuantity += item.quantity;
      itemStats[menuItemId].orderCount++;
      itemStats[menuItemId].totalRevenue += Number(item.priceAtPurchase) * item.quantity;
    }

    // Convert to array and sort by total quantity (most popular first)
    return Object.values(itemStats).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }

  /**
   * Get overall summary statistics for a date range
   */
  async getSummaryReport(dateRange: ReportDateRange): Promise<SummaryReport> {
    const startDate = new Date(dateRange.startDate + 'T00:00:00');
    const endDate = new Date(dateRange.endDate + 'T23:59:59');

    const whereClause: any = {
      orderDate: {
        gte: startDate,
        lte: endDate
      }
    };

    // Add location filter if provided
    if (dateRange.locationId) {
      whereClause.locationId = dateRange.locationId;
    }

    const orders = await prisma.order.findMany({
      where: whereClause
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => {
      return sum + Number(order.totalAmount);
    }, 0);

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const ordersByStatus = {
      PLACED: 0,
      PARTIALLY_FULFILLED: 0,
      FULFILLED: 0
    };

    const ordersByPayment = {
      PENDING: 0,
      COMPLETED: 0,
      FAILED: 0,
      REFUNDED: 0
    };

    orders.forEach(order => {
      ordersByStatus[order.fulfillmentStatus as OrderStatus]++;
      ordersByPayment[order.paymentStatus as PaymentStatus]++;
    });

    return {
      totalOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      ordersByStatus,
      ordersByPayment,
      dateRange: {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }
    };
  }

  /**
   * Get detailed orders report with filters
   */
  async getOrdersReport(dateRange: ReportDateRange, filters?: {
    paymentStatus?: PaymentStatus;
    fulfillmentStatus?: OrderStatus;
  }): Promise<any[]> {
    const startDate = new Date(dateRange.startDate + 'T00:00:00');
    const endDate = new Date(dateRange.endDate + 'T23:59:59');

    const where: any = {
      orderDate: {
        gte: startDate,
        lte: endDate
      }
    };

    if (filters?.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }

    if (filters?.fulfillmentStatus) {
      where.fulfillmentStatus = filters.fulfillmentStatus;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            department: true
          }
        },
        orderItems: {
          include: {
            menuItem: {
              select: {
                name: true,
                category: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: {
        orderDate: 'desc'
      }
    });

    return orders;
  }

  /**
   * Export report data to CSV format
   */
  exportToCSV(data: any[], type: 'revenue-by-user' | 'popular-items' | 'summary' | 'orders'): string {
    if (data.length === 0) {
      return '';
    }

    let headers: string[] = [];
    let rows: string[][] = [];

    switch (type) {
      case 'revenue-by-user':
        headers = ['User Name', 'Email', 'Department', 'Total Revenue', 'Order Count'];
        rows = (data as RevenueByUserReport[]).map(item => [
          item.user.fullName,
          item.user.email,
          item.user.department || 'N/A',
          item.totalRevenue.toFixed(2),
          item.orderCount.toString()
        ]);
        break;

      case 'popular-items':
        headers = ['Menu Item', 'Category', 'Total Quantity', 'Order Count', 'Total Revenue'];
        rows = (data as PopularItemReport[]).map(item => [
          item.menuItem.name,
          item.menuItem.category,
          item.totalQuantity.toString(),
          item.orderCount.toString(),
          item.totalRevenue.toFixed(2)
        ]);
        break;

      case 'orders':
        headers = ['Order Number', 'Date', 'Customer', 'Email', 'Items', 'Total', 'Payment Status', 'Fulfillment Status'];
        rows = data.map((order: any) => [
          order.orderNumber,
          new Date(order.orderDate).toLocaleDateString(),
          order.user.fullName,
          order.user.email,
          order.orderItems.map((item: any) => `${item.menuItem.name} (${item.quantity})`).join('; '),
          Number(order.totalAmount).toFixed(2),
          order.paymentStatus,
          order.fulfillmentStatus
        ]);
        break;

      default:
        return '';
    }

    // Build CSV
    const csvRows = [headers, ...rows];
    return csvRows.map(row =>
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }
}
