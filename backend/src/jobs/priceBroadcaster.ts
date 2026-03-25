import cron from 'node-cron';
import { getIO } from '@config/socket';
import { getAllPrices } from '@modules/market/market.service';
import { logger } from '@utils/logger';

let isRunning = false;
const interval = 20; // seconds

const broadcastPrices = async (): Promise<void> => {
  // Prevent overlapping runs
  // If previous fetch is still running, skip this cycle
  if (isRunning) {
    logger.warn('Price broadcast already running, skipping cycle');
    return;
  }

  isRunning = true;

  try {
    const prices = await getAllPrices();

    if (prices.length === 0) {
      logger.warn('No prices to broadcast');
      return;
    }

    const io = getIO();
    const connectedClients = io.engine.clientsCount;

    // Only broadcast if someone is connected — no point fetching if nobody is listening
    if (connectedClients === 0) {
      logger.debug('No clients connected, skipping broadcast');
      return;
    }

    io.emit('prices:updated', prices);
    logger.debug(`Prices broadcast to ${connectedClients} client(s)`);
  } catch (error) {
    logger.error('Price broadcast failed:', error);
  } finally {
    isRunning = false;
  }
};

export const startPriceBroadcaster = (): void => {
  // Run every 20 seconds
  cron.schedule(`*/${interval} * * * * *`, broadcastPrices);
  logger.info(
    `Price broadcaster started — broadcasting every ${interval} seconds`,
  );
};
