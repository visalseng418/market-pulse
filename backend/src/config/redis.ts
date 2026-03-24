import Redis from 'ioredis';
import { logger } from '@utils/logger';

let redis: Redis;

export const connectRedis = async (): Promise<void> => {
  redis = new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      // exponential backoff — wait longer between each retry
      const delay = Math.min(times * 50, 2000);
      logger.warn(`Redis retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
  });

  return new Promise((resolve, reject) => {
    redis.on('connect', () => {
      logger.info('Redis connected successfully');
      resolve();
    });

    redis.on('error', (error) => {
      logger.error('Redis connection error:', error);
      reject(error);
    });
  });
};

export const getRedis = (): Redis => {
  if (!redis) {
    throw new Error('Redis not initialized. Call connectRedis() first.');
  }
  return redis;
};
