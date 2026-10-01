import { apiClient } from './api';

export type QrType = 'URL' | 'TEXT' | 'WIFI' | 'PAYMENT';
export type QrStatus = 'ACTIVE' | 'DISABLED';

export interface WifiMetadata {
  ssid: string;
  password?: string;
  security: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}

export interface PaymentMetadata {
  upiId?: string;
  payeeName?: string;
  amount?: number | string;
  currency?: string;
  note?: string;
  paymentUrl?: string;
}

export interface QrMetadata {
  url?: string;
  text?: string;
  wifi?: WifiMetadata;
  payment?: PaymentMetadata;
}

export interface QrCode {
  id: string;
  userId: string;
  name: string;
  type: QrType;
  content: string;
  isDynamic: boolean;
  destinationUrl?: string | null;
  status: QrStatus;
  scanCount: number;
  shortCode?: string | null;
  lastScannedAt?: string | null;
  metadata?: QrMetadata | null;
  design?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQrPayload {
  name: string;
  type: QrType;
  isDynamic?: boolean;
  destinationUrl?: string;
  metadata: QrMetadata;
  design?: Record<string, any>;
}

export interface UpdateQrPayload {
  name?: string;
  status?: QrStatus;
  isDynamic?: boolean;
  destinationUrl?: string;
  metadata?: QrMetadata;
  design?: Record<string, any>;
}

export interface ListQrParams {
  page?: number;
  limit?: number;
  type?: QrType | string;
  status?: QrStatus | string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'name' | 'most_scanned' | 'least_scanned';
}

export interface QrListResponse {
  items: QrCode[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardMetrics {
  totalQrs: number;
  activeQrs: number;
  disabledQrs: number;
  totalScans: number;
  recentQrs: QrCode[];
  typeBreakdown: Array<{ type: QrType; count: number }>;
}

export const qrApi = {
  createQr: async (payload: CreateQrPayload): Promise<QrCode> => {
    const response = await apiClient.post<{ success: boolean; data: { qrCode: QrCode } }>('/qr', payload);
    return response.data.data.qrCode;
  },

  listQrs: async (params?: ListQrParams): Promise<QrListResponse> => {
    const response = await apiClient.get<{ success: boolean; data: QrListResponse }>('/qr', { params });
    return response.data.data;
  },

  getQr: async (id: string): Promise<QrCode> => {
    const response = await apiClient.get<{ success: boolean; data: { qrCode: QrCode } }>(`/qr/${id}`);
    return response.data.data.qrCode;
  },

  updateQr: async (id: string, payload: UpdateQrPayload): Promise<QrCode> => {
    const response = await apiClient.put<{ success: boolean; data: { qrCode: QrCode } }>(`/qr/${id}`, payload);
    return response.data.data.qrCode;
  },

  duplicateQr: async (id: string, name?: string): Promise<QrCode> => {
    const response = await apiClient.post<{ success: boolean; data: { qrCode: QrCode } }>(`/qr/${id}/duplicate`, { name });
    return response.data.data.qrCode;
  },

  updateStatus: async (id: string, status: QrStatus): Promise<QrCode> => {
    const response = await apiClient.patch<{ success: boolean; data: { qrCode: QrCode } }>(`/qr/${id}/status`, { status });
    return response.data.data.qrCode;
  },

  deleteQr: async (id: string): Promise<void> => {
    await apiClient.delete(`/qr/${id}`);
  },

  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    const response = await apiClient.get<{ success: boolean; data: DashboardMetrics }>('/qr/dashboard/metrics');
    return response.data.data;
  },
};
