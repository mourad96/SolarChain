import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import {
  mintTokens,
  transferTokens,
  getTokenDetails,
  listPanels,
  getUserTokens,
  getTokenHolders,
  distributeDividends,
  claimDividends,
  getUnclaimedDividends
} from '../controllers/token.controller';
import { validateRequest } from '../middleware/validate-request';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Get all panels for the authenticated user
router.get('/', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await listPanels(req, res);
  } catch (error) {
    next(error);
  }
});

// Get a specific token by ID
router.get('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await getTokenDetails(req, res);
  } catch (error) {
    next(error);
  }
});

// Get tokens for a specific panel
router.get('/panel/:panelId', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await getUserTokens(req, res);
  } catch (error) {
    next(error);
  }
});

// Mint new tokens
router.post(
  '/mint',
  requireAuth,
  [
    body('panelId').trim().notEmpty().withMessage('Panel ID is required'),
    body('amount')
      .isInt({ min: 1 })
      .withMessage('Amount must be a positive number'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await mintTokens(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Transfer tokens
router.post(
  '/transfer',
  requireAuth,
  [
    body('tokenId').trim().notEmpty().withMessage('Token ID is required'),
    body('recipientAddress')
      .trim()
      .notEmpty()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Invalid Ethereum address'),
    body('amount')
      .isInt({ min: 1 })
      .withMessage('Amount must be a positive number'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await transferTokens(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Get token holders for a panel
router.get('/panel/:panelId/holders', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await getTokenHolders(req, res);
  } catch (error) {
    next(error);
  }
});

// Get token transaction history
router.get('/:id/history', requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await getTokenDetails(req, res);
  } catch (error) {
    next(error);
  }
});

// Distribute dividends
router.post(
  '/distribute-dividends',
  requireAuth,
  [
    body('panelId').trim().notEmpty().withMessage('Panel ID is required'),
    body('amount')
      .isNumeric()
      .withMessage('Amount must be a number')
      .custom((value) => parseFloat(value) > 0)
      .withMessage('Amount must be greater than 0'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await distributeDividends(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Claim dividends
router.post(
  '/claim-dividends',
  requireAuth,
  [
    body('panelId').trim().notEmpty().withMessage('Panel ID is required'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await claimDividends(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Get unclaimed dividends
router.get(
  '/panel/:panelId/unclaimed-dividends',
  requireAuth,
  [
    param('panelId').trim().notEmpty().withMessage('Panel ID is required'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await getUnclaimedDividends(req, res);
    } catch (error) {
      next(error);
    }
  }
);

export { router as tokenRouter }; 