import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '@utils/logger';
import { hasCache, CACHE_KEYS } from '@utils/cache';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '@shared/types/market.types';
import type { JwtPayload } from '@shared/types/auth.types';
import { getAllPrices } from '@modules/market/market.service';

let io: SocketServer<ClientToServerEvents, ServerToClientEvents>;

export const initializeSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  // Authenticate every WebSocket connection with JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('No token provided'));
      }

      // Check if token is blacklisted
      const isBlacklisted = await hasCache(CACHE_KEYS.BLACKLISTED_TOKEN(token));
      if (isBlacklisted) {
        return next(new Error('Token has been invalidated'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

      // Attach user to socket
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    const user = socket.data.user as JwtPayload;
    logger.info(`WebSocket connected: ${user.email}`);

    // Send confirmation to client
    socket.emit('connected', {
      message: 'Connected to MarketPulse live feed',
    });

    // Send prices immediately on connection, so user doesn't wait up to 30s for first update
    try {
      const prices = await getAllPrices();
      if (prices.length > 0) {
        socket.emit('prices:updated', prices);
        logger.debug(`Initial prices sent to ${user.email}`);
      }
    } catch (error) {
      logger.error('Failed to send initial prices:', error);
    }

    socket.on('disconnect', () => {
      logger.info(`WebSocket disconnected: ${user.email}`);
    });
  });

  logger.info('WebSocket server initialized');
  return io;
};

// Export so other modules can broadcast events
export const getIO = (): SocketServer => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
