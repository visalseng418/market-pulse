import { db } from '@config/database';
import { priceSnapshots } from '@config/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@utils/logger';
import type { MarketPrice } from '@shared/types/market.types';

export const saveSnapshots = async (prices: MarketPrice[]): Promise<void> => {
  try {
    await db.insert(priceSnapshots).values(
      prices.map((p) => ({
        assetSymbol: p.symbol,
        assetType: p.assetType,
        price: p.price.toString(),
        volume: p.volume24h?.toString() ?? null,
        timestamp: new Date(p.timestamp),
      })),
    );
  } catch (error) {
    logger.error('Failed to save price snapshots:', error);
  }
};

export const getSnapshots = async (
  symbol: string,
  limit = 100,
): Promise<number[]> => {
  const rows = await db
    .select({ price: priceSnapshots.price })
    .from(priceSnapshots)
    .where(eq(priceSnapshots.assetSymbol, symbol))
    .orderBy(desc(priceSnapshots.timestamp))
    .limit(limit);

  // Return as numbers, oldest first (needed for indicator calculations)
  return rows.map((r) => parseFloat(r.price.toString())).reverse();
};

export const getSnapshotsWithTimestamps = async (
  symbol: string,
  limit = 100,
): Promise<{ price: number; timestamp: string }[]> => {
  const rows = await db
    .select({ price: priceSnapshots.price, timestamp: priceSnapshots.timestamp })
    .from(priceSnapshots)
    .where(eq(priceSnapshots.assetSymbol, symbol))
    .orderBy(desc(priceSnapshots.timestamp))
    .limit(limit);

  return rows
    .map((r) => ({ price: parseFloat(r.price.toString()), timestamp: r.timestamp.toISOString() }))
    .reverse();
};
