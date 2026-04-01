import cron from 'node-cron';
import { getIO } from '@config/socket';
import { getAllPrices } from '@modules/market/market.service';
import { logger } from '@utils/logger';
import { checkAndTriggerAlerts } from '@modules/alerts/alert.service';

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

    if (connectedClients > 0) {
      io.emit('prices:updated', prices);
      logger.debug(`Prices broadcast to ${connectedClients} client(s)`);
    } else {
      logger.debug('No clients connected, skipping broadcast');
    }

    // Check alerts regardless of connected clients
    // A user might not be online but still wants email notification
    await checkAndTriggerAlerts(prices);
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
