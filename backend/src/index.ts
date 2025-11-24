import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import apiRoutes from './routes';
import { generalLimiter } from './middleware/rateLimiter';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = process.env.API_VERSION || 'v1';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: isDevelopment
    ? false
    : {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'", 'https:', 'data:'],
          imgSrc: ["'self'", 'data:', 'https:'],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
          connectSrc: ["'self'"],
        },
      },
})); // Security headers

// CORS configuration

const allowedOrigins: (string | RegExp | undefined)[] = isDevelopment
  ? [
      // Development origins - Public Ordering App
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      process.env.PUBLIC_APP_URL || 'http://localhost:5173',
      // Development origins - Internal Management App
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      process.env.ADMIN_APP_URL || 'http://localhost:5174',
      // Local network access (for testing on mobile devices)
      'http://192.168.0.9:5173', // Public app
      'http://192.168.0.9:5174', // Admin app
      // ngrok HTTPS tunnels (for Apple Pay/Google Pay testing)
      /^https:\/\/.*\.ngrok-free\.dev$/,
      /^https:\/\/.*\.ngrok\.io$/,
    ]
  : [
      // Production origins
      process.env.PUBLIC_APP_URL || 'https://order.hrc-kitchen.com',
      process.env.ADMIN_APP_URL || 'https://manage.hrc-kitchen.com',
      // Legacy support
      process.env.FRONTEND_URL,
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin matches allowed patterns
    const isAllowed = allowedOrigins.some((allowed) => {
      if (!allowed) {
        return false;
      }
      if (typeof allowed === 'string') {
        return origin === allowed;
      }
      return allowed.test(origin);
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Add cache-control header
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// Stripe webhook needs raw body for signature verification
// Must be before express.json() middleware
app.use('/api/v1/payment/webhook', express.raw({ type: 'application/json' }));

// Increase payload size limit for image uploads (default is 100kb)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use(`/api/${API_VERSION}`, apiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 HRC Kitchen API server running on port ${PORT}`);
  logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 API base URL: http://localhost:${PORT}/api/${API_VERSION}`);
});

export default app;
app.use(generalLimiter);
