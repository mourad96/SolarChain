import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { prisma } from '../services/prisma.service';

export class AuthController {
  public async register(req: Request, res: Response) {
    try {
      const { name, email, password, role } = req.body;

      logger.info('Registration attempt:', { email, name, role });

      // Validate role
      if (!role || !['owner', 'investor'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be either "owner" or "investor"' });
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        logger.warn('Registration failed: User already exists', { email });
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Map role string to enum
      const dbRole = role.toUpperCase() === 'OWNER' ? 'OWNER' : 'INVESTOR';

      // Create user
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: dbRole,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      // Map role enum back to lowercase for the client
      const clientRole = user.role === 'OWNER' ? 'owner' : 'investor';

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: clientRole },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      logger.info('User registered successfully:', { userId: user.id, email, role });
      return res.status(201).json({ 
        user: {
          ...user,
          role: clientRole
        }, 
        token 
      });
    } catch (error) {
      logger.error('Registration error:', error);
      console.error('Registration error details:', error);
      return res.status(500).json({ 
        error: 'Failed to register user',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }

  public async login(req: Request, res: Response) {
    try {
      const { email, password, role } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Map role enum to lowercase for comparison and client
      const clientRole = user.role === 'OWNER' ? 'owner' : 'investor';

      // Verify role if specified
      if (role && clientRole !== role) {
        return res.status(403).json({ 
          error: `This account is not registered as a ${role}. Please login with the correct account type.` 
        });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: clientRole },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: clientRole,
          walletAddress: user.walletAddress,
        },
        token,
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Failed to login' });
    }
  }

  public async getCurrentUser(req: Request, res: Response) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Map role enum to lowercase for client
      const clientRole = user.role === 'OWNER' ? 'owner' : 'investor';

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: clientRole,
          walletAddress: user.walletAddress,
        },
      });
    } catch (error) {
      console.error('Get current user error:', error);
      return res.status(500).json({ error: 'Failed to get user information' });
    }
  }

  public async connectWallet(req: Request, res: Response) {
    try {
      const { address } = req.body;
      const userId = (req as any).user.id;

      // Update user's wallet address
      const user = await prisma.user.update({
        where: { id: userId },
        data: { walletAddress: address },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          walletAddress: true,
        },
      });

      return res.json({ user });
    } catch (error) {
      console.error('Connect wallet error:', error);
      return res.status(500).json({ error: 'Failed to connect wallet' });
    }
  }

  public async becomePanelOwner(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      // Check if user is already an owner
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.role === 'OWNER') {
        return res.status(400).json({ error: 'User is already a panel owner' });
      }

      // Update user's role to owner
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role: 'OWNER' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          walletAddress: true,
        },
      });

      // Map role enum to lowercase for client
      const clientRole = updatedUser.role === 'OWNER' ? 'owner' : 'investor';

      // Generate new JWT with updated role
      const token = jwt.sign(
        { id: updatedUser.id, email: updatedUser.email, role: clientRole },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      return res.json({ 
        user: {
          ...updatedUser,
          role: clientRole
        }, 
        token 
      });
    } catch (error) {
      console.error('Become panel owner error:', error);
      return res.status(500).json({ error: 'Failed to upgrade to panel owner' });
    }
  }

  public async updateWalletAddress(req: Request, res: Response) {
    try {
      console.log('Update wallet address request received:', req.body);
      const userId = (req as any).user.id;
      console.log('User ID from token:', userId);
      const { walletAddress } = req.body;

      if (!walletAddress) {
        console.log('Wallet address is missing in the request');
        return res.status(400).json({ error: 'Wallet address is required' });
      }

      // Validate wallet address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        console.log('Invalid wallet address format:', walletAddress);
        return res.status(400).json({ error: 'Invalid wallet address format' });
      }

      console.log('Updating wallet address for user:', userId);
      // Update user's wallet address
      const user = await prisma.user.update({
        where: { id: userId },
        data: { walletAddress },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          walletAddress: true,
        },
      });
      console.log('User updated successfully:', user);

      // Map role enum to lowercase for client
      const clientRole = user.role === 'OWNER' ? 'owner' : 'investor';

      return res.json({ 
        message: 'Wallet address updated successfully',
        user: {
          ...user,
          role: clientRole
        }
      });
    } catch (error) {
      console.error('Update wallet address error:', error);
      return res.status(500).json({ error: 'Failed to update wallet address' });
    }
  }

  public async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          walletAddress: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Map role enum to lowercase for client
      const clientRole = user.role === 'OWNER' ? 'owner' : 'investor';

      return res.json({
        ...user,
        role: clientRole
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({ error: 'Failed to get user profile' });
    }
  }
} 