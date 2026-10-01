import QRCode from 'qrcode';
import JSZip from 'jszip';
import { prisma } from '../config/db.js';
import { env, getDynamicQrBaseUrl } from '../config/env.js';
import { generateUniqueShortCode } from '../utils/dynamicQr.utils.js';
import {
  validateBulkCsv,
  BulkValidationResult,
  ValidatedBulkRow,
  getSampleCsvTemplate,
} from '../utils/csvParser.utils.js';
import { AppError } from '../middleware/errorHandler.js';

export interface BulkGenerateOptions {
  format?: 'png' | 'svg';
  design?: Record<string, any>;
}

export const bulkQrService = {
  /**
   * Validates uploaded CSV content and returns structured preview
   */
  validateCsv: (csvContent: string): BulkValidationResult => {
    return validateBulkCsv(csvContent);
  },

  /**
   * Generates sample CSV template string
   */
  getSampleTemplate: (): string => {
    return getSampleCsvTemplate();
  },

  /**
   * Batch creates QR codes in PostgreSQL and compiles downloadable ZIP
   */
  generateBatch: async (
    userId: string,
    rows: ValidatedBulkRow[],
    options: BulkGenerateOptions = {}
  ) => {
    if (!rows || rows.length === 0) {
      throw new AppError('No valid rows provided for batch QR generation.', 400);
    }

    if (rows.length > 100) {
      throw new AppError('Batch size exceeds maximum limit of 100 QR codes.', 400);
    }

    const format = options.format === 'svg' ? 'svg' : 'png';
    const baseDesign = options.design || {};

    const createdQrs = [];
    const zip = new JSZip();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let content = row.content;
      let shortCode: string | null = null;
      let destinationUrl = row.destinationUrl;

      // Dynamic QR Code setup
      if (row.isDynamic) {
        shortCode = await generateUniqueShortCode(prisma, 7);
        content = `${getDynamicQrBaseUrl()}/q/${shortCode}`;
        destinationUrl = row.destinationUrl || row.content;
      }

      // 1. Create QR record in PostgreSQL
      const qrRecord = await prisma.qrCode.create({
        data: {
          userId,
          name: row.name,
          type: row.type as any,
          content,
          isDynamic: row.isDynamic,
          destinationUrl,
          status: 'ACTIVE',
          scanCount: 0,
          lastScannedAt: null,
          shortCode,
          metadata: row.metadata as any,
          design: baseDesign as any,
        },
      });

      createdQrs.push(qrRecord);

      // 2. Generate Image for ZIP archive
      const sanitizedName = row.name
        .replace(/[^a-zA-Z0-9_\-\s]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .slice(0, 40) || `qr_${i + 1}`;

      const filename = `${String(i + 1).padStart(3, '0')}_${sanitizedName}.${format}`;

      if (format === 'svg') {
        const svgString = await QRCode.toString(content, {
          type: 'svg',
          margin: 2,
          errorCorrectionLevel: 'M',
        });
        zip.file(filename, svgString);
      } else {
        const pngBuffer = await QRCode.toBuffer(content, {
          type: 'png',
          width: 1024,
          margin: 2,
          errorCorrectionLevel: 'M',
        });
        zip.file(filename, pngBuffer);
      }
    }

    // Add a README metadata text inside the ZIP
    const manifest = [
      '# Batch QR Codes Generation Manifest',
      `Generated: ${new Date().toISOString()}`,
      `Total Codes: ${createdQrs.length}`,
      `Format: ${format.toUpperCase()}`,
      '',
      '## Generated Codes:',
      ...createdQrs.map((q, idx) => `${idx + 1}. ${q.name} [Type: ${q.type}, Dynamic: ${q.isDynamic ? 'Yes (/q/' + q.shortCode + ')' : 'No'}]`),
    ].join('\n');

    zip.file('README.txt', manifest);

    // 3. Compile ZIP buffer
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const zipFilename = `bulk-qr-codes-${Date.now()}.${format === 'svg' ? 'svg.zip' : 'zip'}`;

    return {
      createdCount: createdQrs.length,
      qrs: createdQrs,
      zipBuffer,
      zipBase64: zipBuffer.toString('base64'),
      zipFilename,
    };
  },
};
