import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: unknown;

  constructor(message: string, statusCode = 500, errors?: unknown, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Unhandled Exception or Express Error', {
    path: req.originalUrl,
    method: req.method,
    message: err.message,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Handle custom AppError
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.errors, {
      path: req.originalUrl,
    });
    return;
  }

  // Handle Zod Validation Error
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    sendError(res, 'Request validation failed', 400, formattedErrors, {
      path: req.originalUrl,
    });
    return;
  }

  // Handle Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'value';
      sendError(res, `A record with this ${target} already exists.`, 409);
      return;
    }
    if (err.code === 'P2025') {
      sendError(res, 'The requested record was not found.', 404);
      return;
    }
    const errorDetails = env.NODE_ENV === 'development' ? { code: err.code, meta: err.meta } : undefined;
    sendError(res, 'Database request error.', 400, errorDetails);
    return;
  }

  // Handle Prisma Initialization or Connection Errors
  if (err instanceof Prisma.PrismaClientInitializationError) {
    sendError(res, 'Database connection is currently unavailable. Please try again shortly.', 503);
    return;
  }

  // Default fallback for unexpected errors
  const message =
    env.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred.'
      : err.message || 'Internal Server Error';

  sendError(
    res,
    message,
    500,
    env.NODE_ENV === 'development' ? { stack: err.stack } : undefined,
    { path: req.originalUrl }
  );
};
