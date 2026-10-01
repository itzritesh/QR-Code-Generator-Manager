import { prisma } from '../config/db.js';
import { env, getDynamicQrBaseUrl } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateQrPayload } from '../utils/qrPayload.js';
import { generateUniqueShortCode, validateDestinationUrl } from '../utils/dynamicQr.utils.js';
import { metricsCache, dynamicQrCache } from '../utils/cache.utils.js';
import { QrType, QrStatus } from '@prisma/client';

export interface CreateQrData {
  name: string;
  type: 'URL' | 'TEXT' | 'WIFI' | 'PAYMENT';
  isDynamic?: boolean;
  destinationUrl?: string;
  metadata: {
    url?: string;
    text?: string;
    wifi?: any;
    payment?: any;
  };
  design?: Record<string, any>;
}

export interface UpdateQrData {
  name?: string;
  status?: 'ACTIVE' | 'DISABLED';
  isDynamic?: boolean;
  destinationUrl?: string;
  metadata?: {
    url?: string;
    text?: string;
    wifi?: any;
    payment?: any;
  };
  design?: Record<string, any>;
}

export interface ListQrQueryOptions {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'name' | 'most_scanned' | 'least_scanned' | 'scans';
}

export const qrService = {
  /**
   * Create a new QR code for the authenticated user
   */
  createQrCode: async (userId: string, data: CreateQrData) => {
    const isDynamic = Boolean(data.isDynamic);
    let content: string;
    let shortCode: string | null = null;
    let destinationUrl: string | null = null;

    if (isDynamic) {
      const rawTarget = (data.destinationUrl || data.metadata?.url || '').trim();
      const validation = validateDestinationUrl(rawTarget);
      if (!validation.isValid || !validation.normalizedUrl) {
        throw new AppError(validation.error || 'A valid destination URL is required for dynamic QR codes.', 400);
      }
      destinationUrl = validation.normalizedUrl;
      shortCode = await generateUniqueShortCode(prisma, 7);
      content = `${getDynamicQrBaseUrl()}/q/${shortCode}`;
    } else {
      content = generateQrPayload(data.type, data.metadata);
    }

    const qrCode = await prisma.qrCode.create({
      data: {
        userId,
        name: data.name.trim(),
        type: data.type as QrType,
        content,
        isDynamic,
        destinationUrl,
        status: QrStatus.ACTIVE,
        scanCount: 0,
        shortCode,
        metadata: data.metadata,
        design: data.design || {
          fgColor: '#000000',
          bgColor: '#ffffff',
          errorCorrection: 'M',
          margin: 2,
        },
      },
    });

    metricsCache.del(`dashboard_${userId}`);
    return qrCode;
  },

  /**
   * Get all QR codes belonging strictly to the authenticated user with search, filtering, and sorting
   */
  getUserQrCodes: async (userId: string, options?: ListQrQueryOptions) => {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = { userId };

    // Filter by QR type
    if (options?.type && ['URL', 'TEXT', 'WIFI', 'PAYMENT'].includes(options.type.toUpperCase())) {
      where.type = options.type.toUpperCase() as QrType;
    }

    // Filter by Status
    if (options?.status && ['ACTIVE', 'DISABLED'].includes(options.status.toUpperCase())) {
      where.status = options.status.toUpperCase() as QrStatus;
    }

    // Search by Name or Content
    if (options?.search && options.search.trim()) {
      const searchTerm = options.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { content: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Sorting
    let orderBy: any = { createdAt: 'desc' }; // default: newest
    if (options?.sort) {
      switch (options.sort) {
        case 'oldest':
          orderBy = { createdAt: 'asc' };
          break;
        case 'name':
          orderBy = { name: 'asc' };
          break;
        case 'scans':
        case 'most_scanned':
          orderBy = { scanCount: 'desc' };
          break;
        case 'least_scanned':
          orderBy = { scanCount: 'asc' };
          break;
        case 'newest':
        default:
          orderBy = { createdAt: 'desc' };
          break;
      }
    }

    const [items, total] = await Promise.all([
      prisma.qrCode.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.qrCode.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get a single QR code by ID, strictly verifying ownership
   */
  getQrCodeById: async (userId: string, id: string) => {
    const qrCode = await prisma.qrCode.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!qrCode) {
      throw new AppError('QR code not found or access denied.', 404);
    }

    return qrCode;
  },

  /**
   * Update a QR code, strictly verifying ownership
   */
  updateQrCode: async (userId: string, id: string, data: UpdateQrData) => {
    const existing = await qrService.getQrCodeById(userId, id);

    let content = existing.content;
    let destinationUrl = existing.destinationUrl;
    let shortCode = existing.shortCode;
    const isDynamic = data.isDynamic !== undefined ? Boolean(data.isDynamic) : existing.isDynamic;

    const mergedMetadata = {
      ...(existing.metadata as Record<string, any>),
      ...(data.metadata || {}),
    };

    if (isDynamic) {
      const targetUrl = (data.destinationUrl || data.metadata?.url || existing.destinationUrl || '').trim();
      if (targetUrl) {
        const validation = validateDestinationUrl(targetUrl);
        if (!validation.isValid || !validation.normalizedUrl) {
          throw new AppError(validation.error || 'Invalid destination URL for dynamic QR code.', 400);
        }
        destinationUrl = validation.normalizedUrl;
        mergedMetadata.url = validation.normalizedUrl;
      }

      // Ensure shortCode exists
      if (!shortCode) {
        shortCode = await generateUniqueShortCode(prisma, 7);
        content = `${getDynamicQrBaseUrl()}/q/${shortCode}`;
      } else {
        // Keep content unchanged so already printed QR code continues pointing to the same shortCode!
        content = `${getDynamicQrBaseUrl()}/q/${shortCode}`;
      }
    } else {
      // Static QR Code: recompute payload directly into content
      if (data.metadata) {
        content = generateQrPayload(existing.type as any, mergedMetadata);
      }
    }

    const updated = await prisma.qrCode.update({
      where: { id: existing.id },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.status && { status: data.status as QrStatus }),
        isDynamic,
        destinationUrl,
        shortCode,
        content,
        metadata: mergedMetadata,
        ...(data.design && {
          design: {
            ...(existing.design as Record<string, any>),
            ...data.design,
          },
        }),
      },
    });

    if (existing.shortCode) dynamicQrCache.del(existing.shortCode);
    if (shortCode && shortCode !== existing.shortCode) dynamicQrCache.del(shortCode);
    metricsCache.del(`dashboard_${userId}`);

    return updated;
  },

  /**
   * Duplicate a QR code for the user without copying scan history
   */
  duplicateQrCode: async (userId: string, id: string, customName?: string) => {
    const original = await qrService.getQrCodeById(userId, id);
    let shortCode: string | null = null;
    let content = original.content;

    if (original.isDynamic) {
      shortCode = await generateUniqueShortCode(prisma, 7);
      content = `${getDynamicQrBaseUrl()}/q/${shortCode}`;
    }

    const duplicated = await prisma.qrCode.create({
      data: {
        userId,
        name: customName && customName.trim() ? customName.trim() : `${original.name} (Copy)`,
        type: original.type,
        content,
        isDynamic: original.isDynamic,
        destinationUrl: original.destinationUrl,
        status: original.status,
        scanCount: 0, // Reset scan count strictly
        lastScannedAt: null,
        shortCode,
        metadata: original.metadata as any,
        design: original.design as any,
      },
    });

    metricsCache.del(`dashboard_${userId}`);
    return duplicated;
  },

  /**
   * Toggle or set status (ACTIVE / DISABLED) with strict ownership
   */
  updateStatus: async (userId: string, id: string, status: 'ACTIVE' | 'DISABLED') => {
    const existing = await qrService.getQrCodeById(userId, id);

    const updated = await prisma.qrCode.update({
      where: { id: existing.id },
      data: { status: status as QrStatus },
    });

    if (existing.shortCode) dynamicQrCache.del(existing.shortCode);
    metricsCache.del(`dashboard_${userId}`);

    return updated;
  },

  /**
   * Delete a QR code, strictly verifying ownership
   */
  deleteQrCode: async (userId: string, id: string) => {
    const existing = await qrService.getQrCodeById(userId, id);

    await prisma.qrCode.delete({
      where: { id: existing.id },
    });

    if (existing.shortCode) dynamicQrCache.del(existing.shortCode);
    metricsCache.del(`dashboard_${userId}`);

    return { message: 'QR code deleted successfully.' };
  },

  /**
   * Get authentic dashboard metrics directly from PostgreSQL/Neon
   */
  getDashboardMetrics: async (userId: string) => {
    const cacheKey = `dashboard_${userId}`;
    const cached = metricsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const [totalQrs, activeQrs, disabledQrs, scanAgg, recentQrs, typeBreakdown] = await Promise.all([
      prisma.qrCode.count({ where: { userId } }),
      prisma.qrCode.count({ where: { userId, status: QrStatus.ACTIVE } }),
      prisma.qrCode.count({ where: { userId, status: QrStatus.DISABLED } }),
      prisma.qrCode.aggregate({
        where: { userId },
        _sum: { scanCount: true },
      }),
      prisma.qrCode.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.qrCode.groupBy({
        by: ['type'],
        where: { userId },
        _count: true,
      }),
    ]);

    const totalScans = scanAgg._sum.scanCount || 0;

    const result = {
      totalQrs,
      activeQrs,
      disabledQrs,
      totalScans,
      recentQrs,
      typeBreakdown: typeBreakdown.map((t) => ({
        type: t.type,
        count: t._count,
      })),
    };

    metricsCache.set(cacheKey, result, 15000);
    return result;
  },
};
