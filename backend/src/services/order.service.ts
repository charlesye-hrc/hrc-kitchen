import { Prisma, Weekday } from '@prisma/client';
import { CreateOrderDto, InvalidOrderLine, OrderInvalidLineReason } from '../types/order.types';
import { PaymentService } from './payment.service';
import { ConfigService } from './config.service';
import { SelectedVariation } from '../types/variation.types';
import { AuthService } from './auth.service';
import { inventoryService } from './inventory.service';
import { OrderEligibilityService } from './orderEligibility.service';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';
import { getBusinessDate, getBusinessDateString, parseDateOnly } from '../utils/businessDate';

interface NormalizedOrderLine {
  lineIndex: number;
  menuItem: any;
  item: CreateOrderDto['items'][number];
  prepDate: Date;
}

interface OrderValidationResult {
  invalidLines: InvalidOrderLine[];
  normalizedLines: NormalizedOrderLine[];
}

export class OrderValidationError extends Error {
  readonly code: 'PREP_DATE_INELIGIBLE';

  readonly invalidLines: InvalidOrderLine[];

  constructor(message: string, invalidLines: InvalidOrderLine[]) {
    super(message);
    this.code = 'PREP_DATE_INELIGIBLE';
    this.invalidLines = invalidLines;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class OrderService {
  private configService: ConfigService;

  private readonly orderEligibilityService: OrderEligibilityService;

  constructor() {
    this.configService = new ConfigService();
    this.orderEligibilityService = new OrderEligibilityService(this.configService);
  }

  async createOrder(userId: string, orderData: CreateOrderDto): Promise<{ order: any; clientSecret: string }> {
    // Get user data for payment intent and snapshot
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        fullName: true,
        department: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return this.createOrderInternal(orderData, {
      userId,
      customerEmail: user.email,
      customerFullName: user.fullName,
      customerDepartment: user.department ?? undefined
    });
  }

  async createGuestOrder(
    orderData: CreateOrderDto,
    guestInfo: { email: string; firstName: string; lastName: string }
  ): Promise<{ order: any; clientSecret: string; accessToken: string }> {
    const result = await this.createOrderInternal(orderData, {
      guestEmail: guestInfo.email,
      guestFirstName: guestInfo.firstName,
      guestLastName: guestInfo.lastName,
      customerEmail: guestInfo.email
    });

    // Generate access token for guest to view their order
    const accessToken = AuthService.generateGuestOrderToken(result.order.id);

    return {
      ...result,
      accessToken
    };
  }

  private getWeekdayForDate(date: Date): Weekday {
    const weekdayMap: Weekday[] = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];

    return weekdayMap[date.getUTCDay()];
  }

  private createInvalidLine(
    item: CreateOrderDto['items'][number],
    reason: OrderInvalidLineReason,
    message: string
  ): InvalidOrderLine {
    return {
      clientLineId: item.clientLineId,
      menuItemId: item.menuItemId,
      prepDate: item.prepDate,
      reason,
      message,
    };
  }

  private addLineError(
    lineErrors: Array<InvalidOrderLine | undefined>,
    lineIndex: number,
    item: CreateOrderDto['items'][number],
    reason: OrderInvalidLineReason,
    message: string
  ): void {
    if (!lineErrors[lineIndex]) {
      lineErrors[lineIndex] = this.createInvalidLine(item, reason, message);
    }
  }

  private async validateOrderData(orderData: CreateOrderDto): Promise<OrderValidationResult> {
    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('Order must include at least one item');
    }

    const lineErrors: Array<InvalidOrderLine | undefined> = new Array(orderData.items.length);
    const parsedPrepDates: Array<Date | undefined> = new Array(orderData.items.length);

    const uniqueMenuItemIds = [...new Set(orderData.items.map(item => item.menuItemId))];

    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: uniqueMenuItemIds }
      },
      include: {
        variationGroups: {
          include: {
            options: true
          }
        }
      }
    });

    const menuItemById = new Map(menuItems.map(item => [item.id, item]));

    orderData.items.forEach((item, index) => {
      if (!menuItemById.has(item.menuItemId)) {
        this.addLineError(lineErrors, index, item, 'MENU_ITEM_INVALID', 'Menu item is invalid or unavailable');
      }
    });

    if (orderData.locationId) {
      const menuItemLocations = await prisma.menuItemLocation.findMany({
        where: {
          locationId: orderData.locationId,
          menuItemId: { in: uniqueMenuItemIds }
        },
        select: {
          menuItemId: true,
        }
      });

      const availableMenuItemIds = new Set(menuItemLocations.map(mil => mil.menuItemId));

      orderData.items.forEach((item, index) => {
        if (!lineErrors[index] && !availableMenuItemIds.has(item.menuItemId)) {
          this.addLineError(
            lineErrors,
            index,
            item,
            'ITEM_NOT_AVAILABLE_AT_LOCATION',
            'Item is not available at the selected location'
          );
        }
      });
    }

    for (let index = 0; index < orderData.items.length; index++) {
      if (lineErrors[index]) {
        continue;
      }

      const item = orderData.items[index];
      const menuItem = menuItemById.get(item.menuItemId);

      if (!menuItem) {
        continue;
      }

      const eligibility = await this.orderEligibilityService.evaluatePrepDate(item.prepDate);
      if (!eligibility.eligible || !eligibility.prepDate || !eligibility.prepDateString) {
        const reason = (eligibility.reason ?? 'PREP_DATE_INVALID_FORMAT') as OrderInvalidLineReason;
        this.addLineError(
          lineErrors,
          index,
          item,
          reason,
          eligibility.message || 'Prep date is not eligible for ordering'
        );
        continue;
      }

      parsedPrepDates[index] = eligibility.prepDate;

      const prepWeekday = this.getWeekdayForDate(eligibility.prepDate);
      if (!menuItem.weekdays.includes(prepWeekday)) {
        this.addLineError(
          lineErrors,
          index,
          item,
          'ITEM_NOT_AVAILABLE_ON_DATE',
          `Item is not available on ${eligibility.prepDateString}`
        );
      }
    }

    if (orderData.locationId) {
      const quantityByMenuItem = new Map<string, number>();

      orderData.items.forEach((item, index) => {
        if (lineErrors[index]) {
          return;
        }

        quantityByMenuItem.set(item.menuItemId, (quantityByMenuItem.get(item.menuItemId) || 0) + item.quantity);
      });

      if (quantityByMenuItem.size > 0) {
        const inventoryChecks = await inventoryService.checkBulkAvailability(
          Array.from(quantityByMenuItem.entries()).map(([menuItemId, quantity]) => ({
            menuItemId,
            locationId: orderData.locationId,
            quantity,
          }))
        );

        const unavailableInventoryByMenuItem = new Map(
          inventoryChecks
            .filter(check => !check.available)
            .map(check => [check.menuItemId, check])
        );

        orderData.items.forEach((item, index) => {
          if (lineErrors[index]) {
            return;
          }

          const inventoryIssue = unavailableInventoryByMenuItem.get(item.menuItemId);
          if (!inventoryIssue) {
            return;
          }

          const menuItem = menuItemById.get(item.menuItemId);
          this.addLineError(
            lineErrors,
            index,
            item,
            'INSUFFICIENT_INVENTORY',
            `${menuItem?.name || 'Item'} has insufficient inventory (available: ${inventoryIssue.currentStock}, requested: ${inventoryIssue.requested})`
          );
        });
      }
    }

    const invalidLines = lineErrors.filter((line): line is InvalidOrderLine => Boolean(line));

    const normalizedLines: NormalizedOrderLine[] = orderData.items
      .map((item, lineIndex) => {
        if (lineErrors[lineIndex]) {
          return null;
        }

        const menuItem = menuItemById.get(item.menuItemId);
        const prepDate = parsedPrepDates[lineIndex];

        if (!menuItem || !prepDate) {
          return null;
        }

        return {
          lineIndex,
          menuItem,
          item,
          prepDate,
        };
      })
      .filter((line): line is NormalizedOrderLine => Boolean(line));

    return {
      invalidLines,
      normalizedLines,
    };
  }

  async validateOrder(orderData: CreateOrderDto): Promise<OrderValidationResult> {
    return this.validateOrderData(orderData);
  }

  private async createOrderInternal(
    orderData: CreateOrderDto,
    customerInfo: {
      userId?: string;
      guestEmail?: string;
      guestFirstName?: string;
      guestLastName?: string;
      customerEmail: string;
      customerFullName?: string;
      customerDepartment?: string;
    }
  ): Promise<{ order: any; clientSecret: string; paymentIntentId: string }> {
    const validation = await this.validateOrderData(orderData);
    if (validation.invalidLines.length > 0) {
      throw new OrderValidationError('Some order items are no longer eligible', validation.invalidLines);
    }

    // Fetch location data for snapshot (if locationId is provided)
    let locationSnapshot: { name?: string; address?: string; phone?: string } = {};
    if (orderData.locationId) {
      const location = await prisma.location.findUnique({
        where: { id: orderData.locationId },
        select: { name: true, address: true, phone: true }
      });
      if (location) {
        locationSnapshot = {
          name: location.name,
          address: location.address || undefined,
          phone: location.phone || undefined
        };
      }
    }

    // Calculate total amount with variations
    let totalAmount = 0;
    const orderItems = validation.normalizedLines.map((line) => {
      const item = line.item;
      const menuItem = line.menuItem;

      const basePrice = Number(menuItem.price);

      // Calculate variation modifier
      let variationModifier = 0;
      let selectedVariations: SelectedVariation[] | null = null;

      if (item.selectedVariations && item.selectedVariations.length > 0) {
        selectedVariations = [];

        for (const selection of item.selectedVariations) {
          const group = menuItem.variationGroups.find((g: any) => g.id === selection.groupId);
          if (!group) continue;

          for (const optionId of selection.optionIds) {
            const option = group.options.find((o: any) => o.id === optionId);
            if (option) {
              const modifier = Number(option.priceModifier);
              variationModifier += modifier;
              selectedVariations.push({
                groupId: group.id,
                groupName: group.name,
                optionId: option.id,
                optionName: option.name,
                priceModifier: modifier
              });
            }
          }
        }
      }

      const itemPrice = basePrice + variationModifier;
      const subtotal = itemPrice * item.quantity;
      totalAmount += subtotal;

      // Build customizations object (legacy)
      const customizationsObj: any = {};
      if (item.customizations) {
        customizationsObj.customizations = item.customizations;
      }
      if (item.specialRequests) {
        customizationsObj.specialRequests = item.specialRequests;
      }

      const formattedSelectedVariations = selectedVariations
        ? {
            variations: selectedVariations,
            totalModifier: variationModifier,
          }
        : null;

      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        prepDate: line.prepDate,
        prepDateSnapshot: line.prepDate,
        priceAtPurchase: itemPrice, // Store final price per item (base + variations)
        customizations: Object.keys(customizationsObj).length > 0 ? customizationsObj : null,
        selectedVariations:
          formattedSelectedVariations !== null
            ? ((formattedSelectedVariations as unknown) as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        // Snapshot menu item data for historical preservation
        itemName: menuItem.name,
        itemDescription: menuItem.description,
        itemCategory: menuItem.category,
        itemImageUrl: menuItem.imageUrl,
        itemBasePrice: menuItem.price,
      };
    });

    // Round to 2 decimal places
    totalAmount = Math.round(totalAmount * 100) / 100;

    const orderDate = getBusinessDate();

    // Build special requests string
    const specialRequests = orderData.deliveryNotes || null;

    // Retry logic for unique constraint violations (race condition on order number)
    let retries = 3;
    let lastError: any;

    while (retries > 0) {
      try {
        // Create order with payment in a transaction
        const result = await prisma.$transaction(async (tx) => {
          // Generate order number inside transaction to reduce race condition window
          const orderNumber = await this.generateOrderNumber();

          // Create payment intent with Stripe first
          logger.info('Creating payment intent', {
            email: customerInfo.customerEmail,
            amount: totalAmount,
          });
          const paymentIntent = await PaymentService.createPaymentIntent({
            amount: totalAmount,
            customerEmail: customerInfo.customerEmail,
            orderId: undefined // We don't have the orderId yet
          });
          logger.info('Payment intent created', { paymentIntentId: paymentIntent.id });

          // Create order
          const order = await tx.order.create({
            data: {
              orderNumber,
          userId: customerInfo.userId || null,
          locationId: orderData.locationId,
          guestEmail: customerInfo.guestEmail || null,
          guestFirstName: customerInfo.guestFirstName || null,
          guestLastName: customerInfo.guestLastName || null,
          // Location snapshots
          locationName: locationSnapshot.name || null,
          locationAddress: locationSnapshot.address || null,
          locationPhone: locationSnapshot.phone || null,
          // Customer snapshots (for registered users - guests use guestXxx fields)
          customerFullName: customerInfo.customerFullName || null,
          customerEmail: customerInfo.customerEmail || null,
          customerDepartment: customerInfo.customerDepartment || null,
          totalAmount,
          paymentStatus: 'PENDING',
          fulfillmentStatus: 'PLACED',
          specialRequests,
          orderDate,
          paymentId: paymentIntent.id,
          orderItems: {
            create: orderItems
          }
        },
        include: {
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

          // Deduct inventory for items with tracking enabled
          if (orderData.locationId) {
            for (const line of validation.normalizedLines) {
              try {
                await inventoryService.deductInventory(
                  line.item.menuItemId,
                  orderData.locationId,
                  line.item.quantity,
                  order.id,
                  tx
                );
              } catch (error: any) {
                // If deduction fails, the transaction will rollback
                logger.error('Failed to deduct inventory for order item', {
                  menuItemId: line.item.menuItemId,
                  orderId: order.id,
                  error: error.message,
                });
                throw error;
              }
            }
          }

          const clientSecret = paymentIntent.client_secret;
          if (!clientSecret) {
            throw new Error('Payment intent missing client secret');
          }

          return { order, clientSecret, paymentIntentId: paymentIntent.id };
        });

        // Update payment intent metadata with orderId after transaction completes
        logger.info('Updating payment intent with order ID', {
          paymentIntentId: result.paymentIntentId,
          orderId: result.order.id,
        });
        await PaymentService.updatePaymentIntentMetadata(result.paymentIntentId, result.order.id);

        return result;
      } catch (error: any) {
        // Check if this is a unique constraint error on order_number
        if (error.code === 'P2002' && error.meta?.target?.includes('order_number')) {
          retries--;
          lastError = error;
          if (retries > 0) {
            logger.warn('Order number collision detected, retrying', { retriesLeft: retries });
            // Small random delay to reduce collision probability
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
            continue;
          }
        }
        // Re-throw if not a unique constraint error or out of retries
        throw error;
      }
    }

    // If we get here, we ran out of retries
    throw lastError || new Error('Failed to create order after multiple retries');
  }

  async getOrderById(orderId: string, userId: string): Promise<any | null> {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        orderItems: {
          include: {
            menuItem: {
              select: {
                name: true,
                description: true,
                imageUrl: true,
                price: true,
                variationGroups: {
                  include: {
                    options: true
                  }
                }
              }
            }
          }
        }
      }
    });

    return order;
  }

  async getGuestOrderById(orderId: string, email: string): Promise<any | null> {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: null, // Guest orders only
        guestEmail: email.toLowerCase() // Verify ownership via email
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        orderItems: {
          include: {
            menuItem: {
              select: {
                name: true,
                description: true,
                imageUrl: true,
                price: true,
                variationGroups: {
                  include: {
                    options: true
                  }
                }
              }
            }
          }
        }
      }
    });

    return order;
  }

  async getGuestOrderByToken(orderId: string): Promise<any | null> {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: null // Guest orders only
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        orderItems: {
          include: {
            menuItem: {
              select: {
                name: true,
                description: true,
                imageUrl: true,
                price: true,
                variationGroups: {
                  include: {
                    options: true
                  }
                }
              }
            }
          }
        }
      }
    });

    return order;
  }

  async getUserOrders(
    userId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ orders: any[]; total: number; page: number; totalPages: number }> {
    const { startDate, endDate, page = 1, limit = 20 } = options || {};

    // Build where clause
    const where: any = { userId };

    // Add date range filter
    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) {
        where.orderDate.gte = parseDateOnly(startDate);
      }
      if (endDate) {
        where.orderDate.lte = parseDateOnly(endDate);
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await prisma.order.count({ where });

    // Get orders with pagination
    const orders = await prisma.order.findMany({
      where,
      include: {
        location: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        orderItems: {
          include: {
            menuItem: {
              select: {
                name: true,
                description: true,
                imageUrl: true,
                price: true,
                variationGroups: {
                  include: {
                    options: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);

    return {
      orders,
      total,
      page,
      totalPages
    };
  }

  async getLastOrderWithDetails(userId: string): Promise<any | null> {
    const lastOrder = await prisma.order.findFirst({
      where: {
        userId,
        paymentStatus: 'COMPLETED' // Only get successfully paid orders
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        orderItems: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
                description: true,
                imageUrl: true,
                price: true,
                category: true,
                variationGroups: {
                  include: {
                    options: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return lastOrder;
  }

  private async generateOrderNumber(): Promise<string> {
    const dateStr = getBusinessDateString().replace(/-/g, '');

    // Get count of orders today with pattern ORD-{dateStr}-*
    // This uses a unique constraint check to avoid race conditions
    const prefix = `ORD-${dateStr}-`;

    // Find the highest sequence number for today
    const latestOrder = await prisma.order.findFirst({
      where: {
        orderNumber: {
          startsWith: prefix
        }
      },
      orderBy: {
        orderNumber: 'desc'
      },
      select: {
        orderNumber: true
      }
    });

    let sequence = 1;
    if (latestOrder) {
      // Extract sequence number from order number (ORD-20251112-0001 -> 0001)
      const parts = latestOrder.orderNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      sequence = lastSeq + 1;
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }
}
