import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  HiOutlinePlusCircle,
  HiOutlineDownload,
  HiOutlineTrash,
  HiOutlinePencilAlt,
  HiOutlineDocumentDuplicate,
  HiOutlineEye,
  HiOutlineRefresh,
  HiOutlineCheck,
  HiOutlineBan,
  HiOutlineDotsVertical,
  HiOutlineChartBar,
} from 'react-icons/hi';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button, ActionIcon } from '../../components/ui/Button';
import { Dropdown, DropdownItem } from '../../components/ui/Dropdown';
import { SearchInput } from '../../components/ui/SearchInput';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/ToastContext';
import { qrApi, QrCode, QrType, QrStatus } from '../../services/qr.api';
import { QrThumbnail } from '../../components/common/QrThumbnail';
import { QrViewModal } from '../../components/common/QrViewModal';
import { exportQrCode } from '../../utils/qrRenderer';
import { DEFAULT_DESIGN, QrCustomDesign } from '../../utils/qrTemplates';
import { cn } from '../../utils/cn';

type FilterTab = 'all' | 'URL' | 'TEXT' | 'WIFI' | 'PAYMENT' | 'ACTIVE' | 'DISABLED';
type SortOption = 'newest' | 'oldest' | 'name' | 'most_scanned' | 'least_scanned';

export const MyQRCodesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  // State
  const [qrs, setQrs] = useState<QrCode[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Modals & Action States
  const [viewingQr, setViewingQr] = useState<QrCode | null>(null);
  const [deletingQr, setDeletingQr] = useState<QrCode | null>(null);
  const [duplicatingQr, setDuplicatingQr] = useState<QrCode | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchQrs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let typeParam: QrType | undefined;
      let statusParam: QrStatus | undefined;

      if (['URL', 'TEXT', 'WIFI', 'PAYMENT'].includes(activeFilter)) {
        typeParam = activeFilter as QrType;
      } else if (activeFilter === 'ACTIVE' || activeFilter === 'DISABLED') {
        statusParam = activeFilter as QrStatus;
      }

      const res = await qrApi.listQrs({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearchTerm.trim() || undefined,
        type: typeParam,
        status: statusParam,
        sort: sortBy,
      });

      setQrs(res.items);
      setTotalItems(res.pagination.total);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to load QR codes:', err);
      setError(err?.response?.data?.message || err.message || 'Unable to connect to database.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, activeFilter, sortBy]);

  useEffect(() => {
    fetchQrs();
  }, [fetchQrs]);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null && q !== searchTerm) {
      setSearchTerm(q);
      setCurrentPage(1);
    }
  }, [searchParams]);

  const handleFilterChange = (filter: FilterTab) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as SortOption);
    setCurrentPage(1);
  };

  // Actions
  const handleDuplicate = (qr: QrCode) => {
    setDuplicatingQr(qr);
    setDuplicateName(`${qr.name} (Copy)`);
  };

  const handleConfirmDuplicate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!duplicatingQr) return;
    try {
      setIsDuplicating(true);
      const targetName = duplicateName.trim() || `${duplicatingQr.name} (Copy)`;
      const duplicated = await qrApi.duplicateQr(duplicatingQr.id, targetName);
      toast.success(`Duplicated as "${duplicated.name}"`, 'Duplicate Created');
      setDuplicatingQr(null);
      await fetchQrs();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to duplicate QR code');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleToggleStatus = async (qr: QrCode) => {
    const nextStatus: QrStatus = qr.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await qrApi.updateStatus(qr.id, nextStatus);
      toast.success(
        `QR Code is now ${nextStatus === 'ACTIVE' ? 'Active' : 'Disabled'}.`,
        nextStatus === 'ACTIVE' ? 'Status Enabled' : 'Status Disabled'
      );
      setQrs((prev) =>
        prev.map((item) => (item.id === qr.id ? { ...item, status: nextStatus } : item))
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to change status');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingQr) return;
    try {
      setIsDeleting(true);
      await qrApi.deleteQr(deletingQr.id);
      toast.success(`"${deletingQr.name}" has been deleted.`);
      setDeletingQr(null);
      await fetchQrs();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete QR code');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (qr: QrCode) => {
    try {
      const activeDesign: QrCustomDesign = {
        ...DEFAULT_DESIGN,
        ...(qr.design || {}),
      };
      await exportQrCode(qr.content, activeDesign, qr.name, 'png', 1024);
      toast.success(`Downloaded ${qr.name}.png`);
    } catch (err: any) {
      toast.error('Failed to download QR code image');
    }
  };

  const filterTabs: Array<{ id: FilterTab; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'URL', label: 'URL' },
    { id: 'TEXT', label: 'Text' },
    { id: 'WIFI', label: 'Wi-Fi' },
    { id: 'PAYMENT', label: 'Payment' },
    { id: 'ACTIVE', label: 'Active' },
    { id: 'DISABLED', label: 'Disabled' },
  ];

  return (
    <div className="space-y-5 text-left">
      {/* Page Header */}
      <PageHeader
        title="My QR Codes"
        description="Manage, edit, download, and monitor your QR codes."
        actions={
          <>
            <Button
              variant="outline"
              size="md"
              onClick={fetchQrs}
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

      {/* Clean Toolbar: Search, Filters & Sort */}
      <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="w-full md:w-72">
            <SearchInput
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by name, destination, or shortlink..."
              className="w-full text-xs"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Sort by:</span>
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="newest">Newest Created</option>
              <option value="oldest">Oldest Created</option>
              <option value="name">Alphabetical (A-Z)</option>
              <option value="most_scanned">Most Scanned</option>
              <option value="least_scanned">Least Scanned</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pt-1 border-t border-slate-100">
          {filterTabs.map((tab) => {
            const active = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleFilterChange(tab.id)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer select-none whitespace-nowrap',
                  active
                    ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <Card className="p-8 text-center text-slate-400 text-xs">
          <HiOutlineRefresh className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
          Loading your QR codes...
        </Card>
      ) : error ? (
        <Card className="p-6 text-center text-rose-600 space-y-2">
          <p className="text-xs font-semibold">Failed to load QR codes: {error}</p>
          <Button variant="outline" size="sm" onClick={fetchQrs} className="text-xs">
            Retry
          </Button>
        </Card>
      ) : qrs.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title={debouncedSearchTerm ? 'No matching QR codes' : 'No QR codes found'}
            description={
              debouncedSearchTerm
                ? `No QR codes matched "${debouncedSearchTerm}". Try adjusting your search query.`
                : 'Create your first QR code to start tracking scans and managing links.'
            }
            actionText="Create QR Code"
            onAction={() => navigate('/app/create')}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-xs text-slate-500 uppercase font-semibold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">QR Preview</th>
                      <th className="px-4 py-3">Name &amp; Target</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Scans</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {qrs.map((qr) => {
                      const moreActions: DropdownItem[] = [
                        {
                          label: 'View Analytics',
                          icon: <HiOutlineChartBar className="w-4 h-4 text-slate-400" />,
                          onClick: () => navigate(`/app/analytics?qrId=${qr.id}`),
                        },
                        {
                          label: 'Duplicate',
                          icon: <HiOutlineDocumentDuplicate className="w-4 h-4 text-slate-400" />,
                          onClick: () => handleDuplicate(qr),
                        },
                        {
                          label: qr.status === 'ACTIVE' ? 'Disable Code' : 'Enable Code',
                          icon: qr.status === 'ACTIVE'
                            ? <HiOutlineBan className="w-4 h-4 text-amber-500" />
                            : <HiOutlineCheck className="w-4 h-4 text-emerald-500" />,
                          onClick: () => handleToggleStatus(qr),
                          divider: true,
                        },
                        {
                          label: 'Delete',
                          icon: <HiOutlineTrash className="w-4 h-4 text-rose-500" />,
                          danger: true,
                          onClick: () => setDeletingQr(qr),
                        },
                      ];

                      return (
                        <tr key={qr.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Preview Thumbnail */}
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setViewingQr(qr)}
                              title="Click to view full preview"
                              className="focus:outline-none hover:scale-105 transition-transform cursor-pointer"
                            >
                              <QrThumbnail content={qr.content} design={qr.design} size={40} />
                            </button>
                          </td>

                          {/* Name & Content */}
                          <td className="px-4 py-3 max-w-xs">
                            <div className="font-semibold text-slate-900 text-xs truncate">
                              {qr.name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5" title={qr.destinationUrl || qr.content}>
                              {qr.destinationUrl ? `→ ${qr.destinationUrl}` : qr.content}
                            </div>
                          </td>

                          {/* Type */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="neutral" size="sm">
                                {qr.type}
                              </Badge>
                              {qr.isDynamic && (
                                <Badge variant="warning" size="sm">
                                  Dynamic
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <Badge variant={qr.status === 'ACTIVE' ? 'success' : 'neutral'} dot size="sm">
                              {qr.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                            </Badge>
                          </td>

                          {/* Scan Count */}
                          <td className="px-4 py-3 font-semibold text-slate-900 text-xs">
                            {qr.scanCount.toLocaleString()}
                          </td>

                          {/* Created */}
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {new Date(qr.createdAt).toLocaleDateString()}
                          </td>

                          {/* Actions: Primary View, Analytics, Edit, Download + Secondary More Menu */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <ActionIcon
                                ariaLabel="View & Inspect"
                                icon={<HiOutlineEye className="w-4 h-4" />}
                                onClick={() => setViewingQr(qr)}
                              />
                              <ActionIcon
                                ariaLabel="Scan Analytics"
                                icon={<HiOutlineChartBar className="w-4 h-4" />}
                                onClick={() => navigate(`/app/analytics?qr=${qr.id}`)}
                              />
                              <ActionIcon
                                ariaLabel="Edit Configuration"
                                icon={<HiOutlinePencilAlt className="w-4 h-4" />}
                                onClick={() => navigate(`/app/create?edit=${qr.id}`)}
                              />
                              <ActionIcon
                                ariaLabel="Download PNG"
                                icon={<HiOutlineDownload className="w-4 h-4" />}
                                onClick={() => handleDownload(qr)}
                              />

                              {/* More Dropdown for Secondary Actions */}
                              <Dropdown
                                trigger={
                                  <ActionIcon
                                    ariaLabel="More Options"
                                    icon={<HiOutlineDotsVertical className="w-4 h-4" />}
                                  />
                                }
                                items={moreActions}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Responsive Cards View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {qrs.map((qr) => (
              <Card key={qr.id} className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => setViewingQr(qr)}
                      className="focus:outline-none shrink-0"
                    >
                      <QrThumbnail content={qr.content} design={qr.design} size={44} />
                    </button>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-xs text-slate-900 truncate">
                        {qr.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                        {qr.destinationUrl ? `→ ${qr.destinationUrl}` : qr.content}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="neutral" size="sm">{qr.type}</Badge>
                        <Badge variant={qr.status === 'ACTIVE' ? 'success' : 'neutral'} dot size="sm">
                          {qr.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-slate-900 whitespace-nowrap bg-slate-50 px-2 py-1 rounded border border-slate-100">
                    {qr.scanCount} scans
                  </span>
                </div>

                {/* Primary Actions Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingQr(qr)}
                      leftIcon={<HiOutlineEye className="w-3.5 h-3.5" />}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/app/create?edit=${qr.id}`)}
                      leftIcon={<HiOutlinePencilAlt className="w-3.5 h-3.5" />}
                    >
                      Edit
                    </Button>
                    <ActionIcon
                      ariaLabel="Download PNG"
                      variant="outline"
                      size="sm"
                      icon={<HiOutlineDownload className="w-4 h-4" />}
                      onClick={() => handleDownload(qr)}
                    />
                  </div>

                  <Dropdown
                    trigger={
                      <ActionIcon
                        ariaLabel="More Options"
                        variant="ghost"
                        size="sm"
                        icon={<HiOutlineDotsVertical className="w-4 h-4" />}
                      />
                    }
                    items={[
                      {
                        label: 'View Analytics',
                        icon: <HiOutlineChartBar className="w-4 h-4 text-slate-400" />,
                        onClick: () => navigate(`/app/analytics?qrId=${qr.id}`),
                      },
                      {
                        label: 'Duplicate',
                        icon: <HiOutlineDocumentDuplicate className="w-4 h-4 text-slate-400" />,
                        onClick: () => handleDuplicate(qr),
                      },
                      {
                        label: qr.status === 'ACTIVE' ? 'Disable Code' : 'Enable Code',
                        icon: qr.status === 'ACTIVE' ? <HiOutlineBan className="w-4 h-4" /> : <HiOutlineCheck className="w-4 h-4" />,
                        onClick: () => handleToggleStatus(qr),
                        divider: true,
                      },
                      {
                        label: 'Delete',
                        icon: <HiOutlineTrash className="w-4 h-4 text-rose-500" />,
                        danger: true,
                        onClick: () => setDeletingQr(qr),
                      },
                    ]}
                  />
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-2 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={pageSize}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          )}
        </div>
      )}

      {/* QR Code Inspection Modal */}
      <QrViewModal
        isOpen={Boolean(viewingQr)}
        onClose={() => setViewingQr(null)}
        qr={viewingQr}
        onEdit={(id) => navigate(`/app/create?edit=${id}`)}
      />

      {/* Duplicate QR Name Modal */}
      <Modal
        isOpen={Boolean(duplicatingQr)}
        onClose={() => setDuplicatingQr(null)}
        title="Duplicate QR Code"
        description="Creates a new independent copy with all custom design settings. Scan count starts at 0."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDuplicatingQr(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmDuplicate}
              isLoading={isDuplicating}
              disabled={!duplicateName.trim()}
              className="text-xs"
            >
              Create Duplicate
            </Button>
          </>
        }
      >
        <form onSubmit={handleConfirmDuplicate} className="space-y-3">
          <Input
            label="New QR Code Name"
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
            placeholder="e.g. My QR (Copy)"
            autoFocus
            required
          />
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingQr)}
        onClose={() => setDeletingQr(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete QR Code?"
        message={`Are you sure you want to delete "${deletingQr?.name}"? Any printed dynamic codes will stop redirecting.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
