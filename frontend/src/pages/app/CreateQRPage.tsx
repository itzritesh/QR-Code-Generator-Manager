import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  HiOutlineLink,
  HiOutlineWifi,
  HiOutlineDocumentText,
  HiOutlineCreditCard,
  HiOutlineSparkles,
  HiOutlineDownload,
  HiOutlineCheck,
  HiOutlineRefresh,
  HiOutlineEye,
  HiOutlineEyeOff,
  HiOutlinePhotograph,
  HiOutlineTrash,
  HiOutlineColorSwatch,
  HiOutlineViewGrid,
  HiOutlineTag,
} from 'react-icons/hi';
import { Card, CardHeader, CardTitle, CardBody, CardDescription } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Switch } from '../../components/ui/Switch';
import { ColorInput } from '../../components/ui/ColorInput';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { useToast } from '../../components/ui/ToastContext';
import { qrApi, QrType } from '../../services/qr.api';
import { brandingApi, BrandingSettings } from '../../services/branding.api';
import {
  computeQrPayload,
  validateQrForm,
  WifiData,
  PaymentData,
} from '../../utils/qrEncoder';
import {
  QR_TEMPLATES,
  DEFAULT_DESIGN,
  QrCustomDesign,
  QrTemplate,
} from '../../utils/qrTemplates';
import {
  renderQrToCanvas,
  exportQrCode,
} from '../../utils/qrRenderer';
import { cn } from '../../utils/cn';

export const CreateQRPage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const templateParam = searchParams.get('template');
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Content Configuration State
  const [qrType, setQrType] = useState<QrType>('URL');
  const [qrName, setQrName] = useState('My Promotional QR');
  const [isDynamic, setIsDynamic] = useState<boolean>(true);
  const [existingScanUrl, setExistingScanUrl] = useState<string | null>(null);
  const [url, setUrl] = useState('https://example.com/promo');
  const [text, setText] = useState('Welcome to our digital experience! Scanned successfully.');
  const [wifiData, setWifiData] = useState<WifiData>({
    ssid: 'Office_Guest_WiFi',
    password: '',
    security: 'WPA',
    hidden: false,
  });
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData>({
    upiId: 'merchant@okhdfcbank',
    payeeName: 'Acme Store',
    amount: '',
    currency: 'INR',
    note: 'Counter 01',
    paymentUrl: '',
  });

  // Advanced Customization Design State
  const [design, setDesign] = useState<QrCustomDesign>({ ...DEFAULT_DESIGN });
  const [userBranding, setUserBranding] = useState<BrandingSettings | null>(null);

  // Active Customization Tab
  const [activeCustomTab, setActiveCustomTab] = useState<'templates' | 'colors' | 'shapes' | 'logo' | 'frame' | 'export'>('templates');

  // Export settings
  const [exportFormat, setExportFormat] = useState<'png' | 'svg' | 'pdf' | 'jpg'>('png');
  const [exportResolution, setExportResolution] = useState<number>(1024);

  // Status & processing
  const [isRendering, setIsRendering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [showRoutingDetails, setShowRoutingDetails] = useState(false);

  // Handle URL Template Parameter
  useEffect(() => {
    if (templateParam && !editId) {
      const foundTemplate = QR_TEMPLATES.find(
        (t) => t.id.toLowerCase() === templateParam.toLowerCase()
      );
      if (foundTemplate) {
        setDesign({ ...foundTemplate.design });
        if (foundTemplate.id === 'payment') {
          setQrType('PAYMENT');
          setQrName('Merchant Payment QR');
        } else if (foundTemplate.id === 'event') {
          setQrName('VIP Event Pass');
        } else if (foundTemplate.id === 'business') {
          setQrName('Corporate Digital Card');
        } else if (foundTemplate.id === 'social') {
          setQrName('Social Channels QR');
        }
        toast.success(`Loaded "${foundTemplate.name}" template configuration.`, 'Template Applied');
      }
    }
  }, [templateParam, editId]);

  // Load custom branding presets and defaults on mount
  useEffect(() => {
    brandingApi
      .getBranding()
      .then((branding) => {
        if (!branding) return;
        setUserBranding(branding);

        if (branding.defaultDownloadFormat) {
          setExportFormat(branding.defaultDownloadFormat);
        }
        if (branding.defaultQrSize) {
          setExportResolution(branding.defaultQrSize);
        }

        if (!editId && !templateParam) {
          setDesign((prev) => {
            const updated = { ...prev };
            if (branding.primaryColor) {
              updated.fgColor = branding.primaryColor;
              updated.eyeFrameColor = branding.primaryColor;
              updated.eyeBallColor = branding.primaryColor;
            }
            if (branding.defaultQrStyle) {
              const mappedStyle =
                branding.defaultQrStyle === 'classy'
                  ? 'classy'
                  : branding.defaultQrStyle === 'dots'
                  ? 'dots'
                  : branding.defaultQrStyle === 'rounded'
                  ? 'rounded'
                  : 'square';
              updated.dotStyle = mappedStyle;
            }
            if (branding.defaultQrSize) {
              updated.size = branding.defaultQrSize;
            }
            if (branding.defaultErrorCorrection) {
              updated.errorCorrection = branding.defaultErrorCorrection;
            }
            const logoSrc = branding.logo || branding.logoUrl;
            if (logoSrc) {
              updated.errorCorrection = 'H';
              updated.logo = {
                dataUrl: logoSrc,
                size: 0.22,
                bgColor: '#ffffff',
                border: true,
              };
            }
            if (branding.defaultCta || branding.defaultFooter) {
              updated.frame = {
                enabled: true,
                position: 'bottom',
                text: branding.defaultCta || branding.defaultFooter || 'SCAN ME',
                bgColor: branding.primaryColor || prev.fgColor || '#1e293b',
                textColor: '#ffffff',
              };
            }
            return updated;
          });
        }
      })
      .catch((err) => {
        console.warn('Could not load branding presets:', err);
      });
  }, [editId]);

  const handleApplyBrandDefaults = () => {
    if (!userBranding) return;
    setDesign((prev) => {
      const updated = { ...prev };
      if (userBranding.primaryColor) {
        updated.fgColor = userBranding.primaryColor;
        updated.eyeFrameColor = userBranding.primaryColor;
        updated.eyeBallColor = userBranding.primaryColor;
      }
      if (userBranding.defaultQrStyle) {
        const mappedStyle =
          userBranding.defaultQrStyle === 'classy'
            ? 'classy'
            : userBranding.defaultQrStyle === 'dots'
            ? 'dots'
            : userBranding.defaultQrStyle === 'rounded'
            ? 'rounded'
            : 'square';
        updated.dotStyle = mappedStyle;
      }
      if (userBranding.defaultQrSize) {
        updated.size = userBranding.defaultQrSize;
      }
      const logoSrc = userBranding.logo || userBranding.logoUrl;
      if (logoSrc) {
        updated.errorCorrection = 'H';
        updated.logo = {
          dataUrl: logoSrc,
          size: 0.22,
          bgColor: '#ffffff',
          border: true,
        };
      }
      if (userBranding.defaultCta || userBranding.defaultFooter) {
        updated.frame = {
          enabled: true,
          position: 'bottom',
          text: userBranding.defaultCta || userBranding.defaultFooter || 'SCAN ME',
          bgColor: userBranding.primaryColor || prev.fgColor || '#1e293b',
          textColor: '#ffffff',
        };
      }
      return updated;
    });
    toast.success('Applied your custom brand settings.', 'Brand Defaults Applied');
  };

  // Determine dynamic preview scan URL
  const dynamicScanUrl = useMemo(() => {
    if (existingScanUrl) return existingScanUrl;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://qrmanager.com';
    return `${origin}/q/live-preview`;
  }, [existingScanUrl]);

  // Compute live raw payload
  const currentPayload = useMemo(() => {
    if (isDynamic) {
      return dynamicScanUrl;
    }
    return computeQrPayload(qrType, {
      url,
      text,
      wifi: wifiData,
      payment: paymentData,
    });
  }, [qrType, isDynamic, dynamicScanUrl, url, text, wifiData, paymentData]);

  // Real-time canvas render effect
  useEffect(() => {
    let active = true;
    setIsRendering(true);

    const timer = setTimeout(async () => {
      if (canvasRef.current && active) {
        try {
          await renderQrToCanvas(currentPayload, design, canvasRef.current, 512);
        } catch (err) {
          console.error('Canvas render error:', err);
        } finally {
          if (active) setIsRendering(false);
        }
      }
    }, 50);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [currentPayload, design]);

  // Load existing QR if editing
  useEffect(() => {
    if (!editId) return;

    let isMounted = true;
    setIsLoadingExisting(true);

    qrApi
      .getQr(editId)
      .then((existing: any) => {
        if (!isMounted) return;

        setQrName(existing.name);
        setQrType(existing.type);
        setIsDynamic(existing.isDynamic);

        if (existing.isDynamic) {
          setExistingScanUrl(existing.content);
          if (existing.destinationUrl) {
            setUrl(existing.destinationUrl);
          }
        } else if (existing.type === 'URL') {
          setUrl(existing.content);
        }

        if (existing.metadata) {
          const meta = existing.metadata as any;
          if (meta.url) setUrl(meta.url);
          if (meta.text) setText(meta.text);
          if (meta.wifi) setWifiData(meta.wifi);
          if (meta.payment) setPaymentData(meta.payment);
        }

        if (existing.design) {
          setDesign({
            ...DEFAULT_DESIGN,
            ...existing.design,
          });
        }

        toast.success(`Loaded QR code: "${existing.name}"`);
      })
      .catch((err: any) => {
        console.error('Failed to fetch existing QR code for edit:', err);
        toast.error('Could not load specified QR code for editing.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingExisting(false);
      });

    return () => {
      isMounted = false;
    };
  }, [editId]);

  const handleApplyTemplate = (template: QrTemplate) => {
    setDesign({ ...template.design });
    toast.success(`Applied "${template.name}" template design.`, 'Template Applied');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg|svg\+xml|webp)$/i)) {
      toast.error('Supported formats: PNG, JPG, WebP, SVG.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo file size must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setDesign((prev) => ({
        ...prev,
        errorCorrection: 'H',
        logo: {
          dataUrl,
          size: 0.22,
          bgColor: '#ffffff',
          border: true,
        },
      }));
      toast.success('Logo uploaded and ECC set to High (H).');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setDesign((prev) => {
      const next = { ...prev };
      delete next.logo;
      return next;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Logo removed.');
  };

  const handleDownload = async () => {
    try {
      setIsExporting(true);
      await exportQrCode(currentPayload, design, qrName, exportFormat, exportResolution);
      toast.success(`Exported ${qrName}.${exportFormat}`);
    } catch (err: any) {
      console.error('Export failed:', err);
      toast.error('Failed to export QR code. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setDesign({ ...DEFAULT_DESIGN });
    toast.info('Restored default styling settings.');
  };

  const handleSaveQR = async () => {
    const validation = validateQrForm(qrName, qrType, {
      url,
      text,
      wifi: wifiData,
      payment: paymentData,
    });

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError, 'Validation Error');
      return;
    }

    setIsSaving(true);
    try {
      const destinationUrl = qrType === 'URL'
        ? url.trim()
        : qrType === 'TEXT'
          ? text.trim()
          : qrType === 'WIFI'
            ? wifiData.ssid.trim()
            : paymentData.upiId?.trim() || paymentData.paymentUrl?.trim();

      if (editId) {
        const updatedQr = await qrApi.updateQr(editId, {
          name: qrName.trim(),
          isDynamic,
          destinationUrl,
          metadata: {
            url: qrType === 'URL' ? url.trim() : undefined,
            text: qrType === 'TEXT' ? text.trim() : undefined,
            wifi: qrType === 'WIFI' ? wifiData : undefined,
            payment: qrType === 'PAYMENT' ? paymentData : undefined,
          },
          design,
        });

        setSaveSuccess(`"${updatedQr.name}" updated successfully.`);
        toast.success(`"${updatedQr.name}" has been updated.`, 'Changes Saved');
        setTimeout(() => navigate('/app/qr-codes'), 900);
      } else {
        const savedQr = await qrApi.createQr({
          name: qrName.trim(),
          type: qrType,
          isDynamic,
          destinationUrl,
          metadata: {
            url: qrType === 'URL' ? url.trim() : undefined,
            text: qrType === 'TEXT' ? text.trim() : undefined,
            wifi: qrType === 'WIFI' ? wifiData : undefined,
            payment: qrType === 'PAYMENT' ? paymentData : undefined,
          },
          design,
        });

        setSaveSuccess(`"${savedQr.name}" successfully created and saved.`);
        toast.success(`"${savedQr.name}" has been saved.`, 'Saved');
        setTimeout(() => navigate('/app/qr-codes'), 900);
      }
    } catch (err: any) {
      console.error('Failed to save QR code:', err);
      toast.error(err.message || 'Failed to save QR code. Please try again.', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  const qrTypeOptions: Array<{ id: QrType; label: string; icon: React.ReactNode }> = [
    { id: 'URL', label: 'Website URL', icon: <HiOutlineLink className="w-4 h-4" /> },
    { id: 'TEXT', label: 'Plain Text', icon: <HiOutlineDocumentText className="w-4 h-4" /> },
    { id: 'WIFI', label: 'Wi-Fi Network', icon: <HiOutlineWifi className="w-4 h-4" /> },
    { id: 'PAYMENT', label: 'Payment / UPI', icon: <HiOutlineCreditCard className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Page Header */}
      <PageHeader
        title={editId ? 'Edit QR Code' : 'Create QR Code'}
        description={
          editId
            ? "Update this QR code's destination, metadata, and styling configuration."
            : 'Configure content, customize style and corner eyes, and preview scannability in real time.'
        }
        badge={
          editId ? (
            <Badge variant="brand" size="sm">
              Edit Mode
            </Badge>
          ) : isLoadingExisting ? (
            <Badge variant="neutral" size="sm">
              Loading...
            </Badge>
          ) : undefined
        }
      />

      {saveSuccess && (
        <Alert
          variant="success"
          title="QR Code Successfully Saved"
          onDismiss={() => setSaveSuccess(null)}
        >
          {saveSuccess}
        </Alert>
      )}

      {/* Main Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT PANEL: Inputs & Customization (7 cols)               */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card 1: Content Destination */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>1. Content Destination</CardTitle>
                <CardDescription>Select type and enter target information</CardDescription>
              </div>
            </CardHeader>
            <CardBody className="space-y-4 pt-3">
              {/* Type Switcher Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {qrTypeOptions.map((item) => {
                  const active = qrType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setQrType(item.id);
                        setFormErrors({});
                      }}
                      className={cn(
                        'flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all cursor-pointer select-none',
                        active
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold ring-1 ring-indigo-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600'
                      )}
                    >
                      <div
                        className={cn(
                          'p-1.5 rounded-md mb-1 transition-colors',
                          active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                        )}
                      >
                        {item.icon}
                      </div>
                      <span className="text-xs leading-none">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Shared QR Name */}
              <Input
                label="QR Code Name"
                placeholder="e.g. Summer Promotion 2026"
                value={qrName}
                onChange={(e) => setQrName(e.target.value)}
                error={formErrors.name}
                helperText="Internal name for organizing your saved codes."
                required
              />

              {/* URL Type */}
              {qrType === 'URL' && (
                <div className="space-y-3 pt-1">
                  <Input
                    label="Website URL"
                    type="url"
                    placeholder="https://example.com/promo"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    error={formErrors.url}
                    leftIcon={<HiOutlineLink className="w-4 h-4 text-slate-400" />}
                    helperText="Destination URL where visitors are redirected when scanning."
                    required
                  />
                </div>
              )}

              {/* TEXT Type */}
              {qrType === 'TEXT' && (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Text Content <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter any text message, notice, or note..."
                    className={cn(
                      'w-full px-3 py-2 text-xs sm:text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 transition-all',
                      formErrors.text
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
                        : 'border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'
                    )}
                  />
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Preserves line breaks and Unicode.</span>
                    <span className={text.length > 2000 ? 'text-rose-600 font-bold' : ''}>
                      {text.length}/2,000
                    </span>
                  </div>
                </div>
              )}

              {/* WI-FI Type */}
              {qrType === 'WIFI' && (
                <div className="space-y-3">
                  <Input
                    label="Network Name (SSID)"
                    placeholder="e.g. Office_Guest_WiFi"
                    value={wifiData.ssid}
                    onChange={(e) => setWifiData({ ...wifiData, ssid: e.target.value })}
                    error={formErrors.ssid}
                    leftIcon={<HiOutlineWifi className="w-4 h-4 text-slate-400" />}
                    required
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select
                      label="Security"
                      value={wifiData.security}
                      onChange={(e) =>
                        setWifiData({ ...wifiData, security: e.target.value as any })
                      }
                      options={[
                        { value: 'WPA', label: 'WPA / WPA2 / WPA3' },
                        { value: 'WEP', label: 'WEP' },
                        { value: 'nopass', label: 'Open (No password)' },
                      ]}
                    />

                    {wifiData.security !== 'nopass' && (
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showWifiPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={wifiData.password || ''}
                            onChange={(e) =>
                              setWifiData({ ...wifiData, password: e.target.value })
                            }
                            className={cn(
                              'w-full pl-3 pr-9 py-2 text-xs sm:text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 transition-all',
                              formErrors.password
                                ? 'border-rose-400 focus:border-rose-500'
                                : 'border-slate-200 focus:border-indigo-500'
                            )}
                          />
                          <button
                            type="button"
                            onClick={() => setShowWifiPassword(!showWifiPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showWifiPassword ? (
                              <HiOutlineEyeOff className="w-4 h-4" />
                            ) : (
                              <HiOutlineEye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <Switch
                    checked={Boolean(wifiData.hidden)}
                    onChange={(checked) => setWifiData({ ...wifiData, hidden: checked })}
                    label="Hidden Network"
                    description="Enable if SSID is not broadcasting publicly."
                  />
                </div>
              )}

              {/* PAYMENT Type */}
              {qrType === 'PAYMENT' && (
                <div className="space-y-3">
                  <Input
                    label="UPI ID / VPA"
                    placeholder="merchant@upi"
                    value={paymentData.upiId}
                    onChange={(e) => setPaymentData({ ...paymentData, upiId: e.target.value })}
                    error={formErrors.upiId}
                    leftIcon={<HiOutlineCreditCard className="w-4 h-4 text-slate-400" />}
                    required
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Payee Name"
                      placeholder="e.g. Acme Store"
                      value={paymentData.payeeName}
                      onChange={(e) =>
                        setPaymentData({ ...paymentData, payeeName: e.target.value })
                      }
                      error={formErrors.payeeName}
                      required
                    />
                    <Input
                      label="Amount (Optional)"
                      type="number"
                      placeholder="0.00"
                      value={paymentData.amount || ''}
                      onChange={(e) =>
                        setPaymentData({ ...paymentData, amount: e.target.value })
                      }
                    />
                  </div>
                  <Input
                    label="Payment Note / Ref"
                    placeholder="e.g. Counter #01"
                    value={paymentData.note || ''}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, note: e.target.value })
                    }
                  />
                </div>
              )}

              {/* Dynamic QR Toggle & Analytics Info Box (Applicable to All QR Types) */}
              <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/60 space-y-2.5 mt-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-950">Dynamic QR & Analytics</span>
                      <Badge variant="brand" size="sm">Recommended</Badge>
                    </div>
                    <p className="text-[11px] text-indigo-800/85">
                      {isDynamic ? (
                        qrType === 'URL'
                          ? 'Routes scans through a smart redirect link. Allows editing destination anytime & tracks live scan counts in analytics.'
                          : qrType === 'TEXT'
                          ? 'Displays a responsive mobile card with 1-tap "Copy Text". Allows updating text anytime without reprinting & tracks scans in analytics!'
                          : qrType === 'WIFI'
                          ? 'Displays network details with 1-tap "Copy Wi-Fi Password". Allows updating Wi-Fi settings anytime without reprinting & tracks scans!'
                          : 'Displays a mobile checkout card with 1-tap "Pay via UPI App" & "Copy UPI ID". Allows updating payee or amounts anytime & tracks scans!'
                      ) : (
                        'Static mode (offline). Encodes data directly into the QR pattern. Scanned offline by cameras; cannot track scans in analytics.'
                      )}
                    </p>
                  </div>
                  <Switch
                    checked={isDynamic}
                    onChange={setIsDynamic}
                    disabled={Boolean(editId && isDynamic)}
                  />
                </div>

                {isDynamic && existingScanUrl && (
                  <div className="pt-2 border-t border-indigo-100 text-xs flex items-center justify-between text-indigo-900 gap-2">
                    <div className="truncate max-w-[280px]">
                      <span className="text-[10px] uppercase font-semibold text-indigo-600 block">Shortlink Scan URL:</span>
                      <span className="font-mono text-xs">{existingScanUrl}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(existingScanUrl);
                        toast.success('Copied shortlink URL');
                      }}
                      className="px-2 py-1 text-[11px] font-semibold bg-white border border-indigo-200 rounded-lg text-indigo-600 hover:bg-indigo-50 shrink-0 cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Card 2: Customization Studio */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>2. Customization Studio</CardTitle>
                <CardDescription>Templates, colors, patterns, corner eyes, logo, and frame banner</CardDescription>
              </div>
            </CardHeader>
            <CardBody className="space-y-4 pt-3">
              {/* Responsive Segmented Tab Control (No Horizontal Overflow) */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-1 bg-slate-100 rounded-lg text-center">
                {[
                  { id: 'templates', label: 'Templates', icon: <HiOutlineViewGrid className="w-3.5 h-3.5" /> },
                  { id: 'colors', label: 'Colors', icon: <HiOutlineColorSwatch className="w-3.5 h-3.5" /> },
                  { id: 'shapes', label: 'Style & Eyes', icon: <HiOutlineSparkles className="w-3.5 h-3.5" /> },
                  { id: 'logo', label: 'Logo', icon: <HiOutlinePhotograph className="w-3.5 h-3.5" /> },
                  { id: 'frame', label: 'Frame', icon: <HiOutlineTag className="w-3.5 h-3.5" /> },
                  { id: 'export', label: 'Export', icon: <HiOutlineDownload className="w-3.5 h-3.5" /> },
                ].map((tab) => {
                  const active = activeCustomTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveCustomTab(tab.id as any)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs transition-all cursor-pointer select-none',
                        active
                          ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium'
                      )}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* ---------------- SUB-TAB: TEMPLATES ---------------- */}
              {activeCustomTab === 'templates' && (
                <div className="space-y-4">
                  {/* Brand Preset Card */}
                  {userBranding && (userBranding.companyName || userBranding.primaryColor || userBranding.logo || userBranding.logoUrl) && (
                    <div
                      onClick={handleApplyBrandDefaults}
                      className="p-3 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 transition-all cursor-pointer text-left flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        {userBranding.logo || userBranding.logoUrl ? (
                          <img
                            src={userBranding.logo || userBranding.logoUrl}
                            alt="Brand Logo"
                            className="w-8 h-8 object-contain rounded-md border border-indigo-100 bg-white p-0.5"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-md flex items-center justify-center font-bold text-white text-xs"
                            style={{ backgroundColor: userBranding.primaryColor || '#4f46e5' }}
                          >
                            {(userBranding.companyName || 'B').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-semibold text-xs text-indigo-950">
                              {userBranding.companyName || 'Custom Brand Profile'}
                            </h4>
                            <span className="text-[10px] text-indigo-600 bg-indigo-100 px-1 py-0.2 rounded font-medium">
                              Brand Kit
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Apply default brand colors, style &amp; logo.
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApplyBrandDefaults();
                        }}
                        className="text-xs"
                      >
                        Apply
                      </Button>
                    </div>
                  )}

                  {/* Template Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {QR_TEMPLATES.map((tmpl) => (
                      <div
                        key={tmpl.id}
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="p-2.5 rounded-lg border border-slate-200/80 bg-white hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer text-left flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-slate-800">{tmpl.name}</span>
                            <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                              {tmpl.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {tmpl.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 mt-2.5 pt-1.5 border-t border-slate-100">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-200 inline-block"
                            style={{ backgroundColor: tmpl.design.fgColor }}
                          />
                          <span className="text-[10px] text-slate-400 capitalize">{tmpl.design.dotStyle}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ---------------- SUB-TAB: COLORS ---------------- */}
              {activeCustomTab === 'colors' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ColorInput
                      label="Foreground / QR Color"
                      value={design.fgColor}
                      onChange={(color) => setDesign({ ...design, fgColor: color })}
                      helperText="Main color for QR modules."
                    />
                    <ColorInput
                      label="Background Color"
                      value={design.bgColor}
                      onChange={(color) => setDesign({ ...design, bgColor: color })}
                      helperText="Background behind code."
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <Switch
                      checked={Boolean(design.gradient?.enabled)}
                      onChange={(checked) =>
                        setDesign({
                          ...design,
                          gradient: {
                            enabled: checked,
                            type: design.gradient?.type || 'linear',
                            startColor: design.gradient?.startColor || design.fgColor,
                            endColor: design.gradient?.endColor || '#4f46e5',
                          },
                        })
                      }
                      label="Gradient Modules"
                      description="Apply smooth color transition across code modules."
                    />

                    {design.gradient?.enabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200/70">
                        <Select
                          label="Gradient Style"
                          value={design.gradient.type}
                          onChange={(e) =>
                            setDesign({
                              ...design,
                              gradient: {
                                ...design.gradient!,
                                type: e.target.value as any,
                              },
                            })
                          }
                          options={[
                            { value: 'linear', label: 'Linear' },
                            { value: 'radial', label: 'Radial' },
                            { value: 'diagonal', label: 'Diagonal' },
                          ]}
                        />
                        <ColorInput
                          label="Start Color"
                          value={design.gradient.startColor || design.fgColor}
                          onChange={(color) =>
                            setDesign({
                              ...design,
                              gradient: {
                                ...design.gradient!,
                                startColor: color,
                              },
                            })
                          }
                        />
                        <ColorInput
                          label="End Color"
                          value={design.gradient.endColor || '#4f46e5'}
                          onChange={(color) =>
                            setDesign({
                              ...design,
                              gradient: {
                                ...design.gradient!,
                                endColor: color,
                              },
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ---------------- SUB-TAB: SHAPES & EYES ---------------- */}
              {activeCustomTab === 'shapes' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Module Dot Style
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['square', 'dots', 'rounded', 'classy'] as const).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setDesign({ ...design, dotStyle: style })}
                          className={cn(
                            'p-2.5 rounded-lg border text-xs font-medium capitalize text-center transition-all cursor-pointer',
                            design.dotStyle === style
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-500/20'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          )}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Corner Eye Shape
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['square', 'rounded', 'leaf', 'circle'] as const).map((shape) => (
                        <button
                          key={shape}
                          type="button"
                          onClick={() => setDesign({ ...design, eyeFrameStyle: shape })}
                          className={cn(
                            'p-2.5 rounded-lg border text-xs font-medium capitalize text-center transition-all cursor-pointer',
                            design.eyeFrameStyle === shape
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-500/20'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          )}
                        >
                          {shape}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <ColorInput
                      label="Eye Frame Color"
                      value={design.eyeFrameColor || design.fgColor}
                      onChange={(color) => setDesign({ ...design, eyeFrameColor: color })}
                    />
                    <ColorInput
                      label="Eye Center Pupil Color"
                      value={design.eyeBallColor || design.fgColor}
                      onChange={(color) => setDesign({ ...design, eyeBallColor: color })}
                    />
                  </div>
                </div>
              )}

              {/* ---------------- SUB-TAB: LOGO OVERLAY ---------------- */}
              {activeCustomTab === 'logo' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs"
                    >
                      <HiOutlinePhotograph className="w-4 h-4 mr-1.5 text-indigo-600" />
                      {design.logo?.dataUrl ? 'Change Logo' : 'Upload Center Logo'}
                    </Button>

                    {design.logo?.dataUrl && (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="text-xs"
                      >
                        <HiOutlineTrash className="w-4 h-4 mr-1.5" />
                        Remove Logo
                      </Button>
                    )}
                  </div>

                  {design.logo?.dataUrl && (
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700">Logo Scale</span>
                          <span className="text-slate-500 font-mono">
                            {Math.round((design.logo.size || 0.22) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.10"
                          max="0.30"
                          step="0.02"
                          value={design.logo.size || 0.22}
                          onChange={(e) =>
                            setDesign({
                              ...design,
                              logo: {
                                ...design.logo!,
                                size: parseFloat(e.target.value),
                              },
                            })
                          }
                          className="w-full accent-indigo-600"
                        />
                      </div>

                      <ColorInput
                        label="Logo Badge Background"
                        value={design.logo.bgColor || '#ffffff'}
                        onChange={(color) =>
                          setDesign({
                            ...design,
                            logo: { ...design.logo!, bgColor: color },
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ---------------- SUB-TAB: FRAME BANNER ---------------- */}
              {activeCustomTab === 'frame' && (
                <div className="space-y-4">
                  <Switch
                    checked={Boolean(design.frame?.enabled)}
                    onChange={(checked) =>
                      setDesign({
                        ...design,
                        frame: {
                          enabled: checked,
                          text: design.frame?.text || 'SCAN ME',
                          position: design.frame?.position || 'bottom',
                          bgColor: design.frame?.bgColor || '#1e3a8a',
                          textColor: design.frame?.textColor || '#ffffff',
                        },
                      })
                    }
                    label="Enable CTA Frame Banner"
                    description="Adds a call-to-action banner around the QR code."
                  />

                  {design.frame?.enabled && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <Input
                        label="CTA Banner Text"
                        value={design.frame.text}
                        onChange={(e) =>
                          setDesign({
                            ...design,
                            frame: { ...design.frame!, text: e.target.value },
                          })
                        }
                        placeholder="e.g. SCAN ME"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Select
                          label="Position"
                          value={design.frame.position}
                          onChange={(e) =>
                            setDesign({
                              ...design,
                              frame: { ...design.frame!, position: e.target.value as any },
                            })
                          }
                          options={[
                            { value: 'bottom', label: 'Bottom' },
                            { value: 'top', label: 'Top' },
                          ]}
                        />
                        <ColorInput
                          label="Banner Color"
                          value={design.frame.bgColor}
                          onChange={(color) =>
                            setDesign({
                              ...design,
                              frame: { ...design.frame!, bgColor: color },
                            })
                          }
                        />
                        <ColorInput
                          label="Text Color"
                          value={design.frame.textColor}
                          onChange={(color) =>
                            setDesign({
                              ...design,
                              frame: { ...design.frame!, textColor: color },
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ---------------- SUB-TAB: EXPORT OPTIONS ---------------- */}
              {activeCustomTab === 'export' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Error Correction Level"
                      value={design.logo?.dataUrl ? 'H' : design.errorCorrection}
                      disabled={Boolean(design.logo?.dataUrl)}
                      onChange={(e) =>
                        setDesign({ ...design, errorCorrection: e.target.value as any })
                      }
                      options={[
                        { value: 'L', label: 'Low (~7% recovery)' },
                        { value: 'M', label: 'Medium (~15% recovery)' },
                        { value: 'Q', label: 'Quartile (~25% recovery)' },
                        { value: 'H', label: 'High (~30% recovery)' },
                      ]}
                      helperText={
                        design.logo?.dataUrl
                          ? 'Locked to High (H) because a logo is active.'
                          : 'Higher levels tolerate camera dirt/obstruction.'
                      }
                    />

                    <Select
                      label="Quiet Zone Margin"
                      value={String(design.margin)}
                      onChange={(e) =>
                        setDesign({ ...design, margin: Number(e.target.value) })
                      }
                      options={[
                        { value: '0', label: '0 Modules' },
                        { value: '1', label: '1 Module' },
                        { value: '2', label: '2 Modules' },
                        { value: '4', label: '4 Modules' },
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <Select
                      label="Export Format"
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as any)}
                      options={[
                        { value: 'png', label: 'PNG (Raster Image)' },
                        { value: 'svg', label: 'SVG (Vector Scalable)' },
                        { value: 'pdf', label: 'PDF (Print Document)' },
                        { value: 'jpg', label: 'JPG (Web Image)' },
                      ]}
                    />

                    <Select
                      label="Resolution"
                      value={String(exportResolution)}
                      onChange={(e) => setExportResolution(Number(e.target.value))}
                      options={[
                        { value: '512', label: '512 x 512 px' },
                        { value: '1024', label: '1024 x 1024 px' },
                        { value: '2048', label: '2048 x 2048 px' },
                      ]}
                    />
                  </div>
                </div>
              )}
              {/* Bottom Form Action Footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleReset}
                  disabled={isSaving}
                  leftIcon={<HiOutlineRefresh className="w-4 h-4" />}
                  className="w-full sm:w-auto"
                >
                  Reset
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveQR}
                  isLoading={isSaving}
                  loadingText={editId ? 'Updating...' : 'Saving...'}
                  leftIcon={<HiOutlineCheck className="w-4 h-4" />}
                  className="w-full sm:w-auto"
                >
                  {editId ? 'Update QR Code' : 'Save QR Code'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* ========================================================= */}
        {/* RIGHT PANEL: Live Sticky Studio Preview (5 cols)           */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 sticky top-2 z-10 space-y-3">
          <Card className="border-slate-200/90 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-2.5 px-3.5">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5">
                  <HiOutlineSparkles className="w-4 h-4 text-indigo-600" />
                  <CardTitle className="text-xs sm:text-sm font-semibold text-slate-800">Live Preview</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="brand" size="sm" className="text-[10px] px-1.5 py-0">
                    {qrType}
                  </Badge>
                  {isDynamic && (
                    <Badge variant="warning" size="sm" className="text-[10px] px-1.5 py-0">
                      Dynamic
                    </Badge>
                  )}
                  {design.logo?.dataUrl && (
                    <Badge variant="success" size="sm" className="text-[10px] px-1.5 py-0">
                      Logo
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardBody className="p-3 sm:p-3.5 flex flex-col items-center justify-center space-y-2">
              {/* Dynamic Live Canvas Container */}
              <div
                className="p-2 sm:p-2.5 rounded-xl shadow-inner border border-slate-200/90 flex items-center justify-center relative overflow-hidden max-w-full"
                style={{ backgroundColor: design.bgColor }}
              >
                <canvas
                  ref={canvasRef}
                  className="max-w-full w-40 sm:w-44 lg:w-44 h-auto rounded-md object-contain transition-opacity duration-150"
                  style={{ maxHeight: '180px' }}
                />

                {isRendering && (
                  <div className="absolute inset-0 bg-white/40 backdrop-blur-2xs flex items-center justify-center rounded-xl transition-opacity">
                    <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full shadow-xs">
                      Updating...
                    </span>
                  </div>
                )}
              </div>

              {/* Title & Status Badges */}
              <div className="w-full flex items-center justify-between gap-1 text-xs px-0.5">
                <span className="font-bold text-slate-900 truncate max-w-[150px] text-xs" title={qrName || 'Untitled QR Code'}>
                  {qrName || 'Untitled QR Code'}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70">
                    ECC {design.logo?.dataUrl ? 'H' : design.errorCorrection}
                  </span>
                  <span className="text-[9px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70 capitalize">
                    {design.dotStyle}
                  </span>
                  <span className="text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    ✓ Live
                  </span>
                </div>
              </div>

              {/* Collapsible Destination & Routing Details Drawer */}
              <div className="w-full">
                <button
                  type="button"
                  onClick={() => setShowRoutingDetails(!showRoutingDetails)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-[11px] text-slate-600 transition-colors cursor-pointer select-none"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isDynamic ? 'bg-indigo-500' : 'bg-slate-400')} />
                    <span className="font-medium truncate text-slate-700">
                      {isDynamic ? 'Dynamic QR Link' : 'Static Offline QR'}
                    </span>
                  </span>
                  <span className="text-[10px] font-semibold text-indigo-600 shrink-0 ml-1">
                    {showRoutingDetails ? 'Hide Details ▲' : 'Details ▼'}
                  </span>
                </button>

                {showRoutingDetails && (
                  <div className="mt-1.5 p-2 rounded-lg bg-indigo-50/50 border border-indigo-100 text-left text-xs space-y-1.5 transition-all">
                    {isDynamic ? (
                      <>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-indigo-700 block mb-0.5">
                            Printed Dynamic Scan URL:
                          </span>
                          <p className="font-mono text-[10px] text-indigo-950 bg-white p-1 rounded border border-indigo-200/70 truncate select-all">
                            {dynamicScanUrl}
                          </p>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">
                            {qrType === 'URL' ? 'Redirect Destination:' : qrType === 'TEXT' ? 'Dynamic Text Payload:' : qrType === 'WIFI' ? 'Dynamic Wi-Fi Network:' : 'Dynamic Payment Target:'}
                          </span>
                          <p className="text-[10px] text-slate-700 truncate font-mono bg-white p-1 rounded border border-slate-200 select-all">
                            {qrType === 'URL' ? (url || '(empty)') : qrType === 'TEXT' ? (text || '(empty)') : qrType === 'WIFI' ? (`SSID: ${wifiData.ssid || '(empty)'}`) : (`UPI: ${paymentData.upiId || paymentData.paymentUrl || '(empty)'}`)}
                          </p>
                        </div>
                        <span className="text-[9px] text-indigo-700 block font-medium">
                          ✓ Scans route through server to track scan count & analytics.
                        </span>
                      </>
                    ) : (
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-500 block mb-0.5">
                          Static QR Payload:
                        </span>
                        <p className="font-mono text-[10px] text-slate-700 bg-white p-1 rounded border border-slate-200 truncate select-all">
                          {currentPayload || '(empty)'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Direct Actions in One Sleek Compact Row */}
              <div className="w-full flex items-center gap-1.5 pt-2 border-t border-slate-100">
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={handleSaveQR}
                  isLoading={isSaving}
                  loadingText={editId ? 'Updating...' : 'Saving...'}
                  leftIcon={<HiOutlineCheck className="w-4 h-4" />}
                  className="flex-1 justify-center shadow-xs text-xs font-semibold py-2"
                >
                  {editId ? 'Update QR' : 'Save QR'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  isLoading={isExporting}
                  leftIcon={<HiOutlineDownload className="w-3.5 h-3.5" />}
                  className="shrink-0 text-xs py-2 px-2.5 bg-white"
                  title={`Download ${exportFormat.toUpperCase()}`}
                >
                  {exportFormat.toUpperCase()}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={isSaving}
                  className="shrink-0 text-xs py-2 px-2 text-slate-500 hover:text-slate-800"
                  title="Reset Defaults"
                >
                  <HiOutlineRefresh className="w-4 h-4" />
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
