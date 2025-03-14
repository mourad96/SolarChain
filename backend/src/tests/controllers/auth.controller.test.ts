import { Request, Response } from 'express';
import { AuthController } from '../../controllers/auth.controller';
import { prismaMock } from '../setup';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

describe('AuthController', () => {
  let authController: AuthController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    authController = new AuthController();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const mockUser = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        walletAddress: '0x123...',
      };

      mockRequest = {
        body: mockUser,
      };

      prismaMock.user.findUnique.mockResolvedValueOnce(null);
      prismaMock.user.create.mockResolvedValueOnce({
        ...mockUser,
        id: '1',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await authController.register(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User registered successfully',
          user: expect.objectContaining({
            email: mockUser.email,
            name: mockUser.name,
          }),
        })
      );
    });

    it('should return error if user already exists', async () => {
      const mockUser = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
        walletAddress: '0x123...',
      };

      mockRequest = {
        body: mockUser,
      };

      prismaMock.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        id: '1',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await authController.register(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'User already exists',
      });
    });
  });

  describe('login', () => {
    it('should successfully login a user', async () => {
      const mockUser = {
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        id: '1',
        name: 'Test User',
        role: 'USER',
        walletAddress: '0x123...',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest = {
        body: {
          email: 'test@example.com',
          password: 'password123',
        },
      };

      prismaMock.user.findUnique.mockResolvedValueOnce(mockUser);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login successful',
          token: expect.any(String),
          user: expect.objectContaining({
            email: mockUser.email,
            name: mockUser.name,
          }),
        })
      );
    });

    it('should return error for invalid credentials', async () => {
      mockRequest = {
        body: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      };

      prismaMock.user.findUnique.mockResolvedValueOnce(null);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid credentials',
      });
    });
  });
}); 