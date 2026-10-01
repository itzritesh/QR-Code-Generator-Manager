import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiOutlineQrcode,
  HiOutlineCheckCircle,
  HiOutlineBan,
  HiOutlineCursorClick,
  HiOutlinePlusCircle,
  HiOutlineEye,
  HiOutlinePencilAlt,
  HiOutlineDownload,
  HiOutlineRefresh,
  HiOutlineDocumentDuplicate,
  HiOutlineChartBar,
  HiOutlineTemplate,
} from 'react-icons/hi';
import { Card, CardHeader, CardTitle, CardBody, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button, ActionIcon } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { qrApi, DashboardMetrics, QrCode } from '../../services/qr.api';
import { QrThumbnail } from '../../components/common/QrThumbnail';
import { QrViewModal } from '../../components/common/QrViewModal';
import { exportQrCode } from '../../utils/qrRenderer';
import { DEFAULT_DESIGN, QrCustomDesign } from '../../utils/qrTemplates';
import { useToast } from '../../components/ui/ToastContext';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQr, setSelectedQr] = useState<QrCode | null>(null);

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await qrApi.getDashboardMetrics();
      setMetrics(data);
    } catch (err: any) {
      console.error('Failed to load dashboard metrics:', err);
      setError(err?.response?.data?.message || err.message || 'Unable to connect to database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleDownload = async (qr: QrCode) => {
    try {
      const design: QrCustomDesign = {
        ...DEFAULT_DESIGN,
        ...(qr.design || {}),
      };
      await exportQrCode(qr.content, design, qr.name, 'png', 1024);
      toast.success(`Downloaded ${qr.name}.png`);
    } catch (err: any) {
      toast.error('Failed to download QR code');
    }
  };

  const statCards = [
    {
      title: 'Total QR Codes',
      value: metrics ? metrics.totalQrs.toLocaleString() : '0',
      description: 'Created across all categories',
      icon: <HiOutlineQrcode className="w-4 h-4 text-indigo-600" />,
      badgeText: 'All types',
      badgeVariant: 'neutral' as const,
    },
    {
      title: 'Active QR Codes',
      value: metrics ? metrics.activeQrs.toLocaleString() : '0',
      description: 'Routing & currently scannable',
      icon: <HiOutlineCheckCircle className="w-4 h-4 text-emerald-600" />,
      badgeText: metrics?.totalQrs ? `${Math.round((metrics.activeQrs / metrics.totalQrs) * 100)}% active` : 'Active',
      badgeVariant: 'success' as const,
    },
    {
      title: 'Disabled QR Codes',
      value: metrics ? metrics.disabledQrs.toLocaleString() : '0',
      description: 'Paused or archived codes',
      icon: <HiOutlineBan className="w-4 h-4 text-amber-600" />,
      badgeText: 'Inactive',
      badgeVariant: 'warning' as const,
    },
    {
      title: 'Total Scans',
      value: metrics ? metrics.totalScans.toLocaleString() : '0',
      description: 'Live scan events logged',
      icon: <HiOutlineCursorClick className="w-4 h-4 text-sky-600" />,
      badgeText: 'All time',
      badgeVariant: 'brand' as const,
    },
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Top Page Header */}
      <PageHeader
        title="Dashboard"
        description="Monitor your QR codes, active routing links, and scan analytics."
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={fetchMetrics}
              isLoading={isLoading}
              leftIcon={<HiOutlineRefresh className="w-4 h-4" />}
            >
              Refresh
            </Button>
            <Link to="/app/create">
              <Button
                variant="primary"
                size="md"
                leftIcon={<HiOutlinePlusCircle className="w-4 h-4" />}
              >
                Create QR Code
              </Button>
            </Link>
          </>
        }
      />

      {/* Error Banner */}
      {error && (
        <ErrorState
          title="Failed to load dashboard data"
          description={error}
          onRetry={fetchMetrics}
        />
      )}

      {/* Stats Cards Grid (Compact & Balanced) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <Card key={idx} hoverEffect className="flex flex-col justify-between">
            <CardBody className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{stat.title}</span>
                <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                  {stat.icon}
                </div>
              </div>
              <div>
                <span className="text-2xl font-bold text-slate-900 tracking-tight">
                  {isLoading ? '...' : stat.value}
                </span>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                  <Badge variant={stat.badgeVariant} size="sm">
                    {stat.badgeText}
                  </Badge>
                  <span className="truncate">{stat.description}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Middle Row: Distribution & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 cols): QR Code Distribution */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader>
              <div>
                <CardTitle>QR Code Distribution</CardTitle>
                <CardDescription>Breakdown by code type across your account</CardDescription>
              </div>
              <Badge variant="neutral" size="sm">Distribution</Badge>
            </CardHeader>
            <CardBody className="p-4 sm:p-5 flex-1 flex flex-col justify-center">
              {isLoading ? (
                <div className="py-8 text-center text-slate-400 text-xs">Loading distribution...</div>
              ) : !metrics || metrics.totalQrs === 0 ? (
                <div className="py-8 text-center space-y-1.5">
                  <p className="text-xs font-semibold text-slate-700">No QR codes created yet</p>
                  <p className="text-xs text-slate-400">Generate URL, Wi-Fi, Text or Payment QR codes to see type distributions.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['URL', 'TEXT', 'WIFI', 'PAYMENT'].map((type) => {
                      const item = metrics.typeBreakdown.find((t) => t.type === type);
                      const count = item ? item.count : 0;
                      const percent = metrics.totalQrs > 0 ? Math.round((count / metrics.totalQrs) * 100) : 0;
                      return (
                        <div key={type} className="p-3 bg-slate-50/70 rounded-lg border border-slate-100 flex flex-col">
                          <span className="text-[11px] font-medium text-slate-500">{type}</span>
                          <span className="text-lg font-bold text-slate-900 mt-0.5">{count}</span>
                          <span className="text-[10px] text-slate-400">{percent}% of total</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Multi-segment Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
                    {metrics.typeBreakdown.map((item, i) => {
                      const colors = ['bg-indigo-600', 'bg-emerald-500', 'bg-sky-500', 'bg-amber-500'];
                      const percent = (item.count / metrics.totalQrs) * 100;
                      return (
                        <div
                          key={item.type}
                          style={{ width: `${percent}%` }}
                          className={`${colors[i % colors.length]} transition-all duration-300`}
                          title={`${item.type}: ${item.count} (${Math.round(percent)}%)`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Right (1 col): Quick Actions */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col justify-between">
            <CardHeader>
              <div>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tools and workflows</CardDescription>
              </div>
            </CardHeader>
            <CardBody className="p-4 sm:p-5 space-y-2.5">
              <Link
                to="/app/create"
                className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <HiOutlinePlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">Create New QR</h4>
                  <p className="text-[11px] text-slate-500">Design static or dynamic code</p>
                </div>
              </Link>

              <Link
                to="/app/bulk"
                className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <HiOutlineDocumentDuplicate className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">Bulk Generator</h4>
                  <p className="text-[11px] text-slate-500">Batch generate via CSV upload</p>
                </div>
              </Link>

              <Link
                to="/app/analytics"
                className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                  <HiOutlineChartBar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">Scan Analytics</h4>
                  <p className="text-[11px] text-slate-500">View real-time scan metrics</p>
                </div>
              </Link>

              <Link
                to="/app/templates"
                className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <HiOutlineTemplate className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-900">Explore Templates</h4>
                  <p className="text-[11px] text-slate-500">Browse pre-designed styles</p>
                </div>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Bottom Section: Recent QR Codes */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent QR Codes</CardTitle>
            <CardDescription>Your latest created QR codes</CardDescription>
          </div>
          <Link to="/app/qr-codes">
            <Button variant="outline" size="sm" className="text-xs">
              View All ({metrics ? metrics.totalQrs : 0})
            </Button>
          </Link>
        </CardHeader>
        <div className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading recent QR codes...</div>
          ) : !metrics || metrics.recentQrs.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<HiOutlineQrcode className="w-8 h-8 text-slate-300" />}
                title="No QR codes created yet"
                description="Create your first QR code to start tracking and managing your assets."
                actionText="Create QR Code"
                onAction={() => navigate('/app/create')}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview &amp; Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Scans</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentQrs.map((qr) => (
                  <TableRow key={qr.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedQr(qr)}
                          className="focus:outline-none hover:scale-105 transition-transform"
                          title="View QR"
                        >
                          <QrThumbnail content={qr.content} design={qr.design} size={36} />
                        </button>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-900 text-xs truncate max-w-xs">{qr.name}</span>
                          <span className="text-[11px] text-slate-400 truncate max-w-xs font-mono">{qr.content}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral" size="sm">
                        {qr.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-slate-900 text-xs">
                        {qr.scanCount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={qr.status === 'ACTIVE' ? 'success' : 'neutral'} dot size="sm">
                        {qr.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-500">
                        {new Date(qr.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ActionIcon
                          ariaLabel="View QR Details"
                          icon={<HiOutlineEye className="w-4 h-4" />}
                          onClick={() => setSelectedQr(qr)}
                        />
                        <ActionIcon
                          ariaLabel="Edit QR Code"
                          icon={<HiOutlinePencilAlt className="w-4 h-4" />}
                          onClick={() => navigate(`/app/create?edit=${qr.id}`)}
                        />
                        <ActionIcon
                          ariaLabel="Download PNG"
                          icon={<HiOutlineDownload className="w-4 h-4" />}
                          onClick={() => handleDownload(qr)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      {/* QR Code Inspection Modal */}
      <QrViewModal
        isOpen={Boolean(selectedQr)}
        onClose={() => setSelectedQr(null)}
        qr={selectedQr}
        onEdit={(id) => navigate(`/app/create?edit=${id}`)}
      />
    </div>
  );
};
