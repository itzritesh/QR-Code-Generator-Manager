import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiOutlineQrcode, HiOutlineMenu, HiOutlineX } from 'react-icons/hi';
import { useHealthCheck } from '../../hooks/useHealthCheck';
import { Badge } from './Badge';
import { Button } from './Button';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isHealthy, isLoading, refreshHealth } = useHealthCheck();

  const navLinks = [
    { label: 'Overview', path: '/' },
    { label: 'System Health', path: '/status' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200 group-hover:scale-105 transition-transform">
                <HiOutlineQrcode className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 text-base leading-tight tracking-tight">
                  QR Manager <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded ml-1 border border-indigo-100">PRO</span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Production Architecture</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
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

          {/* Right Header Status & Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <Link to="/status" className="flex items-center gap-2">
              {isLoading ? (
                <Badge variant="neutral" dot className="animate-pulse">
                  Checking API...
                </Badge>
              ) : isHealthy ? (
                <Badge variant="success" dot>
                  API Online
                </Badge>
              ) : (
                <Badge variant="danger" dot>
                  API Offline
                </Badge>
              )}
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshHealth()}
              isLoading={isLoading}
              title="Ping backend health endpoint"
            >
              Ping API
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex sm:hidden items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <HiOutlineX className="w-6 h-6" /> : <HiOutlineMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2">
          {navLinks.map((link) => (
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
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Backend API Status:</span>
            {isHealthy ? (
              <Badge variant="success" dot>Online</Badge>
            ) : (
              <Badge variant="danger" dot>Offline</Badge>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
