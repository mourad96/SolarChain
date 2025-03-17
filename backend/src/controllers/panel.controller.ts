import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AssetRegistry__factory } from '../typechain-types';
import { PrismaClient } from '@prisma/client';
import { BlockchainService } from '../services/blockchain.service';

// Initialize blockchain connection
let provider: ethers.JsonRpcProvider | undefined;
let wallet: ethers.Wallet | undefined;
let assetRegistry: ReturnType<typeof AssetRegistry__factory.connect> | undefined;

try {
  if (config.blockchain.rpcUrl && config.blockchain.privateKey && config.blockchain.contracts.solarPanelRegistry) {
    provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
    wallet = new ethers.Wallet(config.blockchain.privateKey, provider);
    assetRegistry = AssetRegistry__factory.connect(
      config.blockchain.contracts.solarPanelRegistry,
      wallet
    );
  } else {
    logger.warn('Missing blockchain configuration. Some features will be disabled.');
  }
} catch (error) {
  logger.error('Failed to initialize blockchain connection:', error);
}

const prismaClient = new PrismaClient();
const blockchainService = new BlockchainService();

export const registerPanel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, location, capacity } = req.body;
    const userId = (req as any).user.id;

    // Get user
    const user = await prismaClient.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.status(400).json({ message: 'User not found' });
      return;
    }

    // Try blockchain registration if available
    if (assetRegistry && user.walletAddress) {
      try {
        const tx = await assetRegistry.registerPanel(name, location, capacity);
        await tx.wait();
      } catch (error) {
        logger.warn('Failed to register panel on blockchain:', error);
        // Continue with database registration
      }
    }

    // Create panel in database
    const panel = await prismaClient.panel.create({
      data: {
        name,
        location,
        capacity: Number(capacity),
        ownerId: user.id,
        status: 'active'
      },
      include: {
        owner: true
      }
    });

    res.status(201).json({
      message: 'Panel registered successfully',
      panel: {
        id: panel.id,
        name: panel.name,
        location: panel.location,
        capacity: panel.capacity,
        status: panel.status
      },
    });
  } catch (error) {
    logger.error('Error in registerPanel:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updatePanel = async (req: Request, res: Response): Promise<void> => {
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
};

export const getPanelDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { panelId } = req.params;

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

    if (!panel) {
      res.status(404).json({ message: 'Panel not found' });
      return;
    }

    res.json(panel);
  } catch (error) {
    logger.error('Error in getPanelDetails:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const listPanels = async (_req: Request, res: Response): Promise<void> => {
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
};

export const getUserPanels = async (req: Request, res: Response): Promise<void> => {
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
};

export const setPanelStatus = async (req: Request, res: Response): Promise<void> => {
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

    // Update in database
    const updatedPanel = await prismaClient.panel.update({
      where: { id: panelId },
      data: {
        status
      }
    });

    res.json({
      message: 'Panel status updated successfully',
      panel: updatedPanel
    });
  } catch (error) {
    logger.error('Error in setPanelStatus:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getOnChainPanelDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { panelId } = req.params;

    if (!assetRegistry) {
      res.status(503).json({ message: 'Blockchain features are currently unavailable' });
      return;
    }

    // Get panel from database first to get the onChainPanelId
    const panel = await prismaClient.panel.findUnique({
      where: { id: panelId },
      include: { owner: true }
    });

    if (!panel) {
      res.status(404).json({ message: 'Panel not found' });
      return;
    }

    // Get on-chain data
    try {
      const [name, location, capacity, owner, isActive, registrationDate] = 
        await assetRegistry.getPanelDetails(panel.id);
      
      res.json({
        id: panel.id,
        name,
        location,
        capacity: ethers.formatUnits(capacity, 0),
        owner: {
          address: owner,
          name: panel.owner.name,
          email: panel.owner.email
        },
        isActive,
        registrationDate: new Date(Number(registrationDate) * 1000)
      });
    } catch (error) {
      logger.warn(`Failed to get blockchain data for panel ${panel.id}:`, error);
      res.status(404).json({ message: 'Panel not found on blockchain' });
    }
  } catch (error) {
    logger.error('Error getting on-chain panel details:', error);
    res.status(500).json({ message: 'Failed to get panel details from blockchain' });
  }
};

export const getAllOnChainPanels = async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!assetRegistry) {
      res.status(503).json({ message: 'Blockchain features are currently unavailable' });
      return;
    }

    // Get panels from database first
    const dbPanels = await prismaClient.panel.findMany({
      include: { owner: true }
    });
    
    const panels = [];
    
    // For each panel in the database, try to get its blockchain data
    for (const dbPanel of dbPanels) {
      try {
        const [name, location, capacity, owner, isActive, registrationDate] = 
          await assetRegistry.getPanelDetails(dbPanel.id);
        
        panels.push({
          id: dbPanel.id,
          name,
          location,
          capacity: ethers.formatUnits(capacity, 0),
          owner,
          isActive,
          registrationDate: new Date(Number(registrationDate) * 1000)
        });
      } catch (error) {
        logger.warn(`Failed to get blockchain data for panel ${dbPanel.id}:`, error);
        // Skip this panel if blockchain data is not available
      }
    }

    res.json(panels);
  } catch (error) {
    logger.error('Error getting on-chain panels:', error);
    res.status(500).json({ message: 'Failed to get panels from blockchain' });
  }
};

export class PanelController {
  public async createPanel(req: Request, res: Response) {
    try {
      const { name, location, capacity } = req.body;
      const userId = (req as any).user.id;

      // Get user's wallet address
      const user = await prismaClient.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true }
      });

      if (!user?.walletAddress) {
        return res.status(400).json({ error: 'User must connect wallet before adding panels' });
      }

      // Create panel in database
      const panel = await prismaClient.panel.create({
        data: {
          name,
          location,
          capacity,
          status: 'active',
          ownerId: userId,
        },
      });

      try {
        // Register panel on blockchain
        const txHash = await blockchainService.registerPanelOnBlockchain(panel);
        logger.info('Panel registered on blockchain:', { panelId: panel.id, txHash });

        // Update panel with blockchain transaction hash
        await prismaClient.panel.update({
          where: { id: panel.id },
          data: { 
            blockchainTxHash: txHash 
          } as any,
        });

        return res.status(201).json({ 
          panel,
          blockchainTxHash: txHash,
          message: 'Panel created and registered on blockchain successfully' 
        });
      } catch (blockchainError) {
        logger.error('Failed to register panel on blockchain:', blockchainError);
        
        let errorMessage = 'Blockchain registration failed. Will retry later.';
        let errorCode = 'BLOCKCHAIN_ERROR';
        
        if (blockchainError.message.includes('not properly initialized')) {
          errorMessage = 'Blockchain service is not properly configured. Please contact support.';
          errorCode = 'BLOCKCHAIN_NOT_CONFIGURED';
        }
        
        // Even if blockchain registration fails, we keep the panel in our database
        return res.status(201).json({ 
          panel,
          warning: `Panel created but ${errorMessage}`,
          error: blockchainError.message,
          errorCode
        });
      }
    } catch (error) {
      logger.error('Create panel error:', error);
      return res.status(500).json({ error: 'Failed to create panel' });
    }
  }

  public async listPanels(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      const panels = await prismaClient.panel.findMany({
        where: {
          ownerId: userId,
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return res.json(panels);
    } catch (error) {
      logger.error('List panels error:', error);
      return res.status(500).json({ error: 'Failed to fetch panels' });
    }
  }

  public async getBlockchainPanels(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      // Get user's wallet address
      const user = await prismaClient.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true }
      });

      if (!user?.walletAddress) {
        return res.status(400).json({ error: 'User has not connected a wallet' });
      }

      try {
        // Get panels from blockchain
        const panelSerialNumbers = await blockchainService.getOwnerPanels(user.walletAddress);
        
        // Get details for each panel
        const panelDetails = await Promise.all(
          panelSerialNumbers.map(async (serialNumber) => {
            try {
              return await blockchainService.getPanelFromBlockchain(serialNumber);
            } catch (error) {
              logger.error('Error fetching panel details:', { serialNumber, error });
              return null;
            }
          })
        );

        // Filter out any failed fetches
        const validPanels = panelDetails.filter(panel => panel !== null);

        return res.json(validPanels);
      } catch (blockchainError) {
        logger.error('Blockchain service error:', blockchainError);
        
        if (blockchainError.message.includes('not properly initialized')) {
          return res.status(503).json({ 
            error: 'Blockchain service unavailable', 
            message: 'The blockchain service is not properly configured. Please contact support.'
          });
        }
        
        throw blockchainError; // Re-throw to be caught by the outer catch block
      }
    } catch (error) {
      logger.error('Get blockchain panels error:', error);
      return res.status(500).json({ error: 'Failed to fetch blockchain panels' });
    }
  }

  public async getPanelDetails(req: Request, res: Response) {
    try {
      const { panelId } = req.params;
      const userId = (req as any).user.id;

      const panel = await prismaClient.panel.findUnique({
        where: { id: panelId },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              walletAddress: true,
            },
          },
          devices: true,
        },
      });

      if (!panel) {
        return res.status(404).json({ error: 'Panel not found' });
      }

      // Check if user is the owner
      if (panel.ownerId !== userId) {
        return res.status(403).json({ error: 'You do not have permission to view this panel' });
      }

      return res.json(panel);
    } catch (error) {
      logger.error('Error getting panel details:', error);
      return res.status(500).json({ error: 'Failed to get panel details' });
    }
  }

  public async updatePanel(req: Request, res: Response) {
    try {
      const { panelId } = req.params;
      const userId = (req as any).user.id;
      const { name, location, capacity } = req.body;

      // Check if panel exists
      const panel = await prismaClient.panel.findUnique({
        where: { id: panelId },
      });

      if (!panel) {
        return res.status(404).json({ error: 'Panel not found' });
      }

      // Check if user is the owner
      if (panel.ownerId !== userId) {
        return res.status(403).json({ error: 'You do not have permission to update this panel' });
      }

      // Update panel
      const updatedPanel = await prismaClient.panel.update({
        where: { id: panelId },
        data: {
          ...(name && { name }),
          ...(location && { location }),
          ...(capacity && { capacity }),
        },
      });

      return res.json(updatedPanel);
    } catch (error) {
      logger.error('Error updating panel:', error);
      return res.status(500).json({ error: 'Failed to update panel' });
    }
  }

  public async setPanelStatus(req: Request, res: Response) {
    try {
      const { panelId } = req.params;
      const userId = (req as any).user.id;
      const { status } = req.body;

      // Check if panel exists
      const panel = await prismaClient.panel.findUnique({
        where: { id: panelId },
      });

      if (!panel) {
        return res.status(404).json({ error: 'Panel not found' });
      }

      // Check if user is the owner
      if (panel.ownerId !== userId) {
        return res.status(403).json({ error: 'You do not have permission to update this panel' });
      }

      // Update panel status
      const updatedPanel = await prismaClient.panel.update({
        where: { id: panelId },
        data: { status },
      });

      return res.json(updatedPanel);
    } catch (error) {
      logger.error('Error updating panel status:', error);
      return res.status(500).json({ error: 'Failed to update panel status' });
    }
  }

  public async createPanelsBatch(req: Request, res: Response) {
    try {
      const { panels } = req.body;
      const userId = (req as any).user.id;

      if (!Array.isArray(panels) || panels.length === 0) {
        return res.status(400).json({ error: 'Invalid panels data. Expected non-empty array.' });
      }

      // Get user
      const user = await prismaClient.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      // Create panels in database
      const createdPanels = await Promise.all(
        panels.map(async (panelData) => {
          return await prismaClient.panel.create({
            data: {
              name: panelData.name,
              location: panelData.location || 'Unknown',
              capacity: panelData.capacity,
              status: 'active',
              owner: {
                connect: { id: userId }
              }
            }
          });
        })
      );

      // Try blockchain registration if user has wallet address
      let blockchainTxHash: string | null = null;
      let blockchainError: any = null;
      
      if (user.walletAddress) {
        try {
          blockchainTxHash = await blockchainService.registerPanelsBatch(createdPanels);
          
          // Update panels with blockchain transaction hash
          await Promise.all(
            createdPanels.map(async (panel) => {
              await prismaClient.panel.update({
                where: { id: panel.id },
                data: { 
                  blockchainTxHash 
                } as any
              });
            })
          );
        } catch (error) {
          blockchainError = error;
          logger.error('Error registering panels on blockchain:', error);
          
          // Clear blockchain transaction hash for failed registrations
          await Promise.all(
            createdPanels.map(async (panel) => {
              await prismaClient.panel.update({
                where: { id: panel.id },
                data: { 
                  blockchainTxHash: null 
                } as any
              });
            })
          );
        }
      }

      const response: any = {
        message: 'Panels created successfully',
        panels: createdPanels
      };
      
      if (blockchainTxHash) {
        response.blockchainTxHash = blockchainTxHash;
        response.blockchainStatus = 'REGISTERED';
      } else if (blockchainError) {
        let errorMessage = 'Blockchain registration failed. Will retry later.';
        let errorCode = 'BLOCKCHAIN_ERROR';
        
        if (blockchainError.message && blockchainError.message.includes('not properly initialized')) {
          errorMessage = 'Blockchain service is not properly configured. Please contact support.';
          errorCode = 'BLOCKCHAIN_NOT_CONFIGURED';
        }
        
        response.warning = `Panels created but ${errorMessage}`;
        response.error = blockchainError.message;
        response.errorCode = errorCode;
      } else if (user.walletAddress) {
        response.warning = 'Panels created but blockchain registration was not attempted.';
      }

      return res.status(201).json(response);
    } catch (error) {
      logger.error('Create panels batch error:', error);
      return res.status(500).json({ error: 'Failed to create panels' });
    }
  }

  public async getProjectsForInvestors(_req: Request, res: Response) {
    try {
      // Get all panels from the database that are active
      const panels = await prismaClient.panel.findMany({
        where: {
          status: 'active',
        },
        select: {
          id: true,
          name: true,
          location: true,
          capacity: true,
          status: true,
          createdAt: true,
          owner: {
            select: {
              name: true,
            },
          },
        },
      });

      // Get blockchain data for each panel if available
      const projectsWithBlockchainData = await Promise.all(
        panels.map(async (panel) => {
          let blockchainData = null;
          let progress = Math.floor(Math.random() * 100); // Default random progress for now
          let minInvestment = '$1,000'; // Default min investment
          let expectedROI = '12%'; // Default ROI

          try {
            // Get blockchain data using the BlockchainService
            const onChainPanel = await blockchainService.getPanelById(panel.id);
            if (onChainPanel) {
              blockchainData = {
                tokenId: onChainPanel.tokenId.toString(),
                totalSupply: onChainPanel.totalSupply,
                availableSupply: onChainPanel.availableSupply,
              };
              
              // Calculate progress based on available supply vs total supply
              const totalSupply = parseFloat(blockchainData.totalSupply);
              const availableSupply = parseFloat(blockchainData.availableSupply);
              if (totalSupply > 0) {
                progress = Math.floor(((totalSupply - availableSupply) / totalSupply) * 100);
              }
              
              // Calculate min investment based on token price
              const tokenPrice = await blockchainService.getTokenPrice(panel.id);
              if (tokenPrice) {
                minInvestment = `$${(parseFloat(tokenPrice) * 10).toFixed(2)}`;
              }
              
              // Get expected ROI from blockchain or calculate based on historical data
              const estimatedROI = await blockchainService.getEstimatedROI(panel.id);
              if (estimatedROI) {
                expectedROI = `${estimatedROI}%`;
              }
            }
          } catch (error) {
            logger.error(`Failed to get blockchain data for panel ${panel.id}:`, error);
          }

          return {
            id: panel.id,
            name: panel.name,
            location: panel.location,
            capacity: `${panel.capacity} kW`,
            owner: panel.owner.name,
            minInvestment,
            expectedROI,
            progress,
            blockchainData,
            createdAt: panel.createdAt,
          };
        })
      );

      res.json(projectsWithBlockchainData);
    } catch (error) {
      logger.error('Error fetching projects for investors:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  }
} 