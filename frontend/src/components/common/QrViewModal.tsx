import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineX,
  HiOutlineDownload,
  HiOutlinePencilAlt,
  HiOutlineClipboardCopy,
  HiCheck,
  HiOutlineChartBar,
} from 'react-icons/hi';
import { QrCode } from '../../services/qr.api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { renderQrToCanvas, exportQrCode } from '../../utils/qrRenderer';
import { DEFAULT_DESIGN, QrCustomDesign } from '../../utils/qrTemplates';
import { useToast } from '../ui/ToastContext';

interface QrViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  qr: QrCode | null;
  onEdit?: (id: string) => void;
}

export const QrViewModal: React.FC<QrViewModalProps> = ({
  isOpen,
  onClose,
  qr,
  onEdit,
}) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (isOpen && qr && canvasRef.current) {
      const activeDesign: QrCustomDesign = {
        ...DEFAULT_DESIGN,
        ...(qr.design || {}),
      };
      renderQrToCanvas(qr.content, activeDesign, canvasRef.current, 512).catch(console.error);
    }
  }, [isOpen, qr]);

  if (!isOpen || !qr) return null;

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(qr.content);
    setCopied(true);
    toast.success('Payload copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (format: 'png' | 'svg' | 'pdf') => {
    try {
      setDownloading(format);
      const activeDesign: QrCustomDesign = {
        ...DEFAULT_DESIGN,
        ...(qr.design || {}),
      };
      await exportQrCode(qr.content, activeDesign, qr.name, format, 1024);
      toast.success(`Downloaded ${qr.name}.${format}`);
    } catch (err: any) {
      toast.error(err.message || 'Download failed');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 truncate max-w-xs">{qr.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="brand" size="sm">
                {qr.type}
              </Badge>
              <Badge variant={qr.status === 'ACTIVE' ? 'success' : 'neutral'} dot size="sm">
                {qr.status === 'ACTIVE' ? 'Active' : 'Disabled'}
              </Badge>
              {qr.isDynamic && (
                <Badge variant="warning" size="sm">
                  Dynamic
                </Badge>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6">
          {/* Centered QR Canvas */}
          <div className="flex justify-center">
            <div className="p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner max-w-[280px] w-full flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="w-full h-auto rounded-lg shadow-xs bg-white"
                style={{ maxWidth: '100%', maxHeight: 240 }}
              />
            </div>
          </div>

          {/* Details & Target Payload */}
          <div className="space-y-3">
            {qr.isDynamic ? (
              <>
                {/* Dynamic Scan URL */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase text-indigo-600 flex items-center gap-1">
                      <span>Dynamic Scan URL</span>
                      <span className="text-[10px] text-slate-400 font-normal">(Printed in QR)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyPayload}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      {copied ? <HiCheck className="w-3.5 h-3.5" /> : <HiOutlineClipboardCopy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied' : 'Copy Link'}
                    </button>
                  </div>
                  <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 font-mono text-xs text-indigo-950 break-all select-all flex items-center justify-between gap-2">
                    <span className="truncate">{qr.content}</span>
                    <a
                      href={qr.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 text-[11px] font-semibold underline shrink-0"
                    >
                      Test Scan
                    </a>
                  </div>
                </div>

                {/* Final Destination Website */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase text-slate-500">Destination Website</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 font-mono text-xs text-slate-700 break-all select-all">
                    {qr.destinationUrl || qr.metadata?.url || 'Not configured'}
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase text-slate-400">Target Content / Payload</span>
                  <button
                    type="button"
                    onClick={handleCopyPayload}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    {copied ? <HiCheck className="w-3.5 h-3.5" /> : <HiOutlineClipboardCopy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 font-mono text-xs text-slate-700 break-all select-all">
                  {qr.content}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2.5 pt-2 text-xs text-slate-500">
              <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-slate-400 font-medium">Scans</span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block">{qr.scanCount.toLocaleString()}</span>
              </div>
              <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-slate-400 font-medium">Last Scanned</span>
                <span className="text-xs font-semibold text-slate-700 mt-1 block truncate">
                  {qr.lastScannedAt ? new Date(qr.lastScannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                </span>
              </div>
              <div className="bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                <span className="block text-slate-400 font-medium">Created</span>
                <span className="text-xs font-semibold text-slate-700 mt-1 block">
                  {new Date(qr.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Direct Downloads */}
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase text-slate-400 block">Download As</span>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload('png')}
                disabled={Boolean(downloading)}
                className="text-xs font-semibold"
              >
                <HiOutlineDownload className="w-3.5 h-3.5 mr-1" />
                {downloading === 'png' ? '...' : 'PNG'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload('svg')}
                disabled={Boolean(downloading)}
                className="text-xs font-semibold"
              >
                <HiOutlineDownload className="w-3.5 h-3.5 mr-1" />
                {downloading === 'svg' ? '...' : 'SVG'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload('pdf')}
                disabled={Boolean(downloading)}
                className="text-xs font-semibold"
              >
                <HiOutlineDownload className="w-3.5 h-3.5 mr-1" />
                {downloading === 'pdf' ? '...' : 'PDF'}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-100">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                navigate(`/app/analytics?qrId=${qr.id}`);
              }}
            >
              <HiOutlineChartBar className="w-4 h-4 mr-1.5 text-indigo-600" />
              View Analytics
            </Button>
            {onEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(qr.id);
                }}
              >
                <HiOutlinePencilAlt className="w-4 h-4 mr-1.5" />
                Edit QR
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
