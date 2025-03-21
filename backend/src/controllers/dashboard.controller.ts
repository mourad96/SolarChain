import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../types/auth';
import { IoTReading } from '@prisma/client';
import { ethers } from 'ethers';
import { config } from '../config';
import { DividendDistributor__factory } from '../typechain-types';
import { logger } from '../utils/logger';

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

// Initialize blockchain connection
let provider: ethers.JsonRpcProvider | undefined;
let dividendDistributor: ReturnType<typeof DividendDistributor__factory.connect> | undefined;

try {
  if (config.blockchain.rpcUrl && config.blockchain.privateKey && config.blockchain.contracts.dividendDistributor) {
    provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
    const wallet = new ethers.Wallet(config.blockchain.privateKey, provider);
    dividendDistributor = DividendDistributor__factory.connect(
      config.blockchain.contracts.dividendDistributor,
      wallet
    );
  } else {
    logger.warn('Missing blockchain configuration. Some dividend features will be disabled.');
  }
} catch (error) {
  logger.error('Failed to initialize blockchain connection:', error);
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

    // Get user wallet address
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true },
    });

    // Get user investments (tokens)
    const investments = await prisma.investment.count({
      where: { userId },
    });

    // Get panels with blockchain IDs
    const userPanels = await prisma.panel.findMany({
      where: { ownerId: userId },
      select: { 
        id: true, 
        blockchainPanelId: true,
      },
    });

    let totalUnclaimedDividends = 0;

    // If user has wallet and we have contract connection, get dividend data
    if (user?.walletAddress && dividendDistributor) {
      try {
        // Calculate total unclaimed dividends for all panels
        for (const panel of userPanels) {
          if (panel.blockchainPanelId) {
            // Get unclaimed dividends
            const unclaimed = await dividendDistributor.getUnclaimedDividends(
              panel.blockchainPanelId,
              user.walletAddress
            );
            totalUnclaimedDividends += parseFloat(ethers.formatUnits(unclaimed, 6)); // USDC has 6 decimals
          }
        }
      } catch (error) {
        logger.error('Error fetching dividend data:', error);
      }
    }

    res.json({
      totalPanels,
      totalTokens: investments,
      totalEnergyGenerated: totalEnergyGenerated._sum.energyOutput || 0,
      activeDevices,
      totalUnclaimedDividends,
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

    // Get recent investments/token activities
    const recentInvestments = await prisma.investment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        sharesPurchased: true,
        createdAt: true,
        panel: {
          select: {
            name: true,
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
      ...recentInvestments.map((investment) => ({
        id: `investment-${investment.id}`,
        type: 'investment' as const,
        description: `Purchased ${investment.sharesPurchased} shares of ${investment.panel.name}`,
        timestamp: investment.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, 10);

    res.json(activities);
  } catch (error) {
    console.error('Error fetching dashboard activity:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard activity' });
  }
}; 