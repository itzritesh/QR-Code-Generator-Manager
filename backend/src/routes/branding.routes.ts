import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getBranding, updateBranding } from '../controllers/branding.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getBranding);
router.put('/', updateBranding);

export default router;
