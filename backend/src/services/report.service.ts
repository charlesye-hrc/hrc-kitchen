import { OrderStatus, PaymentStatus } from '@prisma/client';
import prisma from '../lib/prisma';
import { ApiError } from '../middleware/errorHandler';

/**
 * Validate that the user-selected locationId is within their allowed locations
 * Throws ApiError if not authorized
 */
function validateLocationAccess(dateRange: ReportDateRange): void {
  if (dateRange.locationId && dateRange.allowedLocationIds !== null && dateRange.allowedLocationIds !== undefined) {
    if (!dateRange.allowedLocationIds.includes(dateRange.locationId)) {
      throw new ApiError(403, 'Not authorized to view reports for this location');
    }
  }
}

export interface ReportDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  locationId?: string; // Optional specific location filter (user-selected)
  allowedLocationIds?: string[] | null; // Role-based location restrictions (null = all locations allowed)
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
  ordersByStatus: Record<OrderStatus, number>;
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
   * Respects role-based location restrictions
   */
  async getRevenueByUser(dateRange: ReportDateRange): Promise<RevenueByUserReport[]> {
    // Validate location access before processing
    validateLocationAccess(dateRange);

    const startDate = new Date(dateRange.startDate + 'T00:00:00');
    const endDate = new Date(dateRange.endDate + 'T23:59:59');

    const whereClause: any = {
      orderDate: {
        gte: startDate,
        lte: endDate
      },
      paymentStatus: 'COMPLETED' // Only completed payments
    };

    // Apply location filtering
    if (dateRange.locationId) {
      // Specific location selected by user
      whereClause.locationId = dateRange.locationId;
    } else if (dateRange.allowedLocationIds !== null && dateRange.allowedLocationIds !== undefined) {
      // Role-based restriction: KITCHEN/FINANCE users
      // If allowedLocationIds is an empty array, no data should be returned
      if (dateRange.allowedLocationIds.length === 0) {
        return [];
      }
      whereClause.locationId = { in: dateRange.allowedLocationIds };
    }
    // If allowedLocationIds is null, it means ADMIN - no restriction, show all

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

    // Group by user (including guest orders)
    const revenueByUser: Record<string, RevenueByUserReport> = {};

    for (const order of orders) {
      let userId: string;
      let userData: {
        id: string;
        fullName: string;
        email: string;
        department: string | null;
      };

      if (order.user) {
        // Registered user
        userId = order.user.id;
        userData = order.user;
      } else {
        // Guest order - group by guest email
        const guestEmail = order.guestEmail || 'unknown@guest.com';
        userId = `guest_${guestEmail}`;
        userData = {
          id: userId,
          fullName: `${order.guestFirstName || ''} ${order.guestLastName || ''}`.trim() || 'Guest',
          email: guestEmail,
          department: 'Guest'
        };
      }

      if (!revenueByUser[userId]) {
        revenueByUser[userId] = {
          user: userData,
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
   * Respects role-based location restrictions
   */
  async getPopularItems(dateRange: ReportDateRange): Promise<PopularItemReport[]> {
    // Validate location access before processing
    validateLocationAccess(dateRange);

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

    // Apply location filtering
    if (dateRange.locationId) {
      // Specific location selected by user
      whereClause.order.locationId = dateRange.locationId;
    } else if (dateRange.allowedLocationIds !== null && dateRange.allowedLocationIds !== undefined) {
      // Role-based restriction: KITCHEN/FINANCE users
      if (dateRange.allowedLocationIds.length === 0) {
        return [];
      }
      whereClause.order.locationId = { in: dateRange.allowedLocationIds };
    }
    // If allowedLocationIds is null, it means ADMIN - no restriction, show all

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

    // Group by menu item (using snapshot data for deleted items)
    const itemStats: Record<string, PopularItemReport> = {};

    for (const item of orderItems) {
      let groupKey: string;
      let menuItemData: any;

      if (item.menuItemId) {
        // Active menu item - use its ID
        groupKey = item.menuItemId;
        menuItemData = item.menuItem || {
          id: item.menuItemId,
          name: item.itemName || 'Unknown Item',
          category: item.itemCategory || 'UNKNOWN',
          price: item.itemBasePrice || item.priceAtPurchase
        };
      } else {
        // Deleted item - group by snapshot name and category
        const itemName = item.itemName || 'Deleted Item';
        const itemCategory = item.itemCategory || 'UNKNOWN';
        groupKey = `deleted_${itemName}_${itemCategory}`;
        menuItemData = {
          id: groupKey,
          name: itemName,
          category: itemCategory,
          price: item.itemBasePrice || item.priceAtPurchase
        };
      }

      if (!itemStats[groupKey]) {
        itemStats[groupKey] = {
          menuItem: menuItemData,
          totalQuantity: 0,
          orderCount: 0,
          totalRevenue: 0
        };
      }

      itemStats[groupKey].totalQuantity += item.quantity;
      itemStats[groupKey].orderCount++;
      itemStats[groupKey].totalRevenue += Number(item.priceAtPurchase) * item.quantity;
    }

    // Convert to array and sort by total quantity (most popular first)
    return Object.values(itemStats).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }

  /**
   * Get overall summary statistics for a date range
   * Respects role-based location restrictions
   */
  async getSummaryReport(dateRange: ReportDateRange): Promise<SummaryReport> {
    // Validate location access before processing
    validateLocationAccess(dateRange);

    const startDate = new Date(dateRange.startDate + 'T00:00:00');
    const endDate = new Date(dateRange.endDate + 'T23:59:59');

    const whereClause: any = {
      orderDate: {
        gte: startDate,
        lte: endDate
      }
    };

    // Apply location filtering
    if (dateRange.locationId) {
      // Specific location selected by user
      whereClause.locationId = dateRange.locationId;
    } else if (dateRange.allowedLocationIds !== null && dateRange.allowedLocationIds !== undefined) {
      // Role-based restriction: KITCHEN/FINANCE users
      if (dateRange.allowedLocationIds.length === 0) {
        // Return empty summary
        return {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
            ordersByStatus: {
              PLACED: 0,
              PARTIALLY_FULFILLED: 0,
              FULFILLED: 0,
              PREPARING: 0,
              READY: 0,
              COMPLETED: 0,
            },
          ordersByPayment: { PENDING: 0, COMPLETED: 0, FAILED: 0, REFUNDED: 0 },
          dateRange: { startDate: dateRange.startDate, endDate: dateRange.endDate }
        };
      }
      whereClause.locationId = { in: dateRange.allowedLocationIds };
    }
    // If allowedLocationIds is null, it means ADMIN - no restriction, show all

    const orders = await prisma.order.findMany({
      where: whereClause
    });

    // Count all orders for statistics
    const totalOrders = orders.length;

    // Only sum revenue from completed payments
    let completedOrderCount = 0;
    const totalRevenue = orders.reduce((sum, order) => {
      if (order.paymentStatus === 'COMPLETED') {
        completedOrderCount++;
        return sum + Number(order.totalAmount);
      }
      return sum;
    }, 0);

    const averageOrderValue = completedOrderCount > 0 ? totalRevenue / completedOrderCount : 0;

    const ordersByStatus: Record<OrderStatus, number> = {
      PLACED: 0,
      PARTIALLY_FULFILLED: 0,
      FULFILLED: 0,
      PREPARING: 0,
      READY: 0,
      COMPLETED: 0,
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
   * Respects role-based location restrictions
   */
  async getOrdersReport(dateRange: ReportDateRange, filters?: {
    paymentStatus?: PaymentStatus;
    fulfillmentStatus?: OrderStatus;
  }): Promise<any[]> {
    // Validate location access before processing
    validateLocationAccess(dateRange);

    const startDate = new Date(dateRange.startDate + 'T00:00:00');
    const endDate = new Date(dateRange.endDate + 'T23:59:59');

    const where: any = {
      orderDate: {
        gte: startDate,
        lte: endDate
      }
    };

    // Apply location filtering
    if (dateRange.locationId) {
      // Specific location selected by user
      where.locationId = dateRange.locationId;
    } else if (dateRange.allowedLocationIds !== null && dateRange.allowedLocationIds !== undefined) {
      // Role-based restriction: KITCHEN/FINANCE users
      if (dateRange.allowedLocationIds.length === 0) {
        return [];
      }
      where.locationId = { in: dateRange.allowedLocationIds };
    }
    // If allowedLocationIds is null, it means ADMIN - no restriction, show all

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
