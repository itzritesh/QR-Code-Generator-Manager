import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { analyticsRateLimiter } from '../middleware/rateLimiter.js';
import { getOverviewAnalytics, getQrAnalytics } from '../controllers/analytics.controller.js';

const router = Router();

// Protect all analytics endpoints with JWT authentication
router.use(authenticate);

// Fleet-wide analytics overview
router.get('/overview', analyticsRateLimiter, getOverviewAnalytics);

// QR-specific analytics
router.get('/qr/:id', analyticsRateLimiter, getQrAnalytics);

export default router;
