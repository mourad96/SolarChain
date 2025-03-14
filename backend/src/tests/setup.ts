import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

// Mock Prisma
export const prismaMock = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  panel: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  iotDevice: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  token: {
    findUnique: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
};

// Mock Ethers provider and contract
export const providerMock = {
  getNetwork: jest.fn(),
  getBlockNumber: jest.fn(),
};

export const contractMock = {
  connect: jest.fn(),
  mintShares: jest.fn(),
  transferPanelShares: jest.fn(),
  distributeDividends: jest.fn(),
  getPanelBalance: jest.fn(),
  getPanelTokenDetails: jest.fn(),
  interface: {
    parseLog: jest.fn().mockReturnValue({
      args: ['1'],
    }),
  },
};

// Helper function to generate test JWT tokens
export const generateTestToken = (userId: string, role: 'user' | 'admin' = 'user') => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

// Clean up function to reset all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
}); 