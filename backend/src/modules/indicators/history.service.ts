import axios from 'axios';
import { getCache, setCache } from '@utils/cache';
import { getSnapshotsWithTimestamps } from '@modules/market/snapshot.service';
import { logger } from '@utils/logger';
import type { AssetType } from '@shared/types/market.types';

export interface PricePoint {
  price: number;
  timestamp: string;
}

const HISTORY_CACHE_TTL = 3600; // 1 hour — external API calls are expensive

const CRYPTO_COIN_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
};

// gold-api.com metal codes
const COMMODITY_CODE_MAP: Record<string, string> = {
  GOLD:     'XAU',
  SILVER:   'XAG',
  PLATINUM: 'XPT',
};

// Frankfurter only supports ECB currencies — KHR is not among them
const FRANKFURTER_PAIRS: Record<string, { base: string; quote: string }> = {
  'EUR-USD': { base: 'EUR', quote: 'USD' },
  'GBP-USD': { base: 'GBP', quote: 'USD' },
  'USD-JPY': { base: 'USD', quote: 'JPY' },
};

// Full asset type map — mirrors what's tracked in priceBroadcaster
export const ASSET_TYPE_MAP: Record<string, AssetType> = {
  BTC: 'crypto', ETH: 'crypto', BNB: 'crypto', SOL: 'crypto', XRP: 'crypto',
  'EUR-USD': 'forex', 'GBP-USD': 'forex', 'USD-JPY': 'forex', 'USD-KHR': 'forex',
  GOLD: 'commodity', SILVER: 'commodity', PLATINUM: 'commodity',
};

// Group by calendar day (YYYY-MM-DD) and keep the last price of each day.
// If all points fall on the same day (e.g. DB seed fallback), return as-is
// so the fallback chart still has usable data.
function toDaily(points: PricePoint[]): PricePoint[] {
  if (points.length === 0) return points;
  const firstDay = points[0].timestamp.slice(0, 10);
  const lastDay  = points[points.length - 1].timestamp.slice(0, 10);
  if (firstDay === lastDay) return points; // single-day data, don't collapse

  const byDay = new Map<string, PricePoint>();
  for (const p of points) {
    byDay.set(p.timestamp.slice(0, 10), p); // last price of each day wins
  }
  return [...byDay.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function fetchCoinGeckoHistory(coinId: string): Promise<PricePoint[]> {
  const baseUrl = (process.env.COINGECKO_API_URL ?? 'https://api.coingecko.com/api/v3').replace(/\/$/, '');
  const apiKey = process.env.COINGECKO_API_KEY;

  const { data } = await axios.get(`${baseUrl}/coins/${coinId}/market_chart`, {
    params: {
      vs_currency: 'usd',
      days: 90,
      ...(apiKey ? { x_cg_demo_api_key: apiKey } : {}),
    },
    timeout: 15000,
  });

  // prices: [[timestamp_ms, price], ...] — hourly for days <= 90
  return (data.prices as [number, number][]).map(([ts, price]) => ({
    price,
    timestamp: new Date(ts).toISOString(),
  }));
}

async function fetchFrankfurterHistory(base: string, quote: string): Promise<PricePoint[]> {
  const start = isoDate(daysAgo(90));
  const end = isoDate(new Date());

  const { data } = await axios.get(
    `https://api.frankfurter.dev/v1/${start}..${end}`,
    { params: { from: base, to: quote }, timeout: 10000 },
  );

  // rates: { "YYYY-MM-DD": { "QUOTE": price } }
  return Object.entries(data.rates as Record<string, Record<string, number>>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rates]) => ({
      price: rates[quote],
      timestamp: new Date(date + 'T12:00:00Z').toISOString(),
    }));
}

async function fetchGoldApiCommodityHistory(code: string): Promise<PricePoint[]> {
  const baseUrl = (process.env.GOLD_API_URL ?? 'https://api.gold-api.com').replace(/\/$/, '');
  const apiKey  = process.env.GOLD_API_API_KEY!;

  const startTimestamp = Math.floor(daysAgo(90).getTime() / 1000);
  const endTimestamp   = Math.floor(Date.now() / 1000);

  const { data } = await axios.get(`${baseUrl}/history`, {
    headers: { 'x-api-key': apiKey },
    params: {
      symbol:         code,
      startTimestamp,
      endTimestamp,
      groupBy:        'day',
      aggregation:    'avg',
      orderBy:        'asc',
    },
    timeout: 15000,
  });

  // Response: [{ "day": "2026-02-19 00:00:00", "avg_price": "5022.600100" }, ...]
  return (data as { day: string; avg_price: string }[]).map((row) => ({
    price:     parseFloat(row.avg_price),
    timestamp: new Date(row.day.replace(' ', 'T') + 'Z').toISOString(),
  }));
}

export async function getHistoricalPrices(
  symbol: string,
  assetType: AssetType,
): Promise<PricePoint[]> {
  const cacheKey = `indicators:history:${symbol}`;
  const cached = await getCache<PricePoint[]>(cacheKey);
  if (cached) {
    logger.debug(`History cache hit for ${symbol}`);
    return cached;
  }

  let points: PricePoint[] = [];

  try {
    if (assetType === 'crypto') {
      const coinId = CRYPTO_COIN_MAP[symbol];
      if (!coinId) throw new Error(`No CoinGecko ID for ${symbol}`);
      points = await fetchCoinGeckoHistory(coinId);

    } else if (assetType === 'commodity') {
      const code = COMMODITY_CODE_MAP[symbol];
      if (!code) throw new Error(`No gold-api.com code for ${symbol}`);
      points = await fetchGoldApiCommodityHistory(code);

    } else if (assetType === 'forex') {
      const pair = FRANKFURTER_PAIRS[symbol];
      if (pair) {
        points = await fetchFrankfurterHistory(pair.base, pair.quote);
      } else {
        // USD-KHR: not an ECB currency, Frankfurter won't have it
        logger.warn(`Frankfurter does not support ${symbol} — falling back to DB snapshots`);
        points = await getSnapshotsWithTimestamps(symbol, 100);
      }
    }
  } catch (error) {
    logger.error(`Failed to fetch external history for ${symbol}, falling back to DB:`, error);
    points = await getSnapshotsWithTimestamps(symbol, 100);
  }

  // Empty result from any fetch → fall back to DB snapshots
  if (points.length === 0) {
    logger.warn(`No external history returned for ${symbol}, falling back to DB snapshots`);
    points = await getSnapshotsWithTimestamps(symbol, 100);
  }

  // Downsample to one point per day (last price of each day).
  // CoinGecko 90-day hourly returns ~2160 pts → collapses to ~90 daily pts.
  const result = toDaily(points);

  if (result.length > 0) {
    await setCache(cacheKey, result, HISTORY_CACHE_TTL);
  }

  return result;
}
