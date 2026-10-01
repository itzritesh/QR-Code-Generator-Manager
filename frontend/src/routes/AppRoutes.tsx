import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import { PublicLayout } from '../layouts/PublicLayout';
import { AppLayout } from '../layouts/AppLayout';

// Guards
import { ProtectedRoute } from './ProtectedRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';

// Lazy-loaded Public Pages
const LandingPage = lazy(() => import('../pages/public/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('../pages/public/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('../pages/public/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('../pages/public/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('../pages/public/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const StatusPage = lazy(() => import('../pages/StatusPage').then(m => ({ default: m.StatusPage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

// Lazy-loaded Authenticated Application Pages
const DashboardPage = lazy(() => import('../pages/app/DashboardPage').then(m => ({ default: m.DashboardPage })));
const CreateQRPage = lazy(() => import('../pages/app/CreateQRPage').then(m => ({ default: m.CreateQRPage })));
const MyQRCodesPage = lazy(() => import('../pages/app/MyQRCodesPage').then(m => ({ default: m.MyQRCodesPage })));
const AnalyticsPage = lazy(() => import('../pages/app/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const TemplatesPage = lazy(() => import('../pages/app/TemplatesPage').then(m => ({ default: m.TemplatesPage })));
const SettingsPage = lazy(() => import('../pages/app/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import('../pages/app/ProfilePage').then(m => ({ default: m.ProfilePage })));
const BulkQRPage = lazy(() => import('../pages/app/BulkQRPage').then(m => ({ default: m.BulkQRPage })));

const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-slate-500">
    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
    <span className="text-xs font-medium text-slate-400">Loading module...</span>
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* Public Layout */}
        <Route element={<PublicLayout />}>
          {/* Unrestricted Public Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/status" element={<StatusPage />} />

          {/* Guest Only Routes (redirect authenticated users away to /app) */}
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Authenticated Application Pages (Protected with ProtectedRoute) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<Navigate to="/app" replace />} />
            <Route path="create" element={<CreateQRPage />} />
            <Route path="bulk" element={<BulkQRPage />} />
            <Route path="qr-codes" element={<MyQRCodesPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
};

