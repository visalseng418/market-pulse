import { z } from 'zod';

export const addToWatchlistSchema = z.object({
  assetSymbol: z.string().min(1).max(20).toUpperCase(),
  assetType: z.enum(['crypto', 'forex', 'commodity']),
});
