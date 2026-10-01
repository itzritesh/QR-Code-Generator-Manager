import { prisma } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

export interface AnalyticsFilterOptions {
  range?: string; // 'today' | '7d' | '30d' | '90d' | 'custom'
  startDate?: string;
  endDate?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
}

/**
 * Resolves filter boundaries based on range query parameter or custom dates
 */
export const resolveDateBoundaries = (options: AnalyticsFilterOptions) => {
  const now = new Date();
  let sinceDate: Date;
  let untilDate: Date = new Date();
  const range = (options.range || '7d').toLowerCase();

  switch (range) {
    case 'today': {
      sinceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      untilDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    }
    case '7d': {
      sinceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      sinceDate.setDate(sinceDate.getDate() - 6);
      break;
    }
    case '30d': {
      sinceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      sinceDate.setDate(sinceDate.getDate() - 29);
      break;
    }
    case '90d': {
      sinceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      sinceDate.setDate(sinceDate.getDate() - 89);
      break;
    }
    case 'custom': {
      if (options.startDate) {
        sinceDate = new Date(options.startDate);
        sinceDate.setHours(0, 0, 0, 0);
      } else {
        sinceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        sinceDate.setDate(sinceDate.getDate() - 6);
      }
      if (options.endDate) {
        untilDate = new Date(options.endDate);
        untilDate.setHours(23, 59, 59, 999);
      }
      break;
    }
    default: {
      const days = parseInt(range.replace('d', ''), 10) || 7;
      sinceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      sinceDate.setDate(sinceDate.getDate() - (days - 1));
    }
  }

  return { sinceDate, untilDate, range };
};

/**
 * Builds chronological timeline array with zero-fill for smooth continuous rendering
 */
const buildTimeline = (
  range: string,
  sinceDate: Date,
  untilDate: Date,
  scans: Array<{ scannedAt: Date }>
) => {
  if (range === 'today') {
    // 24 Hourly buckets
    const hourlyMap = new Map<number, number>();
    for (let h = 0; h < 24; h++) {
      hourlyMap.set(h, 0);
    }
    for (const s of scans) {
      const h = s.scannedAt.getHours();
      hourlyMap.set(h, (hourlyMap.get(h) || 0) + 1);
    }
    return Array.from(hourlyMap.entries()).map(([hour, count]) => {
      const label = `${String(hour).padStart(2, '0')}:00`;
      return {
        date: label,
        label,
        scans: count,
      };
    });
  }

  // Daily buckets for ranges <= 31 days
  let totalDays: number;
  if (range === '7d') totalDays = 7;
  else if (range === '30d') totalDays = 30;
  else if (range === '90d') totalDays = 90;
  else {
    const dayMs = 24 * 60 * 60 * 1000;
    const startMidnight = new Date(sinceDate.getFullYear(), sinceDate.getMonth(), sinceDate.getDate()).getTime();
    const endMidnight = new Date(untilDate.getFullYear(), untilDate.getMonth(), untilDate.getDate()).getTime();
    totalDays = Math.max(1, Math.min(90, Math.round((endMidnight - startMidnight) / dayMs) + 1));
  }
  const dailyMap = new Map<string, number>();

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(sinceDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    dailyMap.set(key, 0);
  }

  for (const s of scans) {
    const key = s.scannedAt.toISOString().split('T')[0];
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
    }
  }

  return Array.from(dailyMap.entries()).map(([dateStr, count]) => {
    const d = new Date(dateStr);
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return {
      date: dateStr,
      label,
      scans: count,
    };
  });
};

/**
 * Builds fixed 14-day daily scans series
 */
const buildDailySeries = (scans: Array<{ scannedAt: Date }>) => {
  const dailyMap = new Map<string, number>();
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dailyMap.set(key, 0);
  }

  for (const s of scans) {
    const key = s.scannedAt.toISOString().split('T')[0];
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
    }
  }

  return Array.from(dailyMap.entries()).map(([dateStr, count]) => {
    const d = new Date(dateStr);
    return {
      date: dateStr,
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      scans: count,
    };
  });
};

/**
 * Builds fixed 8-week weekly scans series
 */
const buildWeeklySeries = (scans: Array<{ scannedAt: Date }>) => {
  const weeklyMap = new Map<string, { label: string; scans: number }>();
  const now = new Date();

  // Create 8 weeks backward
  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (w * 7 + weekStart.getDay()));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const key = weekStart.toISOString().split('T')[0];
    const label = `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    weeklyMap.set(key, { label, scans: 0 });
  }

  const weekKeys = Array.from(weeklyMap.keys());
  for (const s of scans) {
    const sTime = s.scannedAt.getTime();
    for (let i = 0; i < weekKeys.length; i++) {
      const start = new Date(weekKeys[i]).getTime();
      const end = start + 7 * 24 * 60 * 60 * 1000;
      if (sTime >= start && sTime < end) {
        const item = weeklyMap.get(weekKeys[i]);
        if (item) item.scans += 1;
        break;
      }
    }
  }

  return Array.from(weeklyMap.entries()).map(([weekKey, val]) => ({
    week: weekKey,
    label: val.label,
    scans: val.scans,
  }));
};

/**
 * Builds fixed 6-month monthly scans series
 */
const buildMonthlySeries = (scans: Array<{ scannedAt: Date }>) => {
  const monthlyMap = new Map<string, { label: string; scans: number }>();
  const now = new Date();

  // 6 months backward
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    monthlyMap.set(key, { label, scans: 0 });
  }

  for (const s of scans) {
    const key = `${s.scannedAt.getFullYear()}-${String(s.scannedAt.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyMap.has(key)) {
      const item = monthlyMap.get(key);
      if (item) item.scans += 1;
    }
  }

  return Array.from(monthlyMap.entries()).map(([monthKey, val]) => ({
    month: monthKey,
    label: val.label,
    scans: val.scans,
  }));
};

export const analyticsService = {
  /**
   * Get comprehensive analytics for a specific QR Code with strict user ownership
   */
  getQrCodeAnalytics: async (userId: string, qrId: string, options: AnalyticsFilterOptions = {}) => {
    // 1. Verify ownership strictly
    const qr = await prisma.qrCode.findFirst({
      where: { id: qrId, userId },
      select: {
        id: true,
        name: true,
        type: true,
        isDynamic: true,
        shortCode: true,
        destinationUrl: true,
        content: true,
        status: true,
        scanCount: true,
        lastScannedAt: true,
        createdAt: true,
      },
    });

    if (!qr) {
      throw new AppError('QR code not found or access denied.', 404);
    }

    const { sinceDate, untilDate, range } = resolveDateBoundaries(options);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Date for 14-day daily / 8-week weekly / 6-month series
    const since14Days = new Date();
    since14Days.setDate(since14Days.getDate() - 14);
    const since8Weeks = new Date();
    since8Weeks.setDate(since8Weeks.getDate() - 56);
    const since6Months = new Date();
    since6Months.setMonth(since6Months.getMonth() - 6);

    // 2. Efficient parallel aggregations
    const [
      totalScans,
      uniqueVisitors,
      scansToday,
      scansThisWeek,
      scansThisMonth,
      latestScan,
      deviceBreakdown,
      browserBreakdown,
      osBreakdown,
      countryBreakdown,
      referrerBreakdown,
      scansInFilterRange,
      scansForDailySeries,
      scansForWeeklySeries,
      scansForMonthlySeries,
      recentScans,
    ] = await Promise.all([
      // Total scans for this QR
      prisma.qrScan.count({ where: { qrCodeId: qr.id } }),

      // Unique visitors (privacy-conscious distinct visitorId)
      prisma.qrScan.findMany({
        where: { qrCodeId: qr.id },
        distinct: ['visitorId'],
        select: { visitorId: true },
      }),

      // Scans Today
      prisma.qrScan.count({
        where: { qrCodeId: qr.id, scannedAt: { gte: startOfToday } },
      }),

      // Scans This Week
      prisma.qrScan.count({
        where: { qrCodeId: qr.id, scannedAt: { gte: startOfWeek } },
      }),

      // Scans This Month
      prisma.qrScan.count({
        where: { qrCodeId: qr.id, scannedAt: { gte: startOfMonth } },
      }),

      // Latest scan
      prisma.qrScan.findFirst({
        where: { qrCodeId: qr.id },
        orderBy: { scannedAt: 'desc' },
        select: {
          scannedAt: true,
          deviceType: true,
          browser: true,
          operatingSystem: true,
          country: true,
          referrer: true,
        },
      }),

      // Device Breakdown (filtered by date range)
      prisma.qrScan.groupBy({
        by: ['deviceType'],
        where: {
          qrCodeId: qr.id,
          scannedAt: { gte: sinceDate, lte: untilDate },
        },
        _count: true,
      }),

      // Browser Breakdown (filtered by date range)
      prisma.qrScan.groupBy({
        by: ['browser'],
        where: {
          qrCodeId: qr.id,
          scannedAt: { gte: sinceDate, lte: untilDate },
        },
        _count: true,
        orderBy: { _count: { browser: 'desc' } },
        take: 6,
      }),

      // OS Breakdown (filtered by date range)
      prisma.qrScan.groupBy({
        by: ['operatingSystem'],
        where: {
          qrCodeId: qr.id,
          scannedAt: { gte: sinceDate, lte: untilDate },
        },
        _count: true,
        orderBy: { _count: { operatingSystem: 'desc' } },
        take: 6,
      }),

      // Country Breakdown (filtered by date range)
      prisma.qrScan.groupBy({
        by: ['country'],
        where: {
          qrCodeId: qr.id,
          scannedAt: { gte: sinceDate, lte: untilDate },
        },
        _count: true,
        orderBy: { _count: { country: 'desc' } },
        take: 6,
      }),

      // Referrer Breakdown (filtered by date range)
      prisma.qrScan.groupBy({
        by: ['referrer'],
        where: {
          qrCodeId: qr.id,
          scannedAt: { gte: sinceDate, lte: untilDate },
        },
        _count: true,
        orderBy: { _count: { referrer: 'desc' } },
        take: 6,
      }),

      // Scans in active filter range (for dynamic timeline chart)
      prisma.qrScan.findMany({
        where: {
          qrCodeId: qr.id,
          scannedAt: { gte: sinceDate, lte: untilDate },
        },
        select: { scannedAt: true },
        orderBy: { scannedAt: 'asc' },
      }),

      // Scans for 14-day daily chart
      prisma.qrScan.findMany({
        where: { qrCodeId: qr.id, scannedAt: { gte: since14Days } },
        select: { scannedAt: true },
        orderBy: { scannedAt: 'asc' },
      }),

      // Scans for 8-week weekly chart
      prisma.qrScan.findMany({
        where: { qrCodeId: qr.id, scannedAt: { gte: since8Weeks } },
        select: { scannedAt: true },
        orderBy: { scannedAt: 'asc' },
      }),

      // Scans for 6-month monthly chart
      prisma.qrScan.findMany({
        where: { qrCodeId: qr.id, scannedAt: { gte: since6Months } },
        select: { scannedAt: true },
        orderBy: { scannedAt: 'asc' },
      }),

      // Recent 10 scans stream
      prisma.qrScan.findMany({
        where: { qrCodeId: qr.id },
        orderBy: { scannedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          scannedAt: true,
          deviceType: true,
          browser: true,
          operatingSystem: true,
          country: true,
          referrer: true,
        },
      }),
    ]);

    const filterScansTotal = scansInFilterRange.length;

    // 3. Build series
    const timeline = buildTimeline(range, sinceDate, untilDate, scansInFilterRange);
    const dailyScans = buildDailySeries(scansForDailySeries);
    const weeklyScans = buildWeeklySeries(scansForWeeklySeries);
    const monthlyScans = buildMonthlySeries(scansForMonthlySeries);

    return {
      qr,
      metrics: {
        totalQrs: 1,
        activeQrs: qr.status === 'ACTIVE' ? 1 : 0,
        totalScans,
        uniqueScans: uniqueVisitors.length,
        uniqueVisitors: uniqueVisitors.length,
        scansToday,
        scansThisWeek,
        scansThisMonth,
        latestScan: latestScan ? latestScan.scannedAt : null,
        latestScanDetails: latestScan || null,
        filterScansTotal,
      },
      charts: {
        timeline,
        dailyScans,
        weeklyScans,
        monthlyScans,
      },
      breakdowns: {
        devices: deviceBreakdown.map((d) => ({
          device: d.deviceType,
          count: d._count,
          percentage: filterScansTotal > 0 ? Math.round((d._count / filterScansTotal) * 100) : 0,
        })),
        browsers: browserBreakdown.map((b) => ({
          browser: b.browser,
          count: b._count,
          percentage: filterScansTotal > 0 ? Math.round((b._count / filterScansTotal) * 100) : 0,
        })),
        operatingSystems: osBreakdown.map((o) => ({
          os: o.operatingSystem,
          count: o._count,
          percentage: filterScansTotal > 0 ? Math.round((o._count / filterScansTotal) * 100) : 0,
        })),
        countries: countryBreakdown.map((c) => ({
          country: c.country,
          count: c._count,
          percentage: filterScansTotal > 0 ? Math.round((c._count / filterScansTotal) * 100) : 0,
        })),
        referrers: referrerBreakdown.map((r) => ({
          referrer: r.referrer || 'Direct / Camera',
          count: r._count,
          percentage: filterScansTotal > 0 ? Math.round((r._count / filterScansTotal) * 100) : 0,
        })),
      },
      timeline,
      recentScans,
      filter: {
        range,
        sinceDate: sinceDate.toISOString(),
        untilDate: untilDate.toISOString(),
      },
    };
  },

  /**
   * Get overview analytics across all QR codes owned by the user
   */
  getOverviewAnalytics: async (userId: string, options: AnalyticsFilterOptions = {}) => {
    const userQrs = await prisma.qrCode.findMany({
      where: { userId },
      select: { id: true, name: true, shortCode: true, type: true, status: true },
    });

    const qrIds = userQrs.map((q) => q.id);
    const totalQrs = userQrs.length;
    const activeQrs = userQrs.filter((q) => q.status === 'ACTIVE').length;

    const { sinceDate, untilDate, range } = resolveDateBoundaries(options);

    if (qrIds.length === 0) {
      return {
        metrics: {
          totalQrs: 0,
          activeQrs: 0,
          totalScans: 0,
          uniqueScans: 0,
          uniqueVisitors: 0,
          scansToday: 0,
          scansThisWeek: 0,
          scansThisMonth: 0,
          latestScan: null,
          latestScanDetails: null,
          filterScansTotal: 0,
        },
        charts: {
          timeline: [],
          dailyScans: [],
          weeklyScans: [],
          monthlyScans: [],
        },
        breakdowns: {
          devices: [],
          browsers: [],
          operatingSystems: [],
          countries: [],
          referrers: [],
        },
        timeline: [],
        recentScans: [],
        filter: {
          range,
          sinceDate: sinceDate.toISOString(),
          untilDate: untilDate.toISOString(),
        },
      };
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const since14Days = new Date();
    since14Days.setDate(since14Days.getDate() - 14);
    const since8Weeks = new Date();
    since8Weeks.setDate(since8Weeks.getDate() - 56);
    const since6Months = new Date();
    since6Months.setMonth(since6Months.getMonth() - 6);

    const [
      totalScans,
      uniqueVisitors,
      scansToday,
      scansThisWeek,
      scansThisMonth,
      latestScan,
      deviceBreakdown,
      browserBreakdown,
      osBreakdown,
      countryBreakdown,
      referrerBreakdown,
      scansInFilterRange,
      scansForDailySeries,
      scansForWeeklySeries,
      scansForMonthlySeries,
      recentScans,
    ] = await Promise.all([
      prisma.qrScan.count({ where: { qrCodeId: { in: qrIds } } }),
      prisma.qrScan.findMany({
        where: { qrCodeId: { in: qrIds } },
        distinct: ['visitorId'],
        select: { visitorId: true },
      }),
      prisma.qrScan.count({
        where: { qrCodeId: { in: qrIds }, scannedAt: { gte: startOfToday } },
      }),
      prisma.qrScan.count({
        where: { qrCodeId: { in: qrIds }, scannedAt: { gte: startOfWeek } },
      }),
      prisma.qrScan.count({
        where: { qrCodeId: { in: qrIds }, scannedAt: { gte: startOfMonth } },
      }),
      prisma.qrScan.findFirst({
        where: { qrCodeId: { in: qrIds } },
        orderBy: { scannedAt: 'desc' },
        select: {
          scannedAt: true,
          deviceType: true,
          browser: true,
          operatingSystem: true,
          country: true,
          referrer: true,
        },
      }),
      prisma.qrScan.groupBy({
        by: ['deviceType'],
        where: {
          qrCodeId: { in: qrIds },
          scannedAt: { gte: sinceDate, lte: untilDate },
        },
        _count: true,
      }),
      prisma.qrScan.groupBy({
        by: ['browser'],
        where: {
          qrCodeId: { in: qrIds },
          scannedAt: { gte: sinceDate, lte: untilDate },
        },
        _count: true,
        orderBy: { _count: { browser: 'desc' } },
        take: 6,
      }),
      prisma.qrScan.groupBy({
        by: ['operatingSystem'],
        where: {
          qrCodeId: { in: qrIds },
          scannedAt: { gte: sinceDate, lte: untilDate },
        },
        _count: true,
        orderBy: { _count: { operatingSystem: 'desc' } },
        take: 6,
      }),
      prisma.qrScan.groupBy({
        by: ['country'],
        where: {
          qrCodeId: { in: qrIds },
          scannedAt: { gte: sinceDate, lte: untilDate },
        },
        _count: true,
        orderBy: { _count: { country: 'desc' } },
        take: 6,
      }),
      prisma.qrScan.groupBy({
        by: ['referrer'],
        where: {
          qrCodeId: { in: qrIds },
          scannedAt: { gte: sinceDate, lte: untilDate },
        },
        _count: true,
        orderBy: { _count: { referrer: 'desc' } },
        take: 6,
      }),
      prisma.qrScan.findMany({
        where: {
          qrCodeId: { in: qrIds },
          scannedAt: { gte: sinceDate, lte: untilDate },
        },
        select: { scannedAt: true },
        orderBy: { scannedAt: 'asc' },
      }),
      prisma.qrScan.findMany({
        where: { qrCodeId: { in: qrIds }, scannedAt: { gte: since14Days } },
        select: { scannedAt: true },
        orderBy: { scannedAt: 'asc' },
      }),
      prisma.qrScan.findMany({
        where: { qrCodeId: { in: qrIds }, scannedAt: { gte: since8Weeks } },
        select: { scannedAt: true },
        orderBy: { scannedAt: 'asc' },
      }),
      prisma.qrScan.findMany({
        where: { qrCodeId: { in: qrIds }, scannedAt: { gte: since6Months } },
        select: { scannedAt: true },
        orderBy: { scannedAt: 'asc' },
      }),
      prisma.qrScan.findMany({
        where: { qrCodeId: { in: qrIds } },
        orderBy: { scannedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          qrCodeId: true,
          scannedAt: true,
          deviceType: true,
          browser: true,
          operatingSystem: true,
          country: true,
          referrer: true,
          qrCode: {
            select: { name: true, shortCode: true },
          },
        },
      }),
    ]);

    const filterScansTotal = scansInFilterRange.length;

    const timeline = buildTimeline(range, sinceDate, untilDate, scansInFilterRange);
    const dailyScans = buildDailySeries(scansForDailySeries);
    const weeklyScans = buildWeeklySeries(scansForWeeklySeries);
    const monthlyScans = buildMonthlySeries(scansForMonthlySeries);

    return {
      metrics: {
        totalQrs,
        activeQrs,
        totalScans,
        uniqueScans: uniqueVisitors.length,
        uniqueVisitors: uniqueVisitors.length,
        scansToday,
        scansThisWeek,
        scansThisMonth,
        latestScan: latestScan ? latestScan.scannedAt : null,
        latestScanDetails: latestScan || null,
        filterScansTotal,
      },
      charts: {
        timeline,
        dailyScans,
        weeklyScans,
        monthlyScans,
      },
      breakdowns: {
        devices: deviceBreakdown.map((d) => ({
          device: d.deviceType,
          count: d._count,
          percentage: filterScansTotal > 0 ? Math.round((d._count / filterScansTotal) * 100) : 0,
        })),
        browsers: browserBreakdown.map((b) => ({
          browser: b.browser,
          count: b._count,
          percentage: filterScansTotal > 0 ? Math.round((b._count / filterScansTotal) * 100) : 0,
        })),
        operatingSystems: osBreakdown.map((o) => ({
          os: o.operatingSystem,
          count: o._count,
          percentage: filterScansTotal > 0 ? Math.round((o._count / filterScansTotal) * 100) : 0,
        })),
        countries: countryBreakdown.map((c) => ({
          country: c.country,
          count: c._count,
          percentage: filterScansTotal > 0 ? Math.round((c._count / filterScansTotal) * 100) : 0,
        })),
        referrers: referrerBreakdown.map((r) => ({
          referrer: r.referrer || 'Direct / Camera',
          count: r._count,
          percentage: filterScansTotal > 0 ? Math.round((r._count / filterScansTotal) * 100) : 0,
        })),
      },
      timeline,
      recentScans,
      filter: {
        range,
        sinceDate: sinceDate.toISOString(),
        untilDate: untilDate.toISOString(),
      },
    };
  },
};
