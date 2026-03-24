import axios from 'axios';
import type { MarketPrice } from '@shared/types/market.types';
import { logger } from '@utils/logger';
import { createApiClient } from '@config/axios';

const client = createApiClient(process.env.GOLDAPI_URL!);

const COMMODITIES = [
  { symbol: 'GOLD', name: 'Gold', code: 'XAU' },
  { symbol: 'SILVER', name: 'Silver', code: 'XAG' },
  { symbol: 'PLATINUM', name: 'Platinum', code: 'XPT' },
];

export const getCommodityPrices = async (): Promise<MarketPrice[]> => {
  const results: MarketPrice[] = [];

  for (const commodity of COMMODITIES) {
    try {
      const { data } = await client.get(`${commodity.code}/USD`, {
        headers: {
          'x-access-token': process.env.GOLDAPI_KEY!,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      results.push({
        symbol: commodity.symbol,
        name: commodity.name,
        price: data.price,
        change24h: data.chp ?? 0, // chp = change percentage
        volume24h: null,
        assetType: 'commodity',
        timestamp: new Date().toISOString(),
      } satisfies MarketPrice);
    } catch (error) {
      logger.error(`Failed to fetch ${commodity.symbol}:`, error);
    }
  }

  return results;
};
