import React from 'react';
import { HiOutlineServer, HiOutlineDatabase, HiOutlineShieldCheck } from 'react-icons/hi';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t border-slate-200/80 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-sm font-semibold text-slate-800">
              QR Code Generator & Management Platform
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              Production Architecture &bull; PostgreSQL (Neon) &bull; Express &bull; React &bull; Vite &bull; Tailwind CSS
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              <HiOutlineServer className="w-3.5 h-3.5 text-indigo-600" />
              <span>Express API</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              <HiOutlineDatabase className="w-3.5 h-3.5 text-emerald-600" />
              <span>Neon PostgreSQL</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
              <HiOutlineShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Helmet & Rate Limiting</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 mt-6 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400">
          <span>&copy; {new Date().getFullYear()} QR Code SaaS Platform. Production Architecture.</span>
          <span className="mt-2 sm:mt-0">Phase 1: Project Setup &amp; Architecture</span>
        </div>
      </div>
    </footer>
  );
};
