import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate, authenticateOptional } from '../middleware/auth';
import { paymentLimiter, paymentConfirmLimiter } from '../middleware/rateLimiter';

const router = Router();

// POST /api/v1/payment/create-intent
router.post('/create-intent', authenticate, PaymentController.createPaymentIntent);

// POST /api/v1/payment/confirm
// Auth optional to support guest orders (registered orders must include token)
router.post('/confirm', paymentLimiter, paymentConfirmLimiter, authenticateOptional, PaymentController.confirmPayment);

// POST /api/v1/payment/webhook
// Note: This endpoint should NOT use authenticate middleware
router.post('/webhook', PaymentController.handleWebhook);

export default router;
