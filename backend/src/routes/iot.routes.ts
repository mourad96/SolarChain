import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { IoTController, submitIoTData, getPanelIoTData, getAggregatedPanelData } from '../controllers/iot.controller';
import { validateRequest } from '../middleware/validate-request';
import { requireAuth } from '../middleware/auth.middleware';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();
const iotController = new IoTController();

// Submit IoT data for a panel
router.post(
  '/data',
  requireAuth,
  [
    body('panelId').isUUID().withMessage('Invalid panel ID'),
    body('powerOutput').isFloat({ min: 0 }).withMessage('Power output must be a positive number'),
    body('temperature').isFloat().withMessage('Temperature must be a number'),
    body('voltage').isFloat({ min: 0 }).withMessage('Voltage must be a positive number'),
    body('current').isFloat({ min: 0 }).withMessage('Current must be a positive number'),
    body('timestamp').optional().isISO8601().withMessage('Invalid timestamp format'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await submitIoTData(req as AuthenticatedRequest, res);
    } catch (error) {
      next(error);
    }
  }
);

// Get IoT data for a panel with optional date range
router.get(
  '/data/:panelId',
  requireAuth,
  [
    param('panelId').isUUID().withMessage('Invalid panel ID'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getPanelIoTData(req as AuthenticatedRequest, res);
    } catch (error) {
      next(error);
    }
  }
);

// Get aggregated IoT data for a panel
router.get(
  '/data/:panelId/aggregate',
  requireAuth,
  [
    param('panelId').isUUID().withMessage('Invalid panel ID'),
    query('interval').optional().isIn(['hourly', 'daily', 'monthly']).withMessage('Invalid interval'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getAggregatedPanelData(req as AuthenticatedRequest, res);
    } catch (error) {
      next(error);
    }
  }
);

// Get all IoT devices for the authenticated user
router.get('/devices', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await iotController.getDevices(req as AuthenticatedRequest, res);
  } catch (error) {
    next(error);
  }
});

// Get a specific device by ID
router.get('/devices/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await iotController.getDeviceById(req as AuthenticatedRequest, res);
  } catch (error) {
    next(error);
  }
});

// Register a new IoT device
router.post(
  '/devices',
  requireAuth,
  [
    body('panelId').trim().notEmpty().withMessage('Panel ID is required'),
    body('deviceType').trim().notEmpty().withMessage('Device type is required'),
    body('serialNumber').trim().notEmpty().withMessage('Serial number is required'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await iotController.registerDevice(req as AuthenticatedRequest, res);
    } catch (error) {
      next(error);
    }
  }
);

// Update device status
router.put(
  '/devices/:id/status',
  requireAuth,
  [
    body('status').isIn(['online', 'offline', 'error']).withMessage('Invalid status'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await iotController.updateDeviceStatus(req as AuthenticatedRequest, res);
    } catch (error) {
      next(error);
    }
  }
);

// Get device readings
router.get(
  '/readings/:deviceId',
  requireAuth,
  [
    query('range').optional().isIn(['1h', '24h', '7d', '30d']).withMessage('Invalid time range'),
    query('from').optional().isISO8601().withMessage('Invalid from date'),
    query('to').optional().isISO8601().withMessage('Invalid to date'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await iotController.getReadings(req as AuthenticatedRequest, res);
    } catch (error) {
      next(error);
    }
  }
);

// Submit new reading
router.post(
  '/readings',
  requireAuth,
  [
    body('deviceId').trim().notEmpty().withMessage('Device ID is required'),
    body('energyOutput').isFloat({ min: 0 }).withMessage('Energy output must be a positive number'),
    body('temperature').isFloat().withMessage('Temperature must be a valid number'),
    body('voltage').isFloat({ min: 0 }).withMessage('Voltage must be a positive number'),
    body('current').isFloat({ min: 0 }).withMessage('Current must be a positive number'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await iotController.submitReading(req as AuthenticatedRequest, res);
    } catch (error) {
      next(error);
    }
  }
);

// Get device statistics
router.get(
  '/devices/:id/stats',
  requireAuth,
  [
    query('period').optional().isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid period'),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await iotController.getDeviceStats(req as AuthenticatedRequest, res);
    } catch (error) {
      next(error);
    }
  }
);

export { router as iotRouter }; 