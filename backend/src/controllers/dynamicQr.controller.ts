import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db.js';
import { QrStatus } from '@prisma/client';
import {
  validateDestinationUrl,
  renderInactiveQrHtml,
  renderNotFoundQrHtml,
} from '../utils/dynamicQr.utils.js';
import { extractScanMetadata } from '../utils/scanTracker.utils.js';
import { dynamicQrCache } from '../utils/cache.utils.js';
import { logger } from '../utils/logger.js';

/**
 * Public Dynamic QR Redirection Handler
 * Route: GET /q/:shortCode
 */
export const handleDynamicScan = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { shortCode } = req.params;

    if (!shortCode || typeof shortCode !== 'string' || shortCode.length > 32) {
      return res.status(404).send(renderNotFoundQrHtml());
    }

    const cleanShortCode = shortCode.trim();

    // Check memory cache first to handle traffic spikes with zero DB latency
    let qr = dynamicQrCache.get(cleanShortCode);

    if (!qr) {
      // Lookup QR by unique shortCode from database
      const dbQr = await prisma.qrCode.findUnique({
        where: { shortCode: cleanShortCode },
        select: {
          id: true,
          name: true,
          type: true,
          content: true,
          destinationUrl: true,
          isDynamic: true,
          status: true,
          scanCount: true,
        },
      });

      if (dbQr) {
        qr = dbQr;
        dynamicQrCache.set(cleanShortCode, dbQr, 60000);
      }
    }

    // 1. Not Found / Deleted
    if (!qr) {
      logger.info(`[Dynamic QR] Scan 404: shortCode "${shortCode}" not found.`);
      return res.status(404).send(renderNotFoundQrHtml());
    }

    // 2. Disabled / Paused
    if (qr.status === QrStatus.DISABLED) {
      logger.info(`[Dynamic QR] Scan blocked: QR "${qr.name}" (${shortCode}) is DISABLED.`);
      return res.status(403).send(renderInactiveQrHtml(qr.name));
    }

    // 3. Process Scan: extract client metadata and record scan event in database
    const meta = extractScanMetadata(req);

    await prisma.$transaction([
      prisma.qrScan.create({
        data: {
          qrCodeId: qr.id,
          deviceType: meta.deviceType,
          browser: meta.browser,
          operatingSystem: meta.operatingSystem,
          country: meta.country,
          referrer: meta.referrer,
          visitorId: meta.visitorId,
        },
      }),
      prisma.qrCode.update({
        where: { id: qr.id },
        data: {
          scanCount: { increment: 1 },
          lastScannedAt: new Date(),
        },
      }),
    ]);

    logger.info(`[Dynamic QR] Scan recorded for "${qr.name}" (${shortCode}) [Device: ${meta.deviceType}, OS: ${meta.operatingSystem}, Browser: ${meta.browser}]`);

    // 4. Validate Destination URL to prevent open redirects or dangerous protocols
    const targetUrl = qr.destinationUrl || qr.content;
    const validation = validateDestinationUrl(targetUrl);

    if (!validation.isValid || !validation.normalizedUrl) {
      logger.warn(`[Dynamic QR] Invalid destination for "${qr.name}": ${targetUrl}`);
      return res.status(400).send(renderNotFoundQrHtml());
    }

    // 5. Safe HTTP 302 Redirection
    return res.redirect(302, validation.normalizedUrl);
  } catch (error) {
    logger.error('[Dynamic QR] Error processing dynamic scan:', error);
    next(error);
  }
};

/**
 * Public JSON Info Endpoint for Dynamic QR
 * Route: GET /q/:shortCode/info or GET /api/q/:shortCode/info
 */
export const getDynamicQrInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { shortCode } = req.params;

    const qr = await prisma.qrCode.findUnique({
      where: { shortCode },
      select: {
        id: true,
        name: true,
        type: true,
        isDynamic: true,
        status: true,
        destinationUrl: true,
        shortCode: true,
        scanCount: true,
        lastScannedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!qr) {
      return res.status(404).json({
        success: false,
        error: { message: 'QR code not found or invalid shortCode.' },
      });
    }

    return res.json({
      success: true,
      data: { qrCode: qr },
    });
  } catch (error) {
    next(error);
  }
};
