import 'dotenv/config';
import { db } from '../../src/config/database';
import { priceSnapshots } from '../../src/config/schema';
import { logger } from '../../src/utils/logger';

const ASSETS = [
  // Crypto
  { symbol: 'BTC',     type: 'crypto',    basePrice: 95000,  volatility: 0.012 },
  { symbol: 'ETH',     type: 'crypto',    basePrice: 3200,   volatility: 0.014 },
  { symbol: 'BNB',     type: 'crypto',    basePrice: 600,    volatility: 0.013 },
  { symbol: 'SOL',     type: 'crypto',    basePrice: 200,    volatility: 0.018 },
  { symbol: 'XRP',     type: 'crypto',    basePrice: 2.5,    volatility: 0.016 },
  // Forex
  { symbol: 'EUR-USD', type: 'forex',     basePrice: 1.085,  volatility: 0.002 },
  { symbol: 'GBP-USD', type: 'forex',     basePrice: 1.27,   volatility: 0.002 },
  { symbol: 'USD-JPY', type: 'forex',     basePrice: 150.0,  volatility: 0.003 },
  { symbol: 'USD-KHR', type: 'forex',     basePrice: 4100,   volatility: 0.001 },
  // Commodities
  { symbol: 'GOLD',     type: 'commodity', basePrice: 3300,  volatility: 0.006 },
  { symbol: 'SILVER',   type: 'commodity', basePrice: 33,    volatility: 0.009 },
  { symbol: 'PLATINUM', type: 'commodity', basePrice: 970,   volatility: 0.007 },
] as const;

const SNAPSHOTS = 100;
const INTERVAL_SECONDS = 20;

const seed = async (): Promise<void> => {
  logger.info('Seeding price snapshots...');

  const now = new Date();

  for (const asset of ASSETS) {
    const rows = [];
    let price = asset.basePrice;

    for (let i = SNAPSHOTS - 1; i >= 0; i--) {
      // Geometric random walk: each step is a % move
      const drift = (Math.random() - 0.5) * 2 * asset.volatility;
      price = price * (1 + drift);

      rows.push({
        assetSymbol: asset.symbol,
        assetType: asset.type as 'crypto' | 'forex' | 'commodity',
        price: price.toFixed(8),
        volume: null,
        timestamp: new Date(now.getTime() - i * INTERVAL_SECONDS * 1000),
      });
    }

    await db.insert(priceSnapshots).values(rows);
    logger.info(`Seeded ${SNAPSHOTS} snapshots for ${asset.symbol}`);
  }

  logger.info('Done. Seeded all assets.');
  process.exit(0);
};

seed().catch((error) => {
  logger.error('Seed failed:', error);
  process.exit(1);
});
