import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { env } from '../config/env.js';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register(name, email, password);
    sendSuccess(res, result, 'Account registered successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    sendSuccess(res, result, 'Signed in successfully.', 200);
  } catch (error) {
    next(error);
  }
};

export const logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, null, 'Signed out successfully.', 200);
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const user = await authService.getCurrentUser(userId);
    sendSuccess(res, { user }, 'User profile retrieved.', 200);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { name, avatar } = req.body;
    const updatedUser = await authService.updateProfile(userId, { name, avatar });
    sendSuccess(res, { user: updatedUser }, 'Profile updated successfully.', 200);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(userId, currentPassword, newPassword);
    sendSuccess(res, result, 'Password changed successfully.', 200);
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, clientOrigin: bodyOrigin } = req.body;
    let rawOrigin =
      bodyOrigin ||
      (req.headers.origin as string) ||
      (req.headers.referer ? new URL(req.headers.referer).origin : null) ||
      env.FRONTEND_URL ||
      env.CORS_ORIGIN;

    // If CORS_ORIGIN has multiple comma-separated URLs, take the first one
    if (typeof rawOrigin === 'string' && rawOrigin.includes(',')) {
      rawOrigin = rawOrigin.split(',')[0].trim();
    }

    const clientOrigin = (rawOrigin || 'http://localhost:5173').trim().replace(/\/+$/, '');
    const result = await authService.forgotPassword(email, clientOrigin);
    sendSuccess(res, result, result.message, 200);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, password } = req.body;
    const result = await authService.resetPassword(token, password);
    sendSuccess(res, result, result.message, 200);
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const result = await authService.deleteAccount(userId);
    sendSuccess(res, result, result.message, 200);
  } catch (error) {
    next(error);
  }
};
