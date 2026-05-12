import { createApiClient } from '@config/axios';
import type { MarketPrice } from '@shared/types/market.types';

const client = createApiClient(process.env.FRANKFURTER_API_URL!);

// All pairs requested with USD as base — one single API call
const QUOTES = ['EUR', 'GBP', 'JPY', 'KHR'];

// Maps Frankfurter quote currency → our symbol and how to derive the price.
// invert=true  → price = 1 / rate  (e.g. USD→EUR rate 0.85 means EUR-USD = 1/0.85 ≈ 1.176)
// invert=false → price = rate      (e.g. USD→JPY rate 157 means USD-JPY = 157)
const QUOTE_MAP: Record<string, { symbol: string; name: string; invert: boolean }> = {
  EUR: { symbol: 'EUR-USD', name: 'Euro / US Dollar',               invert: true  },
  GBP: { symbol: 'GBP-USD', name: 'British Pound / US Dollar',      invert: true  },
  JPY: { symbol: 'USD-JPY', name: 'US Dollar / Japanese Yen',       invert: false },
  KHR: { symbol: 'USD-KHR', name: 'US Dollar / Cambodian Riel',     invert: false },
};

export const getForexPrices = async (): Promise<MarketPrice[]> => {
  const { data } = await client.get('/v2/rates', {
    params: { base: 'USD', quotes: QUOTES.join(',') },
  });

  // Response: [{ date, base: "USD", quote: "EUR", rate: 0.85 }, ...]
  return (data as { base: string; quote: string; rate: number }[]).map((item) => {
    const meta  = QUOTE_MAP[item.quote];
    const price = meta.invert ? 1 / item.rate : item.rate;

    return {
      symbol:    meta.symbol,
      name:      meta.name,
      price,
      change24h: 0,
      volume24h: null,
      assetType: 'forex',
      timestamp: new Date().toISOString(),
    } satisfies MarketPrice;
  });
};
