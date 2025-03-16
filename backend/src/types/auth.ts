import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'investor';
  walletAddress?: string;
}

export interface AuthenticatedRequest extends Request {
  user: User;
} 