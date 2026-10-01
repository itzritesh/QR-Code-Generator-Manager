import { Request, Response, NextFunction } from 'express';
import { bulkQrService } from '../services/bulkQr.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../middleware/errorHandler.js';

export const validateCsv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const csvContent = (req.body.csvContent || req.body.csvText || req.body.csv || '').toString();

    if (!csvContent || !csvContent.trim()) {
      throw new AppError('No CSV content provided. Please upload or paste a CSV string.', 400);
    }

    const result = bulkQrService.validateCsv(csvContent);
    sendSuccess(res, result, 'CSV parsed and validated successfully.', 200);
  } catch (error) {
    next(error);
  }
};

export const generateBulk = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { rows, format, design } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      throw new AppError('No rows provided for batch generation.', 400);
    }

    const result = await bulkQrService.generateBatch(userId, rows, {
      format: format === 'svg' ? 'svg' : 'png',
      design,
    });

    sendSuccess(
      res,
      {
        createdCount: result.createdCount,
        qrs: result.qrs,
        qrCodes: result.qrs,
        zipFilename: result.zipFilename,
        zipBase64: result.zipBase64,
      },
      `Successfully generated ${result.createdCount} QR codes and compiled ZIP package.`,
      201
    );
  } catch (error) {
    next(error);
  }
};

export const downloadZipDirect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { rows, format, design } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      throw new AppError('No rows provided for ZIP download.', 400);
    }

    const result = await bulkQrService.generateBatch(userId, rows, {
      format: format === 'svg' ? 'svg' : 'png',
      design,
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${result.zipFilename}"`);
    res.setHeader('Content-Length', result.zipBuffer.length);
    res.end(result.zipBuffer);
  } catch (error) {
    next(error);
  }
};

export const getTemplate = async (_req: Request, res: Response): Promise<void> => {
  const csv = bulkQrService.getSampleTemplate();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="bulk_qr_template.csv"');
  res.send(csv);
};
