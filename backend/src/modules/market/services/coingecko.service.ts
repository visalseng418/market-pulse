import { createApiClient } from '@config/axios';
import type { MarketPrice } from '@shared/types/market.types';

//Base url
const client = createApiClient(process.env.COINGECKO_API_URL!);

// Map our symbol to CoinGecko's ID format
const COIN_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
};

const COIN_NAME_MAP: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  BNB: 'BNB',
  SOL: 'Solana',
  XRP: 'XRP',
};

export const getCryptoPrices = async (
  symbols: string[],
): Promise<MarketPrice[]> => {
  const ids = symbols
    .map((s) => COIN_ID_MAP[s])
    .filter(Boolean)
    .join(',');

  const { data } = await client.get('/coins/markets', {
    params: {
      vs_currency: 'usd',
      ids,
      order: 'market_cap_desc',
      per_page: symbols.length,
      page: 1,
      sparkline: false,
      price_change_percentage: '24h',
      x_cg_demo_api_key: process.env.COINGECKO_API_KEY,
    },
  });

  // Normalize to our MarketPrice format
  return data.map((coin: any) => {
    const symbol =
      Object.keys(COIN_ID_MAP).find((key) => COIN_ID_MAP[key] === coin.id) ||
      coin.symbol.toUpperCase();

    return {
      symbol,
      name: COIN_NAME_MAP[symbol] || coin.name,
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h ?? 0,
      volume24h: coin.total_volume,
      assetType: 'crypto',
      timestamp: new Date().toISOString(),
    } satisfies MarketPrice;
  });
};
