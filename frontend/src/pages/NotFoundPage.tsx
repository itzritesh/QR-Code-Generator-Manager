import React from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineExclamationCircle, HiOutlineHome } from 'react-icons/hi';
import { Button } from '../components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-6">
        <HiOutlineExclamationCircle className="w-10 h-10" />
      </div>
      <span className="text-sm font-semibold uppercase tracking-wider text-indigo-600">404 Error</span>
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-2">Page Not Found</h1>
      <p className="text-slate-600 max-w-md mt-3 text-sm sm:text-base">
        The page you are looking for doesn't exist or has been moved. Use the navigation to get back to safety.
      </p>
      <div className="mt-8">
        <Link to="/">
          <Button variant="primary" size="md">
            <HiOutlineHome className="w-4 h-4 mr-2" />
            Back to Overview
          </Button>
        </Link>
      </div>
    </div>
  );
};
