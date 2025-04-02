import { Request, Response } from 'express';
import { IoTController } from '../../controllers/iot.controller';
import { prisma } from '../../config/prisma';
import { AuthenticatedRequest } from '../../types/auth';

jest.mock('../../config/prisma', () => ({
  prisma: {
    ioTDevice: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe('IoTController', () => {
  let iotController: IoTController;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    iotController = new IoTController();
    mockRequest = {
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'owner',
      },
      body: {},
      params: {},
    };
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('getDevices', () => {
    it('should return all devices for a user', async () => {
      const mockDevices = [
        { id: '1', name: 'Device 1' },
        { id: '2', name: 'Device 2' },
      ];
      (prisma.ioTDevice.findMany as jest.Mock).mockResolvedValue(mockDevices);

      await iotController.getDevices(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith(mockDevices);
    });
  });

  describe('updateDeviceStatus', () => {
    it('should update device status', async () => {
      const mockDevice = { id: '1', name: 'Device 1', status: 'active' };
      (prisma.ioTDevice.update as jest.Mock).mockResolvedValue(mockDevice);

      mockRequest.body = { status: 'inactive' };
      mockRequest.params = { deviceId: '1' };

      await iotController.updateDeviceStatus(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith(mockDevice);
    });
  });
}); 