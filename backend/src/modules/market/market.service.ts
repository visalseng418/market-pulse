import { getCryptoPrices } from './services/coingecko.service';
import { getForexPrices } from './services/exchangerate.service';
import { getCommodityPrices } from './services/commodity.service';
import { logger } from '@utils/logger';
import type { MarketPrice } from '@shared/types/market.types';
import { getCache, setCache, CACHE_KEYS, CACHE_TTL } from '@utils/cache';

// Default assets to track
export const DEFAULT_ASSETS = {
  crypto: ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'],
  forex: ['EUR-USD', 'GBP-USD', 'USD-JPY', 'USD-KHR'],
  commodity: ['GOLD', 'SILVER', 'PLATINUM'],
};

export const getAllPrices = async (): Promise<MarketPrice[]> => {
  // Check each cache separately
  const cachedCrypto = await getCache<MarketPrice[]>(CACHE_KEYS.CRYPTO_PRICES);
  const cachedForex = await getCache<MarketPrice[]>(CACHE_KEYS.FOREX_PRICES);
  const cachedCommodity = await getCache<MarketPrice[]>(
    CACHE_KEYS.COMMODITY_PRICES,
  );

  // Only fetch what's not cached
  const [cryptoResult, forexResult, commodityResult] = await Promise.allSettled(
    [
      cachedCrypto
        ? Promise.resolve(cachedCrypto)
        : getCryptoPrices(DEFAULT_ASSETS.crypto),
      cachedForex
        ? Promise.resolve(cachedForex)
        : getForexPrices(DEFAULT_ASSETS.forex),
      cachedCommodity ? Promise.resolve(cachedCommodity) : getCommodityPrices(),
    ],
  );

  const results: MarketPrice[] = [];

  if (cryptoResult.status === 'fulfilled') {
    if (!cachedCrypto) {
      await setCache(
        CACHE_KEYS.CRYPTO_PRICES,
        cryptoResult.value,
        CACHE_TTL.CRYPTO_PRICES,
      );
      logger.debug(
        `Crypto prices cached for ${CACHE_TTL.CRYPTO_PRICES} seconds`,
      );
    }
    results.push(...cryptoResult.value);
  } else {
    logger.error('CoinGecko fetch failed:', cryptoResult.reason);
  }

  if (forexResult.status === 'fulfilled') {
    if (!cachedForex) {
      await setCache(
        CACHE_KEYS.FOREX_PRICES,
        forexResult.value,
        CACHE_TTL.FOREX_PRICES,
      );
      logger.debug(`Forex prices cached for ${CACHE_TTL.FOREX_PRICES} seconds`);
    }
    results.push(...forexResult.value);
  } else {
    logger.error('ExchangeRate fetch failed:', forexResult.reason);
  }

  if (commodityResult.status === 'fulfilled') {
    if (!cachedCommodity) {
      await setCache(
        CACHE_KEYS.COMMODITY_PRICES,
        commodityResult.value,
        CACHE_TTL.COMMODITY_PRICES,
      );
      logger.debug(
        `Commodity prices cached for ${CACHE_TTL.COMMODITY_PRICES} seconds`,
      );
    }
    results.push(...commodityResult.value);
  } else {
    logger.error('Commodity fetch failed:', commodityResult.reason);
  }

  return results;
};
