import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

export interface BrandingSettings {
  companyName?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  defaultQrStyle?: 'dots' | 'squares' | 'rounded' | 'classy';
  defaultQrSize?: number;
  defaultErrorCorrection?: 'L' | 'M' | 'Q' | 'H';
  defaultDownloadFormat?: 'png' | 'svg' | 'pdf' | 'jpg';
  defaultCta?: string;
  defaultFooter?: string;
}

const DEFAULT_BRANDING: BrandingSettings = {
  companyName: '',
  logo: '',
  primaryColor: '#0f172a',
  secondaryColor: '#4f46e5',
  defaultQrStyle: 'squares',
  defaultQrSize: 512,
  defaultErrorCorrection: 'M',
  defaultDownloadFormat: 'png',
  defaultCta: 'Scan with your camera',
  defaultFooter: '',
};

export const brandingService = {
  /**
   * Get custom branding settings for authenticated user
   */
  getBranding: async (userId: string): Promise<BrandingSettings> => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { branding: true },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    return {
      ...DEFAULT_BRANDING,
      ...((user.branding as Record<string, any>) || {}),
    };
  },

  /**
   * Update custom branding settings for authenticated user
   */
  updateBranding: async (userId: string, data: Partial<BrandingSettings>): Promise<BrandingSettings> => {
    // Validate hex colors if provided
    const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    if (data.primaryColor && !hexColorRegex.test(data.primaryColor)) {
      throw new AppError('Invalid primary color format. Must be a valid hex color code (e.g. #4f46e5).', 400);
    }
    if (data.secondaryColor && !hexColorRegex.test(data.secondaryColor)) {
      throw new AppError('Invalid secondary color format. Must be a valid hex color code (e.g. #06b6d4).', 400);
    }

    // Validate and sanitize logo if provided
    if (data.logo && data.logo.trim() !== '') {
      const trimmedLogo = data.logo.trim();
      if (trimmedLogo.length > 3500000) {
        throw new AppError('Logo image file exceeds maximum allowed size (2MB limit).', 400);
      }
      const match = trimmedLogo.match(/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,([A-Za-z0-9+/=]+)$/);
      if (!match) {
        throw new AppError('Invalid logo format. Must be a valid PNG, JPG, WebP, or SVG Data URL.', 400);
      }
      if (trimmedLogo.startsWith('data:image/svg+xml')) {
        try {
          const decoded = Buffer.from(match[2], 'base64').toString('utf-8');
          if (
            /<script/i.test(decoded) ||
            /onload=/i.test(decoded) ||
            /onerror=/i.test(decoded) ||
            /onclick=/i.test(decoded) ||
            /javascript:/i.test(decoded)
          ) {
            throw new AppError('SVG image contains prohibited script or executable content.', 400);
          }
        } catch (e: any) {
          throw new AppError(e.message || 'Malformed SVG image data.', 400);
        }
      }
    }

    // Sanitize string lengths and types
    const sanitized: BrandingSettings = {
      ...(data.companyName !== undefined && { companyName: data.companyName.trim().slice(0, 100) }),
      ...(data.logo !== undefined && { logo: data.logo }),
      ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
      ...(data.secondaryColor !== undefined && { secondaryColor: data.secondaryColor }),
      ...(data.defaultQrStyle !== undefined && { defaultQrStyle: data.defaultQrStyle }),
      ...(data.defaultQrSize !== undefined && { defaultQrSize: Number(data.defaultQrSize) || 512 }),
      ...(data.defaultErrorCorrection !== undefined && { defaultErrorCorrection: data.defaultErrorCorrection }),
      ...(data.defaultDownloadFormat !== undefined && { defaultDownloadFormat: data.defaultDownloadFormat }),
      ...(data.defaultCta !== undefined && { defaultCta: data.defaultCta.trim().slice(0, 80) }),
      ...(data.defaultFooter !== undefined && { defaultFooter: data.defaultFooter.trim().slice(0, 80) }),
    };

    const current = await brandingService.getBranding(userId);
    const merged = { ...current, ...sanitized };

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        branding: merged as any,
      },
      select: { branding: true },
    });

    return (updatedUser.branding as BrandingSettings) || merged;
  },
};
