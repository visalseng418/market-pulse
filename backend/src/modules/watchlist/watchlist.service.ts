import { eq, and } from 'drizzle-orm';
import { db } from '@config/database';
import { watchlists } from '@config/schema';
import { NotFoundError, ForbiddenError, ConflictError } from '@utils/errors';
import { getAllPrices } from '@modules/market/market.service';
import type { AssetType } from '@shared/types/market.types';

export const getWatchlist = async (userId: string) => {
  return db
    .select({
      id: watchlists.id,
      assetSymbol: watchlists.assetSymbol,
      assetType: watchlists.assetType,
      createdAt: watchlists.createdAt,
    })
    .from(watchlists)
    .where(eq(watchlists.userId, userId));
};

export const getWatchlistWithPrices = async (userId: string) => {
  const items = await getWatchlist(userId);
  if (items.length === 0) return [];

  const prices = await getAllPrices();
  const priceMap = new Map(prices.map((p) => [p.symbol, p]));

  return items.map((item) => ({
    ...item,
    price: priceMap.get(item.assetSymbol) ?? null,
  }));
};

export const addToWatchlist = async (
  userId: string,
  assetSymbol: string,
  assetType: AssetType,
) => {
  const [existing] = await db
    .select({ id: watchlists.id })
    .from(watchlists)
    .where(
      and(
        eq(watchlists.userId, userId),
        eq(watchlists.assetSymbol, assetSymbol),
      ),
    )
    .limit(1);

  if (existing) {
    throw new ConflictError(`${assetSymbol} is already in your watchlist`);
  }

  const [item] = await db
    .insert(watchlists)
    .values({ userId, assetSymbol, assetType })
    .returning();

  return item;
};

export const removeFromWatchlist = async (
  watchlistId: string,
  userId: string,
): Promise<void> => {
  const [item] = await db
    .select({ id: watchlists.id, userId: watchlists.userId })
    .from(watchlists)
    .where(eq(watchlists.id, watchlistId))
    .limit(1);

  if (!item) throw new NotFoundError('Watchlist item not found');
  if (item.userId !== userId)
    throw new ForbiddenError('You can only remove your own watchlist items');

  await db.delete(watchlists).where(eq(watchlists.id, watchlistId));
};
