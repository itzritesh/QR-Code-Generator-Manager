import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  HiOutlineCursorClick,
  HiOutlineDeviceMobile,
  HiOutlineDownload,
  HiOutlineRefresh,
  HiOutlineCalendar,
  HiOutlineExternalLink,
  HiOutlinePencilAlt,
  HiOutlineGlobe,
} from 'react-icons/hi';
import { Card, CardHeader, CardTitle, CardBody, CardDescription } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  analyticsApi,
  AnalyticsOverviewData,
  AnalyticsFilterParams,
  ChartPoint,
} from '../../services/analytics.api';
import { qrApi, QrCode } from '../../services/qr.api';
import { QrThumbnail } from '../../components/common/QrThumbnail';
import { useToast } from '../../components/ui/ToastContext';

type PeriodicTab = 'timeline' | 'daily' | 'weekly' | 'monthly';

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedQrId = searchParams.get('qrId') || '';
  const toast = useToast();

  // Filter states
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [periodicTab, setPeriodicTab] = useState<PeriodicTab>('timeline');

  // Loading & error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // User's QR codes list for filtering
  const [qrList, setQrList] = useState<QrCode[]>([]);

  // Analytics data
  const [analyticsData, setAnalyticsData] = useState<AnalyticsOverviewData | null>(null);
  const [currentQr, setCurrentQr] = useState<QrCode | null>(null);

  const filterOptions = [
    { id: 'today', label: 'Today' },
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '90 Days' },
    { id: 'custom', label: 'Custom Range' },
  ];

  // Fetch list of user's QR codes for dropdown selector
  useEffect(() => {
    qrApi
      .listQrs({ limit: 100 })
      .then((res) => {
        setQrList(res.items);
      })
      .catch((err) => {
        console.error('Failed to load QR list for analytics filter:', err);
      });
  }, []);

  // Fetch real analytics from backend
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params: AnalyticsFilterParams = {
      range: timeRange,
    };

    if (timeRange === 'custom') {
      if (customStartDate) params.startDate = customStartDate;
      if (customEndDate) params.endDate = customEndDate;
    }

    try {
      if (selectedQrId) {
        const data = await analyticsApi.getQrAnalytics(selectedQrId, params);
        setAnalyticsData(data);
        setCurrentQr(data.qr);
      } else {
        const data = await analyticsApi.getOverview(params);
        setAnalyticsData(data);
        setCurrentQr(null);
      }
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err?.response?.data?.message || err.message || 'Failed to load analytics data.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedQrId, timeRange, customStartDate, customEndDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleQrSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      setSearchParams({ qrId: val });
    } else {
      setSearchParams({});
    }
  };

  const handleTimeRangeChange = (rangeId: string) => {
    setTimeRange(rangeId);
    if (rangeId === 'custom') {
      if (!customStartDate || !customEndDate) {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 14);
        setCustomEndDate(end.toISOString().split('T')[0]);
        setCustomStartDate(start.toISOString().split('T')[0]);
      }
    }
  };

  const handleExportCsv = () => {
    if (!analyticsData || !analyticsData.recentScans || analyticsData.recentScans.length === 0) {
      toast.info('No scan records available to export.');
      return;
    }

    const headers = ['Scanned At', 'QR Name', 'ShortCode', 'Device', 'Browser', 'OS', 'Country', 'Referrer'];
    const rows = analyticsData.recentScans.map((scan) => [
      `"${scan.scannedAt}"`,
      `"${(scan.qrCode?.name || '').replace(/"/g, '""')}"`,
      `"${scan.qrCode?.shortCode || ''}"`,
      `"${scan.deviceType}"`,
      `"${scan.browser}"`,
      `"${scan.operatingSystem}"`,
      `"${scan.country}"`,
      `"${(scan.referrer || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `analytics_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Analytics CSV export downloaded');
  };

  const metrics = analyticsData?.metrics;
  const charts = analyticsData?.charts;
  const breakdowns = analyticsData?.breakdowns;
  const recentScans = analyticsData?.recentScans || [];

  const activeChartData: ChartPoint[] = useMemo(() => {
    if (!charts) return [];
    if (periodicTab === 'daily') return charts.dailyScans || [];
    if (periodicTab === 'weekly') return charts.weeklyScans || [];
    if (periodicTab === 'monthly') return charts.monthlyScans || [];
    return charts.timeline || [];
  }, [charts, periodicTab]);

  const hasFilterScans = useMemo(() => {
    return activeChartData.some((pt) => pt.scans > 0);
  }, [activeChartData]);

  const totalOverallScans = metrics?.totalScans ?? 0;

  return (
    <div className="space-y-5 text-left">
      {/* Page Header */}
      <PageHeader
        title="Analytics & Insights"
        description="Real-time scan tracking and visitor insights from your dynamic QR codes."
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={fetchAnalytics}
              isLoading={isLoading}
              leftIcon={<HiOutlineRefresh className="w-4 h-4" />}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={handleExportCsv}
              disabled={recentScans.length === 0}
              leftIcon={<HiOutlineDownload className="w-4 h-4" />}
            >
              Export CSV
            </Button>
          </>
        }
      />

      {/* Filter Controls Toolbar */}
      <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* QR Code Filter Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Filter QR:</span>
            <select
              value={selectedQrId}
              onChange={handleQrSelectChange}
              className="w-full md:w-64 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All QR Codes</option>
              {qrList.map((qr) => (
                <option key={qr.id} value={qr.id}>
                  {qr.name} ({qr.type})
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Pills */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {filterOptions.map((opt) => {
              const active = timeRange === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleTimeRangeChange(opt.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer select-none whitespace-nowrap ${
                    active
                      ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {timeRange === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="font-medium text-slate-700 flex items-center gap-1">
              <HiOutlineCalendar className="w-3.5 h-3.5 text-indigo-600" />
              Range:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">From</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 rounded-md border border-slate-200 bg-white text-xs text-slate-700"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">To</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 rounded-md border border-slate-200 bg-white text-xs text-slate-700"
              />
            </div>
            <Button size="sm" variant="primary" onClick={fetchAnalytics} isLoading={isLoading} className="text-xs h-7 px-2.5">
              Apply
            </Button>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <ErrorState
          title="Failed to load analytics data"
          description={error}
          onRetry={fetchAnalytics}
        />
      )}

      {/* QR Details Header Card (Shown when an individual QR is selected) */}
      {currentQr && (
        <Card className="border-indigo-100 bg-indigo-50/20">
          <CardBody className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-1 bg-white rounded-lg shadow-2xs border border-slate-100 shrink-0">
                <QrThumbnail content={currentQr.content} design={currentQr.design} size={52} />
              </div>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">
                    {currentQr.name}
                  </h3>
                  <Badge variant="brand" size="sm">{currentQr.type}</Badge>
                  {currentQr.isDynamic && <Badge variant="neutral" size="sm">Dynamic</Badge>}
                  <Badge variant={currentQr.status === 'ACTIVE' ? 'success' : 'neutral'} dot size="sm">
                    {currentQr.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                {currentQr.isDynamic && currentQr.shortCode && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                    <span className="font-sans text-slate-400 text-[11px]">Shortlink:</span>
                    <a
                      href={`/q/${currentQr.shortCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline flex items-center gap-0.5"
                    >
                      /q/{currentQr.shortCode}
                      <HiOutlineExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                )}
                {currentQr.destinationUrl && (
                  <p className="text-xs text-slate-500 truncate max-w-md font-mono">
                    <span className="font-sans text-slate-400 text-[11px]">Destination: </span>
                    {currentQr.destinationUrl}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/app/create?edit=${currentQr.id}`)}
                className="text-xs"
              >
                <HiOutlinePencilAlt className="w-3.5 h-3.5 mr-1" />
                Edit QR
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchParams({})}
                className="text-xs"
              >
                All QR Overview
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* OVERVIEW STATS ROW 1: Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card hoverEffect>
          <CardBody className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total QR Codes
            </span>
            <div className="text-xl font-bold text-slate-900">
              {isLoading ? '...' : (metrics?.totalQrs ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {currentQr ? 'Focused single record' : 'Total QR count'}
            </p>
          </CardBody>
        </Card>

        <Card hoverEffect>
          <CardBody className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Active QR Codes
            </span>
            <div className="text-xl font-bold text-slate-900">
              {isLoading ? '...' : (metrics?.activeQrs ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Ready and routing scans
            </p>
          </CardBody>
        </Card>

        <Card hoverEffect>
          <CardBody className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Total Scans
            </span>
            <div className="text-xl font-bold text-indigo-600">
              {isLoading ? '...' : (metrics?.totalScans ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              All logged scan requests
            </p>
          </CardBody>
        </Card>

        <Card hoverEffect>
          <CardBody className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Unique Scans
            </span>
            <div className="text-xl font-bold text-emerald-600">
              {isLoading ? '...' : (metrics?.uniqueScans ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Distinct visitor sessions
            </p>
          </CardBody>
        </Card>
      </div>

      {/* OVERVIEW STATS ROW 2: Periodic Counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card hoverEffect>
          <CardBody className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Scans Today
            </span>
            <div className="text-xl font-bold text-slate-900">
              {isLoading ? '...' : (metrics?.scansToday ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 truncate">Last 24 hours</p>
          </CardBody>
        </Card>

        <Card hoverEffect>
          <CardBody className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Scans This Week
            </span>
            <div className="text-xl font-bold text-slate-900">
              {isLoading ? '...' : (metrics?.scansThisWeek ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 truncate">Current week</p>
          </CardBody>
        </Card>

        <Card hoverEffect>
          <CardBody className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Scans This Month
            </span>
            <div className="text-xl font-bold text-slate-900">
              {isLoading ? '...' : (metrics?.scansThisMonth ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 truncate">Current month</p>
          </CardBody>
        </Card>

        <Card hoverEffect>
          <CardBody className="p-3.5 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Latest Scan
            </span>
            <div className="text-xs font-semibold text-slate-900 truncate mt-1">
              {metrics?.latestScan
                ? new Date(metrics.latestScan).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'No scans yet'}
            </div>
            <p className="text-[11px] text-slate-400 truncate">Most recent scan time</p>
          </CardBody>
        </Card>
      </div>

      {/* EMPTY STATE: Shown when no scan data exists */}
      {!isLoading && totalOverallScans === 0 ? (
        <Card className="p-8">
          <EmptyState
            icon={<HiOutlineCursorClick className="w-8 h-8 text-slate-300" />}
            title="No scan data yet"
            description="Your analytics will appear here after the first dynamic QR scan. Print or test your dynamic QR codes to start logging visits."
            actionText="View QR Codes"
            onAction={() => navigate('/app/qr-codes')}
          />
        </Card>
      ) : (
        <>
          {/* CHARTS SECTION (2-column layout on desktop, 1-col on mobile) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Main Scan Activity Chart (2 cols) */}
            <div className="lg:col-span-2">
              <Card className="h-full flex flex-col justify-between">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                  <div>
                    <CardTitle>Scan Activity</CardTitle>
                    <CardDescription>
                      {periodicTab === 'timeline' && `Activity for: ${timeRange.toUpperCase()}`}
                      {periodicTab === 'daily' && 'Daily volume (Last 14 days)'}
                      {periodicTab === 'weekly' && 'Weekly volume (Last 8 weeks)'}
                      {periodicTab === 'monthly' && 'Monthly volume (Last 6 months)'}
                    </CardDescription>
                  </div>

                  {/* Switcher Tabs */}
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 self-start sm:self-auto">
                    {(['timeline', 'daily', 'weekly', 'monthly'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setPeriodicTab(tab)}
                        className={`px-2 py-0.5 text-xs capitalize font-medium rounded-md transition-colors cursor-pointer ${
                          periodicTab === tab
                            ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </CardHeader>

                <CardBody className="p-4">
                  {isLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
                    </div>
                  ) : hasFilterScans ? (
                    <div className="h-64 w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        {periodicTab === 'timeline' ? (
                          <AreaChart data={activeChartData}>
                            <defs>
                              <linearGradient id="scansGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                              dataKey="label"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 11, fill: '#64748b' }}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 11, fill: '#64748b' }}
                              allowDecimals={false}
                            />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: '#ffffff',
                                borderColor: '#e2e8f0',
                                borderRadius: '0.5rem',
                                fontSize: '12px',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="scans"
                              name="Scans"
                              stroke="#4f46e5"
                              strokeWidth={2}
                              fill="url(#scansGradient)"
                            />
                          </AreaChart>
                        ) : (
                          <BarChart data={activeChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                              dataKey="label"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 11, fill: '#64748b' }}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 11, fill: '#64748b' }}
                              allowDecimals={false}
                            />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: '#ffffff',
                                borderColor: '#e2e8f0',
                                borderRadius: '0.5rem',
                                fontSize: '12px',
                              }}
                            />
                            <Bar
                              dataKey="scans"
                              name="Scans"
                              fill="#4f46e5"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-center p-4 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                      <HiOutlineCursorClick className="w-8 h-8 text-slate-300 mb-1" />
                      <p className="text-xs font-semibold text-slate-700">No scans in this period</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Try selecting a wider date range or test your QR code.</p>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Device Breakdown (1 col) */}
            <div className="lg:col-span-1">
              <Card className="h-full flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <div>
                    <CardTitle>Device Types</CardTitle>
                    <CardDescription>Mobile, desktop, or tablet</CardDescription>
                  </div>
                </CardHeader>
                <CardBody className="p-4">
                  {breakdowns && breakdowns.devices.length > 0 ? (
                    <div className="space-y-3">
                      {breakdowns.devices.map((d) => (
                        <div key={d.device} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-700 capitalize">{d.device}</span>
                            <span className="text-slate-500 font-medium">
                              {d.count} ({d.percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${d.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-56 flex flex-col items-center justify-center text-center p-4">
                      <HiOutlineDeviceMobile className="w-8 h-8 text-slate-300 mb-1" />
                      <p className="text-xs text-slate-400 font-medium">No device data yet</p>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>

          {/* ATTRIBUTION BREAKDOWNS (4 CARDS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Operating Systems */}
            <Card>
              <CardHeader className="p-3.5 pb-1">
                <CardTitle className="text-xs font-bold text-slate-900">Operating Systems</CardTitle>
                <CardDescription className="text-[10px]">Client platform</CardDescription>
              </CardHeader>
              <CardBody className="p-3.5 pt-1 space-y-1.5">
                {breakdowns && breakdowns.operatingSystems.length > 0 ? (
                  breakdowns.operatingSystems.map((item) => (
                    <div key={item.os} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                      <span className="font-medium text-slate-700">{item.os}</span>
                      <Badge variant="neutral" size="sm">
                        {item.count} ({item.percentage}%)
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center">No data</p>
                )}
              </CardBody>
            </Card>

            {/* Web Browsers */}
            <Card>
              <CardHeader className="p-3.5 pb-1">
                <CardTitle className="text-xs font-bold text-slate-900">Web Browsers</CardTitle>
                <CardDescription className="text-[10px]">Client user-agent</CardDescription>
              </CardHeader>
              <CardBody className="p-3.5 pt-1 space-y-1.5">
                {breakdowns && breakdowns.browsers.length > 0 ? (
                  breakdowns.browsers.map((item) => (
                    <div key={item.browser} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                      <span className="font-medium text-slate-700">{item.browser}</span>
                      <Badge variant="neutral" size="sm">
                        {item.count} ({item.percentage}%)
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center">No data</p>
                )}
              </CardBody>
            </Card>

            {/* Geography */}
            <Card>
              <CardHeader className="p-3.5 pb-1">
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center justify-between">
                  <span>Geography</span>
                  <HiOutlineGlobe className="w-3.5 h-3.5 text-slate-400" />
                </CardTitle>
                <CardDescription className="text-[10px]">Cloud origin header</CardDescription>
              </CardHeader>
              <CardBody className="p-3.5 pt-1 space-y-1.5">
                {breakdowns && breakdowns.countries.length > 0 ? (
                  breakdowns.countries.map((item) => (
                    <div key={item.country} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                      <span className="font-medium text-slate-700">{item.country}</span>
                      <Badge variant="neutral" size="sm">
                        {item.count} ({item.percentage}%)
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center">No data</p>
                )}
              </CardBody>
            </Card>

            {/* Referrers */}
            <Card>
              <CardHeader className="p-3.5 pb-1">
                <CardTitle className="text-xs font-bold text-slate-900">Referrers</CardTitle>
                <CardDescription className="text-[10px]">Traffic sources</CardDescription>
              </CardHeader>
              <CardBody className="p-3.5 pt-1 space-y-1.5">
                {breakdowns && breakdowns.referrers.length > 0 ? (
                  breakdowns.referrers.map((item) => (
                    <div key={item.referrer} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                      <span className="font-medium text-slate-700 truncate max-w-[120px]" title={item.referrer}>
                        {item.referrer}
                      </span>
                      <Badge variant="neutral" size="sm">
                        {item.count}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center">Direct scans</p>
                )}
              </CardBody>
            </Card>
          </div>

          {/* RECENT SCAN LOGS TABLE */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Recent Scan Activity Log</CardTitle>
                <CardDescription>Live incoming scan events</CardDescription>
              </div>
            </CardHeader>
            <div className="p-0">
              {recentScans.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      {!currentQr && <TableHead>QR Code</TableHead>}
                      <TableHead>Device</TableHead>
                      <TableHead>Browser</TableHead>
                      <TableHead>OS</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Referrer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentScans.map((scan) => (
                      <TableRow key={scan.id}>
                        <TableCell className="font-mono text-xs text-slate-600 whitespace-nowrap">
                          {new Date(scan.scannedAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </TableCell>
                        {!currentQr && (
                          <TableCell className="font-semibold text-slate-900 text-xs">
                            {scan.qrCode?.name || 'Dynamic QR'}
                            {scan.qrCode?.shortCode && (
                              <span className="text-[10px] text-slate-400 block font-mono">
                                /q/{scan.qrCode.shortCode}
                              </span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant="neutral" size="sm" className="capitalize">
                            {scan.deviceType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">{scan.browser}</TableCell>
                        <TableCell className="text-xs text-slate-700">{scan.operatingSystem}</TableCell>
                        <TableCell>
                          <Badge variant="brand" size="sm">
                            {scan.country}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 font-mono truncate max-w-[160px]" title={scan.referrer}>
                          {scan.referrer}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400">
                  No scan log events recorded yet.
                </div>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
