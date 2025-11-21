import { Router } from 'express';
import authRoutes from './auth.routes';
import menuRoutes from './menu.routes';
import orderRoutes from './order.routes';
import kitchenRoutes from './kitchen.routes';
import adminRoutes from './admin.routes';
import financeRoutes from './finance.routes';
import paymentRoutes from './payment.routes';
import locationRoutes from './location.routes';
import invitationRoutes from './invitation.routes';

const router = Router();

// Health check for API
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API is running',
    version: process.env.API_VERSION || 'v1',
  });
});

// Route modules
router.use('/auth', authRoutes);
router.use('/menu', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/kitchen', kitchenRoutes);
router.use('/admin', adminRoutes);
router.use('/finance', financeRoutes);
router.use('/payment', paymentRoutes);
router.use('/locations', locationRoutes);
router.use('/invitations', invitationRoutes);

export default router;
