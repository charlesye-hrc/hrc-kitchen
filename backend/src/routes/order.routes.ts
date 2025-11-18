import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const orderController = new OrderController();

// Guest order endpoints (no authentication required)
router.post('/guest', orderController.createGuestOrder);
router.get('/guest', orderController.getGuestOrder);

// Authenticated order routes
router.use(authenticate);

// Create new order (authenticated)
router.post('/', orderController.createOrder);

// Get user's orders
router.get('/', orderController.getUserOrders);

// Get specific order
router.get('/:id', orderController.getOrder);

export default router;
