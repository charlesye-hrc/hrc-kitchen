import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Allow more shared-IP traffic while still capping abuse
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Per-account attempts
  message: 'Too many attempts for this account, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email;
    if (typeof email === 'string' && email.trim().length > 0) {
      return email.trim().toLowerCase();
    }
    return req.ip ?? 'unknown';
  },
});

export const paymentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 payment confirmations per minute per IP
  message: 'Too many payment confirmation requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests (even successful ones)
});

export const paymentConfirmLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  message: 'Too many payment confirmation attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const intentId = req.body?.paymentIntentId;
    if (typeof intentId === 'string' && intentId.trim().length > 0) {
      return `${intentId.trim()}`;
    }
    return req.ip ?? 'unknown';
  },
});

export const adminWriteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  message: 'Too many admin changes, please slow down and try again shortly',
  standardHeaders: true,
  legacyHeaders: false,
});

export const inventoryWriteLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 20,
  message: 'Too many inventory updates, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
