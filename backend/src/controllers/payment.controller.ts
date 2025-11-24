import { Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';

export class PaymentController {
  static async createPaymentIntent(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { orderId } = req.body;

      if (!req.user) {
        throw new ApiError(401, 'Unauthorized');
      }

      if (!orderId) {
        throw new ApiError(400, 'Order ID is required');
      }

      // Verify order exists and belongs to the user
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          userId: true,
          totalAmount: true,
          paymentStatus: true,
        },
      });

      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      // Verify ownership
      if (order.userId !== req.user.id) {
        throw new ApiError(403, 'Not authorized to pay for this order');
      }

      // Check if already paid
      if (order.paymentStatus === 'COMPLETED') {
        throw new ApiError(400, 'Order has already been paid');
      }

      // Use server-calculated amount from order
      const amount = order.totalAmount.toNumber();

      if (amount <= 0) {
        throw new ApiError(400, 'Invalid order amount');
      }

      const paymentIntent = await PaymentService.createPaymentIntent({
        amount,
        orderId,
        customerEmail: req.user.email,
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (error) {
      next(error);
    }
  }

  static async confirmPayment(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { paymentIntentId, clientSecret } = req.body;

      if (!paymentIntentId) {
        throw new ApiError(400, 'Payment intent ID is required');
      }
      if (!clientSecret) {
        throw new ApiError(400, 'Client secret is required');
      }

      // Verify the payment intent and get order ownership info
      const paymentIntent = await PaymentService.confirmPayment(paymentIntentId, clientSecret, req.user?.id);

      res.json({
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async handleWebhook(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        throw new ApiError(400, 'Missing stripe-signature header');
      }

      await PaymentService.handleWebhook(req.body, signature);

      res.json({ received: true });
    } catch (error) {
      next(error);
    }
  }
}
