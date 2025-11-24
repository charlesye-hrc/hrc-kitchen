import { Request, Response, NextFunction } from 'express';
import configService from '../services/config.service';

/**
 * Middleware to check if ordering window is active
 * Returns 403 if ordering window is closed
 */
export async function checkOrderingWindow(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const windowStatus = await configService.isOrderingWindowActive();

    if (!windowStatus.active) {
      res.status(403).json({
        success: false,
        message: windowStatus.message || 'Ordering window is closed',
        data: {
          orderingWindow: windowStatus.window,
        },
      });
      return;
    }

    // Attach window info to request for potential use in controllers
    (req as any).orderingWindow = windowStatus.window;

    next();
  } catch (error) {
    console.error('Error checking ordering window:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check ordering window',
    });
    return;
  }
}

/**
 * Middleware to get ordering window status (doesn't block request)
 * Attaches window status to request object
 */
export async function getOrderingWindowStatus(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const windowStatus = await configService.isOrderingWindowActive();
    (req as any).orderingWindowStatus = windowStatus;
    next();
  } catch (error) {
    console.error('Error getting ordering window status:', error);
    next(); // Continue even if there's an error
  }
}
