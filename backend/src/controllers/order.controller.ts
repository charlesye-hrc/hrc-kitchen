import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { OrderService } from '../services/order.service';
import { CreateOrderDto } from '../types/order.types';
import { AuthService } from '../services/auth.service';
import { ApiError } from '../middleware/errorHandler';
import prisma from '../lib/prisma';
import { validatePagination } from '../utils/validation';
import { CaptchaService } from '../services/captcha.service';
import { GuestOrderTokenService, GuestOrderTokenPayload } from '../services/guestOrderToken.service';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  createOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      const userId = req.user.id;
      const orderData: CreateOrderDto = req.body;

      const result = await this.orderService.createOrder(userId, orderData);

      res.status(201).json({
        success: true,
        data: result
      });
      return;
    } catch (error) {
      next(error);
    }
  };

  getOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      const userId = req.user.id;
      const orderId = req.params.id;

      const order = await this.orderService.getOrderById(orderId, userId);

      if (!order) {
        throw new ApiError(404, 'Order not found');
      }

      res.json({
        success: true,
        data: order
      });
      return;
    } catch (error) {
      next(error);
    }
  };

  getUserOrders = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      const userId = req.user.id;

      // Extract query parameters
      const { startDate, endDate, page, limit } = req.query;

      // Validate and constrain pagination parameters
      const pagination = validatePagination(page as string, limit as string, {
        maxLimit: 100,
        defaultLimit: 20,
      });

      const options = {
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        page: pagination.page,
        limit: pagination.limit
      };

      const result = await this.orderService.getUserOrders(userId, options);

      res.json({
        success: true,
        data: result.orders,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: pagination.limit
        }
      });
      return;
    } catch (error) {
      console.error('Error fetching user orders:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack');
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch orders'
      });
      return;
    }
  };

  getLastOrder = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }

      const userId = req.user.id;
      const lastOrder = await this.orderService.getLastOrderWithDetails(userId);

      if (!lastOrder) {
        res.status(404).json({
          success: false,
          message: 'No previous orders found'
        });
        return;
      }

      res.json({
        success: true,
        data: lastOrder
      });
      return;
    } catch (error) {
      next(error);
    }
  };

  requestGuestOrderToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { captchaToken } = req.body;

      if (!captchaToken) {
        res.status(400).json({
          success: false,
          message: 'captchaToken is required',
        });
        return;
      }

      if (!process.env.RECAPTCHA_SECRET_KEY) {
        res.status(500).json({
          success: false,
          message: 'Captcha verification is not configured on the server',
        });
        return;
      }

      const captchaValid = await CaptchaService.verify(captchaToken, req.ip);
      if (!captchaValid) {
        res.status(400).json({
          success: false,
          message: 'Captcha verification failed',
        });
        return;
      }

      const token = GuestOrderTokenService.issueToken();

      res.json({
        success: true,
        data: {
          token,
          expiresInMs: GuestOrderTokenService.ttlMs,
        },
      });
    } catch (error) {
      console.error('Error issuing guest order token:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to issue guest order token',
      });
    }
  };

  createGuestOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guestInfo, guestToken, ...orderData } = req.body as {
        guestInfo: { email: string; firstName: string; lastName: string };
        guestToken?: GuestOrderTokenPayload;
      } & CreateOrderDto;

      if (!GuestOrderTokenService.verifyToken(guestToken)) {
        res.status(400).json({
          success: false,
          message: 'Invalid or expired guest order token. Please refresh the checkout page.',
        });
        return;
      }

      if (!guestInfo?.email || !guestInfo?.firstName || !guestInfo?.lastName) {
        res.status(400).json({
          success: false,
          message: 'Guest information (email, firstName, lastName) is required'
        });
        return;
      }

      // Check if user with this email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: guestInfo.email },
        select: { email: true }
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'An account with this email already exists. Please sign in to continue.',
          code: 'EMAIL_EXISTS'
        });
        return;
      }

      const result = await this.orderService.createGuestOrder(orderData, guestInfo);

      res.status(201).json({
        success: true,
        data: {
          order: result.order,
          clientSecret: result.clientSecret,
          accessToken: result.accessToken
        }
      });
      return;
    } catch (error) {
      console.error('Error creating guest order:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create order'
      });
      return;
    }
  };

  getGuestOrder = async (req: Request, res: Response): Promise<void> => {
    try {
      const token = req.query.token as string;

      // Require token for guest order lookup
      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Access token is required to retrieve guest order'
        });
        return;
      }

      // Verify token and extract orderId
      let orderId: string;
      try {
        const decoded = AuthService.verifyGuestOrderToken(token);
        orderId = decoded.orderId;
      } catch (error: any) {
        res.status(401).json({
          success: false,
          message: error.message || 'Invalid or expired access token'
        });
        return;
      }

      const order = await this.orderService.getGuestOrderByToken(orderId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
        return;
      }

      res.json({
        success: true,
        data: order
      });
      return;
    } catch (error) {
      console.error('Error fetching guest order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch order'
      });
      return;
    }
  };
}
