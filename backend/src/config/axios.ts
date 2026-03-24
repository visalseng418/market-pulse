import axios from 'axios';
import { logger } from '@utils/logger';

// Generic axios instance factory
// Each API gets its own instance with its own base URL and timeout
export const createApiClient = (baseURL: string, timeout = 10000) => {
  const instance = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Log every outgoing request in development
  instance.interceptors.request.use((config) => {
    logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  });

  // Log every response and handle errors consistently
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      logger.error('API Request failed:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
      });
      return Promise.reject(error);
    },
  );

  return instance;
};
