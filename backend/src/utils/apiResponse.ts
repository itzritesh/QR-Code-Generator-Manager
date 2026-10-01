import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: unknown;
  meta?: {
    timestamp: string;
    path?: string;
    [key: string]: unknown;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: Record<string, unknown>
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message = 'Internal Server Error',
  statusCode = 500,
  errors?: unknown,
  meta?: Record<string, unknown>
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    errors,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
  return res.status(statusCode).json(response);
};
