import { Router } from 'express';  
import { authRouter } from './auth.routes';  
import { panelRouter } from './panel.routes';  
import { iotRouter } from './iot.routes';  
import { tokenRouter } from './token.routes';  
import dashboardRoutes from './dashboard.routes';  
import investmentRoutes from './investment.routes';  
  
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
router.use('/investments', investmentRoutes);  

// Right before you export router:
router.all('*', (req, res) => {
  console.log('Reached the catch-all. Method:', req.method, 'Path:', req.originalUrl);
  res.status(404).send('Not Found');
});

  
export default router;  
