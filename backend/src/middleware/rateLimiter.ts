import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * General API Rate Limiter
 * Applied across all standard endpoints
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  max: env.RATE_LIMIT_MAX || 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(
      res,
      'Too many requests from this IP address. Please slow down and try again shortly.',
      429,
      {
        retryAfterMinutes: Math.ceil((env.RATE_LIMIT_WINDOW_MS || 900000) / 60000),
      }
    );
  },
  skip: (req) => {
    return req.path === '/api/health' || req.path === '/health';
  },
});

/**
 * Authentication Rate Limiter
 * Protects login, registration, and password recovery against brute-force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 20 : 200, // max 20 attempts in production, 200 in dev/test
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(
      res,
      'Too many authentication attempts from this IP. Please try again in 15 minutes.',
      429,
      { retryAfterMinutes: 15 }
    );
  },
});

/**
 * QR Code Creation Rate Limiter
 * Prevents automated spamming of QR creation and database bloat
 */
export const qrCreateRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 QR creations per 15 min per user/IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(
      res,
      'QR creation rate limit exceeded. Please wait a few minutes before generating more QR codes.',
      429,
      { retryAfterMinutes: 5 }
    );
  },
});

/**
 * Bulk QR Generation Rate Limiter
 * Bulk batch operations are resource-intensive (ZIP compilation & DB records)
 */
export const bulkRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 batch operations per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(
      res,
      'Bulk generation limit reached. Please wait before processing another batch.',
      429,
      { retryAfterMinutes: 10 }
    );
  },
});

/**
 * Dynamic Scan Endpoint Rate Limiter
 * Allows high volume but prevents DoS floods / artificial scan metric inflation
 */
export const dynamicScanRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 600, // Up to 600 scans per minute per client IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(
      res,
      'High traffic detected. Please wait a moment before re-scanning this QR code.',
      429
    );
  },
});

/**
 * Analytics API Rate Limiter
 * Analytics queries run complex aggregation over large scan tables
 */
export const analyticsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 queries per minute
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(
      res,
      'Analytics request limit exceeded. Please reduce refresh frequency.',
      429
    );
  },
});
