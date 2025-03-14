import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate-request';
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
  ],
  validateRequest as any,
  panelController.createPanel.bind(panelController)
);

// List panels route
router.get(
  '/',
  requireAuth as any,
  panelController.listPanels.bind(panelController)
);

// Get blockchain panels route
router.get(
  '/blockchain/all',
  requireAuth as any,
  panelController.getBlockchainPanels.bind(panelController)
);

// Get panel details
router.get(
  '/:panelId',
  requireAuth as any,
  panelController.getPanelDetails.bind(panelController)
);

// Update panel
router.put(
  '/:panelId',
  requireAuth as any,
  requireRole(['admin', 'panel_owner']) as any,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('location').optional().trim().notEmpty().withMessage('Location cannot be empty'),
    body('capacity')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Capacity must be a positive number'),
  ],
  validateRequest as any,
  panelController.updatePanel.bind(panelController)
);

// Update panel status
router.patch(
  '/:panelId/status',
  requireAuth as any,
  requireRole(['admin', 'panel_owner']) as any,
  [
    body('status')
      .isIn(['active', 'inactive', 'maintenance'])
      .withMessage('Status must be one of: active, inactive, maintenance'),
  ],
  validateRequest as any,
  panelController.setPanelStatus.bind(panelController)
);

export { router as panelRouter }; 