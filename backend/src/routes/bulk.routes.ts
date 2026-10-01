import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { bulkRateLimiter } from '../middleware/rateLimiter.js';
import {
  validateCsv,
  generateBulk,
  downloadZipDirect,
  getTemplate,
} from '../controllers/bulkQr.controller.js';

const router = Router();

// Public sample template download
router.get('/template', getTemplate);

// Protected bulk management operations
router.use(authenticate);

router.post('/validate', bulkRateLimiter, validateCsv);
router.post('/generate', bulkRateLimiter, generateBulk);
router.post('/download-zip', bulkRateLimiter, downloadZipDirect);

export default router;
