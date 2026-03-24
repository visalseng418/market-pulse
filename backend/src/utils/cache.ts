import { getRedis } from '@config/redis';
import { logger } from '@utils/logger';

export const CACHE_KEYS = {
  //MARKET_PRICES: 'market:prices',
  CRYPTO_PRICES: 'market:crypto',
  FOREX_PRICES: 'market:forex',
  COMMODITY_PRICES: 'market:commodity',
  BLACKLISTED_TOKEN: (token: string) => `blacklist:${token}`,
};
//To match the free tier api quota
// CRYPTO_PRICES: 30,        // 30 seconds
// FOREX_PRICES: 300,        // 5 minutes — saves API quota
// COMMODITY_PRICES: 300,    // 5 minutes — prices barely move

export const CACHE_TTL = {
  //MARKET_PRICES: 10, // 10 seconds — prices update frequently
  CRYPTO_PRICES: 10,
  FOREX_PRICES: 5,
  COMMODITY_PRICES: 15,
  TOKEN_BLACKLIST: 604800, // 7 days — matches JWT expiry
};

// Get cached value, returns null if not found
export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const redis = getRedis();
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    // Cache failure should never break the app
    // log it and return null so fresh data is fetched
    logger.error('Cache get error:', error);
    return null;
  }
};

// Set cached value with TTL in seconds
export const setCache = async (
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> => {
  try {
    const redis = getRedis();
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    logger.error('Cache set error:', error);
    // Don't throw — cache failure is not critical
  }
};

// Delete cached value
export const deleteCache = async (key: string): Promise<void> => {
  try {
    const redis = getRedis();
    await redis.del(key);
  } catch (error) {
    logger.error('Cache delete error:', error);
  }
};

// Check if key exists
export const hasCache = async (key: string): Promise<boolean> => {
  try {
    const redis = getRedis();
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    logger.error('Cache exists error:', error);
    return false;
  }
};
