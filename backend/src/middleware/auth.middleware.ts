import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../types/auth';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> | void => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as User;
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
};

export const requireOwner = (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> | void => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as User;
    
    if (payload.role !== 'owner') {
      res.status(403).json({ error: 'Access denied. Owner role required.' });
      return;
    }
    
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
};

export const requireInvestor = (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> | void => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as User;
    
    if (payload.role !== 'investor') {
      res.status(403).json({ error: 'Access denied. Investor role required.' });
      return;
    }
    
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
}; 