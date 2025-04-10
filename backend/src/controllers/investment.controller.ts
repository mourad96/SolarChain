import { Request, Response } from 'express';
import { BlockchainService } from '../services/blockchain.service';
import { prisma } from '../services/prisma.service';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/auth';

const blockchainService = new BlockchainService();

export const investInProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { panelId } = req.params;
    const { shares } = req.body;
    const userId = req.user.id;

    // Get user's wallet address
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true }
    });

    if (!user?.walletAddress) {
      res.status(400).json({ error: 'User must connect a wallet before investing' });
      return;
    }

    // Get panel details - try both direct ID and blockchain ID
    const panel = await prisma.panel.findFirst({
      where: {
        OR: [
          { id: panelId },
          { blockchainPanelId: panelId }
        ]
      },
      select: {
        id: true,
        blockchainPanelId: true,
        blockchainTokenAddress: true
      }
    });

    if (!panel) {
      res.status(404).json({ error: 'Panel not found' });
      return;
    }

    if (!panel.blockchainPanelId) {
      res.status(400).json({ error: 'Panel is not registered on blockchain yet' });
      return;
    }

    // Call blockchain service to process investment using the blockchain ID
    const result = await blockchainService.investInProject(
      panel.blockchainPanelId, // Use the blockchain ID here
      shares,
      user.walletAddress
    );

    // Return the transaction data to the frontend for signing
    res.json({
      message: 'Transaction data ready for signing',
      transactionData: result.transactionData,
      sharesPurchased: shares,
      tokenAddress: result.tokenAddress
    });
  } catch (error: any) {
    logger.error('Investment error:', error);
    res.status(500).json({ error: error.message || 'Failed to process investment' });
  }
};

export const recordInvestment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { panelId, sharesPurchased, transactionHash, tokenAddress } = req.body;
    const userId = req.user.id;

    // Get panel details
    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      select: { id: true }
    });

    if (!panel) {
      res.status(404).json({ error: 'Panel not found' });
      return;
    }

    // Record the investment in the database
    const investment = await prisma.investment.create({
      data: {
        userId,
        panelId: panel.id,
        sharesPurchased,
        transactionHash,
        tokenAddress
      }
    });

    res.json({
      message: 'Investment recorded successfully',
      investment
    });
  } catch (error: any) {
    logger.error('Error recording investment:', error);
    res.status(500).json({ error: error.message || 'Failed to record investment' });
  }
}; 