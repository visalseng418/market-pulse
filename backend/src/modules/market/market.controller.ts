import type { Request, Response, NextFunction } from 'express';
import * as marketService from './market.service';

export const getPrices = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const prices = await marketService.getAllPrices();
    res.status(200).json({ success: true, data: prices });
  } catch (error) {
    next(error);
  }
};
