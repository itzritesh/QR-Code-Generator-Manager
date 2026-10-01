import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import qrRoutes from './qr.routes.js';
import dynamicQrRoutes from './dynamicQr.routes.js';
import analyticsRoutes from './analytics.routes.js';
import brandingRoutes from './branding.routes.js';

const apiRouter = Router();

// API Health Check
apiRouter.use('/health', healthRoutes);

// Authentication & Account Management
apiRouter.use('/auth', authRoutes);

// QR Code Generator & Management Engine
apiRouter.use('/qr', qrRoutes);

// Fleet & QR Analytics Engine
apiRouter.use('/analytics', analyticsRoutes);

// Custom Branding Configuration
apiRouter.use('/branding', brandingRoutes);

// Dynamic QR Shortlink Routing
apiRouter.use('/q', dynamicQrRoutes);

export default apiRouter;
