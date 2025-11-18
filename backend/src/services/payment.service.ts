import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

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
