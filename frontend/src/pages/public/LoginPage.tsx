import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineQrcode, HiOutlineArrowRight } from 'react-icons/hi';
import { Input } from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { useToast } from '../../components/ui/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { GoogleLoginButton } from '../../components/auth/GoogleLoginButton';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const from = (location.state as any)?.from?.pathname || '/app';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    try {
      const loggedInUser = await login({ email, password });
      toast.success(`Welcome back, ${loggedInUser.name}!`, 'Signed In');
      navigate(from, { replace: true });
    } catch (err: any) {
      setAuthError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('test.user@example.com');
    setPassword('FinalResetPassword2026!');
    setAuthError(null);
    toast.info('Filled credentials for test.user@example.com', 'Demo Autofill');
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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign in to your account</h2>
          <p className="text-xs text-slate-500">
            Or{' '}
            <Link to="/register" className="text-indigo-600 font-semibold hover:underline">
              create a new account
            </Link>
          </p>
        </div>

        <Card className="shadow-premium border-slate-200/90">
          <CardBody className="p-6 sm:p-8">
            {authError && (
              <div className="mb-4">
                <Alert variant="danger" onDismiss={() => setAuthError(null)}>
                  {authError}
                </Alert>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<HiOutlineMail className="w-4 h-4" />}
                error={fieldErrors.email}
                disabled={isLoading}
                required
              />

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-indigo-600 font-medium hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<HiOutlineLockClosed className="w-4 h-4" />}
                  error={fieldErrors.password}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="pt-1">
                <Checkbox
                  label="Remember this device for 30 days"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                isLoading={isLoading}
                loadingText="Signing in..."
                rightIcon={<HiOutlineArrowRight className="w-4 h-4" />}
              >
                Sign In
              </Button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-semibold">Or continue with</span>
              </div>
            </div>

            <GoogleLoginButton mode="signin" />

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-semibold">Quick Test</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="md"
              fullWidth
              onClick={fillDemoCredentials}
            >
              Autofill Verified Test Account
            </Button>
          </CardBody>
        </Card>

        <p className="text-center text-xs text-slate-500">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};
