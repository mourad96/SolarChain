import { Request, Response } from 'express';
import * as panelController from '../../controllers/panel.controller';
import { prismaMock, contractMock, providerMock } from '../setup';
import { ethers } from 'ethers';

describe('Panel Controller', () => {
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

  describe('registerPanel', () => {
    it('should successfully register a new panel', async () => {
      const mockPanel = {
        name: 'Test Panel',
        location: 'Test Location',
        capacity: 1000,
        price: '1000000000000000000', // 1 ETH
        totalShares: '1000000000000000000000', // 1000 shares
      };

      mockRequest = {
        body: mockPanel,
        user: {
          userId: '1',
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user' as const,
          walletAddress: '0x123...',
        },
      };

      const mockPanelData = {
        ...mockPanel,
        id: '1',
        ownerId: '1',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.panel.create.mockResolvedValueOnce(mockPanelData);
      contractMock.mintShares.mockResolvedValueOnce({
        wait: jest.fn().mockResolvedValueOnce({ status: 1 }),
      });

      await panelController.registerPanel(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Panel registered successfully',
          panel: expect.objectContaining({
            name: mockPanel.name,
            location: mockPanel.location,
          }),
        })
      );
    });

    it('should handle registration failure', async () => {
      const mockPanel = {
        name: 'Test Panel',
        location: 'Test Location',
        capacity: 1000,
        price: '1000000000000000000',
        totalShares: '1000000000000000000000',
      };

      mockRequest = {
        body: mockPanel,
        user: {
          userId: '1',
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user' as const,
          walletAddress: '0x123...',
        },
      };

      prismaMock.panel.create.mockRejectedValueOnce(new Error('Database error'));

      await panelController.registerPanel(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Failed to register panel',
      });
    });
  });

  describe('setPanelStatus', () => {
    it('should successfully update panel status', async () => {
      const mockPanel = {
        id: '1',
        ownerId: '1',
        status: 'ACTIVE',
      };

      mockRequest = {
        params: { id: '1' },
        body: { status: 'INACTIVE' },
        user: {
          userId: '1',
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user' as const,
          walletAddress: '0x123...',
        },
      };

      prismaMock.panel.findUnique.mockResolvedValueOnce(mockPanel);
      prismaMock.panel.update.mockResolvedValueOnce({
        ...mockPanel,
        status: 'INACTIVE',
      });

      await panelController.setPanelStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Panel status updated successfully',
        })
      );
    });

    it('should prevent unauthorized status update', async () => {
      mockRequest = {
        params: { id: '1' },
        body: { status: 'INACTIVE' },
        user: {
          userId: '2',
          id: '2',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user' as const,
          walletAddress: '0x123...',
        },
      };

      prismaMock.panel.findUnique.mockResolvedValueOnce({
        id: '1',
        ownerId: '1',
        status: 'ACTIVE',
      });

      await panelController.setPanelStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Unauthorized to update panel status',
      });
    });
  });
}); 