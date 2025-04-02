import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth, requireOwner } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate-request';
import { 
  registerPanel,
  updatePanel,
  getPanelDetails,
  listPanels,
  getUserPanels,
  setPanelStatus
} from '../controllers/panel.controller';
import { PanelController } from '../controllers/panel.controller';

const router = Router();
const panelController = new PanelController();

// Create panel route
router.post(
  '/',
  requireAuth as any,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('capacity')
      .isFloat({ min: 0 })
      .withMessage('Capacity must be a positive number'),
    body('tokenName')
      .optional()
      .trim(),
    body('tokenSymbol')
      .optional()
      .trim()
      .isLength({ max: 6 })
      .withMessage('Token symbol cannot be longer than 6 characters'),
    body('totalShares')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Total shares must be a positive integer'),
  ],
  validateRequest as any,
  registerPanel
);

// List panels route
router.get(
  '/',
  requireAuth as any,
  listPanels
);

// Get panel details
router.get(
  '/:panelId',
  requireAuth as any,
  getPanelDetails
);

// Update panel
router.put(
  '/:panelId',
  requireOwner as any,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('location').optional().trim().notEmpty().withMessage('Location cannot be empty'),
    body('capacity')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Capacity must be a positive number'),
  ],
  validateRequest as any,
  updatePanel
);

// Update panel status
router.patch(
  '/:panelId/status',
  requireOwner as any,
  [
    body('status')
      .isIn(['active', 'inactive', 'maintenance'])
      .withMessage('Status must be one of: active, inactive, maintenance'),
  ],
  validateRequest as any,
  setPanelStatus
);

// Get user's panels
router.get(
  '/user/:userId',
  requireAuth as any,
  getUserPanels
);

// Get all blockchain panels
router.get(
  '/blockchain/all',
  requireAuth as any,
  panelController.getBlockchainPanels.bind(panelController)
);

export { router as panelRouter }; 