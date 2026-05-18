import 'dotenv/config';
import app from './app';
import { logger } from '@utils/logger';
import { connectDB } from '@config/database';
import { connectRedis } from '@config/redis';
import { connectEmail } from '@config/email';
import { initializeSocket } from '@config/socket';
import http from 'http';
import { startPriceBroadcaster } from '@jobs/priceBroadcaster';

const PORT = process.env.PORT || 5000;

const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'DATABASE_URL',
  'REDIS_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
];

const startServer = async (): Promise<void> => {
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      logger.error(`Missing required environment variable: ${key}`);
      process.exit(1);
    }
  }

  try {
    await connectDB();
    await connectRedis();
    await connectEmail();

    // Create HTTP server explicitly
    // Socket.io needs access to the raw HTTP server, not just Express
    const httpServer = http.createServer(app);

    // Attach Socket.io to HTTP server
    initializeSocket(httpServer);

    // Start price broadcaster cron job
    startPriceBroadcaster();

    httpServer.listen(PORT, () => {
      logger.info(
        `Server running on port ${PORT} in ${process.env.NODE_ENV} mode`,
      );
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

startServer();
