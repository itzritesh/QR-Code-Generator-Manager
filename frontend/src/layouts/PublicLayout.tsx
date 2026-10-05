import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { HiOutlineQrcode, HiOutlineMenu, HiOutlineX } from 'react-icons/hi';
import { Button, IconButton } from '../components/ui/Button';

export const PublicLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const publicNavLinks = [
    { label: 'Overview', path: '/' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Sticky Public Header */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2.5 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200 group-hover:scale-105 transition-transform">
                  <HiOutlineQrcode className="w-6 h-6" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-slate-900 text-base leading-tight tracking-tight">
                    QR Manager
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">QR Code Generator &amp; Platform</span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              {publicNavLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-indigo-600 bg-indigo-50/80 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Right Action Buttons */}
            <div className="hidden sm:flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" size="md">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="md">
                  Get Started Free
                </Button>
              </Link>
            </div>

            {/* Mobile Hamburger Trigger */}
            <div className="flex sm:hidden items-center">
              <IconButton
                icon={mobileMenuOpen ? <HiOutlineX className="w-5 h-5" /> : <HiOutlineMenu className="w-5 h-5" />}
                ariaLabel="Toggle navigation menu"
                size="md"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              />
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg">
            {publicNavLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-base font-medium ${
                  location.pathname === link.path
                    ? 'text-indigo-600 bg-indigo-50 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" size="md" fullWidth>
                  Sign In
                </Button>
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" size="md" fullWidth>
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Public Page Content */}
      <main className="flex-1 flex flex-col w-full">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="w-full bg-white border-t border-slate-200/90 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 text-left md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <HiOutlineQrcode className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900 text-sm">QR Manager</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                The modern, production-ready QR code generator and management platform for business, marketing, and creators.
              </p>
            </div>

            <div className="text-left space-y-2.5">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-900">Product</h5>
              <ul className="space-y-2 text-xs text-slate-600">
                <li><Link to="/app/create" className="hover:text-indigo-600 transition-colors">Create QR Code</Link></li>
                <li><Link to="/app/templates" className="hover:text-indigo-600 transition-colors">QR Templates</Link></li>
                <li><Link to="/app/analytics" className="hover:text-indigo-600 transition-colors">Scan Analytics</Link></li>
                <li><Link to="/status" className="hover:text-indigo-600 transition-colors">System Diagnostics</Link></li>
              </ul>
            </div>

            <div className="text-left space-y-2.5">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-900">Capabilities</h5>
              <ul className="space-y-2 text-xs text-slate-600">
                <li>Dynamic URL Redirection</li>
                <li>Wi-Fi Network Sharing</li>
                <li>High-Res Vector Export (SVG, PNG)</li>
                <li>Custom Colors &amp; Logo Frames</li>
              </ul>
            </div>

            <div className="text-left space-y-2.5">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-900">Account</h5>
              <ul className="space-y-2 text-xs text-slate-600">
                <li><Link to="/login" className="hover:text-indigo-600 transition-colors">Sign In</Link></li>
                <li><Link to="/register" className="hover:text-indigo-600 transition-colors">Create Account</Link></li>
                <li><Link to="/forgot-password" className="hover:text-indigo-600 transition-colors">Reset Password</Link></li>
                <li><Link to="/app" className="hover:text-indigo-600 transition-colors">App Dashboard</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-100 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
            <span>&copy; {new Date().getFullYear()} QR Code Generator &amp; Management Platform. Light Theme SaaS.</span>
            <div className="flex items-center gap-4">
              <Link to="/status" className="hover:text-indigo-600 transition-colors">Status &amp; Health</Link>
              <span>&bull;</span>
              <span>PostgreSQL (Neon)</span>
              <span>&bull;</span>
              <span>Express + React</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
