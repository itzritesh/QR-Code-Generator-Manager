import morgan from 'morgan';
import { RequestHandler } from 'express';
import { env } from '../config/env.js';

export const requestLogger: RequestHandler =
  env.NODE_ENV === 'production'
    ? morgan('combined', {
        skip: (req) => req.url === '/api/health', // Don't clutter logs with periodic health check polls
      })
    : morgan(':method :url :status :res[content-length] - :response-time ms');
