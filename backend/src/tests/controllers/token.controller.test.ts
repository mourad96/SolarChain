import { Request, Response } from 'express';
import * as tokenController from '../../controllers/token.controller';
import { prismaMock, contractMock } from '../setup';

describe('Token Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };
  });

  describe('transferTokens', () => {
    it('should successfully transfer tokens', async () => {
      const mockTransfer = {
        panelId: '1',
        to: '0x456...',
        amount: '1000000000000000000', // 1 share
      };

      mockRequest = {
        body: mockTransfer,
        user: {
          userId: '1',
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user' as const,
          walletAddress: '0x123...',
        },
      };

      const mockToken = {
        id: '1',
        onChainTokenId: '1',
        panel: {
          id: '1',
        },
        holderBalances: {
          '0x123...': '2000000000000000000', // 2 shares
        },
      };

      prismaMock.token.findUnique.mockResolvedValueOnce(mockToken);
      contractMock.transferPanelShares.mockResolvedValueOnce({
        wait: jest.fn().mockResolvedValueOnce({ status: 1 }),
      });

      await tokenController.transferTokens(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Tokens transferred successfully',
        })
      );
    });

    it('should handle insufficient balance', async () => {
      const mockTransfer = {
        panelId: '1',
        to: '0x456...',
        amount: '2000000000000000000', // 2 shares
      };

      mockRequest = {
        body: mockTransfer,
        user: {
          userId: '1',
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user' as const,
          walletAddress: '0x123...',
        },
      };

      const mockToken = {
        id: '1',
        onChainTokenId: '1',
        panel: {
          id: '1',
        },
        holderBalances: {
          '0x123...': '1000000000000000000', // 1 share
        },
      };

      prismaMock.token.findUnique.mockResolvedValueOnce(mockToken);

      await tokenController.transferTokens(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Insufficient balance',
      });
    });
  });

  describe('getTokenDetails', () => {
    it('should return token details', async () => {
      mockRequest = {
        params: { tokenId: '1' },
        user: {
          userId: '1',
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user' as const,
          walletAddress: '0x123...',
        },
      };

      const mockToken = {
        id: '1',
        onChainTokenId: '1',
        panel: {
          id: '1',
          owner: {
            id: '1',
            walletAddress: '0x123...',
          },
        },
        holderBalances: {
          '0x123...': '1000000000000000000',
        },
        isActive: true,
      };

      prismaMock.token.findUnique.mockResolvedValueOnce(mockToken);
      contractMock.getPanelTokenDetails.mockResolvedValueOnce([
        '1000000000000000000',
        true,
      ]);

      await tokenController.getTokenDetails(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          id: '1',
          totalShares: '1000000000000000000',
          isMinted: true,
        })
      );
    });
  });

  describe('mintTokens', () => {
    it('should successfully mint tokens', async () => {
      mockRequest = {
        body: {
          panelId: '1',
          amount: '1000000000000000000',
        },
        user: {
          userId: '1',
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user' as const,
          walletAddress: '0x123...',
        },
      };

      const mockPanel = {
        id: '1',
        onChainPanelId: '1',
        owner: {
          id: '1',
          walletAddress: '0x123...',
        },
      };

      prismaMock.panel.findUnique.mockResolvedValueOnce(mockPanel);
      contractMock.mintShares.mockResolvedValueOnce({
        wait: jest.fn().mockResolvedValueOnce({
          logs: [
            {
              topics: ['topic1'],
              data: 'data1',
            },
          ],
        }),
      });

      await tokenController.mintTokens(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Tokens minted successfully',
        })
      );
    });

    it('should prevent unauthorized minting', async () => {
      mockRequest = {
        body: {
          panelId: '1',
          amount: '1000000000000000000',
        },
        user: {
          userId: '2',
          id: '2',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user' as const,
          walletAddress: '0x789...',
        },
      };

      const mockPanel = {
        id: '1',
        onChainPanelId: '1',
        owner: {
          id: '1',
          walletAddress: '0x123...',
        },
      };

      prismaMock.panel.findUnique.mockResolvedValueOnce(mockPanel);

      await tokenController.mintTokens(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        message: 'Not authorized',
      });
    });
  });
}); 