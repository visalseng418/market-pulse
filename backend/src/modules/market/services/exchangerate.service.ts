import { createApiClient } from '@config/axios';
import type { MarketPrice } from '@shared/types/market.types';

//Base url
const client = createApiClient(process.env.EXCHANGERATE_API_URL!);

const FOREX_PAIRS: Record<
  string,
  { base: string; quote: string; name: string }
> = {
  'EUR-USD': { base: 'EUR', quote: 'USD', name: 'Euro / US Dollar' },
  'GBP-USD': { base: 'GBP', quote: 'USD', name: 'British Pound / US Dollar' },
  'USD-JPY': { base: 'USD', quote: 'JPY', name: 'US Dollar / Japanese Yen' },
  'USD-KHR': { base: 'USD', quote: 'KHR', name: 'US Dollar / Cambodian Riel' },
};

export const getForexPrices = async (
  symbols: string[],
): Promise<MarketPrice[]> => {
  const results: MarketPrice[] = [];

  for (const symbol of symbols) {
    const pair = FOREX_PAIRS[symbol];
    if (!pair) continue;

    const { data } = await client.get(
      `/${process.env.EXCHANGERATE_API_KEY}/pair/${pair.base}/${pair.quote}`,
    );

    results.push({
      symbol,
      name: pair.name,
      price: data.conversion_rate,
      change24h: 0, // free tier doesn't provide 24h change
      volume24h: null,
      assetType: 'forex',
      timestamp: new Date().toISOString(),
    } satisfies MarketPrice);
  }

  return results;
};
