import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { prisma } from '../services/prisma.service';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ShareToken__factory, DividendDistributor__factory } from '../typechain-types';
import { JsonValue } from '@prisma/client/runtime/library';
import { v4 as uuidv4 } from 'uuid';

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

export const listTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('======== BEGIN listTokens FUNCTION ========');
    
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
      console.log('No user ID in request - will return all tokens for debugging');
    }
    
    // Get tokens from database using raw SQL
    console.log('Fetching tokens from database...');
    const dbTokens = await prisma.$queryRaw<ShareToken[]>`
      SELECT t.*, p.*, o.*
      FROM share_tokens t
      LEFT JOIN panels p ON t."panelId" = p.id
      LEFT JOIN "User" o ON p."ownerId" = o.id
      ORDER BY t."createdAt" DESC
    `;

    // Process the raw SQL results to match the expected structure
    const processedTokens = dbTokens.map((token: any) => {
      // Raw SQL joins return duplicate column names, so we need to be explicit
      // about which properties belong to which model
      return {
        id: token.id,
        panelId: token.panelId,
        totalShares: token.totalShares,
        onChainTokenId: token.onChainTokenId,
        holderBalances: token.holderBalances,
        isActive: token.isActive,
        createdAt: token.createdAt,
        updatedAt: token.updatedAt,
        panel: {
          id: token.panelId, // Use panelId as the panel id
          name: token.name,
          location: token.location,
          capacity: token.capacity,
          status: token.status,
          ownerId: token.ownerId,
          blockchainTxHash: token.blockchainTxHash,
          blockchainPanelId: token.blockchainPanelId,
          blockchainTokenAddress: token.blockchainTokenAddress,
          createdAt: token.createdAt,
          updatedAt: token.updatedAt,
          owner: {
            id: token.ownerId,
            name: token.name,
            email: token.email,
            walletAddress: token.walletAddress,
            role: token.role
          }
        }
      } as ShareToken;
    });

    console.log(`Found ${processedTokens.length} tokens in database`);
    if (processedTokens.length > 0) {
      console.log('First database token:', {
        id: processedTokens[0].id,
        panelId: processedTokens[0].panel?.id,
        totalShares: processedTokens[0].totalShares,
        holderBalances: processedTokens[0].holderBalances
      });
    } else {
      // Check if there are any panels at all
      const panels = await prisma.panel.findMany();
      console.log(`Found ${panels.length} panels in database`);
      if (panels.length > 0) {
        console.log('First panel:', {
          id: panels[0].id,
          name: panels[0].name,
          blockchainPanelId: panels[0].blockchainPanelId
        });
      }
      
      // Check if there are any users with wallet addresses
      const usersWithWallets = await prisma.$queryRaw<any[]>`
        SELECT * FROM "User" WHERE "walletAddress" IS NOT NULL
      `;
      console.log(`Found ${usersWithWallets.length} users with wallet addresses`);
    }
    
    // If no user is authenticated or debugging is needed, return all tokens
    if (!userId) {
      console.log('No authenticated user, returning all tokens for debugging');
      res.json(processedTokens);
      return;
    }
    
    // If blockchain connection is available, try to enhance with blockchain data
    let enhancedTokens = [...processedTokens];
    
    console.log('Blockchain connection available?', {
      shareToken: !!shareToken,
      provider: !!provider,
      userWalletAddress: user?.walletAddress
    });
    
    if (shareToken && provider && user?.walletAddress) {
      try {
        console.log(`Fetching blockchain token data for wallet ${user.walletAddress}`);
        
        // Get panels to check for tokens
        const panels = await prisma.panel.findMany();
        console.log(`Found ${panels.length} panels to check for tokens`);
        
        for (const panel of panels) {
          console.log(`Checking panel ${panel.id}, blockchainPanelId: ${panel.blockchainPanelId}`);
          
          if (panel.blockchainPanelId) {
            try {
              console.log(`Processing panel with blockchainPanelId: ${panel.blockchainPanelId}`);
              
              // Get panel token data from blockchain if possible
              if (!shareToken) {
                console.log('ShareToken contract not available, skipping panel');
                continue;
              }
              
              try {
                console.log('Checking if user has token balance');
                
                // Check if the user has any balance for this token
                try {
                  console.log(`Calling getHolderBalance(${user.walletAddress}) for panel ${panel.id}`);
                  const holderBalance = await shareToken.getHolderBalance(user.walletAddress);
                  console.log(`User balance for token: ${holderBalance.toString()}`);
                  
                  if (holderBalance && holderBalance.toString() !== '0') {
                    console.log(`User has positive balance: ${holderBalance.toString()}`);
                    
                    // Find if we already have this token in our results
                    const existingTokenIndex = enhancedTokens.findIndex(
                      t => t.panel.id === panel.id
                    );
                    console.log(`Token exists in results? ${existingTokenIndex !== -1}`);
                    
                    if (existingTokenIndex === -1) {
                      console.log(`Creating new token object for panel ${panel.id}`);
                      
                      // Create a temporary token object for the response
                      const newToken: ShareToken = {
                        id: `bc-${panel.blockchainPanelId}`,
                        panelId: panel.id,
                        totalShares: 100,
                        onChainTokenId: panel.blockchainPanelId?.toString() || '',
                        holderBalances: {
                          [user.walletAddress]: parseInt(holderBalance.toString())
                        } as JsonValue,
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        panel,
                      };
                      
                      console.log('Adding new token to results:', {
                        id: newToken.id,
                        panelId: newToken.panelId,
                        holderBalance: (newToken.holderBalances as HolderBalances)[user.walletAddress] || 0
                      });
                      
                      enhancedTokens.push(newToken);
                    } else if (existingTokenIndex !== -1) {
                      console.log(`Updating existing token at index ${existingTokenIndex}`);
                      
                      // Update the existing token with blockchain data
                      const token = enhancedTokens[existingTokenIndex];
                      
                      // Only update if there's a difference
                      if (parseInt(holderBalance.toString()) > 0 && 
                          token.holderBalances && 
                          user.walletAddress && 
                          (!token.holderBalances[user.walletAddress] || 
                           token.holderBalances[user.walletAddress] !== parseInt(holderBalance.toString()))) {
                        
                        console.log(`Updating token ${token.id} with new balance: ${holderBalance.toString()}`);
                        
                        // Update the holder balances
                        token.holderBalances = {
                          ...JSON.parse(JSON.stringify(token.holderBalances)),
                          [user.walletAddress]: parseInt(holderBalance.toString())
                        };
                        
                        // Save the updated token to the database
                        console.log('Saving updated token to database');
                        await prisma.shareToken.update({
                          where: { id: token.id },
                          data: {
                            holderBalances: token.holderBalances,
                          },
                        });
                      } else {
                        console.log('No balance update needed for existing token');
                      }
                    }
                  } else {
                    console.log('User has zero balance for this token, skipping');
                  }
                } catch (balanceError) {
                  console.error(`Error calling getHolderBalance for wallet ${user.walletAddress}:`, balanceError);
                }
                
                // If unclaimed dividends are available and dividendDistributor is defined
                if (dividendDistributor && panel.blockchainPanelId && user.walletAddress) {
                  try {
                    console.log(`Checking unclaimed dividends for panel ${panel.id}, blockchainPanelId: ${panel.blockchainPanelId}`);
                    const unclaimedDividends = await dividendDistributor.getUnclaimedDividends(
                      panel.blockchainPanelId,
                      user.walletAddress
                    );
                    
                    console.log(`Unclaimed dividends: ${unclaimedDividends.toString()}`);
                    
                    // Find token in enhanced tokens and add unclaimed dividends info
                    const tokenIndex = enhancedTokens.findIndex(
                      t => t.panel.id === panel.id
                    );
                    
                    if (tokenIndex !== -1 && unclaimedDividends.toString() !== '0') {
                      console.log(`Adding unclaimed dividends to token at index ${tokenIndex}`);
                      
                      // Attach unclaimed dividends info to the token
                      const token = enhancedTokens[tokenIndex];
                      (token as any).unclaimedDividends = ethers.formatUnits(unclaimedDividends, 6); // USDC has 6 decimals
                      console.log(`Set unclaimed dividends: ${(token as any).unclaimedDividends}`);
                    } else {
                      console.log(`Token not found or no unclaimed dividends`);
                    }
                  } catch (dividendError) {
                    console.error(`Error fetching unclaimed dividends for panel ${panel.id}:`, dividendError);
                  }
                } else {
                  console.log('Dividend distributor not available or missing parameters', {
                    dividendDistributor: !!dividendDistributor,
                    blockchainPanelId: panel.blockchainPanelId,
                    walletAddress: user?.walletAddress
                  });
                }
              } catch (tokenMethodError) {
                console.error(`Error calling token methods for panel ${panel.id}:`, tokenMethodError);
              }
            } catch (tokenError) {
              console.error(`Error processing blockchain token for panel ${panel.id}:`, tokenError);
            }
          } else {
            console.log(`Panel ${panel.id} has no blockchainPanelId, skipping`);
          }
        }
      } catch (blockchainError) {
        console.error('Error fetching blockchain token data:', blockchainError);
      }
    } else {
      console.log('Skipping blockchain token fetch due to missing dependencies');
    }
    
    // Filter out tokens where the user has no balance if user is authenticated
    console.log(`Pre-filter: ${enhancedTokens.length} tokens`);
    
    if (user?.walletAddress) {
      enhancedTokens = enhancedTokens.filter(token => {
        const hasBalance = token.holderBalances && 
                           user.walletAddress && 
                           token.holderBalances[user.walletAddress] && 
                           token.holderBalances[user.walletAddress] > 0;
        
        if (!hasBalance) {
          console.log(`Filtering out token ${token.id} for panel ${token.panelId} due to no balance`);
        }
        
        return hasBalance;
      });
      
      console.log(`Post-filter: ${enhancedTokens.length} tokens`);
    } else {
      console.log('No user with wallet address, skipping token filtering');
    }
    
    console.log(`Returning ${enhancedTokens.length} tokens to client`);
    if (enhancedTokens.length > 0) {
      console.log('First token in response:', {
        id: enhancedTokens[0].id,
        panelId: enhancedTokens[0].panelId,
        balance: enhancedTokens[0].holderBalances[user?.walletAddress || '']
      });
    }
    
    console.log('======== END listTokens FUNCTION ========');
    res.json(enhancedTokens);
  } catch (error) {
    console.error('Error in listTokens:', error);
    logger.error('Error in listTokens:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUserTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.walletAddress) {
      res.status(400).json({ message: 'User must connect wallet first' });
      return;
    }

    // Get tokens using raw SQL
    const tokens = await prisma.$queryRaw<ShareToken[]>`
      SELECT t.*, p.*
      FROM share_tokens t
      LEFT JOIN panels p ON t."panelId" = p.id
      WHERE t."holderBalances"::jsonb ? ${user.walletAddress}
      AND (t."holderBalances"::jsonb->${user.walletAddress})::int > 0
    `;

    // Map tokens to expected structure
    const processedTokens = tokens.map((token: any) => ({
      id: token.id,
      panelId: token.panelId,
      totalShares: token.totalShares,
      onChainTokenId: token.onChainTokenId,
      holderBalances: token.holderBalances,
      isActive: token.isActive,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
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
      res.status(403).json({ error: 'You do not have permission to distribute dividends for this panel' });
      return;
    }

    if (!dividendDistributor) {
      res.status(503).json({ message: 'Blockchain features are currently unavailable' });
      return;
    }

    // Convert amount to proper format (USDC has 6 decimals)
    const usdcDecimals = 6;
    const distributionAmount = ethers.parseUnits(amount.toString(), usdcDecimals);

    // Distribute dividends on blockchain
    const tx = await dividendDistributor.distributeDividends(
      panel.blockchainPanelId || '',
      distributionAmount
    );
    const receipt = await tx.wait();

    if (!receipt) {
      res.status(500).json({ message: 'Failed to get transaction receipt' });
      return;
    }

    // Get dividend distribution event
    const distributionEvent = receipt.logs.find(log => 
      log.topics[0] === dividendDistributor.interface.getEvent('DividendDistributed').topicHash
    );

    if (!distributionEvent) {
      res.status(500).json({ message: 'Failed to find dividend distribution event' });
      return;
    }

    const parsedEvent = dividendDistributor.interface.parseLog({
      topics: [...distributionEvent.topics],
      data: distributionEvent.data,
    });

    res.status(200).json({
      message: 'Dividends distributed successfully',
      distribution: {
        panelId,
        amount: ethers.formatUnits(distributionAmount, usdcDecimals),
        timestamp: parsedEvent?.args.timestamp.toString(),
        transactionHash: receipt.hash,
      },
    });
  } catch (error) {
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

    // Check if user has unclaimed dividends
    const unclaimedDividends = await dividendDistributor.getUnclaimedDividends(
      panel.blockchainPanelId || '',
      user.walletAddress
    );

    if (unclaimedDividends.toString() === '0') {
      res.status(400).json({ message: 'No unclaimed dividends available' });
      return;
    }

    // Claim dividends on blockchain
    const tx = await dividendDistributor.claimDividends(panel.blockchainPanelId || '');
    const receipt = await tx.wait();

    if (!receipt) {
      res.status(500).json({ message: 'Failed to get transaction receipt' });
      return;
    }

    // Get dividend claimed event
    const claimedEvent = receipt.logs.find(log => 
      log.topics[0] === dividendDistributor.interface.getEvent('DividendClaimed').topicHash
    );

    if (!claimedEvent) {
      res.status(500).json({ message: 'Failed to find dividend claimed event' });
      return;
    }

    const parsedEvent = dividendDistributor.interface.parseLog({
      topics: [...claimedEvent.topics],
      data: claimedEvent.data,
    });

    // USDC has 6 decimals
    const usdcDecimals = 6;

    res.status(200).json({
      message: 'Dividends claimed successfully',
      claim: {
        panelId,
        amount: ethers.formatUnits(parsedEvent?.args.amount, usdcDecimals),
        userAddress: user.walletAddress,
        transactionHash: receipt.hash,
      },
    });
  } catch (error) {
    logger.error('Error in claimDividends:', error);
    res.status(500).json({ message: 'Internal server error', error: (error as any).message });
  }
}; 