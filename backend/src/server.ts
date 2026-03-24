import 'dotenv/config';
import app from './app';
import { logger } from '@utils/logger';
import { connectDB } from '@config/database';
import { connectRedis } from '@config/redis';

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    await connectRedis();

    app.listen(PORT, () => {
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
