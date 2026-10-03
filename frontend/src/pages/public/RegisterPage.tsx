import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineUser, HiOutlineMail, HiOutlineLockClosed, HiOutlineQrcode, HiOutlineArrowRight } from 'react-icons/hi';
import { Input } from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { useToast } from '../../components/ui/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { GoogleLoginButton } from '../../components/auth/GoogleLoginButton';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
  }>({});

  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const getPasswordStrength = () => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  };

  const strength = getPasswordStrength();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
      terms?: string;
    } = {};

    if (!name.trim()) newErrors.name = 'Full name is required';
    if (!email) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!acceptTerms) {
      newErrors.terms = 'You must accept the terms of service to continue';
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    try {
      const registeredUser = await register({ name, email, password, confirmPassword });
      toast.success(`Account created! Welcome, ${registeredUser.name}.`, 'Registration Complete');
      navigate('/app', { replace: true });
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed. Please verify your details.');
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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h2>
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
              Sign in
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

            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<HiOutlineUser className="w-4 h-4" />}
                error={fieldErrors.name}
                disabled={isLoading}
                required
              />

              <Input
                label="Work Email"
                type="email"
                placeholder="jane@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<HiOutlineMail className="w-4 h-4" />}
                error={fieldErrors.email}
                disabled={isLoading}
                required
              />

              <div className="space-y-1.5 text-left">
                <Input
                  label="Password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<HiOutlineLockClosed className="w-4 h-4" />}
                  error={fieldErrors.password}
                  disabled={isLoading}
                  required
                />

                {/* Password Strength Meter */}
                {password && (
                  <div className="space-y-1 pt-1">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          strength <= 25
                            ? 'bg-rose-500 w-1/4'
                            : strength <= 50
                            ? 'bg-amber-500 w-2/4'
                            : strength <= 75
                            ? 'bg-blue-500 w-3/4'
                            : 'bg-emerald-500 w-full'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {strength <= 25
                        ? 'Weak (add numbers & symbols)'
                        : strength <= 50
                        ? 'Fair password'
                        : strength <= 75
                        ? 'Good password'
                        : 'Strong password'}
                    </span>
                  </div>
                )}
              </div>

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<HiOutlineLockClosed className="w-4 h-4" />}
                error={fieldErrors.confirmPassword}
                disabled={isLoading}
                required
              />

              <div className="pt-1">
                <Checkbox
                  label={
                    <span>
                      I agree to the{' '}
                      <span className="text-indigo-600 hover:underline">Terms of Service</span> and{' '}
                      <span className="text-indigo-600 hover:underline">Privacy Policy</span>
                    </span>
                  }
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  error={fieldErrors.terms}
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                isLoading={isLoading}
                loadingText="Creating account..."
                rightIcon={<HiOutlineArrowRight className="w-4 h-4" />}
              >
                Create Account
              </Button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-semibold">Or sign up with</span>
              </div>
            </div>

            <GoogleLoginButton mode="signup" />
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
