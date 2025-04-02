import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { AuthenticatedRequest } from '../../types/auth';
import * as tokenController from '../../controllers/token.controller';

jest.mock('../../config/prisma', () => ({
  prisma: {
    shareToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    shareTokenHolder: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('Token Controller', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'owner',
        walletAddress: '0x123...',
      },
      body: {},
      params: {},
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('listTokens', () => {
    it('should return all tokens for a user', async () => {
      const mockTokens = [
        { id: '1', name: 'Token 1', symbol: 'TK1' },
        { id: '2', name: 'Token 2', symbol: 'TK2' },
      ];

      (prisma.shareToken.findMany as jest.Mock).mockResolvedValue(mockTokens);

      await tokenController.listTokens(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockTokens);
    });
  });

  describe('getTokenHolders', () => {
    it('should return token holders', async () => {
      const mockHoldings = [
        { id: '1', tokenId: '1', amount: 100 },
        { id: '2', tokenId: '2', amount: 200 },
      ];

      (prisma.shareTokenHolder.findMany as jest.Mock).mockResolvedValue(mockHoldings);

      await tokenController.getTokenHolders(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(mockHoldings);
    });
  });
}); 