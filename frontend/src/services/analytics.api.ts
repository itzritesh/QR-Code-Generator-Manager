import { apiClient } from './api';
import { QrCode } from './qr.api';

export interface ScanEvent {
  id: string;
  qrCodeId?: string;
  scannedAt: string;
  deviceType: string;
  browser: string;
  operatingSystem: string;
  country: string;
  referrer: string;
  qrCode?: {
    name: string;
    shortCode?: string | null;
  };
}

export interface DeviceBreakdownItem {
  device: string;
  count: number;
  percentage: number;
}

export interface BrowserBreakdownItem {
  browser: string;
  count: number;
  percentage: number;
}

export interface OsBreakdownItem {
  os: string;
  count: number;
  percentage: number;
}

export interface CountryBreakdownItem {
  country: string;
  count: number;
  percentage: number;
}

export interface ReferrerBreakdownItem {
  referrer: string;
  count: number;
  percentage: number;
}

export interface AnalyticsMetrics {
  totalQrs: number;
  activeQrs: number;
  totalScans: number;
  uniqueScans: number;
  uniqueVisitors: number;
  scansToday: number;
  scansThisWeek: number;
  scansThisMonth: number;
  latestScan: string | null;
  latestScanDetails?: Partial<ScanEvent> | null;
  filterScansTotal: number;
}

export interface ChartPoint {
  date?: string;
  week?: string;
  month?: string;
  label: string;
  scans: number;
}

export interface AnalyticsCharts {
  timeline: ChartPoint[];
  dailyScans: ChartPoint[];
  weeklyScans: ChartPoint[];
  monthlyScans: ChartPoint[];
}

export interface AnalyticsFilterParams {
  range?: string; // 'today' | '7d' | '30d' | '90d' | 'custom'
  startDate?: string;
  endDate?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
  days?: number;
}

export interface AnalyticsOverviewData {
  metrics: AnalyticsMetrics;
  charts: AnalyticsCharts;
  breakdowns: {
    devices: DeviceBreakdownItem[];
    browsers: BrowserBreakdownItem[];
    operatingSystems: OsBreakdownItem[];
    countries: CountryBreakdownItem[];
    referrers: ReferrerBreakdownItem[];
  };
  timeline: ChartPoint[];
  recentScans: ScanEvent[];
  filter: {
    range: string;
    sinceDate: string;
    untilDate: string;
  };
}

export interface QrAnalyticsData extends AnalyticsOverviewData {
  qr: QrCode;
}

export const analyticsApi = {
  getOverview: async (params?: AnalyticsFilterParams): Promise<AnalyticsOverviewData> => {
    const res = await apiClient.get<{ success: boolean; data: AnalyticsOverviewData }>('/analytics/overview', {
      params,
    });
    return res.data.data;
  },

  getQrAnalytics: async (qrId: string, params?: AnalyticsFilterParams): Promise<QrAnalyticsData> => {
    const res = await apiClient.get<{ success: boolean; data: QrAnalyticsData }>(`/qr/${qrId}/analytics`, {
      params,
    });
    return res.data.data;
  },
};
