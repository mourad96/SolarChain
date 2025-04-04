import { Router } from 'express';
import { body, param } from 'express-validator';
import { investInProject } from '../controllers/investment.controller';
import { requireAuth, requireInvestor } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate-request';

const router = Router();

// Invest in a project
router.post(
  '/:panelId/invest',
  requireAuth,
  requireInvestor,
  [
    param('panelId').trim().notEmpty().withMessage('Panel ID is required'),
    body('shares')
      .isInt({ min: 1 })
      .withMessage('Number of shares must be a positive integer'),
  ],
  validateRequest,
  investInProject
);

export default router; 