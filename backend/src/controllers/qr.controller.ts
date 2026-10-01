import { Request, Response, NextFunction } from 'express';
import { qrService } from '../services/qr.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { generateQrPayload } from '../utils/qrPayload.js';

export const createQr = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const qrCode = await qrService.createQrCode(userId, req.body);
    sendSuccess(res, { qrCode }, 'QR code created and saved successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const listQrs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const sort = req.query.sort as any;

    const result = await qrService.getUserQrCodes(userId, {
      page,
      limit,
      type,
      status,
      search,
      sort,
    });
    sendSuccess(res, result, 'QR codes retrieved successfully.', 200);
  } catch (error) {
    next(error);
  }
};

export const getQr = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const qrCode = await qrService.getQrCodeById(userId, id);
    sendSuccess(res, { qrCode }, 'QR code details retrieved.', 200);
  } catch (error) {
    next(error);
  }
};

export const updateQr = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const updated = await qrService.updateQrCode(userId, id, req.body);
    sendSuccess(res, { qrCode: updated }, 'QR code updated successfully.', 200);
  } catch (error) {
    next(error);
  }
};

export const duplicateQr = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { name } = req.body || {};
    const duplicated = await qrService.duplicateQrCode(userId, id, name);
    sendSuccess(res, { qrCode: duplicated }, 'QR code duplicated successfully.', 201);
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { status } = req.body;
    const updated = await qrService.updateStatus(userId, id, status);
    sendSuccess(res, { qrCode: updated }, `QR code ${status.toLowerCase()} successfully.`, 200);
  } catch (error) {
    next(error);
  }
};

export const deleteQr = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const result = await qrService.deleteQrCode(userId, id);
    sendSuccess(res, result, result.message, 200);
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const metrics = await qrService.getDashboardMetrics(userId);
    sendSuccess(res, metrics, 'Dashboard metrics retrieved.', 200);
  } catch (error) {
    next(error);
  }
};

export const previewPayload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { type, metadata } = req.body;
    const payload = generateQrPayload(type, metadata);
    sendSuccess(res, { payload }, 'Payload generated successfully.', 200);
  } catch (error) {
    next(error);
  }
};
