import { Request, Response } from 'express';
import { IoTController } from '../../controllers/iot.controller';
import { prismaMock, contractMock } from '../setup';
import { ethers } from 'ethers';

describe('IoTController', () => {
  let iotController: IoTController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    iotController = new IoTController();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };
  });

  describe('registerDevice', () => {
    it('should successfully register a new IoT device', async () => {
      const mockDevice = {
        deviceId: 'TEST001',
        panelId: '1',
        type: 'INVERTER',
      };

      mockRequest = {
        body: mockDevice,
        user: {
          userId: '1',
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          walletAddress: '0x123...',
        },
      };

      const mockDeviceData = {
        ...mockDevice,
        id: '1',
        ownerId: '1',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.panel.findUnique.mockResolvedValueOnce({
        id: '1',
        ownerId: '1',
        status: 'ACTIVE',
      });
      prismaMock.iotDevice.create.mockResolvedValueOnce(mockDeviceData);

      await iotController.registerDevice(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Device registered successfully',
          device: expect.objectContaining({
            deviceId: mockDevice.deviceId,
          }),
        })
      );
    });

    it('should prevent registering device for non-owned panel', async () => {
      const mockDevice = {
        deviceId: 'TEST001',
        panelId: '1',
        type: 'INVERTER',
      };

      mockRequest = {
        body: mockDevice,
        user: {
          userId: '2',
          id: '2',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          walletAddress: '0x123...',
        },
      };

      prismaMock.panel.findUnique.mockResolvedValueOnce({
        id: '1',
        ownerId: '1',
        status: 'ACTIVE',
      });

      await iotController.registerDevice(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Unauthorized to register device for this panel',
      });
    });
  });

  describe('updateDeviceData', () => {
    it('should successfully update device data', async () => {
      const mockData = {
        power: 1000,
        voltage: 220,
        current: 4.5,
        temperature: 25,
      };

      mockRequest = {
        params: { deviceId: 'TEST001' },
        body: mockData,
      };

      const mockDevice = {
        id: '1',
        deviceId: 'TEST001',
        panelId: '1',
        status: 'ACTIVE',
      };

      prismaMock.iotDevice.findUnique.mockResolvedValueOnce(mockDevice);
      prismaMock.iotDevice.update.mockResolvedValueOnce({
        ...mockDevice,
        lastReading: mockData,
        updatedAt: new Date(),
      });

      await iotController.updateDeviceData(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Device data updated successfully',
        })
      );
    });

    it('should handle non-existent device', async () => {
      mockRequest = {
        params: { deviceId: 'NONEXISTENT' },
        body: {
          power: 1000,
          voltage: 220,
        },
      };

      prismaMock.iotDevice.findUnique.mockResolvedValueOnce(null);

      await iotController.updateDeviceData(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Device not found',
      });
    });
  });

  describe('getDeviceData', () => {
    it('should return device data history', async () => {
      const mockDevice = {
        id: '1',
        deviceId: 'TEST001',
        panelId: '1',
        status: 'ACTIVE',
        lastReading: {
          power: 1000,
          voltage: 220,
        },
      };

      mockRequest = {
        params: { deviceId: 'TEST001' },
        query: {
          from: '2024-01-01',
          to: '2024-01-02',
        },
      };

      prismaMock.iotDevice.findUnique.mockResolvedValueOnce(mockDevice);

      await iotController.getDeviceData(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          device: expect.objectContaining({
            deviceId: 'TEST001',
          }),
        })
      );
    });
  });
}); 