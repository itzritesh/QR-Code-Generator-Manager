import { Router } from 'express';
import {
  register,
  login,
  logout,
  getCurrentUser,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteAccount,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../validators/common.validators.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public Authentication Routes
router.post('/register', authRateLimiter, validateRequest({ body: registerSchema }), register);
router.post('/login', authRateLimiter, validateRequest({ body: loginSchema }), login);
router.post('/logout', logout);
router.post('/forgot-password', authRateLimiter, validateRequest({ body: forgotPasswordSchema }), forgotPassword);
router.post('/reset-password', authRateLimiter, validateRequest({ body: resetPasswordSchema }), resetPassword);

// Protected Authentication & Profile Routes
router.get('/me', authenticate, getCurrentUser);
router.put('/profile', authenticate, validateRequest({ body: updateProfileSchema }), updateProfile);
router.put('/change-password', authenticate, validateRequest({ body: changePasswordSchema }), changePassword);
router.delete('/account', authenticate, deleteAccount);

export default router;
