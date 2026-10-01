import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { HiOutlineLockClosed, HiOutlineQrcode, HiOutlineCheckCircle, HiOutlineExclamation } from 'react-icons/hi';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { useToast } from '../../components/ui/ToastContext';
import { authApi } from '../../services/auth.api';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const navigate = useNavigate();
  const toast = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (!token) {
      setError('Invalid or missing password reset token. Please request a new recovery link.');
      return;
    }

    if (!password) {
      newErrors.password = 'New password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    try {
      await authApi.resetPassword({ token, password, confirmPassword });
      setIsSuccess(true);
      toast.success('Your password has been reset successfully.', 'Password Updated');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <HiOutlineQrcode className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-900 text-lg">QR Manager</span>
          </Link>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Set a new password</h2>
          <p className="text-xs text-slate-500">
            Please enter your new secure password below.
          </p>
        </div>

        <Card className="shadow-premium border-slate-200/90">
          <CardBody className="p-6 sm:p-8">
            {!token && (
              <div className="mb-4">
                <Alert variant="warning">
                  <div className="flex items-center gap-2">
                    <HiOutlineExclamation className="w-4 h-4 shrink-0" />
                    <span>No reset token provided. Please click the full link sent to your email.</span>
                  </div>
                </Alert>
              </div>
            )}

            {error && (
              <div className="mb-4">
                <Alert variant="danger" onDismiss={() => setError(null)}>
                  {error}
                </Alert>
              </div>
            )}

            {isSuccess ? (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
                  <HiOutlineCheckCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-semibold text-slate-900">Password Changed</h4>
                  <p className="text-xs text-slate-500">
                    Your password has been successfully updated. You can now sign in.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => navigate('/login')}
                >
                  Proceed to Sign In
                </Button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <Input
                  label="New Password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<HiOutlineLockClosed className="w-4 h-4" />}
                  error={fieldErrors.password}
                  disabled={isLoading}
                  required
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leftIcon={<HiOutlineLockClosed className="w-4 h-4" />}
                  error={fieldErrors.confirmPassword}
                  disabled={isLoading}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  isLoading={isLoading}
                  loadingText="Updating..."
                  disabled={!token || isLoading}
                >
                  Update Password
                </Button>
              </form>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
