import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env, getAllowedCorsOrigins } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';
import dynamicQrRoutes from './routes/dynamicQr.routes.js';

export const createApp = (): Application => {
  const app = express();

  // Enable trust proxy for reverse proxies (Render, Railway, Vercel, Cloudflare, etc.)
  // Ensures req.ip, rate limiting, and client geo extraction work reliably
  app.set('trust proxy', env.TRUST_PROXY);

  app.disable('x-powered-by');

  // Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      xContentTypeOptions: true,
      xFrameOptions: { action: 'sameorigin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    })
  );

  // Production CORS Configuration
  const allowedOrigins = getAllowedCorsOrigins();

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, uptime monitors, server-to-server)
        if (!origin) {
          return callback(null, true);
        }

        // 1. Direct match with configured origins
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // 2. In development, allow any localhost or 127.0.0.1 port
        if (env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }

        // 3. If any Vercel domain is configured, allow Vercel preview deployments (*.vercel.app)
        const allowsVercel = allowedOrigins.some((o) => o.includes('.vercel.app'));
        if (allowsVercel && /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`Origin ${origin} is not authorized by CORS policy.`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
      maxAge: 86400, // Cache preflight requests for 24 hours
    })
  );

  // Global Rate Limiting
  app.use(apiRateLimiter);

  // Request Logging
  app.use(requestLogger);

  // Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Root welcome / status check
  app.get('/', (_req, res) => {
    res.json({
      name: 'QR Code Generator & Management Platform API',
      version: '1.0.0',
      status: 'online',
      documentation: '/api/health',
    });
  });

  // Mount Public Dynamic Shortlink Engine directly at /q/:shortCode
  app.use('/q', dynamicQrRoutes);

  // Mount API Router under /api
  app.use('/api', apiRouter);

  // Handle 404 Not Found
  app.use(notFoundHandler);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};
