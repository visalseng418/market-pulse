import { getSnapshots } from '@modules/market/snapshot.service';
import {
  calculateRSI,
  calculateMACD,
  calculateSMA,
} from './indicators.calculator';
import { NotFoundError } from '@utils/errors';
import type { IndicatorsResult } from '@shared/types/market.types';

// Minimum snapshots needed for reliable indicators
const MIN_SNAPSHOTS = 50;

export const getIndicators = async (
  symbol: string,
): Promise<IndicatorsResult> => {
  const prices = await getSnapshots(symbol, 100);

  if (prices.length < MIN_SNAPSHOTS) {
    throw new NotFoundError(
      `Not enough historical data for ${symbol}. Need at least ${MIN_SNAPSHOTS} snapshots. Currently have ${prices.length}.`,
    );
  }

  const rsi = calculateRSI(prices, symbol);
  const macd = calculateMACD(prices, symbol);
  const sma20 = calculateSMA(prices, 20, symbol);
  const sma50 = calculateSMA(prices, 50, symbol);

  if (!rsi || !macd || !sma20 || !sma50) {
    throw new NotFoundError(
      `Unable to calculate indicators for ${symbol} — insufficient data`,
    );
  }

  return {
    symbol,
    rsi,
    macd,
    sma20,
    sma50,
    timestamp: new Date().toISOString(),
  };
};
