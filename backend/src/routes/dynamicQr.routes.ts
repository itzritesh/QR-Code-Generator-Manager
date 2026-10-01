import { Router } from 'express';
import { handleDynamicScan, getDynamicQrInfo } from '../controllers/dynamicQr.controller.js';
import { dynamicScanRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public dynamic scan information
router.get('/:shortCode/info', dynamicScanRateLimiter, getDynamicQrInfo);

// Public dynamic scan redirect endpoint
router.get('/:shortCode', dynamicScanRateLimiter, handleDynamicScan);

export default router;
