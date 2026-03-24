import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@shared/types/auth.types';
import { hasCache, CACHE_KEYS } from '@utils/cache';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // Check if token is blacklisted first
    const isBlacklisted = await hasCache(CACHE_KEYS.BLACKLISTED_TOKEN(token));
    if (isBlacklisted) {
      res
        .status(401)
        .json({ success: false, message: 'Token has been invalidated' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res
      .status(401)
      .json({ success: false, message: 'Invalid or expired token' });
  }
};
