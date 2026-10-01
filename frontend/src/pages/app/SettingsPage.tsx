import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HiOutlineCog,
  HiOutlineSparkles,
  HiOutlineUserCircle,
  HiOutlineSave,
  HiOutlineUpload,
  HiOutlineTrash,
  HiOutlineKey,
  HiOutlineExclamationCircle,
  HiOutlineShieldCheck,
} from 'react-icons/hi';
import { Card, CardHeader, CardTitle, CardBody, CardFooter, CardDescription } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { brandingApi, BrandingSettings } from '../../services/branding.api';
import { renderQrToCanvas } from '../../utils/qrRenderer';
import { DEFAULT_DESIGN, QrCustomDesign } from '../../utils/qrTemplates';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'qr-defaults' | 'branding' | 'account'>('qr-defaults');
  const { user, deleteAccount, changePassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Branding & QR Defaults State
  const [branding, setBranding] = useState<BrandingSettings>({
    companyName: '',
    logo: '',
    primaryColor: '#0f172a',
    secondaryColor: '#4f46e5',
    defaultQrStyle: 'square',
    defaultQrSize: 512,
    defaultErrorCorrection: 'M',
    defaultDownloadFormat: 'png',
    defaultCta: 'Scan with your camera',
    defaultFooter: '',
  });

  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Account Deletion State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Canvases for previews
  const qrDefaultsCanvasRef = useRef<HTMLCanvasElement>(null);
  const brandingCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load user settings on mount
  useEffect(() => {
    setIsLoadingSettings(true);
    brandingApi
      .getBranding()
      .then((data) => {
        setBranding({
          companyName: data.companyName || '',
          logo: data.logo || '',
          primaryColor: data.primaryColor || '#0f172a',
          secondaryColor: data.secondaryColor || '#4f46e5',
          defaultQrStyle: data.defaultQrStyle || 'square',
          defaultQrSize: data.defaultQrSize || 512,
          defaultErrorCorrection: data.defaultErrorCorrection || 'M',
          defaultDownloadFormat: data.defaultDownloadFormat || 'png',
          defaultCta: data.defaultCta || 'Scan with your camera',
          defaultFooter: data.defaultFooter || '',
        });
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
        toast.error('Could not load current settings. Using standard defaults.');
      })
      .finally(() => {
        setIsLoadingSettings(false);
      });
  }, []);

  // Live Canvas Preview for QR Defaults
  useEffect(() => {
    if (activeTab === 'qr-defaults' && qrDefaultsCanvasRef.current) {
      const design: QrCustomDesign = {
        ...DEFAULT_DESIGN,
        size: branding.defaultQrSize || 512,
        errorCorrection: branding.defaultErrorCorrection || 'M',
        dotStyle:
          branding.defaultQrStyle === 'dots'
            ? 'dots'
            : branding.defaultQrStyle === 'rounded'
            ? 'rounded'
            : 'square',
        eyeFrameStyle:
          branding.defaultQrStyle === 'classy'
            ? 'leaf'
            : branding.defaultQrStyle === 'rounded'
            ? 'rounded'
            : 'square',
        eyeBallStyle: branding.defaultQrStyle === 'rounded' ? 'rounded' : 'square',
        fgColor: '#0f172a',
        eyeFrameColor: '#4f46e5',
        eyeBallColor: '#4f46e5',
      };

      const sampleUrl = 'https://qrmanager.app/default-preview';
      renderQrToCanvas(sampleUrl, design, qrDefaultsCanvasRef.current, 200).catch(console.error);
    }
  }, [activeTab, branding.defaultQrSize, branding.defaultErrorCorrection, branding.defaultQrStyle]);

  // Live Canvas Preview for Branding Tab
  useEffect(() => {
    if (activeTab === 'branding' && brandingCanvasRef.current) {
      const design: QrCustomDesign = {
        ...DEFAULT_DESIGN,
        fgColor: branding.primaryColor || '#0f172a',
        dotStyle:
          branding.defaultQrStyle === 'dots'
            ? 'dots'
            : branding.defaultQrStyle === 'rounded'
            ? 'rounded'
            : 'square',
        eyeFrameStyle:
          branding.defaultQrStyle === 'classy'
            ? 'leaf'
            : branding.defaultQrStyle === 'rounded'
            ? 'rounded'
            : 'square',
        eyeBallStyle: branding.defaultQrStyle === 'rounded' ? 'rounded' : 'square',
        eyeFrameColor: branding.secondaryColor || branding.primaryColor || '#0f172a',
        eyeBallColor: branding.primaryColor || '#0f172a',
        logo: branding.logo
          ? {
              dataUrl: branding.logo,
              size: 0.22,
              bgColor: '#ffffff',
              border: true,
            }
          : undefined,
        frame:
          branding.defaultCta || branding.defaultFooter
            ? {
                enabled: true,
                position: 'bottom',
                text: branding.defaultCta || branding.defaultFooter || '',
                bgColor: branding.primaryColor || '#0f172a',
                textColor: '#ffffff',
              }
            : undefined,
      };

      const sampleUrl = 'https://qrmanager.app/brand-preview';
      renderQrToCanvas(sampleUrl, design, brandingCanvasRef.current, 200).catch(console.error);
    }
  }, [activeTab, branding]);

  // Save QR Defaults
  const handleSaveQrDefaults = async () => {
    setIsSavingDefaults(true);
    try {
      const updated = await brandingApi.updateBranding(branding);
      setBranding(updated);
      toast.success(
        'Default QR size, style, and export format saved.',
        'Defaults Updated'
      );
    } catch (err: any) {
      console.error('Failed to save QR defaults:', err);
      toast.error(err?.response?.data?.message || err.message || 'Failed to save defaults');
    } finally {
      setIsSavingDefaults(false);
    }
  };

  // Save Branding
  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    try {
      const updated = await brandingApi.updateBranding(branding);
      setBranding(updated);
      toast.success(
        'Custom branding saved. New QR codes will use these presets.',
        'Branding Saved'
      );
    } catch (err: any) {
      console.error('Failed to save branding:', err);
      toast.error(err?.response?.data?.message || err.message || 'Failed to save brand settings');
    } finally {
      setIsSavingBranding(false);
    }
  };

  // Logo file upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, SVG).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo file size must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setBranding((prev) => ({ ...prev, logo: base64 }));
      toast.success('Logo uploaded and applied to preview');
    };
    reader.readAsDataURL(file);
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword, confirmNewPassword: confirmPassword });
      toast.success('Your password has been changed successfully.', 'Password Updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Failed to change password:', err);
      toast.error(err?.response?.data?.message || err.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle Account Deletion
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type DELETE in capital letters to confirm.');
      return;
    }

    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      toast.success('Your account and all associated QR codes have been permanently deleted.');
      navigate('/login');
    } catch (err: any) {
      console.error('Account deletion error:', err);
      toast.error(err?.response?.data?.message || err.message || 'Failed to delete account');
      setIsDeletingAccount(false);
    }
  };

  const tabs = [
    { id: 'qr-defaults', label: 'QR & Export Defaults', icon: <HiOutlineCog className="w-4 h-4" /> },
    { id: 'branding', label: 'Custom Branding', icon: <HiOutlineSparkles className="w-4 h-4" /> },
    { id: 'account', label: 'Account & Security', icon: <HiOutlineUserCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto pb-10">
      {/* Header */}
      <PageHeader
        title="Settings"
        description="Configure default QR code styles, brand identity, and manage account security."
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as any)} />

      {/* ========================================================= */}
      {/* TAB 1: QR & EXPORT DEFAULTS */}
      {/* ========================================================= */}
      {activeTab === 'qr-defaults' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-slate-200/80 shadow-xs">
              <CardHeader>
                <div>
                  <CardTitle>QR Generator Defaults</CardTitle>
                  <CardDescription>
                    These parameters are automatically applied when creating a new QR code.
                  </CardDescription>
                </div>
                <Badge variant="brand">{isLoadingSettings ? 'Loading...' : 'Active'}</Badge>
              </CardHeader>

              <CardBody className="space-y-4">
                {/* 1. Default QR Size */}
                <Select
                  label="Default Resolution (Size)"
                  value={String(branding.defaultQrSize || 512)}
                  onChange={(e) =>
                    setBranding({ ...branding, defaultQrSize: parseInt(e.target.value, 10) })
                  }
                  options={[
                    { value: '256', label: '256 x 256 px — Compact (Digital)' },
                    { value: '512', label: '512 x 512 px — Standard (Recommended)' },
                    { value: '1024', label: '1024 x 1024 px — High Resolution' },
                    { value: '2048', label: '2048 x 2048 px — Print Quality' },
                  ]}
                  helperText="Default pixel dimensions for generated QR canvases."
                />

                {/* 2. Default Error Correction */}
                <Select
                  label="Default Error Correction Level"
                  value={branding.defaultErrorCorrection || 'M'}
                  onChange={(e) =>
                    setBranding({
                      ...branding,
                      defaultErrorCorrection: e.target.value as 'L' | 'M' | 'Q' | 'H',
                    })
                  }
                  options={[
                    { value: 'L', label: 'Level L — Low (~7% recovery)' },
                    { value: 'M', label: 'Level M — Medium (~15% recovery, default)' },
                    { value: 'Q', label: 'Level Q — Quartile (~25% recovery)' },
                    { value: 'H', label: 'Level H — High (~30% recovery, recommended for logos)' },
                  ]}
                  helperText="Higher levels allow scanning even if partially covered by a logo."
                />

                {/* 3. Default QR Style */}
                <Select
                  label="Default Module Style"
                  value={branding.defaultQrStyle || 'square'}
                  onChange={(e) =>
                    setBranding({
                      ...branding,
                      defaultQrStyle: e.target.value as 'square' | 'dots' | 'rounded' | 'classy',
                    })
                  }
                  options={[
                    { value: 'square', label: 'Square — Standard crisp pixels' },
                    { value: 'dots', label: 'Dots — Rounded circular modules' },
                    { value: 'rounded', label: 'Rounded — Smooth rounded squares' },
                    { value: 'classy', label: 'Classy Leaf — Elegant curved corners' },
                  ]}
                />

                {/* 4. Default Download Format */}
                <Select
                  label="Default Download Format"
                  value={branding.defaultDownloadFormat || 'png'}
                  onChange={(e) =>
                    setBranding({
                      ...branding,
                      defaultDownloadFormat: e.target.value as 'png' | 'svg' | 'pdf' | 'jpg',
                    })
                  }
                  options={[
                    { value: 'png', label: 'PNG (.png) — Lossless raster image' },
                    { value: 'svg', label: 'SVG (.svg) — Scalable vector' },
                    { value: 'pdf', label: 'PDF (.pdf) — Document with cut guides' },
                    { value: 'jpg', label: 'JPG (.jpg) — Standard photo file' },
                  ]}
                />
              </CardBody>

              <CardFooter className="justify-between bg-slate-50/50 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Settings are automatically saved to your profile.
                </span>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveQrDefaults}
                  isLoading={isSavingDefaults}
                  loadingText="Saving Defaults..."
                  leftIcon={<HiOutlineSave className="w-4 h-4" />}
                >
                  Save Defaults
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6 border border-slate-200/80 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Default Preview</CardTitle>
                <CardDescription className="text-xs">Live render using default options</CardDescription>
              </CardHeader>
              <CardBody className="p-4 flex flex-col items-center justify-center space-y-3">
                <div className="p-3 bg-white rounded-xl shadow-2xs border border-slate-200">
                  <canvas ref={qrDefaultsCanvasRef} width={180} height={180} className="w-40 h-40 object-contain" />
                </div>
                <div className="text-center space-y-1 text-xs">
                  <div className="font-semibold text-slate-800">
                    {branding.defaultQrSize || 512}px &bull; Level {branding.defaultErrorCorrection || 'M'}
                  </div>
                  <div className="text-[11px] text-slate-500 capitalize">
                    {branding.defaultQrStyle || 'square'} &bull; {branding.defaultDownloadFormat?.toUpperCase() || 'PNG'}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CUSTOM BRANDING */}
      {/* ========================================================= */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-slate-200/80 shadow-xs">
              <CardHeader>
                <div>
                  <CardTitle>Brand Identity Defaults</CardTitle>
                  <CardDescription>
                    Configure company colors, embedded logo, and call-to-actions.
                  </CardDescription>
                </div>
                <Badge variant="brand">{isLoadingSettings ? 'Loading...' : 'Branding'}</Badge>
              </CardHeader>

              <CardBody className="space-y-4">
                {/* 1. Business Name */}
                <Input
                  label="Business / Organization Name"
                  placeholder="e.g. Acme Corporation"
                  value={branding.companyName || ''}
                  onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
                  helperText="Default name used when generating new QR codes."
                />

                {/* 2. Brand Colors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">Primary Brand Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.primaryColor || '#0f172a'}
                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                        className="w-9 h-9 p-0.5 rounded-lg border border-slate-300 cursor-pointer bg-white"
                      />
                      <input
                        type="text"
                        value={branding.primaryColor || '#0f172a'}
                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                        placeholder="#0f172a"
                        className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 block">Applied to QR modules</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">Secondary Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={branding.secondaryColor || '#4f46e5'}
                        onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                        className="w-9 h-9 p-0.5 rounded-lg border border-slate-300 cursor-pointer bg-white"
                      />
                      <input
                        type="text"
                        value={branding.secondaryColor || '#4f46e5'}
                        onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                        placeholder="#4f46e5"
                        className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 block">Used for corner eye rings</span>
                  </div>
                </div>

                {/* 3. Logo Upload */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 block">Default Brand Logo</label>
                  <div className="flex items-center gap-4 p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                    {branding.logo ? (
                      <div className="relative w-12 h-12 rounded-lg bg-white border border-slate-200 p-1 shrink-0 flex items-center justify-center shadow-2xs">
                        <img src={branding.logo} alt="Brand Logo" className="max-w-full max-h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setBranding({ ...branding, logo: '' })}
                          className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-500 text-white shadow-xs hover:bg-rose-600 transition-colors"
                          title="Remove logo"
                        >
                          <HiOutlineTrash className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center text-slate-400 shrink-0">
                        <HiOutlineUpload className="w-5 h-5" />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="cursor-pointer inline-flex items-center justify-center h-10 min-h-[40px] px-4 text-sm font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors gap-2">
                        <HiOutlineUpload className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>Upload Brand Logo</span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Square PNG recommended. Max 2MB file size.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 4. Default CTA & Footer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Default Call-to-Action (CTA)"
                    placeholder="e.g. Scan with Camera"
                    value={branding.defaultCta || ''}
                    onChange={(e) => setBranding({ ...branding, defaultCta: e.target.value })}
                    helperText="Preloaded banner text inside frame templates"
                  />

                  <Input
                    label="Default Footer Notice"
                    placeholder="e.g. Powered by Acme Corp"
                    value={branding.defaultFooter || ''}
                    onChange={(e) => setBranding({ ...branding, defaultFooter: e.target.value })}
                    helperText="Text beneath the QR code canvas"
                  />
                </div>
              </CardBody>

              <CardFooter className="justify-between bg-slate-50/50 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  New QR codes will offer to apply these presets.
                </span>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveBranding}
                  isLoading={isSavingBranding}
                  loadingText="Saving Branding..."
                  leftIcon={<HiOutlineSave className="w-4 h-4" />}
                >
                  Save Brand Settings
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Live Brand Preview Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6 border border-slate-200/80 shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Brand Preview</CardTitle>
                <CardDescription className="text-xs">Live render with brand palette</CardDescription>
              </CardHeader>
              <CardBody className="p-4 flex flex-col items-center justify-center space-y-3">
                <div className="p-3 bg-white rounded-xl shadow-2xs border border-slate-200">
                  <canvas ref={brandingCanvasRef} width={180} height={180} className="w-40 h-40 object-contain" />
                </div>
                <div className="text-center space-y-1">
                  <h4 className="text-xs font-bold text-slate-800">
                    {branding.companyName || 'Your Business Name'}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {branding.primaryColor || '#0f172a'} &bull; {branding.secondaryColor || '#4f46e5'}
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: ACCOUNT & SECURITY */}
      {/* ========================================================= */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Account Profile Summary Card */}
          <Card className="border border-slate-200/80 shadow-xs">
            <CardHeader>
              <div>
                <CardTitle>Account Overview</CardTitle>
                <CardDescription>Your registered account identity and status</CardDescription>
              </div>
              <Link to="/app/profile">
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<HiOutlineUserCircle className="w-4 h-4 text-indigo-600" />}
                >
                  Edit Profile
                </Button>
              </Link>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-3">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {user?.name?.slice(0, 2).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{user?.name}</h4>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                </div>
                <div className="text-xs text-slate-500 space-y-0.5 sm:text-right">
                  <span className="text-xs text-emerald-600 font-medium inline-flex items-center gap-1">
                    <HiOutlineShieldCheck className="w-3.5 h-3.5" /> Verified User
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Change Password Form */}
          <Card className="border border-slate-200/80 shadow-xs">
            <CardHeader>
              <div>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your login credentials securely</CardDescription>
              </div>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
              <CardBody className="space-y-4">
                <Input
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    helperText="Must be minimum 8 characters"
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                  />
                </div>
              </CardBody>
              <CardFooter className="justify-end bg-slate-50/50 border-t border-slate-100">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isChangingPassword}
                  loadingText="Updating..."
                  leftIcon={<HiOutlineKey className="w-4 h-4" />}
                >
                  Update Password
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Danger Zone: Delete Account */}
          <Card className="border-rose-200/80 bg-rose-50/20 shadow-xs">
            <CardHeader>
              <div>
                <CardTitle className="text-rose-700 flex items-center gap-1.5">
                  <HiOutlineExclamationCircle className="w-4 h-4 text-rose-600" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-rose-600/80">
                  Irreversible actions concerning your account and data
                </CardDescription>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Permanently delete your account and all associated QR codes, short links,
                and scan analytics. This operation cannot be reversed.
              </p>
              <div>
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => {
                    setDeleteConfirmText('');
                    setDeleteModalOpen(true);
                  }}
                  leftIcon={<HiOutlineTrash className="w-4 h-4" />}
                >
                  Delete Account
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Account Deletion Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Permanently Delete Account?"
        size="md"
      >
        <div className="space-y-4 text-left">
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-rose-900">
              <HiOutlineExclamationCircle className="w-4 h-4 text-rose-600 shrink-0" />
              This action cannot be undone
            </div>
            <p>
              All your QR codes, active dynamic redirects, customization configurations, and scan analytics
              will be permanently destroyed immediately.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Type <strong className="text-rose-600 font-mono">DELETE</strong> to confirm:
            </label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono text-xs"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setDeleteModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleDeleteAccount}
              isLoading={isDeletingAccount}
              loadingText="Deleting..."
              disabled={deleteConfirmText !== 'DELETE'}
              className="w-full sm:w-auto"
              leftIcon={<HiOutlineTrash className="w-4 h-4" />}
            >
              Permanently Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
