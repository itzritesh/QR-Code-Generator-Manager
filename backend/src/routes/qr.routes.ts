import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { qrCreateRateLimiter, analyticsRateLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../validators/common.validators.js';
import { createQrSchema, updateQrSchema } from '../validators/qr.validator.js';
import {
  createQr,
  listQrs,
  getQr,
  updateQr,
  deleteQr,
  duplicateQr,
  updateStatus,
  getDashboardStats,
  previewPayload,
} from '../controllers/qr.controller.js';
import { getQrAnalytics } from '../controllers/analytics.controller.js';
import bulkRoutes from './bulk.routes.js';

const router = Router();

// Protect all QR management endpoints with JWT authentication
router.use(authenticate);

// Bulk QR Operations (must be mounted before /:id)
router.use('/bulk', bulkRoutes);

// Aggregated real dashboard metrics (must be above /:id)
router.get('/dashboard/metrics', getDashboardStats);

// QR CRUD & management operations
router.post('/', qrCreateRateLimiter, validateRequest({ body: createQrSchema }), createQr);
router.get('/', listQrs);
router.post('/preview', previewPayload);

router.get('/:id', getQr);
router.put('/:id', validateRequest({ body: updateQrSchema }), updateQr);
router.delete('/:id', deleteQr);

// Management Actions: Duplicate & Enable/Disable
router.post('/:id/duplicate', qrCreateRateLimiter, duplicateQr);
router.patch('/:id/status', updateStatus);

// QR Analytics Endpoint
router.get('/:id/analytics', analyticsRateLimiter, getQrAnalytics);

export default router;
