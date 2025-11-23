import Stripe from 'stripe';
import { ApiError } from '../middleware/errorHandler';
import { EmailService } from './email.service';
import { AuthService } from './auth.service';
import { logger } from '../utils/logger';
import prisma from '../lib/prisma';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

export interface CreatePaymentIntentDTO {
  amount: number;
  currency?: string;
  orderId?: string;
  customerEmail: string;
}

export class PaymentService {
  static async createPaymentIntent(data: CreatePaymentIntentDTO): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency || process.env.STRIPE_CURRENCY || 'aud',
        receipt_email: data.customerEmail, // Stripe automatically sends receipt on successful payment
        metadata: {
          orderId: data.orderId || '',
          customerEmail: data.customerEmail,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      console.error('Stripe payment intent creation failed:', error);
      throw new ApiError(500, 'Failed to create payment intent');
    }
  }

  static async confirmPayment(paymentIntentId: string, userId?: string): Promise<Stripe.PaymentIntent> {
    try {
      // 1. Verify payment with Stripe (source of truth)
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        throw new ApiError(400, 'Payment has not been completed');
      }

      // 2. Update order payment status in database with idempotency check
      const orderId = paymentIntent.metadata.orderId;
      if (!orderId) {
        console.warn(`[Payment Service] ⚠ Payment intent ${paymentIntentId} has no orderId in metadata`);
        return paymentIntent;
      }

      // 3. Check if already processed (idempotency) and verify ownership
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { paymentStatus: true, paymentId: true, userId: true, guestEmail: true },
      });

      if (!existingOrder) {
        throw new ApiError(404, `Order ${orderId} not found`);
      }

      // 4. Verify ownership - either user owns the order or it's a guest order matching the email
      if (existingOrder.userId) {
        // Registered user order - verify user ID matches
        if (userId && existingOrder.userId !== userId) {
          throw new ApiError(403, 'Not authorized to confirm payment for this order');
        }
      } else if (existingOrder.guestEmail) {
        // Guest order - verify email matches the payment intent metadata
        const intentEmail = paymentIntent.metadata.customerEmail;
        if (intentEmail && existingOrder.guestEmail.toLowerCase() !== intentEmail.toLowerCase()) {
          throw new ApiError(403, 'Not authorized to confirm payment for this order');
        }
      }

      if (existingOrder.paymentStatus === 'COMPLETED') {
        console.log(`[Payment Service] ℹ Order ${orderId} already marked as COMPLETED (idempotent)`);
        return paymentIntent;
      }

      // 5. Update payment status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'COMPLETED',
          paymentId: paymentIntent.id,
        },
      });

      console.log(`[Payment Service] ✓ Updated order ${orderId} payment status: PENDING → COMPLETED (manual confirmation)`);

      // 6. Send order confirmation email
      await this.sendOrderConfirmationEmail(orderId);

      return paymentIntent;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('[Payment Service] ✗ Payment confirmation failed:', error);
      throw new ApiError(500, 'Failed to confirm payment');
    }
  }

  static async updatePaymentIntentMetadata(paymentIntentId: string, orderId: string): Promise<void> {
    try {
      await stripe.paymentIntents.update(paymentIntentId, {
        metadata: {
          orderId: orderId,
        },
      });
      console.log(`[Payment Service] ✓ Updated payment intent ${paymentIntentId} with orderId ${orderId}`);
    } catch (error) {
      console.error('[Payment Service] ✗ Failed to update payment intent metadata:', error);
      // Don't throw - this is not critical for order creation
    }
  }

  static async createRefund(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });

      return refund;
    } catch (error) {
      console.error('Refund creation failed:', error);
      throw new ApiError(500, 'Failed to create refund');
    }
  }

  static async handleWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<Stripe.Event> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    try {
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return event;
    } catch (error) {
      console.error('Webhook verification failed:', error);
      throw new ApiError(400, 'Invalid webhook signature');
    }
  }

  private static async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const orderId = paymentIntent.metadata.orderId;

    if (!orderId) {
      console.warn(`[Payment Service] ⚠ Webhook: Payment intent ${paymentIntent.id} has no orderId in metadata`);
      return;
    }

    // Check if already processed (idempotency for webhook retries)
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { paymentStatus: true },
    });

    if (!existingOrder) {
      console.error(`[Payment Service] ✗ Webhook: Order ${orderId} not found`);
      return;
    }

    if (existingOrder.paymentStatus === 'COMPLETED') {
      console.log(`[Payment Service] ℹ Order ${orderId} already marked as COMPLETED (webhook retry)`);
      return;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'COMPLETED',
        paymentId: paymentIntent.id,
      },
    });

    console.log(`[Payment Service] ✓ Updated order ${orderId} payment status: PENDING → COMPLETED (webhook)`);

    // Send order confirmation email
    await this.sendOrderConfirmationEmail(orderId);
  }

  /**
   * Send order confirmation email for a completed order
   */
  private static async sendOrderConfirmationEmail(orderId: string): Promise<void> {
    try {
      // Fetch complete order details
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: true,
          location: {
            select: {
              name: true,
              address: true,
            },
          },
        },
      });

      if (!order) {
        logger.error(`[Payment Service] Cannot send email: Order ${orderId} not found`);
        return;
      }

      // Determine email recipient and customer name
      const isGuest = !order.userId;
      let email: string;
      let customerName: string;

      if (isGuest) {
        email = order.guestEmail || '';
        customerName = `${order.guestFirstName} ${order.guestLastName}`;
      } else {
        email = order.customerEmail || '';
        customerName = order.customerFullName || 'Customer';
      }

      if (!email) {
        logger.warn(`[Payment Service] Cannot send email: No email address for order ${orderId}`);
        return;
      }

      // Format order items for email
      const items = order.orderItems.map(item => {
        // Parse selected variations for display
        let variations: string | undefined;
        if (item.selectedVariations) {
          const variationData = item.selectedVariations as any;
          if (variationData.variations && Array.isArray(variationData.variations)) {
            variations = variationData.variations
              .map((v: any) => `${v.groupName}: ${v.optionName}`)
              .join(', ');
          }
        }

        // Parse customizations for special requests
        let specialRequests: string | undefined;
        if (item.customizations) {
          const customData = item.customizations as any;
          if (customData.specialRequests) {
            specialRequests = customData.specialRequests;
          }
        }

        return {
          name: item.itemName || 'Unknown Item',
          quantity: item.quantity,
          unitPrice: Number(item.priceAtPurchase),
          subtotal: Number(item.priceAtPurchase) * item.quantity,
          variations,
          specialRequests,
        };
      });

      // Generate access token for guest orders
      let accessToken: string | undefined;
      if (isGuest) {
        accessToken = AuthService.generateGuestOrderToken(orderId);
      }

      // Send the email
      await EmailService.sendOrderConfirmationEmail(email, {
        customerName,
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        items,
        totalAmount: Number(order.totalAmount),
        locationName: order.locationName || order.location?.name || 'Unknown Location',
        locationAddress: order.locationAddress || order.location?.address || undefined,
        deliveryNotes: order.specialRequests || undefined,
        isGuest,
        accessToken,
      });

      logger.info(`[Payment Service] Order confirmation email sent for order ${order.orderNumber}`);
    } catch (error) {
      // Log error but don't throw - email failure shouldn't affect order processing
      logger.error(`[Payment Service] Failed to send order confirmation email for order ${orderId}:`, error);
    }
  }

  private static async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const orderId = paymentIntent.metadata.orderId;

    if (!orderId) {
      console.warn(`[Payment Service] ⚠ Webhook: Failed payment intent ${paymentIntent.id} has no orderId in metadata`);
      return;
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { paymentStatus: true },
    });

    if (!existingOrder) {
      console.error(`[Payment Service] ✗ Webhook: Order ${orderId} not found for failed payment`);
      return;
    }

    if (existingOrder.paymentStatus === 'FAILED') {
      console.log(`[Payment Service] ℹ Order ${orderId} already marked as FAILED (webhook retry)`);
      return;
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'FAILED',
      },
    });

    console.log(`[Payment Service] ✗ Updated order ${orderId} payment status: ${existingOrder.paymentStatus} → FAILED (webhook)`);
  }
}
