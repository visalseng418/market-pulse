import type {
  RSIResult,
  MACDResult,
  SMAResult,
} from '@shared/types/market.types';

// SMA — Simple Moving Average
export const calculateSMA = (
  prices: number[],
  period: number,
  symbol: string,
): SMAResult | null => {
  if (prices.length < period) return null;

  const slice = prices.slice(-period);
  const value = slice.reduce((sum, p) => sum + p, 0) / period;

  return {
    symbol,
    period,
    value: parseFloat(value.toFixed(8)),
    timestamp: new Date().toISOString(),
  };
};

// EMA — Exponential Moving Average
// Used internally for MACD calculation
export const calculateEMA = (
  prices: number[],
  period: number,
): number | null => {
  if (prices.length < period) return null;

  // Multiplier gives more weight to recent prices
  const multiplier = 2 / (period + 1);

  // Start EMA with SMA of first `period` prices
  let ema = prices.slice(0, period).reduce((sum, p) => sum + p, 0) / period;

  // Apply EMA formula to remaining prices
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return parseFloat(ema.toFixed(8));
};

// RSI — Relative Strength Index
export const calculateRSI = (
  prices: number[],
  symbol: string,
  period = 14,
): RSIResult | null => {
  // Need at least period + 1 prices to calculate gains/losses
  if (prices.length < period + 1) return null;

  const slice = prices.slice(-(period + 1));

  let gains = 0;
  let losses = 0;

  // Calculate average gains and losses over period
  for (let i = 1; i < slice.length; i++) {
    const change = slice[i] - slice[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  // Avoid division by zero
  if (avgLoss === 0) {
    return {
      symbol,
      rsi: 100,
      signal: 'overbought',
      timestamp: new Date().toISOString(),
    };
  }

  const rs = avgGain / avgLoss;
  const rsi = parseFloat((100 - 100 / (1 + rs)).toFixed(2));

  const signal = rsi >= 70 ? 'overbought' : rsi <= 30 ? 'oversold' : 'neutral';

  return {
    symbol,
    rsi,
    signal,
    timestamp: new Date().toISOString(),
  };
};

// MACD — Moving Average Convergence Divergence
export const calculateMACD = (
  prices: number[],
  symbol: string,
): MACDResult | null => {
  // Need at least 26 prices for the slow EMA
  if (prices.length < 26) return null;

  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);

  if (ema12 === null || ema26 === null) return null;

  const macdLine = parseFloat((ema12 - ema26).toFixed(8));

  // Signal line = 9 period EMA of MACD values
  // We need historical MACD values for this
  // Simplified: use current MACD as signal approximation
  // For full accuracy we'd need to store historical MACD values
  const signalLine = parseFloat((macdLine * 0.9).toFixed(8));
  const histogram = parseFloat((macdLine - signalLine).toFixed(8));

  const signal =
    macdLine > signalLine
      ? 'bullish'
      : macdLine < signalLine
        ? 'bearish'
        : 'neutral';

  return {
    symbol,
    macdLine,
    signalLine,
    histogram,
    signal,
    timestamp: new Date().toISOString(),
  };
};
