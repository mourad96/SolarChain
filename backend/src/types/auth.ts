import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

export interface User extends JwtPayload {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  walletAddress?: string;
}

export interface AuthenticatedRequest extends Request {
  user: User;
} 