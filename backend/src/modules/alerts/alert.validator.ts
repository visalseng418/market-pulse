import { z } from 'zod';

export const createAlertSchema = z.object({
  assetSymbol: z.string().min(1).max(20).toUpperCase(),
  assetType: z.enum(['crypto', 'forex', 'commodity']),
  condition: z.enum(['above', 'below']),
  targetPrice: z.number().positive('Target price must be positive'),
});
