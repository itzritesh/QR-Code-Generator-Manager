import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  HiOutlineQrcode,
  HiOutlineSparkles,
  HiOutlineChartBar,
  HiOutlineShieldCheck,
  HiOutlineAdjustments,
  HiOutlineDownload,
  HiOutlineLink,
  HiOutlineWifi,
  HiOutlineDocumentText,
  HiOutlineCreditCard,
  HiOutlineArrowRight,
  HiOutlineCheck,
} from 'react-icons/hi';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { KineticGrid } from '../../components/ui/KineticGrid';

export const LandingPage: React.FC = () => {
  const [activeType, setActiveType] = useState<'url' | 'wifi' | 'text' | 'payment'>('url');
  const [qrInput, setQrInput] = useState('https://qrmanager.pro/demo');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const typePresets = {
    url: {
      label: 'Website URL',
      icon: <HiOutlineLink className="w-4 h-4" />,
      defaultValue: 'https://qrmanager.app/campaign',
      placeholder: 'Enter website URL (e.g., https://mysite.com)',
    },
    wifi: {
      label: 'Wi-Fi Network',
      icon: <HiOutlineWifi className="w-4 h-4" />,
      defaultValue: 'WIFI:S:Guest_Network;T:WPA;P:Welcome2026;;',
      placeholder: 'Wi-Fi network connection string',
    },
    text: {
      label: 'Plain Text',
      icon: <HiOutlineDocumentText className="w-4 h-4" />,
      defaultValue: 'Welcome to our exclusive product launch event!',
      placeholder: 'Enter any text message',
    },
    payment: {
      label: 'UPI / Payment',
      icon: <HiOutlineCreditCard className="w-4 h-4" />,
      defaultValue: 'upi://pay?pa=merchant@bank&pn=QRManager&am=250',
      placeholder: 'Payment gateway or UPI link',
    },
  };

  useEffect(() => {
    QRCode.toDataURL(qrInput || 'https://qrmanager.app', {
      width: 260,
      margin: 2,
      color: {
        dark: '#4338ca', // Indigo
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err));
  }, [qrInput]);

  const handleTypeSelect = (type: 'url' | 'wifi' | 'text' | 'payment') => {
    setActiveType(type);
    setQrInput(typePresets[type].defaultValue);
  };

  const capabilities = [
    {
      title: 'Dynamic Redirection',
      description: 'Change where your QR code points anytime without reprinting physical packaging, flyers, or menus.',
      icon: <HiOutlineSparkles className="w-6 h-6 text-indigo-600" />,
    },
    {
      title: 'Real-Time Scan Analytics',
      description: 'Track total scans, unique visitors, geo-locations, mobile operating systems, and conversion rates.',
      icon: <HiOutlineChartBar className="w-6 h-6 text-emerald-600" />,
    },
    {
      title: 'Bespoke Customization',
      description: 'Style with custom brand palettes, dots, rounded corner eyes, frames, labels, and company logos.',
      icon: <HiOutlineAdjustments className="w-6 h-6 text-sky-600" />,
    },
    {
      title: 'Vector SVG & PNG Export',
      description: 'Download crisp, high-resolution vector assets designed for billboards, product labels, and digital screens.',
      icon: <HiOutlineDownload className="w-6 h-6 text-violet-600" />,
    },
    {
      title: 'QR Management',
      description: 'Organize your QR codes with custom folders, bulk creation, and tags.',
      icon: <HiOutlineQrcode className="w-6 h-6 text-amber-600" />,
    },
    {
      title: 'Bank-Grade Security',
      description: 'PostgreSQL storage with Neon SSL encryption, rate limiting, and zero third-party telemetry.',
      icon: <HiOutlineShieldCheck className="w-6 h-6 text-rose-600" />,
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 py-8 sm:py-12">
      {/* ========================================================= */}
      {/* HERO SECTION WITH LIVE INTERACTIVE GENERATOR PREVIEW */}
      {/* ========================================================= */}
      <section className="relative isolate max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Kinetic Grid Interactive Background */}
        <div className="absolute inset-0 -top-8 -bottom-8 -left-4 -right-4 sm:-left-8 sm:-right-8 z-0 overflow-hidden pointer-events-none">
          <KineticGrid className="w-full h-full" />
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Pitch */}
          <div className="lg:col-span-7 text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
              <HiOutlineSparkles className="w-4 h-4 text-indigo-600" />
              <span>Next-Generation Dynamic QR Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Generate, customize, and track{' '}
              <span className="gradient-brand-text">Dynamic QR Codes</span> with ease.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
              Create beautiful, scannable QR codes in seconds. Update your target destinations on the fly, analyze scan traffic with deep insights, and scale your brand identity effortlessly.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to="/app/create">
                <Button
                  variant="primary"
                  size="lg"
                  rightIcon={<HiOutlineArrowRight className="w-4 h-4" />}
                >
                  Create Your First QR
                </Button>
              </Link>
              <Link to="/app">
                <Button variant="outline" size="lg">
                  Explore App Dashboard
                </Button>
              </Link>
            </div>

            {/* Social Proof Badges */}
            <div className="pt-6 border-t border-slate-200/80 flex flex-wrap items-center gap-6 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <HiOutlineCheck className="w-4 h-4 text-emerald-600" />
                <span>Unlimited Static QRs</span>
              </div>
              <div className="flex items-center gap-2">
                <HiOutlineCheck className="w-4 h-4 text-emerald-600" />
                <span>Real-Time Analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <HiOutlineCheck className="w-4 h-4 text-emerald-600" />
                <span>Vector Export Ready</span>
              </div>
            </div>
          </div>

          {/* Right Live Interactive Showcase Card */}
          <div className="lg:col-span-5">
            <Card className="border border-slate-200/90 shadow-elevated bg-white p-6 relative">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <Badge variant="brand" dot size="sm">
                  Live Interactive Engine
                </Badge>
              </div>

              {/* Type Switcher */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-4 p-1 bg-slate-100/90 rounded-xl">
                {(['url', 'wifi', 'text', 'payment'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeSelect(type)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                      activeType === type
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {typePresets[type].icon}
                    <span>{type.toUpperCase()}</span>
                  </button>
                ))}
              </div>

              {/* Input for Interactive Demonstration */}
              <div className="mt-4 space-y-1.5 text-left">
                <label className="text-xs font-semibold text-slate-700">
                  {typePresets[activeType].label} Content:
                </label>
                <input
                  type="text"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder={typePresets[activeType].placeholder}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Live QR Output Display */}
              <div className="mt-6 flex flex-col items-center justify-center p-6 bg-slate-50/80 rounded-2xl border border-slate-200/80">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Live QR Code Preview"
                    className="w-48 h-48 rounded-xl shadow-xs border border-white"
                  />
                ) : (
                  <div className="w-48 h-48 bg-slate-200 animate-pulse rounded-xl" />
                )}
                <span className="text-[11px] text-slate-400 mt-3 font-medium">
                  Scan with your mobile camera to test instantly
                </span>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Resolution: 1024x1024</span>
                <Link to="/app/create">
                  <Button variant="primary" size="md">
                    Customize in Studio
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* CAPABILITIES VALUE PROPOSITION GRID */}
      {/* ========================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="brand" size="md">
            Engineered For Scale
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Everything you need for modern QR deployment
          </h2>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            From single restaurant Wi-Fi placards to multi-channel campaigns, QR Manager provides modern reliability and flexibility.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {capabilities.map((cap, idx) => (
            <Card key={idx} hoverEffect className="text-left">
              <CardBody className="p-6 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-2xs">
                  {cap.icon}
                </div>
                <h3 className="text-base font-semibold text-slate-900">{cap.title}</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  {cap.description}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* DYNAMIC VS STATIC COMPARISON */}
      {/* ========================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 sm:p-12 shadow-xs">
          <div className="text-left max-w-2xl space-y-2 mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Why choose Dynamic QR Codes?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Understand the core architectural difference between static hardcoded QR codes and managed dynamic shortlinks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
            {/* Dynamic Card */}
            <div className="p-6 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-indigo-900">Dynamic QR Codes</h4>
                <Badge variant="brand">Recommended</Badge>
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <HiOutlineCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Update destination URL at any time without reprinting</span>
                </li>
                <li className="flex items-center gap-2">
                  <HiOutlineCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Detailed scan analytics (timestamps, devices, locations)</span>
                </li>
                <li className="flex items-center gap-2">
                  <HiOutlineCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Password protection and expiration dates</span>
                </li>
                <li className="flex items-center gap-2">
                  <HiOutlineCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>A/B testing and UTM campaign attribution</span>
                </li>
              </ul>
            </div>

            {/* Static Card */}
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-slate-800">Static QR Codes</h4>
                <Badge variant="neutral">Permanent</Badge>
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <HiOutlineCheck className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Directly encodes data directly inside the matrix</span>
                </li>
                <li className="flex items-center gap-2">
                  <HiOutlineCheck className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Never expires and requires no external redirection</span>
                </li>
                <li className="flex items-center gap-2">
                  <HiOutlineCheck className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Ideal for simple Wi-Fi, plain text, and static vCards</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 text-rose-500 font-bold shrink-0">&times;</span>
                  <span className="text-slate-400">Cannot be updated once printed</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* CALL TO ACTION BANNER */}
      {/* ========================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 rounded-3xl p-8 sm:p-14 text-white text-center sm:text-left flex flex-col lg:flex-row items-center justify-between gap-8 shadow-elevated">
          <div className="space-y-3 max-w-xl">
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Ready to elevate your QR management?
            </h3>
            <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
              Start building high-converting dynamic campaigns, customize every pixel, and gain actionable scan intelligence today.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link to="/register">
              <Button variant="secondary" size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold shadow-md">
                Create Free Account
              </Button>
            </Link>
            <Link to="/app">
              <Button variant="ghost" size="lg" className="text-white hover:bg-white/10 border border-white/20">
                Open App Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
