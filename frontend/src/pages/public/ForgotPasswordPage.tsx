import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineMail, HiOutlineArrowLeft, HiOutlineCheckCircle, HiOutlineQrcode, HiOutlineExternalLink } from 'react-icons/hi';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { useToast } from '../../components/ui/ToastContext';
import { authApi } from '../../services/auth.api';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please provide a valid email address');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await authApi.forgotPassword(email);
      setIsSubmitted(true);
      if (res.devResetUrl) {
        setDevResetUrl(res.devResetUrl);
      }
      toast.success('Password recovery instructions dispatched.', 'Email Sent');
    } catch (err: any) {
      setError(err.message || 'Unable to process request. Please try again later.');
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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Reset your password</h2>
          <p className="text-xs text-slate-500">
            Enter your email and we'll send you recovery instructions.
          </p>
        </div>

        <Card className="shadow-premium border-slate-200/90">
          <CardBody className="p-6 sm:p-8">
            {error && (
              <div className="mb-4">
                <Alert variant="danger" onDismiss={() => setError(null)}>
                  {error}
                </Alert>
              </div>
            )}

            {isSubmitted ? (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
                  <HiOutlineCheckCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-semibold text-slate-900">Check your inbox</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    If an account exists for <span className="font-semibold text-slate-700">{email}</span>, we have sent password reset instructions.
                  </p>
                </div>

                {devResetUrl && (
                  <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-left space-y-2 mt-4">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 block">
                      Local Development Token Link
                    </span>
                    <p className="text-[11px] text-slate-600 break-all font-mono">
                      {devResetUrl}
                    </p>
                    <a
                      href={devResetUrl}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline pt-1"
                    >
                      <span>Open Reset Link</span>
                      <HiOutlineExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Account Email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<HiOutlineMail className="w-4 h-4" />}
                  disabled={isLoading}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  isLoading={isLoading}
                  loadingText="Sending..."
                >
                  Send Recovery Link
                </Button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors"
              >
                <HiOutlineArrowLeft className="w-3.5 h-3.5" />
                <span>Return to sign in</span>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
