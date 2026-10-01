import { Request, Response, NextFunction } from 'express';
import { analyticsService, AnalyticsFilterOptions } from '../services/analytics.service.js';

const parseFilterOptions = (req: Request): AnalyticsFilterOptions => {
  const range = (req.query.range as string) || (req.query.days ? `${req.query.days}d` : '7d');
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const granularity = req.query.granularity as 'daily' | 'weekly' | 'monthly' | undefined;

  return {
    range,
    startDate,
    endDate,
    granularity,
  };
};

export const getQrAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const qrId = req.params.id;
    const options = parseFilterOptions(req);

    const analytics = await analyticsService.getQrCodeAnalytics(userId, qrId, options);

    return res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

export const getOverviewAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const options = parseFilterOptions(req);

    const overview = await analyticsService.getOverviewAnalytics(userId, options);

    return res.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    next(error);
  }
};
