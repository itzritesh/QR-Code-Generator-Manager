import { Request, Response, NextFunction } from 'express';
import { getHealthStatus } from '../services/health.service.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

export const getHealth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const health = await getHealthStatus();
    const statusCode = health.status === 'healthy' ? 200 : 503;

    if (health.status === 'healthy') {
      sendSuccess(res, health, 'Service is healthy and fully operational', statusCode);
    } else {
      sendError(res, 'Service is in degraded state', statusCode, health);
    }
  } catch (error) {
    next(error);
  }
};
