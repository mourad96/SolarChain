import { Router, Request, Response, NextFunction } from 'express';
import { getDashboardStats, getDashboardActivity } from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();

// Get dashboard statistics
router.get('/stats', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getDashboardStats(req as AuthenticatedRequest, res);
  } catch (error) {
    next(error);
  }
});

// Get recent activity
router.get('/activity', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getDashboardActivity(req as AuthenticatedRequest, res);
  } catch (error) {
    next(error);
  }
});

export default router; 