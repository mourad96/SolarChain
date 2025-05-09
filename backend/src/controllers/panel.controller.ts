import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { BlockchainService } from '../services/blockchain.service';
import { prisma as prismaClient } from '../config/prisma';
import { randomUUID } from 'crypto';

// Initialize blockchain service
const blockchainService = new BlockchainService();

export async function registerPanel(req: Request, res: Response) {
  try {
    const { name, location, capacity, tokenName, tokenSymbol, totalShares } = req.body;
    const userId = (req as any).user.id;

    // Get user
    const user = await prismaClient.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.status(400).json({ message: 'User not found' });
      return;
    }

    // Check if user has a wallet address
    if (!user.walletAddress) {
      res.status(400).json({ 
        message: 'Wallet address required',
        error: 'You must connect a wallet before registering a panel'
      });
      return;
    }

    try {
      // Create a temporary panel object for blockchain registration
      const tempPanel = {
        id: randomUUID(), // Generate a temporary ID
        name,
        location,
        capacity: Number(capacity),
        ownerId: user.id,
        status: 'pending' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Get transaction data for blockchain registration
      const transactionData = await blockchainService.createPanelWithShares(
        tempPanel,
        tokenName || `${name} Token`,
        tokenSymbol || name.slice(0, 3).toUpperCase(),
        totalShares || 100
      );

      // Create panel in database with pending status
      const panel = await prismaClient.panel.create({
        data: {
          name,
          location,
          capacity: Number(capacity),
          ownerId: user.id,
          status: 'pending',
          blockchainTxHash: null, // Will be updated after user signs transaction
          blockchainTokenAddress: null, // Will be updated after transaction confirmation
          blockchainPanelId: null // Will be updated after transaction confirmation
        },
        include: {
          owner: true
        }
      });

      res.status(201).json({ 
        panel,
        transactions: transactionData.transactions,
        message: 'Please sign the transactions in your wallet to complete panel registration'
      });
      
    } catch (blockchainError) {
      logger.error('Failed to prepare panel registration transaction:', blockchainError);
      
      let errorMessage = 'Failed to prepare blockchain transaction';
      let errorCode = 'BLOCKCHAIN_ERROR';
      
      if (blockchainError.message.includes('not properly initialized')) {
        errorMessage = 'Blockchain service is not properly configured. Please contact support.';
        errorCode = 'BLOCKCHAIN_NOT_CONFIGURED';
      }
      
      res.status(400).json({ 
        error: errorMessage,
        details: blockchainError.message,
        errorCode
      });
    }
  } catch (error) {
    logger.error('Error in registerPanel:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updatePanel(req: Request, res: Response) {
  try {
    const { panelId } = req.params;
    const { name, location, capacity } = req.body;
    const userId = (req as any).user.id;

    // Get panel
    const panel = await prismaClient.panel.findUnique({
      where: { id: panelId },
      include: {
        owner: true
      }
    });

    if (!panel) {
      res.status(404).json({ message: 'Panel not found' });
      return;
    }

    // Check if user is the owner
    if (panel.ownerId !== userId) {
      res.status(403).json({ message: 'You do not have permission to update this panel' });
      return;
    }

    // Update in database
    const updatedPanel = await prismaClient.panel.update({
      where: { id: panelId },
      data: {
        name: name || panel.name,
        location: location || panel.location,
        capacity: capacity || panel.capacity
      }
    });

    res.json({
      message: 'Panel updated successfully',
      panel: updatedPanel
    });
  } catch (error) {
    logger.error('Error in updatePanel:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getPanelDetails(req: Request, res: Response) {
  try {
    const { panelId } = req.params;

    // Get panel from database
    const panel = await prismaClient.panel.findUnique({
      where: { id: panelId },
      include: {
        owner: true,
        devices: {
          include: {
            readings: true
          }
        }
      }
    });

    // Get panel from blockchain
    let blockchainPanel = null;
    try {
      blockchainPanel = await blockchainService.getPanelById(panelId);
    } catch (blockchainError) {
      logger.error('Error fetching panel from blockchain:', blockchainError);
    }

    // If panel exists in database
    if (panel) {
      // If we also got blockchain data, merge it
      if (blockchainPanel) {
        const mergedPanel = {
          ...panel,
          price: blockchainPanel.price || '0.00',
          blockchainData: {
            tokenId: blockchainPanel.tokenId,
            totalSupply: blockchainPanel.totalSupply,
            availableSupply: blockchainPanel.availableSupply,
            isMockData: blockchainPanel.isMockData || false,
            saleContractAddress: blockchainPanel.saleContractAddress,
            shareTokenAddress: blockchainPanel.shareTokenAddress
          },
          isBlockchainVerified: !blockchainPanel.isMockData
        };
        res.json(mergedPanel);
      } else {
        // If no blockchain data, return database panel with blockchain status
        res.json({
          ...panel,
          price: '0.00',
          blockchainData: null,
          isBlockchainVerified: false
        });
      }
      return;
    }

    // If panel only exists in blockchain
    if (blockchainPanel) {
      const formattedPanel = {
        id: panelId,
        name: blockchainPanel.name || `Solar Panel ${panelId}`,
        location: blockchainPanel.location || 'Blockchain',
        capacity: blockchainPanel.capacity || '0',
        price: blockchainPanel.price || '0.00',
        expectedROI: '0',
        progress: 0,
        owner: blockchainPanel.owner,
        blockchainData: {
          tokenId: blockchainPanel.tokenId,
          totalSupply: blockchainPanel.totalSupply,
          availableSupply: blockchainPanel.availableSupply,
          isMockData: blockchainPanel.isMockData || false,
          saleContractAddress: blockchainPanel.saleContractAddress,
          shareTokenAddress: blockchainPanel.shareTokenAddress
        },
        isBlockchainVerified: !blockchainPanel.isMockData
      };
      res.json(formattedPanel);
      return;
    }

    // If panel not found in either place
    res.status(404).json({ message: 'Panel not found' });
  } catch (error) {
    logger.error('Error in getPanelDetails:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function listPanels(_req: Request, res: Response) {
  try {
    const panels = await prismaClient.panel.findMany({
      include: {
        owner: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(panels);
  } catch (error) {
    logger.error('Error in listPanels:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getUserPanels(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const panels = await prismaClient.panel.findMany({
      where: { ownerId: userId },
      include: {
        owner: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(panels);
  } catch (error) {
    logger.error('Error in getUserPanels:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function setPanelStatus(req: Request, res: Response) {
  try {
    const { panelId } = req.params;
    const { status } = req.body;
    const userId = (req as any).user.id;

    // Get panel
    const panel = await prismaClient.panel.findUnique({
      where: { id: panelId },
      include: {
        owner: true
      }
    });

    if (!panel) {
      res.status(404).json({ message: 'Panel not found' });
      return;
    }

    // Check if user is the owner
    if (panel.ownerId !== userId) {
      res.status(403).json({ message: 'You do not have permission to update this panel' });
      return;
    }

    // Update status in database
    const updatedPanel = await prismaClient.panel.update({
      where: { id: panelId },
      data: { status }
    });

    res.json({
      message: 'Panel status updated successfully',
      panel: updatedPanel
    });
  } catch (error) {
    logger.error('Error in setPanelStatus:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function updatePanelBlockchainStatus(req: Request, res: Response) {
  try {
    const { panelId } = req.params;
    const { txHash, tokenAddress } = req.body;
    const userId = (req as any).user.id;

    // Get panel
    const panel = await prismaClient.panel.findUnique({
      where: { id: panelId },
      include: {
        owner: true
      }
    });

    if (!panel) {
      res.status(404).json({ message: 'Panel not found' });
      return;
    }

    // Check if user is the owner
    if (panel.ownerId !== userId) {
      res.status(403).json({ message: 'You do not have permission to update this panel' });
      return;
    }

    // Get the next panel ID from blockchain and subtract 1 to get current panel ID
    const nextPanelId = await blockchainService.getNextPanelId();
    const currentPanelId = (BigInt(nextPanelId) - BigInt(1)).toString();

    // Update panel with blockchain information
    const updatedPanel = await prismaClient.panel.update({
      where: { id: panelId },
      data: {
        status: 'active',
        blockchainTxHash: txHash,
        blockchainTokenAddress: tokenAddress,
        blockchainPanelId: currentPanelId
      }
    });

    res.json({
      message: 'Panel blockchain status updated successfully',
      panel: updatedPanel
    });
  } catch (error) {
    logger.error('Error in updatePanelBlockchainStatus:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Export the PanelController class
export class PanelController {
  private blockchainService: BlockchainService;

  constructor() {
    this.blockchainService = new BlockchainService();
  }

  async getBlockchainPanels(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const user = await prismaClient.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true }
      });

      if (!user?.walletAddress) {
        return res.status(400).json({ error: 'User has not connected a wallet' });
      }

      console.log("user", user);
      const userPanels = await prismaClient.panel.findMany({
        where: { ownerId: userId },
        select: {
          id: true,
          name: true,
          location: true,
          capacity: true,
          status: true,
          blockchainPanelId: true,
          blockchainTxHash: true,
          blockchainTokenAddress: true,
          createdAt: true
        }
      });

      console.log("userPanels", userPanels);
      try {
        // Get all panels from blockchain with database information
        const panels = await this.blockchainService.getAllPanels();
        console.log("panels from blockchain:", panels);
        const panelDetails = await Promise.all(panels.map(async (panel) => {
          try {
            console.log("processing panel:", panel);
            const panelData = await this.blockchainService.getPanelFromBlockchain(panel.serialNumber);
            const blockchainData = await this.blockchainService.getPanelById(panelData.id);
            return {
              ...panelData,
              name: panel.name, // Use the name from database
              location: panel.location, // Use the location from database
              capacity: panel.capacity, // Use the capacity from database
              blockchainData: {
                tokenId: blockchainData.tokenId,
                totalSupply: blockchainData.totalSupply,
                availableSupply: blockchainData.availableSupply,
                isMockData: blockchainData.isMockData || false,
                saleContractAddress: blockchainData.saleContractAddress,
                shareTokenAddress: blockchainData.shareTokenAddress
              },
              isBlockchainVerified: !blockchainData.isMockData
            };
          } catch (error) {
            const errorMessage = error.message && error.message.includes('not found')
              ? `Panel exists in database but not on blockchain yet (${error.message})`
              : error.message || 'Unknown error';
            logger.warn('Error fetching panel details:', {
              serialNumber: panel.serialNumber,
              errorMessage,
              fallback: 'Will use database panel information instead'
            });
            return null;
          }
        }));

        const validPanels = panelDetails.filter(panel => panel !== null);
        if (validPanels.length > 0) {
          return res.json(validPanels);
        }
      } catch (blockchainError) {
        logger.error('Blockchain service error:', blockchainError);
      }

      const formattedPanels = userPanels.map((panel) => ({
        id: panel.blockchainPanelId || 'N/A',
        serialNumber: panel.id,
        manufacturer: 'Unknown',
        name: panel.name,
        location: panel.location || 'Unknown',
        capacity: panel.capacity,
        owner: user.walletAddress || 'Unknown',
        isActive: panel.status === 'active',
        registrationDate: panel.createdAt,
        tokenAddress: panel.blockchainTokenAddress || null,
        blockchainStatus: panel.blockchainPanelId ? 'Registered' : 'Pending Registration',
        message: panel.blockchainPanelId
          ? null
          : 'This panel has not yet been registered on the blockchain. It exists only in the local database. The blockchain registration process will happen in the background.',
        isBlockchainRegistered: !!panel.blockchainPanelId
      }));

      return res.json(formattedPanels);
    } catch (error) {
      logger.error('Get blockchain panels error:', error);
      return res.status(500).json({ error: 'Failed to fetch blockchain panels' });
    }
  }

  // ... rest of the PanelController class methods ...
} 