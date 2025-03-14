import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { SolarPanelContract } from '../typechain-types/contracts/SolarPanel';
import { AuthenticatedRequest } from '../types/auth';
import { config } from '../config';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface IoTReading {
  id: string;
  deviceId: string;
  energyOutput: number;
  temperature: number;
  voltage: number;
  current: number;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface IoTStats {
  totalEnergyOutput: number;
  avgTemperature: number;
  maxEnergyOutput: number;
  readingCount: number;
  readings: IoTReading[];
}

export class IoTController {
  private contract: SolarPanelContract | undefined;

  constructor() {
    // Initialize contract connection
    try {
      if (config.blockchain.rpcUrl && config.blockchain.privateKey) {
        const provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
        const wallet = new ethers.Wallet(config.blockchain.privateKey, provider);
        this.contract = new ethers.Contract(
          config.blockchain.contracts.assetRegistry,
          ['function updatePanelData(uint256 panelId, uint256 energyOutput)'],
          wallet
        ) as unknown as SolarPanelContract;
      } else {
        logger.warn('Missing blockchain configuration. Some features will be disabled.');
      }
    } catch (error) {
      logger.error('Failed to initialize blockchain connection:', error);
    }
  }

  // Get all IoT devices for the authenticated user
  public getDevices = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const devices = await prisma.ioTDevice.findMany({
        where: {
          panel: {
            ownerId: req.user.id,
          },
        },
        include: {
          panel: true,
        },
      });

      res.json(devices);
    } catch (error) {
      console.error('Error fetching devices:', error);
      res.status(500).json({ error: 'Failed to fetch devices' });
    }
  };

  // Get a specific device by ID
  public getDeviceById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const device = await prisma.ioTDevice.findUnique({
        where: {
          id: req.params.id,
          panel: {
            ownerId: req.user.id,
          },
        },
        include: {
          panel: true,
        },
      });

      if (!device) {
        res.status(404).json({ error: 'Device not found' });
        return;
      }

      res.json(device);
    } catch (error) {
      console.error('Error fetching device:', error);
      res.status(500).json({ error: 'Failed to fetch device' });
    }
  };

  // Register a new IoT device
  public registerDevice = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { panelId, deviceType, serialNumber } = req.body;

    try {
      // Check if panel exists and belongs to user
      const panel = await prisma.panel.findUnique({
        where: {
          id: panelId,
          ownerId: req.user.id,
        },
      });

      if (!panel) {
        res.status(404).json({ error: 'Panel not found' });
        return;
      }

      const device = await prisma.ioTDevice.create({
        data: {
          panelId,
          deviceType,
          serialNumber,
          status: 'offline',
        },
      });

      res.status(201).json(device);
    } catch (error) {
      console.error('Error registering device:', error);
      res.status(500).json({ error: 'Failed to register device' });
    }
  };

  // Update device status
  public updateDeviceStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { status } = req.body;

    try {
      const device = await prisma.ioTDevice.update({
        where: {
          id: req.params.id,
          panel: {
            ownerId: req.user.id,
          },
        },
        data: {
          status,
          lastUpdate: new Date(),
        },
      });

      res.json(device);
    } catch (error) {
      console.error('Error updating device status:', error);
      res.status(500).json({ error: 'Failed to update device status' });
    }
  };

  // Get device readings
  public getReadings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { deviceId } = req.params;
    const { range, from, to } = req.query;

    try {
      let dateFilter: any = {};

      if (from && to) {
        dateFilter = {
          timestamp: {
            gte: new Date(from as string),
            lte: new Date(to as string),
          },
        };
      } else if (range) {
        const now = new Date();
        switch (range) {
          case '1h':
            dateFilter = {
              timestamp: {
                gte: new Date(now.getTime() - 60 * 60 * 1000),
              },
            };
            break;
          case '24h':
            dateFilter = {
              timestamp: {
                gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
              },
            };
            break;
          case '7d':
            dateFilter = {
              timestamp: {
                gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
              },
            };
            break;
          case '30d':
            dateFilter = {
              timestamp: {
                gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
              },
            };
            break;
        }
      }

      const readings = await prisma.ioTReading.findMany({
        where: {
          deviceId,
          ...dateFilter,
          device: {
            panel: {
              ownerId: req.user.id,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      res.json(readings);
    } catch (error) {
      console.error('Error fetching readings:', error);
      res.status(500).json({ error: 'Failed to fetch readings' });
    }
  };

  // Submit new reading
  public submitReading = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { deviceId, energyOutput, temperature, voltage, current } = req.body;

    try {
      // Check if device exists and belongs to user
      const device = await prisma.ioTDevice.findUnique({
        where: {
          id: deviceId,
          panel: {
            ownerId: req.user.id,
          },
        },
        include: {
          panel: true,
        },
      });

      if (!device) {
        res.status(404).json({ error: 'Device not found' });
        return;
      }

      // Create reading in database
      const reading = await prisma.ioTReading.create({
        data: {
          deviceId,
          energyOutput,
          temperature,
          voltage,
          current,
          timestamp: new Date(),
        },
      });

      // Update blockchain with new energy output
      if (this.contract) {
        try {
          await this.contract.updatePanelData(device.panel.id, energyOutput);
        } catch (error) {
          console.warn('Failed to update blockchain:', error);
        }
      }

      res.status(201).json(reading);
    } catch (error) {
      console.error('Error submitting reading:', error);
      res.status(500).json({ error: 'Failed to submit reading' });
    }
  };

  // Get device statistics
  public getDeviceStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { period } = req.query;

    try {
      const device = await prisma.ioTDevice.findUnique({
        where: {
          id,
          panel: {
            ownerId: req.user.id,
          },
        },
      });

      if (!device) {
        res.status(404).json({ error: 'Device not found' });
        return;
      }

      const now = new Date();
      let startDate = new Date();

      switch (period) {
        case 'daily':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'weekly':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(now.getMonth() - 1);
          break;
        default:
          startDate.setDate(now.getDate() - 1); // Default to daily
      }

      const readings = await prisma.ioTReading.findMany({
        where: {
          deviceId: id,
          timestamp: {
            gte: startDate,
            lte: now,
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      const stats: IoTStats = {
        totalEnergyOutput: readings.reduce((sum, r) => sum + r.energyOutput, 0),
        avgTemperature: readings.reduce((sum, r) => sum + r.temperature, 0) / (readings.length || 1),
        maxEnergyOutput: Math.max(...readings.map(r => r.energyOutput), 0),
        readingCount: readings.length,
        readings,
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching device stats:', error);
      res.status(500).json({ error: 'Failed to fetch device statistics' });
    }
  };
}

export const submitIoTData = async (_req: Request, res: Response): Promise<void> => {
  // Implementation for submitting IoT data
  res.status(501).json({ error: 'Not implemented' });
};

export const getPanelIoTData = async (_req: Request, res: Response): Promise<void> => {
  // Implementation for getting panel IoT data
  res.status(501).json({ error: 'Not implemented' });
};

export const getAggregatedPanelData = async (_req: Request, res: Response): Promise<void> => {
  // Implementation for getting aggregated panel data
  res.status(501).json({ error: 'Not implemented' });
}; 