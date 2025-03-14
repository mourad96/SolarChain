import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate-request';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// Register route
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address'),
    body('password')
      .trim()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
  ],
  validateRequest as any,
  async (req: Request, res: Response): Promise<void> => {
    await authController.register(req, res);
  }
);

// Login route
router.post(
  '/login',
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address'),
    body('password').trim().notEmpty().withMessage('Password is required'),
  ],
  validateRequest as any,
  async (req: Request, res: Response): Promise<void> => {
    await authController.login(req, res);
  }
);

// Get current user route
router.get('/me', requireAuth as any, async (req: Request, res: Response): Promise<void> => {
  await authController.getCurrentUser(req, res);
});

// Connect wallet route
router.post(
  '/connect-wallet',
  requireAuth as any,
  [
    body('address')
      .trim()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Please provide a valid Ethereum address'),
  ],
  validateRequest as any,
  async (req: Request, res: Response): Promise<void> => {
    await authController.connectWallet(req, res);
  }
);

// Become panel owner route
router.post('/become-panel-owner', requireAuth as any, async (req: Request, res: Response): Promise<void> => {
  await authController.becomePanelOwner(req, res);
});

// Update wallet route
router.post('/update-wallet', requireAuth as any, authController.updateWalletAddress.bind(authController));

// Get profile route
router.get('/profile', requireAuth as any, authController.getProfile.bind(authController));

export { router as authRouter }; 