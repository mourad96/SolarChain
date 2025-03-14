import { Request, Response } from 'express';
import { ethers } from 'ethers';
import { ShareToken } from '../entities/ShareToken';
import { SolarPanel } from '../entities/SolarPanel';
import { User } from '../entities/User';
import { AppDataSource } from '../config/database';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ShareToken__factory } from '../typechain-types';

const tokenRepository = AppDataSource.getRepository(ShareToken);
const panelRepository = AppDataSource.getRepository(SolarPanel);
const userRepository = AppDataSource.getRepository(User);

// Initialize blockchain connection
let provider: ethers.JsonRpcProvider | undefined;
let wallet: ethers.Wallet | undefined;
let shareToken: ReturnType<typeof ShareToken__factory.connect> | undefined;

try {
  if (config.blockchain.rpcUrl && config.blockchain.privateKey && config.blockchain.contracts.shareToken) {
    provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
    wallet = new ethers.Wallet(config.blockchain.privateKey, provider);
    shareToken = ShareToken__factory.connect(
      config.blockchain.contracts.shareToken,
      wallet
    );
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
    const panel = await panelRepository.findOne({
      where: { id: panelId },
      relations: ['owner'],
    });

    if (!panel) {
      res.status(404).json({ message: 'Panel not found' });
      return;
    }

    if (panel.owner.id !== userId && (req as any).user.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    if (!shareToken) {
      res.status(503).json({ message: 'Blockchain features are currently unavailable' });
      return;
    }

    // Mint tokens on blockchain
    const tx = await shareToken.mintShares(panel.onChainPanelId, amount);
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
    const token = tokenRepository.create({
      panel,
      totalShares: amount,
      onChainTokenId: onChainTokenId.toString(),
      holderBalances: {
        [panel.owner.walletAddress!]: amount,
      },
      isActive: true,
    });

    await tokenRepository.save(token);

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
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user || !user.walletAddress) {
      res.status(400).json({ message: 'User must connect wallet first' });
      return;
    }

    const token = await tokenRepository.findOne({
      where: { panel: { id: panelId } },
      relations: ['panel'],
    });

    if (!token) {
      res.status(404).json({ message: 'Token not found' });
      return;
    }

    // Check balance
    const userBalance = token.holderBalances[user.walletAddress] || 0;
    if (userBalance < amount) {
      res.status(400).json({ message: 'Insufficient balance' });
      return;
    }

    if (!shareToken) {
      res.status(503).json({ message: 'Blockchain features are currently unavailable' });
      return;
    }

    // Transfer tokens on blockchain
    const tx = await shareToken.transferPanelShares(token.onChainTokenId, to, amount);
    await tx.wait();

    // Update balances in database
    token.holderBalances[user.walletAddress] -= amount;
    token.holderBalances[to] = (token.holderBalances[to] || 0) + amount;

    await tokenRepository.save(token);

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
    const { tokenId } = req.params;

    const token = await tokenRepository.findOne({
      where: { id: tokenId },
      relations: ['panel', 'panel.owner'],
    });

    if (!token) {
      res.status(404).json({ message: 'Token not found' });
      return;
    }

    if (!shareToken) {
      res.status(503).json({ message: 'Blockchain features are currently unavailable' });
      return;
    }

    // Get on-chain data
    const [totalShares, isMinted] = await shareToken.getPanelTokenDetails(
      token.onChainTokenId
    );

    res.json({
      id: token.id,
      panelId: token.panel.id,
      totalShares: totalShares.toString(),
      onChainTokenId: token.onChainTokenId,
      isMinted,
      holderBalances: token.holderBalances,
      isActive: token.isActive,
    });
  } catch (error) {
    logger.error('Error in getTokenDetails:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const listTokens = async (_req: Request, res: Response): Promise<void> => {
  try {
    const tokens = await tokenRepository.find({
      relations: ['panel', 'panel.owner'],
      order: {
        createdAt: 'DESC',
      },
    });

    res.json(tokens);
  } catch (error) {
    logger.error('Error in listTokens:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getUserTokens = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user || !user.walletAddress) {
      res.status(400).json({ message: 'User must connect wallet first' });
      return;
    }

    const tokens = await tokenRepository.find({
      relations: ['panel', 'panel.owner'],
    });

    // Filter tokens where user has a balance
    const userTokens = tokens.filter(
      (token: ShareToken) => (token.holderBalances[user.walletAddress!] || 0) > 0
    );

    res.json(userTokens);
  } catch (error) {
    logger.error('Error in getUserTokens:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTokenHolders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { panelId } = req.params;

    const token = await tokenRepository.findOne({
      where: { panel: { id: panelId } },
      relations: ['panel'],
    });

    if (!token) {
      res.status(404).json({ message: 'Token not found' });
      return;
    }

    if (!shareToken) {
      res.status(503).json({ message: 'Blockchain features are currently unavailable' });
      return;
    }

    // Get on-chain holders
    const holders = await shareToken.getPanelHolders(token.onChainTokenId);

    // Get holder details from database
    const holderDetails = await Promise.all(
      holders.map(async (address: string) => {
        const user = await userRepository.findOne({
          where: { walletAddress: address },
        });
        return {
          address,
          balance: token.holderBalances[address] || 0,
          user: user
            ? {
                id: user.id,
                email: user.email,
              }
            : null,
        };
      })
    );

    res.json(holderDetails);
  } catch (error) {
    logger.error('Error in getTokenHolders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 