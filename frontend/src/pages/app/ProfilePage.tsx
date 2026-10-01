import React, { useState, useEffect, useRef } from 'react';
import {
  HiOutlineUser,
  HiOutlineMail,
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
  HiOutlineCalendar,
  HiOutlineUpload,
  HiOutlineTrash,
  HiOutlineQrcode,
  HiOutlineChartBar,
  HiOutlineCheckCircle,
} from 'react-icons/hi';
import { Card, CardHeader, CardTitle, CardBody, CardFooter, CardDescription } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { qrApi } from '../../services/qr.api';
import { analyticsApi } from '../../services/analytics.api';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Statistics State
  const [totalQrs, setTotalQrs] = useState<number | null>(null);
  const [totalScans, setTotalScans] = useState<number | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Sync state on user context change
  useEffect(() => {
    if (user) {
      setName(user.name);
      setAvatar(user.avatar || null);
    }
  }, [user]);

  // Load real user stats
  useEffect(() => {
    let active = true;
    setIsLoadingStats(true);

    Promise.all([
      qrApi.listQrs({ limit: 1 }).then((res) => res.pagination.total).catch(() => 0),
      analyticsApi.getOverview({ range: '30d' }).then((res) => res.metrics.totalScans).catch(() => 0),
    ])
      .then(([qrCount, scanCount]) => {
        if (!active) return;
        setTotalQrs(qrCount);
        setTotalScans(scanCount);
      })
      .finally(() => {
        if (active) setIsLoadingStats(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const getInitials = (n?: string) => {
    if (!n) return 'U';
    return (
      n
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U'
    );
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Active';

  // Avatar Upload Handler
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      toast.error('Only PNG, JPG, WebP, and SVG images are allowed.', 'Invalid Image Format');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar file size must be less than 2MB.', 'File Too Large');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatar(result);
        toast.info('New avatar loaded. Click "Save Changes" to persist.', 'Avatar Loaded');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    toast.info('Avatar reset to default initials.', 'Avatar Reset');
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Full Name cannot be empty.', 'Validation Error');
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile({
        name: name.trim(),
        avatar: avatar,
      });
      toast.success('Your profile details and avatar have been saved.', 'Profile Updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.', 'Error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Password Change Save
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Please enter your current password.', 'Validation Error');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.', 'Validation Error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('New password confirmation does not match.', 'Password Mismatch');
      return;
    }

    setIsSavingPassword(true);
    try {
      const msg = await changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      toast.success(msg || 'Password updated successfully.', 'Password Changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password.', 'Error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto pb-8">
      {/* Page Header */}
      <PageHeader
        title="Profile"
        description="Manage your account profile, personal details, and sign-in credentials."
      />

      {/* Top Profile Summary Card */}
      <Card className="border border-slate-200/80 shadow-xs">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4">
          {/* Avatar with edit overlay */}
          <div className="relative group shrink-0">
            {avatar ? (
              <img
                src={avatar}
                alt={user?.name || 'User Avatar'}
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl object-cover border border-slate-200 shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl sm:text-2xl shadow-xs">
                {getInitials(name || user?.name)}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-slate-900/50 rounded-xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Upload new avatar"
            >
              <HiOutlineUpload className="w-5 h-5" />
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
            onChange={handleAvatarFile}
            className="hidden"
          />

          {/* Profile Identity Details */}
          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">{name || 'Account User'}</h3>
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <Badge variant="success" size="sm" dot>
                  Active Account
                </Badge>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-mono">{user?.email}</p>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-500 pt-0.5">
              <HiOutlineCalendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Member since {formattedDate}</span>
            </div>

            {/* Avatar Action Buttons */}
            <div className="pt-2 flex items-center justify-center sm:justify-start gap-3">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<HiOutlineUpload className="w-4 h-4 text-slate-500" />}
              >
                Change Avatar
              </Button>
              {avatar && (
                <Button
                  type="button"
                  variant="danger"
                  size="md"
                  onClick={handleRemoveAvatar}
                  leftIcon={<HiOutlineTrash className="w-4 h-4" />}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Real Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/50 border-t border-slate-200/80">
          <div className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <HiOutlineQrcode className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Total QR Codes</span>
              <span className="text-base font-bold text-slate-900">
                {isLoadingStats ? '...' : (totalQrs?.toLocaleString() ?? '0')}
              </span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <HiOutlineChartBar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Total Scans (30 Days)</span>
              <span className="text-base font-bold text-slate-900">
                {isLoadingStats ? '...' : (totalScans?.toLocaleString() ?? '0')}
              </span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <HiOutlineShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Account Status</span>
              <span className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                Verified &bull; Active
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 2-Column Responsive Layout: Personal Info Left, Security Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form 1: Personal Information */}
        <Card className="border border-slate-200/80 shadow-xs">
          <CardHeader>
            <div>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your display name and view account details.</CardDescription>
            </div>
            <HiOutlineUser className="w-4 h-4 text-slate-400" />
          </CardHeader>

          <form onSubmit={handleSaveProfile}>
            <CardBody className="space-y-4">
              <Input
                label="Full Name"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<HiOutlineUser className="w-4 h-4 text-slate-400" />}
                required
              />

              <div>
                <Input
                  label="Email Address"
                  value={user?.email || ''}
                  disabled
                  leftIcon={<HiOutlineMail className="w-4 h-4 text-slate-400" />}
                  helperText="Primary email used for sign-in and security notifications."
                />
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <HiOutlineCheckCircle className="w-3.5 h-3.5" />
                  <span>Email verified</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-1">
                <span className="font-semibold block text-slate-800">Account Access</span>
                <p>
                  You are logged into this workspace with standard account access.
                </p>
              </div>
            </CardBody>

            <CardFooter className="justify-end bg-slate-50/50 border-t border-slate-100">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSavingProfile}
                loadingText="Saving..."
                leftIcon={<HiOutlineCheckCircle className="w-4 h-4" />}
              >
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Form 2: Password & Security */}
        <Card className="border border-slate-200/80 shadow-xs">
          <CardHeader>
            <div>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Keep your account secure with a strong password.</CardDescription>
            </div>
            <HiOutlineLockClosed className="w-4 h-4 text-slate-400" />
          </CardHeader>

          <form onSubmit={handleSavePassword}>
            <CardBody className="space-y-4">
              <Input
                type="password"
                label="Current Password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />

              <Input
                type="password"
                label="New Password"
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />

              <Input
                type="password"
                label="Confirm New Password"
                placeholder="Re-type new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />

              {newPassword && (
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Password Strength</span>
                    <span className={newPassword.length >= 8 ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
                      {newPassword.length >= 8 ? 'Valid (8+ characters)' : 'Too short'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        newPassword.length >= 8 ? 'w-full bg-emerald-500' : 'w-1/2 bg-amber-500'
                      }`}
                    />
                  </div>
                </div>
              )}
            </CardBody>

            <CardFooter className="justify-end bg-slate-50/50 border-t border-slate-100">
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSavingPassword}
                loadingText="Updating..."
                leftIcon={<HiOutlineLockClosed className="w-4 h-4" />}
              >
                Update Password
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};
