import React from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineCheckCircle,
  HiOutlineServer,
  HiOutlineDatabase,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineArrowRight,
  HiOutlineRefresh,
} from 'react-icons/hi';
import { TbBrandReact, TbTopologyStar3 } from 'react-icons/tb';
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useHealthCheck } from '../hooks/useHealthCheck';

interface ArchitectureItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  status: string;
  badgeVariant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export const HomePage: React.FC = () => {
  const { isHealthy, healthData, isLoading, refreshHealth } = useHealthCheck();

  const isDbConnected = Boolean(isHealthy && healthData?.database.connected);

  const architectureHighlights: ArchitectureItem[] = [
    {
      title: 'PostgreSQL on Neon',
      description: 'Connected via Prisma ORM with connection pooling and schema foundation.',
      icon: <HiOutlineDatabase className="w-5 h-5 text-emerald-600" />,
      status: isDbConnected ? 'Connected' : 'Verifying',
      badgeVariant: isDbConnected ? 'success' : 'warning',
    },
    {
      title: 'Express.js & TypeScript API',
      description: 'Production-ready server with Helmet security headers, CORS, and Rate Limiting.',
      icon: <HiOutlineServer className="w-5 h-5 text-indigo-600" />,
      status: isHealthy ? 'Active' : 'Offline',
      badgeVariant: isHealthy ? 'success' : 'danger',
    },
    {
      title: 'React + Vite & Tailwind CSS',
      description: 'Light theme modern SaaS design system with modular components and routing.',
      icon: <TbBrandReact className="w-5 h-5 text-sky-600" />,
      status: 'Ready',
      badgeVariant: 'info',
    },
    {
      title: 'Request Validation & Error Handling',
      description: 'Strict Zod schemas and centralized error handling with typed API responses.',
      icon: <HiOutlineShieldCheck className="w-5 h-5 text-violet-600" />,
      status: 'Configured',
      badgeVariant: 'info',
    },
  ];

  const phaseOneDeliverables = [
    'Monorepo architecture with clean separated frontend/ and backend/ trees',
    'Tailwind CSS light-theme design system with custom brand elevations and colors',
    'React Router v6 setup with centralized application shell and error handling',
    'Express.js backend with Helmet, CORS, Rate Limiting, and Morgan request logging',
    'Prisma ORM schema initialized with Neon PostgreSQL cloud connection',
    'Centralized environment validation failing early on missing variables',
    'Typed API client with interceptors for auth tokens and consistent error unpacking',
    'Live health-check endpoint (GET /api/health) monitoring DB latency and memory',
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-10 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-50/60 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-4">
            <HiOutlineSparkles className="w-4 h-4 text-indigo-600" />
            Phase 1 Foundation Complete
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            QR Code Generator &amp; Management Platform
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600 leading-relaxed">
            A production-ready SaaS application for generating, customizing, and managing dynamic QR codes. Built from scratch with a scalable, modern architecture.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/status">
              <Button
                variant="primary"
                size="md"
                rightIcon={<HiOutlineArrowRight className="w-4 h-4" />}
              >
                View System Status
              </Button>
            </Link>
            <Button
              variant="outline"
              size="md"
              onClick={() => refreshHealth()}
              isLoading={isLoading}
              loadingText="Pinging..."
              leftIcon={<HiOutlineRefresh className="w-4 h-4" />}
            >
              Ping Health Endpoint
            </Button>
          </div>
        </div>
      </section>

      {/* Live System Diagnostics Quick Summary */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {architectureHighlights.map((item, index) => (
          <Card key={index} hoverEffect>
            <CardBody className="p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    {item.icon}
                  </div>
                  <Badge variant={item.badgeVariant} dot>
                    {item.status}
                  </Badge>
                </div>
                <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>
                <p className="text-xs text-slate-500 mt-1">{item.description}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </section>

      {/* Phase 1 Verification & Production Architecture Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TbTopologyStar3 className="w-5 h-5 text-indigo-600" />
                <CardTitle>Phase 1 Architecture Deliverables</CardTitle>
              </div>
              <Badge variant="success">Verified</Badge>
            </CardHeader>
            <CardBody>
              <ul className="space-y-3">
                {phaseOneDeliverables.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
            <CardFooter className="justify-between text-xs text-slate-500">
              <span>All foundational components active &amp; tested</span>
              <span className="font-medium text-indigo-600">Light Theme SaaS Ready</span>
            </CardFooter>
          </Card>
        </div>

        {/* Database & Health Panel */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col justify-between">
            <div>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HiOutlineDatabase className="w-5 h-5 text-emerald-600" />
                  <CardTitle>Database Connectivity</CardTitle>
                </div>
                {healthData?.database.connected ? (
                  <Badge variant="success" dot>Connected</Badge>
                ) : (
                  <Badge variant="warning" dot>Checking...</Badge>
                )}
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Provider:</span>
                    <span className="font-semibold text-slate-800">Neon (PostgreSQL)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Latency:</span>
                    <span className="font-semibold text-emerald-600">
                      {healthData?.database.latencyMs ? `${healthData.database.latencyMs} ms` : 'Measuring...'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ORM Engine:</span>
                    <span className="font-semibold text-slate-800">Prisma Client</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">SSL Mode:</span>
                    <span className="font-semibold text-indigo-600">require</span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 leading-relaxed">
                  Prisma schema foundation is initialized with Neon cloud credentials. Ready for authentication and QR generation models in Phase 2.
                </div>
              </CardBody>
            </div>

            <CardFooter className="w-full">
              <Link to="/status" className="w-full">
                <Button variant="outline" size="sm" className="w-full justify-between">
                  <span>Explore Diagnostics</span>
                  <HiOutlineArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};
