import React, { useState } from 'react';
import {
  HiOutlineServer,
  HiOutlineDatabase,
  HiOutlineChip,
  HiOutlineClock,
  HiOutlineRefresh,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineShieldCheck,
} from 'react-icons/hi';
import { Card, CardHeader, CardTitle, CardBody, CardDescription } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useHealthCheck } from '../hooks/useHealthCheck';

export const StatusPage: React.FC = () => {
  const { isHealthy, healthData, isLoading, error, refreshHealth } = useHealthCheck();
  const [copied, setCopied] = useState(false);

  const formatUptime = (seconds?: number) => {
    if (seconds === undefined) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  const copyJson = () => {
    if (healthData) {
      navigator.clipboard.writeText(JSON.stringify(healthData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            System Diagnostics &amp; Health
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time status of backend services, Neon PostgreSQL database, and runtime performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => refreshHealth()}
            isLoading={isLoading}
            loadingText="Refreshing..."
            leftIcon={<HiOutlineRefresh className="w-4 h-4" />}
          >
            Refresh Diagnostics
          </Button>
        </div>
      </div>

      {/* Main Status Banner */}
      <div
        className={`p-5 rounded-xl border flex items-center justify-between gap-4 ${
          isHealthy
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : 'bg-rose-50/70 border-rose-200 text-rose-900'
        }`}
      >
        <div className="flex items-center gap-3.5">
          {isHealthy ? (
            <HiOutlineCheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />
          ) : (
            <HiOutlineXCircle className="w-8 h-8 text-rose-600 shrink-0" />
          )}
          <div>
            <h2 className="text-base font-semibold">
              {isHealthy ? 'All Systems Fully Operational' : 'System Connectivity Warning'}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {isHealthy
                ? 'Backend Express API and Neon PostgreSQL database are responsive and verified.'
                : error || 'Unable to establish complete connection with the backend.'}
            </p>
          </div>
        </div>

        <Badge variant={isHealthy ? 'success' : 'danger'} dot className="shrink-0 text-sm py-1 px-3">
          {isHealthy ? 'Healthy' : 'Degraded'}
        </Badge>
      </div>

      {/* Diagnostic Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Database Metric */}
        <Card>
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-400">PostgreSQL (Neon)</span>
              <HiOutlineDatabase className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {healthData?.database.connected ? 'Online' : 'Disconnected'}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Latency: <span className="font-medium text-emerald-600">{healthData?.database.latencyMs ?? '--'} ms</span>
              </p>
            </div>
          </CardBody>
        </Card>

        {/* API Server Metric */}
        <Card>
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-400">API Service</span>
              <HiOutlineServer className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {isHealthy ? 'Active' : 'Unreachable'}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Environment: <span className="font-medium text-slate-700">{healthData?.environment ?? 'development'}</span>
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Uptime Metric */}
        <Card>
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-400">Process Uptime</span>
              <HiOutlineClock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {formatUptime(healthData?.uptimeSeconds)}
              </span>
              <p className="text-xs text-slate-500 mt-1">
                Node {healthData?.system.nodeVersion ?? 'N/A'}
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Memory Metric */}
        <Card>
          <CardBody className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-slate-400">Memory Usage</span>
              <HiOutlineChip className="w-5 h-5 text-violet-600" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {healthData?.system.memoryUsageMB.heapUsed ?? '--'} MB
              </span>
              <p className="text-xs text-slate-500 mt-1">
                RSS: {healthData?.system.memoryUsageMB.rss ?? '--'} MB
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Database & Security Architecture Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HiOutlineDatabase className="w-5 h-5 text-emerald-600" />
              <CardTitle>Database Health &amp; Configuration</CardTitle>
            </div>
            <Badge variant={healthData?.database.connected ? 'success' : 'warning'}>
              {healthData?.database.provider || 'PostgreSQL'}
            </Badge>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Connection Provider</span>
              <span className="font-medium text-slate-800">Neon Cloud Serverless PostgreSQL</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Prisma Driver</span>
              <span className="font-medium text-slate-800">@prisma/client 5.x</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Connection Pooler</span>
              <span className="font-medium text-emerald-600">Active (aws.neon.tech pooler)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Test Query Latency</span>
              <span className="font-medium text-slate-800">
                {healthData?.database.latencyMs ? `${healthData.database.latencyMs} ms` : 'Measuring...'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Last Health Timestamp</span>
              <span className="font-mono text-xs text-slate-600">
                {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleString() : 'N/A'}
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Security & Middlewares */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HiOutlineShieldCheck className="w-5 h-5 text-indigo-600" />
              <CardTitle>Security &amp; API Policies</CardTitle>
            </div>
            <Badge variant="info">Active</Badge>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Rate Limiting</span>
              <span className="font-medium text-emerald-600">100 req / 15 min per IP</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Security Headers</span>
              <span className="font-medium text-indigo-600">Helmet 7.x Enabled</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">CORS Protection</span>
              <span className="font-medium text-slate-800">Origin restricted + credentials</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Request Validation</span>
              <span className="font-medium text-slate-800">Zod Request Schemas</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">HTTP Access Logs</span>
              <span className="font-medium text-slate-800">Morgan Dev/Combined</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Raw JSON Response Viewer */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>GET /api/health Payload</CardTitle>
            <CardDescription>Live JSON returned by Express health controller</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={copyJson}>
            {copied ? 'Copied!' : 'Copy JSON'}
          </Button>
        </CardHeader>
        <CardBody className="p-0">
          <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto rounded-b-xl max-h-72">
            {JSON.stringify(healthData || { status: 'loading' }, null, 2)}
          </pre>
        </CardBody>
      </Card>
    </div>
  );
};
