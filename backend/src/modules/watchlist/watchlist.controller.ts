import type { Request, Response, NextFunction } from 'express';
import * as watchlistService from './watchlist.service';
import { addToWatchlistSchema } from './watchlist.validator';
import { ValidationError } from '@utils/errors';

export const getWatchlist = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const items = await watchlistService.getWatchlist(req.user!.userId);
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

export const getWatchlistPrices = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const items = await watchlistService.getWatchlistWithPrices(req.user!.userId);
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

export const addToWatchlist = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const validated = addToWatchlistSchema.safeParse(req.body);
    if (!validated.success) {
      throw new ValidationError(
        JSON.stringify(validated.error.flatten().fieldErrors),
      );
    }
    const item = await watchlistService.addToWatchlist(
      req.user!.userId,
      validated.data.assetSymbol,
      validated.data.assetType,
    );
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const removeFromWatchlist = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await watchlistService.removeFromWatchlist(req.params.id as string, req.user!.userId);
    res.status(200).json({ success: true, message: 'Removed from watchlist' });
  } catch (error) {
    next(error);
  }
};
