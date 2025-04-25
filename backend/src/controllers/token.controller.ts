import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { prisma } from '../services/prisma.service';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ShareToken__factory, DividendDistributor__factory, SolarPanelRegistry__factory } from '../typechain-types';
import { JsonValue } from '@prisma/client/runtime/library';
import { v4 as uuidv4 } from 'uuid';
import { BlockchainService } from '../services/blockchain.service';

// Define our own interfaces based on the database schema
interface Panel {
  id: string;
  name: string;
  location: string;
  capacity: number;
  status: string;
  ownerId: string;
  blockchainTxHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
  blockchainPanelId?: string | null;
  blockchainTokenAddress?: string | null;
}

interface ShareToken {
  id: string;
  panelId: string;
  totalShares: number;
  onChainTokenId: string;
  holderBalances: JsonValue;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  panel?: Panel;
}

interface HolderBalances {
  [key: string]: number;
}

// Initialize blockchain connection
let provider: ethers.JsonRpcProvider | undefined;
let wallet: ethers.Wallet | undefined;
let shareToken: ReturnType<typeof ShareToken__factory.connect> | undefined;
let dividendDistributor: ReturnType<typeof DividendDistributor__factory.connect> | undefined;
let solarPanelRegistry: ReturnType<typeof SolarPanelRegistry__factory.connect> | undefined;

try {
  if (config.blockchain.rpcUrl && config.blockchain.privateKey) {
    provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
    wallet = new ethers.Wallet(config.blockchain.privateKey, provider);
    
    if (config.blockchain.contracts.shareToken) {
    shareToken = ShareToken__factory.connect(
      config.blockchain.contracts.shareToken,
      wallet
    );
    }
    
    if (config.blockchain.contracts.dividendDistributor) {
      dividendDistributor = DividendDistributor__factory.connect(
        config.blockchain.contracts.dividendDistributor,
        wallet
      );
    }

    if (config.blockchain.contracts.solarPanelRegistry) {
      solarPanelRegistry = SolarPanelRegistry__factory.connect(
        config.blockchain.contracts.solarPanelRegistry,
        wallet
      );
    }
  } else {
    logger.warn('Missing blockchain configuration. Some features will be disabled.');
  }
} catch (error) {
  logger.error('Failed to initialize blockchain connection:', error);
}

export const mintTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const { panelId, amount } = req.body;
    const userId = (req as any).user.userId;

    // Get panel and check ownership
    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: { owner: true },
    });

    if (!panel) {
      res.status(404).json({ message: 'Panel not found' });
      return;
    }

    // Check if user is the owner of the panel
    if (panel.owner.id !== userId) {
      res.status(403).json({ error: 'You do not have permission to mint tokens for this panel' });
      return;
    }

    if (!shareToken) {
      res.status(503).json({ message: 'Blockchain features are currently unavailable' });
      return;
    }

    // Mint tokens on blockchain
    const tx = await shareToken.mintShares(panel.blockchainPanelId || '', amount);
    const receipt = await tx.wait();

    if (!receipt || !receipt.logs[0]) {
      res.status(500).json({ message: 'Failed to get transaction receipt' });
      return;
    }

    // Get token ID from event
    const event = receipt.logs[0];
    const parsedEvent = shareToken.interface.parseLog({
      topics: [...event.topics],
      data: event.data,
    });
    const onChainTokenId = parsedEvent?.args[0];

    // Create token record in database
    const tokenId = uuidv4();
    await prisma.$executeRaw`
      INSERT INTO share_tokens (
        "id", "panelId", "totalShares", "onChainTokenId", "holderBalances", "isActive", "createdAt", "updatedAt"
      ) VALUES (
        ${tokenId}, ${panelId}, ${amount}, ${onChainTokenId.toString()}, 
        ${JSON.stringify({ [panel.owner.walletAddress || '']: amount })}, ${true}, 
        ${new Date()}, ${new Date()}
      )
    `;

    const token = {
      id: tokenId,
      panelId,
      totalShares: amount,
      onChainTokenId: onChainTokenId.toString(),
      holderBalances: {
        [panel.owner.walletAddress || '']: amount,
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    res.status(201).json({
      message: 'Tokens minted successfully',
      token: {
        id: token.id,
        panelId: panel.id,
        totalShares: token.totalShares,
        onChainTokenId: token.onChainTokenId,
      },
    });
  } catch (error) {
    logger.error('Error in mintTokens:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const transferTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const { panelId, to, amount } = req.body;
    const userId = (req as any).user.userId;

    // Get user and token
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.walletAddress) {
      res.status(400).json({ message: 'User must connect wallet first' });
      return;
    }

    // Get token using raw SQL
    const tokens = await prisma.$queryRaw<ShareToken[]>`
      SELECT * FROM share_tokens 
      WHERE "panelId" = ${panelId}
    `;
    
    if (!tokens || tokens.length === 0) {
      res.status(404).json({ message: 'Token not found' });
      return;
    }
    
    const token = tokens[0];
    
    // Get the panel
    const panels = await prisma.$queryRaw<Panel[]>`
      SELECT * FROM panels
      WHERE "id" = ${token.panelId}
    `;
    
    if (!panels || panels.length === 0) {
      res.status(404).json({ message: 'Panel not found' });
      return;
    }
    
    const panel = panels[0];
    token.panel = panel;

    // Check balance
    const holderBalances = token.holderBalances as HolderBalances;
    const userBalance = holderBalances[user.walletAddress] || 0;
    if (userBalance < amount) {
      res.status(400).json({ message: 'Insufficient balance' });
      return;
    }

    if (!shareToken) {
      res.status(503).json({ message: 'Blockchain features are currently unavailable' });
      return;
    }

    // Transfer tokens on blockchain using the correct method name
    const tx = await shareToken.transfer(to, amount);
    await tx.wait();

    // Update balances
    const updatedBalances = {
      ...holderBalances,
      [user.walletAddress]: holderBalances[user.walletAddress] - amount,
      [to]: (holderBalances[to] || 0) + amount,
    };

    // Update balances in database using raw SQL
    await prisma.$executeRaw`
      UPDATE share_tokens
      SET "holderBalances" = ${JSON.stringify(updatedBalances)},
          "updatedAt" = ${new Date()}
      WHERE "id" = ${token.id}
    `;

    res.json({
      message: 'Tokens transferred successfully',
      transfer: {
        from: user.walletAddress,
        to,
        amount,
        panelId,
      },
    });
  } catch (error) {
    logger.error('Error in transferTokens:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTokenDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { panelId } = req.params;

    // Get token using raw SQL
    const tokens = await prisma.$queryRaw<ShareToken[]>`
      SELECT t.*, p.* 
      FROM share_tokens t
      JOIN panels p ON t."panelId" = p.id
      WHERE t."panelId" = ${panelId}
    `;

    if (!tokens || tokens.length === 0) {
      res.status(404).json({ message: 'Token not found' });
      return;
    }

    const token = tokens[0];

    if (!shareToken) {
      res.status(503).json({ message: 'Blockchain features are currently unavailable' });
      return;
    }

    // Get token details from blockchain using the correct method name
    const [totalSupply, decimals, symbol] = await shareToken.getTokenDetails();

    res.json({
      id: token.id,
      panelId: token.panelId,
      totalShares: token.totalShares,
      onChainTokenId: token.onChainTokenId,
      holderBalances: token.holderBalances,
      isActive: token.isActive,
      blockchainDetails: {
        totalSupply: totalSupply.toString(),
        decimals: decimals.toString(),
        symbol
      }
    });
  } catch (error) {
    logger.error('Error in getTokenDetails:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const listPanels = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('======== BEGIN listPanels FUNCTION ========');
    
    // Get user ID from the request (if authenticated)
    const userId = (req as any).user?.id;
    console.log('User ID from request:', userId);
    
    let user = null;
    
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
      console.log('Found user:', user ? {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        role: user.role
      } : 'null');
    } else {
      console.log('No user ID in request - will return all panels for debugging');
    }

    if (!user?.walletAddress) {
      res.status(400).json({ message: 'User must connect wallet first' });
      return;
    }

    if (!solarPanelRegistry) {
      res.status(503).json({ message: 'Blockchain features are currently unavailable' });
      return;
    }
    
    // Get panels owned by the user from the blockchain
    const panelIds = await solarPanelRegistry.getPanelsByOwner(user.walletAddress);
    console.log(`Found ${panelIds.length} panels owned by user`);

    // Get panel details from blockchain and database
    const panels = await Promise.all(panelIds.map(async (panelId) => {
      try {
        // Get panel data from blockchain
        const panel = await solarPanelRegistry.panels(panelId);
        console.log(`Panel data from blockchain:`, {
          externalId: panel.externalId,
          owner: panel.owner,
          isActive: panel.isActive,
          shareTokenAddress: panel.shareTokenAddress,
          capacity: panel.capacity
        });

        // Get panel data from database
        const dbPanel = await prisma.panel.findFirst({
          where: { blockchainPanelId: panelId.toString() },
          include: { owner: true }
        });

        // Get token data if available
        let tokenData = null;
        let totalShares = '0';
        if (panel.shareTokenAddress && panel.shareTokenAddress !== ethers.ZeroAddress) {
          const tokenContract = ShareToken__factory.connect(panel.shareTokenAddress, provider);
          const totalSupply = await tokenContract.totalSupply();
          totalShares = totalSupply.toString();

          tokenData = {
            tokenId: panelId.toString(),
            totalSupply: totalShares,
            availableSupply: '0', // Since availableSupply doesn't exist, we'll use 0
            isMockData: false
          };
        }

        const panelName = dbPanel?.name || `Panel ${panelId}`;
        console.log(`Panel name: ${panelName}, Total Shares: ${totalShares}`);

        return {
          id: panel.externalId,
          name: panelName,
          panelName: panelName, // Add panelName field for frontend compatibility
          location: dbPanel?.location || '',
          capacity: `${Number(panel.capacity)} kW`,
          minInvestment: '$1,000', // Default value since it doesn't exist in the interface
          expectedROI: '15%', // Default value since it doesn't exist in the interface
          progress: 0, // Default value since it doesn't exist in the interface
          owner: dbPanel?.owner?.name || panel.owner,
          blockchainData: tokenData,
          isBlockchainVerified: true,
          mockDataFields: [],
          totalShares: totalShares, // Add total shares to the response
          blockchainPanelId: panelId.toString() // Add blockchainPanelId for dividend distribution
        };
      } catch (error) {
        console.error(`Error processing panel ${panelId}:`, error);
        return null;
      }
    }));

    // Filter out any null values from failed panel processing
    const validPanels = panels.filter(panel => panel !== null);

    console.log(`Returning ${validPanels.length} panels to client`);
    res.json(validPanels);
    
  } catch (error) {
    console.error('Error in listPanels:', error);
    logger.error('Error in listPanels:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUserTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.id;
    const { panelId } = req.params; // This will be undefined for the root path

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.walletAddress) {
      res.status(400).json({ message: 'User must connect wallet first' });
      return;
    }

    // Build the SQL query based on whether we have a panelId
    let tokens;
    if (panelId) {
      // Get tokens for a specific panel
      tokens = await prisma.$queryRaw<ShareToken[]>`
        SELECT t.*, p.*
        FROM share_tokens t
        LEFT JOIN panels p ON t."panelId" = p.id
        WHERE t."panelId" = ${panelId}
        AND t."holderBalances"::jsonb ? ${user.walletAddress}
        AND (t."holderBalances"::jsonb->${user.walletAddress})::int > 0
      `;
    } else {
      // Get all tokens for the user
      tokens = await prisma.$queryRaw<ShareToken[]>`
        SELECT t.*, p.*
        FROM share_tokens t
        LEFT JOIN panels p ON t."panelId" = p.id
        WHERE t."holderBalances"::jsonb ? ${user.walletAddress}
        AND (t."holderBalances"::jsonb->${user.walletAddress})::int > 0
      `;
    }

    // Map tokens to expected structure
    const processedTokens = tokens.map((token: any) => ({
      id: token.id,
      panelId: token.panelId,
      panelName: token.name || `Panel ${token.panelId}`, // Add panel name
      totalShares: token.totalShares,
      onChainTokenId: token.onChainTokenId,
      holderBalances: token.holderBalances,
      isActive: token.isActive,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
      amount: token.holderBalances[user.walletAddress] || 0, // Add user's token amount
      panel: {
        id: token.panelId,
        name: token.name,
        location: token.location,
        capacity: token.capacity,
        status: token.status
      }
    }));

    res.json(processedTokens);
  } catch (error) {
    logger.error('Error in getUserTokens:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTokenHolders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tokenId } = req.params;

    // Get token with holders
    const token = await prisma.shareToken.findUnique({
      where: { id: tokenId },
      include: {
        holders: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                walletAddress: true
              }
            }
          }
        }
      }
    });

    if (!token) {
      res.status(404).json({ message: 'Token not found' });
      return;
    }

    // Transform the data to match the expected format
    const holderDetails = token.holders.map(holder => ({
      address: holder.user.walletAddress || 'No wallet connected',
      balance: holder.shareAmount,
      user: {
        id: holder.user.id,
        email: holder.user.email
      }
    }));

    res.json(holderDetails);
  } catch (error) {
    logger.error('Error in getTokenHolders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const distributeDividends = async (req: Request, res: Response): Promise<void> => {
  try {
    const { panelId, amount } = req.body;
    const userId = (req as any).user.userId;

    // Get panel and check ownership
    const panel = await prisma.panel.findFirst({
      where: { blockchainPanelId: panelId },
      include: { owner: true },
    });

    if (!panel) {
      res.status(404).json({ message: 'Panel not found' });
      return;
    }

    if (!dividendDistributor) {
      res.status(503).json({ message: 'Blockchain features are currently unavailable' });
      return;
    }

    // Convert amount to proper format (USDC has 6 decimals)
    const usdcDecimals = 18;
    const distributionAmount = ethers.parseUnits(amount.toString(), usdcDecimals);
    console.log('Distribution amount in wei:', distributionAmount.toString());

    // Get USDC contract address from dividend distributor
    const usdcAddress = await dividendDistributor.paymentToken();
    console.log('USDC contract address:', usdcAddress);

    // Create USDC contract instance
    const usdcContract = new ethers.Contract(
      usdcAddress,
      [
        'function approve(address spender, uint256 amount) public returns (bool)',
        'function allowance(address owner, address spender) public view returns (uint256)'
      ],
      provider
    );

    // Prepare the approve transaction data
    const approveData = usdcContract.interface.encodeFunctionData('approve', [
      dividendDistributor.target,
      distributionAmount
    ]);

    // Prepare the distribute dividends transaction data
    const distributeData = dividendDistributor.interface.encodeFunctionData('distributeDividends', [
      panel.blockchainPanelId || '',
      distributionAmount
    ]);

    res.status(200).json({
      message: 'Transaction data prepared successfully',
      transactions: {
        approve: {
          to: usdcAddress,
          data: approveData,
          value: '0x0'
        },
        distribute: {
          to: dividendDistributor.target,
          data: distributeData,
          value: '0x0'
        }
      }
    });
  } catch (error) {
    console.error('Error in distributeDividends:', error);
    logger.error('Error in distributeDividends:', error);
    res.status(500).json({ message: 'Internal server error', error: (error as any).message });
  }
};

export const getUnclaimedDividends = async (req: Request, res: Response): Promise<void> => {
  try {
    const { panelId } = req.params;
    const userId = (req as any).user.userId;

    // Get user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.walletAddress) {
      res.status(400).json({ message: 'User must connect wallet first' });
      return;
    }

    // Get panel
    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
    });

    if (!panel) {
      res.status(404).json({ message: 'Panel not found' });
      return;
    }

    if (!dividendDistributor) {
      res.status(503).json({ message: 'Blockchain features are currently unavailable' });
      return;
    }

    // Get unclaimed dividends
    const unclaimedDividends = await dividendDistributor.getUnclaimedDividends(
      panel.blockchainPanelId || '',
      user.walletAddress
    );

    // USDC has 6 decimals
    const usdcDecimals = 6;

    res.json({
      panelId,
      userAddress: user.walletAddress,
      unclaimedDividends: ethers.formatUnits(unclaimedDividends, usdcDecimals),
    });
  } catch (error) {
    logger.error('Error in getUnclaimedDividends:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const claimDividends = async (req: Request, res: Response): Promise<void> => {
  try {
    const { panelId } = req.body;
    
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Get user with proper ID field
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user || !user.walletAddress) {
      res.status(400).json({ message: 'User must connect wallet first' });
      return;
    }

    // Try to find panel by either id or blockchainPanelId
    const panel = await prisma.panel.findFirst({
      where: {
        OR: [
          { id: panelId },
          { blockchainPanelId: panelId }
        ]
      }
    });

    if (!panel) {
      res.status(404).json({ message: 'Panel not found' });
      return;
    }

    if (!panel.blockchainPanelId) {
      res.status(400).json({ message: 'Panel is not registered on blockchain' });
      return;
    }

    // Initialize blockchain service
    const blockchainService = new BlockchainService();

    // Get unclaimed dividends amount
    const unclaimedDividends = await blockchainService.getUnclaimedDividends(
      panel.blockchainPanelId,
      user.walletAddress
    );
    const unclaimedAmount = ethers.formatUnits(unclaimedDividends, 6); // USDC has 6 decimals
    console.log('Unclaimed dividends amount:', unclaimedAmount);
    // Get transaction data for claiming dividends
    const transactionData = await blockchainService.claimDividends(panel.blockchainPanelId);

    res.status(200).json({
      message: 'Transaction data prepared successfully',
      transactions: {
        claim: transactionData
      },
      claim: {
        amount: unclaimedAmount,
        panelId: panel.blockchainPanelId
      }
    });
  } catch (error) {
    logger.error('Error in claimDividends:', error);
    res.status(500).json({ message: 'Internal server error', error: (error as any).message });
  }
};

export const getUnclaimedDividendsForPanels = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    // Get user with proper ID field
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user || !user.walletAddress) {
      res.status(400).json({ message: 'User must connect wallet first' });
      return;
    }

    // Get all panels with blockchain IDs
    const panels = await prisma.panel.findMany({
      where: {
        blockchainPanelId: { not: null }
      }
    });

    console.log('Found panels:', panels);

    // Initialize blockchain service
    const blockchainService = new BlockchainService();

    // Get unclaimed dividends for each panel
    const unclaimedDividends = await Promise.all(
      panels.map(async (panel) => {
        try {
          if (!panel.blockchainPanelId) return null;
          
          console.log('Getting unclaimed dividends for panel:', {
            id: panel.id,
            blockchainPanelId: panel.blockchainPanelId,
            userWallet: user.walletAddress
          });
          
          const unclaimed = await blockchainService.getUnclaimedDividends(
            panel.blockchainPanelId,
            user.walletAddress
          );
          
          console.log('Unclaimed dividends result:', {
            panelId: panel.id,
            blockchainPanelId: panel.blockchainPanelId,
            unclaimed: unclaimed.toString(),
            formattedAmount: ethers.formatUnits(unclaimed, 6)
          });
          
          return {
            panelId: panel.id,
            blockchainPanelId: panel.blockchainPanelId,
            unclaimedAmount: ethers.formatUnits(unclaimed, 6) // USDC has 6 decimals
          };
        } catch (error) {
          console.error(`Error getting unclaimed dividends for panel ${panel.id}:`, error);
          return null;
        }
      })
    );

    // Filter out null values and send response
    const validDividends = unclaimedDividends.filter(dividend => dividend !== null);
    
    console.log('Sending response:', validDividends);
    
    res.json(validDividends);
  } catch (error) {
    logger.error('Error in getUnclaimedDividendsForPanels:', error);
    res.status(500).json({ message: 'Internal server error', error: (error as any).message });
  }
}; 