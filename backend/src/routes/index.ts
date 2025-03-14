import { Router } from 'express';
import { authRouter } from './auth.routes';
import { panelRouter } from './panel.routes';
import { iotRouter } from './iot.routes';
import { tokenRouter } from './token.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// API routes
router.use('/auth', authRouter);
router.use('/panels', panelRouter);
router.use('/iot', iotRouter);
router.use('/tokens', tokenRouter);
router.use('/dashboard', dashboardRoutes);

export { router }; 