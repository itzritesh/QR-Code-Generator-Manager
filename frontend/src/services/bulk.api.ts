import { apiClient } from './api';
import { QrCode } from './qr.api';

export interface ValidatedBulkRow {
  rowNumber: number;
  name: string;
  type: 'URL' | 'TEXT' | 'WIFI' | 'PAYMENT';
  content: string;
  isDynamic: boolean;
  destinationUrl?: string;
  metadata: Record<string, any>;
}

export interface InvalidBulkRow {
  rowNumber: number;
  raw: Record<string, any>;
  errors: string[];
}

export interface BulkValidationResponse {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  validRows: ValidatedBulkRow[];
  invalidRows: InvalidBulkRow[];
}

export interface BulkGenerateResponse {
  createdCount: number;
  qrs: QrCode[];
  zipFilename: string;
  zipBase64: string;
}

export const bulkApi = {
  validateCsv: async (csvText: string): Promise<BulkValidationResponse> => {
    const res = await apiClient.post<{ success: boolean; data: BulkValidationResponse }>('/qr/bulk/validate', {
      csvText,
    });
    return res.data.data;
  },

  generateBulk: async (
    rows: ValidatedBulkRow[],
    format: 'png' | 'svg' = 'png',
    design?: Record<string, any>
  ): Promise<BulkGenerateResponse> => {
    const res = await apiClient.post<{ success: boolean; data: BulkGenerateResponse }>('/qr/bulk/generate', {
      rows,
      format,
      design,
    });
    return res.data.data;
  },

  downloadZipBlob: async (
    rows: ValidatedBulkRow[],
    format: 'png' | 'svg' = 'png',
    design?: Record<string, any>
  ): Promise<{ blob: Blob; filename: string }> => {
    const res = await apiClient.post('/qr/bulk/download-zip', { rows, format, design }, {
      responseType: 'blob',
    });
    const filename = `bulk-qr-codes-${Date.now()}.${format === 'svg' ? 'svg.zip' : 'zip'}`;
    return { blob: res.data, filename };
  },

  getTemplateUrl: (): string => {
    const base = apiClient.defaults.baseURL || '/api';
    return `${base}/qr/bulk/template`;
  },
};
