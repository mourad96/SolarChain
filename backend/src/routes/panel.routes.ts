import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth, requireOwner } from '../middleware/auth.middleware';
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

// Create panels batch route
router.post(
  '/batch',
  requireAuth as any,
  [
    body('panels').isArray().withMessage('Panels must be an array'),
    body('panels.*.name').trim().notEmpty().withMessage('Name is required for all panels'),
    body('panels.*.location').trim().notEmpty().withMessage('Location is required for all panels'),
    body('panels.*.capacity')
      .isFloat({ min: 0 })
      .withMessage('Capacity must be a positive number for all panels'),
  ],
  validateRequest as any,
  panelController.createPanelsBatch.bind(panelController)
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
  panelController.updatePanel.bind(panelController)
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
  panelController.setPanelStatus.bind(panelController)
);

// Get projects for investors
router.get(
  '/projects/investors',
  requireAuth as any,
  panelController.getProjectsForInvestors.bind(panelController)
);

export { router as panelRouter }; 