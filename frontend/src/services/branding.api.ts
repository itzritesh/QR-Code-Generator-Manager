import { apiClient } from './api';

export interface BrandingSettings {
  companyName?: string;
  logo?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  defaultQrStyle?: 'square' | 'dots' | 'rounded' | 'classy';
  defaultQrSize?: number;
  defaultErrorCorrection?: 'L' | 'M' | 'Q' | 'H';
  defaultDownloadFormat?: 'png' | 'svg' | 'pdf' | 'jpg';
  defaultCta?: string;
  defaultFooter?: string;
}

export const brandingApi = {
  getBranding: async (): Promise<BrandingSettings> => {
    const res = await apiClient.get<{ success: boolean; data: { branding: BrandingSettings } }>('/branding');
    return res.data.data.branding;
  },

  updateBranding: async (data: Partial<BrandingSettings>): Promise<BrandingSettings> => {
    const res = await apiClient.put<{ success: boolean; data: { branding: BrandingSettings } }>('/branding', data);
    return res.data.data.branding;
  },
};
