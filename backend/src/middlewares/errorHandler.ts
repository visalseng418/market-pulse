//This is a global error handler
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '@utils/errors';
import { logger } from '@utils/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Known operational error — safe to expose to client
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
    });
    return;
  }

  // Unknown error — log full details but never expose internals to client
  logger.error('Unexpected error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong',
  });
};
