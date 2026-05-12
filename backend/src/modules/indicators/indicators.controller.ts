import type { Request, Response, NextFunction } from 'express';
import * as indicatorsService from './indicators.service';
import { getHistoricalPrices, ASSET_TYPE_MAP } from './history.service';

export const getIndicators = async (
  req: Request<{ symbol: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const indicators = await indicatorsService.getIndicators(symbol);
    res.status(200).json({ success: true, data: indicators });
  } catch (error) {
    next(error);
  }
};

export const getIndicatorHistory = async (
  req: Request<{ symbol: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const assetType = ASSET_TYPE_MAP[symbol] ?? 'crypto';
    const snapshots = await getHistoricalPrices(symbol, assetType);
    res.status(200).json({ success: true, data: { symbol, snapshots } });
  } catch (error) {
    next(error);
  }
};
