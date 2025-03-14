import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../types/auth';
import { IoTReading } from '@prisma/client';

interface PanelWithName {
  id: string;
  name: string;
  createdAt: Date;
}

interface ReadingWithPanelName extends Pick<IoTReading, 'id' | 'energyOutput' | 'timestamp'> {
  device: {
    panel: {
      name: string;
    };
  };
}

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    // Get total panels
    const totalPanels = await prisma.panel.count({
      where: { ownerId: userId },
    });

    // Get active devices
    const activeDevices = await prisma.ioTDevice.count({
      where: {
        panel: { ownerId: userId },
        status: 'online',
      },
    });

    // Calculate total energy generated
    const totalEnergyGenerated = await prisma.ioTReading.aggregate({
      _sum: {
        energyOutput: true,
      },
      where: {
        device: {
          panel: {
            ownerId: userId,
          },
        },
      },
    });

    // Get total tokens (this would be integrated with your blockchain logic)
    // For now, returning a placeholder
    const totalTokens = 0;

    res.json({
      totalPanels,
      totalTokens,
      totalEnergyGenerated: totalEnergyGenerated._sum.energyOutput || 0,
      activeDevices,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

export const getDashboardActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    // Get recent panel registrations
    const recentPanels = await prisma.panel.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    // Get recent IoT readings
    const recentReadings = await prisma.ioTReading.findMany({
      where: {
        device: {
          panel: {
            ownerId: userId,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 5,
      select: {
        id: true,
        energyOutput: true,
        timestamp: true,
        device: {
          select: {
            panel: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Combine and format activities
    const activities = [
      ...recentPanels.map((panel: PanelWithName) => ({
        id: `panel-${panel.id}`,
        type: 'panel_registered' as const,
        description: `New solar panel registered: ${panel.name}`,
        timestamp: panel.createdAt.toISOString(),
      })),
      ...recentReadings.map((reading: ReadingWithPanelName) => ({
        id: `reading-${reading.id}`,
        type: 'iot_data' as const,
        description: `Energy production: ${reading.energyOutput.toFixed(2)}kWh from ${reading.device.panel.name}`,
        timestamp: reading.timestamp.toISOString(),
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, 10);

    res.json(activities);
  } catch (error) {
    console.error('Error fetching dashboard activity:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard activity' });
  }
}; 