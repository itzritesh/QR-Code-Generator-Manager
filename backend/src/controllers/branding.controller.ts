import { Request, Response, NextFunction } from 'express';
import { brandingService } from '../services/branding.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getBranding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const branding = await brandingService.getBranding(userId);
    sendSuccess(res, { branding }, 'Branding settings retrieved successfully.', 200);
  } catch (error) {
    next(error);
  }
};

export const updateBranding = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const branding = await brandingService.updateBranding(userId, req.body);
    sendSuccess(res, { branding }, 'Branding settings saved successfully.', 200);
  } catch (error) {
    next(error);
  }
};
